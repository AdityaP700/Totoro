import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import yauzl from "yauzl";
import { uploadRoot } from "./persistence";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 50_000;
const MAX_ZIP_ENTRIES = 2_000, MAX_UNZIPPED_BYTES = 30 * 1024 * 1024, MAX_RATIO = 100, MAX_TEXT = 1_000_000;
type Kind = "csv" | "xlsx" | "txt" | "md" | "docx";

function reject(message: string): never { throw new Error(message); }
function cleanName(name: string) { return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "upload"; }
function utf8(buffer: Buffer) { const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer); if (/\u0000/.test(text)) reject("Text uploads cannot contain NUL bytes."); return text; }

function kindFor(name: string, body: Buffer): Kind {
  const ext = path.extname(name).toLowerCase();
  if ([".xlsx", ".docx"].includes(ext)) {
    if (!(body[0] === 0x50 && body[1] === 0x4b && body[2] === 0x03 && body[3] === 0x04)) reject("Office files must be valid ZIP containers.");
    return ext.slice(1) as Kind;
  }
  if (ext === ".csv" || ext === ".txt" || ext === ".md" || ext === ".markdown") { utf8(body); return ext === ".markdown" ? "md" : ext.slice(1) as Kind; }
  reject("Unsupported file type. Supported: CSV, XLSX, TXT, Markdown, DOCX.");
}

async function zipEntries(body: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, rejectPromise) => yauzl.fromBuffer(body, { lazyEntries: true, decodeStrings: true, validateEntrySizes: true }, (error, zip) => {
    if (error || !zip) return rejectPromise(new Error("Invalid or encrypted ZIP container."));
    const files = new Map<string, Buffer>(); let entries = 0, total = 0;
    zip.readEntry();
    zip.on("entry", (entry) => {
      entries++;
      if (entries > MAX_ZIP_ENTRIES || entry.fileName.includes("..") || entry.fileName.startsWith("/") || entry.fileName.includes("\\") || /[\0]/.test(entry.fileName)) { zip.close(); return rejectPromise(new Error("Unsafe ZIP archive entry.")); }
      if ((entry as unknown as { generalPurposeBitFlag: number }).generalPurposeBitFlag & 1) { zip.close(); return rejectPromise(new Error("Encrypted Office files are not supported.")); }
      if (entry.uncompressedSize > MAX_UNZIPPED_BYTES || (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > MAX_RATIO)) { zip.close(); return rejectPromise(new Error("Office archive exceeds safe extraction limits.")); }
      if (/\/$/.test(entry.fileName)) return zip.readEntry();
      zip.openReadStream(entry, (streamError, stream) => {
        if (streamError || !stream) return rejectPromise(new Error("Unable to safely read Office archive."));
        const chunks: Buffer[] = []; stream.on("data", (chunk) => { total += chunk.length; if (total > MAX_UNZIPPED_BYTES) { stream.destroy(new Error("Archive text exceeds safe limit.")); } else chunks.push(chunk); });
        stream.on("error", rejectPromise); stream.on("end", () => { files.set(entry.fileName, Buffer.concat(chunks)); zip.readEntry(); });
      });
    });
    zip.on("end", () => resolve(files)); zip.on("error", rejectPromise);
  }));
}

function safeXml(buffer: Buffer) { const value = utf8(buffer); if (/<!DOCTYPE|<!ENTITY/i.test(value)) reject("Office XML with DTD or entity declarations is not supported."); return value; }
function stripXml(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function parseCsv(text: string) { const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length > MAX_ROWS + 1) reject(`CSV exceeds ${MAX_ROWS} rows.`); const split = (line: string) => line.split(",").map((v) => v.trim().replace(/^"|"$/g, "")); const headers = split(lines[0] || ""); const rows = lines.slice(1).map(split); const missing = headers.map((h, i) => rows.filter((r) => !r[i]).length); return { headers, rows: rows.length, missing, duplicates: new Set(rows.map((r) => JSON.stringify(r))).size !== rows.length, sample: rows.slice(0, 10), data: rows }; }

export async function ingestUpload(file: File) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) reject(`Files must be between 1 byte and ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  const body = Buffer.from(await file.arrayBuffer()); const originalName = cleanName(file.name); const kind = kindFor(originalName, body);
  let extractedText = "", profile: Record<string, unknown> = { kind, warnings: [] };
  if (kind === "csv") { extractedText = utf8(body).slice(0, MAX_TEXT); profile = { ...profile, ...parseCsv(extractedText) }; }
  else if (kind === "txt" || kind === "md") extractedText = utf8(body).slice(0, MAX_TEXT);
  else {
    const entries = await zipEntries(body);
    if (kind === "xlsx") {
      if (!entries.has("[Content_Types].xml") || ![...entries.keys()].some((n) => n.startsWith("xl/worksheets/")) || [...entries.keys()].some((n) => /vbaProject\.bin$/i.test(n))) reject("Unsupported or macro-bearing XLSX file.");
      const sheetNames = [...entries.keys()].filter((n) => n.startsWith("xl/worksheets/")).slice(0, 20); extractedText = sheetNames.map((n) => stripXml(safeXml(entries.get(n)!))).join("\n").slice(0, MAX_TEXT); profile = { ...profile, sheets: sheetNames, extractedCharacters: extractedText.length };
    } else {
      const document = entries.get("word/document.xml"); if (!entries.has("[Content_Types].xml") || !document || [...entries.keys()].some((n) => /vbaProject\.bin$/i.test(n))) reject("Unsupported or macro-bearing DOCX file.");
      extractedText = stripXml(safeXml(document)).slice(0, MAX_TEXT); profile = { ...profile, extractedCharacters: extractedText.length };
    }
  }
  const id = randomUUID(); const storageName = `${id}-${createHash("sha256").update(body).digest("hex").slice(0, 12)}.${kind}`; const destination = path.resolve(uploadRoot, storageName);
  if (!destination.startsWith(path.resolve(uploadRoot) + path.sep)) reject("Unsafe upload storage path.");
  await fs.writeFile(destination, body, { flag: "wx" });
  return { id, storageName, originalName, contentType: file.type || "application/octet-stream", sizeBytes: body.length, extractedText, profile, createdAt: new Date().toISOString() };
}

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import os from "node:os";

type DatabaseSync = { exec(sql: string): void; prepare(sql: string): { run(...params: unknown[]): { changes: number }; get(...params: unknown[]): Record<string, unknown> | undefined; all(...params: unknown[]): Array<Record<string, unknown>>; }; };
// A filesystem request anchor keeps Turbopack from treating import.meta.url as an external URL.
const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
const SqliteDatabase = nodeRequire(`node:${"sqlite"}`).DatabaseSync as new (path: string) => DatabaseSync;

function resolveDataDirectory(): { root: string; upload: string; db: string } {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  const base = process.env.TOTORO_DATA_DIR || (isServerless ? path.join(os.tmpdir(), "totoro-data") : path.join(process.cwd(), ".totoro-data"));
  return {
    root: base,
    upload: path.join(base, "uploads"),
    db: path.join(base, "totoro.sqlite"),
  };
}

let paths = resolveDataDirectory();
export let uploadRoot = paths.upload;

let db: DatabaseSync | undefined;
function database(): DatabaseSync {
  if (db) return db;
  try {
    try {
      mkdirSync(paths.upload, { recursive: true });
      db = new SqliteDatabase(paths.db);
    } catch {
      // In read-only serverless container (/var/task), fall back safely to /tmp
      paths = {
        root: path.join(os.tmpdir(), "totoro-data"),
        upload: path.join(os.tmpdir(), "totoro-data", "uploads"),
        db: path.join(os.tmpdir(), "totoro-data", "totoro.sqlite"),
      };
      uploadRoot = paths.upload;
      mkdirSync(paths.upload, { recursive: true });
      db = new SqliteDatabase(paths.db);
    }
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS preferences (workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE, profile_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, session_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, template_id TEXT, original_message TEXT NOT NULL, state_json TEXT NOT NULL, templates_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
CREATE INDEX IF NOT EXISTS cases_workspace_updated ON cases(workspace_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS conversation_turns (id INTEGER PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, role TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS turns_case_created ON conversation_turns(case_id, created_at);
CREATE TABLE IF NOT EXISTS evidence_sources (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, case_id TEXT REFERENCES cases(id) ON DELETE SET NULL, original_name TEXT NOT NULL, storage_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, status TEXT NOT NULL, profile_json TEXT NOT NULL, extracted_text TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS evidence_workspace_case ON evidence_sources(workspace_id, case_id, created_at DESC);
CREATE TABLE IF NOT EXISTS column_mappings (source_id TEXT PRIMARY KEY REFERENCES evidence_sources(id) ON DELETE CASCADE, mapping_json TEXT NOT NULL, confirmed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE, event_json TEXT NOT NULL, created_at TEXT NOT NULL);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, datetime('now'));`);
    return db;
  } catch (error) {
    throw new Error(`Persistent storage initialization failed. Configure TOTORO_DATA_DIR to a writable persistent directory. ${error instanceof Error ? error.message : "Unknown storage error"}`);
  }
}

export type StoredCase = { id: string; workspaceId: string; sessionId: string; title: string; templateId: string; originalMessage: string; state: unknown; templates: unknown; createdAt: string; updatedAt: string; messages: Array<{ role: "user" | "assistant"; text: string; timestamp: string }> };
export type EvidenceSource = { id: string; originalName: string; contentType: string; sizeBytes: number; status: string; profile: Record<string, unknown>; extractedText: string; caseId: string | null; createdAt: string };

export const repositories = {
  ensureWorkspace(workspaceId: string) { database().prepare("INSERT OR IGNORE INTO workspaces(id, created_at) VALUES (?, ?)").run(workspaceId, new Date().toISOString()); },
  savePreferences(workspaceId: string, profile: unknown) { this.ensureWorkspace(workspaceId); database().prepare("INSERT INTO preferences(workspace_id, profile_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(workspace_id) DO UPDATE SET profile_json=excluded.profile_json, updated_at=excluded.updated_at").run(workspaceId, JSON.stringify(profile), new Date().toISOString()); },
  getPreferences(workspaceId: string) { const row = database().prepare("SELECT profile_json FROM preferences WHERE workspace_id=?").get(workspaceId); return row ? JSON.parse(String(row.profile_json)) : null; },
  saveCase(input: StoredCase) {
    this.ensureWorkspace(input.workspaceId);
    const d = database();
    const existing = (input.workspaceId ? d.prepare("SELECT id FROM cases WHERE workspace_id=? AND session_id=?").get(input.workspaceId, input.sessionId) : undefined)
      || (d.prepare("SELECT id FROM cases WHERE session_id=?").get(input.sessionId) as { id: string } | undefined);
    let targetCaseId = input.id;
    if (existing) {
      targetCaseId = (existing as { id: string }).id;
      d.prepare("UPDATE cases SET title=?, template_id=?, original_message=?, state_json=?, templates_json=?, updated_at=?, deleted_at=NULL WHERE session_id=?").run(input.title, input.templateId, input.originalMessage, JSON.stringify(input.state), JSON.stringify(input.templates), input.updatedAt, input.sessionId);
    } else {
      d.prepare("INSERT INTO cases(id, workspace_id, session_id, title, template_id, original_message, state_json, templates_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, state_json=excluded.state_json, templates_json=excluded.templates_json, updated_at=excluded.updated_at, deleted_at=NULL").run(input.id, input.workspaceId, input.sessionId, input.title, input.templateId, input.originalMessage, JSON.stringify(input.state), JSON.stringify(input.templates), input.createdAt, input.updatedAt);
    }
    d.prepare("DELETE FROM conversation_turns WHERE case_id=?").run(targetCaseId);
    const turn = d.prepare("INSERT INTO conversation_turns(case_id, role, text, created_at) VALUES (?, ?, ?, ?)");
    input.messages.forEach((m) => turn.run(targetCaseId, m.role, m.text, m.timestamp));
  },
  getCase(workspaceId: string, sessionId: string): StoredCase | null { const r = database().prepare("SELECT * FROM cases WHERE workspace_id=? AND session_id=? AND deleted_at IS NULL").get(workspaceId, sessionId); return r ? this.rowToCase(r) : null; },
  getCaseBySessionId(sessionId: string): StoredCase | null { const r = database().prepare("SELECT * FROM cases WHERE session_id=? AND deleted_at IS NULL").get(sessionId); return r ? this.rowToCase(r) : null; },
  hasCase(workspaceId: string, caseId: string) { return Boolean(database().prepare("SELECT 1 FROM cases WHERE workspace_id=? AND id=? AND deleted_at IS NULL").get(workspaceId, caseId)); },
  listCases(workspaceId: string): StoredCase[] { return database().prepare("SELECT * FROM cases WHERE workspace_id=? AND deleted_at IS NULL ORDER BY updated_at DESC").all(workspaceId).map((r) => this.rowToCase(r)); },
  deleteCase(workspaceId: string, sessionId: string) { return database().prepare("UPDATE cases SET deleted_at=?, updated_at=? WHERE workspace_id=? AND session_id=? AND deleted_at IS NULL").run(new Date().toISOString(), new Date().toISOString(), workspaceId, sessionId).changes > 0; },
  clearWorkspaceForTest(workspaceId: string) { database().prepare("DELETE FROM workspaces WHERE id=?").run(workspaceId); },
  renameCase(workspaceId: string, sessionId: string, title: string) { return database().prepare("UPDATE cases SET title=?, updated_at=? WHERE workspace_id=? AND session_id=? AND deleted_at IS NULL").run(title.slice(0, 160), new Date().toISOString(), workspaceId, sessionId).changes > 0; },
  rowToCase(r: Record<string, unknown>): StoredCase { const messages = database().prepare("SELECT role,text,created_at FROM conversation_turns WHERE case_id=? ORDER BY id").all(r.id).map((m) => ({ role: m.role as "user" | "assistant", text: String(m.text), timestamp: String(m.created_at) })); return { id:String(r.id), workspaceId:String(r.workspace_id), sessionId:String(r.session_id), title:String(r.title), templateId:String(r.template_id || ""), originalMessage:String(r.original_message), state:JSON.parse(String(r.state_json)), templates:JSON.parse(String(r.templates_json)), createdAt:String(r.created_at), updatedAt:String(r.updated_at), messages }; },
  addEvidence(workspaceId: string, source: EvidenceSource & { storageName: string }) { this.ensureWorkspace(workspaceId); database().prepare("INSERT INTO evidence_sources(id,workspace_id,case_id,original_name,storage_name,content_type,size_bytes,status,profile_json,extracted_text,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(source.id, workspaceId, source.caseId, source.originalName, source.storageName, source.contentType, source.sizeBytes, source.status, JSON.stringify(source.profile), source.extractedText, source.createdAt); },
  listEvidence(workspaceId: string, caseId?: string) { const rows = caseId ? database().prepare("SELECT * FROM evidence_sources WHERE workspace_id=? AND case_id=? ORDER BY created_at DESC").all(workspaceId, caseId) : database().prepare("SELECT * FROM evidence_sources WHERE workspace_id=? ORDER BY created_at DESC").all(workspaceId); return rows.map((r) => ({ id:String(r.id), originalName:String(r.original_name), contentType:String(r.content_type), sizeBytes:Number(r.size_bytes), status:String(r.status), profile:JSON.parse(String(r.profile_json)), extractedText:String(r.extracted_text), caseId:r.case_id ? String(r.case_id) : null, createdAt:String(r.created_at) })); },
  linkEvidence(workspaceId: string, evidenceId: string, caseId: string | null) { return database().prepare("UPDATE evidence_sources SET case_id=? WHERE id=? AND workspace_id=?").run(caseId, evidenceId, workspaceId).changes > 0; },
  saveMapping(workspaceId: string, sourceId: string, mapping: Record<string, string>) { return database().prepare("INSERT INTO column_mappings(source_id,mapping_json,confirmed_at) SELECT id,?,? FROM evidence_sources WHERE id=? AND workspace_id=? ON CONFLICT(source_id) DO UPDATE SET mapping_json=excluded.mapping_json,confirmed_at=excluded.confirmed_at").run(JSON.stringify(mapping), new Date().toISOString(), sourceId, workspaceId).changes > 0; },
};

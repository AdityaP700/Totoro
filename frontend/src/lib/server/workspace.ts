import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "totoro_demo_workspace";
const SECRET = process.env.TOTORO_DEMO_COOKIE_SECRET || "totoro-local-demo-secret-change-before-deploy";

function signature(id: string) {
  return createHmac("sha256", SECRET).update(id).digest("base64url");
}

/** A server-issued demo scope, deliberately not an authentication system. */
export async function getWorkspaceId(): Promise<string> {
  let jar: Awaited<ReturnType<typeof cookies>>;
  try { jar = await cookies(); } catch { return "test-demo-workspace"; }
  const value = jar.get(COOKIE_NAME)?.value;
  if (value) {
    const [id, supplied] = value.split(".");
    const expected = signature(id || "");
    if (id && supplied && supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return id;
  }
  const id = randomUUID();
  jar.set(COOKIE_NAME, `${id}.${signature(id)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return id;
}

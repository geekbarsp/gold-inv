import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getSupabase } from "./supabase";

const COOKIE = "ngj_inventory_session";
const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  return value;
};
const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

export async function createSession(timeoutMinutes?: number) {
  let configuredTimeout = Number(process.env.SESSION_TIMEOUT_MINUTES || 480);
  let sessionVersion = 1;
  try {
    const { data } = await getSupabase()
      .from("application_settings")
      .select("session_timeout_minutes,session_version")
      .eq("id", true)
      .maybeSingle();
    configuredTimeout = data?.session_timeout_minutes || configuredTimeout;
    sessionVersion = data?.session_version || 1;
  } catch {}
  const maxAge = (timeoutMinutes ?? configuredTimeout) * 60;
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + maxAge * 1000,
      v: 1,
      sv: sessionVersion,
    }),
  ).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
    priority: "high",
  });
}
export async function isAuthenticated() {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return false;
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return false;
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as { exp?: number; sv?: number };
    if (!session.exp || session.exp <= Date.now()) return false;
    const { data, error } = await getSupabase()
      .from("application_settings")
      .select("session_version")
      .eq("id", true)
      .maybeSingle();
    return !error && (data?.session_version || 1) === (session.sv || 1);
  } catch {
    return false;
  }
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
export async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error("UNAUTHORIZED");
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    const requestUrl = new URL(request.url);
    if (new URL(origin).host !== requestUrl.host) throw new Error("FORBIDDEN");
  } catch {
    throw new Error("FORBIDDEN");
  }
}
export async function verifyPasscode(passcode: string) {
  let hash = process.env.PASSCODE_HASH;
  try {
    const { data } = await getSupabase()
      .from("application_settings")
      .select("passcode_hash")
      .eq("id", true)
      .maybeSingle();
    hash = data?.passcode_hash || hash;
  } catch {
    /* environment hash still supports initial setup */
  }
  if (!hash) throw new Error("PASSCODE_HASH is not configured.");
  return bcrypt.compare(passcode, hash);
}

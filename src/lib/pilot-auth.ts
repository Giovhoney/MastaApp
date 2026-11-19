import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const COOKIE = "masta_pilot_session";
const MAX_AGE = 8 * 60 * 60;
export function authConfigured() { return !!(process.env.PILOT_AUTH_SECRET && process.env.PILOT_PASSWORD && process.env.PILOT_USER_ID && process.env.PILOT_USER_NAME && process.env.PILOT_AUTH_SECRET.length >= 32); }
export function identity() { return { employeeId: process.env.PILOT_USER_ID!, employeeName: process.env.PILOT_USER_NAME! }; }
function sign(value: string) { return createHmac("sha256", process.env.PILOT_AUTH_SECRET!).update(value).digest("hex"); }
function safeEqual(a: string, b: string) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export function verifyPassword(userId: string, password: string) { return authConfigured() && safeEqual(userId, process.env.PILOT_USER_ID!) && safeEqual(password, process.env.PILOT_PASSWORD!); }
export function sessionValue() { const payload = Buffer.from(JSON.stringify({ id: process.env.PILOT_USER_ID, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url"); return `${payload}.${sign(payload)}`; }
export async function currentUser() {
  if (!authConfigured()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload))) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); if (data.id !== process.env.PILOT_USER_ID || typeof data.exp !== "number" || Date.now() >= data.exp) return null; return identity(); } catch { return null; }
}
export function sessionCookie(value: string, maxAge = MAX_AGE) { return { name: COOKIE, value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge }; }
export function sameOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin) return false; try { return new URL(origin).host === new URL(request.url).host; } catch { return false; } }

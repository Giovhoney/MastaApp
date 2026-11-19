import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
const scrypt = promisify(scryptCallback);
const db = new PrismaClient();
const COOKIE = "masta_pilot_session";
const MAX_AGE = 8 * 60 * 60;
export function authConfigured() { return !!(process.env.PILOT_AUTH_SECRET && process.env.PILOT_AUTH_SECRET.length >= 32 && process.env.DATABASE_URL); }
export function normalizeFirstName(value: string) { return value.trim().toLocaleLowerCase("en"); }
export function validFirstName(value: string) { return /^[\p{L}][\p{L}' -]{0,39}$/u.test(value.trim()); }
export function validPin(value: string) { return /^\d{6}$/.test(value); }
function sign(value: string) { return createHmac("sha256", process.env.PILOT_AUTH_SECRET!).update(value).digest("hex"); }
function safeEqual(a: string, b: string) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export async function hashPin(pin: string) { const salt = randomBytes(16).toString("hex"); const key = await scrypt(pin, salt, 64) as Buffer; return `${salt}:${key.toString("hex")}`; }
export async function verifyPin(pin: string, encoded: string) { const [salt, expected] = encoded.split(":"); if (!salt || !expected) return false; const key = await scrypt(pin, salt, 64) as Buffer; return safeEqual(key.toString("hex"), expected); }
export function sessionValue(userId: string) { const payload = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url"); return `${payload}.${sign(payload)}`; }
export async function currentUser() {
  if (!authConfigured()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.id !== "string" || typeof data.exp !== "number" || Date.now() >= data.exp) return null;
    const user = await db.appUser.findFirst({ where: { id: data.id, active: true, credential: { isNot: null } }, select: { id: true, displayName: true } });
    return user ? { employeeId: user.id, employeeName: user.displayName } : null;
  } catch { return null; }
}
export function sessionCookie(value: string, maxAge = MAX_AGE) { return { name: COOKIE, value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge }; }
export function sameOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin) return false; try { return new URL(origin).host === new URL(request.url).host; } catch { return false; } }
export { db as authDb };

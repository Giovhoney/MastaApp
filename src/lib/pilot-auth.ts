import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
const scrypt = promisify(scryptCallback);
const db = new PrismaClient();
export function authConfigured() { return !!process.env.DATABASE_URL; }
export function normalizeFirstName(value: string) { return value.trim().toLocaleLowerCase("en"); }
export function validFirstName(value: string) { return /^[\p{L}][\p{L}' -]{0,39}$/u.test(value.trim()); }
export function validPin(value: string) { return /^\d{6}$/.test(value); }
function safeEqual(a: string, b: string) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export async function hashPin(pin: string) { const salt = randomBytes(16).toString("hex"); const key = await scrypt(pin, salt, 64) as Buffer; return `${salt}:${key.toString("hex")}`; }
export async function verifyPin(pin: string, encoded: string) { const [salt, expected] = encoded.split(":"); if (!salt || !expected) return false; const key = await scrypt(pin, salt, 64) as Buffer; return safeEqual(key.toString("hex"), expected); }
export async function verifyActor(firstName: string, pin: string) {
  if (!validFirstName(firstName) || !validPin(pin)) return null;
  const record = await db.pilotCredential.findUnique({ where: { firstNameKey: normalizeFirstName(firstName) }, include: { user: true } });
  if (!record || !record.user.active || !(await verifyPin(pin, record.pinHash))) return null;
  return { employeeId: record.user.id, employeeName: record.user.displayName };
}
export function sameOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin) return false; try { return new URL(origin).host === new URL(request.url).host; } catch { return false; } }
export { db as authDb };

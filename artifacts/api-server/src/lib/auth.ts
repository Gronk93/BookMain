import crypto from "node:crypto";

export interface SessionData {
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory token session registry (with TTL)
const activeSessions = new Map<string, SessionData>();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const computed = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(originalHash));
  } catch {
    return false;
  }
}

export function createSessionToken(userId: string): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  activeSessions.set(token, {
    userId,
    createdAt: now,
    expiresAt,
  });

  return { token, expiresAt };
}

export function validateSessionToken(token: string): SessionData | null {
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt.getTime()) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

export function revokeSessionToken(token: string): boolean {
  return activeSessions.delete(token);
}

import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const PARENT_COOKIE = 'parent';
const KID_COOKIE = 'kid';
const PARENT_SESSION_MS = 12 * 60 * 60 * 1000;
const KID_SESSION_MS = 60 * 24 * 60 * 60 * 1000; // the device remembers who practices on it

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Lock out a key after too many misses. */
function limiter(maxFailures: number, lockoutMs: number) {
  const failures = new Map<string, { count: number; until: number }>();
  return {
    lockedFor(key: string): number {
      const f = failures.get(key);
      return f && f.until > Date.now() ? f.until - Date.now() : 0;
    },
    fail(key: string) {
      const now = Date.now();
      const f = failures.get(key);
      const count = (f && f.until <= now && f.count >= maxFailures ? 0 : f?.count ?? 0) + 1;
      failures.set(key, { count, until: count >= maxFailures ? now + lockoutMs : 0 });
    },
    clear(key: string) {
      failures.delete(key);
    },
  };
}

export function makeAuth(pin: string) {
  const pinDigest = digest(pin);
  const parentLimit = limiter(5, 5 * 60 * 1000);
  const kidLimit = limiter(5, 60 * 1000);

  const setSession = (reply: FastifyReply, name: string, value: string, ms: number) =>
    reply.setCookie(name, value, { signed: true, httpOnly: true, sameSite: 'strict', path: '/', secure: 'auto', maxAge: ms / 1000 });

  const readSession = (req: FastifyRequest, name: string): string | null => {
    const raw = req.cookies[name];
    if (!raw) return null;
    const { valid, value } = req.unsignCookie(raw);
    return valid ? value : null;
  };

  return {
    /** Returns null on success, or an error message. */
    login(req: FastifyRequest, reply: FastifyReply, attempt: unknown): string | null {
      const wait = parentLimit.lockedFor(req.ip);
      if (wait) return `Too many tries. Wait ${Math.ceil(wait / 60000)} minute(s).`;
      if (typeof attempt === 'string' && timingSafeEqual(digest(attempt), pinDigest)) {
        parentLimit.clear(req.ip);
        setSession(reply, PARENT_COOKIE, String(Date.now() + PARENT_SESSION_MS), PARENT_SESSION_MS);
        return null;
      }
      parentLimit.fail(req.ip);
      return 'Wrong PIN';
    },

    logout(reply: FastifyReply) {
      reply.clearCookie(PARENT_COOKIE, { path: '/' });
    },

    isParent(req: FastifyRequest): boolean {
      return Number(readSession(req, PARENT_COOKIE)) > Date.now();
    },

    /** check() verifies the picture code; returns null on success, or an error message. */
    kidLogin(req: FastifyRequest, reply: FastifyReply, kidId: number, check: () => boolean): string | null {
      const key = `${req.ip}:${kidId}`;
      const wait = kidLimit.lockedFor(key);
      if (wait) return `Too many tries. Wait ${Math.ceil(wait / 1000)} seconds and try again.`;
      if (!check()) {
        kidLimit.fail(key);
        return 'That’s not your picture code. Try again!';
      }
      kidLimit.clear(key);
      setSession(reply, KID_COOKIE, `${kidId}.${Date.now() + KID_SESSION_MS}`, KID_SESSION_MS);
      return null;
    },

    kidLogout(reply: FastifyReply) {
      reply.clearCookie(KID_COOKIE, { path: '/' });
    },

    kidId(req: FastifyRequest): number | null {
      const [id, exp] = (readSession(req, KID_COOKIE) ?? '').split('.').map(Number);
      return id && exp > Date.now() ? id : null;
    },
  };
}

export type Auth = ReturnType<typeof makeAuth>;

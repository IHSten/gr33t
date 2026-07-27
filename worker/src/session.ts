import type { Context, Env } from "hono";
import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";
import type { Bindings } from "./index";

export const SESSION_COOKIE = "gr33t_session";
const KV_PREFIX = "sess:";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type SessionRecord = {
  userId: string;
  createdAt: number;
  expiresAt: number;
};

const DEV_COOKIE_SECRET = "gr33t-local-dev-insecure-secret";

export function cookieSecret(env: Bindings): string {
  if (env.COOKIE_SECRET && env.COOKIE_SECRET.length > 0) {
    return env.COOKIE_SECRET;
  }
  if (env.AUTH_MODE === "local") {
    return DEV_COOKIE_SECRET;
  }
  throw new Error(
    'COOKIE_SECRET is required unless AUTH_MODE="local". Set it as a Worker secret before deploying.'
  );
}

function secureCookie(env: Bindings): boolean {
  return env.AUTH_MODE !== "local";
}

function newSessionId(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

type Ctx<E extends Env = Env> = Context<E & { Bindings: Bindings }>;

export async function issueSession<E extends Env>(
  c: Ctx<E>,
  userId: string
): Promise<string> {
  const sessionId = newSessionId();
  const createdAt = nowSec();
  const expiresAt = createdAt + SESSION_TTL_SECONDS;
  const record: SessionRecord = { userId, createdAt, expiresAt };

  await c.env.SESSIONS.put(KV_PREFIX + sessionId, JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  await setSignedCookie(c, SESSION_COOKIE, sessionId, cookieSecret(c.env), {
    httpOnly: true,
    secure: secureCookie(c.env),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

export async function getSessionUserId<E extends Env>(
  c: Ctx<E>
): Promise<string | null> {
  const sessionId = await getSignedCookie(
    c,
    cookieSecret(c.env),
    SESSION_COOKIE
  );
  if (!sessionId) return null;

  const record = await c.env.SESSIONS.get<SessionRecord>(
    KV_PREFIX + sessionId,
    "json"
  );
  if (!record) return null;
  if (record.expiresAt <= nowSec()) {
    await c.env.SESSIONS.delete(KV_PREFIX + sessionId);
    return null;
  }
  return record.userId;
}

export async function destroySession<E extends Env>(c: Ctx<E>): Promise<void> {
  const sessionId = await getSignedCookie(
    c,
    cookieSecret(c.env),
    SESSION_COOKIE
  );
  if (sessionId) {
    await c.env.SESSIONS.delete(KV_PREFIX + sessionId);
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

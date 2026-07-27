import { Hono } from "hono";
import { setSignedCookie, getSignedCookie, deleteCookie } from "hono/cookie";
import { getDb } from "../db";
import { findUserById, upsertUserByEmail } from "../db/users";
import { requireUser, DEV_USER_ID } from "../auth";
import type { AuthVariables } from "../auth";
import { issueSession, destroySession, cookieSecret } from "../session";
import {
  getGoogleConfig,
  buildAuthUrl,
  exchangeCode,
  fetchProfile,
  randomState,
  GoogleNotConfiguredError,
} from "../google";
import { parseOptionalJsonBody, DevLoginSchema } from "../validate";
import { track } from "../analytics";
import type { Bindings } from "../index";

type Env = { Bindings: Bindings; Variables: AuthVariables };

const authRoutes = new Hono<Env>();

const OAUTH_STATE_COOKIE = "gr33t_oauth_state";
const OAUTH_STATE_TTL = 600;

function isLocal(env: Bindings): boolean {
  return env.AUTH_MODE === "local";
}

authRoutes.get("/me", requireUser, c => {
  return c.json({ user: c.get("user") });
});

authRoutes.post("/logout", async c => {
  await destroySession(c);
  return c.json({ ok: true });
});

authRoutes.post("/dev-login", async c => {
  if (!isLocal(c.env)) {
    return c.json(
      { error: "dev-login is disabled outside AUTH_MODE=local" },
      404
    );
  }

  const db = getDb(c.env.DB);
  const body = await parseOptionalJsonBody(c, DevLoginSchema);
  const email = body?.email ?? "";

  let userId: string;
  if (email) {
    const { user } = await upsertUserByEmail(db, { email });
    userId = user.id;
  } else {
    const seeded = await findUserById(db, DEV_USER_ID);
    if (seeded) {
      userId = seeded.id;
    } else {
      const { user } = await upsertUserByEmail(db, {
        email: "dev@gr33t.local",
      });
      userId = user.id;
    }
  }

  await issueSession(c, userId);
  const user = await findUserById(db, userId);
  return c.json({ user: { id: user!.id, email: user!.email } });
});

authRoutes.get("/google", async c => {
  const cfg = getGoogleConfig(c.env);
  const state = randomState();

  await setSignedCookie(c, OAUTH_STATE_COOKIE, state, cookieSecret(c.env), {
    httpOnly: true,
    secure: !isLocal(c.env),
    sameSite: "Lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL,
  });

  return c.redirect(buildAuthUrl(cfg, state));
});

authRoutes.get("/google/callback", async c => {
  const cfg = getGoogleConfig(c.env);

  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  if (error) {
    return c.json({ error: `Google sign-in failed: ${error}` }, 400);
  }
  if (!code || !state) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  const expectedState = await getSignedCookie(
    c,
    cookieSecret(c.env),
    OAUTH_STATE_COOKIE
  );
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
  if (!expectedState || expectedState !== state) {
    return c.json({ error: "Invalid OAuth state" }, 400);
  }

  const accessToken = await exchangeCode(cfg, code);
  const profile = await fetchProfile(accessToken);

  if (!profile.emailVerified) {
    return c.json({ error: "Google account email is not verified" }, 403);
  }

  const db = getDb(c.env.DB);
  const { user, created } = await upsertUserByEmail(db, {
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatarUrl: profile.avatarUrl,
  });

  await issueSession(c, user.id);

  track(c.env, c.req.raw, {
    type: created ? "dashboard.user.signed_up" : "dashboard.user.logged_in",
    userId: user.id,
  });

  return c.redirect(c.env.POST_LOGIN_REDIRECT ?? "/");
});

authRoutes.onError((err, c) => {
  if (err instanceof GoogleNotConfiguredError) {
    return c.json({ error: err.message }, 500);
  }
  throw err;
});

export default authRoutes;

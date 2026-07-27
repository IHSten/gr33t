import { describe, it, expect, afterEach, vi } from "vitest";
import { env } from "cloudflare:test";
import { api, cookieFrom, devHeaders, seedUser } from "./helpers";

function mockGoogleFetch(emailVerified: boolean) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "access-token" });
    }
    if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
      return Response.json({
        email: "person@gmail.com",
        email_verified: emailVerified,
        given_name: "Person",
      });
    }
    throw new Error(`unexpected outbound fetch: ${url}`);
  });
}

afterEach(() => {
  env.AUTH_MODE = "local";
  delete env.GOOGLE_CLIENT_ID;
  delete env.GOOGLE_CLIENT_SECRET;
  delete env.GOOGLE_REDIRECT_URI;
  vi.unstubAllGlobals();
});

describe("dev-login (local)", () => {
  it("signs in as the fallback dev user and sets a session cookie", async () => {
    const res = await api("/api/auth/dev-login", { method: "POST" });
    expect(res.status).toBe(200);
    const { user } = (await res.json()) as { user: { email: string } };
    expect(user.email).toBe("dev@gr33t.local");
    expect(cookieFrom(res, "gr33t_session")).toBeTruthy();
  });

  it("signs in / upserts by email, idempotently", async () => {
    const first = await api("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "Me@Example.com" }),
    });
    const second = await api("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "me@example.com" }),
    });
    const u1 = (await first.json()) as { user: { id: string; email: string } };
    const u2 = (await second.json()) as { user: { id: string } };
    expect(u1.user.email).toBe("me@example.com");
    expect(u2.user.id).toBe(u1.user.id);
  });

  it("400s an invalid email", async () => {
    const res = await api("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("session round-trip: /me + logout", () => {
  it("401 when signed out, 200 with the session cookie, 401 after logout", async () => {
    expect((await api("/api/auth/me")).status).toBe(401);

    const login = await api("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const cookie = cookieFrom(login, "gr33t_session")!;

    const me = await api("/api/auth/me", { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);
    expect((await me.json()) as { user: { email: string } }).toMatchObject({
      user: { email: "a@b.com" },
    });

    const out = await api("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(out.status).toBe(200);
    expect(await out.json()).toEqual({ ok: true });

    expect(
      (await api("/api/auth/me", { headers: { Cookie: cookie } })).status
    ).toBe(401);
  });

  it("resolves the user via the X-Dev-User shortcut in local mode", async () => {
    await seedUser("u-dev", "dev@x.com");
    const me = await api("/api/auth/me", { headers: devHeaders("u-dev") });
    expect(me.status).toBe(200);
  });
});

describe("google mode (fail-closed dev shortcuts)", () => {
  it("disables dev-login and the X-Dev-User shortcut", async () => {
    await seedUser("u1");
    env.AUTH_MODE = "google";

    expect((await api("/api/auth/dev-login", { method: "POST" })).status).toBe(
      404
    );
    expect(
      (await api("/api/cards", { headers: devHeaders("u1") })).status
    ).toBe(401);
  });

  it("500s the google routes until configured", async () => {
    env.AUTH_MODE = "google";
    const res = await api("/api/auth/google", { redirect: "manual" });
    expect(res.status).toBe(500);
  });
});

describe("google OAuth flow", () => {
  function configureGoogle() {
    env.AUTH_MODE = "google";
    env.GOOGLE_CLIENT_ID = "client-id";
    env.GOOGLE_CLIENT_SECRET = "client-secret";
    env.GOOGLE_REDIRECT_URI = "https://gr33t.test/api/auth/google/callback";
  }

  async function startFlow() {
    const start = await api("/api/auth/google", { redirect: "manual" });
    expect(start.status).toBe(302);
    const location = new URL(start.headers.get("location")!);
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    return {
      state: location.searchParams.get("state")!,
      stateCookie: cookieFrom(start, "gr33t_oauth_state")!,
    };
  }

  it("redirects to Google with a state cookie", async () => {
    configureGoogle();
    const { state, stateCookie } = await startFlow();
    expect(state).toBeTruthy();
    expect(stateCookie).toContain("gr33t_oauth_state=");
  });

  it("400s the callback on missing params and bad state", async () => {
    configureGoogle();
    expect((await api("/api/auth/google/callback")).status).toBe(400);
    const { stateCookie } = await startFlow();
    const bad = await api("/api/auth/google/callback?code=c&state=wrong", {
      headers: { Cookie: stateCookie },
    });
    expect(bad.status).toBe(400);
  });

  it("completes sign-in for a verified email and issues a session", async () => {
    configureGoogle();
    const { state, stateCookie } = await startFlow();
    mockGoogleFetch(true);

    const cb = await api(
      `/api/auth/google/callback?code=auth-code&state=${state}`,
      { headers: { Cookie: stateCookie }, redirect: "manual" }
    );
    expect(cb.status).toBe(302);
    expect(cookieFrom(cb, "gr33t_session")).toBeTruthy();
  });

  it("rejects an unverified email (403) — no account takeover", async () => {
    configureGoogle();
    const { state, stateCookie } = await startFlow();
    mockGoogleFetch(false);

    const cb = await api(
      `/api/auth/google/callback?code=auth-code&state=${state}`,
      { headers: { Cookie: stateCookie }, redirect: "manual" }
    );
    expect(cb.status).toBe(403);
  });
});

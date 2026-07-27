import type { Bindings } from "./index";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super(
      "Google sign-in is not configured. Set GOOGLE_CLIENT_ID, " +
        "GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI (see README)."
    );
  }
}

export function getGoogleConfig(env: Bindings): GoogleConfig {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new GoogleNotConfiguredError();
  }
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
}

export function randomState(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

export function buildAuthUrl(cfg: GoogleConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCode(
  cfg: GoogleConfig,
  code: string
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Google token exchange returned no access_token");
  }
  return json.access_token;
}

export async function fetchProfile(
  accessToken: string
): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo fetch failed: ${res.status}`);
  }
  const p = (await res.json()) as {
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
  if (!p.email) {
    throw new Error("Google profile has no email");
  }
  return {
    email: p.email,
    emailVerified: p.email_verified ?? false,
    firstName: p.given_name ?? null,
    lastName: p.family_name ?? null,
    avatarUrl: p.picture ?? null,
  };
}

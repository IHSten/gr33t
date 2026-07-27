export type AuthUser = {
  id: string;
  email: string;
};

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`auth/me failed: ${res.status}`);
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

export async function devLogin(email?: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/dev-login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(email ? { email } : {}),
  });
  if (!res.ok) throw new Error(`dev-login failed: ${res.status}`);
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

export function googleLogin(): void {
  window.location.href = "/api/auth/google";
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

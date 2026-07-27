import type { ConnectionType } from "@shared/connection";

export type OwnerCard = {
  id: string;
  userId: string;
  title: string | null;
  description: string | null;
  createdAt: number;
  updatedAt: number;
};

export type OwnerConnection = {
  id: string;
  userId: string;
  type: ConnectionType;
  handle: string;
  link: string;
  imageUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type OwnerCardDetail = {
  card: OwnerCard;
  connections: OwnerConnection[];
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : undefined) ?? `Request failed: ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export { ApiError };

export async function listCards(): Promise<OwnerCard[]> {
  const data = await req<{ cards: OwnerCard[] }>("/api/cards");
  return data.cards;
}

export async function getCardDetail(id: string): Promise<OwnerCardDetail> {
  return req<OwnerCardDetail>(`/api/cards/${id}`);
}

export type CardPatch = {
  title?: string | null;
  description?: string | null;
};

export async function createCard(input: CardPatch = {}): Promise<OwnerCard> {
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string") payload[k] = v;
  }
  return req<OwnerCard>("/api/cards", jsonInit("POST", payload));
}

export async function updateCard(
  id: string,
  patch: CardPatch
): Promise<OwnerCard> {
  return req<OwnerCard>(`/api/cards/${id}`, jsonInit("PATCH", patch));
}

export async function deleteCard(id: string): Promise<void> {
  await req<void>(`/api/cards/${id}`, { method: "DELETE" });
}

export async function setCardConnections(
  cardId: string,
  connectionIds: string[]
): Promise<void> {
  await req<{ cardId: string; connectionIds: string[] }>(
    `/api/cards/${cardId}/connections`,
    jsonInit("PUT", { connectionIds })
  );
}

export async function attachConnection(
  cardId: string,
  connectionId: string
): Promise<void> {
  await req<unknown>(
    `/api/cards/${cardId}/connections/${connectionId}`,
    jsonInit("POST", {})
  );
}

export type ConnectionInput = {
  type: ConnectionType;
  handle: string;
  link: string;
  imageUrl?: string;
};

export async function createConnection(
  input: ConnectionInput
): Promise<OwnerConnection> {
  return req<OwnerConnection>("/api/connections", jsonInit("POST", input));
}

export type ConnectionPatch = {
  type?: ConnectionType;
  handle?: string;
  link?: string;
  imageUrl?: string | null;
};

export async function updateConnection(
  id: string,
  patch: ConnectionPatch
): Promise<OwnerConnection> {
  return req<OwnerConnection>(
    `/api/connections/${id}`,
    jsonInit("PATCH", patch)
  );
}

export async function deleteConnection(id: string): Promise<void> {
  await req<void>(`/api/connections/${id}`, { method: "DELETE" });
}

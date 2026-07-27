import { env, SELF } from "cloudflare:test";
import { getDb } from "../src/db";
import { users, cards, connections, cardConnections } from "../src/db/schema";

export const BASE = "https://gr33t.test";

export function db() {
  return getDb(env.DB);
}

export async function resetDb() {
  const d = db();
  await d.delete(cardConnections);
  await d.delete(cards);
  await d.delete(connections);
  await d.delete(users);
}

export async function resetKv() {
  const { keys } = await env.SESSIONS.list();
  await Promise.all(keys.map(k => env.SESSIONS.delete(k.name)));
}

export async function seedUser(id: string, email = `${id}@test.local`) {
  await db().insert(users).values({ id, email });
  return { id, email };
}

export async function seedCard(
  id: string,
  userId: string,
  over: Partial<typeof cards.$inferInsert> = {}
) {
  await db()
    .insert(cards)
    .values({ id, userId, title: "Test Card", ...over });
  return id;
}

export async function seedConnection(
  id: string,
  userId: string,
  over: Partial<typeof connections.$inferInsert> = {}
) {
  await db()
    .insert(connections)
    .values({
      id,
      userId,
      type: "Website",
      handle: "handle",
      link: "https://example.com",
      ...over,
    });
  return id;
}

export async function attach(
  cardId: string,
  connectionId: string,
  position = 0
) {
  await db().insert(cardConnections).values({ cardId, connectionId, position });
}

export function devHeaders(
  userId: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  return { "X-Dev-User": userId, "Content-Type": "application/json", ...extra };
}

export function api(pathname: string, init?: RequestInit) {
  return SELF.fetch(`${BASE}${pathname}`, init);
}

export function cookieFrom(res: Response, name: string): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = new RegExp(`${name}=([^;]+)`).exec(setCookie);
  return match ? `${name}=${match[1]}` : null;
}

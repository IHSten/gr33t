import { eq, and, asc, sql, max, inArray } from "drizzle-orm";
import type { DB } from "./index";
import { cards, connections, cardConnections } from "./schema";
import type { CardRow, ConnectionRow } from "./schema";
import type {
  CreateCardInput,
  UpdateCardInput,
  CreateConnectionInput,
  UpdateConnectionInput,
} from "../validate";

const nowSec = sql`(unixepoch())`;

function uuid(): string {
  return crypto.randomUUID();
}

export async function createCard(
  db: DB,
  userId: string,
  input: CreateCardInput
): Promise<CardRow> {
  const id = uuid();
  await db.insert(cards).values({
    id,
    userId,
    title: input.title ?? null,
    description: input.description ?? null,
  });
  const row = await db.query.cards.findFirst({ where: eq(cards.id, id) });
  return row!;
}

export async function findCard(db: DB, id: string): Promise<CardRow | null> {
  const row = await db.query.cards.findFirst({ where: eq(cards.id, id) });
  return row ?? null;
}

export async function listCardsByUser(
  db: DB,
  userId: string
): Promise<CardRow[]> {
  return db.query.cards.findMany({
    where: eq(cards.userId, userId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
}

export async function listCardConnectionRows(
  db: DB,
  cardId: string
): Promise<ConnectionRow[]> {
  return db
    .select({
      id: connections.id,
      userId: connections.userId,
      type: connections.type,
      handle: connections.handle,
      link: connections.link,
      imageUrl: connections.imageUrl,
      createdAt: connections.createdAt,
      updatedAt: connections.updatedAt,
    })
    .from(cardConnections)
    .innerJoin(connections, eq(cardConnections.connectionId, connections.id))
    .where(eq(cardConnections.cardId, cardId))
    .orderBy(asc(cardConnections.position));
}

export async function updateCard(
  db: DB,
  id: string,
  input: UpdateCardInput
): Promise<CardRow> {
  const patch: Partial<typeof cards.$inferInsert> = {
    updatedAt: nowSec as never,
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  await db.update(cards).set(patch).where(eq(cards.id, id));
  const row = await db.query.cards.findFirst({ where: eq(cards.id, id) });
  return row!;
}

export async function deleteCard(db: DB, id: string): Promise<void> {
  await db.delete(cards).where(eq(cards.id, id));
}

export async function createConnection(
  db: DB,
  userId: string,
  input: CreateConnectionInput
): Promise<ConnectionRow> {
  const id = uuid();
  await db.insert(connections).values({
    id,
    userId,
    type: input.type,
    handle: input.handle,
    link: input.link,
    imageUrl: input.imageUrl ?? null,
  });
  const row = await db.query.connections.findFirst({
    where: eq(connections.id, id),
  });
  return row!;
}

export async function findConnection(
  db: DB,
  id: string
): Promise<ConnectionRow | null> {
  const row = await db.query.connections.findFirst({
    where: eq(connections.id, id),
  });
  return row ?? null;
}

export async function updateConnection(
  db: DB,
  id: string,
  input: UpdateConnectionInput
): Promise<ConnectionRow> {
  const patch: Partial<typeof connections.$inferInsert> = {
    updatedAt: nowSec as never,
  };
  if (input.type !== undefined) patch.type = input.type;
  if (input.handle !== undefined) patch.handle = input.handle;
  if (input.link !== undefined) patch.link = input.link;
  if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
  await db.update(connections).set(patch).where(eq(connections.id, id));
  const row = await db.query.connections.findFirst({
    where: eq(connections.id, id),
  });
  return row!;
}

export async function deleteConnection(db: DB, id: string): Promise<void> {
  await db.delete(connections).where(eq(connections.id, id));
}

// Card ids a connection is currently attached to — used to invalidate the
// public card cache when a connection is edited or deleted (it may appear on
// more than one card). Call before deleting, since the cascade removes the join.
export async function listCardIdsForConnection(
  db: DB,
  connectionId: string
): Promise<string[]> {
  const rows = await db
    .select({ cardId: cardConnections.cardId })
    .from(cardConnections)
    .where(eq(cardConnections.connectionId, connectionId));
  return rows.map(r => r.cardId);
}

export async function findOwnedConnectionIds(
  db: DB,
  userId: string,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: connections.id })
    .from(connections)
    .where(and(eq(connections.userId, userId), inArray(connections.id, ids)));
  return new Set(rows.map(r => r.id));
}

// Keep each INSERT well under D1's per-statement bound-parameter limit
// (3 columns per row).
const CARD_CONNECTIONS_INSERT_CHUNK = 50;

export async function setCardConnections(
  db: DB,
  cardId: string,
  connectionIds: string[]
): Promise<void> {
  const deleteStmt = db
    .delete(cardConnections)
    .where(eq(cardConnections.cardId, cardId));

  if (connectionIds.length === 0) {
    await deleteStmt;
    return;
  }

  const rows = connectionIds.map((connectionId, position) => ({
    cardId,
    connectionId,
    position,
  }));

  const insertStmts = [];
  for (let i = 0; i < rows.length; i += CARD_CONNECTIONS_INSERT_CHUNK) {
    insertStmts.push(
      db
        .insert(cardConnections)
        .values(rows.slice(i, i + CARD_CONNECTIONS_INSERT_CHUNK))
    );
  }

  // db.batch runs atomically on D1, so a failing insert never leaves the card
  // with the delete committed and zero connections.
  await db.batch([deleteStmt, ...insertStmts]);
}

export async function isAttached(
  db: DB,
  cardId: string,
  connectionId: string
): Promise<boolean> {
  const row = await db.query.cardConnections.findFirst({
    where: and(
      eq(cardConnections.cardId, cardId),
      eq(cardConnections.connectionId, connectionId)
    ),
  });
  return !!row;
}

export async function attachConnection(
  db: DB,
  cardId: string,
  connectionId: string,
  position?: number
): Promise<boolean> {
  let pos = position;
  if (pos === undefined) {
    const [{ value }] = await db
      .select({ value: max(cardConnections.position) })
      .from(cardConnections)
      .where(eq(cardConnections.cardId, cardId));
    pos = value === null ? 0 : value + 1;
  }
  // Insert-or-nothing so two concurrent attaches of the same pair don't turn
  // the (cardId, connectionId) primary-key conflict into a 500 — the loser
  // simply returns no row and the caller reports 409 "already attached".
  const inserted = await db
    .insert(cardConnections)
    .values({ cardId, connectionId, position: pos })
    .onConflictDoNothing()
    .returning({ connectionId: cardConnections.connectionId });
  return inserted.length > 0;
}

export async function detachConnection(
  db: DB,
  cardId: string,
  connectionId: string
): Promise<boolean> {
  const existed = await isAttached(db, cardId, connectionId);
  if (!existed) return false;
  await db
    .delete(cardConnections)
    .where(
      and(
        eq(cardConnections.cardId, cardId),
        eq(cardConnections.connectionId, connectionId)
      )
    );
  return true;
}

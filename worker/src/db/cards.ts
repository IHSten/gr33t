import { eq, asc } from "drizzle-orm";
import type { DB } from "./index";
import { cards, connections, cardConnections } from "./schema";
import type { Card } from "../../../shared/card";
import type { ConnectionType } from "../../../shared/connection";

export async function getCardById(
  db: DB,
  cardId: string
): Promise<Card | null> {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    columns: { id: true, title: true, description: true },
  });

  if (!card) return null;

  const rows = await db
    .select({
      type: connections.type,
      handle: connections.handle,
      imageUrl: connections.imageUrl,
      link: connections.link,
    })
    .from(cardConnections)
    .innerJoin(connections, eq(cardConnections.connectionId, connections.id))
    .where(eq(cardConnections.cardId, cardId))
    .orderBy(asc(cardConnections.position));

  return {
    id: card.id,
    title: card.title,
    description: card.description,
    connections: rows.map(r => ({
      type: r.type as ConnectionType,
      details: {
        handle: r.handle,
        imageUrl: r.imageUrl ?? "",
        link: r.link,
      },
    })),
  };
}

// Owner attribution for analytics. Kept separate from `getCardById` so the
// public card response never carries the owner's user id.
export async function getCardOwnerId(
  db: DB,
  cardId: string
): Promise<string | null> {
  const row = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    columns: { userId: true },
  });
  return row?.userId ?? null;
}

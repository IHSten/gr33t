import { Hono } from "hono";
import { getDb } from "../db";
import { track } from "../analytics";
import { invalidateCards } from "../cardCache";
import { requireUser } from "../auth";
import type { AuthVariables } from "../auth";
import type { Bindings } from "../index";
import {
  parseJsonBody,
  parseAttachPosition,
  CreateCardSchema,
  UpdateCardSchema,
  SetCardConnectionsSchema,
} from "../validate";
import {
  createCard,
  findCard,
  updateCard,
  deleteCard,
  setCardConnections,
  findOwnedConnectionIds,
  findConnection,
  attachConnection,
  detachConnection,
  listCardsByUser,
  listCardConnectionRows,
} from "../db/mutations";

type Env = { Bindings: Bindings; Variables: AuthVariables };

const cardsRoutes = new Hono<Env>();

cardsRoutes.use("*", requireUser);

cardsRoutes.get("/", async c => {
  const db = getDb(c.env.DB);
  const rows = await listCardsByUser(db, c.get("user").id);
  return c.json({ cards: rows }, 200);
});

cardsRoutes.get("/:id", async c => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);

  const card = await findCard(db, id);
  if (!card) return c.json({ error: "Card not found" }, 404);
  if (card.userId !== c.get("user").id)
    return c.json({ error: "Forbidden" }, 403);

  const connections = await listCardConnectionRows(db, id);
  return c.json({ card, connections }, 200);
});

cardsRoutes.post("/", async c => {
  const input = await parseJsonBody(c, CreateCardSchema);
  const db = getDb(c.env.DB);
  const card = await createCard(db, c.get("user").id, input);
  track(c.env, c.req.raw, {
    type: "dashboard.card.created",
    cardId: card.id,
    ownerId: c.get("user").id,
  });
  return c.json(card, 201);
});

cardsRoutes.patch("/:id", async c => {
  const id = c.req.param("id");
  const input = await parseJsonBody(c, UpdateCardSchema);
  const db = getDb(c.env.DB);

  const existing = await findCard(db, id);
  if (!existing) return c.json({ error: "Card not found" }, 404);
  if (existing.userId !== c.get("user").id)
    return c.json({ error: "Forbidden" }, 403);

  const card = await updateCard(db, id, input);
  await invalidateCards(c.env, [id]);
  track(c.env, c.req.raw, {
    type: "dashboard.card.updated",
    cardId: id,
    ownerId: existing.userId,
  });
  return c.json(card, 200);
});

cardsRoutes.delete("/:id", async c => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);

  const existing = await findCard(db, id);
  if (!existing) return c.json({ error: "Card not found" }, 404);
  if (existing.userId !== c.get("user").id)
    return c.json({ error: "Forbidden" }, 403);

  await deleteCard(db, id);
  await invalidateCards(c.env, [id]);
  track(c.env, c.req.raw, {
    type: "dashboard.card.deleted",
    cardId: id,
    ownerId: existing.userId,
  });
  return c.body(null, 204);
});

cardsRoutes.put("/:id/connections", async c => {
  const id = c.req.param("id");
  const connectionIds = await parseJsonBody(c, SetCardConnectionsSchema);
  const db = getDb(c.env.DB);
  const userId = c.get("user").id;

  const card = await findCard(db, id);
  if (!card) return c.json({ error: "Card not found" }, 404);
  if (card.userId !== userId) return c.json({ error: "Forbidden" }, 403);

  const owned = await findOwnedConnectionIds(db, userId, connectionIds);
  const missing = connectionIds.filter(cid => !owned.has(cid));
  if (missing.length > 0) {
    return c.json(
      {
        error: "Unknown or unowned connection ids",
        connectionIds: missing,
      },
      400
    );
  }

  await setCardConnections(db, id, connectionIds);
  await invalidateCards(c.env, [id]);
  return c.json({ cardId: id, connectionIds }, 200);
});

cardsRoutes.post("/:id/connections/:connectionId", async c => {
  const id = c.req.param("id");
  const connectionId = c.req.param("connectionId");
  const position = await parseAttachPosition(c);
  const db = getDb(c.env.DB);
  const userId = c.get("user").id;

  const card = await findCard(db, id);
  if (!card) return c.json({ error: "Card not found" }, 404);
  if (card.userId !== userId) return c.json({ error: "Forbidden" }, 403);

  const conn = await findConnection(db, connectionId);
  if (!conn) return c.json({ error: "Connection not found" }, 404);
  if (conn.userId !== userId) return c.json({ error: "Forbidden" }, 403);

  const attached = await attachConnection(db, id, connectionId, position);
  if (!attached) {
    return c.json({ error: "Connection already attached to card" }, 409);
  }
  await invalidateCards(c.env, [id]);
  return c.json({ cardId: id, connectionId }, 201);
});

cardsRoutes.delete("/:id/connections/:connectionId", async c => {
  const id = c.req.param("id");
  const connectionId = c.req.param("connectionId");
  const db = getDb(c.env.DB);
  const userId = c.get("user").id;

  const card = await findCard(db, id);
  if (!card) return c.json({ error: "Card not found" }, 404);
  if (card.userId !== userId) return c.json({ error: "Forbidden" }, 403);

  const removed = await detachConnection(db, id, connectionId);
  if (!removed) {
    return c.json({ error: "Connection not attached to card" }, 404);
  }
  await invalidateCards(c.env, [id]);
  return c.body(null, 204);
});

export default cardsRoutes;

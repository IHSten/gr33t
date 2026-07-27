import { Hono } from "hono";
import { getDb } from "../db";
import { track } from "../analytics";
import { invalidateCards } from "../cardCache";
import { requireUser } from "../auth";
import type { AuthVariables } from "../auth";
import type { Bindings } from "../index";
import {
  parseJsonBody,
  CreateConnectionSchema,
  UpdateConnectionSchema,
} from "../validate";
import {
  createConnection,
  findConnection,
  updateConnection,
  deleteConnection,
  listCardIdsForConnection,
} from "../db/mutations";

type Env = { Bindings: Bindings; Variables: AuthVariables };

const connectionsRoutes = new Hono<Env>();

connectionsRoutes.use("*", requireUser);

connectionsRoutes.post("/", async c => {
  const input = await parseJsonBody(c, CreateConnectionSchema);
  const db = getDb(c.env.DB);
  const conn = await createConnection(db, c.get("user").id, input);
  track(c.env, c.req.raw, {
    type: "dashboard.connection.created",
    connectionId: conn.id,
    ownerId: c.get("user").id,
    connectionType: input.type,
  });
  return c.json(conn, 201);
});

connectionsRoutes.patch("/:id", async c => {
  const id = c.req.param("id");
  const input = await parseJsonBody(c, UpdateConnectionSchema);
  const db = getDb(c.env.DB);

  const existing = await findConnection(db, id);
  if (!existing) return c.json({ error: "Connection not found" }, 404);
  if (existing.userId !== c.get("user").id)
    return c.json({ error: "Forbidden" }, 403);

  const conn = await updateConnection(db, id, input);
  // The connection's fields appear on every card it's attached to.
  await invalidateCards(c.env, await listCardIdsForConnection(db, id));
  return c.json(conn, 200);
});

connectionsRoutes.delete("/:id", async c => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);

  const existing = await findConnection(db, id);
  if (!existing) return c.json({ error: "Connection not found" }, 404);
  if (existing.userId !== c.get("user").id)
    return c.json({ error: "Forbidden" }, 403);

  // Capture attached cards before the delete cascades away the join rows.
  const affectedCards = await listCardIdsForConnection(db, id);
  await deleteConnection(db, id);
  await invalidateCards(c.env, affectedCards);
  return c.body(null, 204);
});

export default connectionsRoutes;

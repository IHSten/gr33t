import type { Context, MiddlewareHandler } from "hono";
import { getDb } from "./db";
import { findUserById } from "./db/users";
import { getSessionUserId } from "./session";
import type { Bindings } from "./index";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthVariables = {
  user: AuthUser;
};

export const DEV_USER_ID = "user-sample-0001";

async function resolveUser(
  c: Context<{ Bindings: Bindings; Variables: AuthVariables }>
): Promise<AuthUser | null> {
  const db = getDb(c.env.DB);

  const userId = await getSessionUserId(c);
  if (userId) {
    const row = await findUserById(db, userId);
    if (row) return { id: row.id, email: row.email };
  }

  if (c.env.AUTH_MODE === "local") {
    const header = c.req.header("X-Dev-User");
    if (header !== undefined) {
      const requestedId = header || DEV_USER_ID;
      const row = await findUserById(db, requestedId);
      if (row) return { id: row.id, email: row.email };
    }
  }

  return null;
}

export const requireUser: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: AuthVariables;
}> = async (c, next) => {
  const user = await resolveUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
};

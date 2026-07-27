import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch())`;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    description: text("description"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  t => ({
    userIdx: index("cards_user_id_idx").on(t.userId),
  })
);

export const connections = sqliteTable(
  "connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    handle: text("handle").notNull(),
    link: text("link").notNull(),
    imageUrl: text("image_url"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  t => ({
    userIdx: index("connections_user_id_idx").on(t.userId),
  })
);

export const cardConnections = sqliteTable(
  "card_connections",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  t => ({
    pk: primaryKey({ columns: [t.cardId, t.connectionId] }),
    connectionIdx: index("card_connections_connection_id_idx").on(
      t.connectionId
    ),
  })
);

export type UserRow = typeof users.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;

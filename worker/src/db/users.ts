import { eq } from "drizzle-orm";
import type { DB } from "./index";
import { users } from "./schema";
import type { UserRow } from "./schema";

function uuid(): string {
  return crypto.randomUUID();
}

export async function findUserById(
  db: DB,
  id: string
): Promise<UserRow | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  return row ?? null;
}

export async function findUserByEmail(
  db: DB,
  email: string
): Promise<UserRow | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  return row ?? null;
}

export type UpsertUserInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

export type UpsertUserResult = {
  user: UserRow;
  // True when this call created the row (first-ever login → sign-up), false
  // when the user already existed (returning login). Lets auth emit the right
  // analytics event.
  created: boolean;
};

export async function upsertUserByEmail(
  db: DB,
  input: UpsertUserInput
): Promise<UpsertUserResult> {
  const email = input.email.toLowerCase();

  // Create-if-absent in a single conflict-safe statement so two concurrent
  // first-time logins for the same email (OAuth double-submit) don't race the
  // read-then-insert into a UNIQUE-constraint 500 — the loser is a no-op.
  // `returning` yields the inserted row only when we actually created it, so an
  // empty result means the user already existed.
  const inserted = await db
    .insert(users)
    .values({
      id: uuid(),
      email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  const created = inserted.length > 0;

  const existing = (await findUserByEmail(db, email))!;

  // Backfill any profile fields that were missing on an earlier login.
  const patch: Partial<typeof users.$inferInsert> = {};
  if (!existing.firstName && input.firstName) patch.firstName = input.firstName;
  if (!existing.lastName && input.lastName) patch.lastName = input.lastName;
  if (!existing.avatarUrl && input.avatarUrl) patch.avatarUrl = input.avatarUrl;
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, existing.id));
    const refreshed = await findUserById(db, existing.id);
    return { user: refreshed!, created };
  }

  return { user: existing, created };
}

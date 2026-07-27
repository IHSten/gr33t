import { describe, it, expect } from "vitest";
import { upsertUserByEmail, findUserById } from "../src/db/users";
import { db } from "./helpers";

describe("upsertUserByEmail", () => {
  it("reports created=true on first sign-up and false on a returning login", async () => {
    const first = await upsertUserByEmail(db(), { email: "New@Example.com" });
    expect(first.created).toBe(true);
    expect(first.user.email).toBe("new@example.com");

    const second = await upsertUserByEmail(db(), { email: "new@example.com" });
    expect(second.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);
  });

  it("backfills missing profile fields on a later login without re-creating", async () => {
    const created = await upsertUserByEmail(db(), { email: "p@example.com" });
    expect(created.user.firstName).toBeNull();

    const backfilled = await upsertUserByEmail(db(), {
      email: "p@example.com",
      firstName: "Ada",
    });
    expect(backfilled.created).toBe(false);
    expect(backfilled.user.id).toBe(created.user.id);
    expect(backfilled.user.firstName).toBe("Ada");

    const persisted = await findUserById(db(), created.user.id);
    expect(persisted?.firstName).toBe("Ada");
  });
});

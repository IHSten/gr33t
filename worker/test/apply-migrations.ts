import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";
import { resetDb, resetKv } from "./helpers";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

beforeEach(async () => {
  await resetDb();
  await resetKv();
});

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mockCard } from "../shared/mock-card.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const wranglerConfig = "worker/wrangler.toml";

const USER_ID = "user-sample-0001";
const CARD_ID = mockCard.id;

function sqlStr(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

const statements: string[] = [];

statements.push(`DELETE FROM users WHERE id = ${sqlStr(USER_ID)};`);

statements.push(
  `INSERT INTO users (id, email, first_name, last_name) VALUES (${sqlStr(
    USER_ID
  )}, ${sqlStr("sample@gr33t.xyz")}, ${sqlStr("Sample")}, ${sqlStr("User")});`
);

statements.push(
  `INSERT INTO cards (id, user_id, title) VALUES (${sqlStr(CARD_ID)}, ${sqlStr(
    USER_ID
  )}, ${sqlStr("Sample Card")});`
);

mockCard.connections.forEach((conn, i) => {
  const connId = uuid();
  statements.push(
    `INSERT INTO connections (id, user_id, type, handle, link, image_url) VALUES (${sqlStr(
      connId
    )}, ${sqlStr(USER_ID)}, ${sqlStr(conn.type)}, ${sqlStr(
      conn.details.handle
    )}, ${sqlStr(conn.details.link)}, ${sqlStr(conn.details.imageUrl)});`
  );
  statements.push(
    `INSERT INTO card_connections (card_id, connection_id, position) VALUES (${sqlStr(
      CARD_ID
    )}, ${sqlStr(connId)}, ${i});`
  );
});

const sql = statements.join("\n");

const dir = mkdtempSync(join(tmpdir(), "gr33t-seed-"));
const sqlFile = join(dir, "seed.sql");
writeFileSync(sqlFile, sql);

try {
  console.log(
    `Seeding local D1 with card "${CARD_ID}" (${mockCard.connections.length} connections)...`
  );
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "gr33t",
      "--local",
      "--config",
      wranglerConfig,
      "--file",
      sqlFile,
    ],
    { cwd: repoRoot, stdio: "inherit" }
  );
  console.log("Seed complete.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

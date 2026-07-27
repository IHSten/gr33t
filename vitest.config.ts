import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import path from "node:path";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(import.meta.dirname, "worker/migrations")
  );

  return {
    test: {
      coverage: {
        provider: "istanbul",
        include: ["worker/src/**/*.ts", "web/src/lib/**/*.ts"],
        exclude: ["**/*.test.ts", "**/*.d.ts", "worker/src/db/index.ts"],
        reporter: ["text", "text-summary"],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
      projects: [
        {
          test: {
            name: "unit",
            include: [
              "web/**/*.test.ts",
              "worker/src/**/*.test.ts",
              "shared/**/*.test.ts",
            ],
            exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
            environment: "node",
          },
        },
        {
          plugins: [
            cloudflareTest({
              isolatedStorage: true,
              wrangler: { configPath: "./worker/wrangler.toml" },
              miniflare: {
                bindings: {
                  AUTH_MODE: "local",
                  COOKIE_SECRET: "test-cookie-secret",
                  TEST_MIGRATIONS: migrations,
                },
              },
            }),
          ],
          test: {
            name: "integration",
            include: ["worker/test/**/*.integration.test.ts"],
            setupFiles: ["./worker/test/apply-migrations.ts"],
          },
        },
      ],
    },
  };
});

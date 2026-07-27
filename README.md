# gr33t

**Live:** [gr33t.me](https://gr33t.me)

A digital business card / link-in-bio for the modern internet (yes, it's open source Linktree). A **Card** is a public page that bundles **Connections** — social/contact link blocks (X, LinkedIn, Instagram, Email, Phone, Website, …).

Built Cloudflare-native, deployable entirely and exclusively on Cloudflare, or (kind of) self-hostable using docker compose and a miniflare environment.

## Architecture

| Layer         | Tech                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| Frontend      | Vite + React 19 SPA               |
| Backend       | Hono Worker (`worker/`)           |
| Database      | Cloudflare D1 (SQLite)            |
| Images        | Cloudflare R2                     |
| Sessions/auth | Cloudflare KV + Google OAuth.     |

In production one origin serves everything

* A Worker route `gr33t.me/api/*` → the
Worker
* Everything else goes to Pages. The SPA calls the API with relative `/api/*`, so there is no CORS.

```txt
shared/    TS types shared by client + worker
web/       Vite + React SPA
worker/    Hono Worker & Database
infra/     Terraform (durable Cloudflare resources) & deploy scripts
```

## Local development

Both options are fully local. The Worker runs under Miniflare with D1/R2/KV state
on disk.

### Docker (one command, preferred)

```bash
docker compose up --build
```

* **web** → http://localhost:5173 (open this)
* **worker** → http://localhost:8787 (/api/*)

The only external image is `docker.io/library/node:24-slim` (official, public).

### npm

```bash
npm install
npm run dev          # wrangler dev (worker) + vite (web) together
```

Open http://localhost:5173/card/sample-card-123 to see the seeded sample card
(run `npm run seed` first). Verify the API directly: `curl http://localhost:8787/api/health`.

## Scripts

| Script                      | What it does                                       |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`               | Worker + web       |
| `npm run dev:worker`        | Just the Worker    |
| `npm run dev:web`           | Just the Vite SPA  |
| `npm run build`             | Production build SPA |
| `npm run typecheck`         | Typecheck          |
| `npm run db:generate`       | Generate a Drizzle migration from the schema       |
| `npm run db:migrate:local`  | Apply migrations to local D1                        |
| `npm run db:migrate:remote` | Apply migrations to remote D1                       |
| `npm run seed`              | Seed local D1 with the sample card for local dev                |
| `npm run deploy`            | Build + `wrangler deploy` the Worker               |
| `npm test`                  | Unit + integration tests (Vitest)                  |
| `npm run test:coverage`     | Tests with coverage (80% gate over `worker/src`)   |

## Security

Found a vulnerability? Please **do not** open a public issue — see
[`SECURITY.md`](SECURITY.md) for private disclosure.

## License

Licensed under the **GNU Affero General Public License v3.0** — see
[`LICENSE`](LICENSE). If you run a modified version of gr33t as a network
service, the AGPL requires you to offer that modified source to your users.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db";
import { getCardById, getCardOwnerId } from "./db/cards";
import { readCachedCard, writeCachedCard } from "./cardCache";
import { track } from "./analytics";
import { ValidationError, RateLimitError } from "./validate";
import { rateLimit } from "./rateLimit";
import type { AuthVariables } from "./auth";
import cardsRoutes from "./routes/cards";
import connectionsRoutes from "./routes/connections";
import authRoutes from "./routes/auth";
import { uploadsRoutes, imagesRoutes } from "./routes/uploads";

export type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
  SESSIONS: KVNamespace;
  CARD_CACHE: KVNamespace;
  EVENTS?: AnalyticsEngineDataset;
  AUTH_MODE?: "local" | "google";
  COOKIE_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  POST_LOGIN_REDIRECT?: string;
  PUBLIC_IMAGE_BASE_URL?: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

// The SPA is same-origin with the API (both on gr33t.me), so CORS is only a
// concern for other origins. Restrict to the canonical origin rather than the
// default wildcard; authenticated routes are already cookie-gated (SameSite=Lax).
app.use("/api/*", cors({ origin: "https://gr33t.me" }));

// Defense-in-depth response headers on every API response. The API only ever
// returns JSON, so a locked-down CSP and nosniff cost nothing and blunt content
// sniffing / accidental-HTML-rendering. HSTS is sent in production only.
app.use("/api/*", async (c, next) => {
  await next();
  const h = c.res.headers;
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'"
  );
  if (c.env.AUTH_MODE !== "local") {
    h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  // Safe default: never let a shared cache hold an API response unless a route
  // explicitly opts in (only the public card read does, below).
  if (!h.has("Cache-Control")) {
    h.set("Cache-Control", "no-store");
  }
});

// Global per-IP throttle in front of every API route (health excepted).
app.use("/api/*", rateLimit({ skip: c => c.req.path === "/api/health" }));

app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }
  if (err instanceof RateLimitError) {
    return c.json({ error: err.message }, 429);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.get("/api/health", c => c.json({ status: "ok" }));

// Public card reads are the hot path (every visitor) and the only real D1 load.
// Read through a per-key-invalidatable KV cache (see cardCache): a card stays
// cached until its owner edits it, so D1 load scales with edits, not views.
// The Worker still runs on a hit, so view analytics keep firing.
const PUBLIC_CARD_MAX_AGE = 60; // small browser-cache bonus; bounded staleness

app.get("/api/card/:id", async c => {
  const id = c.req.param("id");

  const cached = await readCachedCard(c.env, id);
  if (cached) {
    if (cached.ownerId) {
      track(c.env, c.req.raw, {
        type: "public.card.viewed",
        cardId: id,
        ownerId: cached.ownerId,
      });
    }
    c.header("Cache-Control", `public, max-age=${PUBLIC_CARD_MAX_AGE}`);
    return c.json(cached.card);
  }

  const db = getDb(c.env.DB);
  const card = await getCardById(db, id);
  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }
  const ownerId = await getCardOwnerId(db, card.id);

  // Populate before responding (misses are the rare path) so a subsequent edit
  // can't have its invalidation raced by a late async populate re-adding stale
  // data. writeCachedCard is best-effort and never throws.
  await writeCachedCard(c.env, id, { card, ownerId });

  if (ownerId) {
    track(c.env, c.req.raw, {
      type: "public.card.viewed",
      cardId: card.id,
      ownerId,
    });
  }
  c.header("Cache-Control", `public, max-age=${PUBLIC_CARD_MAX_AGE}`);
  return c.json(card);
});

app.route("/api/auth", authRoutes);

app.route("/api/cards", cardsRoutes);
app.route("/api/connections", connectionsRoutes);

app.route("/api/uploads", uploadsRoutes);
app.route("/api/images", imagesRoutes);

export default app;

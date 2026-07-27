import { describe, it, expect, beforeEach } from "vitest";
import {
  api,
  devHeaders,
  seedUser,
  seedCard,
  seedConnection,
  attach,
} from "./helpers";

describe("app core", () => {
  it("GET /api/health -> 200 ok", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("restricts CORS to the canonical origin and denies others", async () => {
    const foreign = await api("/api/health", {
      headers: { Origin: "https://example.com" },
    });
    // A foreign origin gets no allow-origin (browser blocks cross-origin reads).
    expect(foreign.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(foreign.headers.get("access-control-allow-origin")).not.toBe(
      "https://example.com"
    );

    const same = await api("/api/health", {
      headers: { Origin: "https://gr33t.me" },
    });
    expect(same.headers.get("access-control-allow-origin")).toBe(
      "https://gr33t.me"
    );
  });

  it("sets defense-in-depth security headers on /api/*", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain(
      "default-src 'none'"
    );
  });

  it("defaults API responses to no-store caching", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 404 JSON for an unknown route", async () => {
    const res = await api("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/card/:id (public read)", () => {
  beforeEach(async () => {
    await seedUser("u1");
    await seedCard("card1", "u1");
    await seedConnection("c-x", "u1", {
      type: "X",
      handle: "@me",
      link: "https://x.com/me",
      imageUrl: "https://cdn/x.png",
    });
    await seedConnection("c-web", "u1", {
      type: "Website",
      handle: "site",
      link: "https://me.dev",
      imageUrl: null,
    });
    await attach("card1", "c-web", 1);
    await attach("card1", "c-x", 0);
  });

  it("returns the wire shape ordered by position, null imageUrl -> ''", async () => {
    const res = await api("/api/card/card1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "card1",
      title: "Test Card",
      description: null,
      connections: [
        {
          type: "X",
          details: {
            handle: "@me",
            imageUrl: "https://cdn/x.png",
            link: "https://x.com/me",
          },
        },
        {
          type: "Website",
          details: { handle: "site", imageUrl: "", link: "https://me.dev" },
        },
      ],
    });
  });

  it("is cacheable and never exposes the owner id", async () => {
    const res = await api("/api/card/card1");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("ownerId");
    expect(body).not.toHaveProperty("userId");
  });

  it("serves the same body on a cache hit (second read)", async () => {
    const first = await api("/api/card/card1");
    const second = await api("/api/card/card1");
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
  });

  it("invalidates the cache when the owner edits the card", async () => {
    // Prime the read cache.
    const before = await api("/api/card/card1");
    expect(((await before.json()) as { title: string }).title).toBe(
      "Test Card"
    );
    // Owner edits the title (goes through the uncached owner API).
    const patch = await api("/api/cards/card1", {
      method: "PATCH",
      headers: devHeaders("u1"),
      body: JSON.stringify({ title: "Edited" }),
    });
    expect(patch.status).toBe(200);
    // The public read must reflect the edit (cache was invalidated).
    const after = await api("/api/card/card1");
    expect(((await after.json()) as { title: string }).title).toBe("Edited");
  });

  it("404s for a missing card", async () => {
    const res = await api("/api/card/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Card not found" });
  });

  it("is isolated between tests (previous card rows rolled back)", async () => {
    const res = await api("/api/card/card1");
    const body = (await res.json()) as { connections: unknown[] };
    expect(body.connections).toHaveLength(2);
  });
});

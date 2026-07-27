import { describe, it, expect, beforeEach } from "vitest";
import {
  api,
  devHeaders,
  seedUser,
  seedCard,
  seedConnection,
  attach,
} from "./helpers";

const OWNER = "owner";
const OTHER = "other";

beforeEach(async () => {
  await seedUser(OWNER);
  await seedUser(OTHER);
});

describe("auth gate", () => {
  it("401s without a session or X-Dev-User", async () => {
    const res = await api("/api/cards", { method: "GET" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s when X-Dev-User names a non-existent user", async () => {
    const res = await api("/api/cards", {
      method: "GET",
      headers: devHeaders("ghost"),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/cards", () => {
  it("creates a card owned by the caller", async () => {
    const res = await api("/api/cards", {
      method: "POST",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ title: "Hi", description: "d" }),
    });
    expect(res.status).toBe(201);
    const card = await res.json();
    expect(card).toMatchObject({
      userId: OWNER,
      title: "Hi",
      description: "d",
    });
    expect(card.id).toBeTruthy();
  });

  it("400s on invalid body and malformed JSON", async () => {
    const bad = await api("/api/cards", {
      method: "POST",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ title: 123 }),
    });
    expect(bad.status).toBe(400);

    const notJson = await api("/api/cards", {
      method: "POST",
      headers: devHeaders(OWNER),
      body: "nope",
    });
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({
      error: "Request body must be valid JSON",
    });
  });
});

describe("GET /api/cards + GET /api/cards/:id", () => {
  it("lists only the caller's cards", async () => {
    await seedCard("c-own", OWNER, { title: "Mine" });
    await seedCard("c-other", OTHER, { title: "Theirs" });

    const res = await api("/api/cards", { headers: devHeaders(OWNER) });
    expect(res.status).toBe(200);
    const { cards } = (await res.json()) as { cards: { id: string }[] };
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("c-own");
  });

  it("returns a card with its connections in order", async () => {
    await seedCard("c1", OWNER);
    await seedConnection("k1", OWNER, { handle: "first" });
    await seedConnection("k2", OWNER, { handle: "second" });
    await attach("c1", "k2", 1);
    await attach("c1", "k1", 0);

    const res = await api("/api/cards/c1", { headers: devHeaders(OWNER) });
    expect(res.status).toBe(200);
    const { card, connections } = (await res.json()) as {
      card: { id: string };
      connections: { handle: string }[];
    };
    expect(card.id).toBe("c1");
    expect(connections.map(c => c.handle)).toEqual(["first", "second"]);
  });

  it("404s for a missing card and 403s for someone else's", async () => {
    await seedCard("c-other", OTHER);
    expect(
      (await api("/api/cards/missing", { headers: devHeaders(OWNER) })).status
    ).toBe(404);
    const forbidden = await api("/api/cards/c-other", {
      headers: devHeaders(OWNER),
    });
    expect(forbidden.status).toBe(403);
  });
});

describe("PATCH /api/cards/:id", () => {
  beforeEach(async () => await seedCard("c1", OWNER, { title: "Old" }));

  it("updates fields for the owner", async () => {
    const res = await api("/api/cards/c1", {
      method: "PATCH",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ title: "New", description: null }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title: "New", description: null });
  });

  it("400s on an empty patch", async () => {
    const res = await api("/api/cards/c1", {
      method: "PATCH",
      headers: devHeaders(OWNER),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("404 missing / 403 not owner", async () => {
    expect(
      (
        await api("/api/cards/missing", {
          method: "PATCH",
          headers: devHeaders(OWNER),
          body: JSON.stringify({ title: "x" }),
        })
      ).status
    ).toBe(404);
    expect(
      (
        await api("/api/cards/c1", {
          method: "PATCH",
          headers: devHeaders(OTHER),
          body: JSON.stringify({ title: "x" }),
        })
      ).status
    ).toBe(403);
  });
});

describe("DELETE /api/cards/:id", () => {
  it("deletes the owner's card (204) and rejects others", async () => {
    await seedCard("c1", OWNER);
    expect(
      (
        await api("/api/cards/c1", {
          method: "DELETE",
          headers: devHeaders(OTHER),
        })
      ).status
    ).toBe(403);
    const ok = await api("/api/cards/c1", {
      method: "DELETE",
      headers: devHeaders(OWNER),
    });
    expect(ok.status).toBe(204);
    expect(
      (
        await api("/api/cards/c1", {
          method: "DELETE",
          headers: devHeaders(OWNER),
        })
      ).status
    ).toBe(404);
  });
});

describe("PUT /api/cards/:id/connections (set ordered list)", () => {
  beforeEach(async () => {
    await seedCard("c1", OWNER);
    await seedConnection("k1", OWNER);
    await seedConnection("k2", OWNER);
  });

  it("sets the ordered connection list", async () => {
    const res = await api("/api/cards/c1/connections", {
      method: "PUT",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ connectionIds: ["k2", "k1"] }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cardId: "c1",
      connectionIds: ["k2", "k1"],
    });

    const read = await api("/api/card/c1");
    const body = (await read.json()) as { connections: { handle: string }[] };
    expect(body.connections).toHaveLength(2);
  });

  it("400s when an id is unknown or not owned by the caller", async () => {
    await seedConnection("k-other", OTHER);
    const res = await api("/api/cards/c1/connections", {
      method: "PUT",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ connectionIds: ["k1", "k-other"] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { connectionIds: string[] };
    expect(body.connectionIds).toContain("k-other");
  });

  it("404/403 on the card", async () => {
    expect(
      (
        await api("/api/cards/missing/connections", {
          method: "PUT",
          headers: devHeaders(OWNER),
          body: JSON.stringify({ connectionIds: [] }),
        })
      ).status
    ).toBe(404);
    expect(
      (
        await api("/api/cards/c1/connections", {
          method: "PUT",
          headers: devHeaders(OTHER),
          body: JSON.stringify({ connectionIds: [] }),
        })
      ).status
    ).toBe(403);
  });
});

describe("attach / detach a single connection", () => {
  beforeEach(async () => {
    await seedCard("c1", OWNER);
    await seedConnection("k1", OWNER);
  });

  it("attaches (201), rejects duplicate (409), detaches (204)", async () => {
    const a = await api("/api/cards/c1/connections/k1", {
      method: "POST",
      headers: devHeaders(OWNER),
    });
    expect(a.status).toBe(201);

    const dup = await api("/api/cards/c1/connections/k1", {
      method: "POST",
      headers: devHeaders(OWNER),
    });
    expect(dup.status).toBe(409);

    const d = await api("/api/cards/c1/connections/k1", {
      method: "DELETE",
      headers: devHeaders(OWNER),
    });
    expect(d.status).toBe(204);
  });

  it("respects an explicit position and validates it", async () => {
    const ok = await api("/api/cards/c1/connections/k1", {
      method: "POST",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ position: 3 }),
    });
    expect(ok.status).toBe(201);

    await seedConnection("k2", OWNER);
    const bad = await api("/api/cards/c1/connections/k2", {
      method: "POST",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ position: -1 }),
    });
    expect(bad.status).toBe(400);
  });

  it("404s the connection and 403s a foreign card/connection", async () => {
    expect(
      (
        await api("/api/cards/c1/connections/ghost", {
          method: "POST",
          headers: devHeaders(OWNER),
        })
      ).status
    ).toBe(404);

    await seedConnection("k-other", OTHER);
    const foreignConn = await api("/api/cards/c1/connections/k-other", {
      method: "POST",
      headers: devHeaders(OWNER),
    });
    expect(foreignConn.status).toBe(403);
  });

  it("404s detach when not attached", async () => {
    const res = await api("/api/cards/c1/connections/k1", {
      method: "DELETE",
      headers: devHeaders(OWNER),
    });
    expect(res.status).toBe(404);
  });
});

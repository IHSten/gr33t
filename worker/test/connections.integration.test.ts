import { describe, it, expect, beforeEach } from "vitest";
import { api, devHeaders, seedUser, seedConnection } from "./helpers";

const OWNER = "owner";
const OTHER = "other";

beforeEach(async () => {
  await seedUser(OWNER);
  await seedUser(OTHER);
});

describe("POST /api/connections", () => {
  it("requires auth", async () => {
    const res = await api("/api/connections", {
      method: "POST",
      body: JSON.stringify({ type: "X", handle: "h", link: "https://x.com" }),
    });
    expect(res.status).toBe(401);
  });

  it("creates a connection for the caller", async () => {
    const res = await api("/api/connections", {
      method: "POST",
      headers: devHeaders(OWNER),
      body: JSON.stringify({
        type: "X",
        handle: "@me",
        link: "https://x.com/me",
      }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ userId: OWNER, type: "X" });
  });

  it("rejects unknown type, missing fields, and unsafe link (400)", async () => {
    for (const body of [
      { type: "Myspace", handle: "h", link: "https://x.com" },
      { type: "X", handle: "h" },
      { type: "X", handle: "h", link: "javascript:alert(1)" },
      {
        type: "X",
        handle: "h",
        link: "https://x.com",
        imageUrl: "javascript:x",
      },
    ]) {
      const res = await api("/api/connections", {
        method: "POST",
        headers: devHeaders(OWNER),
        body: JSON.stringify(body),
      });
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("accepts mailto: and tel: links", async () => {
    for (const link of ["mailto:me@x.com", "tel:+15551234567"]) {
      const res = await api("/api/connections", {
        method: "POST",
        headers: devHeaders(OWNER),
        body: JSON.stringify({ type: "Email", handle: "h", link }),
      });
      expect(res.status, link).toBe(201);
    }
  });
});

describe("PATCH /api/connections/:id", () => {
  beforeEach(async () => await seedConnection("k1", OWNER, { handle: "old" }));

  it("updates a field for the owner", async () => {
    const res = await api("/api/connections/k1", {
      method: "PATCH",
      headers: devHeaders(OWNER),
      body: JSON.stringify({ handle: "new" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ handle: "new" });
  });

  it("400s empty patch / unsafe link", async () => {
    expect(
      (
        await api("/api/connections/k1", {
          method: "PATCH",
          headers: devHeaders(OWNER),
          body: JSON.stringify({}),
        })
      ).status
    ).toBe(400);
    expect(
      (
        await api("/api/connections/k1", {
          method: "PATCH",
          headers: devHeaders(OWNER),
          body: JSON.stringify({ link: "javascript:x" }),
        })
      ).status
    ).toBe(400);
  });

  it("404 missing / 403 not owner", async () => {
    expect(
      (
        await api("/api/connections/ghost", {
          method: "PATCH",
          headers: devHeaders(OWNER),
          body: JSON.stringify({ handle: "x" }),
        })
      ).status
    ).toBe(404);
    expect(
      (
        await api("/api/connections/k1", {
          method: "PATCH",
          headers: devHeaders(OTHER),
          body: JSON.stringify({ handle: "x" }),
        })
      ).status
    ).toBe(403);
  });
});

describe("DELETE /api/connections/:id", () => {
  it("deletes for owner (204), 403 for others, 404 when gone", async () => {
    await seedConnection("k1", OWNER);
    expect(
      (
        await api("/api/connections/k1", {
          method: "DELETE",
          headers: devHeaders(OTHER),
        })
      ).status
    ).toBe(403);
    expect(
      (
        await api("/api/connections/k1", {
          method: "DELETE",
          headers: devHeaders(OWNER),
        })
      ).status
    ).toBe(204);
    expect(
      (
        await api("/api/connections/k1", {
          method: "DELETE",
          headers: devHeaders(OWNER),
        })
      ).status
    ).toBe(404);
  });
});

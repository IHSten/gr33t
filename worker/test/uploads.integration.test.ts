import { describe, it, expect, beforeEach } from "vitest";
import { api, seedUser } from "./helpers";

const OWNER = "owner";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(async () => await seedUser(OWNER));

describe("POST /api/uploads", () => {
  it("401s without auth", async () => {
    const res = await api("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: PNG,
    });
    expect(res.status).toBe(401);
  });

  it("stores a raw png and returns key/url/size", async () => {
    const res = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER, "Content-Type": "image/png" },
      body: PNG,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      key: string;
      url: string;
      contentType: string;
      size: number;
    };
    expect(body.contentType).toBe("image/png");
    expect(body.size).toBe(PNG.byteLength);
    expect(body.key).toMatch(new RegExp(`^uploads/${OWNER}/[0-9a-f-]+\\.png$`));
    expect(body.url).toBe(`/api/images/${body.key}`);
  });

  it("accepts a multipart/form-data file field", async () => {
    const form = new FormData();
    form.append("file", new File([PNG], "avatar.png", { type: "image/png" }));
    const res = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER },
      body: form,
    });
    expect(res.status).toBe(201);
  });

  it("400s a multipart body with no file field", async () => {
    const form = new FormData();
    form.append("notfile", "x");
    const res = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("rejects SVG, empty, and oversized uploads (400)", async () => {
    const svg = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER, "Content-Type": "image/svg+xml" },
      body: "<svg></svg>",
    });
    expect(svg.status).toBe(400);

    const empty = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER, "Content-Type": "image/png" },
      body: new Uint8Array(0),
    });
    expect(empty.status).toBe(400);

    const big = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER, "Content-Type": "image/png" },
      body: new Uint8Array(5 * 1024 * 1024 + 1),
    });
    expect(big.status).toBe(400);
  });
});

describe("GET /api/images/:key", () => {
  it("404s a missing object", async () => {
    const res = await api("/api/images/uploads/none/x.png");
    expect(res.status).toBe(404);
  });

  it("streams an uploaded object with hardening headers", async () => {
    const up = await api("/api/uploads", {
      method: "POST",
      headers: { "X-Dev-User": OWNER, "Content-Type": "image/png" },
      body: PNG,
    });
    const { key } = (await up.json()) as { key: string };

    const res = await api(`/api/images/${key}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain(
      "default-src 'none'"
    );
    expect(res.headers.get("cache-control")).toContain("immutable");
  });
});

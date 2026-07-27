import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rateLimit, getClientIp } from "./rateLimit";
import type { Context } from "hono";

function memKv(fail?: "get" | "put"): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => {
      if (fail === "get") throw new Error("kv down");
      return store.get(k) ?? null;
    },
    put: async (k: string, v: string) => {
      if (fail === "put") throw new Error("kv down");
      store.set(k, v);
    },
  } as unknown as KVNamespace;
}

function makeApp(kv: KVNamespace, limit: number) {
  const app = new Hono<{ Bindings: { SESSIONS: KVNamespace } }>();
  app.use("*", rateLimit({ limit, windowSeconds: 60 }));
  app.get("/x", c => c.text("ok"));
  return (ip = "1.2.3.4") =>
    app.request(
      "/x",
      { headers: { "CF-Connecting-IP": ip } },
      { SESSIONS: kv }
    );
}

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP, falls back to first X-Forwarded-For", () => {
    const ctx = (headers: Record<string, string>) =>
      ({ req: { header: (h: string) => headers[h] } }) as unknown as Context;
    expect(getClientIp(ctx({ "CF-Connecting-IP": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(getClientIp(ctx({ "X-Forwarded-For": "8.8.8.8, 7.7.7.7" }))).toBe(
      "8.8.8.8"
    );
    expect(getClientIp(ctx({}))).toBe("unknown");
  });
});

describe("rateLimit middleware", () => {
  it("allows up to the limit then returns 429 with Retry-After", async () => {
    const req = makeApp(memKv(), 2);

    expect((await req()).status).toBe(200);
    expect((await req()).status).toBe(200);

    const blocked = await req();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("tracks each IP independently", async () => {
    const req = makeApp(memKv(), 1);

    expect((await req("1.1.1.1")).status).toBe(200);
    expect((await req("1.1.1.1")).status).toBe(429);
    // A different IP is unaffected.
    expect((await req("2.2.2.2")).status).toBe(200);
  });

  it("fails open when KV is unavailable", async () => {
    const reqGet = makeApp(memKv("get"), 1);
    expect((await reqGet()).status).toBe(200);
    expect((await reqGet()).status).toBe(200);

    // A put failure must not advance the counter nor block the request.
    const reqPut = makeApp(memKv("put"), 1);
    expect((await reqPut()).status).toBe(200);
    expect((await reqPut()).status).toBe(200);
  });
});

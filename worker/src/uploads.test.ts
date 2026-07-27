import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import { ValidationError } from "./validate";
import {
  MAX_UPLOAD_BYTES,
  isAllowedContentType,
  normalizeContentType,
  extensionFor,
  buildObjectKey,
  publicUrlForKey,
  readImageUpload,
} from "./uploads";

function rawCtx(
  contentType: string,
  byteLength: number,
  contentLength?: number
): Context {
  const headers: Record<string, string | undefined> = {
    "content-type": contentType,
    "content-length":
      contentLength === undefined ? undefined : String(contentLength),
  };
  return {
    req: {
      header: (h: string) => headers[h.toLowerCase()],
      arrayBuffer: async () => new ArrayBuffer(byteLength),
    },
  } as unknown as Context;
}

describe("isAllowedContentType", () => {
  it("accepts raster image types (with charset params)", () => {
    expect(isAllowedContentType("image/png")).toBe(true);
    expect(isAllowedContentType("image/jpeg")).toBe(true);
    expect(isAllowedContentType("IMAGE/WEBP")).toBe(true);
    expect(isAllowedContentType("image/png; charset=binary")).toBe(true);
  });

  it("rejects SVG (stored-XSS vector) and non-images", () => {
    expect(isAllowedContentType("image/svg+xml")).toBe(false);
    expect(isAllowedContentType("text/html")).toBe(false);
    expect(isAllowedContentType("application/octet-stream")).toBe(false);
    expect(isAllowedContentType(null)).toBe(false);
    expect(isAllowedContentType(undefined)).toBe(false);
    expect(isAllowedContentType("")).toBe(false);
  });
});

describe("extensionFor / normalizeContentType", () => {
  it("maps known types and defaults unknown to bin", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/svg+xml")).toBe("bin");
    expect(normalizeContentType("Image/PNG; charset=x")).toBe("image/png");
  });
});

describe("buildObjectKey", () => {
  it("namespaces by user and uses the content-type extension", () => {
    const key = buildObjectKey("user-123", "image/png");
    expect(key).toMatch(/^uploads\/user-123\/[0-9a-f-]{36}\.png$/);
  });

  it("sanitizes path-traversal / separator chars in the user id", () => {
    const key = buildObjectKey("../../etc/passwd", "image/jpeg");
    expect(key.startsWith("uploads/")).toBe(true);
    expect(key).not.toContain("..");
    expect(key.split("/")).toHaveLength(3);
  });
});

describe("publicUrlForKey", () => {
  it("uses the configured base when set (trims trailing slash)", () => {
    expect(publicUrlForKey("uploads/u/a.png", "https://cdn.example.com/")).toBe(
      "https://cdn.example.com/uploads/u/a.png"
    );
  });

  it("falls back to the worker route and encodes segments", () => {
    expect(publicUrlForKey("uploads/u/a b.png", undefined)).toBe(
      "/api/images/uploads/u/a%20b.png"
    );
  });
});

describe("readImageUpload", () => {
  it("accepts a valid raw image body", async () => {
    await expect(readImageUpload(rawCtx("image/png", 10))).resolves.toEqual({
      data: expect.any(ArrayBuffer),
      contentType: "image/png",
    });
  });

  it("rejects SVG, empty and over-large bodies", async () => {
    await expect(readImageUpload(rawCtx("image/svg+xml", 10))).rejects.toThrow(
      ValidationError
    );
    await expect(readImageUpload(rawCtx("image/png", 0))).rejects.toThrow(
      /Empty/
    );
    await expect(
      readImageUpload(rawCtx("image/png", MAX_UPLOAD_BYTES + 1))
    ).rejects.toThrow(/too large/i);
  });

  it("rejects on Content-Length before buffering the body", async () => {
    let buffered = false;
    const ctx = {
      req: {
        header: (h: string) =>
          ({
            "content-type": "image/png",
            "content-length": String(MAX_UPLOAD_BYTES + 1),
          })[h.toLowerCase()],
        arrayBuffer: async () => {
          buffered = true;
          return new ArrayBuffer(MAX_UPLOAD_BYTES + 1);
        },
      },
    } as unknown as Context;

    await expect(readImageUpload(ctx)).rejects.toThrow(/too large/i);
    expect(buffered).toBe(false);
  });
});

import { Hono } from "hono";
import { requireUser } from "../auth";
import type { AuthVariables } from "../auth";
import type { Bindings } from "../index";
import {
  buildObjectKey,
  publicUrlForKey,
  readImageUpload,
  enforceUploadRateLimit,
} from "../uploads";

type Env = { Bindings: Bindings; Variables: AuthVariables };

export const uploadsRoutes = new Hono<Env>();

uploadsRoutes.post("/", requireUser, async c => {
  const userId = c.get("user").id;
  await enforceUploadRateLimit(c.env.SESSIONS, userId);
  const { data, contentType } = await readImageUpload(c);

  const key = buildObjectKey(userId, contentType);
  await c.env.IMAGES.put(key, data, {
    httpMetadata: { contentType },
    customMetadata: { userId },
  });

  const url = publicUrlForKey(key, c.env.PUBLIC_IMAGE_BASE_URL);
  return c.json({ key, url, contentType, size: data.byteLength }, 201);
});

export const imagesRoutes = new Hono<Env>();

imagesRoutes.get("/:key{.+}", async c => {
  const key = c.req.param("key");
  const object = await c.env.IMAGES.get(key);
  if (!object) {
    return c.json({ error: "Image not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; sandbox; frame-ancestors 'none'"
  );
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/octet-stream");
  }

  return new Response(object.body, { headers });
});

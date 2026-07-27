import type { Context } from "hono";
import { ValidationError, RateLimitError } from "./validate";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Best-effort per-user upload throttle to bound R2 storage/egress abuse from an
// authenticated account. Backed by KV (fixed window, not perfectly atomic — good
// enough for cost control, not for security-critical accounting).
export const UPLOAD_RATE_LIMIT = 60;
export const UPLOAD_RATE_WINDOW_SEC = 60 * 60;

export async function enforceUploadRateLimit(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  const key = `upload-rate:${userId}`;
  const current = Number((await kv.get(key)) ?? "0") || 0;
  if (current >= UPLOAD_RATE_LIMIT) {
    throw new RateLimitError(
      `Upload rate limit exceeded. Max ${UPLOAD_RATE_LIMIT} uploads per hour.`
    );
  }
  await kv.put(key, String(current + 1), {
    expirationTtl: UPLOAD_RATE_WINDOW_SEC,
  });
}

export const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function isAllowedContentType(ct: string | null | undefined): boolean {
  if (!ct) return false;
  const base = ct.split(";")[0].trim().toLowerCase();
  return base in ALLOWED_CONTENT_TYPES;
}

export function normalizeContentType(ct: string): string {
  return ct.split(";")[0].trim().toLowerCase();
}

export function extensionFor(ct: string): string {
  return ALLOWED_CONTENT_TYPES[normalizeContentType(ct)] ?? "bin";
}

export function buildObjectKey(userId: string, contentType: string): string {
  const ext = extensionFor(contentType);
  const rand = crypto.randomUUID();
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `uploads/${safeUser}/${rand}.${ext}`;
}

export function publicUrlForKey(
  key: string,
  baseUrl: string | undefined
): string {
  if (baseUrl && baseUrl.trim() !== "") {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return `${trimmed}/${key}`;
  }
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `/api/images/${encoded}`;
}

export type ImageUpload = { data: ArrayBuffer; contentType: string };

export async function readImageUpload(c: Context): Promise<ImageUpload> {
  const reqType = c.req.header("Content-Type") ?? "";
  let data: ArrayBuffer;
  let contentType: string;

  // Reject oversized uploads before we buffer the whole body into the isolate's
  // memory. When Content-Length is present and already exceeds the cap there is
  // no reason to allocate anything; when it is absent or a lie we still enforce
  // the real cap on the materialized body below.
  const declaredLength = Number(c.req.header("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `File too large. Max ${MAX_UPLOAD_BYTES} bytes (${Math.round(
        MAX_UPLOAD_BYTES / (1024 * 1024)
      )} MiB)`
    );
  }

  if (reqType.toLowerCase().includes("multipart/form-data")) {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") {
      throw new ValidationError('multipart upload requires a "file" field');
    }
    contentType = (file as File).type;
    data = await (file as File).arrayBuffer();
  } else {
    contentType = reqType;
    data = await c.req.arrayBuffer();
  }

  if (!isAllowedContentType(contentType)) {
    throw new ValidationError(
      `Unsupported content-type. Allowed: ${Object.keys(
        ALLOWED_CONTENT_TYPES
      ).join(", ")}`
    );
  }
  if (data.byteLength === 0) {
    throw new ValidationError("Empty upload");
  }
  if (data.byteLength > MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `File too large. Max ${MAX_UPLOAD_BYTES} bytes (${Math.round(
        MAX_UPLOAD_BYTES / (1024 * 1024)
      )} MiB)`
    );
  }

  return { data, contentType: normalizeContentType(contentType) };
}

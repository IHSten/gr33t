import { z } from "zod";
import type { Context } from "hono";
import { CONNECTION_TYPES } from "../../shared/connection";
// Re-exported so worker modules (e.g. analytics/schema) share the single
// source of truth in shared/connection instead of a hand-copied list.
export { CONNECTION_TYPES };

export class ValidationError extends Error {}

export class RateLimitError extends Error {}

const LINK_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

function isSafeLink(s: string): boolean {
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  return LINK_SCHEMES.has(u.protocol);
}

function isSafeImageUrl(s: string): boolean {
  if (s.startsWith("//")) return false;
  if (s.startsWith("/")) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const connectionType = z.enum(CONNECTION_TYPES);
const title = z.string().max(200);
const description = z.string().max(4000);
const handle = z.string().trim().min(1, "must be a non-empty string").max(200);
const link = z
  .string()
  .trim()
  .min(1, "must be a non-empty string")
  .max(2048)
  .refine(isSafeLink, "must be an http(s), mailto: or tel: URL");
const imageUrl = z
  .string()
  .trim()
  .min(1, "must be a non-empty string")
  .max(2048)
  .refine(isSafeImageUrl, "must be an http(s) URL or a site-relative path");

export const CreateCardSchema = z.object({
  title: title.optional(),
  description: description.optional(),
});
export type CreateCardInput = z.infer<typeof CreateCardSchema>;

export const UpdateCardSchema = z
  .object({
    title: title.nullable().optional(),
    description: description.nullable().optional(),
  })
  .refine(hasAtLeastOneKey, {
    message: "At least one of title, description must be provided",
  });
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;

export const CreateConnectionSchema = z.object({
  type: connectionType,
  handle,
  link,
  imageUrl: imageUrl.optional(),
});
export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;

export const UpdateConnectionSchema = z
  .object({
    type: connectionType.optional(),
    handle: handle.optional(),
    link: link.optional(),
    imageUrl: imageUrl.nullable().optional(),
  })
  .refine(hasAtLeastOneKey, {
    message: "At least one of type, handle, link, imageUrl must be provided",
  });
export type UpdateConnectionInput = z.infer<typeof UpdateConnectionSchema>;

const connectionId = z.string().trim().min(1, "must be a non-empty string");

export const SetCardConnectionsSchema = z
  .object({
    connectionIds: z
      .array(connectionId, {
        error: '"connectionIds" must be an array of connection ids',
      })
      .max(100, '"connectionIds" may contain at most 100 ids')
      .refine(
        ids => new Set(ids).size === ids.length,
        '"connectionIds" contains duplicate ids'
      ),
  })
  .transform(o => o.connectionIds);

export const AttachPositionSchema = z.object({
  position: z.number().int().min(0).optional(),
});

export const DevLoginSchema = z.object({
  email: z.string().trim().pipe(z.email().max(320)).optional(),
});

export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error));
  }
  return result.data;
}

export async function parseJsonBody<T>(
  c: Context,
  schema: z.ZodType<T>
): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  return parseWith(schema, raw);
}

export async function parseOptionalJsonBody<T>(
  c: Context,
  schema: z.ZodType<T>
): Promise<T | undefined> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return undefined;
  }
  if (raw === undefined || raw === null) return undefined;
  return parseWith(schema, raw);
}

export async function parseAttachPosition(
  c: Context
): Promise<number | undefined> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return undefined;
  }
  if (raw === undefined || raw === null) return undefined;
  return parseWith(AttachPositionSchema, raw).position;
}

function hasAtLeastOneKey(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length > 0;
}

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  const path = first.path.length > 0 ? first.path.join(".") : "body";
  return path === "body" ? first.message : `${path}: ${first.message}`;
}

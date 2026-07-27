import { z } from "zod";
import { CONNECTION_TYPES } from "../validate";

// Every analytics event is validated against this discriminated union before it
// is written to any sink. Invalid events are dropped and logged (see `track`),
// never persisted — the taxonomy is the contract. Event types follow
// `<product>.<entity>.<action>` (see shared/analytics.ts).

const id = z.string().trim().min(1, "must be a non-empty string").max(255);
const connectionType = z.enum(CONNECTION_TYPES);

export const AnalyticsEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("public.card.viewed"), cardId: id, ownerId: id }),
  z.object({
    type: z.literal("public.link.clicked"),
    cardId: id,
    connectionId: id,
    ownerId: id,
    connectionType,
  }),
  z.object({
    type: z.literal("dashboard.card.created"),
    cardId: id,
    ownerId: id,
  }),
  z.object({
    type: z.literal("dashboard.card.updated"),
    cardId: id,
    ownerId: id,
  }),
  z.object({
    type: z.literal("dashboard.card.deleted"),
    cardId: id,
    ownerId: id,
  }),
  z.object({
    type: z.literal("dashboard.connection.created"),
    connectionId: id,
    ownerId: id,
    connectionType,
  }),
  z.object({ type: z.literal("dashboard.user.signed_up"), userId: id }),
  z.object({ type: z.literal("dashboard.user.logged_in"), userId: id }),
]);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// Server-derived request context attached to every event. Populated by the
// worker from the incoming request, never supplied by a client.
export const AnalyticsContextSchema = z.object({
  // ISO 3166-1 alpha-2, from Cloudflare's `request.cf`.
  country: z.string().length(2).optional(),
  refererHost: z.string().max(255).optional(),
});

export type AnalyticsContext = z.infer<typeof AnalyticsContextSchema>;

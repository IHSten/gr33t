// Canonical analytics taxonomy, shared between the worker (which emits events)
// and the web app (which will later surface aggregates back to users).
//
// Events are recorded exclusively server-side. We deliberately avoid client-side
// analytics: every value below is derived from a trusted request the worker
// already handles, so nothing here depends on the browser reporting honestly.
//
// Event names follow `<product>.<entity>.<action>`. The product prefix is the
// origin surface, so it doubles as what older designs called a "source" — no
// separate field needed. Actions are past tense.

export const ANALYTICS_PRODUCTS = ["dashboard", "public"] as const;

export type AnalyticsProduct = (typeof ANALYTICS_PRODUCTS)[number];

export const ANALYTICS_EVENT_TYPES = [
  "public.card.viewed",
  "public.link.clicked",
  "dashboard.card.created",
  "dashboard.card.updated",
  "dashboard.card.deleted",
  "dashboard.connection.created",
  "dashboard.user.signed_up",
  "dashboard.user.logged_in",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type ParsedEventType = {
  product: AnalyticsProduct;
  entity: string;
  action: string;
};

// Split a dotted event type into its parts. Safe because every member of
// ANALYTICS_EVENT_TYPES is validated to match `<product>.<entity>.<action>`
// (see the shared analytics test).
export function parseEventType(type: AnalyticsEventType): ParsedEventType {
  const [product, entity, action] = type.split(".");
  return { product: product as AnalyticsProduct, entity, action };
}

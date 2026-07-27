import {
  parseEventType,
  type AnalyticsEventType,
} from "../../../shared/analytics";
import {
  AnalyticsEventSchema,
  AnalyticsContextSchema,
  type AnalyticsEvent,
  type AnalyticsContext,
} from "./schema";

export type { AnalyticsEvent, AnalyticsContext } from "./schema";

// --- Sink abstraction --------------------------------------------------------
//
// Today the only sink is Workers Analytics Engine. The long-term target is
// Cloudflare Pipelines -> R2 (Iceberg) -> Tinybird; when that lands it becomes
// another `AnalyticsSink` and nothing at the call sites changes.

export interface AnalyticsSink {
  write(event: AnalyticsEvent, ctx: AnalyticsContext): void;
}

// Bindings the analytics layer needs. Kept minimal (not the worker's full
// `Bindings`) so this module has no import cycle with the app entrypoint and is
// trivial to exercise in tests. `EVENTS` is optional: when the binding is
// absent (local dev, unit tests) writes become no-ops instead of throwing.
export type AnalyticsBindings = { EVENTS?: AnalyticsEngineDataset };

// Positional layout of an Analytics Engine data point. AE columns are
// positional (index1, blob1..blob20, double1..double20), so the mapping lives
// in exactly one place. Keep this in sync with any dashboard/SQL queries.
//
//   index1  = event type         (sampling key; also what we GROUP BY)
//   blob1   = event type         (full <product>.<entity>.<action>)
//   blob2   = product            (dashboard | public)
//   blob3   = entity             (card | connection | link | user)
//   blob4   = action             (viewed | created | clicked | ...)
//   blob5   = owner user id
//   blob6   = primary entity id  (card id, connection id, or user id)
//   blob7   = secondary entity id (connection id for link click, else "")
//   blob8   = connection type    (for connection/link events, else "")
//   blob9   = country            (ISO alpha-2, else "")
//   blob10  = referer host       (else "")
//   double1 = 1                  (count; SUM(double1 * _sample_interval) ~ total)

type NormalizedEvent = {
  type: AnalyticsEventType;
  ownerId: string;
  primaryEntityId: string;
  secondaryEntityId: string;
  connectionType: string;
};

function normalize(event: AnalyticsEvent): NormalizedEvent {
  switch (event.type) {
    case "public.card.viewed":
    case "dashboard.card.created":
    case "dashboard.card.updated":
    case "dashboard.card.deleted":
      return {
        type: event.type,
        ownerId: event.ownerId,
        primaryEntityId: event.cardId,
        secondaryEntityId: "",
        connectionType: "",
      };
    case "dashboard.connection.created":
      return {
        type: event.type,
        ownerId: event.ownerId,
        primaryEntityId: event.connectionId,
        secondaryEntityId: "",
        connectionType: event.connectionType,
      };
    case "public.link.clicked":
      return {
        type: event.type,
        ownerId: event.ownerId,
        primaryEntityId: event.cardId,
        secondaryEntityId: event.connectionId,
        connectionType: event.connectionType,
      };
    case "dashboard.user.signed_up":
    case "dashboard.user.logged_in":
      return {
        type: event.type,
        ownerId: event.userId,
        primaryEntityId: event.userId,
        secondaryEntityId: "",
        connectionType: "",
      };
  }
}

export function toDataPoint(
  event: AnalyticsEvent,
  ctx: AnalyticsContext
): AnalyticsEngineDataPoint {
  const n = normalize(event);
  const { product, entity, action } = parseEventType(n.type);
  return {
    indexes: [n.type],
    blobs: [
      n.type,
      product,
      entity,
      action,
      n.ownerId,
      n.primaryEntityId,
      n.secondaryEntityId,
      n.connectionType,
      ctx.country ?? "",
      ctx.refererHost ?? "",
    ],
    doubles: [1],
  };
}

export class AnalyticsEngineSink implements AnalyticsSink {
  constructor(private readonly dataset?: AnalyticsEngineDataset) {}

  write(event: AnalyticsEvent, ctx: AnalyticsContext): void {
    this.dataset?.writeDataPoint(toDataPoint(event, ctx));
  }
}

// --- Context derivation ------------------------------------------------------

function refererHostOf(referer: string | null): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).host || undefined;
  } catch {
    return undefined;
  }
}

export function buildContext(request: Request): AnalyticsContext {
  const cf = (request as { cf?: IncomingRequestCfProperties }).cf;
  const rawCountry = typeof cf?.country === "string" ? cf.country : "";
  const country = /^[A-Za-z]{2}$/.test(rawCountry)
    ? rawCountry.toUpperCase()
    : undefined;
  return {
    country,
    refererHost: refererHostOf(request.headers.get("referer")),
  };
}

// --- Public entrypoint -------------------------------------------------------

function firstIssue(err: import("zod").ZodError): string {
  const issue = err.issues[0];
  const path = issue.path.length > 0 ? issue.path.join(".") : "event";
  return `${path}: ${issue.message}`;
}

/**
 * Record an analytics event. Fire-and-forget: it validates the event, derives
 * server-side context, and writes to the sink. It never throws into the request
 * path — a bad event or a missing binding is logged and swallowed, so analytics
 * can never break a user-facing response. The event's product prefix
 * (`<product>.<entity>.<action>`) records where it originated.
 */
export function track(
  env: AnalyticsBindings,
  request: Request,
  event: AnalyticsEvent
): void {
  try {
    const parsed = AnalyticsEventSchema.safeParse(event);
    if (!parsed.success) {
      console.error(
        "analytics: dropping invalid event",
        firstIssue(parsed.error)
      );
      return;
    }

    const rawCtx = buildContext(request);
    const ctxResult = AnalyticsContextSchema.safeParse(rawCtx);
    // Context is server-derived, so a failure here is a bug in derivation, not
    // hostile input. Fall back to an empty (always-valid) context rather than
    // dropping a legitimate event over e.g. an odd geo code.
    const ctx: AnalyticsContext = ctxResult.success ? ctxResult.data : {};

    new AnalyticsEngineSink(env.EVENTS).write(parsed.data, ctx);
  } catch (err) {
    console.error("analytics: failed to record event", err);
  }
}

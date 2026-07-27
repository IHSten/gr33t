import { describe, it, expect } from "vitest";
import { AnalyticsEventSchema } from "./schema";
import {
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_PRODUCTS,
} from "../../../shared/analytics";

const SAMPLES: Record<string, unknown> = {
  "public.card.viewed": {
    type: "public.card.viewed",
    cardId: "c",
    ownerId: "u",
  },
  "public.link.clicked": {
    type: "public.link.clicked",
    cardId: "c",
    connectionId: "cn",
    ownerId: "u",
    connectionType: "X",
  },
  "dashboard.card.created": {
    type: "dashboard.card.created",
    cardId: "c",
    ownerId: "u",
  },
  "dashboard.card.updated": {
    type: "dashboard.card.updated",
    cardId: "c",
    ownerId: "u",
  },
  "dashboard.card.deleted": {
    type: "dashboard.card.deleted",
    cardId: "c",
    ownerId: "u",
  },
  "dashboard.connection.created": {
    type: "dashboard.connection.created",
    connectionId: "cn",
    ownerId: "u",
    connectionType: "LinkedIn",
  },
  "dashboard.user.signed_up": { type: "dashboard.user.signed_up", userId: "u" },
  "dashboard.user.logged_in": { type: "dashboard.user.logged_in", userId: "u" },
};

describe("analytics taxonomy", () => {
  it("names every event type <product>.<entity>.<action>", () => {
    const products = new Set<string>(ANALYTICS_PRODUCTS);
    for (const type of ANALYTICS_EVENT_TYPES) {
      const parts = type.split(".");
      expect(parts).toHaveLength(3);
      expect(products.has(parts[0])).toBe(true);
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    }
  });

  it("has a validation variant for every declared event type", () => {
    for (const type of ANALYTICS_EVENT_TYPES) {
      expect(AnalyticsEventSchema.safeParse(SAMPLES[type]).success).toBe(true);
    }
  });
});

describe("AnalyticsEventSchema", () => {
  it("rejects an unknown event type", () => {
    const r = AnalyticsEventSchema.safeParse({
      type: "public.card.teleported",
      cardId: "card-1",
      ownerId: "user-1",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a known event missing required fields", () => {
    const r = AnalyticsEventSchema.safeParse({ type: "public.card.viewed" });
    expect(r.success).toBe(false);
  });

  it("rejects empty and oversized ids", () => {
    expect(
      AnalyticsEventSchema.safeParse({
        type: "public.card.viewed",
        cardId: "",
        ownerId: "user-1",
      }).success
    ).toBe(false);
    expect(
      AnalyticsEventSchema.safeParse({
        type: "public.card.viewed",
        cardId: "x".repeat(256),
        ownerId: "user-1",
      }).success
    ).toBe(false);
  });

  it("validates connection type against the shared enum", () => {
    expect(
      AnalyticsEventSchema.safeParse({
        type: "dashboard.connection.created",
        connectionId: "conn-1",
        ownerId: "user-1",
        connectionType: "LinkedIn",
      }).success
    ).toBe(true);
    expect(
      AnalyticsEventSchema.safeParse({
        type: "dashboard.connection.created",
        connectionId: "conn-1",
        ownerId: "user-1",
        connectionType: "MySpace",
      }).success
    ).toBe(false);
  });
});

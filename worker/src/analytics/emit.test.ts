import { describe, it, expect, vi } from "vitest";
import { toDataPoint, buildContext, track } from "./index";
import type { AnalyticsEvent } from "./schema";

describe("buildContext", () => {
  it("extracts the referer host and leaves country unset without cf", () => {
    const req = new Request("https://gr33t.me/api/card/abc", {
      headers: { referer: "https://www.google.com/search?q=x" },
    });
    const ctx = buildContext(req);
    expect(ctx.refererHost).toBe("www.google.com");
    expect(ctx.country).toBeUndefined();
  });

  it("ignores a malformed referer", () => {
    const req = new Request("https://gr33t.me/api/card/abc", {
      headers: { referer: "not a url" },
    });
    expect(buildContext(req).refererHost).toBeUndefined();
  });
});

describe("toDataPoint", () => {
  it("maps a card view onto the documented column layout", () => {
    const event: AnalyticsEvent = {
      type: "public.card.viewed",
      cardId: "card-1",
      ownerId: "user-1",
    };
    const dp = toDataPoint(event, {
      country: "US",
      refererHost: "example.com",
    });
    expect(dp.indexes).toEqual(["public.card.viewed"]);
    expect(dp.blobs).toEqual([
      "public.card.viewed", // blob1 type
      "public", // blob2 product
      "card", // blob3 entity
      "viewed", // blob4 action
      "user-1", // blob5 owner
      "card-1", // blob6 primary entity
      "", // blob7 secondary entity
      "", // blob8 connection type
      "US", // blob9 country
      "example.com", // blob10 referer host
    ]);
    expect(dp.doubles).toEqual([1]);
  });

  it("records the connection id and type for a link click", () => {
    const event: AnalyticsEvent = {
      type: "public.link.clicked",
      cardId: "card-1",
      connectionId: "conn-9",
      ownerId: "user-1",
      connectionType: "LinkedIn",
    };
    const dp = toDataPoint(event, {});
    expect(dp.blobs?.[6]).toBe("conn-9"); // secondary entity id
    expect(dp.blobs?.[7]).toBe("LinkedIn"); // connection type
  });
});

describe("track", () => {
  const req = new Request("https://gr33t.me/api/card/abc");

  it("writes a validated event to the bound dataset", () => {
    const writeDataPoint = vi.fn();
    track(
      { EVENTS: { writeDataPoint } as unknown as AnalyticsEngineDataset },
      req,
      {
        type: "public.card.viewed",
        cardId: "card-1",
        ownerId: "user-1",
      }
    );
    expect(writeDataPoint).toHaveBeenCalledOnce();
    expect(writeDataPoint.mock.calls[0][0].indexes).toEqual([
      "public.card.viewed",
    ]);
  });

  it("drops an invalid event without writing", () => {
    const writeDataPoint = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Deliberately invalid payload (missing cardId/ownerId) to exercise the
    // runtime drop path.
    const invalid = { type: "public.card.viewed" } as unknown as AnalyticsEvent;
    track(
      { EVENTS: { writeDataPoint } as unknown as AnalyticsEngineDataset },
      req,
      invalid
    );
    expect(writeDataPoint).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("is a no-op when the binding is absent", () => {
    expect(() =>
      track({}, req, {
        type: "public.card.viewed",
        cardId: "card-1",
        ownerId: "user-1",
      })
    ).not.toThrow();
  });
});

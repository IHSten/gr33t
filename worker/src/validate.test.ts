import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import {
  ValidationError,
  parseWith,
  parseJsonBody,
  parseAttachPosition,
  CreateCardSchema,
  UpdateCardSchema,
  CreateConnectionSchema,
  UpdateConnectionSchema,
  SetCardConnectionsSchema,
  AttachPositionSchema,
  DevLoginSchema,
  parseOptionalJsonBody,
} from "./validate";

function ctxWithBody(body: unknown): Context {
  return { req: { json: async () => body } } as unknown as Context;
}
function ctxWithBadJson(): Context {
  return {
    req: {
      json: async () => {
        throw new SyntaxError("bad json");
      },
    },
  } as unknown as Context;
}

describe("CreateCardSchema", () => {
  it("accepts a full, partial, and empty payload", () => {
    expect(
      parseWith(CreateCardSchema, {
        title: "Me",
        description: "hi",
      })
    ).toEqual({ title: "Me", description: "hi" });
    expect(parseWith(CreateCardSchema, { title: "Me" })).toEqual({
      title: "Me",
    });
    expect(parseWith(CreateCardSchema, {})).toEqual({});
  });

  it("strips unknown keys", () => {
    expect(parseWith(CreateCardSchema, { title: "Me", evil: 1 })).toEqual({
      title: "Me",
    });
  });

  it("rejects wrong types and over-long strings", () => {
    expect(() => parseWith(CreateCardSchema, { title: 123 })).toThrow(
      ValidationError
    );
    expect(() =>
      parseWith(CreateCardSchema, { title: "x".repeat(201) })
    ).toThrow(ValidationError);
    expect(() => parseWith(CreateCardSchema, null)).toThrow(ValidationError);
    expect(() => parseWith(CreateCardSchema, [])).toThrow(ValidationError);
  });
});

describe("UpdateCardSchema", () => {
  it("accepts a single field and explicit null (clear)", () => {
    expect(parseWith(UpdateCardSchema, { title: "New" })).toEqual({
      title: "New",
    });
    expect(parseWith(UpdateCardSchema, { description: null })).toEqual({
      description: null,
    });
  });

  it("rejects an empty patch", () => {
    expect(() => parseWith(UpdateCardSchema, {})).toThrow(
      /At least one of title/
    );
  });
});

describe("CreateConnectionSchema", () => {
  const base = { type: "X", handle: "@me", link: "https://x.com/me" };

  it("accepts valid social, mailto and tel links", () => {
    expect(parseWith(CreateConnectionSchema, base)).toMatchObject(base);
    expect(
      parseWith(CreateConnectionSchema, {
        type: "Email",
        handle: "me@x.com",
        link: "mailto:me@x.com",
      })
    ).toMatchObject({ type: "Email" });
    expect(
      parseWith(CreateConnectionSchema, {
        type: "Phone",
        handle: "+1",
        link: "tel:+15551234567",
      })
    ).toMatchObject({ type: "Phone" });
  });

  it("accepts a site-relative or https imageUrl", () => {
    expect(
      parseWith(CreateConnectionSchema, {
        ...base,
        imageUrl: "/api/images/uploads/u/abc.png",
      })
    ).toMatchObject({ imageUrl: "/api/images/uploads/u/abc.png" });
    expect(
      parseWith(CreateConnectionSchema, {
        ...base,
        imageUrl: "https://cdn.example.com/a.png",
      })
    ).toMatchObject({ imageUrl: "https://cdn.example.com/a.png" });
  });

  it("rejects an unknown connection type", () => {
    expect(() =>
      parseWith(CreateConnectionSchema, { ...base, type: "Myspace" })
    ).toThrow(ValidationError);
  });

  it("rejects an empty handle", () => {
    expect(() =>
      parseWith(CreateConnectionSchema, { ...base, handle: "   " })
    ).toThrow(ValidationError);
  });

  it("rejects dangerous link schemes (stored-XSS vectors)", () => {
    for (const link of [
      "javascript:alert(1)",
      "data:text/html;base64,PHN2Zz4=",
      "vbscript:msgbox(1)",
      "//evil.example.com",
      "ftp://host/file",
      "not a url",
    ]) {
      expect(() =>
        parseWith(CreateConnectionSchema, { ...base, link })
      ).toThrow(ValidationError);
    }
  });

  it("rejects dangerous imageUrl values", () => {
    for (const imageUrl of ["javascript:alert(1)", "//evil.example.com"]) {
      expect(() =>
        parseWith(CreateConnectionSchema, { ...base, imageUrl })
      ).toThrow(ValidationError);
    }
  });

  it("requires type, handle and link", () => {
    expect(() => parseWith(CreateConnectionSchema, {})).toThrow(
      ValidationError
    );
    expect(() =>
      parseWith(CreateConnectionSchema, { type: "X", handle: "@me" })
    ).toThrow(ValidationError);
  });
});

describe("UpdateConnectionSchema", () => {
  it("accepts a single field", () => {
    expect(parseWith(UpdateConnectionSchema, { handle: "@new" })).toEqual({
      handle: "@new",
    });
    expect(parseWith(UpdateConnectionSchema, { imageUrl: null })).toEqual({
      imageUrl: null,
    });
  });

  it("rejects an empty patch and unsafe link", () => {
    expect(() => parseWith(UpdateConnectionSchema, {})).toThrow(
      /At least one of/
    );
    expect(() =>
      parseWith(UpdateConnectionSchema, { link: "javascript:alert(1)" })
    ).toThrow(ValidationError);
  });
});

describe("SetCardConnectionsSchema", () => {
  it("accepts an ordered list and an empty list", () => {
    expect(
      parseWith(SetCardConnectionsSchema, { connectionIds: ["a", "b"] })
    ).toEqual(["a", "b"]);
    expect(parseWith(SetCardConnectionsSchema, { connectionIds: [] })).toEqual(
      []
    );
  });

  it("rejects non-arrays, empty-string ids and duplicates", () => {
    expect(() =>
      parseWith(SetCardConnectionsSchema, { connectionIds: "a" })
    ).toThrow(ValidationError);
    expect(() =>
      parseWith(SetCardConnectionsSchema, { connectionIds: ["a", ""] })
    ).toThrow(ValidationError);
    expect(() =>
      parseWith(SetCardConnectionsSchema, { connectionIds: ["a", "a"] })
    ).toThrow(/duplicate/);
  });
});

describe("AttachPositionSchema", () => {
  it("accepts an absent or valid position", () => {
    expect(parseWith(AttachPositionSchema, {})).toEqual({});
    expect(parseWith(AttachPositionSchema, { position: 0 })).toEqual({
      position: 0,
    });
  });

  it("rejects negative, fractional and non-numeric positions", () => {
    expect(() => parseWith(AttachPositionSchema, { position: -1 })).toThrow(
      ValidationError
    );
    expect(() => parseWith(AttachPositionSchema, { position: 1.5 })).toThrow(
      ValidationError
    );
    expect(() => parseWith(AttachPositionSchema, { position: "1" })).toThrow(
      ValidationError
    );
  });
});

describe("parseJsonBody", () => {
  it("validates a good body", async () => {
    await expect(
      parseJsonBody(ctxWithBody({ title: "Me" }), CreateCardSchema)
    ).resolves.toEqual({ title: "Me" });
  });

  it("throws a clear error on invalid JSON", async () => {
    await expect(
      parseJsonBody(ctxWithBadJson(), CreateCardSchema)
    ).rejects.toThrow(/valid JSON/);
  });

  it("propagates schema errors", async () => {
    await expect(
      parseJsonBody(ctxWithBody({ title: 5 }), CreateCardSchema)
    ).rejects.toThrow(ValidationError);
  });
});

describe("DevLoginSchema", () => {
  it("accepts an absent email and a valid email", () => {
    expect(parseWith(DevLoginSchema, {})).toEqual({});
    expect(parseWith(DevLoginSchema, { email: "me@example.com" })).toEqual({
      email: "me@example.com",
    });
    expect(parseWith(DevLoginSchema, { email: "  me@example.com  " })).toEqual({
      email: "me@example.com",
    });
  });

  it("rejects a malformed email", () => {
    expect(() => parseWith(DevLoginSchema, { email: "not-an-email" })).toThrow(
      ValidationError
    );
    expect(() => parseWith(DevLoginSchema, { email: "" })).toThrow(
      ValidationError
    );
  });
});

describe("parseOptionalJsonBody", () => {
  it("returns undefined for an absent/empty body", async () => {
    await expect(
      parseOptionalJsonBody(ctxWithBadJson(), DevLoginSchema)
    ).resolves.toBeUndefined();
    await expect(
      parseOptionalJsonBody(ctxWithBody(null), DevLoginSchema)
    ).resolves.toBeUndefined();
  });

  it("validates a present body", async () => {
    await expect(
      parseOptionalJsonBody(ctxWithBody({ email: "a@b.com" }), DevLoginSchema)
    ).resolves.toEqual({ email: "a@b.com" });
    await expect(
      parseOptionalJsonBody(ctxWithBody({ email: "nope" }), DevLoginSchema)
    ).rejects.toThrow(ValidationError);
  });
});

describe("parseAttachPosition", () => {
  it("returns undefined for an empty/invalid body", async () => {
    await expect(
      parseAttachPosition(ctxWithBadJson())
    ).resolves.toBeUndefined();
    await expect(
      parseAttachPosition(ctxWithBody(null))
    ).resolves.toBeUndefined();
  });

  it("returns the parsed position", async () => {
    await expect(
      parseAttachPosition(ctxWithBody({ position: 3 }))
    ).resolves.toBe(3);
  });

  it("throws on an invalid position", async () => {
    await expect(
      parseAttachPosition(ctxWithBody({ position: -1 }))
    ).rejects.toThrow(ValidationError);
  });
});

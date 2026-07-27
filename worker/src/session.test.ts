import { describe, it, expect } from "vitest";
import type { Bindings } from "./index";
import { cookieSecret } from "./session";

function env(partial: Partial<Bindings>): Bindings {
  return partial as Bindings;
}

describe("cookieSecret (fail-closed)", () => {
  it("uses the configured secret whenever one is set", () => {
    expect(cookieSecret(env({ COOKIE_SECRET: "real-secret" }))).toBe(
      "real-secret"
    );
    expect(
      cookieSecret(env({ AUTH_MODE: "local", COOKIE_SECRET: "real-secret" }))
    ).toBe("real-secret");
  });

  it("falls back to the insecure dev value ONLY in local mode", () => {
    expect(cookieSecret(env({ AUTH_MODE: "local" }))).toMatch(/insecure/);
  });

  it("throws when COOKIE_SECRET is missing outside local mode", () => {
    expect(() => cookieSecret(env({ AUTH_MODE: "google" }))).toThrow(
      /COOKIE_SECRET is required/
    );
    expect(() => cookieSecret(env({}))).toThrow(/COOKIE_SECRET is required/);
    expect(() => cookieSecret(env({ COOKIE_SECRET: "" }))).toThrow(
      /COOKIE_SECRET is required/
    );
  });
});

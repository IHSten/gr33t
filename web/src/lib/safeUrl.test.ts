import { describe, it, expect } from "vitest";
import { isSafeExternalLink } from "./safeUrl";

describe("isSafeExternalLink", () => {
  it("allows http(s), mailto and tel links", () => {
    expect(isSafeExternalLink("https://x.com/me")).toBe(true);
    expect(isSafeExternalLink("http://example.com")).toBe(true);
    expect(isSafeExternalLink("mailto:me@example.com")).toBe(true);
    expect(isSafeExternalLink("tel:+15551234567")).toBe(true);
  });

  it("blocks dangerous schemes and malformed urls", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html;base64,PHN2Zz4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "//evil.example.com",
      "not a url",
      "",
    ]) {
      expect(isSafeExternalLink(url)).toBe(false);
    }
  });
});

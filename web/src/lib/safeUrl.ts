const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

export function isSafeExternalLink(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return SAFE_LINK_SCHEMES.has(parsed.protocol);
}

export function isSafeImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("//")) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

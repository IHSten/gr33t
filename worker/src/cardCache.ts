import type { Card } from "../../shared/card";

// Read-through cache for the public card read (GET /api/card/:id) — the only
// real D1 load. KV (unlike the per-colo Cache API) can be invalidated per key,
// so the cache lives until the owner edits rather than expiring on a timer:
// D1 load scales with edits, not with view traffic. The long TTL is only a
// backstop in case an invalidation is ever missed.
//
// KV is eventually consistent (~60s global propagation), so an edit becomes
// publicly visible within ~a minute. Owners read the uncached /api/cards/:id,
// so their own editor always reflects changes immediately.

const PREFIX = "card:";
export const CARD_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day backstop

type CardCacheEnv = { CARD_CACHE: KVNamespace };

// ownerId rides along so a cache hit can still attribute the view analytics
// without a D1 lookup; it is never part of the public response body.
export type CachedCard = { card: Card; ownerId: string | null };

export async function readCachedCard(
  env: CardCacheEnv,
  id: string
): Promise<CachedCard | null> {
  try {
    return await env.CARD_CACHE.get<CachedCard>(PREFIX + id, "json");
  } catch {
    return null; // a cache read must never break the request
  }
}

export async function writeCachedCard(
  env: CardCacheEnv,
  id: string,
  value: CachedCard
): Promise<void> {
  try {
    await env.CARD_CACHE.put(PREFIX + id, JSON.stringify(value), {
      expirationTtl: CARD_CACHE_TTL_SECONDS,
    });
  } catch {
    // best-effort; a failed populate just means the next read hits D1
  }
}

// Drops the cached entries for the given card ids (deduped). Safe to call with
// zero ids. Errors are swallowed — a missed delete self-heals via the TTL.
export async function invalidateCards(
  env: CardCacheEnv,
  ids: Iterable<string>
): Promise<void> {
  const unique = [...new Set(ids)];
  await Promise.all(
    unique.map(id => env.CARD_CACHE.delete(PREFIX + id).catch(() => {}))
  );
}

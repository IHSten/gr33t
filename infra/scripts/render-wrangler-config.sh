#!/usr/bin/env bash
set -euo pipefail

SRC="${SRC:-worker/wrangler.toml}"
OUT="${1:-worker/wrangler.deploy.toml}"

: "${D1_DATABASE_ID:?set D1_DATABASE_ID (Cloudflare D1 database id)}"
: "${KV_NAMESPACE_ID:?set KV_NAMESPACE_ID (Cloudflare KV namespace id)}"
: "${CARD_CACHE_KV_ID:?set CARD_CACHE_KV_ID (Cloudflare KV namespace id for CARD_CACHE)}"

D1_TOKEN="PLACEHOLDER-D1-DATABASE-ID"
KV_TOKEN="PLACEHOLDER-KV-NAMESPACE-ID"
CARD_CACHE_TOKEN="PLACEHOLDER-CARD-CACHE-KV-ID"

for tok in "$D1_TOKEN" "$KV_TOKEN" "$CARD_CACHE_TOKEN"; do
  grep -q "$tok" "$SRC" || {
    echo "error: token '$tok' not found in $SRC" >&2
    exit 1
  }
done

sed -e "s|${D1_TOKEN}|${D1_DATABASE_ID}|g" \
  -e "s|${KV_TOKEN}|${KV_NAMESPACE_ID}|g" \
  -e "s|${CARD_CACHE_TOKEN}|${CARD_CACHE_KV_ID}|g" \
  "$SRC" >"$OUT"

if grep -qE 'PLACEHOLDER-(D1|KV|CARD-CACHE)-' "$OUT"; then
  echo "error: a placeholder survived in $OUT (empty id?)" >&2
  rm -f "$OUT"
  exit 1
fi

echo "Rendered $OUT from $SRC (ids injected from env)."

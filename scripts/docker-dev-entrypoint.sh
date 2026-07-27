#!/bin/sh
set -e

STAMP=node_modules/.lock-stamp
if ! cmp -s package-lock.json "$STAMP" 2>/dev/null; then
  echo "deps: package-lock.json changed since last install — running npm ci"
  npm ci
  cp package-lock.json "$STAMP"
else
  echo "deps: in sync with lockfile — skipping install"
fi

exec "$@"

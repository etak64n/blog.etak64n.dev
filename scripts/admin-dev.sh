#!/usr/bin/env bash
# Local admin: builds the site and serves it together with the Pages Functions on
# http://127.0.0.1:$PORT (default 8788), under the Content-Security-Policy that production
# sends for /admin, so that CSP problems show up locally as well.
#
# wrangler.toml binds Workers AI, and `wrangler pages dev` will not start without a Cloudflare
# login while a remote binding is configured. The server therefore runs from a temporary
# directory whose wrangler.toml leaves the AI binding out; with DEV_FAKE_AI=true in .dev.vars,
# /api/admin/hero answers with a placeholder SVG instead of calling Workers AI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8788}"
PROD_ADMIN_URL="https://blog.etak64n.dev/admin/"

cd "$ROOT"

if [ ! -f .dev.vars ]; then
  echo "error: .dev.vars is missing. Create it with: cp .dev.vars.example .dev.vars" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/blog-admin-dev.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

zola build --base-url "http://127.0.0.1:$PORT" --output-dir "$WORK/public" --force

# Mirror the production /admin policy (a Cloudflare Transform Rule, not stored in this repo).
csp="$(curl -fsSI --max-time 10 "$PROD_ADMIN_URL" | tr -d '\r' | sed -n 's/^content-security-policy: //Ip' || true)"
if [ -n "$csp" ]; then
  printf '/admin/*\n  Content-Security-Policy: %s\n' "$csp" > "$WORK/public/_headers"
  echo "Serving /admin with the production Content-Security-Policy."
else
  echo "warning: could not fetch the production CSP; /admin is served without one." >&2
fi

ln -s "$ROOT/functions" "$WORK/functions"
cp .dev.vars "$WORK/.dev.vars"
# Same configuration minus the [ai] table.
awk '/^\[/ { skip = ($0 == "[ai]") } !skip' wrangler.toml > "$WORK/wrangler.toml"

cd "$WORK"
echo "Open http://127.0.0.1:$PORT/admin/?backend=test (in-browser Test backend, no GitHub login)."
npx --prefix "$ROOT" wrangler pages dev public --port "$PORT" --ip 127.0.0.1

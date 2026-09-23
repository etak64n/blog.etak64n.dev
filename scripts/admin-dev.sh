#!/usr/bin/env bash
# Local admin: builds the site and serves it together with the Pages Functions on
# http://127.0.0.1:$PORT (default 8788), under the Content-Security-Policies that production
# sends for /admin and for the public pages, so that CSP problems show up locally as well.
#
# wrangler.toml binds Workers AI, and `wrangler pages dev` will not start without a Cloudflare
# login while a remote binding is configured. The server therefore runs from a temporary
# directory whose wrangler.toml leaves the AI binding out; with DEV_FAKE_AI=true in .dev.vars,
# /api/admin/hero answers with a placeholder SVG instead of calling Workers AI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8788}"
PROD_ADMIN_URL="https://blog.etak64n.dev/admin/"
PROD_SITE_URL="https://blog.etak64n.dev/"

cd "$ROOT"

if [ ! -f .dev.vars ]; then
  echo "error: .dev.vars is missing. Create it with: cp .dev.vars.example .dev.vars" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/blog-admin-dev.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

zola build --base-url "http://127.0.0.1:$PORT" --output-dir "$WORK/public" --force

# Mirror the production policies (Cloudflare Transform Rules on the zone, not stored in this
# repo): one for /admin, another for the public pages. The public paths are listed one by one
# because a catch-all rule would add a second policy to /admin as well.
prod_csp() {
  curl -fsSI --max-time 10 "$1" | tr -d '\r' | sed -n 's/^content-security-policy: //Ip' || true
}
admin_csp="$(prod_csp "$PROD_ADMIN_URL")"
site_csp="$(prod_csp "$PROD_SITE_URL")"
: > "$WORK/public/_headers"
if [ -n "$admin_csp" ]; then
  printf '/admin/*\n  Content-Security-Policy: %s\n' "$admin_csp" >> "$WORK/public/_headers"
fi
if [ -n "$site_csp" ]; then
  for path in / '/articles/*' '/tags/*' '/page/*'; do
    printf '%s\n  Content-Security-Policy: %s\n' "$path" "$site_csp" >> "$WORK/public/_headers"
  done
fi
if [ -n "$admin_csp" ] && [ -n "$site_csp" ]; then
  echo "Serving /admin and the public pages with the production Content-Security-Policies."
else
  echo "warning: could not fetch the production CSPs; pages are served without them." >&2
fi

ln -s "$ROOT/functions" "$WORK/functions"
cp .dev.vars "$WORK/.dev.vars"
# Same configuration minus the [ai] table.
awk '/^\[/ { skip = ($0 == "[ai]") } !skip' wrangler.toml > "$WORK/wrangler.toml"

cd "$WORK"
echo "Open http://127.0.0.1:$PORT/admin/?backend=test (in-browser Test backend, no GitHub login)."
npx --prefix "$ROOT" wrangler pages dev public --port "$PORT" --ip 127.0.0.1

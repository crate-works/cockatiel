#!/usr/bin/env bash
set -euo pipefail

# Builds the combined GitHub Pages deploy tree for cockatiel.crate-works.org:
#
#   dist-deploy/          Astro marketing/docs site, served at /
#   dist-deploy/app/      the Cockatiel app, served at /app/ (carries config.json)
#   dist-deploy/CNAME     custom domain
#
# Run from the repo root with deps installed. The app build also needs the WASM
# VAD binary — fetch it first with `pnpm run download:wasm` (the deploy workflow
# does this; locally run it once).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_DIR="dist-deploy"
DOMAIN="cockatiel.crate-works.org"

echo "==> Building app (base /app/)"
VITE_BASE_PATH=/app/ pnpm run build

echo "==> Building website (base /)"
pnpm --filter cockatiel-website build

echo "==> Assembling ${DEPLOY_DIR}/"
rm -rf "${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}/app"
# Site at the root, app under /app/ (the app dist already carries config.json,
# its 404.html SPA fallback, and wasm/). /auth/callback is served via the
# 404.html fallback — no materialised directory, so no trailing-slash redirect.
cp -R website/dist/. "${DEPLOY_DIR}/"
cp -R dist/. "${DEPLOY_DIR}/app/"
echo "${DOMAIN}" > "${DEPLOY_DIR}/CNAME"

echo "==> Done. Combined tree in ${DEPLOY_DIR}/"

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
# Site at the root, app under /app/ (the app dist already carries config.json
# and wasm/). The OAuth callback is materialised separately below.
cp -R website/dist/. "${DEPLOY_DIR}/"
cp -R dist/. "${DEPLOY_DIR}/app/"

# Materialise the OAuth callback as a real file. The IdP redirect is a hard
# navigation to /app/auth/callback, which the SPA build does not emit. GitHub
# Pages serves only the *root* 404.html (the marketing site's) for unknown
# paths — it never falls back to /app/404.html — so without this the callback
# 404s into the Astro site. callback.html (not callback/index.html) is served
# by Pages at the extensionless /app/auth/callback with no trailing-slash
# redirect, matching the registered redirect_uri exactly.
mkdir -p "${DEPLOY_DIR}/app/auth"
cp dist/index.html "${DEPLOY_DIR}/app/auth/callback.html"

echo "${DOMAIN}" > "${DEPLOY_DIR}/CNAME"

echo "==> Done. Combined tree in ${DEPLOY_DIR}/"

# syntax=docker/dockerfile:1

# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:lts-slim AS build
WORKDIR /src

# curl + bzip2 are needed by scripts/download-wasm-vad.sh (tar xjf).
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl bzip2 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Copy the whole repo before installing: the `postinstall` script copies the
# coi-serviceworker into public/, so the source tree must already be present.
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm run download:wasm

# Self-host serves at the domain root (base path "/").
RUN VITE_BASE_PATH=/ pnpm run build

# The image ships with NO catalogue providers — local annotation works out of
# the box and the catalogue browser stays hidden. Self-hosters mount their own
# config.json (see config.example.json / the /self-host docs) over the webroot.
RUN echo '[]' > dist/config.json

# ─── Serve stage ────────────────────────────────────────────────────────────
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80

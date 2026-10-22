# syntax=docker/dockerfile:1.7
# sebastianfrazier.com: the Vite build served by Caddy, which sends the CSP
# (frame-ancestors included) as a real response header. The worlds are NOT
# built here — that needs GitHub access — so public/worlds/ must already
# exist in the build context (CI runs scripts/build-worlds.ts first, then
# `railway up --no-gitignore`; .railwayignore keeps the rest out).
#   docker build -t sebastianfrazier-com .

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /site

FROM base AS fetch
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
RUN pnpm fetch

FROM fetch AS build
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN test -f public/worlds/manifest.json || { echo "public/worlds/manifest.json missing: run pnpm build:worlds before building the image" >&2; exit 1; }
RUN pnpm build
RUN node scripts/render-caddyfile.ts Caddyfile /site/Caddyfile.rendered

FROM caddy:2.11.4-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b AS runtime
# With admin, auto-HTTPS and config persistence off Caddy writes nothing it
# keeps, but it still resolves its XDG dirs at start; /tmp is writable for
# the unprivileged user.
ENV XDG_CONFIG_HOME=/tmp/caddy-config XDG_DATA_HOME=/tmp/caddy-data
COPY --from=build /site/Caddyfile.rendered /etc/caddy/Caddyfile
COPY --from=build /site/dist /srv
USER 65534:65534
EXPOSE 8080
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

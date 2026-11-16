# sebastianfrazier.com — agent guide

Portfolio site: a hosted cabn instance (one world per project in
`projects.json`) behind a pixel-art map landing page. Node >= 22.18 (runs `.ts` scripts
directly via type stripping), pnpm, TypeScript strict, Biome, Vitest, zod.

## Commands

- `pnpm install` — install (`--frozen-lockfile` in CI)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` — Biome / `tsc --noEmit` / Vitest (`tests/`)
- `pnpm build:worlds [-- --only a,b] [-- --offline] [-- --keep-temp]` — real worlds from GitHub into `public/worlds/`
- `pnpm build:fixture` — offline fixture world (`fixtures/world-fixture/`) instead; what CI builds
- `pnpm build` — copies engine sprites, typechecks, `vite build`, then `scripts/check-dist.ts`. Needs `public/worlds/manifest.json` (the CSP reads it)
- `pnpm preview -- --port <free port>` — serve `dist/`
- `pnpm upstream-changed` — scheduled-deploy decision (`DEPLOYED_MANIFEST_URL`, `GITHUB_TOKEN` env)
- `pnpm engine:link [dir]` / `pnpm engine:unlink` — local cabn checkout via `.pnpmfile.cjs`; never leaves `link:` in the lockfile. While linked, every pnpm script needs `--config.verify-deps-before-run=false` or pnpm silently relinks npm 0.1.0
- Full check before a commit: `pnpm lint && pnpm typecheck && pnpm test && pnpm build:fixture && pnpm build`

## Layout

- `projects.json` + `scripts/lib/projects.ts` — the project list and its schema. `history` is literally `false`
- `scripts/lib/cabnAdapter.ts` — the only build-time code that imports `@cabn/*`; capability-probes 0.1.0 vs 0.2.0. `src/CabnWorld.tsx` is the browser half (lazy `CabnGame`)
- `scripts/lib/github.ts` — SHA resolve + tarball stream/extract (files and dirs only, excludes applied while extracting)
- `scripts/lib/leaks.ts` — post-build scan for build paths and excluded paths
- `scripts/lib/upstream.ts` — pure diff of upstream SHAs, site commit and cabn version vs the deployed manifest
- `scripts/lib/secrets.ts` — pattern secret scan of each extract (fails private projects); `scripts/lib/excludes.ts` — gitignore-style excludes
- `src/App.tsx` (routes `/` map, `/play?world=<project id>`), `src/MapLanding.tsx` + `src/mapData.ts` (map markers and `?world=` validation, derived from the public `shelf.json`), `src/CabnWorld.tsx` (deep-link wrapper). There is no résumé page; `check-dist.ts` fails if `dist/resume` appears
- `csp-policy.ts` — one CSP for the meta tag and the Caddy header; `public/zod-jitless.js` keeps zod's eval probe from tripping it
- `Dockerfile`, `Caddyfile`, `scripts/render-caddyfile.ts` — the hosted image. Worlds are built in CI, not in Docker
- Generated, gitignored: `public/worlds/`, `public/assets/`, `dist/`

## Conventions

- Never clone project repos or ship git history; tarball by SHA only
- New engine-version behavior goes in `cabnAdapter.ts`, nowhere else
- `allowedEmbedOrigins`/`world`/`sites` come only from `projects.json`; a repo's `cabn.json` can't widen them
- Never log or publish a private repo's name; use the project id
- Comments load-bearing only (why, not what)
- Branch per feature off `main`; never commit to `main`; never push without the owner's say-so
- User-visible changes get a dated `CHANGELOG.md` entry

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
- `node scripts/build-blog.ts` — runs inside `pnpm build`, after `vite build`: writes `dist/blog/index.html`, `dist/blog/<slug>/index.html` (copies of the shell with each page's title and link-preview tags), `feed.xml` and `sitemap.xml`
- `pnpm e2e` — the one Playwright spec (`e2e/blog.spec.ts`) against `vite preview` of `dist/`, so `pnpm build` first. Locally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a cached Chrome for Testing build instead of running `playwright install`; `SF_E2E_PORT` moves it off 4391. CI runs it as the `browser-smoke` job
- `pnpm check:caddy` — serves `dist/` with the real `Caddyfile` under the Dockerfile's pinned Caddy image and checks routes, fallbacks, status codes, security headers (404s included) and cache classes over HTTP (`scripts/check-caddy.ts`; needs Docker and a finished `pnpm build`; `SF_CADDY_PORT` moves it off 4392). Run it after any `Caddyfile` edit; CI runs it in the `browser-smoke` job
- Full check before a commit: `pnpm lint && pnpm typecheck && pnpm test && pnpm build:fixture && pnpm build`

## Layout

- `projects.json` + `scripts/lib/projects.ts` — the project list and its schema. `history` is literally `false`
- `scripts/lib/cabnAdapter.ts` — the only build-time code that imports `@cabn/*`; capability-probes 0.1.0 vs 0.2.0. `src/CabnWorld.tsx` is the browser half (lazy `CabnGame`)
- `scripts/lib/github.ts` — SHA resolve + tarball stream/extract (files and dirs only, excludes applied while extracting)
- `scripts/lib/leaks.ts` — post-build scan for build paths and excluded paths
- `scripts/lib/upstream.ts` — pure diff of upstream SHAs, site commit and cabn version vs the deployed manifest
- `scripts/lib/secrets.ts` — pattern secret scan of each extract (fails private projects); `scripts/lib/excludes.ts` — gitignore-style excludes
- `src/App.tsx` (routes `/` map, `/play?world=<project id>`), `src/MapLanding.tsx` + `src/mapData.ts` (map markers and `?world=` validation, derived from the public `shelf.json`), `src/CabnWorld.tsx` (deep-link wrapper). There is no résumé page; `check-dist.ts` fails if `dist/resume` appears
- `src/route.ts` (pure route parser), `src/BlogPage.tsx` (lazy chunk: `@cabn/blog`'s `<Blog>` and its stylesheet) and `src/blog/posts.ts` (the post list). `posts.ts` is also imported in Node by `scripts/build-blog.ts` and `scripts/check-dist.ts`, so it may contain only lazy `() => import(...)` loaders (`tests/blog.test.ts` enforces it). A post lives in `src/blog/<slug>/`; its stylesheets must scope every selector under `.post-<slug>` (same test). The blog is a page, not a world: nothing about it is in `projects.json`
- `src/blog/fan-sentiment/` — the fan-sentiment post in the shape `@cabn/blog` loads: default export `FanSentimentPost.tsx`, every CSS selector under `.post-fan-sentiment` (a test enforces it), sections in `sections/`, shared scene parts in `kit/` (figures and their pixel sprites in `sprites.ts`, `SectionHead`, `Marquee` (the page title's bulb sign, played on load), `Stadium`, chalk ground, and `motion.ts`: `useReveal`, which scrubs every scene with the scroll (pinned where a selector is given and the scene fits the screen; `play` only for the on-load title), `driven` (setter targets scenes draw through), `useParallax`, `flightDrawer`, `countUp`). Scenes move players only through `swingTo`/`poseFielder`; data in `snapshot.ts` (`snapshot.json` is a copy of fansent's aggregate-only snapshot; a test rejects a copy with free text). Reader-facing text lives in `copy.ts` (a draft for the owner; don't scatter strings into sections). A section's markup is always its finished state and GSAP only animates towards it. Fonts are self-hosted next to the code with their OFL files; GSAP is under Webflow's no-charge standard licence, not an OSS licence. Preview: `pnpm dev`, then `/dev/fan-sentiment.html` (not a build input)
- `src/blog/loosy-goose/` — the loosy-goose post, same shape: default export `LoosyGoosePost.tsx`, selectors under `.post-loosy-goose`, sections in `sections/`, `kit/` (`Parts.tsx`: the pixel goose and `poseGoose`/`honker`/`walker`, section head, scoreboard strip, folded data table; `sprites.ts`: the goose's frame grids; `pong.ts`: pure rally and token-grid geometry; `motion.ts`: `useScrub`, which scrubs every scene on every width, pinned when the screen is at least 560px tall, and `driver` for hand-drawn scenes). Numbers live only in `data.ts`, each block naming its source table in the loosy-goose repo; copy in `copy.ts`. Press Start 2P (OFL, in `fonts/`) is shipped unmodified because it has a Reserved Font Name; it lacks U+2212, so signed values set in it use `pixelSigned`. Preview: `/dev/loosy-goose.html`
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

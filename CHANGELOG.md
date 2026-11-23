# Changelog

## 2026-11-22 (blog is a page, not a world)

- The blog moves from a cabn world to `/blog/`, built on the new `@cabn/blog`
  package. Posts can be React components with their own styling and
  interaction, or markdown files; each loads as its own chunk, and a blog page
  downloads none of the game engine.
- The `blog` world is gone from `projects.json`. The map keeps a "Blog" cabin,
  now linking to `/blog/`, and the footer links there too.
- Each post URL is served as its own HTML page with a title and link-preview
  tags, and there is an Atom feed at `/blog/feed.xml` and a sitemap at
  `/blog/sitemap.xml`. The CSP is unchanged.
- One post so far, an unlisted draft placeholder for the fan-sentiment
  write-up at `/blog/fan-sentiment/`.
- Needs `@cabn/blog` 0.1.0 on npm; until then `pnpm-lock.yaml` has no entry
  for it and `pnpm install --frozen-lockfile` fails. Local work uses
  `pnpm engine:link`, which now links `@cabn/blog` as well.

## 2026-11-22 (dependency policy cleanup)

- `minimumReleaseAgeExclude` is gone: the cabn 0.3.1 packages are past pnpm's
  release-age window, so they install under the default policy.
- The audit no longer ignores GHSA-fc5q-39xc-vjpf (picomatch). GitHub withdrew
  the advisory on 2026-11-18 and `pnpm audit --audit-level=high` passes without it.

## 2026-11-21 (blog world)

- New world: the blog, built from the public `SebastianFrazier26/blog` repo
  like any other project (`projects.json` id `blog`, no hero site). Each post
  is a markdown file you walk up to and read in the file view; the repo's
  README, `CLAUDE.md` and `LICENSE` are excluded, so only posts appear. The
  map has a "Blog" cabin linking to `/play?world=blog`. cabn has no include
  filter, so the excludes do that job.

## 2026-11-21 (cabn 0.3.1)

- Worlds run on `@cabn/engine` 0.3.1 and `@cabn/cli` 0.2.2:
  - walking no longer hitches on streamed ground chunks or at night, where ground and light draws are batched;
  - world entry is faster on spread-out worlds (path ribbon planning no longer stalls the first frames).
- `minimumReleaseAgeExclude` lists the three new cabn versions for a day; remove them once they age past pnpm's window. The 0.3.0 entries are gone.

## 2026-11-18 (cabn 0.3.0)

- Worlds run on `@cabn/engine` 0.3.0 and `@cabn/cli` 0.2.1:
  - walking speed no longer depends on frame rate;
  - trees are drawn whole across scenery chunk edges;
  - clearings sit much closer together in the larger worlds;
  - hotbar tools are labelled everywhere, with a description card in the top-right;
  - no more multi-second stalls near big clearings, and world entry is faster;
  - a cabin's live-site preview waits for the world to load and doesn't reload when you brush past it.
- `minimumReleaseAgeExclude` lists the four new cabn versions for a day; remove them once they age past pnpm's window.

## 2026-11-16 (map landing, no résumé)

- The front page is now a pixel-art map of the base world: one cabin per
  enabled project (name and description from the public `shelf.json`, in
  shelf order) on a trail, drawn with the engine's own sprites and its
  DotGothic16 pixel font. "Enter the worlds" goes to the shelf at `/play`;
  each cabin goes straight into that project's world at
  `/play?world=<project id>` (an unknown id lands on the shelf). Esc on the
  shelf, or the "Map" link, returns to the map.
- The résumé is gone: `/resume/` page generation, `content/resume.json`,
  `pnpm build:resume`, the Caddy redirect and the landing door are removed,
  and `check-dist.ts` now fails if `dist/resume` ever appears.
- `copy-engine-assets.ts` also writes the engine's DotGothic16 (with its OFL
  license) to `public/assets/fonts/`.

## 2026-11-16

- cabn's world now previews the hosted demo
  (`https://cabn-demo-production.up.railway.app/`), which allows framing by
  sebastianfrazier.com since cabn #20. `frame-src` gains that origin.

## 2026-10-22 (cabn 0.2.0 API)

- With cabn 0.2.0 the site no longer writes into the extract: the host
  config (world info, hero site, the complete embed allowlist) goes in
  through `runBuild({ config })`, the repo's own `cabn.json` stays untouched,
  and the engine's injection warnings are printed. A repo url preview
  outside the allowlist fails that world and with it the whole deploy (the
  live site stays as it was). The CSP `frame-src` comes from the engine's
  `collectWorldEmbedOrigins` over the built worlds. 0.1.0 keeps the
  previous path; a half-upgraded linked engine refuses to build.
- Linking a local engine dedupes React, and the docs say how to keep pnpm
  from silently undoing the link before every script.

## 2026-10-22 (security review)

- Deploys run only from `main`. Project repos trigger instant updates with
  `workflow_dispatch` and an Actions-only token; `repository_dispatch` (which
  needed a Contents: write token) is removed.
- The scheduled check also compares the live site commit and cabn version,
  yields to any other pending deploy, rebuilds on a 404 or fixture manifest
  only, and skips with a warning when the live manifest can't be read.
- A repo's `cabn.json` can no longer widen embeds: origins, world info and
  sites come only from `projects.json`; disallowed url previews are dropped.
- Excludes follow `.gitignore` rules (match at any depth unless anchored).
  `ref` must be a branch.
- Every extract is secret-scanned (fails private projects, warns public);
  private repo names stay out of the manifest, world metadata and logs.
- Timeouts and size/entry caps on GitHub downloads, job timeouts, node
  image pinned by digest, Railway CLI fetched with a pinned checksum,
  checkouts without persisted credentials, and lint/typecheck/test before
  every deploy.

## 2026-10-22

- First version of the site: projects as cabn worlds built from GitHub
  tarballs (`projects.json`, `scripts/build-worlds.ts`), a two-door landing
  page, a static JS-free résumé at `/resume/`, CSP from the worlds' embed
  origins, Caddy image, CI, and a deploy workflow that rebuilds on push,
  dispatch, or a 30-minute upstream check. (The `repository_dispatch`
  trigger is superseded by the security-review entry above.)
- Pinned `@cabn/*` 0.1.0; world info and hero site portals switch on
  automatically with 0.2.0 (`scripts/lib/cabnAdapter.ts`).

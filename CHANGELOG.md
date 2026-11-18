# Changelog

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

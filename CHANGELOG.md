# Changelog

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

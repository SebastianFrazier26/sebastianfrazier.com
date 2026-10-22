# Changelog

## 2026-10-22

- First version of the site: projects as cabn worlds built from GitHub
  tarballs (`projects.json`, `scripts/build-worlds.ts`), a two-door landing
  page, a static JS-free résumé at `/resume/`, CSP from the worlds' embed
  origins, Caddy image, CI, and a deploy workflow that rebuilds on push,
  dispatch, or a 30-minute upstream check.
- Pinned `@cabn/*` 0.1.0; world info and hero site portals switch on
  automatically with 0.2.0 (`scripts/lib/cabnAdapter.ts`).

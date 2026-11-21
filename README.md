# sebastianfrazier.com

My portfolio site. Every project is a walkable pixel-art
world, built straight from its GitHub repository by
[cabn](https://github.com/SebastianFrazier26/cabn) — the same engine, used as
a hosted instance. The front page is a pixel-art map of the base world with a
marker per project; visitors enter the shelf or jump straight into one
project's world (`/play?world=<project id>`).

The blog is one of those worlds: posts are markdown files in
[SebastianFrazier26/blog](https://github.com/SebastianFrazier26/blog), built
like any project (id `blog`, at `/play?world=blog`). Its `excludes` drop the
README, `CLAUDE.md` and `LICENSE`, so only posts appear; a push there goes live
on the next scheduled deploy.

## How it works

- `projects.json` lists the projects (zod-validated by
  `scripts/lib/projects.ts`): repo, ref, description, links, `excludes`
  globs, hero site, shelf order, and whether it is published (`enabled`).
- `pnpm build:worlds` (`scripts/build-worlds.ts`) resolves each enabled
  project's `main` to a commit SHA, streams **that commit's tarball** from the
  GitHub API into a temp dir — never a clone, so no git history, author
  emails or deleted files can be published — drops excluded paths during
  extraction, injects a cabn config (world info, hero site portal,
  `allowedEmbedOrigins`), runs `cabn build` and then `cabn shelf`. Output:
  `public/worlds/<id>/`, `shelf.json`, and `manifest.json` (the SHA each world
  was built from, plus the union of embed origins for the CSP). Every world is
  scanned before publishing: no build-machine path and no excluded path may
  appear anywhere in it.
- The app (Vite + React + TypeScript) lazily loads `<CabnGame>` on `/play`
  with AI pets off. The CSP (`csp-policy.ts`) is the same in the built
  `index.html` `<meta>` and in Caddy's response header, and its `frame-src` is
  exactly the worlds' embed origins; the site itself sends
  `frame-ancestors 'none'`.
- The image (`Dockerfile`) is the Vite build served by Caddy (pinned by
  digest, non-root). Hashed assets are cached for a year, `worlds/` for 5
  minutes, everything else revalidates.

## Elastic updates

`.github/workflows/deploy.yml` deploys only from `main`, when:
1. this repo's `main` changes (push),
2. a project repo (or the owner) runs it with `workflow_dispatch`
   (instant updates, optional — see below),
3. every 30 minutes, `scripts/upstream-changed.ts` finds that something moved
   past what the live site's `/worlds/manifest.json` records: a project's
   branch (`git ls-remote`), this repo's own commit (`siteSha`, so a push
   deploy that never finished is caught), or the cabn version. A 404 (nothing
   deployed yet) or a fixture deploy rebuilds; a manifest that can't be read
   (network error, 5xx, bad JSON) skips that run with a warning instead of
   rebuilding every 30 minutes. A scheduled run also yields when another
   deploy is already queued or running. The manifest URL comes from the
   repository variable `DEPLOYED_MANIFEST_URL` (default
   `https://sebastianfrazier.com/worlds/manifest.json`).

GitHub **disables scheduled workflows after 60 days with no activity in the
repository**. If the site stops picking up project changes, re-enable the
Deploy workflow in the Actions tab (no keepalive commits are made for you).

### Optional: instant updates from a project repo

Create one **fine-grained PAT** with access to _only_ this site's repository
and the single permission **Actions: Read and write** (it can start workflow
runs; it cannot change code). Store it in each project repo as the secret
`PORTFOLIO_DEPLOY_TOKEN` and add:

```yaml
name: Notify portfolio
on:
  push:
    branches: [main]
jobs:
  notify:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - env:
          GH_TOKEN: ${{ secrets.PORTFOLIO_DEPLOY_TOKEN }}
        run: gh workflow run deploy.yml --repo SebastianFrazier26/sebastianfrazier.com --ref main
```

The deploy job refuses any ref other than `main`, so the token can only
redeploy what `main` already holds. Protect `main` in this repo (require PRs
and the CI check) so that stays true. Without the token, the 30-minute
schedule picks changes up anyway.

### What gets published

- **Excludes** in `projects.json` follow `.gitignore` rules: a pattern with no
  slash except a trailing one (`data/`, `*.log`) matches at any depth; a
  leading slash or a slash in the middle (`/build`, `src/seed.js`) anchors it
  to the repo root; a matched directory takes everything under it. Negation
  (`!`) is refused.
- **Embeds are the site's call, not the repo's.** A repo's own `cabn.json`
  keeps its other settings, but its `allowedEmbedOrigins`, `world` and
  `sites` are ignored: the only frameable origins are the live hero sites in
  `projects.json`. A repo url preview pointing anywhere else is dropped with
  a warning (not a failed build, so an upstream commit can't take the site
  down), and a repo `cabn.json` the engine rejects is ignored wholesale.
- **Secret scan**: every extract is pattern-scanned (`scripts/lib/secrets.ts`:
  cloud/GitHub/LLM/Slack/Stripe keys, private keys, credentials in URLs,
  password/secret assignments) before conversion. Any hit fails a private
  project; public projects only warn, since that content is already public.
  Hits are logged as file, line and rule — never the value.
- **Private repos** never appear by name in the public manifest, world
  metadata or CI logs; they are referred to by project id.

## Commands

| Command                                                  | What it does                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm install`                                           | install                                                                                    |
| `pnpm build:worlds [-- --only cabn,skid] [-- --offline]` | build the worlds from GitHub (`GITHUB_TOKEN` optional; required only for private projects) |
| `pnpm build:fixture`                                     | build one offline fixture world instead (what CI uses)                                     |
| `pnpm dev`                                               | Vite dev server (needs worlds built first)                                                 |
| `pnpm build`                                             | engine sprites + résumé + typecheck + Vite build + dist checks                             |
| `pnpm preview`                                           | serve the production build                                                                 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`             | Biome / tsc / Vitest                                                                       |
| `pnpm upstream-changed`                                  | would a scheduled deploy rebuild right now?                                                |
| `pnpm engine:link [dir]` / `pnpm engine:unlink`          | use a local cabn checkout instead of npm (below)                                           |

## cabn version

`package.json` pins `@cabn/*` **0.2.0** (exact). `scripts/lib/cabnAdapter.ts`
(the only module that touches the engine at build time) probes the installed
schema: on 0.2.0 it passes the host config to `runBuild({ config })` and
collects the CSP `frame-src` with `collectWorldEmbedOrigins`; a 0.1.0
fallback (no world info or hero sites) remains for linked older engines and
can be deleted when no longer wanted.

To try an unreleased engine locally: build it (`pnpm -r build` in the cabn
checkout), then `pnpm engine:link ~/Developer/cabn-m9`. That points
`node_modules/@cabn/*` at the checkout through `.pnpmfile.cjs`, driven by the
`CABN_ENGINE_DIR` env var; `package.json` and `pnpm-lock.yaml` are left
untouched. While linked, run scripts with
`pnpm --config.verify-deps-before-run=false <script>` (or export
`npm_config_verify_deps_before_run=false`): otherwise pnpm re-syncs
`node_modules` to the lockfile before the script and silently drops the
link. `pnpm engine:unlink` goes back to npm.

## Owner setup (not done by any script)

1. **GitHub repo**: create `SebastianFrazier26/sebastianfrazier.com` (public)
   and push this branch.
2. **Railway**: create a service named `portfolio` (Dockerfile build), then a
   project token → repo secret `RAILWAY_TOKEN`. Until it exists, the deploy
   workflow skips cleanly. Optionally set the repository variable
   `DEPLOYED_MANIFEST_URL` (e.g. the Railway URL before DNS is live).
3. **Branch protection** on `main`: require pull requests and the CI check;
   the instant-update token can only redeploy `main`.
4. **Private projects**: to publish famgo (currently `enabled: false`), add
   a fine-grained read-only token for it as secret `PROJECTS_READ_TOKEN` and
   flip `enabled` — after deciding it is fit to publish (its excludes drop
   `public/images/` and `src/seed.js`; history is never shipped).
5. **DNS (Porkbun)**: add the custom domain in Railway, then an `ALIAS`
   record for the apex `sebastianfrazier.com` → the Railway target, and a
   `CNAME` for `www` → the same target.
6. **Hero sites**: enable GitHub Pages on SaViMAE, mlb-fan-sentiment,
   loosy-goose and SafeAscent, then set each hero's `status` to `"live"` in
   `projects.json`. Only live heroes become portals (and only with cabn
   0.2.0+). skid-case-study is already live.

## License

MIT — see `LICENSE`.

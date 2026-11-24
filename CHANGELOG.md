# Changelog

## 2026-11-23 (font licences ship with the fonts)

- Every font the blog posts self-host now ships its OFL licence: the build copies the licence
  file beside each font under `src/` to `dist/assets/fonts/<Family>-OFL.txt` (e.g.
  `/assets/fonts/Bungee-OFL.txt`, `/assets/fonts/BarlowCondensed-OFL.txt`), next to the existing
  `DotGothic16-OFL.txt`. A font under `src/` with no licence beside it fails the build, and the
  postbuild check fails if any font family in `dist/` lacks its licence.

## 2026-11-23 (fan-sentiment post published)

- The fan-sentiment write-up replaces the draft placeholder at `/blog/fan-sentiment/`: it is
  listed on `/blog/`, in the Atom feed and the sitemap, and is no longer `noindex`.

## 2026-11-23 (fan-sentiment post: replay arrow and phone warnings)

- Replay review: the blinking arrow now finishes at full opacity instead of a quarter.
- Phones no longer log GSAP "target not found" warnings for the first-inning names and pitch
  labels they don't draw.

## 2026-11-23 (fan-sentiment post: marquee title)

- The page title is now an original ballpark marquee: a red sign with a cream trim and a ring of
  bulbs, drawn flat in the post's arcade style. On load the sign snaps open, the bulbs flicker on
  dim, the letters flip up one by one, the bulbs chase round the frame and the sign settles fully
  lit. Reduced motion shows the lit sign. Screen readers get the title as one string.
- Phones tighten the space above the sign so the batter stays on the first screen.

## 2026-11-23 (fan-sentiment post: every scene scrubs, phones included)

- Every animation now moves with the scroll instead of playing once: section heads, the opener's
  hit, the two-team bounce, the scorebugs, and all four big scenes (pitch, hitting, league,
  replay review), which pin while they scrub. Phones pin and scrub the same way; a scene too tall
  for the screen, or any scene on a short landscape screen, scrubs in place instead. The page
  title is the one exception: it is on screen before any scroll, so it still plays in on load,
  and the opener's batter waits for the first scroll with the "Scroll for the season" cue showing.
- Phones show the full section copy again; the three-line "Read more" toggle is gone.
- Scenes redraw their players and ball through property setters (`driven` in `kit/motion.ts`)
  rather than onUpdate callbacks, so a fast scroll or a refresh can no longer leave a ball or a
  swing out of step with the scroll position.
- Reduced motion still shows every scene's finished picture with nothing pinned.

## 2026-11-23 (fan-sentiment post: signature moments and mobile)

- Hitting: the two at-bats pin and scrub, so the ball draws each arc as you scroll, and it lands
  in a puff of infield dirt. League: the scoreboard hangs over the field and counts the 217
  fanbase tests as their balls land. Replay review: a replay booth, where the camera pushes in,
  the zone rewinds from the first test's "nothing" to the rebuilt one with ghost frames, the call
  is framed in chalk corners, and the camera pulls back.
- Which scenes pin and scrub is one switch per scene (`SCRUBBED` in `kit/motion.ts`); pitch and
  hitting are on, league and review play once.
- The fielder's catching arm now bends out in front of his face instead of across it.
- Phones show section copy as three lines with a "Read more" toggle (the full text stays in the
  page for screen readers), with tighter spacing and a smaller inning numeral.
- Fixes: pinned scenes no longer overlap the content after them (triggers re-measure when the web
  fonts land and whenever a section re-lays out), and scorebug numerals can no longer stick
  mid-count when a scrubbed timeline jumps.

## 2026-11-23 (fan-sentiment post: arcade players and motion pass)

- Players are now original arcade-style pixel sprites (`FIGURE_STYLE = "arcade"`, the new
  default): big-headed batter in a helmet, fielder in a cap, inked outlines, team colours from the
  post's palette. The swing plays four drawn frames (stance, load, whip, contact) and the fielder
  switches from a waiting glove to a reach for the catch. Same pivot, contact point and glove
  pocket as before; "simple" and "full" remain and `dev/figures.html` shows all three.
- Motion pass: balls fly with a trail, a ground shadow that shrinks with height, and squash and
  stretch on contact and landing. The pre-registered test scene pins and scrubs with the scroll
  on roomy screens (plays once on phones). Scorebugs are one dark strip whose numerals count up
  and pop in. Reduced motion still shows the finished picture.
- Layout: section heads set the title and copy side by side on wide screens, with a hollow
  inning numeral drifting behind (parallax); scenes sit on a full-width turf band; the opener is
  a full-screen ballpark (crowd, light towers, outfield wall, parallax) with a two-hop grounder;
  the last two innings fade to night. Data tables stay behind their toggles.

## 2026-11-23 (error responses)

- 404s and other error responses now carry the same security headers as
  every other response (CSP, HSTS, X-Frame-Options, Referrer-Policy,
  Permissions-Policy, nosniff) and no longer send `Server: Caddy`. Before,
  Caddy dropped the whole header block on errors, on the live site too.
- An unknown blog URL such as `/blog/no-such-post/` returns a real 404 while
  still showing the blog's not-found page, instead of a 200 that search
  engines could index.
- `pnpm check:caddy` asserts both, and now runs in the `browser-smoke` CI job.

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
- New `browser-smoke` CI job: one Playwright spec walks map → blog → post on
  the production build and fails on a CSP violation, a console error or an
  engine chunk loading on a blog page.
- New `pnpm check:caddy`: runs the real `Caddyfile` under the pinned Caddy
  image against `dist/` and checks routing and headers. It caught the first
  version of the blog rule turning every missing file into the app shell.
- Needs `@cabn/blog` 0.1.0 on npm; until then `pnpm-lock.yaml` has no entry
  for it and `pnpm install --frozen-lockfile` fails. Local work uses
  `pnpm engine:link`, which now links `@cabn/blog` as well.

## 2026-11-22 (fan-sentiment post)

- New post in `src/blog/fan-sentiment/`, in the shape the blog module (`@cabn/blog`, on
  `feat/cabn-blog`) loads: the folder's default export is the post and every CSS selector sits
  under `.post-fan-sentiment`. Eight sections on a mown-grass field in chalk white and clay red
  (opener, question, two teams, the pre-registered test, hitting, every fanbase, replay review,
  final), with small vector players. Charts are the play itself: a batter swings and the ball's
  flight ends where the effect is; the league test is a fly ball caught on zero. Hand-built SVG
  on `d3-scale`; GSAP ScrollTrigger plays each animation once as its section scrolls in, and
  reduced motion shows the finished picture. Every chart has a data table.
- Data is a copy of fansent's aggregate-only snapshot (including the 217 per-fanbase tests); a
  test validates it and rejects a copy carrying free text. All reader-facing text sits in
  `copy.ts`, marked as a draft for the owner.
- Fonts: Bungee and Barlow Condensed, self-hosted under the SIL Open Font License (licence files
  beside them). GSAP is under Webflow's no-charge standard licence.
- Optional fuller drawing of the players (shaped torso, shoes, face, tapered bat, mitt) behind
  `FIGURE_STYLE` in `kit/Figures.tsx`; the default stays "simple". `dev/figures.html` shows both.
- A dev-only page (`dev/fan-sentiment.html`, not a build input) mounts the post for previews.
  This branch does not touch `App.tsx`, the router or the Caddyfile.
- The fansent world no longer has a hero site: its GitHub Pages page is being retired, and
  worlds link to posts by plain navigation.

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

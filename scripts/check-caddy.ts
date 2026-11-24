#!/usr/bin/env node
// Serves dist/ with the real Caddyfile under the same pinned Caddy image the
// Dockerfile ships, and checks routing and headers over HTTP. Needs Docker
// and a finished `pnpm build`. Usage: pnpm check:caddy
// The rest of the suite never runs Caddy, so this is the only check of the
// Caddyfile's own logic: SPA rewrites, the blog's file-or-shell fallback,
// the security headers and the cache classes, on error responses as well.
import { spawnSync } from "node:child_process";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { headerCsp, loadEmbedOrigins } from "../csp-policy.ts";
import { blog } from "../src/blog/posts.ts";
import { renderCaddyfile } from "./render-caddyfile.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const port = Number(process.env.SF_CADDY_PORT ?? 4392);

const image = /^FROM (caddy:\S+) AS runtime$/m.exec(
	readFileSync(join(root, "Dockerfile"), "utf8"),
)?.[1];
if (!image) throw new Error("Dockerfile has no `FROM caddy:… AS runtime` line");

const csp = headerCsp(loadEmbedOrigins(join(dist, "worlds/manifest.json")));
const work = mkdtempSync(join(tmpdir(), "sf-caddy-"));
const caddyfile = join(work, "Caddyfile");
writeFileSync(
	caddyfile,
	renderCaddyfile(readFileSync(join(root, "Caddyfile"), "utf8"), csp),
);

function docker(args: string[]): string {
	const result = spawnSync("docker", args, { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`docker ${args[0]} failed: ${result.stderr.trim()}`);
	}
	return result.stdout.trim();
}

const failures: string[] = [];
let passed = 0;
function check(name: string, ok: boolean, detail = ""): void {
	if (ok) passed++;
	else failures.push(detail ? `${name}: ${detail}` : name);
}

const SHELL_TITLE = "<title>Sebastian Frazier</title>";
type Cache = "no-cache" | "immutable" | "worlds";
const CACHE: Record<Cache, string> = {
	"no-cache": "no-cache",
	immutable: "public, max-age=31536000, immutable",
	worlds: "public, max-age=300, must-revalidate",
};

let referencePermissions: string | null | undefined;
async function expectPage(
	path: string,
	want: {
		status?: number;
		contains?: string[];
		lacks?: string[];
		cache?: Cache;
	},
): Promise<void> {
	const response = await fetch(`http://127.0.0.1:${port}${path}`, {
		redirect: "manual",
	});
	const body = await response.text();
	const status = want.status ?? 200;
	check(
		`${path} status`,
		response.status === status,
		`${response.status}, wanted ${status}`,
	);
	for (const text of want.contains ?? []) {
		check(`${path} contains ${text}`, body.includes(text));
	}
	for (const text of want.lacks ?? []) {
		check(`${path} lacks ${text}`, !body.includes(text));
	}
	const headers: [string, string | null][] = [
		["content-security-policy", csp],
		["x-content-type-options", "nosniff"],
		["x-frame-options", "DENY"],
		["referrer-policy", "no-referrer"],
		["strict-transport-security", "max-age=31536000"],
		["server", null],
		["cache-control", CACHE[want.cache ?? "no-cache"]],
	];
	for (const [name, value] of headers) {
		const got = response.headers.get(name);
		check(`${path} ${name}`, got === value, `${JSON.stringify(got)}`);
	}
	const permissions = response.headers.get("permissions-policy");
	check(
		`${path} permissions-policy`,
		(permissions ?? "").includes("camera=()"),
		JSON.stringify(permissions),
	);
	// Error responses come from handle_errors, not the site block: the same
	// Permissions-Policy as the home page shows they import the same set.
	referencePermissions ??= permissions;
	check(
		`${path} permissions-policy matches /`,
		permissions === referencePermissions,
		JSON.stringify(permissions),
	);
}

const container = docker([
	"run",
	"--rm",
	"--detach",
	"--user",
	"65534:65534",
	"--env",
	"XDG_CONFIG_HOME=/tmp/caddy-config",
	"--env",
	"XDG_DATA_HOME=/tmp/caddy-data",
	"--publish",
	`127.0.0.1:${port}:8080`,
	"--volume",
	`${dist}:/srv:ro`,
	"--volume",
	`${caddyfile}:/etc/caddy/Caddyfile:ro`,
	image,
	"caddy",
	"run",
	"--config",
	"/etc/caddy/Caddyfile",
	"--adapter",
	"caddyfile",
]);

try {
	let up = false;
	for (let attempt = 0; attempt < 50 && !up; attempt++) {
		up = await fetch(`http://127.0.0.1:${port}/`).then(
			() => true,
			() => false,
		);
		if (!up) await new Promise((resolve) => setTimeout(resolve, 200));
	}
	if (!up) {
		throw new Error(`Caddy did not answer:\n${docker(["logs", container])}`);
	}

	const blogTitle = `<title>${blog.title}</title>`;
	const base = blog.basePath;

	await expectPage("/", { contains: [SHELL_TITLE, 'id="root"'] });
	for (const path of ["/play", "/play/", "/play?world=cabn"]) {
		await expectPage(path, { contains: [SHELL_TITLE, 'id="root"'] });
	}

	// With and without the trailing slash: both must be the built page, not
	// a redirect and not the bare shell.
	for (const path of [base, `${base}/`]) {
		await expectPage(path, {
			contains: [
				blogTitle,
				`<link rel="canonical" href="${blog.siteUrl}${base}/" />`,
			],
		});
	}
	for (const post of [...blog.posts, ...blog.drafts]) {
		for (const path of [`${base}/${post.slug}`, `${base}/${post.slug}/`]) {
			await expectPage(path, {
				contains: [
					`<link rel="canonical" href="${blog.siteUrl}${base}/${post.slug}/" />`,
					'property="og:title"',
				],
			});
		}
	}
	// No file for it: a real 404 whose body is still the shell, so the app
	// renders the blog's not-found view and crawlers do not index the URL.
	for (const path of [
		`${base}/no-such-post/`,
		`${base}/no-such-post`,
		`${base}/a/b/c`,
	]) {
		await expectPage(path, {
			status: 404,
			contains: [SHELL_TITLE, 'id="root"'],
			lacks: ['rel="canonical"'],
		});
	}
	await expectPage(`${base}/feed.xml`, { contains: ["<feed xmlns="] });
	await expectPage(`${base}/sitemap.xml`, { contains: ["<urlset"] });

	await expectPage("/worlds/shelf.json", {
		contains: ['"worlds"'],
		cache: "worlds",
	});
	await expectPage("/favicon.svg", { contains: ["<svg"] });
	const hashed = readdirSync(join(dist, "assets")).find((name) =>
		/^index-[A-Za-z0-9_-]{8}\.js$/.test(name),
	);
	if (!hashed) throw new Error("dist/assets has no hashed index chunk");
	await expectPage(`/assets/${hashed}`, { cache: "immutable" });
	const licences = readdirSync(join(dist, "assets", "fonts")).filter((name) =>
		name.endsWith(".txt"),
	);
	if (licences.length === 0)
		throw new Error("dist/assets/fonts has no licences");
	for (const name of licences) {
		await expectPage(`/assets/fonts/${name}`, {
			contains: name.endsWith("-OFL.txt") ? ["SIL OPEN FONT LICENSE"] : [],
		});
	}

	// Outside the SPA routes and the blog, a missing file is a bare 404. Error
	// responses go through handle_errors, which must repeat the header set.
	await expectPage("/resume", { status: 404, lacks: ["<html"] });
	await expectPage("/no-such-file.js", { status: 404, lacks: ["<html"] });
	await expectPage("/assets/nope-AAAAAAAA.js", { status: 404 });
	await expectPage("/worlds/nope/world.json", { status: 404 });
} finally {
	spawnSync("docker", ["stop", container], { encoding: "utf8" });
	rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	console.error(`caddy checks: ${failures.length} failed, ${passed} passed`);
	process.exit(1);
}
console.log(`caddy checks passed (${passed}) on ${image.split("@")[0]}`);

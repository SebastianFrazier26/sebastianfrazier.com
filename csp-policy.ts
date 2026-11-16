// The site's Content-Security-Policy, one source for both the <meta> tag
// vite.config.ts injects into the built index.html and the response header
// Caddy sends (scripts/render-caddyfile.ts). Adapted from cabn's
// apps/demo/csp-policy.mjs; the differences are deliberate:
// - frame-src is the union of the built worlds' allowedEmbedOrigins (read
//   from public/worlds/manifest.json), not a hand-kept list.
// - connect-src has no model-provider origins: the hosted worlds run with
//   pets disabled, so nothing here should talk to an LLM API.
import { readFileSync } from "node:fs";

const HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+(:\d+)?$/;

export function cspDirectives(
	embedOrigins: readonly string[],
): Record<string, string[]> {
	for (const origin of embedOrigins) {
		// The policy ends up inside a quoted Caddyfile token and a meta
		// attribute; anything but a bare https origin is refused here.
		if (!HTTPS_ORIGIN.test(origin)) {
			throw new Error(`not a bare https origin: ${origin}`);
		}
	}
	const frames = [...new Set(embedOrigins)].sort();
	return {
		"default-src": ["'self'"],
		"script-src": ["'self'"],
		// The engine injects <style> elements at runtime and a bundled
		// viewport helper sets a style attribute. Nonces would need a
		// per-response server.
		"style-src": ["'self'", "'unsafe-inline'"],
		// data: for Phaser's base64 textures, blob: for textures and media the
		// engine loads through object URLs.
		"img-src": ["'self'", "data:", "blob:"],
		"media-src": ["'self'", "blob:"],
		// The engine ships its pixel font as a data: URI.
		"font-src": ["'self'", "data:"],
		// blob: is how the engine fetches files of an in-browser world.
		"connect-src": ["'self'", "blob:"],
		"worker-src": ["'self'"],
		"frame-src": frames.length ? frames : ["'none'"],
		"base-uri": ["'none'"],
		"object-src": ["'none'"],
		"form-action": ["'none'"],
	};
}

export function cspString(directives: Record<string, string[]>): string {
	return Object.entries(directives)
		.map(([name, values]) => `${name} ${values.join(" ")}`)
		.join("; ");
}

/** For the <meta> tag, which browsers ignore frame-ancestors in. */
export function metaCsp(embedOrigins: readonly string[]): string {
	return cspString(cspDirectives(embedOrigins));
}

/** For the response header: the site itself is never framed by anyone. */
export function headerCsp(embedOrigins: readonly string[]): string {
	return `${metaCsp(embedOrigins)}; frame-ancestors 'none'`;
}

/**
 * The origins from a built public/worlds/manifest.json. Missing means no
 * worlds were built, which is an error for a production build: a site that
 * silently shipped frame-src 'none' would break every hero portal.
 */
export function loadEmbedOrigins(manifestPath: string | URL): string[] {
	let raw: string;
	try {
		raw = readFileSync(manifestPath, "utf8");
	} catch {
		throw new Error(
			`${manifestPath} not found — run \`pnpm build:worlds\` (or \`pnpm build:fixture\`) first`,
		);
	}
	const json = JSON.parse(raw) as { embedOrigins?: unknown };
	if (
		!Array.isArray(json.embedOrigins) ||
		!json.embedOrigins.every((o) => typeof o === "string")
	) {
		throw new Error(`${manifestPath}: embedOrigins missing or malformed`);
	}
	return json.embedOrigins;
}

import { describe, expect, it } from "vitest";
import { cspDirectives, headerCsp, metaCsp } from "../csp-policy.ts";
import { collectEmbedOrigins } from "../scripts/lib/cabnAdapter.ts";
import { renderCaddyfile } from "../scripts/render-caddyfile.ts";

describe("CSP", () => {
	it("frames exactly the union of the worlds' embed origins", () => {
		const origins = collectEmbedOrigins([
			{ allowedEmbedOrigins: ["https://b.dev", "https://a.dev"] },
			{ allowedEmbedOrigins: ["https://a.dev"] },
			{},
		]);
		expect(origins).toEqual(["https://a.dev", "https://b.dev"]);
		expect(cspDirectives(origins)["frame-src"]).toEqual([
			"https://a.dev",
			"https://b.dev",
		]);
	});

	it("frames nothing when no world embeds anything", () => {
		expect(cspDirectives([])["frame-src"]).toEqual(["'none'"]);
	});

	it("allows no scripts but its own and no model-provider connections", () => {
		const d = cspDirectives(["https://a.dev"]);
		expect(d["script-src"]).toEqual(["'self'"]);
		expect(d["connect-src"]).toEqual(["'self'", "blob:"]);
	});

	it("forbids framing the site only in the header (meta can't carry it)", () => {
		expect(headerCsp([])).toMatch(/; frame-ancestors 'none'$/);
		expect(metaCsp([])).not.toContain("frame-ancestors");
	});

	it.each([
		"http://a.dev",
		"https://a.dev/path",
		'https://a.dev" x',
		"https://*.a.dev",
	])("refuses %s as an origin", (bad) => {
		expect(() => cspDirectives([bad])).toThrow(/bare https origin/);
	});

	it("renders into the Caddyfile once, rejecting a broken template", () => {
		const csp = headerCsp(["https://a.dev"]);
		expect(renderCaddyfile('h "__SF_CSP__"', csp)).toBe(`h "${csp}"`);
		expect(() => renderCaddyfile("no placeholder", csp)).toThrow(
			/exactly once/,
		);
	});
});

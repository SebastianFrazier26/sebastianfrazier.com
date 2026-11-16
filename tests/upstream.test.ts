import { describe, expect, it } from "vitest";
import type { DeployManifest } from "../scripts/lib/manifest.ts";
import {
	type CurrentState,
	diffUpstream,
	describe as summarize,
} from "../scripts/lib/upstream.ts";

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);
const SITE = "5".repeat(40);

function live(
	projects: Record<string, string>,
	patch: Partial<DeployManifest> = {},
) {
	const manifest: DeployManifest = {
		manifestVersion: 1,
		generatedAt: "2026-10-22T00:00:00.000Z",
		fixture: false,
		siteSha: SITE,
		engine: { cliVersion: "0.1.0", showcase: false },
		embedOrigins: [],
		projects: Object.entries(projects).map(([id, sha]) => ({
			id,
			repo: `o/${id}`,
			ref: "main",
			sha,
			worldDir: `worlds/${id}`,
		})),
		...patch,
	};
	return { kind: "ok" as const, manifest };
}

function now(
	projects: Record<string, string>,
	patch: Partial<CurrentState> = {},
): CurrentState {
	return {
		projects: new Map(Object.entries(projects)),
		siteSha: SITE,
		cliVersion: "0.1.0",
		...patch,
	};
}

describe("diffUpstream", () => {
	it("is unchanged when every SHA, the site commit and cabn match", () => {
		const diff = diffUpstream(now({ x: A, y: B }), live({ x: A, y: B }));
		expect(diff).toEqual({
			changed: false,
			global: null,
			warning: null,
			reasons: [],
		});
		expect(summarize(diff)).toBe("up to date");
	});

	it("reports a moved upstream branch", () => {
		const diff = diffUpstream(now({ x: C }), live({ x: A }));
		expect(diff.changed).toBe(true);
		expect(diff.reasons).toEqual([
			{ id: "x", kind: "updated", from: A, to: C },
		]);
		expect(summarize(diff)).toBe("x: aaaaaaa -> ccccccc");
	});

	it("reports newly enabled and removed projects", () => {
		const diff = diffUpstream(now({ new: A }), live({ gone: B }));
		expect(diff.reasons).toEqual([
			{ id: "new", kind: "new", sha: A },
			{ id: "gone", kind: "removed" },
		]);
	});

	it("rebuilds when a site commit never got deployed (e.g. a replaced push run)", () => {
		const diff = diffUpstream(now({ x: A }, { siteSha: C }), live({ x: A }));
		expect(diff).toMatchObject({
			changed: true,
			global: expect.stringContaining("main is ccccccc"),
		});
	});

	it("ignores the site commit when it is unknown", () => {
		expect(
			diffUpstream(now({ x: A }, { siteSha: "unknown" }), live({ x: A }))
				.changed,
		).toBe(false);
	});

	it("rebuilds when the installed cabn differs from the live one", () => {
		const diff = diffUpstream(
			now({ x: A }, { cliVersion: "0.2.0" }),
			live({ x: A }),
		);
		expect(diff).toMatchObject({
			changed: true,
			global: "cabn 0.1.0 is live, 0.2.0 is installed",
		});
	});

	it("rebuilds when nothing is deployed yet (404)", () => {
		expect(diffUpstream(now({ x: A }), { kind: "missing" })).toMatchObject({
			changed: true,
			global: "nothing deployed yet",
		});
	});

	it("skips with a warning when the live manifest is unreadable", () => {
		const diff = diffUpstream(now({ x: A }), {
			kind: "unreadable",
			reason: "HTTP 502",
		});
		expect(diff.changed).toBe(false);
		expect(diff.warning).toContain("HTTP 502");
		expect(summarize(diff)).toContain("skipping");
	});

	it("rebuilds over a fixture deploy even with matching SHAs", () => {
		expect(diffUpstream(now({}), live({}, { fixture: true })).changed).toBe(
			true,
		);
	});
});

import { describe, expect, it } from "vitest";
import type { DeployManifest } from "../scripts/lib/manifest.ts";
import {
	diffUpstream,
	describe as summarize,
} from "../scripts/lib/upstream.ts";

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);

function deployed(
	projects: Record<string, string>,
	fixture = false,
): DeployManifest {
	return {
		manifestVersion: 1,
		generatedAt: "2026-10-22T00:00:00.000Z",
		fixture,
		engine: { cliVersion: "0.1.0", showcase: false },
		embedOrigins: [],
		projects: Object.entries(projects).map(([id, sha]) => ({
			id,
			repo: `o/${id}`,
			ref: "main",
			sha,
			worldDir: `worlds/${id}`,
		})),
	};
}

describe("diffUpstream", () => {
	it("is unchanged when every SHA matches", () => {
		const diff = diffUpstream(
			new Map([
				["x", A],
				["y", B],
			]),
			deployed({ x: A, y: B }),
		);
		expect(diff).toEqual({ changed: false, global: null, reasons: [] });
		expect(summarize(diff)).toBe("up to date");
	});

	it("reports a moved main", () => {
		const diff = diffUpstream(new Map([["x", C]]), deployed({ x: A }));
		expect(diff.changed).toBe(true);
		expect(diff.reasons).toEqual([
			{ id: "x", kind: "updated", from: A, to: C },
		]);
		expect(summarize(diff)).toBe("x: aaaaaaa -> ccccccc");
	});

	it("reports newly enabled and removed projects", () => {
		const diff = diffUpstream(new Map([["new", A]]), deployed({ gone: B }));
		expect(diff.reasons).toEqual([
			{ id: "new", kind: "new", sha: A },
			{ id: "gone", kind: "removed" },
		]);
	});

	it("rebuilds when the live manifest is missing", () => {
		expect(diffUpstream(new Map([["x", A]]), null)).toMatchObject({
			changed: true,
			global: "no deployed manifest",
		});
	});

	it("rebuilds over a fixture deploy even with matching SHAs", () => {
		expect(diffUpstream(new Map(), deployed({}, true)).changed).toBe(true);
	});
});

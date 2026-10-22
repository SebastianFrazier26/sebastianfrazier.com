import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanWorld } from "../scripts/lib/leaks.ts";

let dir: string;
afterEach(async () => {
	if (dir) await rm(dir, { recursive: true, force: true });
});

async function world(files: Record<string, string>): Promise<string> {
	dir = await mkdtemp(join(tmpdir(), "leak-test-"));
	for (const [path, content] of Object.entries(files)) {
		await mkdir(join(dir, path, ".."), { recursive: true });
		await writeFile(join(dir, path), content);
	}
	return dir;
}

describe("scanWorld", () => {
	it("passes a clean world", async () => {
		const d = await world({
			"world.json": '{"meta":{"source":"github:o/r@abc"}}',
		});
		expect(
			await scanWorld(d, {
				forbidden: ["/tmp/build-1"],
				excluded: ["data/x.csv"],
			}),
		).toEqual({
			errors: [],
			warnings: [],
		});
	});

	it("flags a build path anywhere in shipped text", async () => {
		const d = await world({ "chunks/a.json": '{"p":"/tmp/build-1/src/a.ts"}' });
		const r = await scanWorld(d, { forbidden: ["/tmp/build-1"], excluded: [] });
		expect(r.errors).toEqual([
			"chunks/a.json: contains build path /tmp/build-1",
		]);
	});

	it("flags an excluded path as a JSON value or key", async () => {
		const d = await world({
			"world.json": '{"portals":[{"id":"data/x.csv"}]}',
			"search-index.json": '{"data/x.csv":1}',
		});
		const r = await scanWorld(d, { forbidden: [], excluded: ["data/x.csv"] });
		expect(r.errors).toHaveLength(2);
	});

	it("only warns about the home directory", async () => {
		const d = await world({ "README.md": "see /Users/someone/notes" });
		const r = await scanWorld(d, {
			forbidden: [],
			soft: ["/Users/someone"],
			excluded: [],
		});
		expect(r.errors).toEqual([]);
		expect(r.warnings).toHaveLength(1);
	});
});

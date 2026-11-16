import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanText, scanTree } from "../scripts/lib/secrets.ts";

// Built by concatenation so this file itself doesn't trip scanners.
const AWS = `AKIA${"ABCDEFGHIJKLMNOP"}`;
const GH = `ghp_${"a".repeat(36)}`;

describe("secret scan", () => {
	it.each([
		["aws-access-key", `key = ${AWS}`],
		["github-token", `token: ${GH}`],
		["private-key", `-----BEGIN RSA ${"PRIVATE"} KEY-----`],
		["url-credentials", "DATABASE_URL=postgres://app:hunter22@db.internal/app"],
		["password-assignment", `{ password: "${"correcthorse"}" }`],
	])("flags %s", (rule, line) => {
		expect(scanText("f", line).map((h) => h.rule)).toContain(rule);
	});

	it.each([
		"const password = process.env.PASSWORD;",
		"see https://example.com/docs",
		"skeleton-key is a monster name",
	])("does not flag %s", (line) => {
		expect(scanText("f", line)).toEqual([]);
	});

	it("reports file and line, never the value", async () => {
		const dir = await mkdtemp(join(tmpdir(), "secret-test-"));
		try {
			await mkdir(join(dir, "src"));
			await writeFile(
				join(dir, "src", "seed.js"),
				`// seed\nconst u = { password: "${"famgo-pass"}" };\n`,
			);
			await writeFile(join(dir, "img.bin"), Buffer.from([0, 1, 2]));
			const hits = await scanTree(dir);
			expect(hits).toEqual([
				{ file: "src/seed.js", line: 2, rule: "password-assignment" },
			]);
			expect(JSON.stringify(hits)).not.toContain("famgo-pass");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});

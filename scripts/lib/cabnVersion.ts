import { readFileSync } from "node:fs";

/** The installed @cabn/cli version, read without loading the package (upstream-changed needs only this). */
export function installedCliVersion(): string {
	// The package exports only its entry point, so package.json is found beside dist/.
	const pkgUrl = new URL("../package.json", import.meta.resolve("@cabn/cli"));
	return (JSON.parse(readFileSync(pkgUrl, "utf8")) as { version: string })
		.version;
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * The commit of this site repo a build came from: GITHUB_SHA in Actions,
 * else the local HEAD, else "unknown" (a tarball checkout). Recorded in the
 * deploy manifest so the scheduled check can tell a site change that never
 * got deployed from one that did.
 */
export async function siteSha(): Promise<string> {
	const env = process.env.GITHUB_SHA?.trim();
	if (env && /^[0-9a-f]{40}$/.test(env)) return env;
	try {
		const { stdout } = await promisify(execFile)("git", ["rev-parse", "HEAD"], {
			cwd: new URL("../..", import.meta.url),
			timeout: 10_000,
		});
		const sha = stdout.trim();
		return /^[0-9a-f]{40}$/.test(sha) ? sha : "unknown";
	} catch {
		return "unknown";
	}
}

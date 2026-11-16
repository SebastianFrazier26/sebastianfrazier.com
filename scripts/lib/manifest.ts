import { z } from "zod";

export const DEPLOY_MANIFEST_VERSION = 1;

export const DeployedProjectSchema = z.strictObject({
	id: z.string(),
	/** null for a private project: this file is served publicly. */
	repo: z.string().nullable(),
	ref: z.string(),
	sha: z.string().regex(/^[0-9a-f]{40}$/),
	worldDir: z.string(),
});
export type DeployedProject = z.infer<typeof DeployedProjectSchema>;

/** public/worlds/manifest.json: what the deployed site was built from. Served publicly, so it holds nothing a visitor couldn't read on GitHub. */
export const DeployManifestSchema = z.strictObject({
	manifestVersion: z.literal(DEPLOY_MANIFEST_VERSION),
	generatedAt: z.iso.datetime(),
	fixture: z.boolean(),
	/** The site repo commit this deploy was built from (see siteSha.ts). */
	siteSha: z.union([z.string().regex(/^[0-9a-f]{40}$/), z.literal("unknown")]),
	engine: z.strictObject({ cliVersion: z.string(), showcase: z.boolean() }),
	/** Union of every world's allowedEmbedOrigins: the CSP frame-src. */
	embedOrigins: z.array(z.url({ protocol: /^https$/ })),
	projects: z.array(DeployedProjectSchema),
});
export type DeployManifest = z.infer<typeof DeployManifestSchema>;

export function parseDeployManifest(json: unknown): DeployManifest {
	return DeployManifestSchema.parse(json);
}

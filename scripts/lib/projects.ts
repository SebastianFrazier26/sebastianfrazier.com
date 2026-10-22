import { readFile } from "node:fs/promises";
import { z } from "zod";

const HttpsUrl = z.url({ protocol: /^https$/ });

const LinkSchema = z.strictObject({
	label: z.string().min(1).max(60),
	url: HttpsUrl,
});

// gitignore-style patterns over repo-relative POSIX paths (see excludes.ts):
// a leading "/" anchors to the repo root. Anything that could climb out of
// the extract is a config error, not a no-op.
const ExcludeGlob = z
	.string()
	.min(1)
	.refine(
		(g) => g !== "/" && !g.startsWith("//") && !g.split("/").includes(".."),
		{
			message: "must be a repo-relative pattern, without '..'",
		},
	);

// Branch names only: a tag or SHA would never move, so the scheduled
// upstream check (refs/heads/<ref>) could not see it change.
const BranchName = z
	.string()
	.regex(/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/, "must be a branch name")
	.refine(
		(r) =>
			!r.startsWith("refs/") &&
			!r.includes("..") &&
			!r.endsWith(".lock") &&
			!/^[0-9a-f]{40}$/.test(r),
		"must be a branch name, not a ref path, tag-like or SHA",
	);

export const HeroSchema = z.strictObject({
	url: HttpsUrl,
	/** "pending" until the project's GitHub Pages site is actually live; only live heroes become site portals. */
	status: z.enum(["live", "pending"]),
});

export const ProjectSchema = z
	.strictObject({
		/** Slug: becomes public/worlds/<id>/ and the cabn site-portal id. */
		id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
		name: z
			.string()
			.min(1)
			.max(200)
			.refine((n) => !/[/\\]/.test(n), "no path separators"),
		repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/),
		ref: BranchName,
		visibility: z.enum(["public", "private"]),
		enabled: z.boolean(),
		description: z.string().min(1).max(500),
		links: z.array(LinkSchema).max(8),
		excludes: z.array(ExcludeGlob),
		/** Literal false: shipping git history would publish commit emails and everything ever deleted. */
		history: z.literal(false),
		hero: HeroSchema.nullable(),
		order: z.number().int(),
	})
	.refine((p) => p.visibility === "public" || !p.enabled || p.hero === null, {
		message: "a private project cannot advertise a hero site",
		path: ["hero"],
	});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectsFileSchema = z
	.strictObject({
		$comment: z.string().optional(),
		shelfName: z.string().min(1).max(100),
		defaultExcludes: z.array(ExcludeGlob),
		projects: z.array(ProjectSchema).min(1),
	})
	.superRefine((file, ctx) => {
		const seen = new Set<string>();
		for (const [i, p] of file.projects.entries()) {
			if (seen.has(p.id)) {
				ctx.addIssue({
					code: "custom",
					message: `duplicate project id "${p.id}"`,
					path: ["projects", i, "id"],
				});
			}
			seen.add(p.id);
		}
	});
export type ProjectsFile = z.infer<typeof ProjectsFileSchema>;

export function parseProjects(json: unknown): ProjectsFile {
	const result = ProjectsFileSchema.safeParse(json);
	if (!result.success) {
		throw new Error(`Invalid projects.json:\n${z.prettifyError(result.error)}`);
	}
	return result.data;
}

export async function loadProjects(
	path = new URL("../../projects.json", import.meta.url),
): Promise<ProjectsFile> {
	return parseProjects(JSON.parse(await readFile(path, "utf8")));
}

export function enabledProjects(file: ProjectsFile): Project[] {
	return file.projects
		.filter((p) => p.enabled)
		.sort((a, b) => a.order - b.order);
}

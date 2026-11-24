import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { loadEmbedOrigins, metaCsp } from "./csp-policy.ts";
import { FONT_FILE, licenceFor } from "./scripts/lib/fontLicences.ts";

const CHARSET_META = '<meta charset="UTF-8" />';

// Build only: in `vite dev`, @vitejs/plugin-react adds an inline module
// script for fast refresh that `script-src 'self'` would block. Placed right
// after the charset tag, because a meta policy only governs what the parser
// meets after it.
function cspMeta(): Plugin {
	return {
		name: "sf-csp",
		apply: "build",
		transformIndexHtml(html) {
			if (!html.includes(CHARSET_META)) {
				throw new Error(
					`index.html lost its ${CHARSET_META} anchor for the CSP`,
				);
			}
			const csp = metaCsp(
				loadEmbedOrigins(
					new URL("./public/worlds/manifest.json", import.meta.url),
				),
			);
			const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;
			return html.replace(CHARSET_META, `${CHARSET_META}\n\t\t${meta}`);
		},
	};
}

// The OFL requires the licence to travel with the font. Only fonts from src/
// are ours to pair: a package's font is its own to license (DotGothic16's
// comes from scripts/copy-engine-assets.ts).
function fontLicences(): Plugin {
	const root = fileURLToPath(new URL(".", import.meta.url));
	return {
		name: "sf-font-licences",
		apply: "build",
		generateBundle(_options, bundle) {
			const emitted = new Map<string, string>();
			for (const asset of Object.values(bundle)) {
				if (asset.type !== "asset" || !FONT_FILE.test(asset.fileName)) continue;
				for (const original of asset.originalFileNames) {
					if (!original.startsWith("src/")) continue;
					const licence = licenceFor(`${root}${original}`);
					if (!licence) {
						this.error(`${original} has no OFL*/LICENSE* file beside it`);
					}
					const source = readFileSync(licence.source, "utf8");
					const already = emitted.get(licence.dest);
					if (already === source) continue;
					if (already !== undefined) {
						this.error(`two different licences would ship as ${licence.dest}`);
					}
					emitted.set(licence.dest, source);
					this.emitFile({ type: "asset", fileName: licence.dest, source });
				}
			}
		},
	};
}

export default defineConfig({
	plugins: [react(), cspMeta(), fontLicences()],
	define: {
		// The site never imports "@cabn/engine/local-exec"; this makes any
		// reference to the flag statically false rather than false by default.
		__CABN_ALLOW_LOCAL_EXEC__: false,
	},
	// A linked engine checkout (pnpm engine:link) resolves React from its
	// own node_modules; two Reacts break hooks, so one copy is forced.
	resolve: { dedupe: ["react", "react-dom"] },
	// The lazily loaded engine chunk is Phaser plus CodeMirror (~2.4 MB); it
	// only downloads once a visitor opens the world door.
	build: { chunkSizeWarningLimit: 3000 },
	preview: { host: "127.0.0.1" },
	server: { host: "127.0.0.1" },
});

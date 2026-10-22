import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { loadEmbedOrigins, metaCsp } from "./csp-policy.ts";

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

export default defineConfig({
	plugins: [react(), cspMeta()],
	define: {
		// The site never imports "@cabn/engine/local-exec"; this makes any
		// reference to the flag statically false rather than false by default.
		__CABN_ALLOW_LOCAL_EXEC__: false,
	},
	// The lazily loaded engine chunk is Phaser plus CodeMirror (~2.4 MB); it
	// only downloads once a visitor opens the world door.
	build: { chunkSizeWarningLimit: 3000 },
	preview: { host: "127.0.0.1" },
	server: { host: "127.0.0.1" },
});

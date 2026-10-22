// The browser half of the engine adapter (the build half is
// scripts/lib/cabnAdapter.ts). Lazily imported, so the landing page never
// downloads Phaser.
import {
	CabnGame,
	type CabnGameHandle,
	type CabnGameProps,
} from "@cabn/engine";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export const SHELF_URL = "/worlds/shelf.json";

// `pets` arrived in @cabn/engine 0.2.0; 0.1.0's types don't know it and its
// CabnGame ignores it, so it is passed through a widened prop type. The CSP
// (csp-policy.ts) blocks every model provider either way.
type HostProps = CabnGameProps & { pets?: boolean };

// Same opt-in as cabn's demo: only a page loaded with ?e2e=1 gets the store
// on window, for browser checks of the production bundle. It exposes nothing
// a visitor couldn't already reach in their own devtools.
function exposeTestHook(handle: CabnGameHandle | null): void {
	if (new URLSearchParams(window.location.search).get("e2e") !== "1") return;
	(window as unknown as { __cabnStore: unknown }).__cabnStore =
		handle?.store ?? undefined;
}

export default function CabnWorld(): React.ReactElement {
	const props: HostProps = {
		shelfUrl: SHELF_URL,
		pdfWorkerUrl,
		pets: false,
		onGameReady: exposeTestHook,
	};
	return <CabnGame {...props} />;
}

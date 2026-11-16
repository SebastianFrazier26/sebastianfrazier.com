// The browser half of the engine adapter (the build half is
// scripts/lib/cabnAdapter.ts). Lazily imported, so the landing page never
// downloads Phaser.
import {
	CabnGame,
	type CabnGameHandle,
	type CabnGameProps,
	type CabnGameTarget,
} from "@cabn/engine";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef } from "react";
import { type MapProject, SHELF_URL } from "./mapData.ts";

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

// CabnGame's props only take a shelf or a bare world, and a bare world has no
// way back to the shelf. So a deep link boots the shelf as usual and then
// restarts the engine's boot scene with the same payload ShelfScene itself
// sends when the player walks into a cabin (returnTo + shelfIndex): the
// player lands in the project's world with the normal exit back to the shelf.
// Both pieces (the game handle's Phaser instance, the "boot" scene key and
// its BootSceneData) are public types of @cabn/engine, but the scene key and
// payload are only de facto stable; a 0.2.x engine release that renames them
// lands the visitor on the shelf instead. Asked of cabn: a `startWorld` prop.
function bootInto(handle: CabnGameHandle, project: MapProject): void {
	const target: CabnGameTarget = {
		worldUrl: project.worldUrl,
		returnTo: { shelfUrl: SHELF_URL },
		shelfIndex: project.shelfIndex,
	};
	handle.game.scene.start("boot", target);
}

// Esc on the bare shelf means "back to the map". Anywhere else it belongs to
// the engine (leave a file, close a card, ...), so it is only taken while the
// shelf is the active scene, no file or overlay mode is up, and no dialog is
// open in the game root.
function leavesShelf(event: KeyboardEvent, handle: CabnGameHandle): boolean {
	// Phaser captures Esc and calls preventDefault on every press, so
	// defaultPrevented says nothing about whether an overlay consumed it.
	if (event.key !== "Escape") return false;
	const typing = document.activeElement;
	if (
		typing instanceof HTMLElement &&
		typing.matches("input, textarea, [contenteditable]")
	)
		return false;
	if (!handle.game.scene.isActive("shelf")) return false;
	if (handle.store.getState().mode !== "world") return false;
	return !document.querySelector(
		"[data-testid=cabn-game-root] [role=dialog], [data-testid=cabn-game-root] [aria-modal=true]",
	);
}

interface CabnWorldProps {
	/** The project to open; null boots the shelf (the base world). */
	project: MapProject | null;
	/** Called when the visitor presses Esc on the shelf. */
	onLeave: () => void;
}

export default function CabnWorld({
	project,
	onLeave,
}: CabnWorldProps): React.ReactElement {
	const handleRef = useRef<CabnGameHandle | null>(null);
	const onLeaveRef = useRef(onLeave);
	onLeaveRef.current = onLeave;

	useEffect(() => {
		const onKey = (event: KeyboardEvent): void => {
			const handle = handleRef.current;
			if (handle && leavesShelf(event, handle)) onLeaveRef.current();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const props: HostProps = {
		shelfUrl: SHELF_URL,
		pdfWorkerUrl,
		pets: false,
		onGameReady: (handle) => {
			handleRef.current = handle;
			exposeTestHook(handle);
			if (handle && project) bootInto(handle, project);
		},
	};
	return <CabnGame {...props} />;
}

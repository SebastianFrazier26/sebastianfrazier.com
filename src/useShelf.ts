import { useEffect, useState } from "react";
import { type MapProject, parseShelfProjects, SHELF_URL } from "./mapData.ts";

export type ShelfState =
	| { status: "loading" }
	| { status: "ready"; projects: MapProject[] }
	| { status: "error" };

// The landing page and the ?world= check both read the one public shelf.json;
// fetched once per page load, not once per route change.
let cached: Promise<MapProject[]> | null = null;

function loadShelf(): Promise<MapProject[]> {
	cached ??= fetch(SHELF_URL)
		.then((response) => {
			if (!response.ok) throw new Error(`shelf.json: HTTP ${response.status}`);
			return response.json() as Promise<unknown>;
		})
		.then((json) => {
			const projects = parseShelfProjects(json);
			if (!projects) throw new Error("shelf.json is not a shelf");
			return projects;
		})
		.catch((error: unknown) => {
			cached = null;
			throw error;
		});
	return cached;
}

export function useShelf(enabled = true): ShelfState {
	const [state, setState] = useState<ShelfState>({ status: "loading" });
	useEffect(() => {
		if (!enabled) return;
		let live = true;
		loadShelf().then(
			(projects) => live && setState({ status: "ready", projects }),
			() => live && setState({ status: "error" }),
		);
		return () => {
			live = false;
		};
	}, [enabled]);
	return state;
}

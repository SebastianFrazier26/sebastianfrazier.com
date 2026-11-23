import { lazy, Suspense, useEffect, useState } from "react";
import { MapLanding } from "./MapLanding.tsx";
import { resolveWorld } from "./mapData.ts";
import { parseRoute, type Route } from "./route.ts";
import { useShelf } from "./useShelf.ts";

const CabnWorld = lazy(() => import("./CabnWorld.tsx"));

// Its own chunk: the blog's code and stylesheet reach only blog visitors.
const BlogPage = lazy(() => import("./BlogPage.tsx"));

function readRoute(): Route {
	return parseRoute(window.location.pathname, window.location.search);
}

export function App(): React.ReactElement {
	const [route, setRoute] = useState(readRoute);
	const shelf = useShelf();

	useEffect(() => {
		const sync = (): void => setRoute(readRoute());
		window.addEventListener("popstate", sync);
		return () => window.removeEventListener("popstate", sync);
	}, []);

	const navigate = (path: string): void => {
		window.history.pushState(null, "", path);
		setRoute(readRoute());
		window.scrollTo(0, 0);
	};

	if (route.page === "blog") {
		return (
			<Suspense fallback={<p className="loading">Turning the page…</p>}>
				<BlogPage route={route.route} onNavigate={navigate} />
			</Suspense>
		);
	}
	if (route.page === "map") {
		return <MapLanding shelf={shelf} onNavigate={navigate} />;
	}

	// A deep link waits for the shelf so an unknown id can be told from a slow
	// load; the plain base world does not.
	const waiting = route.world !== null && shelf.status === "loading";
	const project =
		route.world !== null && shelf.status === "ready"
			? resolveWorld(route.world, shelf.projects)
			: null;

	return (
		<div className="game">
			<header className="game-bar">
				<a
					href="/"
					onClick={(event) => {
						if (event.metaKey || event.ctrlKey || event.shiftKey) return;
						event.preventDefault();
						navigate("/");
					}}
				>
					← Map
				</a>
				<span>
					WASD/arrows or click to move · Enter to go in or out · Esc to leave a
					file, or the shelf for the map
				</span>
			</header>
			<div className="game-stage">
				{waiting ? (
					<p className="loading">Lighting the bonfire…</p>
				) : (
					<Suspense fallback={<p className="loading">Lighting the bonfire…</p>}>
						<CabnWorld
							key={project?.slug ?? "shelf"}
							project={project}
							onLeave={() => navigate("/")}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
}

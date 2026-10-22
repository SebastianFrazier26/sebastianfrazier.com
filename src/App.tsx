import { lazy, Suspense, useEffect, useState } from "react";

const CabnWorld = lazy(() => import("./CabnWorld.tsx"));

const PLAY_PATH = "/play";

function onPlayPath(): boolean {
	return window.location.pathname.replace(/\/$/, "") === PLAY_PATH;
}

export function App(): React.ReactElement {
	const [playing, setPlaying] = useState(onPlayPath);

	useEffect(() => {
		const sync = (): void => setPlaying(onPlayPath());
		window.addEventListener("popstate", sync);
		return () => window.removeEventListener("popstate", sync);
	}, []);

	const enter = (event: React.MouseEvent<HTMLAnchorElement>): void => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
			return;
		event.preventDefault();
		window.history.pushState(null, "", PLAY_PATH);
		setPlaying(true);
	};

	if (playing) {
		return (
			<div className="game">
				<header className="game-bar">
					<a href="/">Sebastian Frazier</a>
					<span>
						WASD/arrows or click to move · Enter to go in or out · Esc to leave
						a file
					</span>
					<a href="/resume/">résumé</a>
				</header>
				<div className="game-stage">
					<Suspense fallback={<p className="loading">Lighting the bonfire…</p>}>
						<CabnWorld />
					</Suspense>
				</div>
			</div>
		);
	}

	return (
		<main className="landing">
			<h1>Sebastian Frazier</h1>
			<p className="lede">Two ways in.</p>
			<div className="doors">
				<a className="door door-world" href={PLAY_PATH} onClick={enter}>
					<span className="door-title">Walk the worlds</span>
					<span className="door-body">
						Each project is a pixel-art world built from its repository by cabn.
						Walk in, open files, step through portals to live demos.
					</span>
				</a>
				<a className="door door-resume" href="/resume/">
					<span className="door-title">Read the résumé</span>
					<span className="door-body">
						One plain page. No JavaScript, prints cleanly.
					</span>
				</a>
			</div>
			<footer>
				<a href="https://github.com/SebastianFrazier26">GitHub</a>
			</footer>
		</main>
	);
}

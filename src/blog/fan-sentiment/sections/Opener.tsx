import { useRef } from "react";
import { COPY } from "../copy.ts";
import { BATTER, Batter, Fielder, Flight, swingTo } from "../kit/Figures.tsx";
import {
	type Flight as FlightSpec,
	flightDrawer,
	flyControl,
	gsap,
	type Point,
	useParallax,
	useReveal,
} from "../kit/motion.ts";
import { SectionHead } from "../kit/SectionHead.tsx";
import { Stadium } from "../kit/Stadium.tsx";
import { useWidth } from "../useWidth.ts";
import "../theme.css";

const PARK = 180;
const H = 170;
const G = 136;

/**
 * Title card in a ballpark: the question over the outfield wall, then the
 * first play of the post, a two-hop grounder from the batter to the fielder.
 */
export function Opener(): React.ReactElement {
	const root = useRef<HTMLElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const width = useWidth(box, 1200);
	const narrow = width < 600;
	const s = narrow ? 0.85 : 1.15;
	const batterX = narrow ? 30 : Math.max(60, width * 0.08);
	const fielderX = width - (narrow ? 34 : Math.max(70, width * 0.09));
	const r = 7 * s;
	const rest = G - r;
	const from: Point = [
		batterX + BATTER.contact[0] * s,
		G + BATTER.contact[1] * s,
	];
	const stop: Point = [fielderX - 34 * s, rest];
	const span = stop[0] - from[0];
	const hop1: Point = [from[0] + span * 0.42, rest];
	const hop2: Point = [from[0] + span * 0.74, rest];
	const legs: FlightSpec[] = [
		{ from, control: flyControl(from, hop1, 70), to: hop1, ground: G },
		{ from: hop1, control: flyControl(hop1, hop2, 34), to: hop2, ground: G },
		{ from: hop2, control: flyControl(hop2, stop, 10), to: stop, ground: G },
	];
	useParallax(root);

	useReveal(
		root,
		(scope) => {
			const batter = scope.querySelector(".fk-batter");
			const flight = scope.querySelector(".op-flight");
			const squash = scope.querySelector(".op-flight .fk-squash");
			const draws = legs.map((leg) => flightDrawer(flight, leg));
			const swing = { angle: BATTER.cocked };
			const state = { t: 0 };
			swingTo(batter, swing.angle);
			draws[0]?.(0);
			const tl = gsap.timeline({ delay: 0.5 }).to(swing, {
				angle: 0,
				duration: 0.3,
				ease: "power3.in",
				onUpdate: () => swingTo(batter, swing.angle),
			});
			draws.forEach((draw, i) => {
				tl.fromTo(
					state,
					{ t: 0 },
					{
						t: 1,
						duration: [0.75, 0.5, 0.55][i],
						ease: i === 2 ? "power2.out" : "none",
						onUpdate: () => draw(state.t),
					},
				).to(
					squash,
					{
						scaleX: 1.35 - i * 0.1,
						scaleY: 0.68 + i * 0.08,
						transformOrigin: "50% 100%",
						duration: 0.07,
						yoyo: true,
						repeat: 1,
						ease: "power1.out",
					},
					">-0.02",
				);
			});
			return tl.from(
				".fk-scroll-cue",
				{ opacity: 0, y: -8, duration: 0.6 },
				">0.2",
			);
		},
		width,
	);

	return (
		<header className="fk-section op" ref={root}>
			<div className="op-park" aria-hidden="true">
				<Stadium width={width} height={PARK} />
			</div>
			<div className="fk-wrap op-wrap">
				<SectionHead
					id="op-title"
					level={1}
					numeral="26"
					inning={COPY.opener.kicker}
					title={COPY.opener.title}
				>
					<p className="fk-copy op-lede">{COPY.opener.lede}</p>
				</SectionHead>
			</div>
			<div className="fk-bleed op-field" ref={box}>
				<svg
					width={width}
					height={H}
					viewBox={`0 0 ${width} ${H}`}
					role="img"
					aria-label="A batter hits a ground ball that hops across the chalk line to a fielder."
				>
					<ellipse
						className="fk-dirt"
						cx={batterX + 6 * s}
						cy={G}
						rx={52 * s}
						ry={10}
					/>
					<ellipse
						className="fk-dirt fk-dirt-soft"
						cx={fielderX}
						cy={G}
						rx={40 * s}
						ry={8}
					/>
					<line className="fk-ground" x1={0} x2={width} y1={G} y2={G} />
					<Batter x={batterX} y={G} scale={s} />
					<Fielder x={fielderX} y={G} scale={s} pose="ready" />
					<Flight className="op-flight" to={stop} ground={G} r={r} />
				</svg>
				<p className="fk-scroll-cue" aria-hidden="true">
					{COPY.opener.cue}
				</p>
			</div>
		</header>
	);
}

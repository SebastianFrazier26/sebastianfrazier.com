import {
	BoxScore,
	FACTS,
	FirstInning,
	firstInningRows,
	Hitting,
	League,
	leagueData,
	leagueRows,
	Opener,
	Pitch,
	pitchData,
	Question,
	Review,
	snapshot,
} from "./index.ts";
import "./theme.css";

/**
 * The post: its sections in story order under one root class. This is the
 * folder's default export, the shape the blog's post list loads lazily.
 */
export default function FanSentimentPost(): React.ReactElement {
	const league = leagueData(snapshot);
	return (
		<article className="post-fan-sentiment">
			<Opener />
			<Question />
			<FirstInning rows={firstInningRows(snapshot)} />
			<Pitch data={pitchData(snapshot)} />
			<Hitting rows={leagueRows(snapshot, ["OPS", "AVG"])} />
			<League data={league} />
			<Review
				before={FACTS.shuffleNullCentre}
				after={FACTS.correctedNullCentre}
			/>
			<BoxScore result={snapshot.confirmatory} league={league} />
		</article>
	);
}

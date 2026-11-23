// The post's parts: section components, the draft copy and the data module.
// Nothing here knows about routes or the site's shell. Sections expect to be
// rendered inside the post's root class (FanSentimentPost.tsx provides it).
export { COPY } from "./copy.ts";
export { BoxScore } from "./sections/BoxScore.tsx";
export { FirstInning } from "./sections/FirstInning.tsx";
export { Hitting } from "./sections/Hitting.tsx";
export { League } from "./sections/League.tsx";
export { Opener } from "./sections/Opener.tsx";
export { Pitch } from "./sections/Pitch.tsx";
export { Question } from "./sections/Question.tsx";
export { Review } from "./sections/Review.tsx";
export {
	FACTS,
	firstInningRows,
	type LeagueData,
	leagueData,
	leagueRows,
	type PitchData,
	pitchData,
	type Snapshot,
	type SnapshotRow,
	snapshot,
} from "./snapshot.ts";

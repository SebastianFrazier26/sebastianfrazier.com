// DRAFT COPY — for the owner's edit. Every sentence a reader sees in the post
// lives here, so the wording can be changed without touching a chart.
// Numbers are never typed into these strings: the sections fill them in from
// the snapshot.

export const COPY = {
	opener: {
		kicker: "2026 season · every fanbase · one test called in advance",
		title: "Are the fans always right?",
		lede: "When a fanbase is high on a player one week, does he actually play better the next? I spent a season finding out.",
		cue: "Scroll for the season ↓",
	},
	question: {
		inning: "First inning · the question",
		title: "This week's mood, next week's play",
		body: "Fans talk about players all week. The question is whether that talk tells you anything about next week that the box score doesn't already. So every comparison here holds two things fixed: how the player did this week, and how his season is going.",
		from: "this week · what fans say",
		to: "next week · how he plays",
	},
	firstInning: {
		inning: "Second inning · two teams",
		title: "A strange bounce in Chicago and Boston",
		body: "I started with two teams, the Cubs and the Red Sox. Hitting and pitching showed nothing. Fielding did: after upbeat weeks, players made more errors, not fewer. Every one of these lands on the wrong side of the line.",
		caveat:
			"It was unplanned, the sample was small, and after a fix to the test described below these sit just short of significant. A result like that needs checking somewhere else.",
	},
	pitch: {
		inning: "Sixth inning · the one test that counted",
		title: "Called in advance, caught at zero",
		body: "So before looking at any other team, I wrote down one test: if the fielding effect is real, it should show up in the rest of the league. Then I ran it once.",
		zone: "where two teams pointed",
		zoneShort: "two teams",
		league: "rest of the league",
	},
	hitting: {
		inning: "Seventh inning · at the plate",
		title: "Does the cheering help him hit?",
		zero: "no effect",
		body: "Same question, asked of the bat. If a week of upbeat talk came before better hitting, these would land to the right of the dotted line. They drop just short of it, and the chalk around each one covers the line.",
	},
	league: {
		inning: "Eighth inning · around the league",
		title: "Every fanbase, every stat",
		body: "One ball for each fanbase and each stat. If some fanbase really could see next week coming, its ball would sit well clear of the middle and turn red. The thick chalk is the league as a whole.",
	},
	review: {
		inning: "Replay review",
		title: "The zone was off",
		body: 'Along the way I found my own test was miscalibrated. Fans react to how a player has just played, and my first version of the test ignored that, which shifted its idea of "nothing" off zero. I rebuilt it so that reaction stays in, re-ran everything, and corrected one conclusion I had already written up. None of it changes the result of the test called in advance.',
		before: "first version",
		after: "rebuilt",
		replay: "Replay",
	},
	boxScore: {
		inning: "Final",
		title: "Not that the data can see",
		body: "Across one season, fan sentiment about a player told me nothing reliable about his next week beyond what his recent play already said. The one odd signal, in two teams' fielding, did not show up anywhere else.",
		limits: [
			"One season of observational data; nothing here is about cause.",
			"Sentiment comes from a classifier I built, and it makes mistakes, which pulls effects toward zero.",
			"The league-wide test could see effects of a few hundredths; a single team's could only see large ones.",
		],
	},
} as const;

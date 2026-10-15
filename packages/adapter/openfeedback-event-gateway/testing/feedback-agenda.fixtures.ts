import type { FeedbackAgenda } from "@meetup-automation/publication";
import type { OpenFeedbackAgendaData } from "../src/openfeedback-agenda-snapshot.js";

export const agenda: FeedbackAgenda = {
	talks: [
		{
			title: "Reliable platforms",
			speakers: [{ id: "speaker-0001", name: "Alex Example" }],
		},
	],
};

export const snapshot: OpenFeedbackAgendaData = {
	speakers: [{ id: "manual-speaker", name: "Alex Example" }],
	talks: [
		{
			id: "manual-talk",
			title: "Reliable platforms",
			speakers: ["manual-speaker"],
		},
	],
};

export const revision = "a".repeat(64);
export const storedSnapshot = {
	speakers: snapshot.speakers.map((speaker) => ({ ...speaker, revision })),
	talks: snapshot.talks.map((talk) => ({ ...talk, revision })),
};

export const speakerPage = {
	id: "event-1",
	speakers: storedSnapshot.speakers,
	nextCursor: null,
};
export const talkPage = {
	id: "event-1",
	talks: storedSnapshot.talks,
	nextCursor: null,
};

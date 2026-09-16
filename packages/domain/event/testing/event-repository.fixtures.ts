import type { EventClock } from "../src/application/ports/event-clock.js";
import type { EventDocumentCodec } from "../src/application/ports/event-document-codec.js";
import type { EventDocument } from "../src/application/ports/event-repository.js";
import type { MeetupEvent } from "../src/domain/model.js";

export const identity = {
	repository: "cloud-native-aixmarseille/meetups",
	issueNumber: 42,
} as const;

export const document: EventDocument = {
	identity,
	issueState: "open",
	issueTitle: "Wrong title",
	labels: ["community"],
	body: "legacy document",
};

export function createClock(): EventClock {
	return { now: () => "2026-09-04T10:00:00+02:00" };
}

export function createCodec(
	events: ReadonlyMap<number, MeetupEvent>,
): EventDocumentCodec {
	return {
		decode: (source) => {
			const event = events.get(source.identity.issueNumber);
			if (!event) {
				throw new Error("Fixture event missing");
			}
			return { event, diagnostics: [] };
		},
		createPatch: (source, event) => ({
			...(source.issueTitle === event.issueTitle
				? {}
				: { issueTitle: event.issueTitle }),
			...(JSON.stringify(source.labels) === JSON.stringify(event.labels)
				? {}
				: { labels: event.labels }),
		}),
	};
}

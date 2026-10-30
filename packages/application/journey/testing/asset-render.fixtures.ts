import type {
	EventDocument,
	EventDocumentCodec,
	EventRepository,
	MeetupEvent,
} from "@meetup-automation/event";
import type {
	ContactId,
	HostId,
	ReferentialCatalog,
	SpeakerId,
} from "@meetup-automation/referential";
import { vi } from "vitest";
import { event } from "./meetup-journey.fixtures.js";

export const publicCatalog: ReferentialCatalog = {
	hosts: [
		{
			id: "host-0001" as HostId,
			displayName: "Public Host",
			contacts: [
				{
					id: "contact-0001" as ContactId,
					name: "Private contact",
					email: "private@example.test",
				},
			],
		},
	],
	speakers: [
		{
			id: "speaker-0001" as SpeakerId,
			displayName: "Public Speaker",
			firstName: "Public",
			lastName: "Speaker",
			email: "private-speaker@example.test",
			company: "Company",
			pictureUrl: "https://images.example.test/portrait.png",
		},
	],
};

export const talk = {
	speakers: event.agenda[0].speakers,
	description: "Combined legacy description",
	proposal: {
		provider: "conference-hall",
		event: "public-cfp",
		id: "proposal-a",
		title: "Public title",
		abstract: "Public abstract",
		languages: ["en"],
		formats: ["talk"],
	},
};

export function nextCandidate(
	issueNumber = 43,
	overrides: Partial<MeetupEvent> = {},
): MeetupEvent {
	return {
		...event,
		identity: { ...event.identity, issueNumber },
		date: "2026-10-15",
		occurrenceStatus: "scheduled",
		issueState: "open",
		...overrides,
	};
}

export function nextEventFixture(events: readonly MeetupEvent[]) {
	const documents: EventDocument[] = events.map((item) => ({
		identity: item.identity,
		issueState: item.issueState,
		issueTitle: item.issueTitle,
		labels: item.labels,
		body: JSON.stringify(item),
	}));
	const repository: EventRepository = {
		find: vi.fn(),
		applyPatch: vi.fn(),
		listPage: vi.fn(async () => ({ items: documents })),
	};
	const codec: EventDocumentCodec = {
		decode: vi.fn((document) => ({
			event: JSON.parse(document.body),
			diagnostics: [],
		})),
		createPatch: vi.fn(),
	};
	return { repository, codec, documents };
}

import type {
	EventDocument,
	MeetupEvent,
	ReconcileEventDependencies,
} from "@meetup-automation/event";
import type { RawReferentialCatalog } from "@meetup-automation/referential";
import { vi } from "vitest";
import type { AutomationConfig } from "../src/config/automation-config.js";

export const identity = {
	repository: "cloud-native-aixmarseille/meetups",
	issueNumber: 42,
} as const;

export const config: AutomationConfig = {
	timezone: "Europe/Paris",
	event: {
		"issue-label": "meetup",
		"issue-form": ".github/ISSUE_TEMPLATE/meetup.yml",
		"occurrence-status-field": "event_status",
		"required-confirmation-labels": ["hoster:confirmed", "speakers:confirmed"],
	},
	referentials: {
		hosts: "referentials/hosting.csv",
		speakers: "referentials/speakers.csv",
	},
	communication: {
		"readiness-window-days": 7,
		"mailings-repository": "cloud-native-aixmarseille/mailings",
		"slack-enabled": true,
		"approval-label": "communication:approved",
		"dispatch-enabled": false,
		"policy-version": 1,
	},
	publication: {
		"meetup-event-url-prefix":
			"https://www.meetup.com/cloud-native-aix-marseille/events/",
		"cncf-event-url-prefix":
			"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/",
	},
};

export const sourceDocument: EventDocument = {
	identity,
	issueState: "open",
	issueTitle: "[Meetup] - 2026-09-30 - Cloud Native Evening",
	labels: ["meetup", "hoster:confirmed", "speakers:confirmed"],
	body: "synthetic event document",
};

export const event: MeetupEvent = {
	schemaVersion: 1,
	identity,
	issueState: "open",
	issueTitle: sourceDocument.issueTitle,
	labels: sourceDocument.labels,
	eventTitle: "Cloud Native Evening",
	date: "2026-09-30",
	description: "An evening about cloud-native technology",
	host: { id: "host-0001", displayName: "Example Host" },
	agenda: [
		{
			speakers: [{ id: "speaker-0001", displayName: "Example Speaker" }],
			description: "Reliable platforms",
		},
	],
	publicationLinks: {
		meetup:
			"https://www.meetup.com/cloud-native-aix-marseille/events/123456789",
		community:
			"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/cloud-native-evening",
		assets: "https://drive.google.com/drive/folders/folder-1",
	},
	occurrenceStatus: "held",
	timeZone: "Europe/Paris",
	confirmations: { host: true, speakers: true },
	logistics: {
		aperitif: "planned",
		postEventVenue: "not-planned",
	},
	operationalChecklists: {
		slidesAndContent: [],
		communication: [],
		postEvent: [
			{ name: "Mail thanks hoster", completed: true },
			{ name: "Mail thanks speakers", completed: true },
			{ name: "Share slides to meetup", completed: true },
			{
				name: "Sync attendees from tally sheet to CNCF",
				completed: false,
			},
			{ name: "Social networks", completed: false },
		],
	},
	followUpComplete: false,
};

export const catalog: RawReferentialCatalog = {
	hosts: [
		{
			hostId: "host-0001",
			displayName: "Example Host",
			contactId: "contact-0001",
			contactName: "Synthetic Contact",
			email: "contact@example.test",
			address: "Synthetic address",
		},
	],
	speakers: [
		{
			speakerId: "speaker-0001",
			firstName: "Example",
			lastName: "Speaker",
			company: "Example Company",
			email: "speaker@example.test",
		},
	],
};

export function createEventDependencies(): ReconcileEventDependencies {
	return {
		repository: {
			find: vi.fn().mockResolvedValue(sourceDocument),
			applyPatch: vi.fn().mockResolvedValue(undefined),
			listPage: vi.fn(),
		},
		documentCodec: {
			decode: vi.fn().mockReturnValue({ event, diagnostics: [] }),
			createPatch: vi.fn().mockReturnValue({}),
		},
		commentRepository: {
			reconcileDiagnostics: vi.fn().mockResolvedValue({ changed: false }),
		},
		clock: { now: () => "2026-10-01T10:00:00Z" },
	};
}

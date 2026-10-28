import type { EventDocument, MeetupEvent } from "@meetup-automation/event";
import type {
	ContentMedia,
	EventPublicationGateway,
	EventPublicationIdentity,
	PublicationRecord,
} from "@meetup-automation/publication";
import { vi } from "vitest";
import type { OrganizerApproval } from "../src/ports/organizer-approval.js";
import type { ManageMeetupEvent } from "../src/use-cases/manage-meetup-event.js";
import {
	createEventDependencies,
	event,
	sourceDocument,
} from "./meetup-journey.fixtures.js";

export const publicationCover: ContentMedia = {
	id: "approved-cover",
	url: "https://images.example.test/cover.png",
	fingerprint: "a".repeat(64),
	description: "Reviewed artwork",
	mimeType: "image/png",
	width: 1600,
	height: 900,
	sourceRevision: "reviewed-source",
};
export const publicationUrl =
	"https://www.meetup.com/example-group/events/12345/";
export function publicationIdentity(
	url = publicationUrl,
): EventPublicationIdentity {
	return {
		id: /events\/([1-9]\d*)/.exec(url)?.[1] ?? "invalid",
		reviewUrl: url,
		publicUrl: url,
	};
}
const publicationSettings = {
	startTime: "18:45",
	endTime: "20:45",
	venues: { "host-0001": { name: "Example Host", city: "Example City" } },
};

export function publicationFixture(
	overrides: Partial<MeetupEvent> = {},
	record?: PublicationRecord,
) {
	const deps = createEventDependencies();
	const currentEvent: MeetupEvent = {
		...event,
		occurrenceStatus: "scheduled",
		publicationLinks: {},
		...overrides,
	};
	const current: EventDocument = { ...sourceDocument };
	const journal = {
		load: vi.fn().mockImplementation(async () => record),
		reserve: vi.fn().mockImplementation(async () => {
			record = {};
		}),
		record: vi
			.fn()
			.mockImplementation(async (identity: EventPublicationIdentity) => {
				record = { identity };
			}),
	};
	const manageEvent = {
		execute: vi.fn<ManageMeetupEvent["execute"]>().mockResolvedValue({
			skipped: false,
			event: currentEvent,
			state: "planned",
			isReady: true,
			manualPublicationTasks: [],
			persisted: false,
			diagnostics: [],
		} as Awaited<ReturnType<ManageMeetupEvent["execute"]>>),
	};
	const approval = {
		request: vi
			.fn<OrganizerApproval["request"]>()
			.mockResolvedValue({ status: "pending", notificationFailed: false }),
		synchronize: vi.fn<OrganizerApproval["synchronize"]>(),
	};
	const gateway = {
		inspect: vi
			.fn<EventPublicationGateway["inspect"]>()
			.mockImplementation(async (reference) => ({
				identity: publicationIdentity(
					reference.endsWith("/") ? reference : `${reference}/`,
				),
				status: "published",
			})),
		publish: vi
			.fn<EventPublicationGateway["publish"]>()
			.mockImplementation(async (_, url, guard) => {
				await guard();
				return { identity: url, status: "published" };
			}),
		save: vi
			.fn<EventPublicationGateway["save"]>()
			.mockImplementation(async (_, url, before, after) => {
				await before();
				await after(url ?? publicationIdentity());
				return {
					identity: url ?? publicationIdentity(),
					status: url ? "published" : "draft",
				};
			}),
	};
	vi.mocked(deps.repository.find).mockImplementation(async () => ({
		...current,
	}));
	vi.mocked(deps.documentCodec.decode).mockReturnValue({
		event: currentEvent,
		diagnostics: [],
	});
	let projected = currentEvent;
	vi.mocked(deps.documentCodec.createPatch).mockImplementation((_, updated) => {
		projected = updated;
		return JSON.stringify(updated) === JSON.stringify(currentEvent)
			? {}
			: { body: JSON.stringify(updated) };
	});
	vi.mocked(deps.repository.applyPatch).mockImplementation(async (_, patch) => {
		Object.assign(current, patch);
		Object.assign(currentEvent, projected);
	});
	const dependencies = {
		artwork: {
			cover: vi
				.fn<() => Promise<ContentMedia | undefined>>()
				.mockResolvedValue(publicationCover),
		},
		contentGate: { blocked: vi.fn().mockResolvedValue([]) },
		repository: deps.repository,
		codec: deps.documentCodec,
		clock: { now: () => "2026-09-29T12:00:00Z" },
		manageEvent,
		gateway,
		journal,
		approval,
		settings: publicationSettings,
		meetupUrlPrefix: "https://www.meetup.com/example-group/events/",
	};
	return {
		dependencies,
		gateway,
		journal,
		approval,
		deps,
		manageEvent,
		currentEvent,
		current,
	};
}

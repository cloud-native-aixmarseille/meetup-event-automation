import type { MeetupEvent } from "@meetup-automation/event";
import {
	type CommunityEvent,
	CommunityEventIdentityPolicy,
	CommunityGroupUrl,
	type EventPublicationGateway,
	type EventPublicationIdentity,
	type PublicationRecord,
} from "@meetup-automation/publication";
import { vi } from "vitest";
import { publicationFixture as meetupFixture } from "./meetup-publication.fixtures.js";

const prefix = "https://community.example.test/cncf/group/example/event/";
export const remote: EventPublicationIdentity = {
	id: "10000000-0000-4000-8000-000000000001",
	reviewUrl:
		"https://community.example.test/dashboard/group/events/10000000-0000-4000-8000-000000000001/update",
	publicUrl: `${prefix}example-evening`,
};
export function communityFixture(
	overrides: Partial<MeetupEvent> = {},
	record?: PublicationRecord,
) {
	const base = meetupFixture(overrides);
	const journal = {
		load: vi.fn(async () => record),
		reserve: vi.fn(async () => {
			record = {};
		}),
		record: vi.fn(async (identity: EventPublicationIdentity) => {
			record = { identity };
		}),
	};
	const gateway = {
		inspect: vi
			.fn<EventPublicationGateway<CommunityEvent>["inspect"]>()
			.mockResolvedValue({ identity: remote, status: "draft" }),
		save: vi
			.fn<EventPublicationGateway<CommunityEvent>["save"]>()
			.mockImplementation(async (_, identity, before, after) => {
				await before();
				await after(identity ?? remote);
				return { identity: identity ?? remote, status: "draft" };
			}),
		publish: vi
			.fn<EventPublicationGateway<CommunityEvent>["publish"]>()
			.mockImplementation(async (_, identity, guard) => {
				await guard();
				return { identity, status: "published" };
			}),
	};
	const group = CommunityGroupUrl.parse(prefix);
	if (!group) throw new Error("Invalid synthetic group");
	const dependencies = {
		...base.dependencies,
		journal,
		gateway,
		settings: {
			...base.dependencies.settings,
			categoryId: "20000000-0000-4000-8000-000000000002",
			registration: {
				capacity: 75,
				waitlist: true,
				approvalRequired: false,
				reminder: true,
			},
			venues: {
				"host-0001": {
					name: "Example Host",
					city: "Example City",
					address: "1 Example Road",
					zipCode: "10000",
					state: "Example State",
					country: "France",
					countryCode: "FR",
				},
			},
		},
		identityPolicy: new CommunityEventIdentityPolicy(group),
		target: `${prefix}|community|group`,
	};
	return { ...base, dependencies, journal, gateway };
}

import type { CommunityPublicationSettings } from "@meetup-automation/journey";
import {
	type CommunityEventPolicy,
	CommunityGroupUrl,
	type CommunityRegistration,
	type CommunitySpeaker,
	type CommunitySponsor,
	type CommunityVenue,
} from "@meetup-automation/publication";
import type { EventScheduleConfiguration } from "./event-schedule-configuration.js";
import type { RuntimeInput } from "./runtime-input.js";

export type OcgroupsPublicationSettingsValue = CommunityPublicationSettings &
	Readonly<{
		eventUrlPrefix: string;
		communityId: string;
		groupId: string;
	}>;

export class OcgroupsPublicationSettings {
	constructor(
		private readonly input: Pick<RuntimeInput, "isObject">,
		private readonly schedule: Pick<EventScheduleConfiguration, "parse">,
		private readonly policy: Pick<
			CommunityEventPolicy,
			"venue" | "registration" | "speaker" | "sponsor"
		>,
	) {}

	parse(value: unknown): OcgroupsPublicationSettingsValue {
		const schedule = this.schedule.parse(value);
		if (
			!this.input.isObject(value) ||
			!CommunityGroupUrl.parse(value.eventUrlPrefix) ||
			typeof value.eventUrlPrefix !== "string" ||
			!this.uuid(value.communityId) ||
			!this.uuid(value.groupId) ||
			!this.uuid(value.categoryId) ||
			!this.input.isObject(value.venues)
		)
			throw new Error("Invalid OCGroups target configuration");
		const venues: Record<string, CommunityVenue> = {};
		for (const [id, venue] of Object.entries(value.venues))
			venues[id] = this.venue(venue);
		return {
			...schedule,
			venues,
			eventUrlPrefix: value.eventUrlPrefix,
			communityId: value.communityId,
			groupId: value.groupId,
			categoryId: value.categoryId,
			registration: this.registration(value.registration),
			speakers: this.speakers(value.speakers),
			sponsors: this.sponsors(value.sponsors),
		};
	}

	private speakers(value: unknown): Record<string, CommunitySpeaker> {
		if (!this.input.isObject(value))
			throw new Error("Missing OCGroups speaker mappings");
		const mappings: Record<string, CommunitySpeaker> = {};
		for (const [id, item] of Object.entries(value)) {
			if (
				!id.trim() ||
				!this.input.isObject(item) ||
				typeof item.userId !== "string" ||
				typeof item.username !== "string"
			)
				throw new Error("Invalid OCGroups speaker mapping");
			const speaker = { userId: item.userId, username: item.username };
			if (!this.policy.speaker(speaker))
				throw new Error("Invalid OCGroups speaker mapping");
			mappings[id] = speaker;
		}
		return mappings;
	}

	private sponsors(value: unknown): Record<string, CommunitySponsor> {
		if (!this.input.isObject(value))
			throw new Error("Missing OCGroups sponsor mappings");
		const mappings: Record<string, CommunitySponsor> = {};
		for (const [id, item] of Object.entries(value)) {
			if (
				!id.trim() ||
				!this.input.isObject(item) ||
				typeof item.id !== "string" ||
				typeof item.name !== "string" ||
				typeof item.level !== "string"
			)
				throw new Error("Invalid OCGroups sponsor mapping");
			const sponsor = { id: item.id, name: item.name, level: item.level };
			if (!this.policy.sponsor(sponsor))
				throw new Error("Invalid OCGroups sponsor mapping");
			mappings[id] = sponsor;
		}
		return mappings;
	}

	private venue(value: unknown): CommunityVenue {
		if (
			!this.input.isObject(value) ||
			typeof value.name !== "string" ||
			typeof value.address !== "string" ||
			typeof value.city !== "string" ||
			typeof value.zipCode !== "string" ||
			typeof value.state !== "string" ||
			typeof value.country !== "string" ||
			typeof value.countryCode !== "string"
		)
			throw new Error("Invalid public OCGroups venue mapping");
		const venue = {
			name: value.name,
			address: value.address,
			city: value.city,
			zipCode: value.zipCode,
			state: value.state,
			country: value.country,
			countryCode: value.countryCode,
		};
		if (!this.policy.venue(venue))
			throw new Error("Invalid public OCGroups venue mapping");
		return venue;
	}

	private registration(value: unknown): CommunityRegistration {
		if (
			!this.input.isObject(value) ||
			typeof value.capacity !== "number" ||
			typeof value.waitlist !== "boolean" ||
			typeof value.approvalRequired !== "boolean" ||
			typeof value.reminder !== "boolean"
		)
			throw new Error("Invalid OCGroups registration configuration");
		const registration = {
			capacity: value.capacity,
			waitlist: value.waitlist,
			approvalRequired: value.approvalRequired,
			reminder: value.reminder,
		};
		if (!this.policy.registration(registration))
			throw new Error("Invalid OCGroups registration configuration");
		return registration;
	}

	private uuid(value: unknown): value is string {
		return (
			typeof value === "string" &&
			/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)
		);
	}
}

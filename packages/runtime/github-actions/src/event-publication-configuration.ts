import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScheduledEventSettings } from "@meetup-automation/journey";
import type { EventScheduleConfiguration } from "./event-schedule-configuration.js";
import type {
	OcgroupsPublicationSettings,
	OcgroupsPublicationSettingsValue,
} from "./ocgroups-publication-settings.js";
import type { RuntimeInput } from "./runtime-input.js";

export type PublicationDestinationConfiguration =
	| Readonly<{ provider: "meetup"; settings: ScheduledEventSettings }>
	| Readonly<{
			provider: "ocgroups";
			settings: OcgroupsPublicationSettingsValue;
	  }>;
export type EventPublicationConfigurationValue = Readonly<{
	schedule: ScheduledEventSettings;
	destinations: readonly PublicationDestinationConfiguration[];
}>;

export class EventPublicationConfiguration {
	constructor(
		private readonly input: Pick<RuntimeInput, "isObject">,
		private readonly schedule: Pick<EventScheduleConfiguration, "parse">,
		private readonly ocgroups: Pick<OcgroupsPublicationSettings, "parse">,
	) {}
	async load(root: string): Promise<EventPublicationConfigurationValue> {
		const text = await readFile(
			join(root, ".github/event-publication.json"),
			"utf8",
		);
		if (Buffer.byteLength(text) > 100_000)
			throw new Error("Event publication configuration is too large");
		return this.parse(JSON.parse(text));
	}
	parse(value: unknown): EventPublicationConfigurationValue {
		const schedule = this.schedule.parse(value);
		if (
			!this.input.isObject(value) ||
			!Array.isArray(value.destinations) ||
			value.destinations.length > 2
		)
			throw new Error("Invalid publication destinations");
		const destinations = value.destinations.map((destination) =>
			this.destination(destination, schedule, value.venues),
		);
		if (
			new Set(destinations.map((destination) => destination.provider)).size !==
			destinations.length
		)
			throw new Error("Duplicate publication provider");
		return { schedule, destinations };
	}
	private destination(
		value: unknown,
		schedule: ScheduledEventSettings,
		venues: unknown,
	): PublicationDestinationConfiguration {
		if (!this.input.isObject(value))
			throw new Error("Invalid publication destination");
		if (value.provider === "meetup" && Object.keys(value).length === 1)
			return { provider: "meetup", settings: schedule };
		if (
			value.provider !== "ocgroups" ||
			Object.keys(value).some(
				(key) =>
					![
						"provider",
						"eventUrlPrefix",
						"communityId",
						"groupId",
						"categoryId",
						"registration",
					].includes(key),
			)
		)
			throw new Error("Unsupported publication destination");
		return {
			provider: "ocgroups",
			settings: this.ocgroups.parse({
				...value,
				version: 1,
				startTime: schedule.startTime,
				endTime: schedule.endTime,
				venues,
			}),
		};
	}
}

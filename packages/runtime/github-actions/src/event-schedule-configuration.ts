import type { ScheduledEventSettings } from "@meetup-automation/journey";
import type { ScheduledEventPolicy } from "@meetup-automation/publication";
import type { RuntimeInput } from "./runtime-input.js";

export interface EventScheduleConfigurationCollaborators {
	readonly runtimeInput: Pick<RuntimeInput, "isObject">;
	readonly scheduledEventPolicy: Pick<ScheduledEventPolicy, "validTime">;
}

export class EventScheduleConfiguration {
	constructor(
		private readonly collaborators: EventScheduleConfigurationCollaborators,
	) {}

	parse(input: unknown): ScheduledEventSettings {
		if (
			!this.collaborators.runtimeInput.isObject(input) ||
			input.version !== 1 ||
			typeof input.startTime !== "string" ||
			!this.collaborators.scheduledEventPolicy.validTime(input.startTime) ||
			typeof input.endTime !== "string" ||
			!this.collaborators.scheduledEventPolicy.validTime(input.endTime) ||
			input.endTime <= input.startTime ||
			!this.collaborators.runtimeInput.isObject(input.venues)
		)
			throw new Error("Invalid event schedule configuration");
		const venues: Record<string, { name: string; city: string }> = {};
		for (const [id, venue] of Object.entries(input.venues)) {
			if (
				!/^host-[a-z0-9-]+$/.test(id) ||
				!this.collaborators.runtimeInput.isObject(venue) ||
				!this.text(venue.name) ||
				!this.text(venue.city)
			)
				throw new Error("Invalid public event venue mapping");
			venues[id] = { name: venue.name, city: venue.city };
		}
		return { startTime: input.startTime, endTime: input.endTime, venues };
	}

	private text(value: unknown): value is string {
		return (
			typeof value === "string" &&
			value.trim() === value &&
			value.length > 0 &&
			value.length <= 200 &&
			!/[\r\n<>]/.test(value)
		);
	}
}

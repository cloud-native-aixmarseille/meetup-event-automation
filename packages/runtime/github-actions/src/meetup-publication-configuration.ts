import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MeetupPublicationSettings } from "@meetup-automation/journey";
import { ScheduledEventPolicy } from "@meetup-automation/publication";

export class MeetupPublicationConfiguration {
	static async load(root: string): Promise<MeetupPublicationSettings> {
		const text = await readFile(
			join(root, ".github/meetup-publication.json"),
			"utf8",
		);
		if (Buffer.byteLength(text) > 100_000)
			throw new Error("Meetup publication configuration is too large");
		return MeetupPublicationConfiguration.parse(JSON.parse(text));
	}

	static parse(value: unknown): MeetupPublicationSettings {
		const input = value as Record<string, unknown> | null;
		if (
			input?.version !== 1 ||
			typeof input.startTime !== "string" ||
			!ScheduledEventPolicy.validTime(input.startTime) ||
			typeof input.endTime !== "string" ||
			!ScheduledEventPolicy.validTime(input.endTime) ||
			input.endTime <= input.startTime ||
			!input.venues ||
			typeof input.venues !== "object" ||
			Array.isArray(input.venues)
		)
			throw new Error("Invalid Meetup publication configuration");
		const venues: Record<string, { name: string; city: string }> = {};
		for (const [id, value] of Object.entries(input.venues)) {
			const venue = value as { name?: unknown; city?: unknown } | null;
			if (
				!/^[a-zA-Z0-9_-]+$/.test(id) ||
				!venue ||
				!MeetupPublicationConfiguration.text(venue.name) ||
				!MeetupPublicationConfiguration.text(venue.city)
			)
				throw new Error("Invalid public Meetup venue mapping");
			venues[id] = { name: venue.name, city: venue.city };
		}
		return { startTime: input.startTime, endTime: input.endTime, venues };
	}

	private static text(value: unknown): value is string {
		return (
			typeof value === "string" &&
			value.trim() === value &&
			value.length > 0 &&
			value.length <= 200 &&
			!/[\r\n<>]/.test(value)
		);
	}
}

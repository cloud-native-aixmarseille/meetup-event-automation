import * as core from "@actions/core";
import { RuntimeInputError } from "./runtime-input-error.js";

export interface ConferenceHallSettings {
	readonly conferenceHallEvent: string;
	readonly conferenceHallApiKey: string;
}

export class ConferenceHallInput {
	read(): ConferenceHallSettings {
		const conferenceHallApiKey = core.getInput("conference-hall-api-key", {
			required: true,
		});
		core.setSecret(conferenceHallApiKey);
		return this.validate({
			conferenceHallEvent: core.getInput("conference-hall-event", {
				required: true,
			}),
			conferenceHallApiKey,
		});
	}

	readEventUrl(event: string): string {
		const value = core
			.getInput("conference-hall-event-url", { required: true })
			.trim()
			.replace(/\/$/, "");
		const match =
			/^https:\/\/conference-hall\.io\/team\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(
				value,
			);
		if (!match || match[2] !== event)
			throw new RuntimeInputError(
				"conference-hall-event-url",
				"must be the Conference Hall organizer event URL matching conference-hall-event",
			);
		return value;
	}

	validate(input: ConferenceHallSettings): ConferenceHallSettings {
		const conferenceHallEvent = input.conferenceHallEvent?.trim();
		const conferenceHallApiKey = input.conferenceHallApiKey?.trim();
		if (!conferenceHallEvent)
			throw new Error("Input required and not supplied: conference-hall-event");
		if (!conferenceHallApiKey)
			throw new Error(
				"Input required and not supplied: conference-hall-api-key",
			);
		return { conferenceHallEvent, conferenceHallApiKey };
	}
}

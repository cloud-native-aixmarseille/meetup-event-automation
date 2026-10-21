import * as core from "@actions/core";

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

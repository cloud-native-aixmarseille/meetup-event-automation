import type { ScheduledEventGateway } from "@meetup-automation/publication";
import { chromium } from "playwright-core";
import type { LoginChallenge } from "./hcaptcha-challenge.js";
import type {
	MeetupEventGateway,
	MeetupEventGatewayArguments,
} from "./meetup-event-gateway.js";

export interface MeetupEventGatewayFactoryCollaborators {
	readonly createMeetupEventGateway: (
		...args: MeetupEventGatewayArguments
	) => MeetupEventGateway;
}

export class MeetupEventGatewayFactory {
	constructor(
		private readonly collaborators: MeetupEventGatewayFactoryCollaborators,
	) {}

	create(
		credentials: { email: string; password: string },
		challenge: LoginChallenge,
		groupUrl: string,
	): ScheduledEventGateway {
		return this.collaborators.createMeetupEventGateway(
			chromium,
			credentials,
			challenge,
			groupUrl,
		);
	}
}

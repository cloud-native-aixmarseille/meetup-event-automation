import type { ScheduledEventGateway } from "@meetup-automation/publication";
import { chromium } from "playwright-core";
import type { HcaptchaChallengeFactory } from "./hcaptcha-challenge-factory.js";
import type {
	MeetupEventGateway,
	MeetupEventGatewayArguments,
} from "./meetup-event-gateway.js";

export interface MeetupEventGatewayFactoryCollaborators {
	readonly hcaptchaChallengeFactory: Pick<HcaptchaChallengeFactory, "create">;
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
		solverDirectory: string,
		geminiApiKey: string,
		geminiModel: string,
		groupUrl: string,
	): ScheduledEventGateway {
		return this.collaborators.createMeetupEventGateway(
			chromium,
			credentials,
			this.collaborators.hcaptchaChallengeFactory.create(
				solverDirectory,
				geminiApiKey,
				geminiModel,
			),
			groupUrl,
		);
	}
}

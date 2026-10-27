import type { CaptchaResolver } from "@meetup-automation/browser-authentication";
import type {
	AttendeeSlidesGateway,
	EventPublicationGateway,
} from "@meetup-automation/publication";
import { chromium, type Page } from "playwright-core";
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
		createCaptchaResolver: (page: Page) => CaptchaResolver,
		groupUrl: string,
	): EventPublicationGateway & AttendeeSlidesGateway {
		return this.collaborators.createMeetupEventGateway(
			chromium,
			credentials,
			createCaptchaResolver,
			groupUrl,
		);
	}
}

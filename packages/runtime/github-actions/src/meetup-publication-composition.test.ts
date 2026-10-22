import { getOctokit } from "@actions/github";
import { HcaptchaCaptchaResolverComposition } from "@meetup-automation/hcaptcha-captcha-resolver";
import { ManageMeetupPublication } from "@meetup-automation/journey";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeetupEventGatewayFactory } from "../../../adapter/publication/meetup-event-gateway/src/meetup-event-gateway-factory.js";
import { eventPublicationSettings } from "../testing/publication-urls.fixtures.js";
import { EventComposition } from "./composition.js";
import { MeetupPublicationComposition } from "./meetup-publication-composition.js";

const input = {
	...eventPublicationSettings,
	conferenceHallEvent: "example-cfp",
	conferenceHallApiKey: "synthetic-source-key",
	client: getOctokit("synthetic-token"),
	owner: "example",
	repo: "meetups",
	issueNumber: 42,
	commentAuthorLogin: "organizer[bot]",
	email: "organizer@example.test",
	password: "synthetic-password",
	ai: { provider: "gemini" as const, model: "vision-model", apiKey: "ai-key" },
	slackToken: "slack-token",
	slackOrganizerChannelId: "organizers",
	settings: { startTime: "18:45", endTime: "20:45", venues: {} },
};

afterEach(() => vi.restoreAllMocks());

describe("Meetup publication composition", () => {
	it("maps the shared AI configuration to the injected challenge capability", () => {
		// Arrange
		const groupUrl = new URL(
			"../",
			eventPublicationSettings.meetupEventUrlPrefix,
		).href;
		const factory = vi
			.fn()
			.mockReturnValue({ inspect: vi.fn(), resolve: vi.fn() });
		const createChallenge = vi
			.spyOn(
				HcaptchaCaptchaResolverComposition.prototype,
				"captchaResolverFactory",
			)
			.mockReturnValue(factory);
		const createGateway = vi
			.spyOn(MeetupEventGatewayFactory.prototype, "create")
			.mockReturnValue({ save: vi.fn(), publish: vi.fn() });

		// Act
		const container = MeetupPublicationComposition.create(input);
		const publication = container.get(ManageMeetupPublication);

		// Assert
		expect(publication).toBeInstanceOf(ManageMeetupPublication);
		expect(createChallenge).toHaveBeenCalledExactlyOnceWith(
			expect.stringMatching(
				/\/packages\/adapter\/browser-authentication\/hcaptcha-captcha-resolver\/python\/$/,
			),
			input.ai.apiKey,
			input.ai.model,
		);
		expect(createGateway).toHaveBeenCalledExactlyOnceWith(
			{ email: input.email, password: input.password },
			factory,
			groupUrl,
		);
	});

	it("rejects invalid AI configuration before composing event dependencies", () => {
		// Arrange
		const createEvent = vi.spyOn(EventComposition, "createEventContainer");

		// Act
		const compose = () =>
			MeetupPublicationComposition.create({
				...input,
				ai: { ...input.ai, model: " " },
			});

		// Assert
		expect(compose).toThrow("ai-model");
		expect(createEvent).not.toHaveBeenCalled();
	});
});

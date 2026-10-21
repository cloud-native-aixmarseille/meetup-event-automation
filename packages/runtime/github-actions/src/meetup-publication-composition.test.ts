import { getOctokit } from "@actions/github";
import { ManageMeetupPublication } from "@meetup-automation/journey";
import { MeetupEventGatewayComposition } from "@meetup-automation/meetup-event-gateway";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HcaptchaChallengeFactory } from "../../../adapter/meetup-event-gateway/src/hcaptcha-challenge-factory.js";
import { MeetupEventGatewayFactory } from "../../../adapter/meetup-event-gateway/src/meetup-event-gateway-factory.js";
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
		const groupUrl = new URL("../", eventPublicationSettings.meetupEventUrlPrefix).href;
		const challenge = new MeetupEventGatewayComposition().hcaptchaChallenge(
			{ run: vi.fn() },
			"synthetic-key",
			"synthetic-model",
		);
		const createChallenge = vi
			.spyOn(HcaptchaChallengeFactory.prototype, "create")
			.mockReturnValue(challenge);
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
				/\/packages\/adapter\/meetup-event-gateway\/python\/$/,
			),
			input.ai.apiKey,
			input.ai.model,
		);
		expect(createGateway).toHaveBeenCalledExactlyOnceWith(
			{ email: input.email, password: input.password },
			challenge,
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

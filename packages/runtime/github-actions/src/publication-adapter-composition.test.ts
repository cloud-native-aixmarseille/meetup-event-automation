import { getOctokit } from "@actions/github";
import { HcaptchaCaptchaResolverComposition } from "@meetup-automation/hcaptcha-captcha-resolver";
import { OcgroupsEventGatewayComposition } from "@meetup-automation/ocgroups-event-gateway";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MeetupEventGatewayFactory } from "../../../adapter/publication/meetup-event-gateway/src/meetup-event-gateway-factory.js";
import {
	eventPublicationConfigurationFixture,
	publicationCredentialsFixture,
} from "../testing/event-publication.fixtures.js";
import { eventPublicationSettings } from "../testing/publication-urls.fixtures.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationAdapterComposition } from "./publication-adapter-composition.js";
import { PublicationCredentialsInput } from "./publication-credentials-input.js";

vi.mock("@actions/core", () => ({ setSecret: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
function fixture() {
	const runtime = new GithubActionsComposition();
	const configuration = eventPublicationConfigurationFixture();
	const adapters = new PublicationCredentialsInput(
		runtime.runtimeInput(),
		runtime.aiInput(),
	).parse(
		JSON.stringify(publicationCredentialsFixture()),
		runtime.eventPublicationConfiguration().parse(configuration).destinations,
	);
	return {
		adapters,
		input: {
			...eventPublicationSettings,
			communityEventUrlPrefixes: [
				"https://community.example.test/cncf/group/example/event/",
			],
			conferenceHallEvent: "example-cfp",
			conferenceHallApiKey: "synthetic-source-key",
			client: getOctokit("synthetic-token"),
			owner: "example",
			repo: "events",
			issueNumber: 42,
			commentAuthorLogin: "organizer[bot]",
			locale: "en" as const,
			clock: { now: () => "2026-01-01T00:00:00Z" },
			approval: { request: vi.fn(), synchronize: vi.fn() },
		},
	};
}
describe("publication adapter composition", () => {
	it("maps Meetup credentials and shared AI configuration at the adapter boundary", () => {
		// Arrange
		const f = fixture();
		const resolver = vi.fn();
		const challenge = vi
			.spyOn(
				HcaptchaCaptchaResolverComposition.prototype,
				"captchaResolverFactory",
			)
			.mockReturnValue(resolver);
		const gateway = vi
			.spyOn(MeetupEventGatewayFactory.prototype, "create")
			.mockReturnValue({
				inspect: vi.fn(),
				save: vi.fn(),
				publish: vi.fn(),
				sendSlides: vi.fn(),
			});
		const credentials = publicationCredentialsFixture().meetup;
		// Act
		const destination = new PublicationAdapterComposition().create(
			f.input,
			f.adapters[0],
		);
		// Assert
		expect(destination.key.provider).toBe("meetup");
		expect(challenge).toHaveBeenCalledExactlyOnceWith(
			expect.stringMatching(/\/hcaptcha-captcha-resolver\/python\/$/),
			credentials.ai.apiKey,
			credentials.ai.model,
		);
		expect(gateway).toHaveBeenCalledExactlyOnceWith(
			{ email: credentials.email, password: credentials.password },
			resolver,
			"https://www.meetup.com/example-meetups/",
		);
	});
	it("composes OCGroups without constructing Meetup or its challenge solver", () => {
		// Arrange
		const f = fixture();
		const challenge = vi.spyOn(
			HcaptchaCaptchaResolverComposition.prototype,
			"captchaResolverFactory",
		);
		const meetup = vi.spyOn(MeetupEventGatewayFactory.prototype, "create");
		const ocgroups = vi.spyOn(
			OcgroupsEventGatewayComposition.prototype,
			"create",
		);
		// Act
		const destination = new PublicationAdapterComposition().create(
			f.input,
			f.adapters[1],
		);
		// Assert
		expect(destination.key.provider).toBe("ocgroups");
		expect(ocgroups).toHaveBeenCalledWith(
			expect.objectContaining({
				communityId:
					eventPublicationConfigurationFixture().destinations[1].communityId,
			}),
			publicationCredentialsFixture().ocgroups,
		);
		expect(challenge).not.toHaveBeenCalled();
		expect(meetup).not.toHaveBeenCalled();
	});
	it("rejects an OCGroups destination outside the configured URL allowlist", () => {
		// Arrange
		const f = fixture();
		const gateway = vi.spyOn(
			OcgroupsEventGatewayComposition.prototype,
			"create",
		);
		// Act
		const create = () =>
			new PublicationAdapterComposition().create(
				{
					...f.input,
					communityEventUrlPrefixes: [
						"https://community.example.test/cncf/group/other/event/",
					],
				},
				f.adapters[1],
			);
		// Assert
		expect(create).toThrow("Invalid OCGroups event URL prefix");
		expect(gateway).not.toHaveBeenCalled();
	});
});

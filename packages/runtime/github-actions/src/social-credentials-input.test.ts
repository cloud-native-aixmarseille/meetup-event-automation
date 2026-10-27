import * as core from "@actions/core";
import type { SocialDestination } from "@meetup-automation/communication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeInput } from "./runtime-input.js";
import { SocialCredentialsInput } from "./social-credentials-input.js";

vi.mock("@actions/core", () => ({ getInput: vi.fn(), setSecret: vi.fn() }));
const slack: SocialDestination = {
	key: "engineering",
	label: "Engineering",
	provider: "slack",
	workspaceId: "TEXAMPLE",
	channelId: "CEXAMPLE",
};
const linkedin: SocialDestination = {
	key: "page",
	label: "Community",
	provider: "linkedin",
	organizationUrn: "urn:li:organization:123",
};
const google = {
	type: "service_account",
	client_email: "service@example.test",
	private_key: "private-key",
};
const subject = new SocialCredentialsInput(new RuntimeInput());
beforeEach(() => vi.clearAllMocks());
describe("social credentials input", () => {
	it("allows Slack alone and binds each workspace to its own token", () => {
		// Arrange
		const destinations = [
			slack,
			{ ...slack, key: "other", workspaceId: "TOTHER" },
		];
		const value = {
			slack: { TEXAMPLE: "first-token", TOTHER: "second-token" },
		};
		// Act
		const result = subject.parse(JSON.stringify(value), destinations);
		// Assert
		expect(result).toEqual(value);
		expect(core.setSecret).toHaveBeenCalledWith("first-token");
		expect(core.setSecret).toHaveBeenCalledWith("second-token");
	});
	it("masks and serializes the LinkedIn media service account", () => {
		// Arrange
		const value = {
			linkedin: { accessToken: "linkedin-token", googleCredentials: google },
		};
		vi.mocked(core.getInput).mockReturnValue(JSON.stringify(value));
		// Act
		const result = subject.read([linkedin]);
		// Assert
		expect(result.linkedin).toEqual({
			accessToken: "linkedin-token",
			googleCredentials: JSON.stringify(google),
		});
		for (const secret of [
			"linkedin-token",
			"private-key",
			"service@example.test",
		])
			expect(core.setSecret).toHaveBeenCalledWith(secret);
	});
	it("requires no provider tokens when no destinations are configured", () => {
		// Arrange
		const value = "{}";
		// Act
		const result = subject.parse(value, []);
		// Assert
		expect(result).toEqual({});
	});
	it.each([
		["{", [slack]],
		["[]", [slack]],
		["{}", [slack]],
		['{"slack":{"TOTHER":"token"}}', [slack]],
		['{"slack":{"TEXAMPLE":""}}', [slack]],
		['{"slack":{"TEXAMPLE":"token"}}', []],
		['{"linkedin":{"accessToken":"token"}}', [linkedin]],
		[
			JSON.stringify({
				linkedin: {
					accessToken: "token",
					googleCredentials: google,
					refreshToken: "secret",
				},
			}),
			[linkedin],
		],
	] as const)(
		"rejects missing, malformed, or unrelated provider credentials",
		(value, destinations) => {
			// Arrange
			const text = value;
			// Act
			const parse = () => subject.parse(text, destinations);
			// Assert
			expect(parse).toThrow();
		},
	);
});

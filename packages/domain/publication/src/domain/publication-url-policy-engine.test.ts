import { describe, expect, it } from "vitest";
import { PublicationUrlPolicies } from "./publication-url-policies.js";
import { PublicationUrlPolicyEngine } from "./publication-url-policy-engine.js";

describe("publication URL policies", () => {
	it("accepts canonical provider references", () => {
		// Arrange
		const engine = new PublicationUrlPolicyEngine(
			PublicationUrlPolicies.createDefaultPublicationUrlPolicies(),
		);

		// Act
		const result = engine.evaluate({
			meetup:
				"https://www.meetup.com/cloud-native-aix-marseille/events/123456789",
			community:
				"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/cloud-native-evening",
			assets: "https://drive.google.com/drive/folders/abc_DEF-123",
		});

		// Assert
		expect(result.diagnostics).toEqual([]);
		expect(result.patch.operations).toEqual([]);
	});

	it("accepts the legacy CNCF community URL", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new PublicationUrlPolicyEngine(
			PublicationUrlPolicies.createDefaultPublicationUrlPolicies(),
		).evaluate({
			community:
				"https://community.cncf.io/events/details/cncf-cloud-native-aix-marseille-presents-platform-engineering",
		});

		// Assert
		expect(result.diagnostics).toEqual([]);
	});

	it("normalizes outer whitespace and trailing slashes immutably", () => {
		// Arrange
		const source = {
			meetup:
				" https://www.meetup.com/cloud-native-aix-marseille/events/123456789/ ",
		};

		// Act
		const result = new PublicationUrlPolicyEngine(
			PublicationUrlPolicies.createDefaultPublicationUrlPolicies(),
		).evaluate(source);

		// Assert
		expect(source.meetup).toBe(
			" https://www.meetup.com/cloud-native-aix-marseille/events/123456789/ ",
		);
		expect(result.references.meetup).toBe(
			"https://www.meetup.com/cloud-native-aix-marseille/events/123456789",
		);
		expect(result.patch.operations).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			code: "publication.meetup.normalized",
			fixAvailable: true,
		});
	});

	it.each([
		[
			"meetup",
			"https://www.meetup.com/cloud-native-aix-marseille/events/not-numeric",
			"publication.meetup-url.invalid",
		],
		[
			"community",
			"https://example.com/community/event",
			"publication.community-url.invalid",
		],
		[
			"assets",
			"http://drive.google.com/drive/folders/abc",
			"publication.asset-url.invalid",
		],
	] as const)("rejects invalid %s references", (field, value, expectedCode) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new PublicationUrlPolicyEngine(
			PublicationUrlPolicies.createDefaultPublicationUrlPolicies(),
		).evaluate({ [field]: value });

		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: expectedCode,
				field,
				severity: "error",
			}),
		);
		expect(result.patch.operations).toEqual([]);
	});
});

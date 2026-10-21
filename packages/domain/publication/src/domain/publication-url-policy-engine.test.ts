import { describe, expect, it } from "vitest";
import { createPublicationUrlPolicies } from "../../testing/publication-urls.fixtures.js";
import { PublicationDomainComposition } from "../dependency-composition.js";
import { PublicationUrlPolicyEngine } from "./publication-url-policy-engine.js";

describe("publication URL policies", () => {
	it("accepts canonical provider references", () => {
		// Arrange
		const engine = new PublicationUrlPolicyEngine(
			{
				publicationDiagnostics:
					new PublicationDomainComposition().publicationDiagnostics(),
			},
			createPublicationUrlPolicies(),
		);

		// Act
		const result = engine.evaluate({
			meetup: "https://www.meetup.com/example-meetups/events/123456789",
			community:
				"https://ocgroups.dev/cncf/group/example-meetups/event/cloud-native-evening",
			assets: "https://assets.example.test/folders/abc_DEF-123",
		});

		// Assert
		expect(result.diagnostics).toEqual([]);
		expect(result.patch.operations).toEqual([]);
	});

	it("accepts another explicitly configured community prefix", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new PublicationUrlPolicyEngine(
			{
				publicationDiagnostics:
					new PublicationDomainComposition().publicationDiagnostics(),
			},
			createPublicationUrlPolicies(),
		).evaluate({
			community: "https://community.example.test/events/platform-engineering",
		});

		// Assert
		expect(result.diagnostics).toEqual([]);
	});

	it("normalizes outer whitespace and trailing slashes immutably", () => {
		// Arrange
		const source = {
			meetup: " https://www.meetup.com/example-meetups/events/123456789/ ",
		};

		// Act
		const result = new PublicationUrlPolicyEngine(
			{
				publicationDiagnostics:
					new PublicationDomainComposition().publicationDiagnostics(),
			},
			createPublicationUrlPolicies(),
		).evaluate(source);

		// Assert
		expect(source.meetup).toBe(
			" https://www.meetup.com/example-meetups/events/123456789/ ",
		);
		expect(result.references.meetup).toBe(
			"https://www.meetup.com/example-meetups/events/123456789",
		);
		expect(result.patch.operations).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			code: "publication.meetup.normalized",
			fixAvailable: true,
		});
	});

	it.each([
		{
			prefixes: [
				"https://community.example.test/",
				"https://community.example.test/events/",
			],
		},
		{
			prefixes: [
				"https://community.example.test/events/",
				"https://community.example.test/",
			],
		},
	])(
		"accepts overlapping configured prefixes in either order: $prefixes",
		({ prefixes }) => {
			// Arrange
			const engine = new PublicationUrlPolicyEngine(
				{
					publicationDiagnostics:
						new PublicationDomainComposition().publicationDiagnostics(),
				},
				[new PublicationDomainComposition().communityEventUrlPolicy(prefixes)],
			);

			// Act
			const result = engine.evaluate({
				community: "https://community.example.test/events/platform-evening",
			});

			// Assert
			expect(result.diagnostics).toEqual([]);
		},
	);

	it.each([
		[
			"meetup",
			"https://www.meetup.com/cloud-native-aix-marseille/events/123456789",
			"publication.meetup-url.invalid",
		],
		[
			"community",
			"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/cloud-native-evening",
			"publication.community-url.invalid",
		],
		[
			"community",
			"https://community.cncf.io/events/details/cncf-cloud-native-aix-marseille-presents-platform-engineering",
			"publication.community-url.invalid",
		],
		[
			"assets",
			"https://drive.google.com/drive/folders/folder-1",
			"publication.asset-url.invalid",
		],
		[
			"meetup",
			"https://www.meetup.com/example-meetups/events/not-numeric",
			"publication.meetup-url.invalid",
		],
		[
			"community",
			"https://example.com/community/event",
			"publication.community-url.invalid",
		],
		[
			"assets",
			"http://assets.example.test/folders/abc",
			"publication.asset-url.invalid",
		],
	] as const)("rejects invalid %s references", (field, value, expectedCode) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const result = new PublicationUrlPolicyEngine(
			{
				publicationDiagnostics:
					new PublicationDomainComposition().publicationDiagnostics(),
			},
			createPublicationUrlPolicies(),
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

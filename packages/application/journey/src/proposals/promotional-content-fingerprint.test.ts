import { describe, expect, it } from "vitest";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";

describe("content revision identity", () => {
	it("ignores unrelated links when a title is applied", () => {
		// Arrange
		const f = contentFixture();
		// Act
		const changed = f.plans.create(
			"title",
			"fr",
			{
				...f.plan.facts,
				registrationUrl: "https://www.meetup.com/example/events/456/",
			},
			"09:00",
		);
		// Assert
		expect(changed.sourceFingerprint).toBe(f.plan.sourceFingerprint);
	});
	it("invalidates content after a material agenda change", () => {
		// Arrange
		const f = contentFixture();
		// Act
		const changed = f.plans.create(
			"title",
			"fr",
			{
				...f.plan.facts,
				talks: [{ ...f.plan.facts.talks[0], title: "Changed talk" }],
			},
			"09:00",
		);
		// Assert
		expect(changed.sourceFingerprint).not.toBe(f.plan.sourceFingerprint);
	});

	it.each([
		[
			"title",
			"c4ba2ce72fab30e23640aa9bb3c7a5b770585f7de068ce2f9b7b25126dddd34b",
		],
		[
			"description",
			"e6e567cee788022b4637627c5c7bad0b30b1be16b6652a92acbbfb1cd0db36a9",
		],
		[
			"cover",
			"7abcb9e26377debe83c3c06ffdfeee2936e55f872cb3b9e7bcd739312cdb3565",
		],
		[
			"slack-aix:d7",
			"6c61552019e2c66dd9a50107922037fa0160be7611bf05923eb810d1677f6c4e",
		],
	] as const)(
		"preserves the persisted v1 source identity for %s",
		(target, expected) => {
			// Arrange
			const fixture = contentFixture(target);
			// Act
			const fingerprint = fixture.fingerprints.source(fixture.plan);
			// Assert
			expect(fingerprint).toBe(expected);
		},
	);
	it.each([
		{ channelId: "COTHER" },
		{ workspaceId: "TOTHER" },
		{ label: "Another channel" },
	])(
		"invalidates approval when the configured destination changes %j",
		(change) => {
			// Arrange
			const f = contentFixture("slack-engineering:announcement");
			const destination = f.plan.destination;
			if (destination?.provider !== "slack")
				throw new Error("Missing Slack fixture");
			// Act
			const changed = f.plans.create(
				f.plan.target,
				"fr",
				f.plan.facts,
				"09:00",
				{ ...destination, ...change },
			);
			// Assert
			expect(changed.sourceFingerprint).not.toBe(f.plan.sourceFingerprint);
		},
	);
});

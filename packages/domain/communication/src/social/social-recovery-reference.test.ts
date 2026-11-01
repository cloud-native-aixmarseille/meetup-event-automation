import { describe, expect, it } from "vitest";
import type { SocialDestination } from "./social-destination.js";
import { SocialRecoveryReference } from "./social-recovery-reference.js";

const slack: SocialDestination = {
	key: "community",
	label: "Community",
	provider: "slack",
	workspaceId: "T123",
	channelId: "C123",
};
const linkedin: SocialDestination = {
	key: "page",
	label: "Page",
	provider: "linkedin",
	organizationUrn: "urn:li:organization:123",
};

describe("social recovery remote references", () => {
	it("extracts a Slack message timestamp without losing fractional digits", () => {
		// Arrange
		const references = new SocialRecoveryReference();
		const url = "https://community.slack.com/archives/C123/p1792497600000123";

		// Act
		const receipt = references.receipt(slack, url);

		// Assert
		expect(receipt).toEqual({
			provider: "slack",
			workspaceId: "T123",
			channelId: "C123",
			ts: "1792497600.000123",
			url,
		});
	});
	it.each([
		[
			"https://www.linkedin.com/feed/update/urn:li:share:456/",
			"urn:li:share:456",
		],
		[
			"https://www.linkedin.com/feed/update/urn:li:ugcPost:456/",
			"urn:li:ugcPost:456",
		],
		[
			"https://www.linkedin.com/feed/update/urn:li:activity:456/",
			"urn:li:activity:456",
		],
		[
			"https://www.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A456/",
			"urn:li:activity:456",
		],
		[
			"https://www.linkedin.com/posts/community-event-activity-456-publication/",
			"urn:li:activity:456",
		],
	])("preserves the LinkedIn remote identity from %s", (url, postUrn) => {
		// Arrange
		const references = new SocialRecoveryReference();

		// Act
		const receipt = references.receipt(linkedin, url);

		// Assert
		expect(receipt).toEqual({
			provider: "linkedin",
			organizationUrn: "urn:li:organization:123",
			postUrn,
			url,
		});
	});
	it.each([
		"https://community.slack.com/archives/C999/p1792497600123456",
		"https://community.slack.com.attacker.test/archives/C123/p1792497600123456",
		"https://nested.community.slack.com/archives/C123/p1792497600123456",
		"http://community.slack.com/archives/C123/p1792497600123456",
		"https://token@community.slack.com/archives/C123/p1792497600123456",
		"https://community.slack.com/archives/C123/p1792497600123456?token=private",
		"https://community.slack.com/archives/C123/p1792497600123456#fragment",
		"https://community.slack.com/archives/C123/p1792497600123",
		"https://community.slack.com/archives/C123/p0000000000123456",
		" https://community.slack.com/archives/C123/p1792497600123456",
	])("rejects an unsafe or mismatched Slack reference %s", (url) => {
		// Arrange
		const references = new SocialRecoveryReference();

		// Act
		const parse = () => references.receipt(slack, url);

		// Assert
		expect(parse).toThrow();
	});
	it.each([
		"https://www.linkedin.com.attacker.test/feed/update/urn:li:share:456/",
		"https://www.linkedin.com/feed/update/urn:li:organization:456/",
		"https://www.linkedin.com/feed/update/urn:li:activity:0/",
		"https://www.linkedin.com/feed/update/urn:li:activity:00456/",
		"https://www.linkedin.com/posts/community-event-activity-0-publication/",
		"https://www.linkedin.com/feed/update/urn:li:share:456/?tracking=private",
		"https://www.linkedin.com/feed/update/%invalid/",
	])("rejects an invalid LinkedIn post reference %s", (url) => {
		// Arrange
		const references = new SocialRecoveryReference();

		// Act
		const parse = () => references.receipt(linkedin, url);

		// Assert
		expect(parse).toThrow();
	});
	it("accepts a GitHub organizer evidence comment for non-publication", () => {
		// Arrange
		const references = new SocialRecoveryReference();

		// Act
		const parse = () =>
			references.evidence(
				"https://github.com/example/events/issues/42#issuecomment-100",
			);

		// Assert
		expect(parse).not.toThrow();
	});
	it.each([
		"https://github.com/example/events/issues/42",
		"https://github.com/example/events/issues/42#discussion-100",
		"https://github.com/example/events/issues/42?token=private#issuecomment-100",
		"https://github.com/example/events/issues/0#issuecomment-100",
		"https://github.com/example/events/issues/42#issuecomment-0",
		"https://github.com.attacker.test/example/events/issues/42#issuecomment-100",
		"https://github.com/example/events/pull/42#issuecomment-100",
		"https://private@github.com/example/events/issues/42#issuecomment-100",
	])("requires an explicit usable GitHub evidence comment %s", (url) => {
		// Arrange
		const references = new SocialRecoveryReference();

		// Act
		const parse = () => references.evidence(url);

		// Assert
		expect(parse).toThrow();
	});
});

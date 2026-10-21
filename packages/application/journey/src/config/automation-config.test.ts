import { describe, expect, it } from "vitest";
import { AutomationConfigFactory } from "./automation-config.js";

describe("opinionated automation configuration", () => {
	it("owns the meetup conventions", () => {
		// Arrange
		const repositoryOwner = "example-community";

		// Act
		const result = new AutomationConfigFactory().createAutomationConfig(
			repositoryOwner,
		);

		// Assert
		expect(result).toMatchObject({
			timezone: "Europe/Paris",
			event: {
				"issue-label": "meetup",
				"issue-form": ".github/ISSUE_TEMPLATE/meetup.yml",
				"occurrence-status-field": "event_status",
				"required-confirmation-labels": [
					"hoster:confirmed",
					"speakers:confirmed",
				],
			},
			referentials: {
				hosts: "referentials/hosting.csv",
				speakers: "referentials/speakers.csv",
			},
			communication: {
				"mailings-repository": "example-community/mailings",
				"dispatch-enabled": true,
				"policy-version": 1,
			},
		});
	});
	it("disables communication for repository-independent workspace operations", () => {
		// Arrange
		// No repository owner is available for a standalone workspace operation.

		// Act
		const result = new AutomationConfigFactory().createAutomationConfig();

		// Assert
		expect(result.communication).toMatchObject({
			"mailings-repository": "",
			"dispatch-enabled": false,
		});
	});
});

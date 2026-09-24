import { describe, expect, it } from "vitest";
import { AutomationConfigFactory } from "./automation-config.js";

describe("opinionated automation configuration", () => {
	it("owns the meetup conventions", () => {
		// Arrange
		const repositoryOwner = "example-community";

		// Act
		const result =
			AutomationConfigFactory.createAutomationConfig(repositoryOwner);

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
				"approval-label": "communication:approved",
				"readiness-window-days": 7,
				"mailings-repository": "example-community/mailings",
				"slack-enabled": true,
				"dispatch-enabled": true,
				"policy-version": 1,
			},
			publication: {
				"meetup-event-url-prefix":
					"https://www.meetup.com/cloud-native-aix-marseille/events/",
				"cncf-event-url-prefix":
					"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/",
			},
		});
	});
	it("disables communication for repository-independent workspace operations", () => {
		// Arrange
		// No repository owner is available for a standalone workspace operation.

		// Act
		const result = AutomationConfigFactory.createAutomationConfig();

		// Assert
		expect(result.communication).toMatchObject({
			"mailings-repository": "",
			"dispatch-enabled": false,
		});
	});
});

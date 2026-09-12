import { describe, expect, it } from "vitest";
import { createAutomationConfig, resultEnvelope } from "../src/index.js";

describe("opinionated automation configuration", () => {
	it("owns the meetup conventions", () => {
		const result = createAutomationConfig();

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
				"mailings-repository": "cloud-native-aixmarseille/mailings",
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
});

describe("result envelope", () => {
	it("uses a stable schema and diagnostic status", () => {
		expect(
			resultEnvelope({ changed: false }, [
				{
					code: "event.title.missing",
					severity: "error",
					message: "An event title is required",
				},
			]),
		).toMatchObject({ schemaVersion: 1, status: "diagnostics" });
	});
});

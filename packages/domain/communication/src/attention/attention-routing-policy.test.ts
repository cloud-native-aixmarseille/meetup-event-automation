import { describe, expect, it } from "vitest";
import { condition } from "../../testing/attention.fixtures.js";
import { CommunicationDomainComposition } from "../dependency-composition.js";
import type { AttentionEpisode } from "./model.js";
import { AttentionRoutingPolicy } from "./attention-routing-policy.js";

describe("fresh attention notification routing", () => {
	it.each([
		["host-confirmation", "preparation", "host", "2099-06-01T10:00:00Z", false],
		["host-confirmation", "preparation", "host", "2099-06-05T10:00:00Z", false],
		["host-confirmation", "preparation", "host", "2099-06-07T10:00:00Z", true],
		["host-confirmation", "preparation", "host", "2099-06-08T10:00:00Z", true],
		["approval-pending", "approval", "review", "2099-06-01T10:00:00Z", false],
		["approval-pending", "approval", "review", "2099-06-02T10:00:00Z", true],
		[
			"approval-pending",
			"daily",
			"social-publication:review",
			"2099-06-01T10:00:00Z",
			true,
		],
		["integration-failure", "daily", "assets", "2099-06-01T10:00:00Z", true],
		[
			"integration-failure",
			"daily",
			"event-data",
			"2099-06-01T10:00:00Z",
			false,
		],
		["delivery-recovery", "daily", "uncertain", "2099-06-01T10:00:00Z", true],
		["follow-up", "follow-up", "thank-host", "2099-06-09T10:00:00Z", false],
		["stage-unknown", "none", "assets", "2099-06-01T10:00:00Z", false],
	] as const)(
		"routes %s/%s at %s %s",
		(code, cadence, resource, instant, expected) => {
			// Arrange
			const policy = new AttentionRoutingPolicy(
				new CommunicationDomainComposition().attentionPolicy(),
			);
			const episode: AttentionEpisode = {
				condition: condition({
					code,
					policy: cadence,
					resource,
					severity: "error",
				}),
				episode: 1,
				openedAt: "2099-06-01T10:00:00Z",
				status: "active",
			};
			// Act
			const urgent = policy.urgent([episode], "2099-06-08", new Date(instant));
			// Assert
			expect(urgent).toBe(expected);
		},
	);
	it("leaves an empty due set quiet", () => {
		// Arrange
		const policy = new AttentionRoutingPolicy(
			new CommunicationDomainComposition().attentionPolicy(),
		);
		// Act
		const urgent = policy.urgent(
			[],
			"2099-06-08",
			new Date("2099-06-08T10:00:00Z"),
		);
		// Assert
		expect(urgent).toBe(false);
	});
});

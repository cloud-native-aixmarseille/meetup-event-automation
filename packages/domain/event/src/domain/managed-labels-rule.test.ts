import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { EventDomainComposition } from "../dependency-composition.js";
import { ManagedLabelsRule } from "./managed-labels-rule.js";
import { DEFAULT_MANAGED_LABEL_CONFIGURATION } from "./rule-contracts.js";

describe("managed host labels", () => {
	it.each([
		{ displayName: "Example host" },
		{ id: "host-0001", displayName: "Example host" },
	])("does not ask for a host when one is selected: %j", (host) => {
		// Arrange
		const event = createTestEvent({
			host,
			labels: ["meetup", "hoster:needed", "custom"],
			confirmations: { speakers: false },
		});
		const rule = new ManagedLabelsRule(
			{
				eventRuleResults: new EventDomainComposition().eventRuleResults(),
				eventPatches: new EventDomainComposition().eventPatches(),
			},
			DEFAULT_MANAGED_LABEL_CONFIGURATION,
		);

		// Act
		const result = new EventDomainComposition()
			.eventPatches()
			.applyEventPatch(event, rule.evaluate(event).patch);

		// Assert
		expect(result.labels).toEqual(["custom", "meetup", "speakers:needed"]);
	});
	it.each([undefined, { displayName: "   " }])(
		"removes obsolete host labels regardless of selection: %j",
		(host) => {
			// Arrange
			const event = createTestEvent({
				host,
				labels: ["meetup", "hoster:needed", "hoster:confirmed", "custom"],
				confirmations: { speakers: true },
			});
			const rule = new ManagedLabelsRule(
				{
					eventRuleResults: new EventDomainComposition().eventRuleResults(),
					eventPatches: new EventDomainComposition().eventPatches(),
				},
				DEFAULT_MANAGED_LABEL_CONFIGURATION,
			);

			// Act
			const result = new EventDomainComposition()
				.eventPatches()
				.applyEventPatch(event, rule.evaluate(event).patch);

			// Assert
			expect(result.labels).toEqual(["custom", "meetup", "speakers:confirmed"]);
			expect(result.labels).not.toContain("hoster:needed");
			expect(result.labels).not.toContain("hoster:confirmed");
		},
	);
});

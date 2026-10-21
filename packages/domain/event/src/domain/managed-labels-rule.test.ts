import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { ManagedLabelsRule } from "./managed-labels-rule.js";
import { DEFAULT_MANAGED_LABEL_CONFIGURATION } from "./rule-contracts.js";
import { EventPatches } from "./patch.js";

describe("managed host labels", () => {
	it.each([
		{ displayName: "Example host" },
		{ id: "host-0001", displayName: "Example host" },
	])("does not ask for a host when one is selected: %j", (host) => {
		// Arrange
		const event = createTestEvent({
			host,
			labels: ["meetup", "hoster:needed", "custom"],
			confirmations: { host: false, speakers: false },
		});
		const rule = new ManagedLabelsRule(DEFAULT_MANAGED_LABEL_CONFIGURATION);

		// Act
		const result = EventPatches.applyEventPatch(
			event,
			rule.evaluate(event).patch,
		);

		// Assert
		expect(result.labels).toEqual(["custom", "meetup", "speakers:needed"]);
		expect(result.confirmations.host).toBe(false);
	});
	it.each([undefined, { displayName: "   " }])(
		"requests a host when the selection is empty: %j",
		(host) => {
			// Arrange
			const event = createTestEvent({
				host,
				confirmations: { host: false, speakers: true },
			});
			const rule = new ManagedLabelsRule(DEFAULT_MANAGED_LABEL_CONFIGURATION);

			// Act
			const result = EventPatches.applyEventPatch(
				event,
				rule.evaluate(event).patch,
			);

			// Assert
			expect(result.labels).toContain("hoster:needed");
			expect(result.labels).not.toContain("hoster:confirmed");
		},
	);
});

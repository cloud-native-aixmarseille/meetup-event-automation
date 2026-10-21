import { describe, expect, it } from "vitest";
import { EventChecklists } from "./event-checklists.js";
import type { EventOperationalChecklists } from "./model.js";

describe("EventChecklists", () => {
	it("ignores object property order", () => {
		// Arrange
		const left: EventOperationalChecklists = {
			slidesAndContent: [],
			communication: [{ name: "Publish", completed: false }],
			postEvent: [],
		};
		const right: EventOperationalChecklists = {
			postEvent: [],
			communication: [{ completed: false, name: "Publish" }],
			slidesAndContent: [],
		};

		// Act
		const equal = EventChecklists.equal(left, right);

		// Assert
		expect(equal).toBe(true);
	});

	it.each(["slidesAndContent", "communication", "postEvent"] as const)(
		"detects completion changes in %s",
		(kind) => {
			// Arrange
			const left: EventOperationalChecklists = {
				slidesAndContent: [],
				communication: [],
				postEvent: [],
				[kind]: [{ name: "Publish", completed: false }],
			};
			const right = { ...left, [kind]: [{ name: "Publish", completed: true }] };

			// Act
			const equal = EventChecklists.equal(left, right);

			// Assert
			expect(equal).toBe(false);
		},
	);
});

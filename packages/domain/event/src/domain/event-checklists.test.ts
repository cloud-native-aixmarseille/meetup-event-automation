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
		const equal = new EventChecklists().equal(left, right);

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
			const equal = new EventChecklists().equal(left, right);

			// Assert
			expect(equal).toBe(false);
		},
	);
});

describe("checklist task identity", () => {
	it.each(["slidesAndContent", "communication", "postEvent"] as const)(
		"ignores presentation order within %s",
		(section) => {
			// Arrange
			const left: EventOperationalChecklists = {
				slidesAndContent: [],
				communication: [],
				postEvent: [],
				[section]: [
					{ name: "Share slides", completed: true },
					{ name: "Thank host", completed: true },
					{ name: "Publish recap", completed: false },
				],
			};
			const right = { ...left, [section]: [...left[section]].reverse() };
			// Act
			const equal = new EventChecklists().equal(left, right);
			// Assert
			expect(equal).toBe(true);
			expect(left[section][0].name).toBe("Share slides");
		},
	);

	it.each(
		[
			[{ name: "A", completed: true }],
			[
				{ name: "A", completed: true },
				{ name: "B", completed: false },
			],
			[
				{ name: "A", completed: true },
				{ name: "A", completed: true },
			],
			[
				{ name: "A", completed: false },
				{ name: "A", completed: false },
			],
		].map((items) => ({ items })),
	)("detects changed tasks, completion or duplicate counts %#", ({ items }) => {
		// Arrange
		const left: EventOperationalChecklists = {
			slidesAndContent: [],
			communication: [],
			postEvent: [
				{ name: "A", completed: true },
				{ name: "A", completed: false },
			],
		};
		const right = { ...left, postEvent: items };
		// Act
		const equal = new EventChecklists().equal(left, right);
		// Assert
		expect(equal).toBe(false);
	});
});

import { describe, expect, it } from "vitest";
import {
	contentFixture,
	facts,
	media,
} from "../../testing/promotional-content.fixtures.js";

describe("promotional content prerequisites", () => {
	it.each(["title", "description"] as const)(
		"generates %s from public facts without existing promotional fields",
		(target) => {
			// Arrange
			const f = contentFixture(target);
			// Act
			const ready = f.policy.ready(f.plan);
			// Assert
			expect(ready).toBe(true);
			expect(f.plan.facts).not.toHaveProperty("eventTitle");
			expect(f.plan.facts).not.toHaveProperty("description");
		},
	);
	it("accepts a month without topics for cover art", () => {
		// Arrange
		const f = contentFixture("cover");
		const plan = f.plans.create(
			"cover",
			"fr",
			{ ...facts, talks: [], date: "", host: { name: "", city: "" } },
			"09:00",
		);
		// Act
		const ready = f.policy.ready(plan);
		// Assert
		expect(ready).toBe(true);
	});
	it("requires the exact announcement identity as well as its bytes", () => {
		// Arrange
		const f = contentFixture("linkedin:announcement");
		const plan = f.plans.create(
			"linkedin:announcement",
			"fr",
			{ ...facts, announcement: media },
			"09:00",
		);
		// Act
		const valid = f.policy.validDraft(plan, {
			text: `Register: ${facts.registrationUrl}`,
			media: [{ ...media, sourceRevision: "different" }],
		});
		// Assert
		expect(valid).toBe(false);
	});
});

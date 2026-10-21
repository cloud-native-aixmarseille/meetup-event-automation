import { describe, expect, it } from "vitest";
import { OrganizerDiagnosticPolicy } from "./organizer-diagnostic-policy.js";
import type { PublicDiagnostic } from "./result-envelope.js";

const diagnostic: PublicDiagnostic = {
	code: "communication.feedback-fetch-failed",
	severity: "error",
	message: "private@example.test",
};
describe("organizer diagnostic root causes", () => {
	it.each([
		["publication.assets.prerequisites", "event.date.missing"],
		["publication.feedback.agenda", "event.proposals.not-found"],
		["communication.feedback-unavailable", "publication.feedback.agenda"],
		["communication.slides-unavailable", "publication.assets.content.conflict"],
	])("hides derivative %s when %s explains its cause", (code, cause) => {
		// Arrange
		const item = { ...diagnostic, code };
		const diagnostics = [item, { ...diagnostic, code: cause }];

		// Act
		const suppressed = OrganizerDiagnosticPolicy.suppressed(item, diagnostics);

		// Assert
		expect(suppressed).toBe(true);
	});

	it("keeps prerequisite guidance when its cause was not reported", () => {
		// Arrange
		const item = { ...diagnostic, code: "publication.assets.prerequisites" };

		// Act
		const suppressed = OrganizerDiagnosticPolicy.suppressed(item, [item]);

		// Assert
		expect(suppressed).toBe(false);
	});

	it("keeps prerequisite guidance after its reported cause was fixed", () => {
		// Arrange
		const item = { ...diagnostic, code: "publication.assets.prerequisites" };
		const diagnostics = [
			item,
			{ ...diagnostic, code: "event.date.missing", fixApplied: true },
		];

		// Act
		const suppressed = OrganizerDiagnosticPolicy.suppressed(item, diagnostics);

		// Assert
		expect(suppressed).toBe(false);
	});
});

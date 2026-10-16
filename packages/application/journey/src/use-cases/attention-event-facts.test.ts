import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../../../domain/event/testing/event.fixtures.js";
import { AutomationConfigFactory } from "../config/automation-config.js";
import { AttentionEventFacts } from "./attention-event-facts.js";
describe("public attention event facts", () => {
	it.each([
		"Thanks speakers",
		"Thanks speakers and share openfeedback reports",
	])("recognizes completed legacy email tasks: %s", (speakerTask) => {
		// Arrange
		const event = createTestEvent({
			operationalChecklists: {
				communication: [],
				slidesAndContent: [],
				postEvent: [
					{ name: "Thanks hoster", completed: true },
					{ name: speakerTask, completed: true },
				],
			},
		});
		// Act
		const result = AttentionEventFacts.create(
			{ event, diagnostics: [] },
			AutomationConfigFactory.createAutomationConfig(),
		);
		// Assert
		expect(result.followUpPending).toEqual([
			"share-slides",
			"import-attendance",
			"share-social",
		]);
	});
	it("maps unfinished manual tasks to safe identifiers without arbitrary checklist text", () => {
		// Arrange
		const event = createTestEvent({
			operationalChecklists: {
				slidesAndContent: [],
				communication: [
					{ name: "Slack - OpenBaR", completed: false },
					{ name: "private@example.test", completed: false },
				],
				postEvent: [],
			},
		});
		// Act
		const result = AttentionEventFacts.create(
			{ event, diagnostics: [] },
			AutomationConfigFactory.createAutomationConfig(),
		);
		// Assert
		expect(result.publicationPending).toContain("public-slack-community");
		expect(result.followUpPending).toContain("thank-host");
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});
	it("projects invalid imported dates as missing data without publishing their text", () => {
		// Arrange
		const event = createTestEvent({ date: "private@example.test" });
		// Act
		const result = AttentionEventFacts.create(
			{ event, diagnostics: [] },
			AutomationConfigFactory.createAutomationConfig(),
		);
		// Assert
		expect(result.eventDate).toBe("");
		expect(result.requiredDataMissing).toBe(true);
	});
});

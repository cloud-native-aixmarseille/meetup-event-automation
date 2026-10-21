import { describe, expect, it } from "vitest";
import { runtimeInput } from "../testing/communication.fixtures.js";
import { CommunicationInput } from "./communication-input.js";

describe("communication invocation input", () => {
	it.each([
		"locale",
		"githubToken",
		"mailingsToken",
		"slackToken",
		"openFeedbackApiKey",
	] as const)("requires explicit nonempty %s", (field) => {
		// Arrange
		const input = { ...runtimeInput("/synthetic/workspace"), [field]: "  " };

		// Act
		const validate = () => CommunicationInput.validate(input);

		// Assert
		expect(validate).toThrow(`Input required and not supplied: ${field}`);
	});
	it.each([true, false])(
		"accepts the explicit slides-ready value %s",
		(slidesReady) => {
			// Arrange
			const input = runtimeInput("/synthetic/workspace", { slidesReady });

			// Act
			const validate = () => CommunicationInput.validate(input);

			// Assert
			expect(validate).not.toThrow();
		},
	);
});

import { describe, expect, it } from "vitest";
import { SpeakerSynchronizationError } from "./speaker-synchronization-error.js";
import { SpeakerSynchronizationStageRunner } from "./speaker-synchronization-stage-runner.js";

describe("SpeakerSynchronizationStageRunner", () => {
	it("retains a failed operation's stage and cause", async () => {
		// Arrange
		const cause = new Error("private details");

		// Act
		const result = new SpeakerSynchronizationStageRunner().at(
			"read-catalog",
			() => {
				throw cause;
			},
		);

		// Assert
		await expect(result).rejects.toMatchObject({
			stage: "read-catalog",
			cause,
		});
	});
	it("preserves classified validation diagnostics", async () => {
		// Arrange
		const error = new SpeakerSynchronizationError(
			"validate-catalog",
			undefined,
			[
				{
					code: "referential.speaker.email.invalid",
					severity: "error",
					field: "speakers[0].email",
					message: "Speaker email address is invalid.",
				},
			],
		);

		// Act
		const result = new SpeakerSynchronizationStageRunner().at(
			"validate-catalog",
			() => {
				throw error;
			},
		);

		// Assert
		await expect(result).rejects.toBe(error);
	});
});

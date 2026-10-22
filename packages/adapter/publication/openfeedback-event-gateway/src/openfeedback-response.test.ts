import { describe, expect, it } from "vitest";
import { OpenFeedbackResponse } from "./openfeedback-response.js";

describe("OpenFeedback response", () => {
	it("does not expose provider error bodies", async () => {
		// Arrange
		const response = new Response("private provider payload", { status: 403 });

		// Act
		const operation = new OpenFeedbackResponse().read(response, "event-1");

		// Assert
		await expect(operation).rejects.toThrow(
			/^OpenFeedback request failed \(HTTP 403\)$/,
		);
	});
});

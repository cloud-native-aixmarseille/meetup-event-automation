import { describe, expect, it } from "vitest";
import { ActionFailurePresenter } from "./action-failure-presenter.js";

describe("public action failure presentation", () => {
	it("redacts unexpected exception messages", () => {
		// Arrange
		const error = new Error("email@example.test");

		// Act
		const message = new ActionFailurePresenter().publicErrorMessage(error);

		// Assert
		expect(message).not.toContain(error.message);
	});
	it("passes through only allow-listed error classes", () => {
		// Arrange
		const known = new Error("configuration is invalid");
		known.name = "EventNotFoundError";

		// Act
		const actual = new ActionFailurePresenter().publicErrorMessage(known);
		const actual1 = new ActionFailurePresenter().publicErrorMessage({
			message: "contact@example.test",
		});

		// Assert
		expect(actual).toBe("EventNotFoundError: configuration is invalid");
		expect(actual1).toBe("Unexpected technical failure.");
	});
});

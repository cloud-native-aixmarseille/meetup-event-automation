import { describe, expect, it } from "vitest";
import { ActionFailurePresenter } from "./action-failure-presenter.js";
import { RuntimeInputError } from "./runtime-input-error.js";

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
		expect(actual1).toBe("thrown=object");
	});
	it("retains explicit schema failures", () => {
		// Arrange
		const error = new RuntimeInputError(
			"stage-results.event.diagnostics",
			"must be an array",
		);

		// Act
		const message = new ActionFailurePresenter().publicErrorMessage(error);

		// Assert
		expect(message).toBe(
			"RuntimeInputError: stage-results.event.diagnostics must be an array",
		);
	});
	it("reports error types, HTTP status, network causes and bundle locations without private payloads", () => {
		// Arrange
		const cause = Object.assign(new Error("Bearer PRIVATE_TOKEN"), {
			code: "ECONNRESET",
		});
		const error = Object.assign(
			new TypeError("private@example.test", { cause }),
			{ status: 503 },
		);
		error.stack =
			"TypeError: private@example.test\n    at PRIVATE_FUNCTION (/home/PRIVATE_PATH/actions/event/reconcile/dist/index.js:120:34)\n    at PRIVATE_FUNCTION (https://private.example.test/PRIVATE_TOKEN:12:3)";
		cause.stack = "Error: Bearer PRIVATE_TOKEN";

		// Act
		const message = new ActionFailurePresenter().publicErrorMessage(error);

		// Assert
		expect(message).toContain("error=TypeError");
		expect(message).toContain("status=503");
		expect(message).toContain("cause=error=Error");
		expect(message).toContain("code=ECONNRESET");
		expect(message).toContain(
			"at=actions/event/reconcile/dist/index.js:120:34",
		);
		expect(message).not.toMatch(/private|PRIVATE/);
	});
	it("rejects arbitrary error names, codes, statuses and cyclic cause payloads", () => {
		// Arrange
		const error = Object.assign(new Error("PRIVATE_MESSAGE"), {
			name: "PRIVATE_NAME",
			code: "PRIVATE_CODE",
			status: "PRIVATE_STATUS",
		});
		error.cause = error;
		error.stack = "PRIVATE_STACK";

		// Act
		const message = new ActionFailurePresenter().publicErrorMessage(error);

		// Assert
		expect(message).toBe("error=Error message=redacted");
		expect(message).not.toContain("PRIVATE");
	});
});

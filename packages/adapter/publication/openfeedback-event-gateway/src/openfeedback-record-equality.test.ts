import { describe, expect, it } from "vitest";
import { OpenFeedbackRecordEquality } from "./openfeedback-record-equality.js";

describe("OpenFeedbackRecordEquality", () => {
	it("ignores speaker ordering and unmanaged provider metadata", () => {
		// Arrange
		const first = { id: "talk-1", title: "Example", speakers: ["a", "b"] };
		const second = {
			speakers: ["b", "a"],
			title: "Example",
			id: "talk-1",
			votes: 12,
		};

		// Act
		const equal = new OpenFeedbackRecordEquality().equal(first, second);

		// Assert
		expect(equal).toBe(true);
	});

	it.each([
		{ id: "talk-2", title: "Example", speakers: ["a"] },
		{ id: "talk-1", title: "Changed", speakers: ["a"] },
		{ id: "talk-1", title: "Example", speakers: ["b"] },
		{ id: "talk-1", title: "Example", speakers: ["a", "a"] },
		{ id: "talk-1", name: "Example" },
	])("compares managed identities, fields and variants %#", (second) => {
		// Arrange
		const first = { id: "talk-1", title: "Example", speakers: ["a"] };

		// Act
		const equal = new OpenFeedbackRecordEquality().equal(first, second);

		// Assert
		expect(equal).toBe(false);
	});
});

import { describe, expect, it } from "vitest";
import { storedSnapshot as snapshot } from "../testing/feedback-agenda.fixtures.js";
import { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";

describe("feedback agenda response validation", () => {
	it("accepts a revision and consistent talk and speaker identities", () => {
		// Arrange
		const body = { id: "event-1", ...snapshot };

		// Act
		const parsed = OpenFeedbackAgendaSnapshot.parse(body);

		// Assert
		expect(parsed).toEqual(snapshot);
	});

	it.each([
		{ speakers: [{ ...snapshot.speakers[0], revision: "invalid" }] },
		{ speakers: null },
		{ talks: {} },
		{ speakers: [{ id: "bad/id", name: "Alex" }] },
		{ speakers: [snapshot.speakers[0], snapshot.speakers[0]] },
		{ talks: [{ ...snapshot.talks[0], speakers: ["missing"] }] },
		{ talks: [{ ...snapshot.talks[0], speakers: "manual-speaker" }] },
		{ talks: [{ ...snapshot.talks[0], title: " " }] },
	])("rejects malformed snapshots: %j", (changes) => {
		// Arrange
		const body = { ...snapshot, ...changes };

		// Act
		const parse = () => OpenFeedbackAgendaSnapshot.parse(body);

		// Assert
		expect(parse).toThrow("Invalid OpenFeedback agenda response");
	});
});

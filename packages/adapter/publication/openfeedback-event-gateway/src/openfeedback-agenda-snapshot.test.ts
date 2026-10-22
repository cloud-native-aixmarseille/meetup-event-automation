import { describe, expect, it } from "vitest";
import { storedSnapshot as snapshot } from "../testing/feedback-agenda.fixtures.js";
import { OpenfeedbackEventGatewayComposition } from "./dependency-composition.js";
import { OpenFeedbackAgendaSnapshot } from "./openfeedback-agenda-snapshot.js";

describe("feedback agenda response validation", () => {
	it("accepts a revision and consistent talk and speaker identities", () => {
		// Arrange
		const body = { id: "event-1", ...snapshot };

		// Act
		const parsed = new OpenFeedbackAgendaSnapshot({
			openFeedbackResourceId:
				new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
		}).parse(body);

		// Assert
		expect(parsed).toEqual(snapshot);
	});

	it.each([
		{ speakers: [{ ...snapshot.speakers[0], revision: "invalid" }] },
		{ speakers: null },
		{ talks: {} },
		{ speakers: [{ ...snapshot.speakers[0], id: "bad/id" }] },
		{ speakers: [snapshot.speakers[0], snapshot.speakers[0]] },
		{ talks: [{ ...snapshot.talks[0], speakers: [42] }] },
		{ talks: [{ ...snapshot.talks[0], speakers: "manual-speaker" }] },
		{ talks: [{ ...snapshot.talks[0], title: null }] },
	])("rejects malformed snapshots: %j", (changes) => {
		// Arrange
		const body = { ...snapshot, ...changes };

		// Act
		const parse = () =>
			new OpenFeedbackAgendaSnapshot({
				openFeedbackResourceId:
					new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
			}).parse(body);

		// Assert
		expect(parse).toThrow("Invalid OpenFeedback agenda response");
	});

	it.each([undefined, "", " "])(
		"accepts incomplete record text: %j",
		(text) => {
			// Arrange
			const body = {
				speakers: [{ ...snapshot.speakers[0], name: text }],
				talks: [{ ...snapshot.talks[0], title: text }],
			};

			// Act
			const parsed = new OpenFeedbackAgendaSnapshot({
				openFeedbackResourceId:
					new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
			}).parse(body);

			// Assert
			expect(parsed.speakers[0].name).toBe(text ?? "");
			expect(parsed.talks[0].title).toBe(text ?? "");
		},
	);

	it("retains stored associations to missing speakers", () => {
		// Arrange
		const speakers = ["deleted-speaker", "deleted-speaker"];
		const body = {
			...snapshot,
			talks: [{ ...snapshot.talks[0], speakers }],
		};

		// Act
		const parsed = new OpenFeedbackAgendaSnapshot({
			openFeedbackResourceId:
				new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
		}).parse(body);

		// Assert
		expect(parsed.talks[0].speakers).toEqual(speakers);
	});
});

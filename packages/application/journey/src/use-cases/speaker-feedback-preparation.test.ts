import type { MailRecipient } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import { SpeakerFeedbackPreparation } from "./speaker-feedback-preparation.js";

const held = {
	...event,
	publicationLinks: {
		...event.publicationLinks,
		feedback: "https://openfeedback.io/event-1",
	},
	operationalChecklists: {
		...event.operationalChecklists,
		postEvent: [{ name: "Mail thanks speakers", completed: false }],
	},
};
const recipients: readonly MailRecipient[] = [
	{
		channel: "mail",
		role: "hosting",
		recipientId: "contact-0001",
		email: "host@example.test",
		receivesCommunications: true,
	},
	{
		channel: "mail",
		role: "speaker",
		recipientId: "speaker-0001",
		email: "first@example.test",
		receivesCommunications: true,
		placeholders: { speakerName: "First" },
	},
	{
		channel: "mail",
		role: "speaker",
		recipientId: "speaker-0002",
		email: "second@example.test",
		receivesCommunications: true,
	},
];
const talks = [
	{
		title: "Shared talk",
		url: "https://openfeedback.io/event-1/0/shared?displayVotes=true",
		speakerIds: ["speaker-0001", "speaker-0002"],
	},
	{
		title: "Solo talk",
		url: "https://openfeedback.io/event-1/0/solo?displayVotes=true",
		speakerIds: ["speaker-0001"],
	},
];

describe("speaker feedback email preparation", () => {
	it("includes every relevant talk for each speaker without leaking another speaker's talks", async () => {
		// Arrange
		const gateway = { resolve: vi.fn().mockResolvedValue(talks) };
		const diagnostics: CommunicationJourneyDiagnostic[] = [];
		const preparation = new SpeakerFeedbackPreparation(gateway);

		// Act
		const result = await preparation.execute(held, recipients, diagnostics);

		// Assert
		expect(result[0]).toEqual(recipients[0]);
		expect(result[1]?.placeholders).toEqual({
			speakerName: "First",
			speakerFeedbackTalks: talks.map(({ title, url }) => ({ title, url })),
		});
		expect(result[2]?.placeholders?.speakerFeedbackTalks).toEqual([
			{ title: talks[0]?.title, url: talks[0]?.url },
		]);
		expect(diagnostics).toEqual([]);
	});

	it.each(["scheduled", "completed"])(
		"does not read feedback for %s emails",
		async (state) => {
			// Arrange
			const gateway = { resolve: vi.fn() };
			const diagnostics: CommunicationJourneyDiagnostic[] = [];
			const input =
				state === "scheduled"
					? { ...held, occurrenceStatus: "scheduled" as const }
					: event;

			// Act
			const result = await new SpeakerFeedbackPreparation(gateway).execute(
				input,
				recipients,
				diagnostics,
			);

			// Assert
			expect(result).toEqual(recipients);
			expect(gateway.resolve).not.toHaveBeenCalled();
			expect(diagnostics).toEqual([]);
		},
	);

	it.each(["missing-link", "provider-failure", "missing-speaker"])(
		"holds the batch with a safe diagnostic for %s",
		async (failure) => {
			// Arrange
			const gateway = {
				resolve:
					failure === "provider-failure"
						? vi.fn().mockRejectedValue(new Error("private provider response"))
						: vi.fn().mockResolvedValue([]),
			};
			const diagnostics: CommunicationJourneyDiagnostic[] = [];
			const input =
				failure === "missing-link" ? { ...held, publicationLinks: {} } : held;

			// Act
			const result = await new SpeakerFeedbackPreparation(gateway).execute(
				input,
				recipients,
				diagnostics,
			);

			// Assert
			expect(result).toEqual(recipients);
			expect(diagnostics).toEqual([
				{ code: "communication.feedback-unavailable", severity: "error" },
			]);
		},
	);
});

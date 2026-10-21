import type {
	MailCommunicationKind,
	MailRecipient,
} from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import { event } from "../../testing/meetup-journey.fixtures.js";
import { CommunicationChecklist } from "./communication-checklist.js";

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
		email: "speaker@example.test",
		receivesCommunications: true,
	},
];

describe("communication checklist", () => {
	it.each(["Mail thanks hoster", "Thanks hoster"])(
		"uses the existing %s item independently of speaker thanks",
		(name) => {
			// Arrange
			const input = {
				...event,
				operationalChecklists: {
					...event.operationalChecklists,
					postEvent: [
						{ name, completed: false },
						{ name: "Mail thanks speakers", completed: true },
					],
				},
			};

			// Act
			const pending = CommunicationChecklist.pendingRecipients(
				input,
				recipients,
			);
			const completed = CommunicationChecklist.complete(input, ["host-thanks"]);

			// Assert
			expect(pending).toEqual([recipients[0]]);
			expect(completed.postEvent).toEqual([
				{ name, completed: true },
				{ name: "Mail thanks speakers", completed: true },
			]);
		},
	);

	it.each([
		{
			kinds: ["host-introduction"] as MailCommunicationKind[],
			completed: false,
		},
		{
			kinds: [
				"host-introduction",
				"speaker-introduction",
			] as MailCommunicationKind[],
			completed: true,
		},
	])(
		"checks a combined introduction only when both groups are done ($completed)",
		({ kinds, completed }) => {
			// Arrange
			const input = {
				...event,
				operationalChecklists: {
					...event.operationalChecklists,
					communication: [{ name: "Mail introduction", completed: false }],
				},
			};

			// Act
			const result = CommunicationChecklist.complete(input, kinds);

			// Assert
			expect(result.communication).toEqual([
				{ name: "Mail introduction", completed },
			]);
			expect(input.operationalChecklists.communication[0].completed).toBe(
				false,
			);
		},
	);

	it("preserves manual report sharing while recording the email portion of a combined task", () => {
		// Arrange
		const combined = {
			name: "Thanks speakers and share openfeedback reports",
			completed: false,
		};
		const input = {
			...event,
			operationalChecklists: {
				...event.operationalChecklists,
				postEvent: [combined],
			},
		};

		// Act
		const result = CommunicationChecklist.complete(input, ["speaker-thanks"]);
		const pending = CommunicationChecklist.pendingRecipients(
			{ ...input, operationalChecklists: result },
			recipients,
		);

		// Assert
		expect(result.postEvent).toEqual([
			combined,
			{ name: "Mail thanks speakers", completed: true },
		]);
		expect(pending).toEqual([]);
	});

	it("counts a manually completed host task when finishing a combined introduction", () => {
		// Arrange
		const input = {
			...event,
			occurrenceStatus: "scheduled" as const,
			operationalChecklists: {
				...event.operationalChecklists,
				communication: [
					{ name: "Mail introduction hoster", completed: true },
					{ name: "Mail introduction", completed: false },
				],
			},
		};

		// Act
		const pending = CommunicationChecklist.pendingRecipients(input, recipients);
		const result = CommunicationChecklist.complete(input, [
			"speaker-introduction",
		]);

		// Assert
		expect(pending).toEqual([recipients[1]]);
		expect(result.communication.every((item) => item.completed)).toBe(true);
	});
});

import {
	ReferentialDomainComposition,
	type SpeakerId,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import { describe, expect, it } from "vitest";
import { publicCatalog } from "../../testing/asset-render.fixtures.js";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import { CommunicationRecipients } from "./communication-recipients.js";

describe("CommunicationRecipients", () => {
	it.each([
		{
			venue: {
				address: "1 Public Street",
				postalCode: "13001",
				city: "Marseille",
			},
			expected: "1 Public Street, 13001 Marseille",
		},
		{ venue: undefined, expected: "" },
	])(
		"uses the structured public venue in speaker emails: $expected",
		({ venue, expected }) => {
			// Arrange
			const catalog = {
				...publicCatalog,
				hosts: publicCatalog.hosts.map((host) => ({
					...host,
					publicVenue: venue,
				})),
			};
			const event = {
				host: { id: "host-0001", displayName: "Public Host" },
				agenda: [
					{ speakers: [{ id: "speaker-0001", displayName: "Public Speaker" }] },
				],
			};
			const diagnostics: CommunicationJourneyDiagnostic[] = [];
			const subject = new CommunicationRecipients({
				resolveEventReferences:
					new ReferentialDomainComposition().resolveEventReferences(),
			});
			// Act
			const result = subject.resolveMailRecipients(event, catalog, diagnostics);
			// Assert
			expect(result.resolved).toBe(true);
			expect(
				result.recipients.find((recipient) => recipient.role === "speaker"),
			).toMatchObject({
				recipientId: "speaker-0001",
				placeholders: { hostingAddress: expected },
			});
			expect(diagnostics).toEqual([]);
		},
	);
	it("uses the current source name and address while retaining the delivery identity", () => {
		// Arrange
		const speaker = {
			id: "speaker-0001" as SpeakerId,
			displayName: "Current Profile",
			email: "current@example.test",
			firstName: "Old",
			lastName: "Name",
			company: "",
			phone: "local phone",
			sourceIdentity: {
				provider: "conference-hall",
				event: "example-cfp",
				speakerId: "source-one",
			},
		};

		// Act
		const recipient = new CommunicationRecipients({
			resolveEventReferences:
				new ReferentialDomainComposition().resolveEventReferences(),
		}).speakerRecipient(speaker, "Host", "Location");

		// Assert
		expect(recipient).toMatchObject({
			recipientId: "speaker-0001",
			email: "current@example.test",
			placeholders: { speakerName: "Current Profile" },
		});
	});
	it("greets an imported speaker by display name without fabricating structured names or changing the recipient ID", async () => {
		// Arrange
		const validation = await new ValidateReferentialCatalog({
			referentialDiagnostics:
				new ReferentialDomainComposition().referentialDiagnostics(),
			hostCatalogValidator:
				new ReferentialDomainComposition().hostCatalogValidator(),
			speakerCatalogValidator:
				new ReferentialDomainComposition().speakerCatalogValidator(),
			speakerSourceFields:
				new ReferentialDomainComposition().speakerSourceFields(),
			referentialCatalogOperations:
				new ReferentialDomainComposition().referentialCatalogOperations(),
		}).execute({
			hosts: [],
			speakers: [
				{
					speakerId: "speaker-0001",
					displayName: "Example Public Name",
					firstName: "",
					lastName: "",
					company: "",
					email: "person@example.test",
				},
			],
		});
		if (!validation.isValid) throw new Error("Invalid synthetic fixture");

		// Act
		const recipient = new CommunicationRecipients({
			resolveEventReferences:
				new ReferentialDomainComposition().resolveEventReferences(),
		}).speakerRecipient(validation.catalog.speakers[0], "Host", "Location");

		// Assert
		expect(recipient.recipientId).toBe("speaker-0001");
		expect(recipient.placeholders?.speakerName).toBe("Example Public Name");
		expect(validation.catalog.speakers[0].firstName).toBe("");
	});
});

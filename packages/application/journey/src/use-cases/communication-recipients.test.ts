import {
	ReferentialDomainComposition,
	type SpeakerId,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import { describe, expect, it } from "vitest";
import { CommunicationRecipients } from "./communication-recipients.js";

describe("CommunicationRecipients", () => {
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
			createResolveEventReferences: () =>
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
			createResolveEventReferences: () =>
				new ReferentialDomainComposition().resolveEventReferences(),
		}).speakerRecipient(validation.catalog.speakers[0], "Host", "Location");

		// Assert
		expect(recipient.recipientId).toBe("speaker-0001");
		expect(recipient.placeholders?.speakerName).toBe("Example Public Name");
		expect(validation.catalog.speakers[0].firstName).toBe("");
	});
});

import { describe, expect, it } from "vitest";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";
import { HostPublicDetails } from "./host-public-details.js";

const contact = {
	hostId: "host-0001",
	displayName: "Host",
	contactId: "contact-0001",
	contactName: "Private contact",
	email: "private@example.test",
};

describe("host public details", () => {
	it("keeps contact information separate from absent public data", () => {
		// Arrange
		const subject = new HostPublicDetails();
		const diagnostics: ReferentialDiagnostic[] = [];
		// Act
		const result = subject.parse(contact, 0, diagnostics);
		// Assert
		expect(result).toEqual({});
		expect(diagnostics).toEqual([]);
	});
	it("projects complete public venue and logo data", () => {
		// Arrange
		const subject = new HostPublicDetails();
		const diagnostics: ReferentialDiagnostic[] = [];
		// Act
		const result = subject.parse(
			{
				...contact,
				venueAddress: "Public place",
				venuePostalCode: "13001",
				venueCity: "Marseille",
				logoUrl: "https://images.example.test/logo.png",
				logoDescription: "Host logo",
			},
			0,
			diagnostics,
		);
		// Assert
		expect(result).toEqual({
			publicVenue: {
				address: "Public place",
				postalCode: "13001",
				city: "Marseille",
			},
			logo: {
				url: "https://images.example.test/logo.png",
				description: "Host logo",
			},
		});
		expect(diagnostics).toEqual([]);
		expect(JSON.stringify(result)).not.toContain("Private");
	});
	it.each([
		{ venueAddress: "Incomplete" },
		{ logoUrl: "https://example.test/logo.png" },
		{
			logoUrl: "https://user:password@example.test/logo.png",
			logoDescription: "Logo",
		},
		{
			venueAddress: "<unsafe>",
			venuePostalCode: "13001",
			venueCity: "Marseille",
		},
	])("rejects incomplete or unsafe public fields", (details) => {
		// Arrange
		const subject = new HostPublicDetails();
		const diagnostics: ReferentialDiagnostic[] = [];
		// Act
		const result = subject.parse({ ...contact, ...details }, 0, diagnostics);
		// Assert
		expect(result).toBeUndefined();
		expect(diagnostics).toEqual([
			expect.objectContaining({
				code: "referential.host.public-details.invalid",
				severity: "error",
			}),
		]);
		expect(JSON.stringify(diagnostics)).not.toContain("password");
	});
});

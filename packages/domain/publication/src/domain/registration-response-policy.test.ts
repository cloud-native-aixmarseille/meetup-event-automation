import { describe, expect, it } from "vitest";
import type { RegistrationResponseTable } from "../application/registration-response-source.js";
import { RegistrationResponsePolicy } from "./registration-response-policy.js";

describe("registration response evaluation", () => {
	it("evaluates selected identities using only the explicitly mapped email column", () => {
		// Arrange
		const table = [
			["Unmanaged response", "Contact email"],
			["Private answer", "  Member@Example.test  "],
			[false, "other@example.test"],
		];
		const mapping = { emailColumn: "Contact email" };
		const policy = new RegistrationResponsePolicy();

		// Act
		const result = policy.evaluate(table, mapping);

		// Assert
		expect(result).toEqual({
			participants: [
				{ email: "member@example.test" },
				{ email: "other@example.test" },
			],
			responseCount: 2,
			duplicateCount: 0,
			invalidCount: 0,
			diagnostics: [],
		});
		expect(table[1]).toEqual(["Private answer", "  Member@Example.test  "]);
	});

	it("deduplicates case and surrounding whitespace without merging dots or plus aliases", () => {
		// Arrange
		const table = [
			["Email"],
			["  First.Last+meetup@Example.test "],
			["first.last+meetup@example.test"],
			["firstlast+meetup@example.test"],
			["first.last@example.test"],
		];
		const policy = new RegistrationResponsePolicy();

		// Act
		const result = policy.evaluate(table, { emailColumn: "Email" });

		// Assert
		expect(result.participants).toEqual([
			{ email: "first.last+meetup@example.test" },
			{ email: "firstlast+meetup@example.test" },
			{ email: "first.last@example.test" },
		]);
		expect(result.responseCount).toBe(4);
		expect(result.duplicateCount).toBe(1);
		expect(result.diagnostics).toEqual([]);
	});

	it("preserves Unicode letters and combining marks in supported mailbox forms", () => {
		// Arrange
		const table = [
			["Email"],
			["  Élise.Dupont+été@Exämple.test  "],
			["e\u0301lise@exämple.test"],
		];
		const policy = new RegistrationResponsePolicy();

		// Act
		const result = policy.evaluate(table, { emailColumn: "Email" });

		// Assert
		expect(result.participants).toEqual([
			{ email: "élise.dupont+été@exämple.test" },
			{ email: "e\u0301lise@exämple.test" },
		]);
		expect(result.diagnostics).toEqual([]);
	});

	it.each(["", " \t "])(
		"rejects a blank configured email column %j",
		(emailColumn) => {
			// Arrange
			const table = [["Email"], ["member@example.test"]];
			const policy = new RegistrationResponsePolicy();

			// Act
			const result = policy.evaluate(table, { emailColumn });

			// Assert
			expect(result.participants).toEqual([]);
			expect(result.diagnostics.map((item) => item.code)).toEqual([
				"publication.registration.mapping",
			]);
		},
	);

	it.each([
		{ name: "absent table", table: [] },
		{ name: "absent header", table: [[], ["member@example.test"]] },
		{ name: "missing column", table: [["Other"], ["member@example.test"]] },
		{
			name: "duplicate column",
			table: [["Email", "Email"], ["member@example.test"]],
		},
		{
			name: "different capitalization",
			table: [["email"], ["member@example.test"]],
		},
		{
			name: "different whitespace",
			table: [[" Email "], ["member@example.test"]],
		},
		{
			name: "non-text header",
			table: [[{ email: "Email" }], ["member@example.test"]],
		},
	])("rejects an $name without guessing the source schema", ({ table }) => {
		// Arrange
		const policy = new RegistrationResponsePolicy();

		// Act
		const result = policy.evaluate(table, { emailColumn: "Email" });

		// Assert
		expect(result.participants).toEqual([]);
		expect(result.diagnostics.map((item) => item.code)).toEqual([
			"publication.registration.headers",
		]);
	});

	it.each([
		undefined,
		null,
		true,
		42,
		{ address: "member@example.test" },
		["member@example.test"],
		"",
		"   ",
		"missing-domain",
		"member@example",
		"member@@example.test",
		"two members@example.test",
		"member\u0000@example.test",
		".member@example.test",
		"member.@example.test",
		"first..last@example.test",
		"member@-example.test",
		"member@example-.test",
		"member@example..test",
		"member@example.test.",
		"member@some_example.test",
		`${"x".repeat(65)}@example.test`,
		`member@${"x".repeat(64)}.test`,
		`member@${Array(4).fill("x".repeat(63)).join(".")}.test`,
	])(
		"withholds all participants when a selected email is invalid: %j",
		(email) => {
			// Arrange
			const table: RegistrationResponseTable = [
				["Email", "Other answer"],
				["valid@example.test", "Private answer"],
				[email, "Another private answer"],
			];
			const policy = new RegistrationResponsePolicy();

			// Act
			const result = policy.evaluate(table, { emailColumn: "Email" });

			// Assert
			expect(result.participants).toEqual([]);
			expect(result.responseCount).toBe(2);
			expect(result.invalidCount).toBe(1);
			expect(result.diagnostics).toEqual([
				{
					code: "publication.registration.invalid",
					severity: "warning",
					field: "community",
					message: "Response identities require organizer review",
				},
			]);
		},
	);

	it("ignores wholly blank rows while retaining selected responses", () => {
		// Arrange
		const table = [
			["Email", "Other answer"],
			[],
			[undefined, null],
			["  ", "\t"],
			["member@example.test"],
		];
		const policy = new RegistrationResponsePolicy();

		// Act
		const result = policy.evaluate(table, { emailColumn: "Email" });

		// Assert
		expect(result.participants).toEqual([{ email: "member@example.test" }]);
		expect(result.responseCount).toBe(1);
		expect(result.invalidCount).toBe(0);
		expect(result.diagnostics).toEqual([]);
	});

	it.each([
		{ name: "no data rows", table: [["Email"]] },
		{ name: "blank data rows", table: [["Email"], [], [null], ["  "]] },
	])("rejects the source selection for $name", ({ table }) => {
		// Arrange
		const policy = new RegistrationResponsePolicy();

		// Act
		const result = policy.evaluate(table, { emailColumn: "Email" });

		// Assert
		expect(result.participants).toEqual([]);
		expect(result.responseCount).toBe(0);
		expect(result.diagnostics.map((item) => item.code)).toEqual([
			"publication.registration.empty",
		]);
	});
});

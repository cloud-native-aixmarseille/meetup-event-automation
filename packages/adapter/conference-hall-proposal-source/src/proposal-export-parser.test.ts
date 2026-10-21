import { describe, expect, it } from "vitest";
import { proposal, sourceExport, speaker } from "../testing/export.fixtures.js";
import { ProposalExportParser } from "./proposal-export-parser.js";

describe("ProposalExportParser", () => {
	it("identifies the duplicate proposal identifier without exposing its value", () => {
		// Arrange
		const input = { proposals: [proposal, proposal] };

		// Act
		const parse = () => ProposalExportParser.parse(input, "example-cfp");

		// Assert
		expect(parse).toThrow(
			expect.objectContaining({
				context: { reason: "schema", field: "proposals[1].id" },
			}),
		);
	});
	it.each(["DECLINED", "WITHDRAWN", "unexpected"])(
		"does not publish an accepted proposal with %s confirmation",
		(confirmationStatus) => {
			// Arrange
			const input = { proposals: [{ ...proposal, confirmationStatus }] };

			// Act
			const result = ProposalExportParser.parse(input, "example-cfp");

			// Assert
			expect(result.proposals[0].accepted).toBe(false);
		},
	);
	it("rejects missing required source contact data without exposing values", () => {
		// Arrange
		const input = {
			proposals: [{ ...proposal, speakers: [{ ...speaker, email: null }] }],
		};

		// Act
		const parse = () => ProposalExportParser.parse(input, "example-cfp");

		// Assert
		expect(parse).toThrow(
			expect.objectContaining({
				context: { reason: "schema", field: "proposals[0].speakers[0].email" },
			}),
		);
	});

	it("deduplicates event-scoped co-speakers and drops private export fields", () => {
		// Arrange
		const input = {
			...sourceExport,
			proposals: [proposal, { ...proposal, id: "proposal-two" }],
		};

		// Act
		const result = ProposalExportParser.parse(input, "example-cfp");

		// Assert
		expect(result.speakers).toHaveLength(1);
		expect(result.proposals).toHaveLength(2);
		expect(JSON.stringify(result)).not.toMatch(
			/PRIVATE|survey|location|review|bio/,
		);
		expect(result.speakers[0].pictureUrl).toBe(speaker.picture);
	});
	it.each(["PENDING", "REJECTED", "WITHDRAWN", "unexpected"])(
		"does not publish %s proposals",
		(deliberationStatus) => {
			// Arrange
			const input = { proposals: [{ ...proposal, deliberationStatus }] };

			// Act
			const result = ProposalExportParser.parse(input, "example-cfp");

			// Assert
			expect(result.proposals[0].accepted).toBe(false);
		},
	);
	it.each([
		{},
		{ picture: "javascript:alert(1)" },
		{ picture: "http://example.test/a" },
		{ picture: "https://user:pass@example.test/a" },
	])(
		"preserves omitted or invalid picture references without downloading them: %j",
		(picture) => {
			// Arrange
			const { picture: _unused, ...profile } = speaker;
			const input = {
				proposals: [{ ...proposal, speakers: [{ ...profile, ...picture }] }],
			};

			// Act
			const result = ProposalExportParser.parse(input, "example-cfp");

			// Assert
			expect(result.speakers[0]).not.toHaveProperty("pictureUrl");
		},
	);
	it("keeps explicit picture removal distinct from an omitted field", () => {
		// Arrange
		const input = {
			proposals: [{ ...proposal, speakers: [{ ...speaker, picture: null }] }],
		};

		// Act
		const result = ProposalExportParser.parse(input, "example-cfp");

		// Assert
		expect(result.speakers[0].pictureUrl).toBeNull();
	});
	it("rejects inconsistent profiles for one source identity", () => {
		// Arrange
		const input = {
			proposals: [
				proposal,
				{
					...proposal,
					id: "another",
					speakers: [{ ...speaker, email: "other@example.test" }],
				},
			],
		};

		// Act
		const parse = () => ProposalExportParser.parse(input, "example-cfp");

		// Assert
		expect(parse).toThrow("Proposal source invalid.");
	});
	it("keeps the public proposal number alongside the internal export identity", () => {
		// Arrange
		const input = { proposals: [{ ...proposal, proposalNumber: 17 }] };

		// Act
		const result = ProposalExportParser.parse(input, "example-cfp");

		// Assert
		expect(result.proposals[0]).toMatchObject({ id: proposal.id, number: 17 });
	});
	it.each([undefined, null])(
		"keeps profiles available when the proposal number is %s",
		(proposalNumber) => {
			// Arrange
			const input = { proposals: [{ ...proposal, proposalNumber }] };

			// Act
			const result = ProposalExportParser.parse(input, "example-cfp");

			// Assert
			expect(result.proposals[0].number).toBeUndefined();
			expect(result.speakers[0].id).toBe(speaker.id);
		},
	);
	it.each([0, -1, 1.5, "17", Number.MAX_SAFE_INTEGER + 1])(
		"rejects invalid public proposal number %s",
		(proposalNumber) => {
			// Arrange
			const input = { proposals: [{ ...proposal, proposalNumber }] };

			// Act
			const parse = () => ProposalExportParser.parse(input, "example-cfp");

			// Assert
			expect(parse).toThrow(
				expect.objectContaining({
					context: { reason: "schema", field: "proposals[0].proposalNumber" },
				}),
			);
		},
	);
});

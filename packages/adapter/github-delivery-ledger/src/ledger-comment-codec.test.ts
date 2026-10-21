import { describe, expect, it } from "vitest";
import { LedgerCommentCodec } from "./ledger-comment-codec.js";

const entry = {
	idempotencyKey: "delivery-1",
	intentId: "intent-1",
	repositoryId: "repository-1",
	eventId: "event-1",
	kind: "host-introduction",
	recipientId: "contact-1",
	policyVersion: "1",
	status: "pending",
	updatedAt: "2099-01-01T00:00:00Z",
};

describe("LedgerCommentCodec", () => {
	it("only retains allowlisted fields and redacts unsafe provider diagnostics", () => {
		// Arrange
		const body = `\`\`\`json\n${JSON.stringify({
			schemaVersion: 2,
			entries: [
				{
					...entry,
					contact: "private@example.test",
					diagnosticCode: "private@example.test",
				},
			],
		})}\n\`\`\``;

		// Act
		const decoded = LedgerCommentCodec.decode(body);
		const encoded = LedgerCommentCodec.encode(decoded);

		// Assert
		expect(decoded.entries[0]).not.toHaveProperty("contact");
		expect(decoded.entries[0]?.diagnosticCode).toBe(
			"unsafe-diagnostic-code-redacted",
		);
		expect(encoded).not.toContain("private@example.test");
		expect(decoded.entries[0]?.recipientId).toMatch(/^sha256:[a-f0-9]{64}$/);
	});

	it.each([
		null,
		[],
		1,
		{ schemaVersion: 2, entries: [null] },
		{
			schemaVersion: 2,
			entries: [{ ...entry, status: ["pending"] }],
		},
		{ schemaVersion: 2, entries: [{ ...entry, kind: "unknown" }] },
	])("rejects malformed external records %#", (value) => {
		// Arrange
		const body = `\`\`\`json\n${JSON.stringify(value)}\n\`\`\``;

		// Act
		const decode = () => LedgerCommentCodec.decode(body);

		// Assert
		expect(decode).toThrow(/ledger/);
	});

	it("rejects conflicting reservations sharing a protected identity", () => {
		// Arrange
		const body = `\`\`\`json\n${JSON.stringify({
			schemaVersion: 2,
			entries: [entry, { ...entry, status: "accepted" }],
		})}\n\`\`\``;

		// Act
		const decode = () => LedgerCommentCodec.decode(body);

		// Assert
		expect(decode).toThrow("duplicate identities");
	});
});

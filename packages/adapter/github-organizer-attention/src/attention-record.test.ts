import { describe, expect, it } from "vitest";
import { state } from "../testing/attention.fixtures.js";
import { ATTENTION_MARKER, AttentionRecord } from "./attention-record.js";

describe("attention record validation", () => {
	it.each([
		{ version: 2 },
		{ runId: "private@example.test" },
		{ eventDate: "<script>" },
		{ post: { ...state().post, status: "accepted" } },
		{ post: { ...state().post, fingerprint: "raw provider payload" } },
	])("rejects unsupported or unsafe record fields %j", (overrides) => {
		// Arrange
		const body = `${ATTENTION_MARKER}${JSON.stringify({ version: 1, ...state(), ...overrides })} -->`;

		// Act
		const read = () => AttentionRecord.read(body);

		// Assert
		expect(read).toThrow();
	});
});

describe("unknown attention metadata", () => {
	it.each([
		null,
		[],
		true,
		{ episodes: [null] },
		{ episodes: [{ condition: null }] },
		{ runId: 123 },
		{ commentId: "12" },
		{ post: null },
		{
			post: {
				...state().post,
				message: { destination: true, messageId: "123.456" },
			},
		},
	])("rejects malformed external state %j", (input) => {
		// Arrange
		const value =
			input !== null && typeof input === "object" && !Array.isArray(input)
				? { version: 1, ...state(), ...input }
				: input;
		const body = `${ATTENTION_MARKER}${JSON.stringify(value)} -->`;

		// Act
		const read = () => AttentionRecord.read(body);

		// Assert
		expect(read).toThrow();
	});
	it("round-trips opaque accepted references without persisting extra provider data", () => {
		// Arrange
		const base = state();
		if (!base.post) throw new Error("Missing synthetic reservation");
		const value = {
			...base,
			post: {
				...base.post,
				status: "accepted" as const,
				message: {
					destination: "provider-channel",
					messageId: "provider-message",
				},
			},
			private: "provider payload",
		};

		// Act
		const encoded = AttentionRecord.marker(value);
		const decoded = AttentionRecord.read(encoded);

		// Assert
		expect(decoded.post?.message).toEqual(value.post.message);
		expect(encoded).not.toContain("provider payload");
	});
});

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
		const body = `${ATTENTION_MARKER}${JSON.stringify({ ...state(), ...overrides })} -->`;
		// Act
		const read = () => AttentionRecord.read(body);
		// Assert
		expect(read).toThrow();
	});
});

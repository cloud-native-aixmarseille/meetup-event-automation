import { describe, expect, it } from "vitest";
import { ContentFingerprint } from "./content-fingerprint.js";
import { ContentTextKey } from "./content-text-key.js";

describe("content text binding identities", () => {
	it("keeps readable references separate from durable formatted keys", () => {
		// Arrange
		const keys = new ContentTextKey(new ContentFingerprint());
		const field = { token: "event.date", format: "D MMMM YYYY" } as const;
		// Act
		const reference = keys.reference(field);
		const key = keys.of(field);
		const repeated = keys.of({ ...field });
		const different = keys.of({ ...field, format: "YYYY-MM-DD" });
		// Assert
		expect(reference).toBe("event.date:D MMMM YYYY");
		expect(key).toMatch(/^event\.date:format:[a-f0-9]{64}$/u);
		expect(repeated).toBe(key);
		expect(different).not.toBe(key);
	});
	it.each([
		[{ token: "event.title" }, "event.title"],
		[{ token: "talk.title", slot: "opening:one" }, "talk.title:opening:one"],
	] as const)("preserves unformatted identity %s", (field, expected) => {
		// Arrange
		const keys = new ContentTextKey(new ContentFingerprint());
		// Act
		const key = keys.of(field);
		// Assert
		expect(key).toBe(expected);
	});
});

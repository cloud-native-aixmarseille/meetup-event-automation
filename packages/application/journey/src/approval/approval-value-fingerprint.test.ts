import { ContentFingerprint } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { ApprovalValueFingerprint } from "./approval-value-fingerprint.js";

describe("canonical approval values", () => {
	it("canonicalizes object key order while preserving array order", () => {
		// Arrange
		const fingerprint = new ApprovalValueFingerprint(new ContentFingerprint());
		// Act
		const first = fingerprint.digest({ z: 1, a: [1, 2] });
		const reordered = fingerprint.digest({ a: [1, 2], z: 1 });
		const changed = fingerprint.digest({ a: [2, 1], z: 1 });
		// Assert
		expect(first).toBe(reordered);
		expect(first).not.toBe(changed);
	});
});

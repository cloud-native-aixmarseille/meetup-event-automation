import { describe, expect, it } from "vitest";
import type { ContentRecovery } from "./asset-content.js";
import { ContentFingerprint } from "./content-fingerprint.js";
import { ContentRecoveryFingerprint } from "./content-recovery-fingerprint.js";

describe("ContentRecoveryFingerprint", () => {
	it.each(["enroll", "restore", "remove"] as const)(
		"canonicalizes %s recovery properties",
		(operation) => {
			// Arrange
			const left: ContentRecovery = {
				operation,
				revision: "read-revision",
				bindingId: operation === "enroll" ? undefined : "shape",
			};
			const right: ContentRecovery = {
				bindingId: left.bindingId,
				revision: left.revision,
				operation,
			};

			// Act
			const equal =
				ContentRecoveryFingerprint.create(left) ===
				ContentRecoveryFingerprint.create(right);

			// Assert
			expect(equal).toBe(true);
		},
	);

	it.each([
		{ operation: "restore", revision: "2", bindingId: "shape" },
		{ operation: "restore", bindingId: "shape", revision: "2" },
		{ revision: "2", operation: "restore", bindingId: "shape" },
		{ revision: "2", bindingId: "shape", operation: "restore" },
		{ bindingId: "shape", operation: "restore", revision: "2" },
		{ bindingId: "shape", revision: "2", operation: "restore" },
	] as const)(
		"recognizes persisted recovery without repeating it",
		(stored) => {
			// Arrange
			const fingerprint = ContentFingerprint.of(JSON.stringify(stored));
			const request: ContentRecovery = {
				operation: "restore",
				revision: "2",
				bindingId: "shape",
			};

			// Act
			const matches = ContentRecoveryFingerprint.matches(request, fingerprint);
			const changed = ContentRecoveryFingerprint.matches(
				{ ...request, revision: "3" },
				fingerprint,
			);

			// Assert
			expect(matches).toBe(true);
			expect(changed).toBe(false);
		},
	);

	it("treats absent binding as absent and rejects different operations", () => {
		// Arrange
		const request: ContentRecovery = { operation: "enroll", revision: "1" };
		const fingerprint = ContentRecoveryFingerprint.create(request);

		// Act
		const matches = ContentRecoveryFingerprint.matches(
			{ ...request, bindingId: undefined },
			fingerprint,
		);
		const changed = ContentRecoveryFingerprint.matches(
			{ ...request, operation: "remove" },
			fingerprint,
		);
		const absent = ContentRecoveryFingerprint.matches(request);

		// Assert
		expect(matches).toBe(true);
		expect(changed).toBe(false);
		expect(absent).toBe(false);
	});
});

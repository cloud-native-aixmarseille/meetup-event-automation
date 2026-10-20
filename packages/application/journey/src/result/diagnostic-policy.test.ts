import { describe, expect, it } from "vitest";
import { DiagnosticPolicy } from "./diagnostic-policy.js";

describe("diagnostic policy", () => {
	it.each([
		"event.hoster.missing",
		"event.document.heading.duplicate",
		"event.proposals.invalid-selection",
		"event.proposals.not-found",
		"event.proposals.not-accepted",
		"event.proposals.mapping-required",
		"referential.source.mapping-required",
		"referential.speaker.email.invalid",
		"communication.event-references-unresolved",
		"communication.checklist-concurrently-modified",
		"communication.referential-catalog-invalid",
		"communication.feedback-unavailable",
		"communication.slides-unavailable",
		"communication.approval-pending",
		"communication.approval-rejected",
		"publication.assets.content.conflict",
		"publication.assets.content.recovery",
		"publication.feedback.agenda",
		"publication.feedback.conflict",
		"issue-form.out-of-date",
		"speaker-sync.invalid",
		"speaker-sync.mapping-required",
		"speaker-sync.conflict",
	])("keeps %s as organizer work despite error severity", (code) => {
		// Arrange
		const diagnostic = { code, severity: "error" as const };

		// Act
		const category = DiagnosticPolicy.classify(diagnostic);
		const failed = DiagnosticPolicy.isTechnicalFailure(diagnostic);

		// Assert
		expect(category).toBe("organizer");
		expect(failed).toBe(false);
	});

	it.each([
		"event.proposals.unavailable",
		"event.proposals.invalid",
		"event.proposals.rate-limited",
		"referential.source.unavailable",
		"referential.source.invalid",
		"referential.source.rate-limited",
		"communication.ledger-read-failed",
		"communication.ledger-reservation-failed",
		"communication.ledger-status-write-failed",
		"communication.feedback-fetch-failed",
		"communication.gateway-threw-ambiguous-error",
		"communication.invalid-clock",
		"speaker-sync.authentication",
		"speaker-sync.schema",
		"speaker-sync.json",
		"speaker-sync.response-size",
		"action.execution.failed",
		"event.unclassified-failure",
		"publication.unclassified-failure",
	])("fails for technical fault %s", (code) => {
		// Arrange
		const diagnostic = { code, severity: "error" as const };

		// Act
		const category = DiagnosticPolicy.classify(diagnostic);
		const failed = DiagnosticPolicy.isTechnicalFailure(diagnostic);

		// Assert
		expect(category).toBe("technical");
		expect(failed).toBe(true);
	});

	it.each([
		"communication.gateway-delivery-uncertain",
		"communication.gateway-delivery-rejected",
		"communication.gateway-delivery-deferred",
		"communication.approval-notification-failed",
		"communication.checklist-update-failed",
	])("does not hide technical fault %s behind warning severity", (code) => {
		// Arrange
		const diagnostic = { code, severity: "warning" as const };

		// Act
		const failed = DiagnosticPolicy.isTechnicalFailure(diagnostic);

		// Assert
		expect(failed).toBe(true);
	});

	it.each([
		{ code: "communication.delivery-already-recorded", severity: "warning" },
		{ code: "publication.assets.content.fallback", severity: "warning" },
		{ code: "issue-form.updated", severity: "warning" },
		{ code: "event.labels.normalized", severity: "warning", fixApplied: true },
		{ code: "event.observed-state", severity: "info" },
	] as const)(
		"treats completed or advisory work $code as informational",
		(diagnostic) => {
			// Arrange
			const input = diagnostic;

			// Act
			const category = DiagnosticPolicy.classify(input);
			const failed = DiagnosticPolicy.isTechnicalFailure(input);

			// Assert
			expect(category).toBe("informational");
			expect(failed).toBe(false);
		},
	);
});

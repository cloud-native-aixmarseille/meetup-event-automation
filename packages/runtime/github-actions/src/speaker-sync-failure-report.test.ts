import { SpeakerSynchronizationError } from "@meetup-automation/journey";
import { ProposalSourceError } from "@meetup-automation/referential";
import { describe, expect, it } from "vitest";
import { ActionMessages } from "./i18n/action-messages.js";
import { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";

describe("SpeakerSyncFailureReport", () => {
	it.each([401, 403, 404, 500])(
		"reports actionable HTTP %s failures without provider contents",
		(status) => {
			// Arrange
			const source = new ProposalSourceError("unavailable", undefined, {
				reason: "http",
				status,
			});
			source.message = "PRIVATE private@example.test";
			const error = new SpeakerSynchronizationError("load-source", source);

			// Act
			const { report, prBody } = SpeakerSyncFailureReport.create(
				error,
				new ActionMessages(),
			);

			// Assert
			expect(report.details).toEqual([
				"speaker_sync=blocked stage=load-source",
			]);
			expect(report.failure).toBeUndefined();
			expect(prBody).toContain(`HTTP ${status}`);
			expect(report.diagnostics[0].field).toBe(`HTTP ${status}`);
			expect(report.diagnostics[0].code).toBe(
				status === 404
					? "speaker-sync.event-not-found"
					: status === 500
						? "speaker-sync.http"
						: "speaker-sync.authentication",
			);
			expect(JSON.stringify({ report, prBody })).not.toMatch(
				/PRIVATE|private@example.test/,
			);
		},
	);
	it.each(["en", "fr"])(
		"localizes field validation guidance in %s while keeping canonical diagnostics",
		(locale) => {
			// Arrange
			const error = new SpeakerSynchronizationError(
				"load-source",
				new ProposalSourceError("invalid", undefined, {
					reason: "schema",
					field: "proposals[2].speakers[0].email",
				}),
			);

			// Act
			const { report, prBody } = SpeakerSyncFailureReport.create(
				error,
				new ActionMessages(locale),
			);

			// Assert
			expect(prBody).toContain(
				locale === "fr" ? "champ obligatoire" : "required field",
			);
			expect(report.failure).toBeUndefined();
			expect(report.diagnostics[0]).toMatchObject({
				code: "speaker-sync.schema",
				field: "proposals[2].speakers[0].email",
				message: expect.stringContaining("required field"),
			});
		},
	);
	it("redacts unknown exceptions while retaining the failing stage", () => {
		// Arrange
		const error = new SpeakerSynchronizationError(
			"check-form",
			new Error("PRIVATE private@example.test"),
		);

		// Act
		const { report, prBody } = SpeakerSyncFailureReport.create(
			error,
			new ActionMessages(),
		);

		// Assert
		expect(report.details).toEqual(["speaker_sync=blocked stage=check-form"]);
		expect(prBody).toContain("Unexpected technical failure");
		expect(report.diagnostics[0].code).toBe("speaker-sync.unexpected");
		expect(JSON.stringify({ report, prBody })).not.toMatch(
			/PRIVATE|private@example.test/,
		);
	});
	it("does not expose arbitrary source field names", () => {
		// Arrange
		const error = new ProposalSourceError("invalid", undefined, {
			reason: "schema",
			field: "private@example.test\n::error::PRIVATE",
		});

		// Act
		const { report, prBody } = SpeakerSyncFailureReport.create(
			error,
			new ActionMessages(),
		);

		// Assert
		expect(report.diagnostics[0].field).toBeUndefined();
		expect(JSON.stringify({ report, prBody })).not.toMatch(
			/PRIVATE|private@example.test/,
		);
	});
	it("preserves the public proposal-number field without exposing its value", () => {
		// Arrange
		const error = new ProposalSourceError("invalid", undefined, {
			reason: "schema",
			field: "proposals[2].proposalNumber",
		});
		error.message = "PRIVATE invalid proposal value";

		// Act
		const { report, prBody } = SpeakerSyncFailureReport.create(
			error,
			new ActionMessages(),
		);

		// Assert
		expect(report.diagnostics[0].field).toBe("proposals[2].proposalNumber");
		expect(prBody).toContain("- proposals[2].proposalNumber:");
		expect(JSON.stringify({ report, prBody })).not.toContain("PRIVATE");
	});
});

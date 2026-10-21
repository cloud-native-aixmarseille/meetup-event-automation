import { describe, expect, it, vi } from "vitest";
import { OrganizerFeedback } from "./organizer-feedback.js";

const identity = { repository: "example/meetups", issueNumber: 42 };
function fixture(labels = ["meetup"]) {
	const events = {
		find: vi.fn().mockResolvedValue({ identity, labels }),
		applyPatch: vi.fn(),
		listPage: vi.fn(),
	};
	const comments = {
		reconcileDiagnostics: vi.fn().mockResolvedValue({ changed: true }),
	};
	return {
		events,
		comments,
		feedback: new OrganizerFeedback(events, comments, "meetup"),
	};
}
function reports(overrides: Record<string, unknown> = {}) {
	return JSON.stringify({
		event: { outcome: "success", diagnostics: [] },
		assets: { outcome: "success", diagnostics: [] },
		feedback: { outcome: "success", diagnostics: [] },
		communications: { outcome: "success", diagnostics: [] },
		...overrides,
	});
}
function stage(code: string, severity = "error", fixApplied = false) {
	return {
		outcome: "success",
		diagnostics: [
			{ code, severity, fixApplied, message: "private provider response" },
		],
	};
}

describe("OrganizerFeedback", () => {
	it("merges actionable stage diagnostics, removes fixed tasks and repeated prerequisites", async () => {
		// Arrange
		const { feedback, comments } = fixture();
		const reports = JSON.stringify({
			event: stage("event.proposals.not-found"),
			communications: stage("communication.event-references-unresolved"),
			assets: stage("publication.assets.file.drift", "warning", true),
			feedback: stage("publication.feedback.ambiguous-date", "warning"),
		});

		// Act
		await feedback.execute(identity, reports);

		// Assert
		expect(comments.reconcileDiagnostics).toHaveBeenCalledOnce();
		const [target, diagnostics] = comments.reconcileDiagnostics.mock.calls[0];
		expect(target).toEqual(identity);
		expect(diagnostics.map((item: { code: string }) => item.code)).toEqual([
			"event.proposals.not-found",
			"publication.feedback.ambiguous-date",
		]);
		expect(JSON.stringify(diagnostics)).not.toContain("private");
	});
	it.each([
		{},
		{
			event: {
				outcome: "failure",
				diagnostics: [{ code: "action.execution.failed", severity: "error" }],
			},
		},
		{ event: { outcome: "skipped", diagnostics: [] } },
	])(
		"preserves the current checklist when event evaluation is unavailable: %j",
		async (reports) => {
			// Arrange
			const { feedback, comments } = fixture();

			// Act
			await feedback.execute(identity, JSON.stringify(reports));

			// Assert
			expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
		},
	);
	it.each(["event", "assets", "feedback", "communications"])(
		"preserves unresolved tasks until %s has completed evaluation",
		async (owner) => {
			// Arrange
			const { feedback, comments } = fixture();
			const incomplete = reports({
				[owner]: {
					outcome: "failure",
					diagnostics: [{ code: "action.execution.failed", severity: "error" }],
				},
			});

			// Act
			await feedback.execute(identity, incomplete);

			// Assert
			expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ outcome: "skipped", diagnostics: [] },
		{ outcome: "success", diagnostics: "" },
		{ outcome: "success" },
		{
			outcome: "success",
			diagnostics: [{ code: "event.concurrently-modified", severity: "info" }],
		},
	])(
		"preserves tasks when a stage report is incomplete: %j",
		async (assets) => {
			// Arrange
			const { feedback, comments } = fixture();

			// Act
			await feedback.execute(identity, reports({ assets }));

			// Assert
			expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
		},
	);
	it("clears resolved tasks only after all stages complete evaluation", async () => {
		// Arrange
		const { feedback, comments } = fixture();

		// Act
		await feedback.execute(identity, reports());

		// Assert
		expect(comments.reconcileDiagnostics).toHaveBeenCalledWith(identity, []);
	});
	it("does not write a checklist on an unrelated issue", async () => {
		// Arrange
		const { feedback, comments } = fixture(["question"]);

		// Act
		await feedback.execute(
			identity,
			reports({ event: stage("event.title.missing") }),
		);

		// Assert
		expect(comments.reconcileDiagnostics).not.toHaveBeenCalled();
	});
	it("propagates persistence failures to the technical action boundary", async () => {
		// Arrange
		const { feedback, comments } = fixture();
		comments.reconcileDiagnostics.mockRejectedValue(new Error("Write failed"));

		// Act
		const operation = feedback.execute(
			identity,
			reports({ event: stage("event.title.missing") }),
		);

		// Assert
		await expect(operation).rejects.toThrow("Write failed");
	});
});

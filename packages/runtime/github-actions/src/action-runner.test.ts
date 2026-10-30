import * as core from "@actions/core";
import { EventConcurrentModificationError } from "@meetup-automation/event";
import { JourneyPolicyComposition } from "@meetup-automation/journey";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionRunner } from "./action-runner.js";
import { AttentionStageInput } from "./attention-stage-input.js";
import { GithubActionsComposition } from "./dependency-composition.js";

vi.mock("@actions/core", () => ({
	getInput: vi.fn().mockReturnValue("en"),
	info: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	notice: vi.fn(),
	setFailed: vi.fn(),
	setOutput: vi.fn(),
	summary: {
		addHeading: vi.fn().mockReturnThis(),
		addRaw: vi.fn().mockReturnThis(),
		write: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn().mockReturnThis(),
	},
}));

describe("action runner reporting contract", () => {
	it("skips a typed concurrent edit without failing or exposing the event identity", async () => {
		// Arrange
		const operation = vi.fn().mockRejectedValue(
			new EventConcurrentModificationError({
				repository: "private@example.test",
				issueNumber: 42,
			}),
		);

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.setFailed).not.toHaveBeenCalled();
		expect(core.info).toHaveBeenCalledWith("info event.concurrently-modified");
		expect(core.setOutput).toHaveBeenCalledWith(
			"diagnostics",
			JSON.stringify([
				{
					code: "event.concurrently-modified",
					severity: "info",
					message: "event.concurrently-modified",
				},
			]),
		);
		expect(
			JSON.stringify([
				vi.mocked(core.info).mock.calls,
				vi.mocked(core.setOutput).mock.calls,
				vi.mocked(core.summary.addRaw).mock.calls,
			]),
		).not.toContain("private@example.test");
	});

	it("does not downgrade an unknown error that mentions concurrent edits", async () => {
		// Arrange
		const operation = vi
			.fn()
			.mockRejectedValue(new Error("The event changed during reconciliation"));

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.setFailed).toHaveBeenCalledOnce();
		expect(core.setOutput).toHaveBeenCalledWith(
			"diagnostics",
			expect.stringContaining("action.execution.failed"),
		);
	});

	it("fails a missing locale before invoking the action and redacts the exception", async () => {
		// Arrange
		const operation = vi.fn();
		vi.mocked(core.getInput).mockImplementationOnce(() => {
			throw new Error("Input required and not supplied: locale");
		});

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.getInput).toHaveBeenCalledWith("locale", { required: true });
		expect(operation).not.toHaveBeenCalled();
		expect(core.setFailed).toHaveBeenCalledOnce();
		expect(core.summary.write).toHaveBeenCalledOnce();
		expect(core.setOutput).toHaveBeenCalledWith(
			"diagnostics",
			expect.stringContaining("action.execution.failed"),
		);
	});

	it.each([false, true])(
		"keeps diagnostics in reports without emitting an unused output on failure=%s",
		async (failure) => {
			// Arrange
			const operation = vi
				.fn()
				.mockResolvedValue({ details: ["Completed"], diagnostics: [] });
			if (failure)
				operation.mockRejectedValue(new Error("private source response"));

			// Act
			await new ActionRunner({
				diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
				actionFailurePresenter:
					new GithubActionsComposition().actionFailurePresenter(),
				actionReport: new GithubActionsComposition().actionReport(),
				actionOutput: new GithubActionsComposition().actionOutput(),
				createActionMessages: (...args) =>
					new GithubActionsComposition().actionMessages(...args),
			}).run("action.referential.validate", operation, false);

			// Assert
			expect(core.setOutput).not.toHaveBeenCalled();
			expect(core.summary.write).toHaveBeenCalledOnce();
			expect(core.setFailed).toHaveBeenCalledTimes(failure ? 1 : 0);
		},
	);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(core.getInput).mockReturnValue("en");
	});

	it.each(["Completed.", "Skipped: optional service is unavailable."])(
		"reports a normal outcome: %s",
		async (detail) => {
			// Arrange
			const operation = vi
				.fn()
				.mockResolvedValue({ details: [detail], diagnostics: [] });

			// Act
			await new ActionRunner({
				diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
				actionFailurePresenter:
					new GithubActionsComposition().actionFailurePresenter(),
				actionReport: new GithubActionsComposition().actionReport(),
				actionOutput: new GithubActionsComposition().actionOutput(),
				createActionMessages: (...args) =>
					new GithubActionsComposition().actionMessages(...args),
			}).run("action.event.reconcile", operation, true);

			// Assert
			expect(operation).toHaveBeenCalledOnce();
			expect(core.info).toHaveBeenCalledWith(detail);
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining(detail),
			);
			expect(core.setOutput).toHaveBeenCalledWith("diagnostics", "[]");
			expect(core.setFailed).not.toHaveBeenCalled();
		},
	);

	it("publishes validation errors without changing the caller's failure policy", async () => {
		// Arrange
		const diagnostics = [
			{
				code: "referential.speaker.id.duplicate",
				severity: "error",
				field: "records[1].id",
				message: "Correct the identifier.",
			},
		];
		const operation = vi
			.fn()
			.mockResolvedValue({ details: ["Invalid catalog."], diagnostics });

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.info).toHaveBeenCalledWith(
			"error referential.speaker.id.duplicate field=records[1].id",
		);
		expect(core.error).not.toHaveBeenCalled();
		expect(core.setOutput).toHaveBeenCalledWith(
			"diagnostics",
			JSON.stringify(diagnostics),
		);
		expect(core.setFailed).not.toHaveBeenCalled();
	});

	it("honors explicit failures even if the job summary is unavailable", async () => {
		// Arrange
		const operation = vi.fn().mockResolvedValue({
			details: ["Delivery rejected."],
			diagnostics: [],
			failure: "Reconciliation failed.",
		});
		vi.mocked(core.summary.write).mockRejectedValueOnce(
			new Error("private@example.test"),
		);

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.setFailed).toHaveBeenCalledWith("Reconciliation failed.");
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("failure=Reconciliation failed."),
		);
		expect(core.setOutput).toHaveBeenCalledWith("diagnostics", "[]");
	});

	it.each([
		["publication.assets.pdf.invalid", "warning"],
		["communication.ledger-read-failed", "error"],
		["communication.approval-notification-failed", "warning"],
		["future.technical-failure", "error"],
	] as const)(
		"fails on technical diagnostic %s while preserving its severity",
		async (code, severity) => {
			// Arrange
			const diagnostic = { code, severity, message: "Public diagnostic." };
			const operation = vi.fn().mockResolvedValue({
				details: [],
				diagnostics: [diagnostic, diagnostic],
			});

			// Act
			await new ActionRunner({
				diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
				actionFailurePresenter:
					new GithubActionsComposition().actionFailurePresenter(),
				actionReport: new GithubActionsComposition().actionReport(),
				actionOutput: new GithubActionsComposition().actionOutput(),
				createActionMessages: (...args) =>
					new GithubActionsComposition().actionMessages(...args),
			}).run("action.communication.reconcile-email", operation, true);

			// Assert
			expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
				`technical_failure=${code}`,
			);
			expect(core.setOutput).toHaveBeenCalledWith(
				"diagnostics",
				JSON.stringify([diagnostic, diagnostic]),
			);
			expect(core.error).not.toHaveBeenCalled();
			expect(core.warning).not.toHaveBeenCalled();
		},
	);

	it("keeps an explicit failure when technical diagnostics are also present", async () => {
		// Arrange
		const operation = vi.fn().mockResolvedValue({
			details: [],
			diagnostics: [
				{
					code: "communication.ledger-read-failed",
					severity: "error",
					message: "The ledger could not be loaded.",
				},
			],
			failure: "persistence=failed",
		});

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.communication.reconcile-email", operation, false);

		// Assert
		expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
			"persistence=failed",
		);
	});

	it("reports safe exception messages in annotations, diagnostics output, and the summary", async () => {
		// Arrange
		const error = new Error("The event could not be found.");
		error.name = "EventNotFoundError";
		const operation = vi.fn().mockRejectedValue(error);

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.info).toHaveBeenCalledWith("error action.execution.failed");
		expect(core.error).not.toHaveBeenCalled();
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("The event could not be found."),
		);
		expect(core.setFailed).toHaveBeenCalledWith(
			"EventNotFoundError: The event could not be found.",
		);
		expect(core.setOutput).toHaveBeenCalledWith(
			"diagnostics",
			expect.stringContaining("action.execution.failed"),
		);
	});

	it.each([
		new Error("private@example.test"),
		{ response: "private@example.test" },
	])(
		"redacts unknown exception content from every reporting surface",
		async (error) => {
			// Arrange
			const operation = vi.fn().mockRejectedValue(error);

			// Act
			await new ActionRunner({
				diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
				actionFailurePresenter:
					new GithubActionsComposition().actionFailurePresenter(),
				actionReport: new GithubActionsComposition().actionReport(),
				actionOutput: new GithubActionsComposition().actionOutput(),
				createActionMessages: (...args) =>
					new GithubActionsComposition().actionMessages(...args),
			}).run("action.event.reconcile", operation, true);

			// Assert
			expect(core.setFailed).toHaveBeenCalledOnce();
			expect(core.summary.write).toHaveBeenCalledOnce();
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining("failure=Unexpected technical failure."),
			);
			expect(
				JSON.stringify([
					vi.mocked(core.error).mock.calls,
					vi.mocked(core.info).mock.calls,
					vi.mocked(core.setFailed).mock.calls,
					vi.mocked(core.setOutput).mock.calls,
					vi.mocked(core.summary.addRaw).mock.calls,
				]),
			).not.toContain("private@example.test");
		},
	);
	it("uses one resolved locale throughout the report while preserving diagnostic JSON", async () => {
		// Arrange
		vi.mocked(core.getInput).mockReturnValue("fr-CA");
		const diagnostics = [
			{
				code: "referential.speaker.id.duplicate",
				severity: "error" as const,
				field: "speakers[2].speakerId",
				message: "Speaker stable identifiers must be unique.",
			},
		];
		const operation = vi.fn(
			async (messages: import("./i18n/action-messages.js").ActionMessages) => ({
				details: [messages.t("report.referential.invalid")],
				diagnostics,
			}),
		);

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.referential.validate", operation, false);

		// Assert
		expect(core.getInput).toHaveBeenCalledWith("locale", { required: true });
		expect(core.info).toHaveBeenCalledWith("referentials=invalid");
		expect(core.summary.addHeading).toHaveBeenCalledWith(
			"Valider les référentiels du meetup",
			2,
		);
		expect(core.info).toHaveBeenCalledWith(
			"error referential.speaker.id.duplicate field=speakers[2].speakerId",
		);
		expect(core.error).not.toHaveBeenCalled();
		expect(core.setOutput).not.toHaveBeenCalled();
		expect(core.setFailed).not.toHaveBeenCalled();
	});
	it.each(["en", "fr"])(
		"preserves the failing stage input path across reporting surfaces in %s",
		async (locale) => {
			// Arrange
			vi.mocked(core.getInput).mockReturnValue(locale);
			const input = JSON.stringify({
				assets: [
					{ outcome: "success", diagnostics: [] },
					{ outcome: "success", diagnostics: { private: "PRIVATE_TOKEN" } },
				],
			});
			const operation = async () => {
				new AttentionStageInput().parse(input);
				return { details: [], diagnostics: [] };
			};
			const runner = new GithubActionsComposition().actionRunner();
			const expected =
				"RuntimeInputError: stage-results.assets[1].diagnostics must be an array";

			// Act
			await runner.run("action.organizer.reconcile-checklist", operation, true);

			// Assert
			expect(core.setFailed).toHaveBeenCalledWith(
				expect.stringContaining(expected),
			);
			expect(core.info).toHaveBeenCalledWith(expect.stringContaining(expected));
			expect(core.summary.addRaw).toHaveBeenCalledWith(
				expect.stringContaining(expected),
			);
			expect(core.setOutput).toHaveBeenCalledWith(
				"diagnostics",
				expect.stringContaining(expected),
			);
			expect(
				JSON.stringify([
					vi.mocked(core.setFailed).mock.calls,
					vi.mocked(core.info).mock.calls,
					vi.mocked(core.summary.addRaw).mock.calls,
					vi.mocked(core.setOutput).mock.calls,
				]),
			).not.toContain("PRIVATE_TOKEN");
		},
	);
	it("redacts exceptions in French on every reporting surface", async () => {
		// Arrange
		vi.mocked(core.getInput).mockReturnValue("fr");
		const operation = vi
			.fn()
			.mockRejectedValue(new Error("private@example.test"));

		// Act
		await new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter:
				new GithubActionsComposition().actionFailurePresenter(),
			actionReport: new GithubActionsComposition().actionReport(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		}).run("action.event.reconcile", operation, true);

		// Assert
		expect(core.setFailed).toHaveBeenCalledWith(
			"Erreur technique inattendue. error=Error message=redacted",
		);
		expect(core.error).not.toHaveBeenCalled();
		expect(core.summary.addRaw).toHaveBeenCalledWith(
			expect.stringContaining("failure=Erreur technique inattendue."),
		);
		expect(
			JSON.stringify([
				vi.mocked(core.error).mock.calls,
				vi.mocked(core.setOutput).mock.calls,
				vi.mocked(core.summary.addRaw).mock.calls,
			]),
		).not.toContain("private@example.test");
	});
});

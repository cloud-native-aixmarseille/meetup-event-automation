import { JourneyPolicyComposition } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { AttentionStages } from "./attention-stages.js";
import { GithubActionsComposition } from "./dependency-composition.js";

describe("typed attention stage boundary", () => {
	it.each(["skipped", "cancelled", "", undefined])(
		"marks %s stages unknown",
		(outcome) => {
			// Arrange
			const input = JSON.stringify({ assets: { outcome } });

			// Act
			const result = new AttentionStages({
				attentionStageEvaluation:
					new JourneyPolicyComposition().attentionStageEvaluation(),
				attentionStageInput:
					new GithubActionsComposition().attentionStageInput(),
			}).parse(input);

			// Assert
			expect(result.find((stage) => stage.owner === "assets")?.outcome).toBe(
				"unknown",
			);
		},
	);
	it("recognizes audit diagnostics even when the original action reports success", () => {
		// Arrange
		const input = JSON.stringify({
			communications: {
				outcome: "success",
				diagnostics: JSON.stringify([
					{
						code: "communication.ledger-read-failed",
						severity: "error",
						message: "private@example.test",
					},
				]),
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(
			result.find((stage) => stage.owner === "communications"),
		).toMatchObject({ outcome: "success", blocked: true });
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});
	it.each([
		"communication.approval-rejected",
		"communication.approval-pending",
		"communication.delivery-already-recorded",
	])("does not turn %s into integration failure", (code) => {
		// Arrange
		const input = JSON.stringify({
			communications: {
				outcome: "success",
				diagnostics: [{ code, severity: "warning" }],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(
			result.find((stage) => stage.owner === "communications")?.blocked,
		).toBe(false);
	});
	it("reports the event blocker once instead of blaming dependent integrations", () => {
		// Arrange
		const proposal = { code: "event.proposals.not-found", severity: "error" };
		const input = JSON.stringify({
			event: { outcome: "success", diagnostics: [proposal] },
			feedback: { outcome: "success", diagnostics: [proposal] },
			communications: {
				outcome: "failure",
				diagnostics: [
					{
						code: "communication.event-references-unresolved",
						severity: "error",
					},
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(result.find((stage) => stage.owner === "event")).toMatchObject({
			outcome: "success",
			blocked: false,
			prerequisiteBlocked: true,
		});
		expect(result.find((stage) => stage.owner === "feedback")).toMatchObject({
			outcome: "success",
			blocked: false,
		});
		expect(
			result.find((stage) => stage.owner === "communications"),
		).toMatchObject({
			outcome: "failure",
			blocked: false,
			prerequisiteBlocked: true,
		});
	});
	it("keeps independent integration failures visible alongside an event blocker", () => {
		// Arrange
		const input = JSON.stringify({
			event: {
				outcome: "success",
				diagnostics: [{ code: "event.proposals.invalid", severity: "error" }],
			},
			communications: {
				outcome: "failure",
				diagnostics: [
					{
						code: "communication.event-references-unresolved",
						severity: "error",
					},
					{ code: "communication.ledger-read-failed", severity: "error" },
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(
			result.find((stage) => stage.owner === "communications"),
		).toMatchObject({ outcome: "failure", blocked: true });
	});
	it("retains an independent source-access failure in a later stage", () => {
		// Arrange
		const input = JSON.stringify({
			event: {
				outcome: "success",
				diagnostics: [
					{ code: "event.proposals.not-accepted", severity: "error" },
				],
			},
			feedback: {
				outcome: "success",
				diagnostics: [
					{ code: "referential.source.unavailable", severity: "error" },
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(result.find((stage) => stage.owner === "feedback")).toMatchObject({
			blocked: true,
		});
		expect(
			result.find((stage) => stage.owner === "feedback")?.prerequisiteBlocked,
		).toBeUndefined();
	});

	it.each([
		"event.hoster.missing",
		"event.proposals.not-found",
		"referential.speaker.email.invalid",
		"communication.event-references-unresolved",
		"publication.assets.content.conflict",
	])("keeps organizer work %s out of integration failures", (code) => {
		// Arrange
		const input = JSON.stringify({
			communications: {
				outcome: "success",
				diagnostics: [{ code, severity: "error" }],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(
			result.find((stage) => stage.owner === "communications"),
		).toMatchObject({
			blocked: false,
			prerequisiteBlocked: true,
		});
	});

	it("retains technical warning failures even when an action reported success", () => {
		// Arrange
		const input = JSON.stringify({
			communications: {
				outcome: "success",
				diagnostics: [
					{
						code: "communication.approval-notification-failed",
						severity: "warning",
					},
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(
			result.find((stage) => stage.owner === "communications"),
		).toMatchObject({ blocked: true });
	});

	it("merges public stage diagnostics without private messages or duplicate rows", () => {
		// Arrange
		const diagnostic = {
			code: "event.proposals.not-found",
			severity: "error",
			field: "agenda",
			message: "private@example.test",
			fixApplied: false,
		};
		const input = JSON.stringify({
			event: { diagnostics: [diagnostic] },
			feedback: { diagnostics: JSON.stringify([diagnostic]) },
			communications: {
				diagnostics: [
					{
						code: "communication.feedback-fetch-failed",
						severity: "error",
						field: "private@example.test",
						message: "Bearer secret",
					},
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).diagnostics(input);

		// Assert
		expect(result).toEqual([
			{
				code: diagnostic.code,
				severity: "error",
				field: "agenda",
				message: diagnostic.code,
				fixApplied: false,
			},
			{
				code: "communication.feedback-fetch-failed",
				severity: "error",
				message: "communication.feedback-fetch-failed",
			},
		]);
		expect(JSON.stringify(result)).not.toMatch(/private|secret/);
	});

	it("preserves unknown safe diagnostic codes as faults", () => {
		// Arrange
		const input = JSON.stringify({
			assets: {
				diagnostics: [{ code: "publication.unknown-fault", severity: "error" }],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).diagnostics(input);

		// Assert
		expect(result).toEqual([
			{
				code: "publication.unknown-fault",
				severity: "error",
				message: "publication.unknown-fault",
			},
		]);
	});

	it.each([
		{ code: "private@example.test", severity: "error" },
		{ code: "publication.unknown-fault", severity: "invalid" },
		{ code: "future.namespace-fault", severity: "error" },
		null,
		[],
	])(
		"rejects malformed diagnostics without treating the event report as complete: %s",
		(diagnostic) => {
			// Arrange
			const input = JSON.stringify({
				event: { outcome: "success", diagnostics: [diagnostic] },
			});
			let failure: unknown;

			// Act
			try {
				new AttentionStages({
					attentionStageEvaluation:
						new JourneyPolicyComposition().attentionStageEvaluation(),
					attentionStageInput:
						new GithubActionsComposition().attentionStageInput(),
				}).hasCompleteReports(input);
			} catch (error) {
				failure = error;
			}

			// Assert
			expect(failure).toBeInstanceOf(Error);
		},
	);

	it.each([
		"agenda.0.speakers.1",
		"speakers[12].sourceIdentity",
		"publicationLinks.feedback",
		"confirmations.host",
		"Aperitif",
		"Restaurant / Bar",
	])("preserves canonical organizer field %s", (field) => {
		// Arrange
		const input = JSON.stringify({
			event: {
				diagnostics: [
					{
						code: "event.document.invalid-field-type",
						severity: "error",
						field,
					},
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).diagnostics(input);

		// Assert
		expect(result[0].field).toBe(field);
	});

	it("leaves unexpected execution failures to stage attention without a duplicate checklist row", () => {
		// Arrange
		const input = JSON.stringify({
			assets: {
				outcome: "failure",
				diagnostics: [{ code: "action.execution.failed", severity: "error" }],
			},
		});

		// Act
		const diagnostics = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).diagnostics(input);
		const stages = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).parse(input);

		// Assert
		expect(diagnostics).toEqual([]);
		expect(stages.find((stage) => stage.owner === "assets")).toMatchObject({
			outcome: "failure",
			blocked: true,
		});
	});

	it.each([
		"null",
		"[]",
		'{"event":{"diagnostics":"malformed"}}',
		'{"event":{"diagnostics":{}}}',
	])("rejects malformed workflow stage input %s", (input) => {
		// Arrange
		let error: unknown;

		// Act
		try {
			new AttentionStages({
				attentionStageEvaluation:
					new JourneyPolicyComposition().attentionStageEvaluation(),
				attentionStageInput:
					new GithubActionsComposition().attentionStageInput(),
			}).diagnostics(input);
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toBeInstanceOf(Error);
	});

	it.each([
		{ event: { outcome: "success", diagnostics: [] }, reported: true },
		{ event: { outcome: "success", diagnostics: "[]" }, reported: true },
		{
			event: {
				outcome: "failure",
				diagnostics: [
					{ code: "event.proposals.unavailable", severity: "error" },
				],
			},
			reported: false,
		},
		{
			event: {
				outcome: "failure",
				diagnostics: [{ code: "action.execution.failed", severity: "error" }],
			},
			reported: false,
		},
		{
			event: {
				outcome: "success",
				diagnostics: [
					{ code: "event.concurrently-modified", severity: "info" },
				],
			},
			reported: false,
		},
		{ event: { outcome: "failure" }, reported: false },
		{ event: { outcome: "failure", diagnostics: "" }, reported: false },
		{ event: { outcome: "skipped", diagnostics: [] }, reported: false },
		{ event: undefined, reported: false },
	])(
		"reports event evaluation as $reported for $event",
		({ event, reported }) => {
			// Arrange
			const input = JSON.stringify({
				event,
				assets: { outcome: "success", diagnostics: [] },
				feedback: { outcome: "success", diagnostics: [] },
				communications: { outcome: "success", diagnostics: [] },
				content: { outcome: "success", diagnostics: [] },
			});

			// Act
			const result = new AttentionStages({
				attentionStageEvaluation:
					new JourneyPolicyComposition().attentionStageEvaluation(),
				attentionStageInput:
					new GithubActionsComposition().attentionStageInput(),
			}).hasCompleteReports(input);

			// Assert
			expect(result).toBe(reported);
		},
	);

	it.each([
		{
			root: "event.proposals.not-found",
			derivative: "communication.event-references-unresolved",
		},
		{
			root: "referential.source.rate-limited",
			derivative: "communication.referential-catalog-invalid",
		},
		{
			root: "publication.assets.content.conflict",
			derivative: "communication.slides-unavailable",
		},
		{
			root: "publication.feedback.agenda",
			derivative: "communication.feedback-unavailable",
		},
		{
			root: "event.proposals.mapping-required",
			derivative: "publication.feedback.agenda",
		},
		{
			root: "event.date.missing",
			derivative: "publication.assets.prerequisites",
		},
	])(
		"shows $root once instead of its consequence $derivative",
		({ root, derivative }) => {
			// Arrange
			const input = JSON.stringify({
				event: { diagnostics: [{ code: root, severity: "error" }] },
				communications: {
					diagnostics: [
						{ code: derivative, severity: "error" },
						{ code: "communication.ledger-read-failed", severity: "error" },
					],
				},
			});

			// Act
			const result = new AttentionStages({
				attentionStageEvaluation:
					new JourneyPolicyComposition().attentionStageEvaluation(),
				attentionStageInput:
					new GithubActionsComposition().attentionStageInput(),
			}).diagnostics(input);

			// Assert
			expect(result.map((item) => item.code)).toEqual([
				root,
				"communication.ledger-read-failed",
			]);
		},
	);

	it("keeps a dependent blocker when the only root diagnostic was fixed", () => {
		// Arrange
		const input = JSON.stringify({
			assets: {
				diagnostics: [
					{
						code: "publication.assets.content.conflict",
						severity: "warning",
						fixApplied: true,
					},
				],
			},
			communications: {
				diagnostics: [
					{
						code: "communication.slides-unavailable",
						severity: "error",
					},
				],
			},
		});

		// Act
		const result = new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: new GithubActionsComposition().attentionStageInput(),
		}).diagnostics(input);

		// Assert
		expect(result.map((item) => item.code)).toContain(
			"communication.slides-unavailable",
		);
	});
});

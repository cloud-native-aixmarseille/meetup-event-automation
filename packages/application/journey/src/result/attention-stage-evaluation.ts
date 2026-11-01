import type { AttentionStage } from "@meetup-automation/communication";
import {
	ATTENTION_STAGE_OWNERS,
	type AttentionStageReport,
	type AttentionStageReports,
} from "./attention-stage-reports.js";
import type { DiagnosticPolicy } from "./diagnostic-policy.js";
import type { OrganizerDiagnosticPolicy } from "./organizer-diagnostic-policy.js";
import type { PublicDiagnostic } from "./result-envelope.js";
/** Classifies stage evidence; a failed or absent evaluation cannot resolve work. */
export interface AttentionStageEvaluationCollaborators {
	readonly diagnosticPolicy: Pick<
		DiagnosticPolicy,
		"isTechnicalFailure" | "classify"
	>;
	readonly organizerDiagnosticPolicy: Pick<
		OrganizerDiagnosticPolicy,
		"derivative"
	>;
}

export class AttentionStageEvaluation {
	constructor(
		private readonly collaborators: AttentionStageEvaluationCollaborators,
	) {}

	evaluate(input: AttentionStageReports): readonly AttentionStage[] {
		const eventDiagnostics = input.event?.diagnostics ?? [];
		return this.owners(input).map((owner) => {
			const report = input[owner] as AttentionStageReport;
			const { diagnostics } = report;
			const outcome =
				report.outcome === "success" && !report.reported
					? "unknown"
					: report.outcome;
			const blocked = diagnostics.some(
				(item) =>
					this.collaborators.diagnosticPolicy.isTechnicalFailure(item) &&
					!this.eventPrerequisite(item.code, owner, eventDiagnostics),
			);
			const prerequisiteBlocked =
				outcome !== "unknown" &&
				!blocked &&
				diagnostics.some(
					(item) =>
						this.organizerPrerequisite(item) ||
						this.eventPrerequisite(item.code, owner, eventDiagnostics),
				);
			const failureResource = diagnostics.find(
				(item) =>
					AttentionStageEvaluation.MEETUP_FAILURES.has(item.code) &&
					this.collaborators.diagnosticPolicy.isTechnicalFailure(item),
			)?.code;
			return {
				owner,
				outcome,
				blocked,
				...(failureResource ? { failureResource } : {}),
				...(prerequisiteBlocked ? { prerequisiteBlocked: true } : {}),
			};
		});
	}
	private static readonly MEETUP_FAILURES = new Set([
		"publication.meetup.authentication-configuration",
		"publication.meetup.authentication-captcha-required",
		"publication.meetup.authentication-captcha-rejected",
		"publication.meetup.authentication-captcha-unavailable",
		"publication.meetup.authentication-session-not-reusable",
		"publication.meetup.authentication-login-page-unavailable",
		"publication.meetup.authentication-login-form-unavailable",
		"publication.meetup.authentication-submit-unavailable",
		"publication.meetup.authentication-redirect-timeout",
		"publication.meetup.authentication-account-unavailable",
		"publication.meetup.authentication-account-mismatch",
		"publication.meetup.authentication-unexpected-page",
		"publication.meetup.authentication-rate-limited",
		"publication.meetup.authentication-browser",
		"publication.meetup.editor",
		"publication.meetup.verification",
	]);
	diagnostics(input: AttentionStageReports): readonly PublicDiagnostic[] {
		const diagnostics = new Map<string, PublicDiagnostic>();
		for (const owner of this.owners(input))
			for (const item of input[owner]?.diagnostics ?? [])
				diagnostics.set(
					`${item.code}:${item.field ?? ""}:${item.severity}`,
					item,
				);
		const merged = [...diagnostics.values()];
		return merged.filter(
			(item) =>
				!["action.execution.failed", "event.concurrently-modified"].includes(
					item.code,
				) &&
				!this.collaborators.organizerDiagnosticPolicy.derivative(item, merged),
		);
	}
	complete(input: AttentionStageReports): boolean {
		return ATTENTION_STAGE_OWNERS.every((owner) =>
			this.stageComplete(input[owner]),
		);
	}
	socialComplete(input: AttentionStageReports): boolean {
		return Boolean(input.social && this.stageComplete(input.social));
	}
	private stageComplete(stage: AttentionStageReport | undefined): boolean {
		return (
			stage !== undefined &&
			stage.outcome === "success" &&
			stage.reported &&
			!stage.diagnostics.some(
				(item) =>
					this.collaborators.diagnosticPolicy.isTechnicalFailure(item) ||
					item.code === "event.concurrently-modified",
			)
		);
	}
	private owners(
		input: AttentionStageReports,
	): readonly AttentionStage["owner"][] {
		const owners: readonly AttentionStage["owner"][] = input.social
			? [...ATTENTION_STAGE_OWNERS, "social"]
			: ATTENTION_STAGE_OWNERS;
		return owners.filter((owner) => input[owner] !== undefined);
	}
	private organizerPrerequisite(item: PublicDiagnostic): boolean {
		if (item.code === "event.concurrently-modified") return true;
		return (
			this.collaborators.diagnosticPolicy.classify(item) === "organizer" &&
			![
				"communication.approval-pending",
				"communication.approval-rejected",
				"communication.social.pending",
				"communication.social.blocked",
				"communication.social.uncertain",
				"communication.social.expired",
				"publication.community.missing",
				"publication.meetup.missing",
				"publication.assets.missing",
				"publication.community.unpublished",
				"publication.meetup.unpublished",
				"publication.community.approval-pending",
				"publication.meetup.approval-pending",
				"publication.community.approval-rejected",
				"publication.meetup.approval-rejected",
				"publication.meetup.uncertain",
			].includes(item.code)
		);
	}

	private eventPrerequisite(
		code: string,
		owner: string,
		eventDiagnostics: readonly PublicDiagnostic[],
	): boolean {
		if (owner === "event") return false;
		return eventDiagnostics.some((item) => {
			if (
				this.collaborators.diagnosticPolicy.classify(item) ===
					"informational" ||
				!/^(event|referential)\./.test(item.code)
			)
				return false;
			return (
				item.code === code ||
				code === "communication.event-references-unresolved" ||
				(code === "communication.referential-catalog-invalid" &&
					item.code.startsWith("referential."))
			);
		});
	}
}

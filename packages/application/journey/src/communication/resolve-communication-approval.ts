import {
	CommunicationApproval,
	type CommunicationApprovalRepository,
} from "@meetup-automation/communication";
import {
	type EventDocument,
	type MeetupEvent,
	ReconcileEvent,
} from "@meetup-automation/event";
import type { AutomationConfig } from "../config/automation-config.js";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
} from "./contracts.js";

type ApprovalResolutionInput = {
	readonly input: ManageMeetupCommunicationsInput;
	readonly config: AutomationConfig;
	readonly repository: CommunicationApprovalRepository;
	readonly actorCanApprove: (actor: string) => Promise<boolean>;
	readonly captureApproval: boolean;
	readonly sourceDocument: EventDocument;
	readonly event: MeetupEvent;
	readonly readiness: "ready" | "not-ready";
	readonly notificationDestinationFingerprint: string | null;
	readonly diagnostics: CommunicationJourneyDiagnostic[];
};

export class CommunicationApprovalResolver {
	static async resolveCommunicationApproval(
		input: ApprovalResolutionInput,
	): Promise<boolean> {
		const eventId = `issue-${input.input.issueNumber}`;
		const approvalLabel = input.config.communication["approval-label"];
		const repository = input.repository;
		const current = CommunicationApprovalResolver.snapshot(input);

		const trigger = input.input.approvalTrigger;
		const hasApprovalLabel = input.event.labels.some((label) =>
			CommunicationApprovalResolver.labelsEqual(label, approvalLabel),
		);
		if (
			input.captureApproval &&
			hasApprovalLabel &&
			trigger?.action === "labeled" &&
			CommunicationApprovalResolver.labelsEqual(trigger.label, approvalLabel)
		) {
			if (
				!(await CommunicationApprovalResolver.capture(input, trigger, current))
			)
				return false;
		}

		if (!hasApprovalLabel) {
			input.diagnostics.push({
				code: "communication.approval-label-missing",
				severity: "warning",
			});
			return false;
		}

		try {
			const approved = await repository.findApproved(eventId);
			if (!approved) {
				input.diagnostics.push({
					code: "communication.approval-missing",
					severity: "warning",
				});
				return false;
			}
			if (
				!CommunicationApproval.communicationApprovalMatches(
					approved,
					current.facts,
				)
			) {
				input.diagnostics.push({
					code: "communication.approval-stale",
					severity: "warning",
				});
				return false;
			}
			return true;
		} catch {
			input.diagnostics.push({
				code: "communication.approval-repository-failed",
				severity: "error",
			});
			return false;
		}
	}

	static labelsEqual(left: string, right: string): boolean {
		return (
			left.trim().toLocaleLowerCase("en-US") ===
			right.trim().toLocaleLowerCase("en-US")
		);
	}

	private static snapshot(input: ApprovalResolutionInput) {
		return CommunicationApproval.createCommunicationApprovalSnapshot({
			automationRevision: input.input.automationRevision,
			eventId: `issue-${input.input.issueNumber}`,
			eventDate: input.event.date,
			occurrenceStatus: input.event.occurrenceStatus ?? "unknown",
			readiness: input.readiness,
			policyVersion: String(input.config.communication["policy-version"]),
			mailingsRepository: input.config.communication["mailings-repository"],
			notificationEnabled: input.config.communication["slack-enabled"],
			notificationDestinationFingerprint:
				input.notificationDestinationFingerprint,
			confirmations: input.event.confirmations,
			hostId: input.event.host?.id ?? null,
			speakerIds: input.event.agenda.flatMap((entry) =>
				entry.speakers.flatMap((speaker) => (speaker.id ? [speaker.id] : [])),
			),
			publicationUrls: {
				meetup: input.event.publicationLinks.meetup ?? null,
				community: input.event.publicationLinks.community ?? null,
				assets: input.event.publicationLinks.assets ?? null,
			},
		});
	}

	private static async capture(
		input: ApprovalResolutionInput,
		trigger: NonNullable<ManageMeetupCommunicationsInput["approvalTrigger"]>,
		current: ReturnType<
			typeof CommunicationApproval.createCommunicationApprovalSnapshot
		>,
	): Promise<boolean> {
		if (!trigger.issueSnapshot) {
			input.diagnostics.push({
				code: "communication.approval-trigger-snapshot-missing",
				severity: "error",
			});
			return false;
		}
		if (
			!ReconcileEvent.eventDocumentsEqual(
				trigger.issueSnapshot,
				input.sourceDocument,
			)
		) {
			input.diagnostics.push({
				code: "communication.approval-trigger-stale",
				severity: "error",
			});
			return false;
		}
		try {
			if (!(await input.actorCanApprove(trigger.actor))) {
				input.diagnostics.push({
					code: "communication.approval-capture-unauthorized",
					severity: "error",
				});
				return false;
			} else {
				await input.repository.saveApproved(current);
			}
		} catch {
			input.diagnostics.push({
				code: "communication.approval-repository-failed",
				severity: "error",
			});
			return false;
		}
		return true;
	}
}

import {
	type CommunicationApprovalRepository,
	communicationApprovalMatches,
	createCommunicationApprovalSnapshot,
} from "@meetup-automation/communication";
import {
	type EventDocument,
	eventDocumentsEqual,
	type MeetupEvent,
} from "@meetup-automation/event";
import type { AutomationConfig } from "../config/automation-config.js";
import type {
	CommunicationJourneyDiagnostic,
	ManageMeetupCommunicationsInput,
} from "./contracts.js";

export async function resolveCommunicationApproval(input: {
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
}): Promise<boolean> {
	const eventId = `issue-${input.input.issueNumber}`;
	const approvalLabel = input.config.communication["approval-label"];
	const repository = input.repository;
	const current = createCommunicationApprovalSnapshot({
		automationRevision: input.input.automationRevision,
		eventId,
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

	const trigger = input.input.approvalTrigger;
	const hasApprovalLabel = input.event.labels.some((label) =>
		labelsEqual(label, approvalLabel),
	);
	if (
		input.captureApproval &&
		hasApprovalLabel &&
		trigger?.action === "labeled" &&
		labelsEqual(trigger.label, approvalLabel)
	) {
		if (!trigger.issueSnapshot) {
			input.diagnostics.push({
				code: "communication.approval-trigger-snapshot-missing",
				severity: "error",
			});
			return false;
		}
		if (!eventDocumentsEqual(trigger.issueSnapshot, input.sourceDocument)) {
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
				await repository.saveApproved(current);
			}
		} catch {
			input.diagnostics.push({
				code: "communication.approval-repository-failed",
				severity: "error",
			});
			return false;
		}
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
		if (!communicationApprovalMatches(approved, current.facts)) {
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

function labelsEqual(left: string, right: string): boolean {
	return (
		left.trim().toLocaleLowerCase("en-US") ===
		right.trim().toLocaleLowerCase("en-US")
	);
}

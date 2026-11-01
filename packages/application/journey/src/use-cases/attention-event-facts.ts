import type {
	AttentionFacts,
	AttentionPolicy,
} from "@meetup-automation/communication";
import {
	type EventDiagnostic,
	type EventDocumentDecodeResult,
	type EventRuleEngine,
	type EventRuleEngineArguments,
	type EventRuleFactory,
	EXPECTED_POST_EVENT_TASK_NAMES,
	type MeetupEvent,
} from "@meetup-automation/event";
import { FOLLOW_UP_TASKS } from "../ports/organizer-follow-up.js";
import type { CommunicationChecklist } from "./communication-checklist.js";
import type { EventPublicationEvaluation } from "./event-publication-evaluation.js";
export interface AttentionEventFactsCollaborators {
	readonly eventRuleFactory: Pick<EventRuleFactory, "createDefaultEventRules">;
	readonly eventPublicationEvaluation: Pick<
		EventPublicationEvaluation,
		| "evaluatePublication"
		| "planEventManualPublicationTasks"
		| "checklistTaskIsCompleted"
	>;
	readonly attentionPolicy: Pick<AttentionPolicy, "eventDay">;
	readonly communicationChecklist: Pick<CommunicationChecklist, "status">;
	readonly createEventRuleEngine: (
		...args: EventRuleEngineArguments
	) => EventRuleEngine;
}

export class AttentionEventFacts {
	constructor(
		private readonly collaborators: AttentionEventFactsCollaborators,
	) {}

	create(decoded: EventDocumentDecodeResult): Omit<AttentionFacts, "stages"> {
		const evaluated = this.collaborators
			.createEventRuleEngine(
				this.collaborators.eventRuleFactory.createDefaultEventRules(),
			)
			.evaluate(decoded.event);
		const publication =
			this.collaborators.eventPublicationEvaluation.evaluatePublication(
				evaluated.event,
			);
		const event = publication.event;
		const diagnostics = [
			...decoded.diagnostics,
			...evaluated.diagnostics,
			...publication.diagnostics,
		];
		const tasks =
			this.collaborators.eventPublicationEvaluation.planEventManualPublicationTasks(
				event,
			);
		return {
			eventDate:
				this.collaborators.attentionPolicy.eventDay(event.date) === undefined
					? ""
					: event.date,
			closed: event.issueState === "closed",
			occurrence: event.occurrenceStatus ?? "scheduled",
			requiredDataFields: this.requiredFields(diagnostics),
			hostConfirmed: Boolean(event.host?.displayName.trim()),
			speakersConfirmed: event.confirmations.speakers,
			publicationPending: [
				...tasks
					.filter(
						(task) =>
							task.status === "pending" && task.kind !== "import-attendance",
					)
					.map((task) => task.kind),
			],
			followUpPending: this.followUp(event),
		};
	}
	private requiredFields(diagnostics: readonly EventDiagnostic[]): string[] {
		const fields = diagnostics
			.filter(
				(item) =>
					(item.category === "invalid" || item.category === "incomplete") &&
					!/^publication\.(meetup|community|assets)\.(missing|unpublished)$/.test(
						item.code,
					),
			)
			.map((item) => {
				const field = item.field ?? "";
				if (/^agenda\.\d+\.speakers/.test(field)) return "agenda-speakers";
				if (/^agenda\.\d+\.description/.test(field))
					return "agenda-descriptions";
				return (
					AttentionEventFacts.REQUIRED_FIELDS.get(field) ??
					AttentionEventFacts.REQUIRED_FIELDS.get(field.split(".")[0]) ??
					"event-form"
				);
			});
		return [...new Set(fields)];
	}
	private static readonly REQUIRED_FIELDS = new Map([
		["date", "date"],
		["eventTitle", "title"],
		["title", "title"],
		["description", "description"],
		["agenda", "agenda"],
		["host", "host"],
		["hoster", "host"],
		["labels", "event-status"],
		["event_status", "event-status"],
		["occurrenceStatus", "event-status"],
		["publicationLinks", "publication-links"],
		["confirmations", "confirmations"],
		["publicationLinks.meetup", "meetup-link"],
		["publicationLinks.community", "community-link"],
		["publicationLinks.assets", "assets-link"],
		["publicationLinks.feedback", "feedback-link"],
	]);
	private followUp(event: MeetupEvent): string[] {
		return EXPECTED_POST_EVENT_TASK_NAMES.flatMap((name, index) => {
			if (name === "Share slides to meetup") return [];
			const completed =
				index < 2
					? this.collaborators.communicationChecklist.status(
							event,
							index === 0 ? "host-thanks" : "speaker-thanks",
						) === "completed"
					: this.collaborators.eventPublicationEvaluation.checklistTaskIsCompleted(
							event.operationalChecklists.postEvent,
							name,
						);
			return completed ? [] : [FOLLOW_UP_TASKS[index]];
		});
	}
}

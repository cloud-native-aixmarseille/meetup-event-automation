import type {
	AttentionFacts,
	AttentionPolicy,
} from "@meetup-automation/communication";
import {
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
			requiredDataMissing: diagnostics.some(
				(item) => item.category === "invalid" || item.category === "incomplete",
			),
			hostConfirmed: event.confirmations.host,
			speakersConfirmed: event.confirmations.speakers,
			publicationPending: [
				...tasks
					.filter(
						(task) =>
							task.status === "pending" &&
							!["publish-slides", "import-attendance"].includes(task.kind),
					)
					.map((task) => task.kind),
				...this.announcements(event.operationalChecklists.communication),
			],
			followUpPending: this.followUp(event),
		};
	}
	private followUp(event: MeetupEvent): string[] {
		return EXPECTED_POST_EVENT_TASK_NAMES.flatMap((name, index) => {
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
	private announcements(
		items: readonly { name: string; completed: boolean }[],
	): string[] {
		const tasks = [
			["Slack - AixMarseille.Tech", "public-slack-local"],
			["Slack - OpenBaR", "public-slack-community"],
			["Social networks", "public-social"],
		] as const;
		return tasks
			.filter(([name]) =>
				items.some((item) => item.name === name && !item.completed),
			)
			.map(([, resource]) => resource);
	}
}

import {
	AttentionPolicy,
	type AttentionFacts,
} from "@meetup-automation/communication";
import {
	type EventDocumentDecodeResult,
	type MeetupEvent,
	EventRuleEngine,
	EventRuleFactory,
	EXPECTED_POST_EVENT_TASK_NAMES,
} from "@meetup-automation/event";
import type { AutomationConfig } from "../config/automation-config.js";
import { EventPublicationEvaluation } from "./event-publication-evaluation.js";
import { CommunicationChecklist } from "./communication-checklist.js";
import { FOLLOW_UP_TASKS } from "../ports/organizer-follow-up.js";
export class AttentionEventFacts {
	static create(
		decoded: EventDocumentDecodeResult,
		config: AutomationConfig,
	): Omit<AttentionFacts, "stages"> {
		const evaluated = new EventRuleEngine(
			EventRuleFactory.createDefaultEventRules(),
		).evaluate(decoded.event);
		const publication = EventPublicationEvaluation.evaluatePublication(
			evaluated.event,
			config,
		);
		const event = publication.event;
		const diagnostics = [
			...decoded.diagnostics,
			...evaluated.diagnostics,
			...publication.diagnostics,
		];
		const tasks =
			EventPublicationEvaluation.planEventManualPublicationTasks(event);
		return {
			eventDate:
				AttentionPolicy.eventDay(event.date) === undefined ? "" : event.date,
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
				...AttentionEventFacts.announcements(
					event.operationalChecklists.communication,
				),
			],
			followUpPending: AttentionEventFacts.followUp(event),
		};
	}
	private static followUp(event: MeetupEvent): string[] {
		return EXPECTED_POST_EVENT_TASK_NAMES.flatMap((name, index) => {
			const completed =
				index < 2
					? CommunicationChecklist.status(
							event,
							index === 0 ? "host-thanks" : "speaker-thanks",
						) === "completed"
					: EventPublicationEvaluation.checklistTaskIsCompleted(
							event.operationalChecklists.postEvent,
							name,
						);
			return completed ? [] : [FOLLOW_UP_TASKS[index]];
		});
	}
	private static announcements(
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

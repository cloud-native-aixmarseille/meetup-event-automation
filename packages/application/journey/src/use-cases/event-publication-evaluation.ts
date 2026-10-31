import {
	type EventDiagnostic,
	type MeetupEvent,
	type MeetupPublicationChecklist,
	POST_EVENT_TASK_NAMES,
} from "@meetup-automation/event";
import type {
	ManualPublicationPolicy,
	ManualPublicationTask,
	PublicationUrlPolicyEngine,
} from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export interface EventPublicationEvaluationCollaborators {
	readonly meetupPublicationChecklist: Pick<
		MeetupPublicationChecklist,
		"isPublished"
	>;
	readonly publicationUrlPolicyEngine: Pick<
		PublicationUrlPolicyEngine,
		"evaluate"
	>;
	readonly manualPublicationPolicy: Pick<
		ManualPublicationPolicy,
		"planManualPublicationTasks"
	>;
}

export class EventPublicationEvaluation {
	constructor(
		private readonly collaborators: EventPublicationEvaluationCollaborators,
	) {}

	evaluatePublication(event: MeetupEvent): {
		event: MeetupEvent;
		diagnostics: EventDiagnostic[];
	} {
		const diagnostics: EventDiagnostic[] = [];
		for (const field of ["meetup", "community", "assets"] as const) {
			const value = event.publicationLinks[field];
			if (!value) {
				diagnostics.push({
					code: `publication.${field}.missing`,
					severity: "warning",
					category: "incomplete",
					field: `publicationLinks.${field}`,
					message: `${field} publication link is required before the event is ready`,
				});
			}
		}
		if (
			event.publicationLinks.meetup &&
			!this.collaborators.meetupPublicationChecklist.isPublished(event)
		) {
			diagnostics.push({
				code: "publication.meetup.unpublished",
				severity: "warning",
				category: "incomplete",
				field: "publicationLinks.meetup",
				message:
					"Meetup publication must be confirmed in the Communication checklist before the event is ready",
			});
		}
		const evaluation = this.collaborators.publicationUrlPolicyEngine.evaluate(
			event.publicationLinks,
		);
		diagnostics.push(
			...evaluation.diagnostics.map((item) => ({
				code: item.code,
				severity: item.severity,
				category:
					item.severity === "error"
						? ("invalid" as const)
						: ("normalization" as const),
				field: `publicationLinks.${item.field}`,
				message: item.message,
				fixAvailable: item.fixAvailable,
			})),
		);
		return {
			event: { ...event, publicationLinks: evaluation.references },
			diagnostics,
		};
	}

	planEventManualPublicationTasks(
		event: MeetupEvent,
	): readonly ManualPublicationTask[] {
		return this.collaborators.manualPublicationPolicy.planManualPublicationTasks(
			{
				eventId: `${event.identity.repository}#${event.identity.issueNumber}`,
				title: event.eventTitle,
				description: event.description,
				date: event.date,
				timeZone: event.timeZone,
				occurrenceStatus: event.occurrenceStatus,
				references: event.publicationLinks,
				attendanceImported: this.checklistTaskIsCompleted(
					event.operationalChecklists.postEvent,
					POST_EVENT_TASK_NAMES.importAttendance,
				),
			},
		);
	}

	checklistTaskIsCompleted(
		items: MeetupEvent["operationalChecklists"]["postEvent"],
		name: string,
	): boolean {
		const matches = items.filter((item) => item.name === name);
		return matches.length === 1 && matches[0]?.completed === true;
	}

	pendingManualTaskDiagnostics(
		tasks: readonly ManualPublicationTask[],
	): readonly PublicDiagnostic[] {
		return tasks
			.filter((task) => task.status === "pending")
			.map((task) => ({
				code: `publication.manual-task.${task.kind}.pending`,
				severity: "info" as const,
				field: `manualPublicationTasks.${task.kind}`,
				message: `Manual task pending: ${task.reason}`,
			}));
	}
}

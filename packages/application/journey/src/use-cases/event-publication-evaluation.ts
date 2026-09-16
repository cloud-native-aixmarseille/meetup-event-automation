import {
	type EventDiagnostic,
	type MeetupEvent,
	POST_EVENT_TASK_NAMES,
} from "@meetup-automation/event";
import {
	DEFAULT_PUBLICATION_URL_CONFIGURATION,
	ManualPublicationPolicy,
	type ManualPublicationTask,
	PublicationUrlPolicies,
	PublicationUrlPolicyEngine,
} from "@meetup-automation/publication";
import type { AutomationConfig } from "../config/automation-config.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class EventPublicationEvaluation {
	static evaluatePublication(
		event: MeetupEvent,
		config: AutomationConfig,
	): { event: MeetupEvent; diagnostics: EventDiagnostic[] } {
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
		const engine = new PublicationUrlPolicyEngine(
			PublicationUrlPolicies.createDefaultPublicationUrlPolicies({
				...DEFAULT_PUBLICATION_URL_CONFIGURATION,
				meetupEventUrlPrefix: config.publication["meetup-event-url-prefix"],
				communityEventUrlPrefixes: [
					config.publication["cncf-event-url-prefix"],
					...DEFAULT_PUBLICATION_URL_CONFIGURATION.communityEventUrlPrefixes.slice(
						1,
					),
				],
			}),
		);
		const evaluation = engine.evaluate(event.publicationLinks);
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

	static planEventManualPublicationTasks(
		event: MeetupEvent,
	): readonly ManualPublicationTask[] {
		return ManualPublicationPolicy.planManualPublicationTasks({
			eventId: `${event.identity.repository}#${event.identity.issueNumber}`,
			title: event.eventTitle,
			description: event.description,
			date: event.date,
			timeZone: event.timeZone,
			occurrenceStatus: event.occurrenceStatus,
			references: event.publicationLinks,
			slidesPublished: EventPublicationEvaluation.checklistTaskIsCompleted(
				event.operationalChecklists.postEvent,
				POST_EVENT_TASK_NAMES.shareSlides,
			),
			attendanceImported: EventPublicationEvaluation.checklistTaskIsCompleted(
				event.operationalChecklists.postEvent,
				POST_EVENT_TASK_NAMES.importAttendance,
			),
		});
	}

	static checklistTaskIsCompleted(
		items: MeetupEvent["operationalChecklists"]["postEvent"],
		name: string,
	): boolean {
		const matches = items.filter((item) => item.name === name);
		return matches.length === 1 && matches[0]?.completed === true;
	}

	static pendingManualTaskDiagnostics(
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

import { CommunicationCalendar } from "./communication-calendar.js";
import { CommunicationPlanner } from "./communication-planner.js";
import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	PlanCommunicationsInput,
	PlanCommunicationsResult,
} from "./model.js";

export class PlanCommunications {
	execute(input: PlanCommunicationsInput): PlanCommunicationsResult {
		const diagnostics: CommunicationDiagnostic[] = [];

		if (!CommunicationPlanner.hasValidBaseIdentifiers(input)) {
			return {
				intents: [],
				diagnostics: [
					CommunicationPlanner.errorDiagnostic("invalid-identifier"),
				],
			};
		}

		if (!CommunicationCalendar.isValidInstant(input.now)) {
			return {
				intents: [],
				diagnostics: [CommunicationPlanner.errorDiagnostic("invalid-clock")],
			};
		}

		if (
			input.occurrenceStatus === "cancelled" ||
			input.occurrenceStatus === "postponed"
		) {
			return { intents: [], diagnostics };
		}

		if (input.occurrenceStatus === "unknown") {
			return {
				intents: [],
				diagnostics: [
					CommunicationPlanner.warningDiagnostic("occurrence-status-unknown"),
				],
			};
		}

		const eventDate = CommunicationCalendar.parseIsoLocalDate(input.eventDate);
		if (!eventDate) {
			return {
				intents: [],
				diagnostics: [
					CommunicationPlanner.errorDiagnostic("invalid-event-date"),
				],
			};
		}

		const currentDate = CommunicationCalendar.getLocalDate(
			input.now,
			input.timeZone,
		);
		if (!currentDate) {
			return {
				intents: [],
				diagnostics: [
					CommunicationPlanner.errorDiagnostic("invalid-time-zone"),
				],
			};
		}

		const daysUntilEvent =
			CommunicationCalendar.toEpochDay(eventDate) -
			CommunicationCalendar.toEpochDay(currentDate);
		return this.planDue(input, daysUntilEvent, diagnostics);
	}

	private planDue(
		input: PlanCommunicationsInput,
		daysUntilEvent: number,
		diagnostics: CommunicationDiagnostic[],
	) {
		const intents: CommunicationIntent[] = [];
		if (input.occurrenceStatus === "held") {
			CommunicationPlanner.planMailMessages(
				input,
				"thanks",
				intents,
				diagnostics,
			);
			return CommunicationPlanner.deduplicateIntents(intents, diagnostics);
		}

		// A scheduled event in the past is not evidence that it was held. It must
		// be explicitly transitioned before any occurrence-dependent mail is due.
		if (daysUntilEvent < 0) {
			return { intents: [], diagnostics };
		}

		if (input.readiness === "ready") {
			CommunicationPlanner.planMailMessages(
				input,
				"introduction",
				intents,
				diagnostics,
			);
			return CommunicationPlanner.deduplicateIntents(intents, diagnostics);
		}

		if (
			!Number.isInteger(input.readinessWindowDays) ||
			input.readinessWindowDays < 0
		) {
			return {
				intents: [],
				diagnostics: [
					CommunicationPlanner.errorDiagnostic("invalid-readiness-window"),
				],
			};
		}

		if (daysUntilEvent > input.readinessWindowDays) {
			return { intents: [], diagnostics };
		}

		CommunicationPlanner.planReadinessNotifications(
			input,
			intents,
			diagnostics,
		);
		return CommunicationPlanner.deduplicateIntents(intents, diagnostics);
	}
}

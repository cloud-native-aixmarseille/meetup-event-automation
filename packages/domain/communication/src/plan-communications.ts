import type { CommunicationCalendar } from "./communication-calendar.js";
import type { CommunicationPlanner } from "./communication-planner.js";
import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	PlanCommunicationsInput,
	PlanCommunicationsResult,
} from "./model.js";
import type { PostEventPolicy } from "./post-event-policy.js";

export interface PlanCommunicationsCollaborators {
	readonly communicationPlanner: Pick<
		CommunicationPlanner,
		| "hasValidBaseIdentifiers"
		| "errorDiagnostic"
		| "warningDiagnostic"
		| "planMailMessages"
		| "deduplicateIntents"
	>;
	readonly communicationCalendar: Pick<
		CommunicationCalendar,
		"isValidInstant" | "parseIsoLocalDate" | "getLocalDate"
	>;
	readonly postEventPolicy: Pick<PostEventPolicy, "isDue">;
}

export class PlanCommunications {
	constructor(
		private readonly collaborators: PlanCommunicationsCollaborators,
	) {}

	execute(input: PlanCommunicationsInput): PlanCommunicationsResult {
		const diagnostics: CommunicationDiagnostic[] = [];

		if (
			!this.collaborators.communicationPlanner.hasValidBaseIdentifiers(input)
		) {
			return {
				intents: [],
				diagnostics: [
					this.collaborators.communicationPlanner.errorDiagnostic(
						"invalid-identifier",
					),
				],
			};
		}

		if (!this.collaborators.communicationCalendar.isValidInstant(input.now)) {
			return {
				intents: [],
				diagnostics: [
					this.collaborators.communicationPlanner.errorDiagnostic(
						"invalid-clock",
					),
				],
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
					this.collaborators.communicationPlanner.warningDiagnostic(
						"occurrence-status-unknown",
					),
				],
			};
		}

		const eventDate =
			this.collaborators.communicationCalendar.parseIsoLocalDate(
				input.eventDate,
			);
		if (!eventDate) {
			return {
				intents: [],
				diagnostics: [
					this.collaborators.communicationPlanner.errorDiagnostic(
						"invalid-event-date",
					),
				],
			};
		}

		const currentDate = this.collaborators.communicationCalendar.getLocalDate(
			input.now,
			input.timeZone,
		);
		if (!currentDate) {
			return {
				intents: [],
				diagnostics: [
					this.collaborators.communicationPlanner.errorDiagnostic(
						"invalid-time-zone",
					),
				],
			};
		}

		return this.planDue(input, diagnostics);
	}

	private planDue(
		input: PlanCommunicationsInput,
		diagnostics: CommunicationDiagnostic[],
	) {
		const intents: CommunicationIntent[] = [];
		if (this.collaborators.postEventPolicy.isDue(input)) {
			this.collaborators.communicationPlanner.planMailMessages(
				input,
				"thanks",
				intents,
				diagnostics,
			);
			return this.collaborators.communicationPlanner.deduplicateIntents(
				intents,
				diagnostics,
			);
		}

		if (input.readiness === "ready") {
			this.collaborators.communicationPlanner.planMailMessages(
				input,
				"introduction",
				intents,
				diagnostics,
			);
			return this.collaborators.communicationPlanner.deduplicateIntents(
				intents,
				diagnostics,
			);
		}

		return { intents, diagnostics };
	}
}

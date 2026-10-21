import { EventRepositoryPatches } from "./application/ports/event-repository.js";
import { EventDocumentConcurrency } from "./application/use-cases/event-document-concurrency.js";
import {
	ListActiveEvents,
	type ListActiveEventsArguments,
} from "./application/use-cases/list-active-events.js";
import {
	ReconcileEvent,
	type ReconcileEventArguments,
} from "./application/use-cases/reconcile-event.js";
import { EventDiagnostics } from "./domain/diagnostic.js";
import { EventAgendaEquality } from "./domain/event-agenda-equality.js";
import { EventAgendaRule } from "./domain/event-agenda-rule.js";
import { EventChecklists } from "./domain/event-checklists.js";
import { EventDateRule } from "./domain/event-date-rule.js";
import { EventDateValidation } from "./domain/event-date-validation.js";
import { EventDescriptionRule } from "./domain/event-description-rule.js";
import { EventHostRule } from "./domain/event-host-rule.js";
import { EventLinksRule } from "./domain/event-links-rule.js";
import { EventOccurrenceParser } from "./domain/event-occurrence-parser.js";
import { EventParticipantNormalization } from "./domain/event-participant-normalization.js";
import {
	EventRuleEngine,
	type EventRuleEngineArguments,
} from "./domain/event-rule-engine.js";
import { EventRuleFactory } from "./domain/event-rule-factory.js";
import { EventRuleOrdering } from "./domain/event-rule-ordering.js";
import { EventRuleResults } from "./domain/event-rule-results.js";
import { EventTitleRule } from "./domain/event-title-rule.js";
import { IssueTitleRule } from "./domain/issue-title-rule.js";
import { EventLifecycle } from "./domain/lifecycle.js";
import {
	ManagedLabelsRule,
	type ManagedLabelsRuleArguments,
} from "./domain/managed-labels-rule.js";
import { MeetupPublicationChecklist } from "./domain/meetup-publication-checklist.js";
import { MeetupEventOperations } from "./domain/model.js";
import { EventPatches } from "./domain/patch.js";
import { EventReadinessPolicy } from "./domain/readiness.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class EventDomainComposition {
	eventAgendaEquality(): EventAgendaEquality {
		return new EventAgendaEquality();
	}
	eventAgendaRule(): EventAgendaRule {
		return new EventAgendaRule({
			eventRuleResults: this.eventRuleResults(),
			eventAgendaEquality: this.eventAgendaEquality(),
			eventPatches: this.eventPatches(),
			eventDiagnostics: this.eventDiagnostics(),
			eventParticipantNormalization: this.eventParticipantNormalization(),
		});
	}
	eventChecklists(): EventChecklists {
		return new EventChecklists();
	}
	eventDateRule(): EventDateRule {
		return new EventDateRule({
			eventRuleResults: this.eventRuleResults(),
			eventDateValidation: this.eventDateValidation(),
		});
	}
	eventDateValidation(): EventDateValidation {
		return new EventDateValidation();
	}
	eventDescriptionRule(): EventDescriptionRule {
		return new EventDescriptionRule({
			eventRuleResults: this.eventRuleResults(),
		});
	}
	eventDiagnostics(): EventDiagnostics {
		return new EventDiagnostics();
	}
	eventDocumentConcurrency(): EventDocumentConcurrency {
		return new EventDocumentConcurrency();
	}
	eventHostRule(): EventHostRule {
		return new EventHostRule({
			eventRuleResults: this.eventRuleResults(),
			eventParticipantNormalization: this.eventParticipantNormalization(),
			eventPatches: this.eventPatches(),
		});
	}
	eventLifecycle(): EventLifecycle {
		return new EventLifecycle({
			meetupEventOperations: this.meetupEventOperations(),
		});
	}
	eventLinksRule(): EventLinksRule {
		return new EventLinksRule({
			eventDiagnostics: this.eventDiagnostics(),
			eventPatches: this.eventPatches(),
		});
	}
	eventOccurrenceParser(): EventOccurrenceParser {
		return new EventOccurrenceParser({
			eventDiagnostics: this.eventDiagnostics(),
		});
	}
	eventParticipantNormalization(): EventParticipantNormalization {
		return new EventParticipantNormalization();
	}
	eventPatches(): EventPatches {
		return new EventPatches({
			meetupEventOperations: this.meetupEventOperations(),
		});
	}
	eventReadinessPolicy(): EventReadinessPolicy {
		return new EventReadinessPolicy({
			eventDiagnostics: this.eventDiagnostics(),
		});
	}
	eventRepositoryPatches(): EventRepositoryPatches {
		return new EventRepositoryPatches();
	}
	eventRuleEngine(...args: EventRuleEngineArguments): EventRuleEngine {
		return new EventRuleEngine(
			{
				eventRuleOrdering: this.eventRuleOrdering(),
				eventPatches: this.eventPatches(),
			},
			...args,
		);
	}
	eventRuleFactory(): EventRuleFactory {
		return new EventRuleFactory({
			createEventDateRule: () => this.eventDateRule(),
			createEventTitleRule: () => this.eventTitleRule(),
			createEventDescriptionRule: () => this.eventDescriptionRule(),
			createEventHostRule: () => this.eventHostRule(),
			createEventAgendaRule: () => this.eventAgendaRule(),
			createEventLinksRule: () => this.eventLinksRule(),
			createIssueTitleRule: () => this.issueTitleRule(),
			createManagedLabelsRule: (...args) => this.managedLabelsRule(...args),
		});
	}
	eventRuleOrdering(): EventRuleOrdering {
		return new EventRuleOrdering();
	}
	eventRuleResults(): EventRuleResults {
		return new EventRuleResults({
			eventDiagnostics: this.eventDiagnostics(),
			eventPatches: this.eventPatches(),
		});
	}
	eventTitleRule(): EventTitleRule {
		return new EventTitleRule({ eventRuleResults: this.eventRuleResults() });
	}
	issueTitleRule(): IssueTitleRule {
		return new IssueTitleRule({
			eventDateValidation: this.eventDateValidation(),
			eventRuleResults: this.eventRuleResults(),
			eventPatches: this.eventPatches(),
		});
	}
	listActiveEvents(...args: ListActiveEventsArguments): ListActiveEvents {
		return new ListActiveEvents(
			{
				eventRuleFactory: this.eventRuleFactory(),
				eventReadinessPolicy: this.eventReadinessPolicy(),
				eventLifecycle: this.eventLifecycle(),
				createEventRuleEngine: (...args) => this.eventRuleEngine(...args),
			},
			...args,
		);
	}
	managedLabelsRule(...args: ManagedLabelsRuleArguments): ManagedLabelsRule {
		return new ManagedLabelsRule(
			{
				eventRuleResults: this.eventRuleResults(),
				eventPatches: this.eventPatches(),
			},
			...args,
		);
	}
	meetupEventOperations(): MeetupEventOperations {
		return new MeetupEventOperations();
	}
	meetupPublicationChecklist(): MeetupPublicationChecklist {
		return new MeetupPublicationChecklist();
	}
	reconcileEvent(...args: ReconcileEventArguments): ReconcileEvent {
		return new ReconcileEvent(
			{
				eventRuleFactory: this.eventRuleFactory(),
				eventDocumentConcurrency: this.eventDocumentConcurrency(),
				eventReadinessPolicy: this.eventReadinessPolicy(),
				eventLifecycle: this.eventLifecycle(),
				eventRepositoryPatches: this.eventRepositoryPatches(),
				createEventRuleEngine: (...args) => this.eventRuleEngine(...args),
			},
			...args,
		);
	}
}

import { EventDomainComposition } from "@meetup-automation/event";
import type { ScheduledEvent } from "@meetup-automation/publication";
import { JourneyPolicyComposition } from "./policy-composition.js";
import { EventPublicationApproval } from "./use-cases/event-publication-approval.js";
import type {
	EventPublicationConfiguration,
	EventPublicationSourceDependencies,
	PublicationDestination,
} from "./use-cases/event-publication-contracts.js";
import { EventPublicationResults } from "./use-cases/event-publication-results.js";
import { EventPublicationSource } from "./use-cases/event-publication-source.js";
import { ReconcileEventPublication } from "./use-cases/reconcile-event-publication.js";
import { ReconcileEventPublications } from "./use-cases/reconcile-event-publications.js";

export class EventPublicationComposition {
	destination<Event extends ScheduledEvent, Settings>(
		configuration: EventPublicationConfiguration<Event, Settings>,
		clock: EventPublicationSourceDependencies["clock"],
	): ReconcileEventPublication<Event, Settings> {
		return new ReconcileEventPublication(
			configuration,
			clock,
			new EventPublicationApproval(
				configuration.revision,
				configuration.approval,
				clock,
				configuration.approvalKind,
				configuration.key.target,
			),
			new EventPublicationResults(configuration.field, configuration.label),
		);
	}
	collection(
		dependencies: EventPublicationSourceDependencies,
		destinations: readonly PublicationDestination[],
	): ReconcileEventPublications {
		return new ReconcileEventPublications(
			dependencies.repository,
			(document) =>
				new EventPublicationSource(
					{
						concurrency:
							new EventDomainComposition().eventDocumentConcurrency(),
						patches: new EventDomainComposition().eventRepositoryPatches(),
						diagnostics: new JourneyPolicyComposition().diagnosticPolicy(),
					},
					dependencies,
					document,
				),
			destinations,
		);
	}
}

import {
	type EventDocumentCodec,
	EventDomainComposition,
	type EventRepository,
} from "@meetup-automation/event";
import { GoogleSheetsRegistrationSourceComposition } from "@meetup-automation/google-sheets-registration-source";
import {
	type AutomationConfig,
	ReconcileMeetupRegistrations,
} from "@meetup-automation/journey";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { EventComposition, SERVICES } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import {
	RegistrationAction,
	type RegistrationCompositionInput,
} from "./registration-action.js";

export class RegistrationActionComposition {
	create(input: RegistrationCompositionInput): ReconcileMeetupRegistrations {
		const container = EventComposition.createDocumentContainer(input);
		return new ReconcileMeetupRegistrations({
			events: container.get<EventRepository>(SERVICES.eventRepository),
			codec: container.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
			eventLabel: container.get<AutomationConfig>(SERVICES.config).event[
				"issue-label"
			],
			concurrency: new EventDomainComposition().eventDocumentConcurrency(),
			responsePolicy:
				new PublicationDomainComposition().registrationResponsePolicy(),
			source: new GoogleSheetsRegistrationSourceComposition(fetch).source({
				url: input.url,
				firstDataRow: input.firstDataRow,
				lastDataRow: input.lastDataRow,
				credentials: input.credentials,
			}),
		});
	}

	action(): RegistrationAction {
		return new RegistrationAction({
			runtime: new GithubActionsComposition().runtimeInput(),
			create: this.create.bind(this),
		});
	}
}

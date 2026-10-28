import { CommunicationDomainComposition } from "@meetup-automation/communication";
import {
	type EventClock,
	type EventDocumentCodec,
	EventDomainComposition,
	type EventRepository,
} from "@meetup-automation/event";
import { GoogleDriveAssetRepositoryComposition } from "@meetup-automation/google-drive-asset-repository";
import { ReconcileMeetupSlidesPdf } from "@meetup-automation/journey";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import {
	EventComposition,
	type EventDocumentCompositionInput,
	SERVICES,
} from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventSnapshotHash } from "./event-snapshot-hash.js";
import { SlidesPdfAction } from "./slides-pdf-action.js";
import { SlidesPdfInput } from "./slides-pdf-input.js";

export class SlidesPdfActionComposition {
	static create(
		input: EventDocumentCompositionInput & {
			credentials: string;
			publicFolderId: string;
		},
	) {
		const container = EventComposition.createDocumentContainer(input);
		const adapter = new GoogleDriveAssetRepositoryComposition().googleDrivePdf(
			input.credentials,
			input.publicFolderId,
		);
		return new ReconcileMeetupSlidesPdf({
			events: container.get<EventRepository>(SERVICES.eventRepository),
			codec: container.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
			clock: container.get<EventClock>(SERVICES.eventClock),
			revision: new EventSnapshotHash(),
			concurrency: new EventDomainComposition().eventDocumentConcurrency(),
			postEvent: new CommunicationDomainComposition().postEventPolicy(),
			pdf: new PublicationDomainComposition().reconcileSlidePdf(
				adapter.source(),
				adapter.repository(),
				adapter.states(),
			),
		});
	}
	action(): SlidesPdfAction {
		return new SlidesPdfAction({
			input: new SlidesPdfInput(),
			runtime: new GithubActionsComposition().runtimeInput(),
			create: SlidesPdfActionComposition.create,
		});
	}
}

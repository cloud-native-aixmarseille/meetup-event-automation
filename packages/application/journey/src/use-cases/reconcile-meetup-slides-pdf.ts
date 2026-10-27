import type { PostEventPolicy } from "@meetup-automation/communication";
import {
	type EventClock,
	EventConcurrentModificationError,
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	type EventIdentity,
	EventNotFoundError,
	type EventRepository,
} from "@meetup-automation/event";
import type {
	AssetContainer,
	AssetFile,
	ReconcileSlidePdf,
} from "@meetup-automation/publication";
import type { EventDocumentRevision } from "../ports/event-document-revision.js";

export interface SlidesPdfSource {
	readonly container?: AssetContainer;
	readonly presentation?: AssetFile;
	readonly revision?: string;
	readonly protectedFolderIds?: readonly string[];
}

export class ReconcileMeetupSlidesPdf {
	constructor(
		private readonly dependencies: {
			events: EventRepository;
			codec: EventDocumentCodec;
			clock: EventClock;
			revision: EventDocumentRevision;
			concurrency: Pick<
				EventDocumentConcurrency,
				"ensureEventDocumentIsCurrent"
			>;
			postEvent: Pick<PostEventPolicy, "isDue">;
			pdf: Pick<ReconcileSlidePdf, "execute">;
		},
	) {}

	async execute(
		identity: EventIdentity,
		source: SlidesPdfSource,
		slidesReady: boolean,
	) {
		if (!source.revision)
			return {
				status: "not-applicable",
				updated: false,
				diagnostics: [],
			} as const;
		const document = await this.dependencies.events.find(identity);
		if (!document) throw new EventNotFoundError(identity);
		if (this.dependencies.revision.of(document) !== source.revision)
			throw new EventConcurrentModificationError(identity);
		if (
			source.container &&
			source.container.eventId !==
				`${identity.repository}#${identity.issueNumber}`
		)
			throw new Error("PDF source belongs to another event");
		const { event } = this.dependencies.codec.decode(document);
		await this.dependencies.concurrency.ensureEventDocumentIsCurrent(
			this.dependencies.events,
			identity,
			document,
		);
		const result = await this.dependencies.pdf.execute({
			eligible: this.dependencies.postEvent.isDue({
				eventDate: event.date,
				timeZone: event.timeZone,
				occurrenceStatus: event.occurrenceStatus ?? "unknown",
				now: new Date(this.dependencies.clock.now()),
			}),
			sourceReady: slidesReady,
			date: event.date,
			container: source.container,
			source: source.presentation,
		});
		const slidesPdfUrl = result.status === "ready" ? result.url : undefined;
		if (event.slidesPdfUrl !== slidesPdfUrl) {
			await this.dependencies.concurrency.ensureEventDocumentIsCurrent(
				this.dependencies.events,
				identity,
				document,
			);
			await this.dependencies.events.applyPatch(
				identity,
				this.dependencies.codec.createPatch(document, {
					...event,
					slidesPdfUrl,
				}),
			);
		}
		return result;
	}
}

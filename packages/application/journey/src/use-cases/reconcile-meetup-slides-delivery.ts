import type {
	DeliveryLedger,
	PostEventPolicy,
} from "@meetup-automation/communication";
import {
	EventConcurrentModificationError,
	type EventClock,
	type EventDocument,
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	type EventIdentity,
	type EventRepository,
	type MeetupEvent,
	POST_EVENT_TASK_NAMES,
} from "@meetup-automation/event";
import type {
	AttendeeSlidesGateway,
	MeetupEventIdentityPolicy,
	PresentationFileUrl,
} from "@meetup-automation/publication";
import type {
	EventPublicationResult,
	PublicationDestinationKey,
} from "./event-publication-contracts.js";
import type { EventPublicationResults } from "./event-publication-results.js";

export interface SlidesDeliveryDependencies {
	readonly repository: EventRepository;
	readonly codec: EventDocumentCodec;
	readonly clock: EventClock;
	readonly concurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
	readonly postEvent: Pick<PostEventPolicy, "isDue">;
	readonly ledger: DeliveryLedger;
	readonly gateway: AttendeeSlidesGateway;
	readonly identity: Pick<MeetupEventIdentityPolicy, "fromUrl">;
	readonly presentationUrl: Pick<PresentationFileUrl, "normalize">;
	readonly results: Pick<EventPublicationResults, "result">;
}

/** Deliver once per Meetup event; recover completion from the durable delivery ledger. */
export class ReconcileMeetupSlidesDelivery {
	constructor(
		private readonly dependencies: SlidesDeliveryDependencies,
		readonly key: PublicationDestinationKey,
	) {}

	async execute(identity: EventIdentity): Promise<EventPublicationResult> {
		const document = await this.dependencies.repository.find(identity);
		if (!document) throw new Error("Event source issue was not found");
		const decoded = this.dependencies.codec.decode(document);
		const event = decoded.event;
		if (
			event.issueState !== "open" ||
			!this.dependencies.postEvent.isDue({
				eventDate: event.date,
				timeZone: event.timeZone,
				occurrenceStatus: event.occurrenceStatus ?? "unknown",
				now: new Date(this.dependencies.clock.now()),
			})
		)
			return { status: "skipped", diagnostics: [] };
		const tasks = event.operationalChecklists.postEvent.filter(
			(item) => item.name === POST_EVENT_TASK_NAMES.shareSlides,
		);
		if (
			tasks.length > 1 ||
			decoded.diagnostics.some(
				(item) =>
					item.severity === "error" ||
					item.code === "event.document.checkbox.invalid",
			)
		)
			return this.blocked("source");
		if (tasks[0]?.completed) return { status: "skipped", diagnostics: [] };
		const publication = this.dependencies.identity.fromUrl(
			event.publicationLinks.meetup,
		);
		if (!publication) return this.blocked("link");
		const eventUrl = publication.reviewUrl;
		const deliveryKey = `${identity.repository}#${identity.issueNumber}:attendee-slides:${eventUrl}`;
		const recorded = await this.dependencies.ledger.find(deliveryKey);
		if (recorded?.status === "accepted") return this.complete(document, event);
		if (recorded) return this.blocked("delivery-recovery");
		const pdfUrl = this.dependencies.presentationUrl.normalize(
			event.slidesPdfUrl,
		);
		if (!pdfUrl?.startsWith("https://drive.google.com/file/d/"))
			return this.blocked("pdf-pending");
		return this.send(document, event, eventUrl, pdfUrl, deliveryKey);
	}

	private async send(
		document: EventDocument,
		event: MeetupEvent,
		eventUrl: string,
		pdfUrl: string,
		deliveryKey: string,
	): Promise<EventPublicationResult> {
		let reserved = false;
		try {
			await this.dependencies.gateway.sendSlides(eventUrl, pdfUrl, async () => {
				await this.ensureCurrent(document);
				const reservation = await this.dependencies.ledger.reservePending({
					idempotencyKey: deliveryKey,
					intentId: deliveryKey,
					repositoryId: document.identity.repository,
					eventId: String(document.identity.issueNumber),
					kind: "attendee-slides",
					recipientId: eventUrl,
					policyVersion: "attendee-slides-v1",
					reservedAt: this.dependencies.clock.now(),
				});
				if (!reservation.reserved) throw new Error("Delivery already reserved");
				reserved = true;
				try {
					await this.ensureCurrent(document);
				} catch (error) {
					await this.dependencies.ledger.releasePending(deliveryKey);
					reserved = false;
					throw error;
				}
			});
		} catch (error) {
			if (reserved)
				await this.dependencies.ledger.markUncertain(
					deliveryKey,
					this.dependencies.clock.now(),
					"meetup-slides-unconfirmed",
				);
			return this.blocked(
				reserved
					? "delivery-recovery"
					: error instanceof EventConcurrentModificationError
						? "source-changed"
						: "form-unavailable",
			);
		}
		if (!reserved) return this.blocked("form-unavailable");
		await this.dependencies.ledger.markAccepted(
			deliveryKey,
			this.dependencies.clock.now(),
		);
		return this.complete(document, event);
	}

	private async complete(
		document: EventDocument,
		event: MeetupEvent,
	): Promise<EventPublicationResult> {
		const items = event.operationalChecklists.postEvent;
		const name = POST_EVENT_TASK_NAMES.shareSlides;
		const postEvent = items.some((item) => item.name === name)
			? items.map((item) =>
					item.name === name ? { ...item, completed: true } : item,
				)
			: [...items, { name, completed: true }];
		await this.ensureCurrent(document);
		const patch = this.dependencies.codec.createPatch(document, {
			...event,
			operationalChecklists: { ...event.operationalChecklists, postEvent },
		});
		if (
			patch.body !== undefined ||
			patch.labels !== undefined ||
			patch.issueTitle !== undefined
		)
			await this.dependencies.repository.applyPatch(document.identity, patch);
		return { status: "updated", diagnostics: [] };
	}

	private ensureCurrent(document: EventDocument): Promise<void> {
		return this.dependencies.concurrency.ensureEventDocumentIsCurrent(
			this.dependencies.repository,
			document.identity,
			document,
		);
	}
	private blocked(reason: string): EventPublicationResult {
		return this.dependencies.results.result("blocked", `slides-${reason}`);
	}
}

import type { SocialDestination } from "@meetup-automation/communication";
import type {
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import type { SocialPublicationResult } from "./social-publication-contracts.js";

export class SocialPublicationCompletion {
	constructor(
		private readonly repository: EventRepository,
		private readonly codec: EventDocumentCodec,
		private readonly concurrency: Pick<
			EventDocumentConcurrency,
			"ensureEventDocumentIsCurrent"
		>,
		private readonly configuration: () => Promise<readonly SocialDestination[]>,
	) {}
	async record(
		identity: EventIdentity,
		results: readonly SocialPublicationResult[],
	): Promise<void> {
		const document = await this.repository.find(identity);
		if (!document) throw new Error("Social completion issue is unavailable");
		const event = this.codec.decode(document).event;
		const destinations = await this.configuration();
		const complete = new Set(
			destinations
				.filter((destination) =>
					destinations
						.filter((item) => item.label === destination.label)
						.every((item) =>
							results.some(
								(result) =>
									result.target === `${item.key}:announcement` &&
									result.occurrence === event.date &&
									["complete", "published", "manual"].includes(result.status),
							),
						),
				)
				.map((item) => item.label),
		);
		const communication = event.operationalChecklists.communication.map(
			(item) => (complete.has(item.name) ? { ...item, completed: true } : item),
		);
		if (
			communication.every(
				(item, index) =>
					item.completed ===
					event.operationalChecklists.communication[index]?.completed,
			)
		)
			return;
		const patch = this.codec.createPatch(document, {
			...event,
			operationalChecklists: { ...event.operationalChecklists, communication },
		});
		await this.concurrency.ensureEventDocumentIsCurrent(
			this.repository,
			identity,
			document,
		);
		await this.repository.applyPatch(identity, patch);
	}
}

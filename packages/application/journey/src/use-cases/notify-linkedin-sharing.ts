import type {
	ReconcileLinkedInSharing,
	SocialDeliveryRecord,
} from "@meetup-automation/communication";
import type {
	EventDocument,
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventRepository,
} from "@meetup-automation/event";

export class NotifyLinkedInSharing {
	constructor(
		private readonly repository: EventRepository,
		private readonly codec: Pick<EventDocumentCodec, "decode">,
		private readonly concurrency: Pick<
			EventDocumentConcurrency,
			"ensureEventDocumentIsCurrent"
		>,
		private readonly publications: {
			list(): Promise<readonly SocialDeliveryRecord[]>;
		},
		private readonly sharing: Pick<ReconcileLinkedInSharing, "execute">,
	) {}
	async execute(source: EventDocument) {
		const event = this.codec.decode(source).event;
		const records = await this.publications.list();
		const urls = records
			.filter(
				(record) =>
					record.occurrence === event.date &&
					record.destination.provider === "linkedin",
			)
			.flatMap((record) => {
				if (record.manual) return [record.manual.reference];
				const receipt = record.attempts.find(
					(attempt) => attempt.status === "accepted",
				)?.receipt;
				return receipt?.provider === "linkedin"
					? [
							receipt.url ??
								`https://www.linkedin.com/feed/update/${receipt.postUrn}/`,
						]
					: [];
			});
		return this.sharing.execute([...(event.linkedInPosts ?? []), ...urls], () =>
			this.concurrency.ensureEventDocumentIsCurrent(
				this.repository,
				event.identity,
				source,
			),
		);
	}
}

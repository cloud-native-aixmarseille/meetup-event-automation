import type {
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventRepository,
} from "@meetup-automation/event";
import type { ContentContext } from "../review/content-workspace.js";

/** Writes only reviewed event copy through the event codec and optimistic concurrency guard. */
export class ApplyEventCopy {
	constructor(
		private readonly repository: EventRepository,
		private readonly codec: Pick<EventDocumentCodec, "createPatch">,
		private readonly concurrency: Pick<
			EventDocumentConcurrency,
			"ensureEventDocumentIsCurrent"
		>,
	) {}
	async apply(context: ContentContext, text: string): Promise<void> {
		const target = context.plan.target;
		if (target !== "title" && target !== "description") return;
		await this.concurrency.ensureEventDocumentIsCurrent(
			this.repository,
			context.document.identity,
			context.document,
		);
		const event = {
			...context.event,
			...(target === "title"
				? {
						eventTitle: text,
						issueTitle: `[Meetup] - ${context.event.date} - ${text}`,
					}
				: { description: text }),
		};
		const patch = this.codec.createPatch(context.document, event);
		await this.repository.applyPatch(context.document.identity, patch);
	}
}

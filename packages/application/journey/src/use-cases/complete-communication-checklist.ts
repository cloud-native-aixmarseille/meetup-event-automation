import type { MailCommunicationKind } from "@meetup-automation/communication";
import {
	type EventChecklists,
	EventConcurrentModificationError,
	type EventDocument,
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	type EventRepository,
} from "@meetup-automation/event";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import type { CommunicationChecklist } from "./communication-checklist.js";

/** Persist accepted deliveries without overwriting an organizer's concurrent edit. */
export interface CompleteCommunicationChecklistCollaborators {
	readonly communicationChecklist: Pick<CommunicationChecklist, "complete">;
	readonly eventChecklists: Pick<EventChecklists, "equal">;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"eventDocumentsEqual"
	>;
}

export class CompleteCommunicationChecklist {
	constructor(
		private readonly collaborators: CompleteCommunicationChecklistCollaborators,
		private readonly repository: EventRepository,
		private readonly codec: EventDocumentCodec,
	) {}

	async execute(
		source: EventDocument,
		accepted: readonly MailCommunicationKind[],
		diagnostics: CommunicationJourneyDiagnostic[],
	): Promise<void> {
		if (accepted.length === 0) return;
		try {
			const { event } = this.codec.decode(source);
			const operationalChecklists =
				this.collaborators.communicationChecklist.complete(event, accepted);
			if (
				this.collaborators.eventChecklists.equal(
					operationalChecklists,
					event.operationalChecklists,
				)
			)
				return;
			const patch = this.codec.createPatch(source, {
				...event,
				operationalChecklists,
			});
			if (!patch.body)
				throw new Error("Checklist completion could not be rendered");
			const rendered = this.codec.decode({ ...source, body: patch.body }).event
				.operationalChecklists;
			if (
				!this.collaborators.eventChecklists.equal(
					rendered,
					operationalChecklists,
				)
			)
				throw new Error(
					"Checklist completion was not preserved by the document codec",
				);
			const current = await this.repository.find(source.identity);
			if (
				!current ||
				!this.collaborators.eventDocumentConcurrency.eventDocumentsEqual(
					current,
					source,
				)
			)
				throw new EventConcurrentModificationError(source.identity);
			await this.repository.applyPatch(source.identity, { body: patch.body });
		} catch (error) {
			const concurrent = error instanceof EventConcurrentModificationError;
			diagnostics.push({
				code: concurrent
					? "communication.checklist-concurrently-modified"
					: "communication.checklist-update-failed",
				severity: concurrent ? "warning" : "error",
			});
		}
	}
}
export type CompleteCommunicationChecklistArguments =
	ConstructorParameters<typeof CompleteCommunicationChecklist> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;

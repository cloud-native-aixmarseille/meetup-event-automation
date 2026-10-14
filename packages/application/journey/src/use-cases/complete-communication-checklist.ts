import type { MailCommunicationKind } from "@meetup-automation/communication";
import {
	type EventDocument,
	type EventDocumentCodec,
	type EventRepository,
	ReconcileEvent,
} from "@meetup-automation/event";
import type { CommunicationJourneyDiagnostic } from "../communication/contracts.js";
import { CommunicationChecklist } from "./communication-checklist.js";

/** Persist accepted deliveries without overwriting an organizer's concurrent edit. */
export class CompleteCommunicationChecklist {
	constructor(
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
			const operationalChecklists = CommunicationChecklist.complete(
				event,
				accepted,
			);
			if (
				JSON.stringify(operationalChecklists) ===
				JSON.stringify(event.operationalChecklists)
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
			if (JSON.stringify(rendered) !== JSON.stringify(operationalChecklists))
				throw new Error(
					"Checklist completion was not preserved by the document codec",
				);
			const current = await this.repository.find(source.identity);
			if (!current || !ReconcileEvent.eventDocumentsEqual(current, source))
				throw new Error("Checklist source changed");
			await this.repository.applyPatch(source.identity, { body: patch.body });
		} catch {
			diagnostics.push({
				code: "communication.checklist-update-failed",
				severity: "error",
			});
		}
	}
}

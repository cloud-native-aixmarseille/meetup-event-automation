import type {
	EventDocument,
	EventIdentity,
	EventRepository,
} from "@meetup-automation/event";
import type {
	EventPublicationsResult,
	PublicationDestination,
	PublicationFollowUp,
} from "./event-publication-contracts.js";
import type { EventPublicationSource } from "./event-publication-source.js";

export class ReconcileEventPublications {
	constructor(
		private readonly repository: Pick<EventRepository, "find">,
		private readonly createSource: (
			document: EventDocument,
		) => EventPublicationSource,
		private readonly destinations: readonly PublicationDestination[],
		private readonly followUps: readonly PublicationFollowUp[],
	) {
		const keys = destinations.map(({ key }) =>
			JSON.stringify([key.provider, key.target]),
		);
		if (new Set(keys).size !== keys.length)
			throw new Error("Duplicate publication destination");
		if (
			new Set(destinations.map((destination) => destination.field)).size !==
			destinations.length
		)
			throw new Error(
				"Publication destinations must use distinct issue fields",
			);
	}
	async execute(identity: EventIdentity): Promise<EventPublicationsResult> {
		const document = await this.repository.find(identity);
		if (!document) throw new Error("Event source issue was not found");
		const source = this.createSource(document);
		const reason = await source.readiness();
		const publications: EventPublicationsResult["publications"][number][] = [];
		for (const destination of this.destinations) {
			if (!reason) await source.ensureCurrent();
			const result = reason
				? destination.blocked(reason)
				: await destination.reconcile(source);
			publications.push({ ...result, destination: destination.key });
			if (!reason) await source.ensureCurrent();
		}
		for (const followUp of this.followUps) {
			const result = await followUp.execute(identity);
			publications.push({ ...result, destination: followUp.key });
		}
		return {
			publications,
			diagnostics: publications.flatMap((result) => result.diagnostics),
		};
	}
}

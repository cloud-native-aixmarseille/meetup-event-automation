import type {
	EventDocument,
	EventDocumentConcurrency,
	EventRepositoryPatches,
	MeetupEvent,
} from "@meetup-automation/event";
import {
	type SavedEventPublication,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { DiagnosticPolicy } from "../result/diagnostic-policy.js";
import type { EventPublicationSourceDependencies } from "./event-publication-contracts.js";

/** Invocation-scoped source snapshot, advanced only by our guarded issue patches. */
export class EventPublicationSource {
	private evaluated: MeetupEvent | undefined;
	constructor(
		private readonly collaborators: {
			concurrency: Pick<
				EventDocumentConcurrency,
				"ensureEventDocumentIsCurrent"
			>;
			patches: Pick<EventRepositoryPatches, "eventRepositoryPatchIsEmpty">;
			diagnostics: Pick<DiagnosticPolicy, "isTechnicalFailure">;
		},
		private readonly dependencies: EventPublicationSourceDependencies,
		private document: EventDocument,
	) {}

	get event(): MeetupEvent {
		if (!this.evaluated)
			throw new Error("Publication source has not been evaluated");
		return this.evaluated;
	}

	async readiness(): Promise<string | undefined> {
		const result = await this.dependencies.manageEvent.execute({
			identity: this.document.identity,
			mode: "check",
			sourceDocument: this.document,
		});
		if (result.skipped) return "inactive";
		this.evaluated = result.event;
		if (this.inactive(result.event)) return "inactive";
		if (
			result.diagnostics.some(
				this.collaborators.diagnostics.isTechnicalFailure.bind(
					this.collaborators.diagnostics,
				),
			)
		)
			return "source";
		if ((await this.dependencies.contentGate.blocked(result.event)).length)
			return "content-review";
		if (
			result.diagnostics.some(
				(item) =>
					(item.code === "event.document.checkbox.invalid" &&
						item.field === "Communication") ||
					(item.severity === "error" &&
						![
							"publicationLinks.meetup",
							"publicationLinks.community",
							"publicationLinks.assets",
							"publicationLinks.feedback",
						].includes(item.field ?? "")),
			)
		)
			return "prerequisites";
		return undefined;
	}

	async ensureCurrent(): Promise<void> {
		await this.collaborators.concurrency.ensureEventDocumentIsCurrent(
			this.dependencies.repository,
			this.document.identity,
			this.document,
		);
		const result = await this.dependencies.manageEvent.execute({
			identity: this.document.identity,
			mode: "check",
			sourceDocument: this.document,
		});
		if (
			result.skipped ||
			this.inactive(result.event) ||
			(await this.dependencies.contentGate.blocked(result.event)).length
		)
			throw new ScheduledEventError("content-review");
	}

	async persist(
		projection: {
			apply(event: MeetupEvent, saved: SavedEventPublication): MeetupEvent;
		},
		saved: SavedEventPublication,
	): Promise<void> {
		await this.ensureCurrent();
		const event = projection.apply(
			this.dependencies.codec.decode(this.document).event,
			saved,
		);
		const patch = this.dependencies.codec.createPatch(this.document, event);
		if (!this.collaborators.patches.eventRepositoryPatchIsEmpty(patch)) {
			await this.ensureCurrent();
			await this.dependencies.repository.applyPatch(
				this.document.identity,
				patch,
			);
			this.document = { ...this.document, ...patch };
		}
		this.evaluated = projection.apply(this.event, saved);
	}

	private inactive(event: MeetupEvent): boolean {
		return (
			event.issueState !== "open" ||
			["cancelled", "postponed", "held"].includes(event.occurrenceStatus ?? "")
		);
	}
}

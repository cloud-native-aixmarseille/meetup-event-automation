import {
	type EventDocumentCodec,
	type EventDocumentConcurrency,
	type EventIdentity,
	EventNotFoundError,
	type EventRepository,
} from "@meetup-automation/event";
import type {
	RegistrationResponseMapping,
	RegistrationResponsePolicy,
	RegistrationResponseSource,
} from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export type ReconcileMeetupRegistrationsResult = Readonly<{
	status: "skipped" | "invalid" | "blocked";
	responseCount: number;
	participantCount: number;
	duplicateCount: number;
	invalidCount: number;
	diagnostics: readonly PublicDiagnostic[];
}>;

/** Reports reconciliation blockers without exposing identities or claiming completion. */
export class ReconcileMeetupRegistrations {
	constructor(
		private readonly dependencies: {
			events: EventRepository;
			codec: EventDocumentCodec;
			concurrency: Pick<
				EventDocumentConcurrency,
				"ensureEventDocumentIsCurrent"
			>;
			responsePolicy: Pick<RegistrationResponsePolicy, "evaluate">;
			source: RegistrationResponseSource;
			eventLabel: string;
		},
	) {}

	async execute(
		identity: EventIdentity,
		mapping: RegistrationResponseMapping,
	): Promise<ReconcileMeetupRegistrationsResult> {
		const document = await this.dependencies.events.find(identity);
		if (!document) throw new EventNotFoundError(identity);
		if (!document.labels.includes(this.dependencies.eventLabel))
			return this.blocked("skipped", "unrelated", "This issue is not a meetup");
		const { event, diagnostics } = this.dependencies.codec.decode(document);
		if (diagnostics.some((item) => item.severity === "error"))
			return this.blocked(
				"invalid",
				"event",
				"Resolve invalid event fields before reconciling registrations",
			);
		if (event.issueState !== "open" || event.occurrenceStatus !== "held")
			return this.blocked(
				"skipped",
				"inactive",
				"Registration reconciliation requires an open event confirmed as held",
			);
		if (!event.publicationLinks.community?.trim())
			return this.blocked(
				"invalid",
				"destination",
				"Set the event's OCGroups link before reconciling registrations",
			);
		const table = await this.dependencies.source.read();
		const evaluation = this.dependencies.responsePolicy.evaluate(
			table,
			mapping,
		);
		await this.dependencies.concurrency.ensureEventDocumentIsCurrent(
			this.dependencies.events,
			identity,
			document,
		);
		return {
			status: evaluation.diagnostics.length ? "invalid" : "blocked",
			responseCount: evaluation.responseCount,
			participantCount: evaluation.participants.length,
			duplicateCount: evaluation.duplicateCount,
			invalidCount: evaluation.invalidCount,
			diagnostics: evaluation.diagnostics.length
				? evaluation.diagnostics
				: [
						this.diagnostic(
							"provider-unavailable",
							"OCGroups membership and event registration cannot be reconciled until a supported provider capability is available",
						),
					],
		};
	}

	private blocked(
		status: "skipped" | "invalid",
		code: string,
		message: string,
	): ReconcileMeetupRegistrationsResult {
		return {
			status,
			responseCount: 0,
			participantCount: 0,
			duplicateCount: 0,
			invalidCount: 0,
			diagnostics: [this.diagnostic(code, message)],
		};
	}

	private diagnostic(code: string, message: string): PublicDiagnostic {
		return {
			code: `publication.registration.${code}`,
			severity: code === "unrelated" ? "info" : "warning",
			field: "community",
			message,
		};
	}
}

import type {
	EventClock,
	EventDocument,
	EventDocumentCodec,
	EventDocumentConcurrency,
	EventIdentity,
	EventPublicationLinks,
	EventRepository,
	EventRepositoryPatches,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import {
	MeetupEventUrl,
	MeetupGroupUrl,
	type PublicationJournal,
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
	type ScheduledEventGateway,
	type ScheduledEventPolicy,
} from "@meetup-automation/publication";
import type { OrganizerApproval } from "../ports/organizer-approval.js";
import type { DiagnosticPolicy } from "../result/diagnostic-policy.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";
import type {
	MeetupPublicationApproval,
	MeetupPublicationApprovalArguments,
} from "./meetup-publication-approval.js";
import type {
	MeetupPublicationProjection,
	MeetupPublicationSettings,
} from "./meetup-publication-projection.js";

export type MeetupPublicationResult = Readonly<{
	status: "draft" | "updated" | "skipped" | "blocked";
	reviewUrl?: string;
	diagnostics: readonly PublicDiagnostic[];
}>;

// Errors on the event's own publication-link fields never block drafting: the
// Meetup link is managed here and the others target unrelated channels. Typed
// against EventPublicationLinks so a renamed link field fails to compile.
const PUBLICATION_LINK_FIELDS: readonly string[] = [
	"publicationLinks.meetup",
	"publicationLinks.community",
	"publicationLinks.assets",
	"publicationLinks.feedback",
] satisfies `publicationLinks.${keyof EventPublicationLinks}`[];

export interface ManageMeetupPublicationCollaborators {
	readonly diagnosticPolicy: Pick<DiagnosticPolicy, "isTechnicalFailure">;
	readonly meetupPublicationProjection: Pick<
		MeetupPublicationProjection,
		"create"
	>;
	readonly scheduledEventPolicy: Pick<ScheduledEventPolicy, "valid">;
	readonly meetupPublicationChecklist: Pick<
		MeetupPublicationChecklist,
		"withStatus"
	>;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"ensureEventDocumentIsCurrent"
	>;
	readonly createMeetupPublicationApproval: (
		...args: MeetupPublicationApprovalArguments
	) => MeetupPublicationApproval;
}

export class ManageMeetupPublication {
	constructor(
		private readonly collaborators: ManageMeetupPublicationCollaborators,
		private readonly dependencies: {
			repository: EventRepository;
			codec: EventDocumentCodec;
			clock: EventClock;
			manageEvent: Pick<ManageMeetupEvent, "execute">;
			gateway: ScheduledEventGateway;
			journal: PublicationJournal;
			approval: OrganizerApproval;
			settings: MeetupPublicationSettings;
			meetupUrlPrefix: string;
		},
	) {}

	async execute(identity: EventIdentity): Promise<MeetupPublicationResult> {
		const source = await this.dependencies.repository.find(identity);
		if (!source) throw new Error("Meetup source issue was not found");
		const evaluation = await this.dependencies.manageEvent.execute({
			identity,
			mode: "check",
			sourceDocument: source,
		});
		if (evaluation.skipped) return this.result("skipped", "inactive");
		if (
			evaluation.diagnostics.some(
				this.collaborators.diagnosticPolicy.isTechnicalFailure.bind(
					this.collaborators.diagnosticPolicy,
				),
			)
		)
			return this.result("blocked", "source");
		const event = evaluation.event;
		if (
			event.issueState !== "open" ||
			["cancelled", "postponed", "held"].includes(event.occurrenceStatus ?? "")
		)
			return this.result("skipped", "inactive");
		const draft = this.collaborators.meetupPublicationProjection.create(
			event,
			this.dependencies.settings,
		);
		if (
			evaluation.diagnostics.some(
				(item) =>
					item.code === "event.document.checkbox.invalid" &&
					item.field === "Communication",
			) ||
			!draft ||
			!this.collaborators.scheduledEventPolicy.valid(
				draft,
				this.dependencies.clock.now(),
			) ||
			evaluation.diagnostics.some(
				(item) =>
					item.severity === "error" &&
					!PUBLICATION_LINK_FIELDS.includes(item.field ?? ""),
			)
		)
			return this.result("blocked", "prerequisites");
		return this.synchronize(source, draft, event.publicationLinks.meetup);
	}

	private async synchronize(
		source: EventDocument,
		draft: ScheduledEvent,
		supplied: string | undefined,
	): Promise<MeetupPublicationResult> {
		const record = await this.dependencies.journal.load();
		const suppliedUrl = this.eventUrl(supplied);
		const recordedUrl = this.eventUrl(record?.url);
		if ((supplied && !suppliedUrl) || (record?.url && !recordedUrl))
			return this.result("blocked", "link");
		if (suppliedUrl && recordedUrl && suppliedUrl.value !== recordedUrl.value)
			return this.result("blocked", "conflict");
		const url = (suppliedUrl ?? recordedUrl)?.value;
		if (!url && record) return this.result("blocked", "uncertain");
		try {
			const saved = await this.dependencies.gateway.save(
				draft,
				url,
				async () => {
					await this.ensureCurrent(source);
					if (!url) await this.dependencies.journal.reserve();
					await this.ensureCurrent(source);
				},
				async (savedUrl) => {
					if (!this.eventUrl(savedUrl))
						throw new ScheduledEventError("verification");
					await this.dependencies.journal.record(savedUrl);
				},
			);
			if (!this.eventUrl(saved.url) || (!url && saved.status !== "draft"))
				throw new ScheduledEventError("verification");
			return await this.complete(source, draft, saved);
		} catch (error) {
			if (!(error instanceof ScheduledEventError)) throw error;
			return this.result("blocked", error.kind);
		}
	}

	private eventUrl(value: unknown): MeetupEventUrl | undefined {
		const group = MeetupGroupUrl.fromEventUrlPrefix(
			this.dependencies.meetupUrlPrefix,
		);
		return group ? MeetupEventUrl.parse(value, group) : undefined;
	}

	private async persist(
		source: EventDocument,
		saved: SavedScheduledEvent,
	): Promise<EventDocument> {
		await this.ensureCurrent(source);
		const event = this.dependencies.codec.decode(source).event;
		const updated = this.collaborators.meetupPublicationChecklist.withStatus(
			event,
			saved.status === "published",
		);
		const patch = this.dependencies.codec.createPatch(source, {
			...updated,
			publicationLinks: { ...event.publicationLinks, meetup: saved.url },
		});
		if (
			!this.collaborators.eventRepositoryPatches.eventRepositoryPatchIsEmpty(
				patch,
			)
		) {
			await this.ensureCurrent(source);
			await this.dependencies.repository.applyPatch(source.identity, patch);
		}
		return { ...source, ...patch };
	}

	private async complete(
		source: EventDocument,
		event: ScheduledEvent,
		saved: SavedScheduledEvent,
	): Promise<MeetupPublicationResult> {
		const current = await this.persist(source, saved);
		if (saved.status === "published")
			return { status: "updated", diagnostics: [] };
		await this.ensureCurrent(current);
		const approval = this.collaborators.createMeetupPublicationApproval(
			this.dependencies.approval,
			this.dependencies.clock,
		);
		const decision = await approval.request(event, saved.url);
		const diagnostics = decision.notificationFailed
			? this.result("blocked", "approval-notification-failed").diagnostics
			: [];
		if (decision.status !== "approved")
			return {
				status: "draft",
				reviewUrl: saved.url,
				diagnostics: [
					...diagnostics,
					...this.result("blocked", `approval-${decision.status}`).diagnostics,
				],
			};
		const published = await this.dependencies.gateway.publish(
			event,
			saved.url,
			async () => {
				await this.ensureCurrent(current);
				if (
					!this.collaborators.scheduledEventPolicy.valid(
						event,
						this.dependencies.clock.now(),
					)
				)
					throw new ScheduledEventError("verification");
				await approval.requireApproved(event, saved.url);
				await this.ensureCurrent(current);
			},
		);
		if (published.status !== "published" || published.url !== saved.url)
			throw new ScheduledEventError("verification");
		await this.persist(current, published);
		return { status: "updated", diagnostics };
	}

	private ensureCurrent(source: EventDocument): Promise<void> {
		return this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
			this.dependencies.repository,
			source.identity,
			source,
		);
	}

	private result(
		status: "skipped" | "blocked",
		code: string,
	): MeetupPublicationResult {
		return {
			status,
			diagnostics: [
				{
					code: `publication.meetup.${code}`,
					severity: [
						"editor",
						"verification",
						"source",
						"unavailable",
						"approval-unavailable",
						"approval-notification-failed",
					].includes(code)
						? "error"
						: status === "blocked"
							? "warning"
							: "info",
					field: "publicationLinks.meetup",
					message: `Meetup publication: ${code}`,
				},
			],
		};
	}
}
export type ManageMeetupPublicationArguments =
	ConstructorParameters<typeof ManageMeetupPublication> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;

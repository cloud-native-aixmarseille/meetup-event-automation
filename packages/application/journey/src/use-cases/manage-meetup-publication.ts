import {
	type EventClock,
	type EventDocument,
	type EventDocumentCodec,
	type EventIdentity,
	type EventRepository,
	EventRepositoryPatches,
	MeetupPublicationChecklist,
	ReconcileEvent,
} from "@meetup-automation/event";
import {
	type PublicationJournal,
	type SavedScheduledEvent,
	type ScheduledEvent,
	ScheduledEventError,
	type ScheduledEventGateway,
	ScheduledEventPolicy,
} from "@meetup-automation/publication";
import type { OrganizerApproval } from "../ports/organizer-approval.js";
import { MeetupPublicationApproval } from "./meetup-publication-approval.js";
import { DiagnosticPolicy } from "../result/diagnostic-policy.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { ManageMeetupEvent } from "./manage-meetup-event.js";
import {
	MeetupPublicationProjection,
	type MeetupPublicationSettings,
} from "./meetup-publication-projection.js";

export type MeetupPublicationResult = Readonly<{
	status: "draft" | "updated" | "skipped" | "blocked";
	reviewUrl?: string;
	diagnostics: readonly PublicDiagnostic[];
}>;

export class ManageMeetupPublication {
	constructor(
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
		if (evaluation.diagnostics.some(DiagnosticPolicy.isTechnicalFailure))
			return this.result("blocked", "source");
		const event = evaluation.event;
		if (
			event.issueState !== "open" ||
			["cancelled", "postponed", "held"].includes(event.occurrenceStatus ?? "")
		)
			return this.result("skipped", "inactive");
		const draft = MeetupPublicationProjection.create(
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
			!ScheduledEventPolicy.valid(draft, this.dependencies.clock.now()) ||
			evaluation.diagnostics.some(
				(item) =>
					item.severity === "error" &&
					![
						"publicationLinks.community",
						"publicationLinks.assets",
						"publicationLinks.feedback",
						"publicationLinks.meetup",
					].includes(item.field ?? ""),
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
		if (
			supplied &&
			record?.url &&
			supplied.replace(/\/$/, "") !== record.url.replace(/\/$/, "")
		)
			return this.result("blocked", "conflict");
		const candidate = supplied ?? record?.url;
		if (candidate && !this.validUrl(candidate))
			return this.result("blocked", "link");
		const url = candidate ? `${candidate.replace(/\/$/, "")}/` : undefined;
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
					if (!this.validUrl(savedUrl))
						throw new ScheduledEventError("verification");
					await this.dependencies.journal.record(savedUrl);
				},
			);
			if (!this.validUrl(saved.url) || (!url && saved.status !== "draft"))
				throw new ScheduledEventError("verification");
			return await this.complete(source, draft, saved);
		} catch (error) {
			if (!(error instanceof ScheduledEventError)) throw error;
			return this.result("blocked", error.kind);
		}
	}

	private validUrl(value: string): boolean {
		const prefix = this.dependencies.meetupUrlPrefix;
		return (
			value.startsWith(prefix) &&
			/^[1-9]\d*\/?$/.test(value.slice(prefix.length))
		);
	}

	private async persist(
		source: EventDocument,
		saved: SavedScheduledEvent,
	): Promise<EventDocument> {
		await this.ensureCurrent(source);
		const event = this.dependencies.codec.decode(source).event;
		const updated = MeetupPublicationChecklist.withStatus(
			event,
			saved.status === "published",
		);
		const patch = this.dependencies.codec.createPatch(source, {
			...updated,
			publicationLinks: { ...event.publicationLinks, meetup: saved.url },
		});
		if (!EventRepositoryPatches.eventRepositoryPatchIsEmpty(patch)) {
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
		const approval = new MeetupPublicationApproval(
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
				if (!ScheduledEventPolicy.valid(event, this.dependencies.clock.now()))
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
		return ReconcileEvent.ensureEventDocumentIsCurrent(
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

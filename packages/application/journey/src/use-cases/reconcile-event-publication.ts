import {
	type EventClock,
	EventConcurrentModificationError,
	EventNotFoundError,
} from "@meetup-automation/event";
import {
	type EventPublicationIdentity,
	type PublicationRecord,
	type SavedEventPublication,
	type ScheduledEvent,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { EventPublicationApproval } from "./event-publication-approval.js";
import type {
	EventPublicationConfiguration,
	EventPublicationResult,
	PublicationDestination,
} from "./event-publication-contracts.js";
import type { EventPublicationResults } from "./event-publication-results.js";
import type { EventPublicationSource } from "./event-publication-source.js";

export class ReconcileEventPublication<Event extends ScheduledEvent, Settings>
	implements PublicationDestination
{
	constructor(
		private readonly configuration: EventPublicationConfiguration<
			Event,
			Settings
		>,
		private readonly clock: EventClock,
		private readonly approval: Pick<
			EventPublicationApproval<Event>,
			"request" | "requireApproved"
		>,
		private readonly results: Pick<EventPublicationResults, "result">,
	) {}
	get key() {
		return this.configuration.key;
	}
	get field() {
		return this.configuration.field;
	}
	blocked(reason: string): EventPublicationResult {
		return this.results.result(
			reason === "inactive" ? "skipped" : "blocked",
			reason,
		);
	}

	async reconcile(
		source: EventPublicationSource,
	): Promise<EventPublicationResult> {
		try {
			const event = await this.configuration.projection.create(
				source.event,
				this.configuration.settings,
			);
			if (!event || !this.configuration.policy.valid(event, this.clock.now()))
				return this.blocked("prerequisites");
			const remote = await this.resolveIdentity(source);
			let creationReserved = false;
			const saved = await this.configuration.gateway.save(
				event,
				remote,
				async (effect) => {
					await this.ensureCurrent(source, event);
					if (effect === "event" && !remote && !creationReserved) {
						await this.configuration.journal.reserve();
						creationReserved = true;
					}
					await this.ensureCurrent(source, event);
				},
				async (identity) => {
					this.verifyIdentity(identity, remote);
					await this.configuration.journal.record(identity);
				},
			);
			this.verifyIdentity(saved.identity, remote);
			if (!remote && saved.status !== "draft")
				throw new ScheduledEventError("verification");
			await this.configuration.journal.record(saved.identity);
			return await this.complete(source, event, saved);
		} catch (error) {
			if (
				error instanceof EventConcurrentModificationError ||
				error instanceof EventNotFoundError
			)
				throw error;
			return this.blocked(
				error instanceof ScheduledEventError ? error.kind : "unavailable",
			);
		}
	}

	private async ensureCurrent(
		source: EventPublicationSource,
		expected: Event,
	): Promise<void> {
		await source.ensureCurrent();
		const current = await this.configuration.projection.create(
			source.event,
			this.configuration.settings,
		);
		if (
			!current ||
			this.configuration.revision.content(current) !==
				this.configuration.revision.content(expected)
		)
			throw new ScheduledEventError("content-review");
	}

	private async resolveIdentity(
		source: EventPublicationSource,
	): Promise<EventPublicationIdentity | undefined> {
		const supplied = source.event.publicationLinks[this.configuration.field];
		const record = await this.configuration.journal.load();
		this.validateRecovery(record, supplied);
		const reference =
			record?.identity && supplied === record.identity.publicUrl
				? record.identity.reviewUrl
				: supplied;
		if (!supplied) return record?.identity;
		const existing = await this.configuration.gateway.inspect(
			reference ?? supplied,
		);
		if (!this.configuration.identityPolicy.valid(existing.identity))
			throw new ScheduledEventError("verification");
		if (record?.identity && existing.identity.id !== record.identity.id)
			throw new ScheduledEventError("conflict");
		await this.configuration.journal.record(existing.identity);
		await this.persist(source, existing);
		return existing.identity;
	}

	private validateRecovery(
		record: PublicationRecord | undefined,
		supplied: string | undefined,
	): void {
		if (
			record &&
			!record.identity &&
			(!supplied || this.configuration.pendingRecovery === "journal-identity")
		)
			throw new ScheduledEventError("uncertain");
		if (
			record?.identity &&
			!this.configuration.identityPolicy.valid(record.identity)
		)
			throw new ScheduledEventError("link");
		if (supplied && !this.configuration.identityPolicy.publicUrl(supplied))
			throw new ScheduledEventError("link");
	}

	private verifyIdentity(
		identity: EventPublicationIdentity,
		expected: EventPublicationIdentity | undefined,
	): void {
		if (
			!this.configuration.identityPolicy.valid(identity) ||
			(expected &&
				(identity.id !== expected.id ||
					identity.reviewUrl !== expected.reviewUrl))
		)
			throw new ScheduledEventError("verification");
	}

	private async persist(
		source: EventPublicationSource,
		saved: SavedEventPublication,
	): Promise<void> {
		if (
			saved.status === "published" &&
			!this.configuration.identityPolicy.publicUrl(saved.identity.publicUrl)
		)
			throw new ScheduledEventError("verification");
		await source.persist(this.configuration.issueProjection, saved);
	}

	private async complete(
		source: EventPublicationSource,
		event: Event,
		saved: SavedEventPublication,
	): Promise<EventPublicationResult> {
		await this.persist(source, saved);
		if (saved.status === "published")
			return { status: "updated", diagnostics: [] };
		await this.ensureCurrent(source, event);
		const decision = await this.approval.request(event, saved.identity);
		const diagnostics = decision.notificationFailed
			? this.blocked("approval-notification-failed").diagnostics
			: [];
		if (decision.status !== "approved")
			return {
				status: "draft",
				reviewUrl: saved.identity.reviewUrl,
				diagnostics: [
					...diagnostics,
					...this.blocked(`approval-${decision.status}`).diagnostics,
				],
			};
		const published = await this.configuration.gateway.publish(
			event,
			saved.identity,
			async () => {
				await this.ensureCurrent(source, event);
				if (!this.configuration.policy.valid(event, this.clock.now()))
					throw new ScheduledEventError("verification");
				await this.approval.requireApproved(event, saved.identity);
				await this.ensureCurrent(source, event);
			},
		);
		this.verifyIdentity(published.identity, saved.identity);
		if (published.status !== "published")
			throw new ScheduledEventError("verification");
		await this.configuration.journal.record(published.identity);
		await this.persist(source, published);
		return { status: "updated", diagnostics };
	}
}

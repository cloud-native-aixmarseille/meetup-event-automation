import type {
	AttentionRecoveryItem,
	AttentionRecoverySource,
	DeliveryLedger,
	DeliveryLedgerEntry,
	DeliveryReservation,
	DeliveryReservationResult,
} from "@meetup-automation/communication";
import type { GithubLedgerCommentClient } from "./comment-client.js";
import {
	DELIVERY_LEDGER_MARKER,
	type GithubDeliveryLedgerOptions,
	type StoredEntry,
	type StoredLedger,
} from "./github-delivery-ledger-contracts.js";
import type { LedgerCommentCodec } from "./ledger-comment-codec.js";
import type { LedgerCommentPresenter } from "./ledger-comment-presenter.js";
import type { LedgerEntryMapping } from "./ledger-entry-mapping.js";

export interface GithubDeliveryLedgerCollaborators {
	readonly ledgerEntryMapping: Pick<
		LedgerEntryMapping,
		"protectIdentifier" | "publicEntry" | "safeCode"
	>;
	readonly ledgerCommentCodec: Pick<LedgerCommentCodec, "decode">;
}

export class GithubDeliveryLedger
	implements DeliveryLedger, AttentionRecoverySource
{
	readonly #authorLogin: string;

	constructor(
		private readonly collaborators: GithubDeliveryLedgerCollaborators,
		private readonly comments: GithubLedgerCommentClient,
		private readonly options: GithubDeliveryLedgerOptions,
		private readonly presenter: Pick<LedgerCommentPresenter, "render">,
	) {
		this.#authorLogin = options.authorLogin.trim().toLowerCase();
		if (!this.#authorLogin) {
			throw new Error("Delivery ledger author login is required");
		}
	}

	async readAttention(): Promise<readonly AttentionRecoveryItem[]> {
		const { ledger, commentId } = await this.#load();
		return ledger.entries.map((entry) => ({
			key: entry.idempotencyKey,
			uncertain: entry.status === "pending" || entry.status === "uncertain",
			resolved: entry.status === "accepted",
			commentId,
		}));
	}
	async find(idempotencyKey: string): Promise<DeliveryLedgerEntry | undefined> {
		const { ledger } = await this.#load();
		const protectedKey =
			this.collaborators.ledgerEntryMapping.protectIdentifier(idempotencyKey);
		const entry = ledger.entries.find(
			(candidate) => candidate.idempotencyKey === protectedKey,
		);
		return entry
			? this.collaborators.ledgerEntryMapping.publicEntry(entry)
			: undefined;
	}

	async reservePending(
		reservation: DeliveryReservation,
	): Promise<DeliveryReservationResult> {
		this.#assertDispatchAuthorized();
		const state = await this.#load();
		const protectedKey =
			this.collaborators.ledgerEntryMapping.protectIdentifier(
				reservation.idempotencyKey,
			);
		const existing = state.ledger.entries.find(
			(entry) => entry.idempotencyKey === protectedKey,
		);
		if (existing) {
			return {
				reserved: false,
				entry: this.collaborators.ledgerEntryMapping.publicEntry(existing),
			};
		}

		const entry: StoredEntry = {
			idempotencyKey: protectedKey,
			intentId: this.collaborators.ledgerEntryMapping.protectIdentifier(
				reservation.intentId,
			),
			repositoryId: this.collaborators.ledgerEntryMapping.protectIdentifier(
				reservation.repositoryId,
			),
			eventId: this.collaborators.ledgerEntryMapping.protectIdentifier(
				reservation.eventId,
			),
			kind: reservation.kind,
			recipientId: this.collaborators.ledgerEntryMapping.protectIdentifier(
				reservation.recipientId,
			),
			policyVersion: reservation.policyVersion,
			status: "pending",
			updatedAt: reservation.reservedAt,
		};
		state.ledger.entries.push(entry);
		await this.#save(state.commentId, state.ledger);
		return {
			reserved: true,
			entry: {
				...this.collaborators.ledgerEntryMapping.publicEntry(entry),
				status: "pending",
			},
		};
	}

	async markAccepted(
		idempotencyKey: string,
		acceptedAt: string,
	): Promise<void> {
		await this.#transition(idempotencyKey, "accepted", acceptedAt);
	}

	async markUncertain(
		idempotencyKey: string,
		uncertainAt: string,
		diagnosticCode: string,
	): Promise<void> {
		await this.#transition(
			idempotencyKey,
			"uncertain",
			uncertainAt,
			diagnosticCode,
		);
	}

	async markRejected(
		idempotencyKey: string,
		rejectedAt: string,
		diagnosticCode: string,
	): Promise<void> {
		await this.#transition(
			idempotencyKey,
			"rejected",
			rejectedAt,
			diagnosticCode,
		);
	}

	async releasePending(idempotencyKey: string): Promise<void> {
		this.#assertDispatchAuthorized();
		const state = await this.#load();
		const protectedKey =
			this.collaborators.ledgerEntryMapping.protectIdentifier(idempotencyKey);
		const index = state.ledger.entries.findIndex(
			(entry) => entry.idempotencyKey === protectedKey,
		);
		if (index < 0 || state.ledger.entries[index]?.status !== "pending") {
			throw new Error("Cannot release a delivery that is not pending");
		}
		state.ledger.entries.splice(index, 1);
		await this.#save(state.commentId, state.ledger);
	}

	async #transition(
		idempotencyKey: string,
		status: "accepted" | "uncertain" | "rejected",
		updatedAt: string,
		diagnosticCode?: string,
	): Promise<void> {
		this.#assertDispatchAuthorized();
		const state = await this.#load();
		const protectedKey =
			this.collaborators.ledgerEntryMapping.protectIdentifier(idempotencyKey);
		const index = state.ledger.entries.findIndex(
			(entry) => entry.idempotencyKey === protectedKey,
		);
		if (index < 0) {
			throw new Error("Cannot transition a delivery that was not reserved");
		}
		const current = state.ledger.entries[index];
		if (!current) {
			throw new Error("Delivery ledger index is invalid");
		}
		state.ledger.entries[index] = {
			...current,
			status,
			updatedAt,
			...(diagnosticCode
				? {
						diagnosticCode:
							this.collaborators.ledgerEntryMapping.safeCode(diagnosticCode),
					}
				: {}),
		};
		await this.#save(state.commentId, state.ledger);
	}

	async #load(): Promise<{ commentId?: number; ledger: StoredLedger }> {
		const matching = (await this.comments.listComments()).filter(
			(comment) =>
				comment.body.startsWith(DELIVERY_LEDGER_MARKER) &&
				comment.authorLogin?.trim().toLowerCase() === this.#authorLogin,
		);
		if (matching.length > 1) {
			throw new Error("Multiple managed delivery ledger comments found");
		}
		const comment = matching[0];
		if (!comment) {
			return { ledger: { schemaVersion: 2, entries: [] } };
		}
		return {
			commentId: comment.id,
			ledger: this.collaborators.ledgerCommentCodec.decode(comment.body),
		};
	}

	async #save(
		commentId: number | undefined,
		ledger: StoredLedger,
	): Promise<void> {
		ledger.entries.sort((left, right) =>
			left.idempotencyKey.localeCompare(right.idempotencyKey),
		);
		const body = this.presenter.render(ledger);
		if (commentId === undefined) {
			await this.comments.createComment(body);
			return;
		}
		await this.comments.updateComment(commentId, body);
	}

	#assertDispatchAuthorized(): void {
		if (!this.options.dispatchAuthorized) {
			throw new Error(
				"Delivery ledger writes require the reusable workflow concurrency lock",
			);
		}
	}
}
export type GithubDeliveryLedgerArguments =
	ConstructorParameters<typeof GithubDeliveryLedger> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;

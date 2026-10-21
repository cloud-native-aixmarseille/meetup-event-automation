import type {
	StoredEntry,
	StoredLedger,
} from "./github-delivery-ledger-contracts.js";
import type { LedgerEntryMapping } from "./ledger-entry-mapping.js";

/** Own the supported ledger schema and its hidden Markdown representation. */
export interface LedgerCommentCodecCollaborators {
	readonly ledgerEntryMapping: Pick<LedgerEntryMapping, "protect">;
}

export class LedgerCommentCodec {
	constructor(
		private readonly collaborators: LedgerCommentCodecCollaborators,
	) {}

	decode(body: string): StoredLedger {
		const openingFence = "```json";
		const start = body.indexOf(openingFence);
		const end = body.indexOf("```", start + openingFence.length);
		if (start < 0 || end < 0)
			throw new Error("Managed delivery ledger comment is corrupted");
		let value: unknown;
		try {
			value = JSON.parse(body.slice(start + openingFence.length, end).trim());
		} catch {
			throw new Error("Managed delivery ledger comment is corrupted");
		}
		if (
			!this.object(value) ||
			(value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
			!Array.isArray(value.entries)
		)
			throw new Error("Managed delivery ledger schema is unsupported");
		const entries = value.entries.map((entry: unknown) => {
			if (!this.isEntry(entry))
				throw new Error("Managed delivery ledger entry is corrupted");
			return this.collaborators.ledgerEntryMapping.protect(entry);
		});
		if (
			new Set(entries.map((entry) => entry.idempotencyKey)).size !==
			entries.length
		)
			throw new Error("Managed delivery ledger contains duplicate identities");
		return { schemaVersion: 2, entries };
	}

	encode(ledger: StoredLedger): string {
		// The JSON fence remains readable by supported stored-state readers.
		const json = JSON.stringify(ledger, null, 2).replace(
			/[<>&`-]/g,
			(character) =>
				`\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
		);
		return `<!--\n\`\`\`json\n${json}\n\`\`\`\n-->`;
	}

	private isEntry(value: unknown): value is StoredEntry {
		if (!this.object(value)) return false;
		return (
			typeof value.idempotencyKey === "string" &&
			typeof value.intentId === "string" &&
			(value.status === "pending" ||
				value.status === "accepted" ||
				value.status === "uncertain" ||
				value.status === "rejected") &&
			typeof value.updatedAt === "string" &&
			typeof value.repositoryId === "string" &&
			typeof value.eventId === "string" &&
			this.isKind(value.kind) &&
			typeof value.recipientId === "string" &&
			typeof value.policyVersion === "string" &&
			(value.diagnosticCode === undefined ||
				typeof value.diagnosticCode === "string")
		);
	}

	private isKind(value: unknown): value is StoredEntry["kind"] {
		return (
			value === "host-introduction" ||
			value === "speaker-introduction" ||
			value === "host-thanks" ||
			value === "speaker-thanks" ||
			value === "readiness-reminder"
		);
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}

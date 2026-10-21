import type {
	StoredEntry,
	StoredLedger,
} from "./github-delivery-ledger-contracts.js";
import { LedgerEntryMapping } from "./ledger-entry-mapping.js";

/** Own the supported ledger schema and its hidden Markdown representation. */
export class LedgerCommentCodec {
	static decode(body: string): StoredLedger {
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
			!LedgerCommentCodec.object(value) ||
			(value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
			!Array.isArray(value.entries)
		)
			throw new Error("Managed delivery ledger schema is unsupported");
		const entries = value.entries.map((entry: unknown) => {
			if (!LedgerCommentCodec.isEntry(entry))
				throw new Error("Managed delivery ledger entry is corrupted");
			return LedgerEntryMapping.protect(entry);
		});
		if (
			new Set(entries.map((entry) => entry.idempotencyKey)).size !==
			entries.length
		)
			throw new Error("Managed delivery ledger contains duplicate identities");
		return { schemaVersion: 2, entries };
	}

	static encode(ledger: StoredLedger): string {
		// The JSON fence remains readable by supported stored-state readers.
		const json = JSON.stringify(ledger, null, 2).replace(
			/[<>&`-]/g,
			(character) =>
				`\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
		);
		return `<!--\n\`\`\`json\n${json}\n\`\`\`\n-->`;
	}

	private static isEntry(value: unknown): value is StoredEntry {
		if (!LedgerCommentCodec.object(value)) return false;
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
			LedgerCommentCodec.isKind(value.kind) &&
			typeof value.recipientId === "string" &&
			typeof value.policyVersion === "string" &&
			(value.diagnosticCode === undefined ||
				typeof value.diagnosticCode === "string")
		);
	}

	private static isKind(value: unknown): value is StoredEntry["kind"] {
		return (
			value === "host-introduction" ||
			value === "speaker-introduction" ||
			value === "host-thanks" ||
			value === "speaker-thanks" ||
			value === "readiness-reminder"
		);
	}

	private static object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}

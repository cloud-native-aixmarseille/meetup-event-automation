import { createHash } from "node:crypto";
import type { DeliveryLedgerEntry } from "@meetup-automation/communication";
import type { StoredEntry } from "./github-delivery-ledger-contracts.js";

/** Allowlist persisted fields and protect private delivery identities. */
export class LedgerEntryMapping {
	static publicEntry(entry: StoredEntry): DeliveryLedgerEntry {
		return {
			idempotencyKey: entry.idempotencyKey,
			intentId: entry.intentId,
			status: entry.status,
			updatedAt: entry.updatedAt,
		};
	}

	static protect(entry: StoredEntry): StoredEntry {
		return {
			idempotencyKey: LedgerEntryMapping.protectIdentifier(
				entry.idempotencyKey,
			),
			intentId: LedgerEntryMapping.protectIdentifier(entry.intentId),
			repositoryId: LedgerEntryMapping.protectIdentifier(entry.repositoryId),
			eventId: LedgerEntryMapping.protectIdentifier(entry.eventId),
			recipientId: LedgerEntryMapping.protectIdentifier(entry.recipientId),
			kind: entry.kind,
			status: entry.status,
			updatedAt: entry.updatedAt,
			policyVersion: entry.policyVersion,
			...(entry.diagnosticCode
				? { diagnosticCode: LedgerEntryMapping.safeCode(entry.diagnosticCode) }
				: {}),
		};
	}

	static safeCode(code: string): string {
		return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(code)
			? code
			: "unsafe-diagnostic-code-redacted";
	}

	static protectIdentifier(value: string): string {
		if (/^sha256:[0-9a-f]{64}$/.test(value)) return value;
		return `sha256:${createHash("sha256").update(value).digest("hex")}`;
	}
}

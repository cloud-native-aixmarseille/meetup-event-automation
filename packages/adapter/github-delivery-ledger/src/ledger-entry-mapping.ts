import { createHash } from "node:crypto";
import type { DeliveryLedgerEntry } from "@meetup-automation/communication";
import type { StoredEntry } from "./github-delivery-ledger-contracts.js";

/** Allowlist persisted fields and protect private delivery identities. */
export class LedgerEntryMapping {
	publicEntry(entry: StoredEntry): DeliveryLedgerEntry {
		return {
			idempotencyKey: entry.idempotencyKey,
			intentId: entry.intentId,
			status: entry.status,
			updatedAt: entry.updatedAt,
		};
	}

	protect(entry: StoredEntry): StoredEntry {
		return {
			idempotencyKey: this.protectIdentifier(entry.idempotencyKey),
			intentId: this.protectIdentifier(entry.intentId),
			repositoryId: this.protectIdentifier(entry.repositoryId),
			eventId: this.protectIdentifier(entry.eventId),
			recipientId: this.protectIdentifier(entry.recipientId),
			kind: entry.kind,
			status: entry.status,
			updatedAt: entry.updatedAt,
			policyVersion: entry.policyVersion,
			...(entry.diagnosticCode
				? { diagnosticCode: this.safeCode(entry.diagnosticCode) }
				: {}),
		};
	}

	safeCode(code: string): string {
		return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(code)
			? code
			: "unsafe-diagnostic-code-redacted";
	}

	protectIdentifier(value: string): string {
		if (/^sha256:[0-9a-f]{64}$/.test(value)) return value;
		return `sha256:${createHash("sha256").update(value).digest("hex")}`;
	}
}

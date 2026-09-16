import type { CommunicationApprovalPublicationUrls } from "./approval-contracts.js";
import { CommunicationApprovalSnapshotError } from "./communication-approval-snapshot-error.js";
import { CommunicationIdempotency } from "./idempotency.js";

export class ApprovalValueValidation {
	static requireSafeIdentifier(value: string, field: string): string {
		if (typeof value !== "string") {
			throw new CommunicationApprovalSnapshotError(
				`${field} must be a stable, PII-free identifier`,
			);
		}
		const normalized = value.trim();
		if (!CommunicationIdempotency.isSafeCommunicationIdentifier(normalized)) {
			throw new CommunicationApprovalSnapshotError(
				`${field} must be a stable, PII-free identifier`,
			);
		}
		return normalized;
	}

	static requireSha256Fingerprint(value: string, field: string): string {
		if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
			throw new CommunicationApprovalSnapshotError(
				`${field} must be a SHA-256 fingerprint`,
			);
		}
		return value;
	}

	static requireIsoDate(value: string): string {
		if (typeof value !== "string") {
			throw new CommunicationApprovalSnapshotError(
				"eventDate must be a real date formatted as YYYY-MM-DD",
			);
		}
		const normalized = value.trim();
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
		if (!match) {
			throw new CommunicationApprovalSnapshotError(
				"eventDate must be a real date formatted as YYYY-MM-DD",
			);
		}
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const parsed = new Date(Date.UTC(year, month - 1, day));
		if (
			parsed.getUTCFullYear() !== year ||
			parsed.getUTCMonth() !== month - 1 ||
			parsed.getUTCDate() !== day
		) {
			throw new CommunicationApprovalSnapshotError(
				"eventDate must be a real date formatted as YYYY-MM-DD",
			);
		}
		return normalized;
	}

	static normalizePublicUrl(
		value: string | null,
		field: keyof CommunicationApprovalPublicationUrls,
	): string | null {
		if (value === null) {
			return null;
		}
		if (typeof value !== "string") {
			throw new CommunicationApprovalSnapshotError(
				`${field} publication URL must be an HTTPS URL or null`,
			);
		}
		const normalized = value.trim().replace(/\/$/, "");
		if (!normalized) {
			return null;
		}
		try {
			const url = new URL(normalized);
			if (url.protocol !== "https:" || url.username || url.password) {
				throw new Error("not a public HTTPS URL");
			}
		} catch {
			throw new CommunicationApprovalSnapshotError(
				`${field} publication URL must be an HTTPS URL or null`,
			);
		}
		return normalized;
	}

	static invalidSnapshot(): CommunicationApprovalSnapshotError {
		return new CommunicationApprovalSnapshotError(
			"Communication approval snapshot has an invalid schema",
		);
	}
}

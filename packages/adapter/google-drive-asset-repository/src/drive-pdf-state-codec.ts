import {
	PdfExportError,
	type PdfExportIdentity,
	type PdfExportPolicy,
	type PdfExportSnapshot,
	type PdfExportState,
} from "@meetup-automation/publication";
import type { DrivePdfMetadata } from "./drive-pdf-metadata.js";

/** The sidecar schema is private to the Drive adapter. */
export class DrivePdfStateCodec {
	constructor(
		private readonly metadata: Pick<DrivePdfMetadata, "validateIdentity">,
		private readonly policy: Pick<PdfExportPolicy, "sameIdentity">,
	) {}

	decode(value: unknown, identity: PdfExportIdentity): PdfExportState {
		if (
			!this.record(value) ||
			value.version !== 1 ||
			!this.record(value.identity)
		)
			throw new PdfExportError("recovery");
		const storedIdentity = this.identity(value.identity);
		this.metadata.validateIdentity(storedIdentity);
		if (
			!this.policy.sameIdentity(storedIdentity, identity) ||
			typeof value.fileId !== "string" ||
			!/^[\w-]{1,120}$/.test(value.fileId)
		)
			throw new PdfExportError("recovery");
		if (
			[identity.sourceId, identity.templateId, identity.folderId].includes(
				value.fileId,
			)
		)
			throw new PdfExportError("recovery");
		const confirmed =
			value.confirmed === undefined
				? undefined
				: this.snapshot(value.confirmed);
		const pending =
			value.pending === undefined ? undefined : this.snapshot(value.pending);
		if (!confirmed && !pending) throw new PdfExportError("recovery");
		return {
			identity: storedIdentity,
			fileId: value.fileId,
			confirmed,
			pending,
		};
	}

	encode(state: PdfExportState): string {
		const normalized = this.decode({ ...state, version: 1 }, state.identity);
		return JSON.stringify({ version: 1, ...normalized });
	}

	private identity(value: Record<string, unknown>): PdfExportIdentity {
		if (
			typeof value.eventId !== "string" ||
			typeof value.folderId !== "string" ||
			typeof value.sourceId !== "string" ||
			typeof value.templateId !== "string"
		)
			throw new PdfExportError("recovery");
		return {
			eventId: value.eventId,
			folderId: value.folderId,
			sourceId: value.sourceId,
			templateId: value.templateId,
		};
	}

	private snapshot(value: unknown): PdfExportSnapshot {
		if (
			!this.record(value) ||
			value.contract !== "pdf-v1" ||
			typeof value.sourceVersion !== "string" ||
			!/^\d{1,120}$/.test(value.sourceVersion)
		)
			throw new PdfExportError("recovery");
		if (
			typeof value.name !== "string" ||
			!value.name.trim() ||
			value.name.length > 204 ||
			typeof value.fingerprint !== "string" ||
			!/^[a-f0-9]{64}$/.test(value.fingerprint)
		)
			throw new PdfExportError("recovery");
		return {
			sourceVersion: value.sourceVersion,
			contract: value.contract,
			name: value.name,
			fingerprint: value.fingerprint,
		};
	}

	private record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}

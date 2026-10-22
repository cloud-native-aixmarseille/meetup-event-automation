import {
	PdfExportError,
	type PdfExportIdentity,
} from "@meetup-automation/publication";
import type { DriveFile } from "./google-drive-asset-repository-contracts.js";

export type PdfFileKind = "pdf" | "state";
export interface PdfDriveFile {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly folderId: string;
}

export class DrivePdfMetadata {
	validateIdentity(identity: PdfExportIdentity): void {
		if (
			![identity.folderId, identity.sourceId, identity.templateId].every((id) =>
				/^[\w-]{1,120}$/.test(id),
			) ||
			!identity.eventId ||
			identity.eventId.length > 512
		) {
			throw new PdfExportError("recovery");
		}
	}

	marker(kind: PdfFileKind): string {
		return kind === "pdf" ? "meetup_pdf_source" : "meetup_pdf_state";
	}

	properties(
		identity: PdfExportIdentity,
		kind: PdfFileKind,
	): Record<string, string> {
		return {
			[this.marker(kind)]: identity.sourceId,
			meetup_pdf_template: identity.templateId,
			meetup_pdf_contract: "pdf-v1",
		};
	}

	file(
		file: DriveFile,
		identity: PdfExportIdentity,
		kind: PdfFileKind,
		publicFolderId?: string,
	): PdfDriveFile {
		const properties = this.properties(identity, kind);
		if (
			typeof file.id !== "string" ||
			!file.id ||
			typeof file.name !== "string" ||
			!file.name.trim() ||
			typeof file.version !== "string" ||
			!/^\d{1,120}$/.test(file.version) ||
			file.trashed ||
			!Array.isArray(file.parents) ||
			file.parents.length !== 1 ||
			!(
				file.parents[0] === identity.folderId ||
				(kind === "pdf" && publicFolderId && file.parents[0] === publicFolderId)
			) ||
			file.mimeType !==
				(kind === "pdf" ? "application/pdf" : "application/json")
		) {
			throw new PdfExportError("recovery");
		}
		if (
			file.description !== identity.eventId ||
			file.appProperties?.template_file_id ||
			Object.entries(properties).some(
				([key, value]) => file.appProperties?.[key] !== value,
			)
		) {
			throw new PdfExportError("recovery");
		}
		return {
			id: file.id,
			name: file.name,
			version: file.version,
			folderId: file.parents[0],
		};
	}

	source(file: DriveFile, identity: PdfExportIdentity): string {
		if (
			file.id !== identity.sourceId ||
			file.trashed ||
			!Array.isArray(file.parents) ||
			!file.parents.includes(identity.folderId) ||
			file.mimeType !== "application/vnd.google-apps.presentation" ||
			file.appProperties?.template_file_id !== identity.templateId ||
			file.appProperties?.template_kind !== "slides"
		) {
			throw new PdfExportError("source");
		}
		if (typeof file.version !== "string" || !/^\d{1,120}$/.test(file.version))
			throw new PdfExportError("invalid");
		return file.version;
	}
}

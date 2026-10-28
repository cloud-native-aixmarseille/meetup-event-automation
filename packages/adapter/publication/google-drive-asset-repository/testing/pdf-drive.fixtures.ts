import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type { drive_v3 } from "@googleapis/drive";
import type {
	PdfExportIdentity,
	PdfExportSnapshot,
	PdfExportState,
} from "@meetup-automation/publication";
import { vi } from "vitest";
import type {
	DriveFile,
	GoogleDriveClient,
} from "../src/google-drive-asset-repository-contracts.js";

export const pdfBytes = Buffer.from(
	"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
export const pdfFingerprint = createHash("sha256")
	.update(pdfBytes)
	.digest("hex");
export const publicFolderId = "public-folder";
export const exportIdentity: PdfExportIdentity = {
	eventId: "example/meetups#42",
	folderId: "event-folder",
	sourceId: "source-slides",
	templateId: "template",
};
export const exportSnapshot: PdfExportSnapshot = {
	sourceVersion: "1",
	name: "2026-10-15 - Slides.pdf",
	contract: "pdf-v1",
	fingerprint: pdfFingerprint,
};
export const exportState: PdfExportState = {
	identity: exportIdentity,
	fileId: "reserved-pdf",
	pending: exportSnapshot,
};

export function pdfMetadata(
	kind: "pdf" | "state",
	id = kind === "pdf" ? "reserved-pdf" : "state",
): DriveFile {
	return {
		id,
		name:
			kind === "pdf" ? exportSnapshot.name : ".source-slides.pdf-export.json",
		version: "1",
		parents: [exportIdentity.folderId],
		description: exportIdentity.eventId,
		mimeType: kind === "pdf" ? "application/pdf" : "application/json",
		trashed: false,
		appProperties: {
			[kind === "pdf" ? "meetup_pdf_source" : "meetup_pdf_state"]:
				exportIdentity.sourceId,
			meetup_pdf_template: exportIdentity.templateId,
			meetup_pdf_contract: "pdf-v1",
		},
	};
}

export function createPdfDrive() {
	const records = new Map<string, { metadata: DriveFile; bytes: Buffer }>();
	records.set(publicFolderId, {
		metadata: {
			id: publicFolderId,
			name: "public",
			mimeType: "application/vnd.google-apps.folder",
			parents: ["shared-assets"],
		},
		bytes: Buffer.alloc(0),
	});
	records.set(exportIdentity.sourceId, {
		metadata: {
			id: exportIdentity.sourceId,
			name: "Slides",
			version: "1",
			mimeType: "application/vnd.google-apps.presentation",
			parents: [exportIdentity.folderId],
			appProperties: { template_file_id: "template", template_kind: "slides" },
		},
		bytes: pdfBytes,
	});
	let sequence = 0;
	async function write(input: {
		fileId?: string;
		addParents?: string;
		removeParents?: string;
		requestBody?: DriveFile;
		media?: { body: Readable };
	}) {
		const id = input.fileId ?? input.requestBody?.id ?? `file-${++sequence}`;
		const existing = records.get(id);
		if (!input.fileId && existing)
			throw Object.assign(new Error("conflict"), { response: { status: 409 } });
		const chunks: Buffer[] = [];
		if (input.media)
			for await (const chunk of input.media.body)
				chunks.push(Buffer.from(chunk));
		const metadata: DriveFile = {
			...existing?.metadata,
			...input.requestBody,
			id,
			version: String(Number(existing?.metadata.version ?? 0) + 1),
		};
		if (input.addParents || input.removeParents)
			metadata.parents = [
				...(metadata.parents ?? []).filter(
					(parent) => !input.removeParents?.split(",").includes(parent),
				),
				...(input.addParents?.split(",") ?? []),
			];
		records.set(id, {
			metadata,
			bytes: input.media
				? Buffer.concat(chunks)
				: (existing?.bytes ?? Buffer.alloc(0)),
		});
		return { data: metadata };
	}
	const files = {
		list: vi.fn(async (input: { q: string }) => ({
			data: {
				files: [...records.values()]
					.filter(
						({ metadata }) =>
							!metadata.trashed &&
							metadata.parents?.some((parent) =>
								input.q.includes(`'${parent}' in parents`),
							) &&
							Object.entries(metadata.appProperties ?? {}).some(
								([key, value]) =>
									input.q.includes(`key='${key}' and value='${value}'`),
							),
					)
					.map(({ metadata }) => metadata),
			},
		})),
		get: vi.fn(async (input: { fileId: string; alt?: string }) => {
			const record = records.get(input.fileId);
			if (!record)
				throw Object.assign(new Error("not found"), {
					response: { status: 404 },
				});
			return {
				data:
					input.alt === "media"
						? Readable.from([record.bytes])
						: record.metadata,
				headers: new Headers({
					"content-type": record.metadata.mimeType ?? "",
				}),
			};
		}),
		generateIds: vi.fn(async () => ({ data: { ids: ["reserved-pdf"] } })),
		create: vi.fn(write),
		update: vi.fn(write),
	};
	const permissions = {
		list: vi.fn(
			async (input: {
				fileId: string;
			}): Promise<{ data: drive_v3.Schema$PermissionList }> => ({
				data: {
					permissions: records.get(input.fileId)?.metadata.permissions ?? [],
				},
			}),
		),
		create: vi.fn(
			async (input: {
				fileId: string;
				requestBody: drive_v3.Schema$Permission;
			}) => {
				const file = records.get(input.fileId);
				if (!file) throw new Error("Synthetic file missing");
				const permission = { ...input.requestBody, id: "anyoneWithLink" };
				file.metadata.permissions = [
					...(file.metadata.permissions ?? []),
					permission,
				];
				file.metadata.version = String(Number(file.metadata.version ?? 0) + 1);
				return { data: permission };
			},
		),
	};
	return {
		download: {
			export: vi.fn(async () => ({
				bytes: pdfBytes,
				fingerprint: pdfFingerprint,
			})),
		},
		client: { files, permissions } as unknown as GoogleDriveClient &
			Pick<drive_v3.Drive, "permissions">,
		files,
		permissions,
		records,
	};
}

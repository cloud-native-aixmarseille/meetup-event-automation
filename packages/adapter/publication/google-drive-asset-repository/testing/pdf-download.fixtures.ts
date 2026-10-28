import type { drive_v3 } from "@googleapis/drive";
import { ContentFingerprint } from "@meetup-automation/publication";
import { vi } from "vitest";
import { DriveBoundedStream } from "../src/drive-bounded-stream.js";
import { DrivePdfBinary } from "../src/drive-pdf-binary.js";
import { GoogleDrivePdfDownload } from "../src/google-drive-pdf-download.js";
import { pdfBytes } from "./pdf-drive.fixtures.js";

export function createDownloadFixture() {
	const operation: drive_v3.Schema$Operation = {
		name: "operations/synthetic",
		done: true,
		response: {
			downloadUri: "https://docs.google.com/presentation/d/source/export/pdf",
		},
	};
	const download = vi.fn(async () => ({ data: operation }));
	const get = vi.fn(async () => ({ data: operation }));
	const client = {
		files: { download },
		operations: { get },
	} as unknown as Pick<drive_v3.Drive, "files" | "operations">;
	const token = vi.fn(async () => "synthetic-token");
	const request = vi.fn<typeof fetch>(
		async () =>
			new Response(pdfBytes, {
				headers: { "Content-Type": "application/pdf" },
			}),
	);
	let time = 0;
	const wait = vi.fn(async (milliseconds: number) => {
		time += milliseconds;
	});
	const adapter = new GoogleDrivePdfDownload(
		client,
		token,
		request,
		wait,
		() => time,
		new DrivePdfBinary(new DriveBoundedStream(), new ContentFingerprint()),
	);
	return { operation, download, get, token, request, wait, adapter };
}

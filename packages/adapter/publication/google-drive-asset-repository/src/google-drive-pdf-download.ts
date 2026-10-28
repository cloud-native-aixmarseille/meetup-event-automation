import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import type { drive_v3 } from "@googleapis/drive";
import type { DrivePdfBinary } from "./drive-pdf-binary.js";
import { requestOptions } from "./google-drive-asset-repository-contracts.js";

/** Downloads Slides through Drive's supported long-running export API. */
export class GoogleDrivePdfDownload {
	constructor(
		private readonly client: Pick<drive_v3.Drive, "files" | "operations">,
		private readonly accessToken: () => Promise<string | null | undefined>,
		private readonly request: typeof fetch,
		private readonly wait: (milliseconds: number) => Promise<void>,
		private readonly now: () => number,
		private readonly binary: Pick<DrivePdfBinary, "read">,
	) {}

	async export(fileId: string) {
		const operation = await this.operation(fileId);
		const destination = this.destination(operation.response?.downloadUri);
		if (destination.hostname !== "docs.google.com")
			throw new Error("Unexpected Slides download host");
		const token = await this.accessToken();
		if (!token) throw new Error("Google Drive authentication unavailable");
		const resourceKey = operation.metadata?.resourceKey;
		if (resourceKey && !/^[\w-]{1,200}$/.test(resourceKey))
			throw new Error("Invalid Drive resource key");
		const headers = {
			Authorization: `Bearer ${token}`,
			...(resourceKey
				? { "X-Goog-Drive-Resource-Keys": `${fileId}/${resourceKey}` }
				: {}),
		};
		const response = await this.download(destination, headers);
		if (response.status !== 200 || !response.body) {
			await response.body?.cancel();
			throw new Error("Google Drive PDF download failed");
		}
		return this.binary.read(
			Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
			response.headers.get("content-type"),
		);
	}

	private async operation(fileId: string): Promise<drive_v3.Schema$Operation> {
		let operation = (
			await this.client.files.download(
				{ fileId, mimeType: "application/pdf" },
				requestOptions,
			)
		).data;
		const deadline = this.now() + 120_000;
		while (!operation.done) {
			if (!operation.name || this.now() + 10_000 >= deadline)
				throw new Error("Google Drive PDF preparation timed out");
			await this.wait(10_000);
			operation = (
				await this.client.operations.get(
					{ name: operation.name },
					requestOptions,
				)
			).data;
		}
		if (operation.error) throw new Error("Google Drive PDF preparation failed");
		return operation;
	}

	private async download(destination: URL, headers: Record<string, string>) {
		let current = destination;
		const signal = AbortSignal.timeout(120_000);
		for (let redirects = 0; redirects <= 5; redirects++) {
			const response = await this.request(current, {
				headers: current.origin === destination.origin ? headers : {},
				redirect: "manual",
				signal,
			});
			if (![301, 302, 303, 307, 308].includes(response.status)) return response;
			await response.body?.cancel();
			const location = response.headers.get("location");
			if (!location) throw new Error("Missing Google Drive download redirect");
			current = this.destination(new URL(location, current).href);
		}
		throw new Error("Too many Google Drive download redirects");
	}

	private destination(value: unknown): URL {
		if (typeof value !== "string")
			throw new Error("Missing Google Drive download URL");
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			throw new Error("Invalid Google Drive download URL");
		}
		if (
			url.protocol !== "https:" ||
			url.port ||
			url.username ||
			url.password ||
			url.hash ||
			!(
				url.hostname === "docs.google.com" ||
				url.hostname.endsWith(".googleusercontent.com")
			)
		)
			throw new Error("Untrusted Google Drive download URL");
		return url;
	}
}

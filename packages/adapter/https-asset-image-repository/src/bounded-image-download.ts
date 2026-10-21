import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import type { IncomingMessage } from "node:http";
import { request } from "node:https";
import { ContentError } from "@meetup-automation/publication";
import type { PublicImageUrl } from "./public-image-url.js";

export interface BoundedImageDownloadCollaborators {
	readonly publicImageUrl: Pick<PublicImageUrl, "parse" | "publicAddress">;
}

export class BoundedImageDownload {
	constructor(
		private readonly collaborators: BoundedImageDownloadCollaborators,
		private readonly resolve = lookup,
		private readonly send = request,
	) {}

	async get(
		value: string,
		temporary = false,
	): Promise<{ bytes: Buffer; mediaType: string; url: string }> {
		let url = this.collaborators.publicImageUrl.parse(value, temporary);
		const signal = AbortSignal.timeout(15_000);
		for (let redirect = 0; redirect <= 3; redirect++) {
			const addresses = await this.addresses(url.hostname, signal);
			if (
				!addresses.length ||
				addresses.some(
					(item) =>
						!this.collaborators.publicImageUrl.publicAddress(item.address),
				)
			)
				throw new ContentError("image");
			const response = await new Promise<IncomingMessage>((resolve, reject) => {
				// Pin the checked address: no second DNS lookup, ambient proxy, cookies or credentials.
				const req = this.send(
					url,
					{
						signal,
						agent: false,
						lookup: (_host, options, callback) =>
							options.all
								? callback(null, addresses)
								: callback(null, addresses[0].address, addresses[0].family),
					},
					resolve,
				);
				req.on("error", reject);
				req.end();
			});
			if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
				response.destroy();
				if (!response.headers.location) throw new ContentError("image");
				url = this.collaborators.publicImageUrl.parse(
					new URL(response.headers.location, url).href,
					temporary,
				);
				continue;
			}
			if (response.statusCode !== 200 || response.headers["content-encoding"]) {
				response.destroy();
				throw new ContentError("image");
			}
			return {
				bytes: await this.body(response),
				mediaType: (response.headers["content-type"] ?? "")
					.split(";")[0]
					.toLowerCase(),
				url: url.href,
			};
		}
		throw new ContentError("image");
	}

	private async body(response: IncomingMessage): Promise<Buffer> {
		const chunks: Buffer[] = [];
		let size = 0;
		for await (const chunk of response) {
			size += chunk.length;
			if (size >= 50_000_000) {
				response.destroy();
				throw new ContentError("image");
			}
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	private async addresses(
		hostname: string,
		signal: AbortSignal,
	): Promise<LookupAddress[]> {
		signal.throwIfAborted();
		let cancel: (() => void) | undefined;
		try {
			return await Promise.race([
				this.resolve(hostname.replace(/^\[|\]$/g, ""), { all: true }),
				new Promise<never>((_resolve, reject) => {
					cancel = () => reject(new ContentError("image"));
					signal.addEventListener("abort", cancel, { once: true });
				}),
			]);
		} finally {
			if (cancel) signal.removeEventListener("abort", cancel);
		}
	}
}
export type BoundedImageDownloadArguments =
	ConstructorParameters<typeof BoundedImageDownload> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;

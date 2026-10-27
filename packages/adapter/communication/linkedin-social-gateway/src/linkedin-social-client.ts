export type LinkedInSocialFetch = (
	url: string,
	init: RequestInit,
) => Promise<Response>;
interface LinkedInFailure {
	readonly status: "rejected" | "deferred" | "uncertain";
	readonly code: string;
	readonly retryAfterSeconds?: number;
}
export type LinkedInResponse =
	| { readonly status: "success"; readonly response: Response }
	| LinkedInFailure;

/** Keeps OAuth and signed upload URLs inside the provider boundary. */
export class LinkedInSocialClient {
	constructor(
		private readonly token: string,
		private readonly fetcher: LinkedInSocialFetch,
	) {}

	request(
		path: string,
		method: "GET" | "POST",
		body?: unknown,
	): Promise<LinkedInResponse> {
		return this.send(`https://api.linkedin.com/rest/${path}`, {
			method,
			headers: {
				authorization: `Bearer ${this.token}`,
				"content-type": "application/json",
				"LinkedIn-Version": "202610",
				"X-Restli-Protocol-Version": "2.0.0",
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
	}

	upload(
		url: string,
		bytes: Uint8Array,
		mimeType: string,
	): Promise<LinkedInResponse> {
		if (!this.validUploadUrl(url))
			return Promise.resolve({
				status: "rejected",
				code: "invalid-upload-url",
			});
		return this.send(url, {
			method: "PUT",
			headers: {
				authorization: `Bearer ${this.token}`,
				"content-type": mimeType,
			},
			body: new Uint8Array(bytes),
		});
	}

	validUploadUrl(value: unknown): value is string {
		if (typeof value !== "string") return false;
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" &&
				url.hostname === "www.linkedin.com" &&
				!url.port &&
				!url.username &&
				!url.password &&
				!url.hash &&
				url.pathname.startsWith("/dms-uploads/")
			);
		} catch {
			return false;
		}
	}

	private async send(
		url: string,
		init: RequestInit,
	): Promise<LinkedInResponse> {
		let response: Response;
		try {
			response = await this.fetcher(url, {
				...init,
				redirect: "error",
				signal: AbortSignal.timeout(30_000),
			});
		} catch {
			return { status: "uncertain", code: "unknown-provider-state" };
		}
		if (response.ok) return { status: "success", response };
		switch (response.status) {
			case 400:
			case 422:
				return { status: "rejected", code: "invalid-request" };
			case 401:
				return { status: "rejected", code: "authentication-failed" };
			case 403:
				return { status: "rejected", code: "permission-denied" };
			case 404:
				return { status: "rejected", code: "destination-unavailable" };
			case 429:
				return {
					status: "deferred",
					code: "rate-limited",
					...this.retryAfter(response),
				};
			default:
				return { status: "uncertain", code: "ambiguous-response" };
		}
	}

	private retryAfter(response: Response): {
		readonly retryAfterSeconds?: number;
	} {
		const raw = response.headers.get("retry-after");
		if (!raw || !/^\d+$/.test(raw)) return {};
		const seconds = Number(raw);
		return Number.isSafeInteger(seconds) && seconds > 0
			? { retryAfterSeconds: seconds }
			: {};
	}
}

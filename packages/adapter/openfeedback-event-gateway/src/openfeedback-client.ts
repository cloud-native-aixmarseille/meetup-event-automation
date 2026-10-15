export class OpenFeedbackClient {
	constructor(
		private readonly apiKey: string,
		private readonly fetcher: typeof fetch,
	) {
		if (!/^oforg_\S+$/.test(apiKey))
			throw new Error("An OpenFeedback organization API key is required");
	}

	async request(
		path: string,
		method: "GET" | "POST" | "PATCH",
		body?: unknown,
	): Promise<Response> {
		try {
			return await this.fetcher(`https://api.openfeedback.io${path}`, {
				method,
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
				redirect: "error",
				signal: AbortSignal.timeout(30_000),
				headers: {
					"x-api-key": this.apiKey,
					"Content-Type": "application/json",
				},
			});
		} catch {
			throw new Error("OpenFeedback request failed");
		}
	}

	static async read(
		response: Response,
		id: string,
	): Promise<Record<string, unknown>> {
		if (!response.ok)
			throw new Error(`OpenFeedback request failed (HTTP ${response.status})`);
		let body: unknown;
		try {
			body = await response.json();
		} catch {
			throw new Error("Invalid OpenFeedback JSON response");
		}
		if (
			!body ||
			typeof body !== "object" ||
			Array.isArray(body) ||
			!("id" in body) ||
			body.id !== id
		)
			throw new Error("OpenFeedback returned an unexpected resource");
		return body as Record<string, unknown>;
	}
}

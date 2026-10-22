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
}
export type OpenFeedbackClientArguments = ConstructorParameters<
	typeof OpenFeedbackClient
>;

/** Stateless calls, no retry, fixed endpoint and bounded response bodies. */
export class GeminiGenerationHttp {
	constructor(
		private readonly request: typeof fetch,
		private readonly apiKey: string,
	) {}
	async generate(
		model: string,
		input: string,
		responseFormat: unknown,
	): Promise<unknown> {
		const response = await this.request(
			"https://generativelanguage.googleapis.com/v1beta/interactions",
			{
				method: "POST",
				redirect: "error",
				signal: AbortSignal.timeout(180_000),
				headers: {
					"content-type": "application/json",
					"x-goog-api-key": this.apiKey,
				},
				body: JSON.stringify({
					model,
					input,
					store: false,
					response_format: responseFormat,
				}),
			},
		);
		if (!response.ok || !response.body) {
			await response.body?.cancel();
			throw new Error("Content provider request failed");
		}
		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let size = 0;
		try {
			for (;;) {
				const part = await reader.read();
				if (part.done) break;
				size += part.value.byteLength;
				if (size > 30_000_000)
					throw new Error("Content provider response exceeds limit");
				chunks.push(part.value);
			}
			return JSON.parse(Buffer.concat(chunks).toString("utf8"));
		} finally {
			await reader.cancel();
		}
	}
}

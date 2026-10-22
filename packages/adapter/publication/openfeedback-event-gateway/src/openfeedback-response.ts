export class OpenFeedbackResponse {
	async read(response: Response, id: string): Promise<Record<string, unknown>> {
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

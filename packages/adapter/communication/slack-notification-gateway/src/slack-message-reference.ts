/** Only Slack interprets the opaque message references returned by its port. */
export class SlackMessageReference {
	valid(message: {
		readonly destination: string;
		readonly messageId: string;
	}): boolean {
		return (
			/^[CGD][A-Z0-9]+$/.test(message.destination) &&
			/^\d+\.\d+$/.test(message.messageId)
		);
	}
	read(
		payload: Readonly<Record<string, unknown>> | undefined,
		destination: string,
	): { destination: string; messageId: string } | undefined {
		if (payload?.channel !== destination || typeof payload.ts !== "string")
			return undefined;
		const message = { destination, messageId: payload.ts };
		return this.valid(message) ? message : undefined;
	}
}

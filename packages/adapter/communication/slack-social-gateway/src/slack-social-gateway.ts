import type {
	SocialDispatchResult,
	SocialPostInput,
	SocialPublicationGateway,
} from "@meetup-automation/communication";
import type {
	SlackSocialClient,
	SlackSocialResponse,
} from "./slack-social-client.js";

/** A gateway is bound to exactly one Slack installation. */
export class SlackSocialGateway implements SocialPublicationGateway {
	constructor(
		private readonly workspaceId: string,
		private readonly client: Pick<SlackSocialClient, "post">,
	) {}

	async publish(
		input: SocialPostInput,
		beforeWrite: () => Promise<void>,
	): Promise<SocialDispatchResult> {
		const destination = input.destination;
		if (destination.provider !== "slack" || !this.valid(input))
			return { status: "rejected", code: "invalid-request" };
		if (destination.workspaceId !== this.workspaceId)
			return { status: "rejected", code: "workspace-mismatch" };
		const auth = await this.client.post("auth.test", {});
		if (auth.outcome !== "accepted") return this.failure(auth, true);
		if (
			auth.payload.team_id !== this.workspaceId ||
			typeof auth.payload.bot_id !== "string" ||
			!/^B[A-Z0-9]+$/.test(auth.payload.bot_id)
		)
			return { status: "rejected", code: "workspace-mismatch" };
		await beforeWrite();
		const sent = await this.client.post("chat.postMessage", {
			channel: destination.channelId,
			text: input.text,
			mrkdwn: false,
			parse: "none",
			link_names: false,
			unfurl_links: false,
			unfurl_media: false,
		});
		if (sent.outcome !== "accepted") return this.failure(sent, false);
		if (
			sent.payload.channel !== destination.channelId ||
			typeof sent.payload.ts !== "string" ||
			!/^\d+\.\d+$/.test(sent.payload.ts)
		)
			return { status: "uncertain", code: "ambiguous-response" };
		return {
			status: "accepted",
			receipt: {
				provider: "slack",
				workspaceId: destination.workspaceId,
				channelId: destination.channelId,
				ts: sent.payload.ts,
			},
		};
	}

	private valid(input: SocialPostInput): boolean {
		return (
			input.destination.provider === "slack" &&
			/^T[A-Z0-9]+$/.test(input.destination.workspaceId) &&
			/^[CG][A-Z0-9]+$/.test(input.destination.channelId) &&
			Boolean(input.text.trim()) &&
			input.text.length <= 4000 &&
			!input.text.includes(String.fromCharCode(0)) &&
			!/<[!@#]/.test(input.text) &&
			!input.media
		);
	}

	private failure(
		result: Exclude<SlackSocialResponse, { outcome: "accepted" }>,
		readOnly: boolean,
	): SocialDispatchResult {
		if (readOnly && result.outcome === "uncertain")
			return { status: "deferred", code: "provider-unavailable" };
		return {
			status: result.outcome,
			code: result.diagnosticCode ?? "unknown-provider-state",
			...(result.retryAfterSeconds
				? { retryAfterSeconds: result.retryAfterSeconds }
				: {}),
		};
	}
}

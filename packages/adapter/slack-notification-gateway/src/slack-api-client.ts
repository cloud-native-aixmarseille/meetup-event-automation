import type { GatewayDispatchResult } from "@meetup-automation/communication";
import type { SlackFetch } from "./slack-notification-gateway-contracts.js";

export interface SlackApiResponse {
	readonly result: GatewayDispatchResult;
	readonly retryAfterSeconds?: number;
	readonly payload?: Readonly<Record<string, unknown>>;
}

/** Keep provider payloads internal; expose only safe delivery classifications. */
export class SlackApiClient {
	constructor(
		private readonly token: string,
		private readonly fetcher: SlackFetch = fetch,
	) {}
	async post(
		method: "chat.postMessage" | "chat.update" | "reactions.add",
		body: Readonly<Record<string, string | boolean>>,
	): Promise<SlackApiResponse> {
		let response: Response;
		try {
			response = await this.fetcher(`https://slack.com/api/${method}`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${this.token}`,
					"content-type": "application/json; charset=utf-8",
				},
				body: JSON.stringify(body),
			});
		} catch {
			return {
				result: {
					outcome: "uncertain",
					diagnosticCode: "unknown-provider-state",
				},
			};
		}
		if (!response.ok)
			return {
				retryAfterSeconds: this.retryAfter(response),
				result: this.httpRejection(response.status) ?? {
					outcome: "uncertain",
					diagnosticCode: "ambiguous-response",
				},
			};
		let payload: unknown;
		try {
			payload = await response.json();
		} catch {
			return {
				result: { outcome: "uncertain", diagnosticCode: "ambiguous-response" },
			};
		}
		if (
			typeof payload !== "object" ||
			payload === null ||
			Array.isArray(payload)
		)
			return {
				result: { outcome: "uncertain", diagnosticCode: "ambiguous-response" },
			};
		const data = payload as Record<string, unknown>;
		return {
			result:
				data.ok === true
					? { outcome: "accepted" }
					: this.slackApiRejection(data.error),
			payload: data,
		};
	}
	private retryAfter(response: Response): number | undefined {
		const value = Number(response.headers.get("retry-after"));
		return Number.isFinite(value) && value > 0 ? value : undefined;
	}
	private httpRejection(status: number): GatewayDispatchResult | undefined {
		switch (status) {
			case 400:
			case 422:
				return { outcome: "rejected", diagnosticCode: "invalid-request" };
			case 401:
				return { outcome: "rejected", diagnosticCode: "authentication-failed" };
			case 403:
				return { outcome: "rejected", diagnosticCode: "permission-denied" };
			case 404:
				return {
					outcome: "rejected",
					diagnosticCode: "destination-unavailable",
				};
			case 429:
				return { outcome: "deferred", diagnosticCode: "rate-limited" };
			default:
				return undefined;
		}
	}

	private slackApiRejection(error: unknown): GatewayDispatchResult {
		if (typeof error !== "string") {
			return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		}
		if (
			[
				"invalid_auth",
				"not_authed",
				"account_inactive",
				"token_revoked",
			].includes(error)
		) {
			return { outcome: "rejected", diagnosticCode: "authentication-failed" };
		}
		if (
			["channel_not_found", "not_in_channel", "is_archived"].includes(error)
		) {
			return { outcome: "rejected", diagnosticCode: "destination-unavailable" };
		}
		if (["missing_scope", "restricted_action"].includes(error)) {
			return { outcome: "rejected", diagnosticCode: "permission-denied" };
		}
		if (
			[
				"invalid_arguments",
				"invalid_arg_name",
				"msg_too_long",
				"no_text",
			].includes(error)
		) {
			return { outcome: "rejected", diagnosticCode: "invalid-request" };
		}
		if (error === "ratelimited") {
			return { outcome: "deferred", diagnosticCode: "rate-limited" };
		}
		return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
	}
}
export type SlackApiClientArguments = ConstructorParameters<
	typeof SlackApiClient
>;

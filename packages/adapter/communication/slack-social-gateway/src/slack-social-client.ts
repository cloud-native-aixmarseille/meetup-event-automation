import type { GatewayDispatchResult } from "@meetup-automation/communication";

export type SlackSocialFetch = (
	url: string,
	init: RequestInit,
) => Promise<Response>;
export type SlackSocialResponse =
	| { readonly outcome: "accepted"; readonly payload: Record<string, unknown> }
	| (Exclude<GatewayDispatchResult, { outcome: "accepted" }> & {
			readonly retryAfterSeconds?: number;
	  });

/** Slack HTTP boundary: one request, safe classification, and no retry. */
export class SlackSocialClient {
	constructor(
		private readonly token: string,
		private readonly fetcher: SlackSocialFetch,
	) {}

	async post(
		method: "auth.test" | "chat.postMessage",
		body: Readonly<Record<string, string | boolean>>,
	): Promise<SlackSocialResponse> {
		let response: Response;
		try {
			response = await this.fetcher(`https://slack.com/api/${method}`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${this.token}`,
					"content-type": "application/json; charset=utf-8",
				},
				body: JSON.stringify(body),
				redirect: "error",
				signal: AbortSignal.timeout(15_000),
			});
		} catch {
			return { outcome: "uncertain", diagnosticCode: "unknown-provider-state" };
		}
		if (!response.ok) return this.httpFailure(response);
		let payload: unknown;
		try {
			payload = await response.json();
		} catch {
			return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		}
		if (
			typeof payload !== "object" ||
			payload === null ||
			Array.isArray(payload)
		)
			return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		const data = payload as Record<string, unknown>;
		if (data.ok === true) return { outcome: "accepted", payload: data };
		if (data.ok !== false)
			return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		return {
			...this.apiFailure(data.error),
			...(data.error === "ratelimited" ? this.retryAfter(response) : {}),
		};
	}

	private httpFailure(
		response: Response,
	): Exclude<SlackSocialResponse, { outcome: "accepted" }> {
		switch (response.status) {
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
				return {
					outcome: "deferred",
					diagnosticCode: "rate-limited",
					...this.retryAfter(response),
				};
			default:
				return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		}
	}

	private apiFailure(
		error: unknown,
	): Exclude<GatewayDispatchResult, { outcome: "accepted" }> {
		if (typeof error !== "string")
			return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
		if (
			[
				"invalid_auth",
				"not_authed",
				"account_inactive",
				"token_revoked",
				"token_expired",
				"not_allowed_token_type",
			].includes(error)
		)
			return { outcome: "rejected", diagnosticCode: "authentication-failed" };
		if (["channel_not_found", "not_in_channel", "is_archived"].includes(error))
			return { outcome: "rejected", diagnosticCode: "destination-unavailable" };
		if (
			[
				"missing_scope",
				"restricted_action",
				"no_permission",
				"team_access_not_granted",
				"access_denied",
				"ekm_access_denied",
			].includes(error)
		)
			return { outcome: "rejected", diagnosticCode: "permission-denied" };
		if (
			[
				"invalid_arguments",
				"invalid_arg_name",
				"msg_too_long",
				"no_text",
			].includes(error)
		)
			return { outcome: "rejected", diagnosticCode: "invalid-request" };
		if (error === "ratelimited")
			return { outcome: "deferred", diagnosticCode: "rate-limited" };
		// Slack documents that internal_error/fatal_error may follow an accepted write.
		return { outcome: "uncertain", diagnosticCode: "ambiguous-response" };
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

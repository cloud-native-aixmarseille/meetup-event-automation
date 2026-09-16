import type {
	GatewayDispatchResult,
	MailGateway,
	MailMessageIntent,
} from "@meetup-automation/communication";
import type { RepositoryDispatchClient } from "./github-repository-dispatch-mail-gateway-contracts.js";

export class GithubRepositoryDispatchMailGateway implements MailGateway {
	readonly #owner: string;
	readonly #repository: string;

	constructor(
		private readonly client: RepositoryDispatchClient,
		repository: string,
	) {
		const [owner, name, ...extra] = repository.split("/");
		if (!owner || !name || extra.length > 0) {
			throw new Error("Mailings repository must use owner/repository format");
		}
		this.#owner = owner;
		this.#repository = name;
	}

	async dispatch(message: MailMessageIntent): Promise<GatewayDispatchResult> {
		try {
			await this.client.createDispatchEvent({
				owner: this.#owner,
				repo: this.#repository,
				event_type: "send-transactional-email",
				client_payload: {
					"idempotency-key": message.idempotencyKey,
					"template-name": message.templateName,
					"to-email": message.recipient.email,
					placeholders: message.placeholders,
				},
			});
		} catch (error) {
			return GithubRepositoryDispatchMailGateway.classifyFailure(error);
		}
		return { outcome: "accepted" };
	}

	private static classifyFailure(error: unknown): GatewayDispatchResult {
		const status = GithubRepositoryDispatchMailGateway.responseStatus(error);
		if (GithubRepositoryDispatchMailGateway.isRateLimited(error, status)) {
			return { outcome: "deferred", diagnosticCode: "rate-limited" };
		}
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
			default:
				return {
					outcome: "uncertain",
					diagnosticCode: "unknown-provider-state",
				};
		}
	}

	private static responseStatus(error: unknown): number | undefined {
		if (!GithubRepositoryDispatchMailGateway.isRecord(error)) return undefined;
		const direct = Number(error.status);
		if (Number.isInteger(direct)) return direct;
		if (!GithubRepositoryDispatchMailGateway.isRecord(error.response))
			return undefined;
		const nested = Number(error.response.status);
		return Number.isInteger(nested) ? nested : undefined;
	}

	/**
	 * GitHub can report both primary and secondary rate limits as HTTP 403. Only
	 * documented response headers are inspected: exception messages and response
	 * bodies may contain request or recipient data and must not cross this adapter.
	 */
	private static isRateLimited(
		error: unknown,
		status: number | undefined,
	): boolean {
		if (status === 429) return true;
		if (status !== 403) return false;

		const retryAfter = GithubRepositoryDispatchMailGateway.responseHeader(
			error,
			"retry-after",
		);
		if (retryAfter !== undefined && /^\d+$/.test(retryAfter.trim())) {
			return true;
		}

		return (
			GithubRepositoryDispatchMailGateway.responseHeader(
				error,
				"x-ratelimit-remaining",
			)?.trim() === "0"
		);
	}

	private static responseHeader(
		error: unknown,
		name: string,
	): string | undefined {
		if (!GithubRepositoryDispatchMailGateway.isRecord(error)) return undefined;
		const response = GithubRepositoryDispatchMailGateway.isRecord(
			error.response,
		)
			? error.response
			: undefined;
		const headers = GithubRepositoryDispatchMailGateway.isRecord(
			response?.headers,
		)
			? response.headers
			: GithubRepositoryDispatchMailGateway.isRecord(error.headers)
				? error.headers
				: undefined;
		if (!headers) return undefined;

		const matchingKey = Object.keys(headers).find(
			(key) => key.toLowerCase() === name,
		);
		const value = matchingKey ? headers[matchingKey] : undefined;
		return typeof value === "string" || typeof value === "number"
			? String(value)
			: undefined;
	}

	private static isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null;
	}
}

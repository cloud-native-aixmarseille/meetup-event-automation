import { RuntimeInputError } from "./runtime-input-error.js";

const SAFE_ERROR_NAMES = new Set([
	"GoogleDriveAssetRepositoryError",
	"EventNotFoundError",
	"EventConcurrentModificationError",
	"GitHubEventRepositoryConfigurationError",
	"GitHubEventRepositoryScopeError",
	"GitHubEventRepositoryResponseError",
	"GitHubEventCommentRepositoryConfigurationError",
	"GitHubEventCommentRepositoryScopeError",
	"GitHubEventCommentRepositoryResponseError",
]);
const STANDARD_ERROR_NAMES = new Set([
	"Error",
	"TypeError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"URIError",
	"EvalError",
	"AggregateError",
	"AbortError",
	"TimeoutError",
]);
const NETWORK_ERROR_CODES = new Set([
	"ECONNRESET",
	"ECONNREFUSED",
	"ETIMEDOUT",
	"ENOTFOUND",
	"EAI_AGAIN",
	"EPIPE",
	"ENETUNREACH",
	"EHOSTUNREACH",
	"ERR_NETWORK",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT",
	"UND_ERR_SOCKET",
	"CERT_HAS_EXPIRED",
	"UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

/** Redacts failures before technical diagnostic and localized report presentation. */
export class ActionFailurePresenter {
	/** Never expose provider responses, input values, or contact data in failures. */
	publicErrorMessage(error: unknown): string {
		const details = [this.reason(error)];
		const seen = new Set<Error>();
		let current = error;
		while (current instanceof Error && !seen.has(current) && seen.size < 3) {
			seen.add(current);
			if (seen.size > 1) details.push(`cause=${this.reason(current)}`);
			details.push(...this.context(current));
			current = current.cause;
		}
		return details.join("; ");
	}
	private reason(error: unknown): string {
		if (
			error instanceof RuntimeInputError ||
			(error instanceof Error && SAFE_ERROR_NAMES.has(error.name))
		)
			return `${error.name}: ${error.message}`;
		if (!(error instanceof Error))
			return `thrown=${error === null ? "null" : typeof error}`;
		const name = STANDARD_ERROR_NAMES.has(error.name) ? error.name : "Error";
		return `error=${name} message=redacted`;
	}
	private context(error: Error): readonly string[] {
		const fields = error as Error & { code?: unknown; status?: unknown };
		const details: string[] = [];
		if (typeof fields.code === "string" && NETWORK_ERROR_CODES.has(fields.code))
			details.push(`code=${fields.code}`);
		if (
			typeof fields.status === "number" &&
			Number.isInteger(fields.status) &&
			fields.status >= 100 &&
			fields.status <= 599
		)
			details.push(`status=${fields.status}`);
		const locations = new Set<string>();
		for (const line of (error.stack ?? "").split("\n")) {
			if (!/^\s+at /.test(line)) continue;
			const match = line.match(
				/\/(actions\/(?:assets|communication|event|feedback|issue-form|organizer|publication|referential)\/[a-z-]+\/dist\/index\.js:\d+:\d+)\)?$/,
			);
			if (match) locations.add(`at=${match[1]}`);
			if (locations.size === 3) break;
		}
		return [...details, ...locations];
	}
}

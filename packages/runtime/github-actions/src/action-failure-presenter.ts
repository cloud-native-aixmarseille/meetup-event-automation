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

/** Redacts failures before technical diagnostic and localized report presentation. */
export class ActionFailurePresenter {
	/** Never expose provider responses, input values, or contact data in failures. */
	static publicErrorMessage(error: unknown): string {
		if (error instanceof Error && SAFE_ERROR_NAMES.has(error.name)) {
			return `${error.name}: ${error.message}`;
		}
		return "Unexpected technical failure.";
	}
}

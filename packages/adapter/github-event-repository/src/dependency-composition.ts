import {
	GitHubEventRepository,
	type GitHubEventRepositoryArguments,
} from "./github-event-repository.js";
import { GitHubIssueDocumentCodec } from "./github-issue-document-codec.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubEventRepositoryComposition {
	gitHubEventRepository(
		...args: GitHubEventRepositoryArguments
	): GitHubEventRepository {
		return new GitHubEventRepository(
			{ gitHubIssueDocumentCodec: this.gitHubIssueDocumentCodec() },
			...args,
		);
	}
	gitHubIssueDocumentCodec(): GitHubIssueDocumentCodec {
		return new GitHubIssueDocumentCodec();
	}
}

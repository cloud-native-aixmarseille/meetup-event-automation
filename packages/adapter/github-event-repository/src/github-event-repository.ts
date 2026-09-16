import type {
	EventDocument,
	EventDocumentPage,
	EventIdentity,
	EventListPageQuery,
	EventRepository,
	EventRepositoryPatch,
} from "@meetup-automation/event";
import { GitHubEventRepositoryConfigurationError } from "./github-event-repository-configuration-error.js";
import type {
	GitHubEventRepositoryClient,
	GitHubEventRepositoryOptions,
} from "./github-event-repository-contracts.js";
import { GitHubEventRepositoryResponseError } from "./github-event-repository-response-error.js";
import { GitHubEventRepositoryScopeError } from "./github-event-repository-scope-error.js";

export class GitHubEventRepository implements EventRepository {
	private readonly owner: string;
	private readonly repo: string;
	private readonly repositoryName: string;

	constructor(
		private readonly client: GitHubEventRepositoryClient,
		options: GitHubEventRepositoryOptions,
	) {
		this.owner = GitHubEventRepository.requireRepositoryPart(
			options.owner,
			"owner",
		);
		this.repo = GitHubEventRepository.requireRepositoryPart(
			options.repo,
			"repo",
		);
		this.repositoryName = `${this.owner}/${this.repo}`;
	}

	async find(identity: EventIdentity): Promise<EventDocument | null> {
		this.assertScope(identity.repository);

		try {
			const response = await this.client.rest.issues.get({
				owner: this.owner,
				repo: this.repo,
				issue_number: identity.issueNumber,
			});
			const document = GitHubEventRepository.mapGitHubIssueDocument(
				response.data,
				this.repositoryName,
			);
			if (document && document.identity.issueNumber !== identity.issueNumber) {
				throw new GitHubEventRepositoryResponseError(
					`GitHub returned issue ${document.identity.issueNumber} while ${identity.issueNumber} was requested`,
				);
			}
			return document;
		} catch (error) {
			if (GitHubEventRepository.isNotFoundError(error)) {
				return null;
			}
			throw error;
		}
	}

	async applyPatch(
		identity: EventIdentity,
		patch: EventRepositoryPatch,
	): Promise<void> {
		this.assertScope(identity.repository);
		const changes: {
			title?: string;
			body?: string;
			labels?: string[];
		} = {};
		if (patch.issueTitle !== undefined) {
			changes.title = patch.issueTitle;
		}
		if (patch.body !== undefined) {
			changes.body = patch.body;
		}
		if (patch.labels !== undefined) {
			changes.labels = [...patch.labels];
		}

		if (Object.keys(changes).length === 0) {
			return;
		}

		await this.client.rest.issues.update({
			owner: this.owner,
			repo: this.repo,
			issue_number: identity.issueNumber,
			...changes,
		});
	}

	async listPage(query: EventListPageQuery): Promise<EventDocumentPage> {
		this.assertScope(query.repository);
		const page = GitHubEventRepository.parseCursor(query.cursor);
		const pageSize = GitHubEventRepository.parsePageSize(query.pageSize);
		const parameters: {
			owner: string;
			repo: string;
			state: "open" | "all";
			labels?: string;
			page: number;
			per_page: number;
		} = {
			owner: this.owner,
			repo: this.repo,
			state: query.includeClosed ? "all" : "open",
			page,
			per_page: pageSize,
		};
		if (query.label !== undefined && query.label.trim() !== "") {
			parameters.labels = query.label.trim();
		}

		const response = await this.client.rest.issues.listForRepo(parameters);
		if (!Array.isArray(response.data)) {
			throw new GitHubEventRepositoryResponseError(
				"GitHub issue list response must contain an array",
			);
		}

		const items = response.data
			.map((issue) =>
				GitHubEventRepository.mapGitHubIssueDocument(
					issue,
					this.repositoryName,
				),
			)
			.filter((issue): issue is EventDocument => issue !== null);
		const linkHeader = GitHubEventRepository.readHeader(
			response.headers,
			"link",
		);
		const hasNextPage =
			linkHeader === undefined
				? response.data.length === pageSize
				: /<[^>]+>;\s*rel="next"/.test(linkHeader);

		return {
			items: Object.freeze(items),
			...(hasNextPage ? { nextCursor: String(page + 1) } : {}),
		};
	}

	private assertScope(repository: string): void {
		if (repository.toLowerCase() !== this.repositoryName.toLowerCase()) {
			throw new GitHubEventRepositoryScopeError(
				this.repositoryName,
				repository,
			);
		}
	}

	private static requireRepositoryPart(
		value: string,
		name: "owner" | "repo",
	): string {
		const normalized = value.trim();
		if (normalized === "" || normalized.includes("/")) {
			throw new GitHubEventRepositoryConfigurationError(
				`GitHub ${name} must be a non-empty repository name segment`,
			);
		}
		return normalized;
	}

	/** Map one GitHub issue response or webhook snapshot into the domain document. */
	static mapGitHubIssueDocument(
		data: unknown,
		repository: string,
	): EventDocument | null {
		const issue = GitHubEventRepository.asRecord(data, "GitHub issue");
		if (issue.pull_request !== undefined && issue.pull_request !== null) {
			return null;
		}
		if (!Number.isInteger(issue.number) || Number(issue.number) <= 0) {
			throw new GitHubEventRepositoryResponseError(
				"GitHub issue number must be a positive integer",
			);
		}
		if (typeof issue.title !== "string") {
			throw new GitHubEventRepositoryResponseError(
				"GitHub issue title must be a string",
			);
		}
		if (issue.state !== "open" && issue.state !== "closed") {
			throw new GitHubEventRepositoryResponseError(
				"GitHub issue state must be open or closed",
			);
		}
		if (issue.body !== null && typeof issue.body !== "string") {
			throw new GitHubEventRepositoryResponseError(
				"GitHub issue body must be a string or null",
			);
		}
		if (!Array.isArray(issue.labels)) {
			throw new GitHubEventRepositoryResponseError(
				"GitHub issue labels must be an array",
			);
		}

		return {
			identity: { repository, issueNumber: Number(issue.number) },
			issueState: issue.state,
			issueTitle: issue.title,
			labels: GitHubEventRepository.mapLabels(issue.labels),
			body: issue.body ?? "",
		};
	}

	private static mapLabels(labels: readonly unknown[]): readonly string[] {
		const result: string[] = [];
		for (const label of labels) {
			let name: string | undefined;
			if (typeof label === "string") {
				name = label;
			} else if (
				GitHubEventRepository.isRecord(label) &&
				typeof label.name === "string"
			) {
				name = label.name;
			}
			if (name && !result.includes(name)) {
				result.push(name);
			}
		}
		return Object.freeze(result);
	}

	private static parseCursor(cursor: string | undefined): number {
		if (cursor === undefined) {
			return 1;
		}
		if (!/^[1-9]\d*$/.test(cursor)) {
			throw new GitHubEventRepositoryConfigurationError(
				`Invalid GitHub pagination cursor "${cursor}"`,
			);
		}
		return Number(cursor);
	}

	private static parsePageSize(pageSize: number | undefined): number {
		if (pageSize === undefined) {
			return 100;
		}
		if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
			throw new GitHubEventRepositoryConfigurationError(
				"GitHub page size must be an integer between 1 and 100",
			);
		}
		return pageSize;
	}

	private static isNotFoundError(error: unknown): boolean {
		if (!GitHubEventRepository.isRecord(error)) {
			return false;
		}
		if (error.status === 404) {
			return true;
		}
		return (
			GitHubEventRepository.isRecord(error.response) &&
			error.response.status === 404
		);
	}

	private static readHeader(
		headers: Readonly<Record<string, unknown>> | undefined,
		name: string,
	): string | undefined {
		const value = headers?.[name];
		return typeof value === "string" ? value : undefined;
	}

	private static asRecord(
		value: unknown,
		label: string,
	): Record<string, unknown> {
		if (!GitHubEventRepository.isRecord(value)) {
			throw new GitHubEventRepositoryResponseError(
				`${label} must be an object`,
			);
		}
		return value;
	}

	private static isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null;
	}
}

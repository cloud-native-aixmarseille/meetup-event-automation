import type { EventDocument } from "@meetup-automation/event";
import { GitHubEventRepositoryResponseError } from "./github-event-repository-response-error.js";

export class GitHubIssueDocumentCodec {
	/** Map one GitHub issue response or webhook snapshot into the domain document. */
	decode(data: unknown, repository: string): EventDocument | null {
		const issue = this.asRecord(data, "GitHub issue");
		if (issue.pull_request !== undefined && issue.pull_request !== null) {
			return null;
		}
		if (!Number.isSafeInteger(issue.number) || Number(issue.number) <= 0) {
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
			labels: this.mapLabels(issue.labels),
			body: issue.body ?? "",
		};
	}

	private mapLabels(labels: readonly unknown[]): readonly string[] {
		const result: string[] = [];
		for (const label of labels) {
			let name: string | undefined;
			if (typeof label === "string") {
				name = label;
			} else if (this.isRecord(label) && typeof label.name === "string") {
				name = label.name;
			}
			if (name && !result.includes(name)) {
				result.push(name);
			}
		}
		return Object.freeze(result);
	}

	private asRecord(value: unknown, label: string): Record<string, unknown> {
		if (!this.isRecord(value)) {
			throw new GitHubEventRepositoryResponseError(
				`${label} must be an object`,
			);
		}
		return value;
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
}

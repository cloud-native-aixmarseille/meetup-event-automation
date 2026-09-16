import { describe, expect, it, vi } from "vitest";
import { GitHubEventRepository } from "./github-event-repository.js";
import { GitHubEventRepositoryConfigurationError } from "./github-event-repository-configuration-error.js";
import type { GitHubEventRepositoryClient } from "./github-event-repository-contracts.js";
import { GitHubEventRepositoryResponseError } from "./github-event-repository-response-error.js";
import { GitHubEventRepositoryScopeError } from "./github-event-repository-scope-error.js";

const repositoryName = "cloud-native-aixmarseille/meetups";

const identity = { repository: repositoryName, issueNumber: 42 } as const;

function issue(overrides: Record<string, unknown> = {}) {
	return {
		number: 42,
		title: "Meetup issue",
		body: "Issue body",
		state: "open",
		labels: ["meetup"],
		...overrides,
	};
}

function client() {
	const get = vi.fn();
	const update = vi.fn();
	const listForRepo = vi.fn();
	return {
		get,
		update,
		listForRepo,
		value: {
			rest: { issues: { get, update, listForRepo } },
		} as GitHubEventRepositoryClient,
	};
}

function adapter(github: GitHubEventRepositoryClient) {
	return new GitHubEventRepository(github, {
		owner: "cloud-native-aixmarseille",
		repo: "meetups",
	});
}

describe("GitHubEventRepository.find", () => {
	it("maps an SDK response to a neutral document", async () => {
		// Arrange
		const github = client();
		github.get.mockResolvedValue({
			data: issue({
				body: null,
				state: "closed",
				labels: [
					"meetup",
					{ name: "hoster:confirmed", color: "fff" },
					{ name: null },
					"meetup",
				],
			}),
		});

		// Act
		const actual = await adapter(github.value).find(identity);

		// Assert
		expect(actual).toEqual({
			identity,
			issueState: "closed",
			issueTitle: "Meetup issue",
			labels: ["meetup", "hoster:confirmed"],
			body: "",
		});
		expect(github.get).toHaveBeenCalledWith({
			owner: "cloud-native-aixmarseille",
			repo: "meetups",
			issue_number: 42,
		});
	});

	it("does not expose pull requests as event documents", async () => {
		// Arrange
		const github = client();
		github.get.mockResolvedValue({
			data: issue({ pull_request: { url: "x" } }),
		});

		// Act
		const actual = await adapter(github.value).find(identity);

		// Assert
		expect(actual).toBeNull();
	});

	it.each([{ status: 404 }, { response: { status: 404 } }])(
		"classifies a not-found response as an absent event",
		async (error) => {
			// Arrange
			const github = client();
			github.get.mockRejectedValue(error);

			// Act
			const actual = await adapter(github.value).find(identity);

			// Assert
			expect(actual).toBeNull();
		},
	);

	it("does not hide other GitHub failures", async () => {
		// Arrange
		const github = client();
		const failure = Object.assign(new Error("rate limited"), { status: 429 });
		github.get.mockRejectedValue(failure);

		// Act
		const operation = adapter(github.value).find(identity);

		// Assert
		await expect(operation).rejects.toBe(failure);
	});

	it("does not classify primitive failures as not-found", async () => {
		// Arrange
		const github = client();
		github.get.mockRejectedValue("network failure");

		// Act
		const operation = adapter(github.value).find(identity);

		// Assert
		await expect(operation).rejects.toBe("network failure");
	});

	it("rejects a response for a different issue number", async () => {
		// Arrange
		const github = client();
		github.get.mockResolvedValue({ data: issue({ number: 43 }) });

		// Act
		const operation = adapter(github.value).find(identity);

		// Assert
		await expect(operation).rejects.toEqual(
			new GitHubEventRepositoryResponseError(
				"GitHub returned issue 43 while 42 was requested",
			),
		);
	});

	it("rejects malformed GitHub issue data", async () => {
		// Arrange
		const github = client();
		github.get.mockResolvedValue({ data: issue({ labels: "meetup" }) });

		// Act
		const operation = adapter(github.value).find(identity);

		// Assert
		await expect(operation).rejects.toEqual(
			new GitHubEventRepositoryResponseError(
				"GitHub issue labels must be an array",
			),
		);
	});

	it.each([
		[null, "GitHub issue must be an object"],
		[issue({ number: 0 }), "GitHub issue number must be a positive integer"],
		[issue({ title: null }), "GitHub issue title must be a string"],
		[issue({ state: "merged" }), "GitHub issue state must be open or closed"],
		[issue({ body: 42 }), "GitHub issue body must be a string or null"],
	] as const)("rejects malformed issue response %#", async (data, message) => {
		// Arrange
		const github = client();
		github.get.mockResolvedValue({ data });

		// Act
		const operation = adapter(github.value).find(identity);

		// Assert
		await expect(operation).rejects.toEqual(
			new GitHubEventRepositoryResponseError(message),
		);
	});
});

describe("GitHubEventRepository.applyPatch", () => {
	it("sends only fields present in a minimal patch", async () => {
		// Arrange
		const github = client();
		github.update.mockResolvedValue({ data: {} });

		// Act
		await adapter(github.value).applyPatch(identity, {
			body: "Updated body",
		});

		// Assert
		expect(github.update).toHaveBeenCalledWith({
			owner: "cloud-native-aixmarseille",
			repo: "meetups",
			issue_number: 42,
			body: "Updated body",
		});
	});

	it("does not call GitHub for an empty patch", async () => {
		// Arrange
		const github = client();

		// Act
		await adapter(github.value).applyPatch(identity, {});

		// Assert
		expect(github.update).not.toHaveBeenCalled();
	});

	it("maps title and labels without retaining caller-owned arrays", async () => {
		// Arrange
		const github = client();
		github.update.mockResolvedValue({ data: {} });
		const labels = ["meetup", "hoster:confirmed"];

		// Act
		await adapter(github.value).applyPatch(identity, {
			issueTitle: "Updated title",
			labels,
		});
		labels.push("changed-after-call");

		// Assert
		expect(github.update).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Updated title",
				labels: ["meetup", "hoster:confirmed"],
			}),
		);
	});
});

describe("GitHubEventRepository.listPage", () => {
	it("uses the opaque page cursor, maps labels, excludes PRs, and follows Link", async () => {
		// Arrange
		const github = client();
		github.listForRepo.mockResolvedValue({
			data: [
				issue({ number: 51, labels: [{ name: "meetup" }] }),
				issue({ number: 52, pull_request: { url: "x" } }),
			],
			headers: {
				link: '<https://api.github.test/issues?page=4>; rel="next", <https://api.github.test/issues?page=8>; rel="last"',
			},
		});

		// Act
		const result = await adapter(github.value).listPage({
			repository: repositoryName,
			label: "meetup",
			includeClosed: true,
			pageSize: 2,
			cursor: "3",
		});
		const actual = result.items.map((item) => item.identity.issueNumber);

		// Assert
		expect(github.listForRepo).toHaveBeenCalledWith({
			owner: "cloud-native-aixmarseille",
			repo: "meetups",
			state: "all",
			labels: "meetup",
			page: 3,
			per_page: 2,
		});
		expect(actual).toEqual([51]);
		expect(result.items[0]?.labels).toEqual(["meetup"]);
		expect(result.nextCursor).toBe("4");
	});

	it("infers a next page from a full response only when Link is absent", async () => {
		// Arrange
		const github = client();
		github.listForRepo.mockResolvedValueOnce({
			data: [issue({ number: 1 }), issue({ number: 2 })],
		});
		github.listForRepo.mockResolvedValueOnce({
			data: [issue({ number: 1 }), issue({ number: 2 })],
			headers: { link: "" },
		});
		const repository = adapter(github.value);

		// Act
		const actual = await repository.listPage({
			repository: repositoryName,
			pageSize: 2,
		});
		const actual1 = await repository.listPage({
			repository: repositoryName,
			pageSize: 2,
		});

		// Assert
		expect(actual).toHaveProperty("nextCursor", "2");
		expect(actual1).not.toHaveProperty("nextCursor");
	});

	it.each(["0", "abc", "1.5"])("rejects invalid cursor %s", async (cursor) => {
		// Arrange
		const github = client();

		// Act
		const operation = adapter(github.value).listPage({
			repository: repositoryName,
			cursor,
		});

		// Assert
		await expect(operation).rejects.toBeInstanceOf(
			GitHubEventRepositoryConfigurationError,
		);
	});

	it("rejects invalid page sizes and repository scope", async () => {
		// Arrange
		const github = client();
		const repository = adapter(github.value);

		// Act
		const operation = repository.listPage({
			repository: repositoryName,
			pageSize: 101,
		});
		const operation1 = repository.listPage({ repository: "someone/else" });

		// Assert
		await expect(operation).rejects.toBeInstanceOf(
			GitHubEventRepositoryConfigurationError,
		);
		await expect(operation1).rejects.toBeInstanceOf(
			GitHubEventRepositoryScopeError,
		);
	});

	it("rejects a malformed list response using default pagination", async () => {
		// Arrange
		const github = client();
		github.listForRepo.mockResolvedValue({ data: {} });

		// Act
		const operation = adapter(github.value).listPage({
			repository: repositoryName,
			label: "  meetup  ",
		});

		// Assert
		await expect(operation).rejects.toEqual(
			new GitHubEventRepositoryResponseError(
				"GitHub issue list response must contain an array",
			),
		);
		expect(github.listForRepo).toHaveBeenCalledWith(
			expect.objectContaining({
				labels: "meetup",
				page: 1,
				per_page: 100,
			}),
		);
	});

	it("validates configured owner and repository segments", () => {
		// Arrange
		const github = client();

		// Act
		const act = () =>
			new GitHubEventRepository(github.value, {
				owner: "cloud-native-aixmarseille/team",
				repo: "meetups",
			});

		// Assert
		expect(act).toThrow(GitHubEventRepositoryConfigurationError);
	});
});

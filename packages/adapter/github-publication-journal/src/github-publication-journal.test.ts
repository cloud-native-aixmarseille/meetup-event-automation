import { describe, expect, it, vi } from "vitest";
import { GithubPublicationJournal } from "./github-publication-journal.js";

function fixture(
	initial: { id: number; body: string; user: { login: string } }[] = [],
) {
	const comments = [...initial];
	const issues = {
		listComments: vi
			.fn()
			.mockImplementation(async () => ({ data: comments, headers: {} })),
		createComment: vi.fn().mockImplementation(async ({ body }) => {
			comments.push({
				id: comments.length + 1,
				body,
				user: { login: "organizer[bot]" },
			});
		}),
		updateComment: vi.fn().mockImplementation(async ({ comment_id, body }) => {
			const comment = comments.find((item) => item.id === comment_id);
			if (comment) comment.body = body;
		}),
	};
	const journal = new GithubPublicationJournal(
		{ rest: { issues } },
		{
			owner: "example",
			repo: "events",
			issue_number: 42,
		},
		"organizer[bot]",
	);
	return { journal, issues, comments };
}

describe("GitHub publication journal", () => {
	it("persists a reservation and remote identity across new instances", async () => {
		// Arrange
		const { journal, comments, issues } = fixture();
		const url = "https://www.meetup.com/example/events/123/";

		// Act
		await journal.reserve();
		const pending = await fixture(comments).journal.load();
		await journal.record(url);
		const saved = await fixture(comments).journal.load();

		// Assert
		expect(pending).toEqual({});
		expect(saved).toEqual({ url });
		expect(issues.createComment).toHaveBeenCalledTimes(1);
		expect(issues.updateComment).toHaveBeenCalledTimes(1);
		expect(comments[0]?.body).toContain('"state":"saved"');
	});

	it("ignores forged markers from other authors", async () => {
		// Arrange
		const { journal } = fixture([
			{
				id: 1,
				user: { login: "someone" },
				body: '<!-- meetup-publication:v1\n{"state":"pending"}\n-->',
			},
		]);

		// Act
		const result = await journal.load();

		// Assert
		expect(result).toBeUndefined();
	});

	it.each(["saved", "published"])(
		"recovers the identity from a %s journal without authorizing publication",
		async (state) => {
			// Arrange
			const url = "https://www.meetup.com/example/events/123/";
			const { journal } = fixture([
				{
					id: 1,
					user: { login: "organizer[bot]" },
					body: `<!-- meetup-publication:v1\n${JSON.stringify({ state, url })}\n-->`,
				},
			]);

			// Act
			const record = await journal.load();

			// Assert
			expect(record).toEqual({ url });
		},
	);

	it.each([
		"corrupted",
		'{"state":"unexpected"}',
		'{"state":"published","url":12}',
		"null",
	])("rejects corrupted state %s", async (value) => {
		// Arrange
		const { journal } = fixture([
			{
				id: 1,
				user: { login: "organizer[bot]" },
				body: `<!-- meetup-publication:v1\n${value}\n-->`,
			},
		]);

		// Act
		const result = journal.load();

		// Assert
		await expect(result).rejects.toThrow();
	});

	it("refuses a second reservation", async () => {
		// Arrange
		const { journal, issues } = fixture();
		await journal.reserve();

		// Act
		const result = journal.reserve();

		// Assert
		await expect(result).rejects.toThrow("already reserved");
		expect(issues.createComment).toHaveBeenCalledTimes(1);
	});

	it("does not replace an established remote identity", async () => {
		// Arrange
		const { journal } = fixture();
		await journal.record("https://www.meetup.com/example/events/123/");

		// Act
		const result = journal.record("https://www.meetup.com/example/events/456/");

		// Assert
		await expect(result).rejects.toThrow("identity conflict");
	});

	it("checks every page and fails closed when several trusted journals exist", async () => {
		// Arrange
		const { journal, issues } = fixture();
		const comment = {
			id: 1,
			user: { login: "organizer[bot]" },
			body: '<!-- meetup-publication:v1\n{"state":"pending"}\n-->',
		};
		issues.listComments
			.mockResolvedValueOnce({
				data: [comment],
				headers: { link: '<https://api.github.com/next>; rel="next"' },
			})
			.mockResolvedValueOnce({ data: [{ ...comment, id: 2 }], headers: {} });

		// Act
		const result = journal.load();

		// Assert
		await expect(result).rejects.toThrow("Multiple");
		expect(issues.listComments).toHaveBeenLastCalledWith(
			expect.objectContaining({ page: 2 }),
		);
	});
});

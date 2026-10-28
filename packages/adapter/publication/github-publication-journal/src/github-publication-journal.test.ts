import { describe, expect, it, vi } from "vitest";
import { GithubPublicationJournalComposition } from "./dependency-composition.js";
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
		{
			publicationCommentCodec:
				new GithubPublicationJournalComposition().publicationCommentCodec(),
		},
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
	it("preserves the event and cover identities across journal updates", async () => {
		// Arrange
		const { journal, comments } = fixture();
		const cover = {
			groupUrl: "https://www.meetup.com/example/",
			fingerprint: "a".repeat(64),
		};
		const url = "https://www.meetup.com/example/events/123/";
		// Act
		await journal.reserve();
		await journal.reserveCover(cover);
		await journal.recordCover({ ...cover, photoId: "456" });
		await journal.record({ id: "123", reviewUrl: url, publicUrl: url });
		const recovered = fixture(comments).journal;
		const event = await recovered.load();
		const photo = await recovered.readCover();
		// Assert
		expect(event?.identity?.id).toBe("123");
		expect(photo).toEqual({ ...cover, photoId: "456" });
	});

	it("does not overwrite an uncertain upload with another reservation", async () => {
		// Arrange
		const { journal, issues } = fixture();
		const cover = {
			groupUrl: "https://www.meetup.com/example/",
			fingerprint: "a".repeat(64),
		};
		await journal.reserve();
		await journal.reserveCover(cover);
		// Act
		const result = journal.reserveCover({
			...cover,
			fingerprint: "b".repeat(64),
		});
		// Assert
		await expect(result).rejects.toThrow("already reserved");
		expect(issues.updateComment).toHaveBeenCalledTimes(1);
	});

	it("retains the event identity when replacing confirmed artwork", async () => {
		// Arrange
		const { journal } = fixture();
		const cover = {
			groupUrl: "https://www.meetup.com/example/",
			fingerprint: "a".repeat(64),
		};
		const url = "https://www.meetup.com/example/events/123/";
		await journal.record({ id: "123", reviewUrl: url, publicUrl: url });
		await journal.reserveCover(cover);
		await journal.recordCover({ ...cover, photoId: "456" });
		// Act
		await journal.reserveCover({ ...cover, fingerprint: "b".repeat(64) });
		const event = await journal.load();
		// Assert
		expect(event?.identity?.reviewUrl).toBe(url);
		expect(await journal.readCover()).toEqual({
			...cover,
			fingerprint: "b".repeat(64),
		});
	});

	it.each(["different-fingerprint", "different-photo"])(
		"rejects conflicting confirmation: %s",
		async (conflict) => {
			// Arrange
			const { journal } = fixture();
			const cover = {
				groupUrl: "https://www.meetup.com/example/",
				fingerprint: "a".repeat(64),
				photoId: "456",
			};
			await journal.reserve();
			await journal.reserveCover({
				groupUrl: cover.groupUrl,
				fingerprint: cover.fingerprint,
			});
			await journal.recordCover(cover);
			// Act
			const result = journal.recordCover({
				...cover,
				...(conflict === "different-photo"
					? { photoId: "789" }
					: { fingerprint: "b".repeat(64) }),
			});
			// Assert
			await expect(result).rejects.toThrow("identity conflict");
		},
	);
	it("persists a reservation and remote identity across new instances", async () => {
		// Arrange
		const { journal, comments, issues } = fixture();
		const url = "https://www.meetup.com/example/events/123/";

		// Act
		await journal.reserve();
		const pending = await fixture(comments).journal.load();
		await journal.record({ id: "123", reviewUrl: url, publicUrl: url });
		const saved = await fixture(comments).journal.load();

		// Assert
		expect(pending).toEqual({});
		expect(saved).toEqual({
			identity: { id: "123", reviewUrl: url, publicUrl: url },
		});
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
			expect(record).toEqual({
				identity: { id: "123", reviewUrl: url, publicUrl: url },
			});
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
		const url = "https://www.meetup.com/example/events/123/";
		await journal.record({ id: "123", reviewUrl: url, publicUrl: url });

		// Act
		const other = "https://www.meetup.com/example/events/456/";
		const result = journal.record({
			id: "456",
			reviewUrl: other,
			publicUrl: other,
		});

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

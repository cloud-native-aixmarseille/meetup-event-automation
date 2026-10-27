import { describe, expect, it } from "vitest";
import { journalClientFixture } from "../testing/journal-client.fixtures.js";
import {
	SOCIAL_JOURNAL_MARKER,
	TrustedSocialJournalComments,
} from "./trusted-social-journal-comments.js";

describe("trusted social delivery history", () => {
	it("reads bot-owned records while ignoring organizer and other bot comments", async () => {
		// Arrange
		const f = journalClientFixture();
		await f.client.create(`${SOCIAL_JOURNAL_MARKER}{} -->`);
		f.comments.push(
			{
				id: 2,
				body: `${SOCIAL_JOURNAL_MARKER}{} -->`,
				user: { login: "organizer", type: "User" },
			},
			{
				id: 3,
				body: `${SOCIAL_JOURNAL_MARKER}{} -->`,
				user: { login: "other[bot]", type: "Bot" },
			},
		);

		// Act
		const records = await f.trusted.list();

		// Assert
		expect(records.map((record) => record.id)).toEqual([1]);
		expect(f.client.edit).toHaveBeenCalledTimes(1);
	});
	it("accepts a bot update with intact bot-owned history", async () => {
		// Arrange
		const f = journalClientFixture();
		const body = `${SOCIAL_JOURNAL_MARKER}{} -->`;
		await f.client.create(body);
		await f.client.replace(
			1,
			body,
			`${SOCIAL_JOURNAL_MARKER}{"next":true} -->`,
		);

		// Act
		const records = await f.trusted.list();

		// Assert
		expect(records).toHaveLength(1);
	});
	it("blocks an organizer edit that removes the delivery marker", async () => {
		// Arrange
		const f = journalClientFixture();
		const body = `${SOCIAL_JOURNAL_MARKER}{} -->`;
		await f.client.create(body);
		await f.client.replace(1, body, "Removed delivery record");
		const edit = f.edits.get(1);
		if (!edit) throw new Error("Missing synthetic edit");
		f.edits.set(1, {
			...edit,
			editor: { login: "organizer", __typename: "User" },
		});

		// Act
		const load = f.trusted.list();

		// Assert
		await expect(load).rejects.toThrow("edited outside automation");
	});
	it.each([null, "2026-10-20T13:00:00Z"])(
		"blocks hidden or deleted earlier record history (%s)",
		async (deletedAt) => {
			// Arrange
			const f = journalClientFixture();
			const body = `${SOCIAL_JOURNAL_MARKER}{} -->`;
			await f.client.create(body);
			await f.client.replace(1, body, body);
			f.histories.set(1, [
				{
					diff: null,
					deletedAt,
					editor: { login: "automation", __typename: "Bot" },
				},
			]);

			// Act
			const load = f.trusted.list();

			// Assert
			await expect(load).rejects.toThrow("history is unavailable");
		},
	);
	it("blocks an edited record when its edit history is missing", async () => {
		// Arrange
		const f = journalClientFixture();
		const body = `${SOCIAL_JOURNAL_MARKER}{} -->`;
		await f.client.create(body);
		await f.client.replace(1, body, body);
		f.histories.set(1, []);

		// Act
		const load = f.trusted.list();

		// Assert
		await expect(load).rejects.toThrow("history is unavailable");
	});
	it("blocks concurrent edits between comment enumeration and editor inspection", async () => {
		// Arrange
		const f = journalClientFixture();
		await f.client.create(`${SOCIAL_JOURNAL_MARKER}{} -->`);
		f.comments[0] = { ...f.comments[0], body: "Changed" };

		// Act
		const load = f.trusted.list();

		// Assert
		await expect(load).rejects.toThrow("changed during verification");
	});
	it("rejects user-owned storage identities", () => {
		// Arrange
		const f = journalClientFixture();

		// Act
		const construct = () =>
			new TrustedSocialJournalComments(f.client, "organizer");

		// Assert
		expect(construct).toThrow("trusted GitHub App bot");
	});
});

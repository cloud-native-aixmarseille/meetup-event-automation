import { describe, expect, it } from "vitest";
import { automationStateFixture } from "../testing/state.fixtures.js";
import { StateEditAuthority } from "./state-edit-authority.js";

describe("publication recovery authority", () => {
	it.each(["meetup", "community"] as const)(
		"allows an authorized maintainer to recover only the %s journal",
		async (scope) => {
			// Arrange
			const f = automationStateFixture();
			const before = {
				...f.codec.empty(),
				records: {
					...f.codec.empty().records,
					content: ["<!-- meetup-content-proposal:v1 {} -->"],
					social: ["<!-- meetup-social-delivery:v1 {} -->"],
				},
			};
			const after = {
				...before,
				records: {
					...before.records,
					[scope]: [
						`<!-- ${scope === "meetup" ? "meetup" : "community"}-publication:v1\n{"state":"pending"}\n-->`,
					],
				},
			};
			const original = `${f.codec.write(before)}\n\nState`;
			const updated = `${f.codec.write(after)}\n\nState`;
			const editor = { login: "maintainer", __typename: "User" };
			const history = [
				{ diff: updated, editor, deletedAt: null },
				{
					diff: original,
					editor: { login: "automation", __typename: "Bot" },
					deletedAt: null,
				},
			];
			// Act
			await f.authority.verify(
				{
					id: "comment-1",
					body: updated,
					editor,
					lastEditedAt: "2026-01-01T12:00:00Z",
				},
				history,
			);
			// Assert
			expect(f.authority).toBeInstanceOf(StateEditAuthority);
			expect(f.client.canApprove).toHaveBeenCalledWith("maintainer");
		},
	);
	it.each(["content", "social", "imports"] as const)(
		"rejects a maintainer changing protected %s state",
		async (scope) => {
			// Arrange
			const f = automationStateFixture();
			const before = f.codec.empty();
			const after =
				scope === "imports"
					? { ...before, imports: [{ id: 1, digest: "a".repeat(64) }] }
					: {
							...before,
							records: {
								...before.records,
								[scope]: [
									`<!-- meetup-${scope === "content" ? "content-proposal" : "social-delivery"}:v1 {} -->`,
								],
							},
						};
			const original = `${f.codec.write(before)}\n\nState`;
			const updated = `${f.codec.write(after)}\n\nState`;
			const editor = { login: "maintainer", __typename: "User" };
			const history = [
				{ diff: updated, editor, deletedAt: null },
				{
					diff: original,
					editor: { login: "automation", __typename: "Bot" },
					deletedAt: null,
				},
			];
			// Act
			const verify = f.authority.verify(
				{
					id: "comment-1",
					body: updated,
					editor,
					lastEditedAt: "2026-01-01T12:00:00Z",
				},
				history,
			);
			// Assert
			await expect(verify).rejects.toThrow("edited outside automation");
		},
	);
	it("rejects publication recovery by an account without write access", async () => {
		// Arrange
		const f = automationStateFixture();
		f.client.canApprove.mockResolvedValue(false);
		const original = '<!-- meetup-publication:v1\n{"state":"pending"}\n-->';
		const updated =
			'<!-- meetup-publication:v1\n{"state":"saved","url":"https://example.test/event"}\n-->';
		const editor = { login: "reader", __typename: "User" };
		// Act
		const verify = f.authority.verify(
			{
				id: "comment-1",
				body: updated,
				editor,
				lastEditedAt: "2026-01-01T12:00:00Z",
			},
			[
				{ diff: updated, editor, deletedAt: null },
				{
					diff: original,
					editor: { login: "automation", __typename: "Bot" },
					deletedAt: null,
				},
			],
		);
		// Assert
		await expect(verify).rejects.toThrow("edited outside automation");
	});
	it("retains publication recovery confirmed by the bot after the maintainer loses access", async () => {
		// Arrange
		const f = automationStateFixture();
		f.client.canApprove.mockResolvedValue(false);
		const original = '<!-- community-publication:v1\n{"state":"pending"}\n-->';
		const recovered = '<!-- community-publication:v1\n{"state":"saved"}\n-->';
		const state = {
			...f.codec.empty(),
			records: { ...f.codec.empty().records, community: [recovered] },
		};
		const body = `${f.codec.write(state)}\n\nState`;
		const bot = { login: "automation", __typename: "Bot" };
		// Act
		await f.authority.verify(
			{
				id: "comment-1",
				body,
				editor: bot,
				lastEditedAt: "2026-01-01T12:00:00Z",
			},
			[
				{ diff: body, editor: bot, deletedAt: null },
				{
					diff: recovered,
					editor: { login: "maintainer", __typename: "User" },
					deletedAt: null,
				},
				{ diff: original, editor: bot, deletedAt: null },
			],
		);
		// Assert
		expect(f.client.canApprove).not.toHaveBeenCalled();
	});
});

import { describe, expect, it } from "vitest";
import { fixture, state } from "../testing/attention.fixtures.js";
import { AttentionCommentRetention } from "./attention-comment-retention.js";
import { AttentionRecord } from "./attention-record.js";

describe("trusted attention metadata retention", () => {
	it("recovers bot authority instead of endorsing human edits during diagnostic updates", async () => {
		// Arrange
		const f = fixture();
		const original = f.presenter.issue(
			state(),
			AttentionRecord.marker(state()),
		);
		await f.client.create(original);
		const forged = f.presenter.issue(
			{ ...state(), post: undefined },
			AttentionRecord.marker({ ...state(), post: undefined }),
		);
		f.comments[0] = { ...f.comments[0], body: forged };
		f.edits.set("node-100", {
			id: "node-100",
			body: forged,
			lastEditedAt: "2099-06-02T10:00:00Z",
			editor: { login: "writer", __typename: "User" },
		});
		f.histories.set("node-100", [
			{
				diff: original,
				deletedAt: null,
				editor: { login: "automation", __typename: "Bot" },
			},
		]);
		const retention = new AttentionCommentRetention(
			f.api,
			"example",
			"meetups",
			"automation[bot]",
		);

		// Act
		const retained = await retention.load(42, 100, forged);
		const retainedAttention = AttentionRecord.read(retained);

		// Assert
		expect(retainedAttention.post?.status).toBe("pending");
		expect(f.update).not.toHaveBeenCalled();
	});
	it("refuses retention when the comment has changed since the diagnostic read", async () => {
		// Arrange
		const f = fixture();
		await f.client.create(
			f.presenter.issue(state(), AttentionRecord.marker(state())),
		);
		const retention = new AttentionCommentRetention(
			f.api,
			"example",
			"meetups",
			"automation[bot]",
		);

		// Act
		const retained = retention.load(42, 100, "outdated body");

		// Assert
		await expect(retained).rejects.toThrow("changed before persistence");
	});
});

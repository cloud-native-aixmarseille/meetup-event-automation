import { describe, expect, it } from "vitest";
import { fixture } from "../testing/approval.fixtures.js";
import { contentRequest } from "../testing/content.fixtures.js";

describe("approval attention", () => {
	it("resolves historical decisions while keeping the latest pending proposal visible", async () => {
		// Arrange
		const f = fixture();
		const completed = f.records.create(contentRequest);
		completed.decision = {
			status: "approved",
			actor: "organizer",
			decidedAt: contentRequest.requestedAt,
		};
		const original = await f.repository.save(completed);
		const latest = await f.repository.save(
			f.records.create({
				...contentRequest,
				revision: "d".repeat(64),
				content: {
					...contentRequest.content,
					key: "content-00000000-0000-4000-8000-000000000002",
				},
			}),
		);

		// Act
		const attention = await f.attention.synchronizeApprovals();
		const history = await f.repository.states();

		// Assert
		expect(f.visibility.synchronize).toHaveBeenCalledWith(
			original.comment.id,
			expect.any(String),
			true,
		);
		expect(f.visibility.synchronize).toHaveBeenCalledWith(
			latest.comment.id,
			expect.any(String),
			false,
		);
		expect(attention).toEqual([
			expect.objectContaining({
				commentId: latest.comment.id,
				status: "pending",
			}),
		]);
		expect(history).toHaveLength(2);
		expect(history[0]?.record.decision).toEqual(completed.decision);
	});
	it("retains content history while exposing only the newest request per target", async () => {
		// Arrange
		const f = fixture();
		await f.repository.save(f.records.create(contentRequest));
		const latest = await f.repository.save(
			f.records.create({
				...contentRequest,
				revision: "d".repeat(64),
				content: {
					...contentRequest.content,
					key: "content-00000000-0000-4000-8000-000000000002",
				},
			}),
		);
		// Act
		const attention = await f.attention.synchronizeApprovals();
		const history = await f.repository.states();
		// Assert
		expect(attention).toEqual([
			expect.objectContaining({
				commentId: latest.comment.id,
				revision: latest.record.revision,
				status: "pending",
			}),
		]);
		expect(history).toHaveLength(2);
	});
});

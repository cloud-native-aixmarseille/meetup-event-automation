import { emailReviewFor } from "../testing/email-review.fixtures.js";
import { OrganizerCommentChangedError } from "@meetup-automation/journey";
import { describe, expect, it, vi } from "vitest";
import {
	createStoredApproval,
	decision,
	fixture,
	request,
} from "../testing/approval.fixtures.js";
import type { GithubApprovalRepository } from "./github-approval-repository.js";

describe("approval snapshot retries", () => {
	it.each(["editors", "history"] as const)(
		"rebuilds every snapshot after a change during %s",
		async (phase) => {
			// Arrange
			const f = fixture();
			const repository: GithubApprovalRepository = f.repository;
			await repository.save(createStoredApproval(request));
			decision(f, {}, "approved");
			if (phase === "editors") {
				const original = f.client.edits.bind(f.client);
				vi.spyOn(f.client, "edits").mockImplementationOnce(async (comments) => {
					decision(f, {}, "rejected");
					return original(comments);
				});
			} else {
				const original = f.client.history.bind(f.client);
				vi.spyOn(f.client, "history").mockImplementationOnce(
					async (comment) => {
						decision(f, {}, "rejected");
						return original(comment);
					},
				);
			}

			// Act
			const states = await repository.states();

			// Assert
			expect(f.list).toHaveBeenCalledTimes(2);
			expect(states).toHaveLength(1);
			expect(states[0]?.comment.body).toBe(f.comments[0]?.body);
			expect(states[0]?.comment.body).toContain("- [x] ❌ Reject sending");
			expect(states[0]?.record.decision).toBeUndefined();
			expect(f.update).not.toHaveBeenCalled();
			expect(f.permission).not.toHaveBeenCalled();
		},
	);

	it("stops after three full reads when comments keep changing", async () => {
		// Arrange
		const f = fixture();
		await f.repository.save(createStoredApproval(request));
		const original = f.client.edits.bind(f.client);
		let approved = false;
		vi.spyOn(f.client, "edits").mockImplementation(async (comments) => {
			approved = !approved;
			decision(f, {}, approved ? "approved" : "rejected");
			return original(comments);
		});

		// Act
		const reading = f.repository.states();

		// Assert
		await expect(reading).rejects.toBeInstanceOf(OrganizerCommentChangedError);
		expect(f.list).toHaveBeenCalledTimes(3);
		expect(f.update).not.toHaveBeenCalled();
		expect(f.create).toHaveBeenCalledOnce();
	});

	it.each([
		null,
		{ id: "foreign", body: "request" },
		{ id: "comment-100", body: null },
	])("does not retry invalid evidence: %j", async (node) => {
		// Arrange
		const f = fixture();
		await f.repository.save(createStoredApproval(request));
		f.graphql.mockResolvedValue({ nodes: [node] });

		// Act
		const reading = f.repository.states();

		// Assert
		await expect(reading).rejects.toThrow("Invalid approval comment snapshot");
		expect(f.list).toHaveBeenCalledOnce();
		expect(f.update).not.toHaveBeenCalled();
	});

	it("does not retry provider failures", async () => {
		// Arrange
		const f = fixture();
		const failure = new Error("Synthetic API failure");
		f.list.mockRejectedValue(failure);

		// Act
		const reading = f.repository.states();

		// Assert
		await expect(reading).rejects.toBe(failure);
		expect(f.list).toHaveBeenCalledOnce();
	});

	it("discards paginated history when its later page belongs to a newer body", async () => {
		// Arrange
		const f = fixture();
		await f.repository.save(createStoredApproval(request));
		decision(f);
		const original = f.graphql.getMockImplementation();
		if (!original) throw new Error("Missing fixture implementation");
		let pages = 0;
		f.graphql.mockImplementation(async (query, variables) => {
			if (query.includes("query ApprovalCommentHistory(")) {
				pages += 1;
				if (pages === 1)
					return {
						node: {
							...f.edits.get("comment-100"),
							userContentEdits: {
								nodes: [],
								pageInfo: { hasNextPage: true, endCursor: "older" },
							},
						},
					};
				if (pages === 2) decision(f, {}, "rejected");
			}
			return original(query, variables);
		});

		// Act
		const states = await f.repository.states();

		// Assert
		expect(pages).toBe(3);
		expect(f.list).toHaveBeenCalledTimes(2);
		expect(states[0]?.comment.body).toContain("- [x] ❌ Reject sending");
		expect(states[0]?.record.decision).toBeUndefined();
		expect(f.update).not.toHaveBeenCalled();
	});
});

it("holds an escaped payload that exceeds the final comment budget before writing", async () => {
	// Arrange
	const f = fixture();
	const input = emailReviewFor("host-thanks");
	if (!input.details?.emails[0]?.message) throw new Error("Missing fixture");
	const email = input.details.emails[0];
	const message = input.details.emails[0].message;
	const record = createStoredApproval({
		...input,
		details: {
			...input.details,
			emails: [
				{
					...email,
					message: {
						...message,
						placeholders: {
							...message.placeholders,
							firstName: "<".repeat(7000),
						},
					},
				},
			],
		},
	});
	// Act
	const save = f.repository.save(record);
	// Assert
	await expect(save).rejects.toThrow(
		"Approval comment exceeds the review budget",
	);
	expect(f.create).not.toHaveBeenCalled();
	expect(f.update).not.toHaveBeenCalled();
});

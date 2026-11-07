import { FollowUpApprovalPolicy } from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { decision, fixture, request } from "../testing/approval.fixtures.js";
import { emailReviewFor } from "../testing/email-review.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { GithubOrganizerFollowUp } from "./github-organizer-follow-up.js";

const followUp = {
	eventDate: request.eventDate,
	requestedAt: request.requestedAt,
	active: true,
	pendingTasks: [
		"thank-host",
		"thank-speakers",
		"share-slides",
		"import-attendance",
		"share-social",
	] as const,
};

describe("post-event follow-up", () => {
	it("keeps task progress separate from independently reviewed email types", async () => {
		// Arrange
		const f = fixture();
		const composition = new GithubOrganizerApprovalComposition();
		const approvals = composition.githubOrganizerApproval(
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		const overview = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		// Act
		await approvals.request(emailReviewFor("host-thanks"));
		decision(f);
		const result = await approvals.request(emailReviewFor("host-thanks"));
		await approvals.request(emailReviewFor("speaker-thanks"));
		const commentId = await overview.synchronizeFollowUp(followUp);
		await overview.saveFollowUpAttention("serialized-reservation");
		await overview.synchronizeFollowUp({
			...followUp,
			pendingTasks: ["thank-speakers", "share-slides"],
		});
		const attention = await f.attention.synchronizeApprovals();
		const restored = await overview.followUpAttention();
		// Assert
		expect(result.status).toBe("approved");
		expect(f.comments).toHaveLength(3);
		expect(f.comments[0]?.body).toContain("Thank-you email — host");
		expect(f.comments[0]?.body).toContain("✅ Approved");
		expect(f.comments[1]?.body).toContain("Thank-you emails — speakers");
		expect(f.comments[1]?.body).toContain("- [ ] ✅ Approve");
		expect(f.comments[1]?.body).toContain("Reliable platforms</a>");
		expect(f.comments[2]?.body).toContain("✅ Thank the host");
		expect(f.comments[2]?.body).not.toContain("- [ ]");
		expect(
			attention.map(({ commentId, status }) => ({ commentId, status })),
		).toEqual([
			{ commentId: 100, status: "approved" },
			{ commentId: 101, status: "pending" },
		]);
		expect(restored).toEqual({ commentId, body: "serialized-reservation" });
		expect(f.dispatch).not.toHaveBeenCalled();
		expect(f.react).not.toHaveBeenCalled();
	});

	it.each(["pending", "approved", "rejected"] as const)(
		"preserves stored %s batch history without authorizing separately scoped emails",
		async (status) => {
			// Arrange
			const f = fixture();
			const composition = new GithubOrganizerApprovalComposition();
			const approvals = composition.githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.notifications,
				f.client,
			);
			const overview = new GithubOrganizerFollowUp(
				new FollowUpApprovalPolicy(),
				f.repository,
				f.records,
				f.finalizer,
			);
			const record = f.records.create({ ...request, kind: "email-thanks" });
			record.followUp = {
				active: true,
				pendingTasks: followUp.pendingTasks,
				attention: "serialized-reservation",
			};
			if (status !== "pending")
				record.decision = {
					status,
					actor: "organizer",
					decidedAt: request.requestedAt,
				};
			await f.repository.save(record);
			// Act
			const host = await approvals.request(emailReviewFor("host-thanks"));
			const speakers = await approvals.request(
				emailReviewFor("speaker-thanks"),
			);
			await overview.synchronizeFollowUp(followUp);
			const persisted = composition
				.approvalCommentCodec()
				.read(f.comments[0]?.body ?? "");
			const attention = await f.attention.synchronizeApprovals();
			// Assert
			expect(host.status).toBe("pending");
			expect(speakers.status).toBe("pending");
			expect(persisted.decision).toEqual(record.decision);
			expect(persisted.followUp?.attention).toBe("serialized-reservation");
			expect(persisted.revision).toBe(record.revision);
			expect(f.comments[0]?.body).not.toContain("- [ ]");
			expect(attention.map(({ commentId }) => commentId)).toEqual([101, 102]);
			expect(f.comments).toHaveLength(3);
		},
	);

	it("refreshes an overview without claiming emails are unready", async () => {
		// Arrange
		const f = fixture();
		const overview = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		// Act
		const first = await overview.synchronizeFollowUp(followUp);
		const second = await overview.synchronizeFollowUp(followUp);
		const approvals = await f.attention.synchronizeApprovals();
		// Assert
		expect(first).toBe(second);
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain(
			"Approve host and speaker thank-you emails separately",
		);
		expect(f.comments[0]?.body).not.toContain("- [ ]");
		expect(approvals).toEqual([]);
	});

	it("pauses the existing overview when follow-up is no longer eligible", async () => {
		// Arrange
		const f = fixture();
		const overview = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		await overview.synchronizeFollowUp(followUp);
		// Act
		await overview.synchronizeFollowUp({
			...followUp,
			active: false,
			eventDate: "",
		});
		// Assert
		expect(f.comments[0]?.body).toContain("Follow-up paused.");
		expect(f.comments).toHaveLength(1);
	});

	it("does not create an overview before follow-up is due", async () => {
		// Arrange
		const f = fixture();
		const overview = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		// Act
		const id = await overview.synchronizeFollowUp({
			...followUp,
			active: false,
			eventDate: "",
		});
		// Assert
		expect(id).toBeUndefined();
		expect(f.comments).toHaveLength(0);
	});
});

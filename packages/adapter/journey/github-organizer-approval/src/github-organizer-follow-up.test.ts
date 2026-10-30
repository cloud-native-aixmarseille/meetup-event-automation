import {
	FollowUpApprovalPolicy,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import { describe, expect, it } from "vitest";
import { decision, fixture, request } from "../testing/approval.fixtures.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { GithubOrganizerApproval } from "./github-organizer-approval.js";
import { GithubOrganizerFollowUp } from "./github-organizer-follow-up.js";

describe("shared post-event follow-up", () => {
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
	it("creates an overview before emails are ready and upgrades the same comment", async () => {
		// Arrange
		const f = fixture();
		const approvals = new GithubOrganizerApproval(
			{
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
				approvalRequestSchema:
					new GithubOrganizerApprovalComposition().approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview:
					new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
			},
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		const organizerFollowUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);

		// Act
		const commentId = await organizerFollowUp.synchronizeFollowUp(followUp);
		const waiting = f.comments[0]?.body;
		const result = await approvals.request({
			...request,
			kind: "email-thanks",
		});

		// Assert
		expect(commentId).toBe(100);
		expect(waiting).toContain("Thank-you emails are not ready yet.");
		expect(waiting).not.toContain("- [ ]");
		expect(result.status).toBe("pending");
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain("- [ ] Approve");
		expect(f.comments[0]?.body).toContain("Import attendance into CNCF");
		expect(f.dispatch).not.toHaveBeenCalled();
	});
	it("records a human decision before updating task progress and retains it on retry", async () => {
		// Arrange
		const f = fixture();
		const approvals = new GithubOrganizerApproval(
			{
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
				approvalRequestSchema:
					new GithubOrganizerApprovalComposition().approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview:
					new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
			},
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		const organizerFollowUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		await approvals.request({ ...request, kind: "email-thanks" });
		decision(f);

		// Act
		await organizerFollowUp.synchronizeFollowUp({
			...followUp,
			pendingTasks: ["thank-host", "share-slides"],
		});
		const result = await approvals.request({
			...request,
			kind: "email-thanks",
		});
		const record = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");

		// Assert
		expect(result.status).toBe("approved");
		expect(record.decision?.actor).toBe("organizer");
		expect(record.followUp?.pendingTasks).toEqual([
			"thank-host",
			"share-slides",
		]);
		expect(f.comments[0]?.body).toContain("✅ Thank the speakers");
		expect(f.comments).toHaveLength(1);
		expect(f.dispatch).not.toHaveBeenCalled();
		expect(f.react).not.toHaveBeenCalled();
	});
	it("retains notification reservations but requires approval for changed email batches", async () => {
		// Arrange
		const f = fixture();
		const approvals = new GithubOrganizerApproval(
			{
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
				approvalRequestSchema:
					new GithubOrganizerApprovalComposition().approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview:
					new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
			},
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		const organizerFollowUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		await approvals.request({ ...request, kind: "email-thanks" });
		decision(f);
		await organizerFollowUp.saveFollowUpAttention("serialized-reservation");

		// Act
		const changed = await approvals.request({
			...request,
			kind: "email-thanks",
			revision: "c".repeat(64),
		});
		const restored = await organizerFollowUp.followUpAttention();

		// Assert
		expect(changed.status).toBe("pending");
		expect(restored).toEqual({
			commentId: 100,
			body: "serialized-reservation",
		});
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain("- [ ] Approve");
	});
	it("removes approval controls when follow-up is no longer eligible", async () => {
		// Arrange
		const f = fixture();
		const approvals = new GithubOrganizerApproval(
			{
				followUpApprovalPolicy: new FollowUpApprovalPolicy(),
				approvalRequestSchema:
					new GithubOrganizerApprovalComposition().approvalRequestSchema(),
				approvalRequestPolicy:
					new JourneyPolicyComposition().approvalRequestPolicy(),
				approvalDetailsPreview:
					new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
			},
			f.repository,
			f.records,
			f.finalizer,
			f.notifications,
			f.client,
		);
		const organizerFollowUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		await approvals.request({ ...request, kind: "email-thanks" });

		// Act
		await organizerFollowUp.synchronizeFollowUp({
			...followUp,
			active: false,
			eventDate: "",
		});
		const body = f.comments[0]?.body ?? "";

		// Assert
		expect(body).toContain("Follow-up paused.");
		expect(body).not.toContain("- [ ]");
		expect(f.comments).toHaveLength(1);
	});
	it("does not create an overview before follow-up is due", async () => {
		// Arrange
		const f = fixture();
		const organizerFollowUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);

		// Act
		const id = await organizerFollowUp.synchronizeFollowUp({
			...followUp,
			active: false,
			eventDate: "",
		});

		// Assert
		expect(id).toBeUndefined();
		expect(f.comments).toHaveLength(0);
	});
	it("does not interpret an overview without emails as a pending approval", async () => {
		// Arrange
		const f = fixture();
		const organizerFollowUp = new GithubOrganizerFollowUp(
			new FollowUpApprovalPolicy(),
			f.repository,
			f.records,
			f.finalizer,
		);
		await organizerFollowUp.synchronizeFollowUp(followUp);

		// Act
		const approvals = await f.attention.synchronizeApprovals();

		// Assert
		expect(approvals).toEqual([]);
	});
});

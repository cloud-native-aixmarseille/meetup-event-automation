import { recordNotification } from "../testing/approval.fixtures.js";
import { MeetupSlidesApprovalPresenter } from "./meetup-slides-approval-presenter.js";
import {
	FollowUpApprovalPolicy,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it, vi } from "vitest";
import {
	approvalDependencies,
	communityRequest,
	decision,
	fixture,
	publicationRequest,
	slidesRequest,
	request,
} from "../testing/approval.fixtures.js";
import { contentRequest } from "../testing/content.fixtures.js";
import {
	emailReviewRequest,
	emailReviewFor,
} from "../testing/email-review.fixtures.js";
import { socialPublicationRequest } from "../testing/social-publication.fixtures.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { CommunityApprovalPresenter } from "./community-approval-presenter.js";
import { ContentTextPreview } from "./content-text-preview.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";
import { GithubOrganizerApproval } from "./github-organizer-approval.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";
import { SocialPublicationApprovalPresenter } from "./social-publication-approval-presenter.js";

describe("publication requests without decorative icons", () => {
	it.each(["pending", "approved", "rejected"] as const)(
		"refreshes the existing comment and preserves a %s choice",
		async (status) => {
			// Arrange
			const f = fixture();
			const composition = new GithubOrganizerApprovalComposition();
			const approvals = composition.githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
			await approvals.request(socialPublicationRequest);
			const record = composition
				.approvalCommentCodec()
				.read(f.comments[0]?.body ?? "");
			decision(f, {
				body: f.presenter
					.issue(record, { status })
					.replace(/(- \[[ x]\]) [✅❌] /g, "$1 "),
			});

			// Act
			const result = await approvals.request(socialPublicationRequest);

			// Assert
			expect(result.status).toBe(status);
			expect(f.create).toHaveBeenCalledOnce();
			if (status === "pending") {
				expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve publication");
				expect(f.comments[0]?.body).toContain("- [ ] ❌ Reject publication");
			} else {
				expect(f.comments[0]?.body).not.toContain("- [");
				expect(f.permission).toHaveBeenCalled();
			}
		},
	);
});

describe("email parameter approval integrity", () => {
	it.each(["write", "read"])(
		"checks %s access before refreshing edited parameters",
		async (permission) => {
			// Arrange
			const f = fixture();
			const approvals =
				new GithubOrganizerApprovalComposition().githubOrganizerApproval(
					f.repository,
					f.records,
					f.finalizer,
					f.client,
				);
			await approvals.request(emailReviewRequest);
			const record = new GithubOrganizerApprovalComposition()
				.approvalCommentCodec()
				.read(f.comments[0]?.body ?? "");
			const edited = f.presenter
				.issue(record, { status: "approved" })
				.replace("`2099-06-08`", "`2099-06-09`");
			decision(f, { body: edited });
			f.permission.mockResolvedValue({ data: { permission } });
			// Act
			const result = await approvals.request(emailReviewRequest);
			const again = await approvals.request(emailReviewRequest);
			// Assert
			expect(result.status).toBe("pending");
			expect(again.status).toBe(result.status);
			if (permission === "write")
				expect(f.comments[0]?.body).toContain(
					"&quot;eventDate&quot;: &quot;2099-06-09&quot;",
				);
			else expect(result.emailParameters).toBeUndefined();
		},
	);
	it("preserves an edited parameter list while its author is still preparing approval", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		await approvals.request(emailReviewRequest);
		const edited = (f.comments[0]?.body ?? "").replace(
			"`2099-06-08`",
			"`2099-06-09`",
		);
		decision(f, { body: edited }, "pending");
		// Act
		await approvals.synchronize();
		const result = await approvals.request(emailReviewRequest);
		// Assert
		expect(result.status).toBe("pending");
		expect(f.comments[0]?.body).toContain(
			"&quot;eventDate&quot;: &quot;2099-06-09&quot;",
		);
		expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve sending");
		expect(f.react).not.toHaveBeenCalled();
	});
	it("replaces a pending combined request without duplicating its organizer task", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		await approvals.request(request);
		// Act
		await approvals.request(emailReviewRequest);
		// Assert
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain("Preparation email — host");
	});
});

describe("organizer approval requests", () => {
	it("keeps destination publication and recovery approvals independent", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		const first = socialPublicationRequest;
		const second = {
			...first,
			revision: "e".repeat(64),
			social: {
				...first.social,
				intentId: "event-announcement-channel-two",
				destinationIdentity: "T123/C456",
			},
		};
		const recovery = {
			...first,
			revision: "f".repeat(64),
			social: {
				...first.social,
				recovery: {
					outcome: "not-published" as const,
					reference: "Verified provider history",
				},
			},
		};

		// Act
		await approvals.request(first);
		decision(f);
		const accepted = await approvals.request(first);
		await approvals.request(second);
		await approvals.request(recovery);
		const retained = await approvals.request(first);
		const active = await f.repository.activeStates();

		// Assert
		expect(approvals).toBeInstanceOf(GithubOrganizerApproval);
		expect(accepted.status).toBe("approved");
		expect(retained.status).toBe("approved");
		expect(active).toHaveLength(3);
		expect(f.create).toHaveBeenCalledTimes(3);
	});
	it("cannot finalize a decision until the GitHub write succeeds", async () => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f);
		f.update.mockRejectedValueOnce(new Error("write failed"));

		// Act
		const failure = await approvals
			.request(request)
			.catch((error: unknown) => error);
		const record = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");

		// Assert
		expect(failure).toEqual(new Error("write failed"));
		expect(f.react).not.toHaveBeenCalled();
		expect(record.decision).toBeUndefined();
	});
	it("retries the same reaction when its successful acknowledgement cannot be saved", async () => {
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
			f.client,
		);
		await approvals.request(request);
		await recordNotification(f);
		decision(f);
		f.react.mockImplementationOnce(async () => {
			f.update.mockRejectedValueOnce(new Error("write failed"));
			return true;
		});

		// Act
		const first = await approvals.synchronize();
		const recorded = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		const second = await approvals.synchronize();

		// Assert
		expect(first.notificationFailed).toBe(true);
		expect(recorded.decision?.status).toBe("approved");
		expect(recorded.reactionSent).toBeUndefined();
		expect(second.notificationFailed).toBe(false);
		expect(f.react).toHaveBeenCalledTimes(2);
		expect(f.react.mock.calls[1]).toEqual(f.react.mock.calls[0]);
	});
	it("does not accept a forged final decision in a pending request", async () => {
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
			f.client,
		);
		await approvals.request(request);
		const record = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		record.decision = {
			status: "approved",
			actor: "organizer",
			decidedAt: request.requestedAt,
		};
		decision(f, { body: f.presenter.issue(record, record.decision) });

		// Act
		const result = await approvals.request(request);

		// Assert
		expect(result.status).toBe("pending");
		expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve sending");
		expect(f.react).not.toHaveBeenCalled();
		expect(f.permission).not.toHaveBeenCalled();
	});
	it("requests a new decision in the same comment when a rejected batch changes", async () => {
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
			f.client,
		);
		await approvals.request(request);
		await recordNotification(f);
		decision(f, {}, "rejected");
		await approvals.synchronize();
		const original = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");

		// Act
		const result = await approvals.request({
			...request,
			revision: "b".repeat(64),
		});
		const replacement = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		decision(f);
		await approvals.synchronize();

		// Assert
		expect(result.status).toBe("pending");
		expect(replacement.requestId).not.toBe(original.requestId);
		expect(replacement.decision).toBeUndefined();
		expect(f.comments).toHaveLength(1);

		expect(f.react.mock.calls).toEqual([
			[{ destination: "C12345", messageId: "100.001" }, "rejected"],
		]);
	});
	it.each(["approved", "rejected"] as const)(
		"finalizes %s in place and reacts once on the recorded Slack destination",
		async (status) => {
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
				f.client,
			);
			await approvals.request(request);
			await recordNotification(f);
			const commentId = f.comments[0]?.id;
			decision(f, {}, status);

			// Act
			const first = await approvals.synchronize();
			const second = await approvals.synchronize();
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe(status);
			expect(first.notificationFailed).toBe(false);
			expect(second.notificationFailed).toBe(false);
			expect(f.comments).toHaveLength(1);
			expect(f.comments[0]?.id).toBe(commentId);
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.comments[0]?.body).toContain("@organizer");
			expect(f.comments[0]?.body).toContain(request.requestedAt);

			expect(f.react).toHaveBeenCalledExactlyOnceWith(
				{ destination: "C12345", messageId: "100.001" },
				status,
			);
		},
	);
	it.each(["approved", "rejected"] as const)(
		"restores a final %s decision after tampering with its metadata",
		async (status) => {
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
				f.client,
			);
			await approvals.request(request);
			await recordNotification(f);
			decision(f, {}, status);
			await approvals.synchronize();
			const original = f.comments[0]?.body ?? "";
			const replacement = original.replaceAll(
				status,
				status === "approved" ? "rejected" : "approved",
			);

			// Act
			decision(f, { body: replacement });
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe(status);
			expect(f.comments[0]?.body).toBe(original);
			expect(f.create).toHaveBeenCalledTimes(1);
			expect(f.react).toHaveBeenCalledTimes(1);
		},
	);
	it("preserves a finalized decision when a human removes all comment metadata", async () => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f, {}, "rejected");
		await approvals.synchronize();
		const original = f.comments[0]?.body;

		// Act
		decision(f, { body: "- [x] ✅ Approve sending" });
		const result = await approvals.request(request);

		// Assert
		expect(result.status).toBe("rejected");
		expect(f.comments[0]?.body).toBe(original);
		expect(f.comments).toHaveLength(1);
	});
	it("retries a failed reaction while retaining the final decision", async () => {
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
			f.client,
		);
		await approvals.request(request);
		await recordNotification(f);
		decision(f);
		f.react.mockResolvedValueOnce(false);

		// Act
		const first = await approvals.synchronize();
		const firstBody = f.comments[0]?.body;
		const second = await approvals.synchronize();

		// Assert
		expect(first.notificationFailed).toBe(true);
		expect(firstBody).toContain("✅ Approved");
		expect(firstBody).not.toContain("- [");
		expect(second.notificationFailed).toBe(false);
		expect(f.react).toHaveBeenCalledTimes(2);
	});
	it("retains a decision on a sent notification without a message reference", async () => {
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
			f.client,
		);

		await approvals.request(request);
		decision(f);

		// Act
		const result = await approvals.request(request);

		// Assert
		expect(result).toEqual({
			status: "approved",
			notificationFailed: false,
			actor: "organizer",
			decidedAt: request.requestedAt,
		});
		expect(f.comments[0]?.body).toContain("✅ Approved");
		expect(f.react).not.toHaveBeenCalled();
	});
	it("keeps an uncertain notification visible after an organizer decision without reposting", async () => {
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
			f.client,
		);

		await approvals.request(request);
		await recordNotification(f, "reserved");
		decision(f);

		// Act
		const result = await approvals.request(request);

		// Assert
		expect(result).toEqual({
			status: "approved",
			notificationFailed: true,
			actor: "organizer",
			decidedAt: request.requestedAt,
		});
		expect(f.react).not.toHaveBeenCalled();
	});
	it("does not authorize dispatch after the recorded organizer loses write access", async () => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f);
		await approvals.synchronize();
		f.permission.mockResolvedValue({ data: { permission: "read" } });

		// Act
		const result = approvals.request(request);

		// Assert
		await expect(result).rejects.toThrow("no longer has approval permission");
		expect(f.comments[0]?.body).toContain("✅ Approved");
	});
	it.each([{ eventDate: "2099-06-09" }, { recipientCount: 1 }])(
		"resets a request whose displayed facts were changed: %j",
		async (changed) => {
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
				f.client,
			);
			await approvals.request(request);
			const record = new GithubOrganizerApprovalComposition()
				.approvalCommentCodec()
				.read(f.comments[0]?.body ?? "");
			if (
				record.kind !== "email-introduction" &&
				record.kind !== "email-thanks"
			)
				throw new Error("Expected an email request");
			decision(f, {
				body: f.presenter.issue(
					{ ...record, ...changed },
					{ status: "approved" },
				),
			});

			// Act
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe("pending");
			expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve sending");
			expect(f.permission).not.toHaveBeenCalled();
		},
	);
	it.each(["en", "fr"])(
		"preserves the recorded decision across retries and locale changes from %s",
		async (locale) => {
			// Arrange
			const f = fixture(locale);
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
				f.client,
			);
			await approvals.request(request);
			await recordNotification(f);
			decision(f);
			const translatedDependencies = approvalDependencies(
				f.client,
				new ApprovalPresenter(
					new GithubOrganizerApprovalComposition().approvalCommentCodec(),
					{
						"email-introduction":
							new GithubOrganizerApprovalComposition().emailApprovalPresenter(
								new ApprovalMessages(
									{
										localeResolver:
											new LocalizationComposition().localeResolver(),
									},
									locale === "en" ? "fr" : "en",
								),
							),
						"meetup-slides": new MeetupSlidesApprovalPresenter(
							new GithubOrganizerApprovalComposition().approvalMessages("en"),
						),
						"email-thanks":
							new GithubOrganizerApprovalComposition().emailApprovalPresenter(
								new ApprovalMessages(
									{
										localeResolver:
											new LocalizationComposition().localeResolver(),
									},
									locale === "en" ? "fr" : "en",
								),
							),
						"social-publication": new SocialPublicationApprovalPresenter(
							new GithubOrganizerApprovalComposition().approvalMessages("en"),
						),
						"content-review":
							new GithubOrganizerApprovalComposition().contentApprovalPresenter(
								new GithubOrganizerApprovalComposition().approvalMessages("en"),
							),
						"community-publication": new CommunityApprovalPresenter(
							new GithubOrganizerApprovalComposition().approvalMessages("en"),
						),
						"meetup-publication":
							new GithubOrganizerApprovalComposition().meetupApprovalPresenter(
								new ApprovalMessages(
									{
										localeResolver:
											new LocalizationComposition().localeResolver(),
									},
									locale === "en" ? "fr" : "en",
								),
							),
					},
				),
				{ react: f.react },
			);
			const translated = new GithubOrganizerApproval(
				{
					followUpApprovalPolicy: new FollowUpApprovalPolicy(),
					approvalRequestSchema:
						new GithubOrganizerApprovalComposition().approvalRequestSchema(),
					approvalRequestPolicy:
						new JourneyPolicyComposition().approvalRequestPolicy(),
					approvalDetailsPreview:
						new GithubOrganizerApprovalComposition().approvalDetailsPreview(),
				},
				translatedDependencies.repository,
				translatedDependencies.records,
				translatedDependencies.finalizer,
				f.client,
			);

			// Act
			const first = await approvals.request(request);
			const second = await translated.request(request);

			// Assert
			expect(first.status).toBe("approved");
			expect(second.status).toBe("approved");
			expect(f.comments).toHaveLength(1);
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.comments[0]?.body).toContain("@organizer");

			expect(f.react).toHaveBeenCalledTimes(1);
		},
	);
	it.each(["both", "changed description", "command"])(
		"holds mail for an ambiguous or altered request: %s",
		async (variant) => {
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
				f.client,
			);
			await approvals.request(request);
			decision(f);
			const body = f.comments[0]?.body ?? "";
			const altered =
				variant === "both"
					? body.replace("- [ ] ❌ Reject", "- [x] ❌ Reject")
					: variant === "command"
						? `${body}\n/approve approval-synthetic`
						: body.replace("Up to 2", "Up to 1");
			decision(f, { body: altered });

			// Act
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe("pending");
			expect(f.permission).not.toHaveBeenCalled();
		},
	);
	it.each(["approved", "rejected"] as const)(
		"preserves a finalized %s decision when old checkboxes are restored",
		async (status) => {
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
				f.client,
			);
			await approvals.request(request);
			await recordNotification(f);
			const pending = f.comments[0]?.body ?? "";
			decision(f, {}, status);
			await approvals.request(request);

			// Act
			decision(f, { body: pending }, "pending");
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe(status);
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.comments).toHaveLength(1);
			expect(f.react).toHaveBeenCalledTimes(1);
		},
	);
	it("blocks approval if the request changes while its editor is being read", async () => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f);
		f.graphql.mockResolvedValue({
			nodes: [{ id: "comment-100", body: "newer request" }],
		});

		// Act
		const result = approvals.request(request);

		// Assert
		await expect(result).rejects.toThrow(
			"Organizer comment changed during verification",
		);
		expect(f.permission).not.toHaveBeenCalled();
	});

	it.each(["en", "fr"])(
		"reuses one issue request without posting a separate Slack alert in %s",
		async (locale) => {
			// Arrange
			const f = fixture(locale);
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
				f.client,
			);

			// Act
			const first = await approvals.request(request);
			const second = await approvals.request(request);

			// Assert
			expect(first.status).toBe("pending");
			expect(second.status).toBe("pending");
			expect(f.create).toHaveBeenCalledTimes(1);

			expect(f.comments[0]?.body).toContain(
				locale === "fr" ? "- [ ] ✅ Approuver" : "- [ ] ✅ Approve",
			);
		},
	);
	it.each(["write", "maintain", "admin"])(
		"accepts approval with %s permission",
		async (permission) => {
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
				f.client,
			);
			await approvals.request(request);
			decision(f);
			f.permission.mockResolvedValue({ data: { permission } });

			// Act
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe("approved");
			expect(f.comments[0]?.body).toContain("✅ Approved by @organizer");
			expect(f.comments[0]?.body).not.toContain("- [");
		},
	);
	it.each(["read", "triage", "none"])(
		"ignores a decision with %s permission",
		async (permission) => {
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
				f.client,
			);
			await approvals.request(request);
			decision(f);
			f.permission.mockResolvedValue({ data: { permission } });

			// Act
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe("pending");
		},
	);
	it.each([
		{ editor: { login: "another[bot]", __typename: "Bot" } },
		{ editor: { login: "ghost", __typename: "User" } },
		{ editor: null },
		{ lastEditedAt: "2099-05-01T10:00:00.000Z" },
		{ lastEditedAt: "invalid" },
		{ lastEditedAt: null },
	])("ignores ineligible editors or stale edits %j", async (overrides) => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f, overrides);

		// Act
		const result = await approvals.request(request);

		// Assert
		expect(result.status).toBe("pending");
		expect(f.permission).not.toHaveBeenCalled();
	});

	it("honors a changed checkbox choice without resending the alert", async () => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f);
		decision(f, {}, "rejected");

		// Act
		const result = await approvals.request(request);

		// Assert
		expect(result.status).toBe("rejected");
		expect(f.comments[0]?.body).toContain("❌ Rejected by @organizer");
		expect(f.comments[0]?.body).not.toContain("- [");
	});
	it("invalidates a prior approval when the revision changes, even if old facts return", async () => {
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
			f.client,
		);
		await approvals.request(request);
		decision(f);

		// Act
		const changed = await approvals.request({
			...request,
			revision: "b".repeat(64),
		});
		const restored = await approvals.request(request);

		// Assert
		expect(changed.status).toBe("pending");
		expect(restored.status).toBe("pending");
		expect(f.create).toHaveBeenCalledTimes(1);
	});
	it("ignores forged managed comments from other authors", async () => {
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
			f.client,
		);
		f.comments.push({
			id: 1,
			body: "<!-- meetup-organizer-approval:v1 malformed -->",
			user: { login: "outsider", type: "User" },
		});

		// Act
		const result = await approvals.request(request);

		// Assert
		expect(result.status).toBe("pending");
		expect(f.create).toHaveBeenCalledTimes(1);
	});
	it("fails closed on malformed trusted state", async () => {
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
			f.client,
		);
		f.comments.push({
			id: 1,
			body: "<!-- meetup-organizer-approval:v1 malformed -->",
			user: { login: "automation[bot]", type: "Bot" },
		});

		// Act
		const result = approvals.request(request);

		// Assert
		await expect(result).rejects.toThrow();
	});
});

describe("Meetup publication approvals", () => {
	it.each(["approved", "rejected"] as const)(
		"records organizer %s for Meetup publication",
		async (status) => {
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
				f.client,
			);
			await approvals.request(publicationRequest);
			await recordNotification(f);
			decision(f, {}, status);

			// Act
			const result = await approvals.request(publicationRequest);
			const attention = await f.attention.synchronizeApprovals();

			// Assert
			expect(result.status).toBe(status);
			expect(attention[0]).toMatchObject({
				kind: "meetup-publication",
				status,
			});
			expect(f.comments[0]?.body).not.toContain("- [");

			expect(f.react).toHaveBeenCalledWith(expect.anything(), status);
		},
	);

	it("requires a new decision when the reviewed publication changes", async () => {
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
			f.client,
		);
		await approvals.request(publicationRequest);
		decision(f);
		await approvals.request(publicationRequest);

		// Act
		const result = await approvals.request({
			...publicationRequest,
			revision: "c".repeat(64),
			publication: {
				...publicationRequest.publication,
				title: "Changed content",
			},
		});

		// Assert
		expect(result.status).toBe("pending");
		expect(f.create).toHaveBeenCalledOnce();
		expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve publication");
	});

	it("rejects publication approval from a user without repository write permission", async () => {
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
			f.client,
		);
		await approvals.request(publicationRequest);
		decision(f);
		f.permission.mockResolvedValue({ data: { permission: "read" } });

		// Act
		const result = await approvals.request(publicationRequest);

		// Assert
		expect(result.status).toBe("pending");
	});
	it("does not accept modified publication facts as organizer approval", async () => {
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
			f.client,
		);
		await approvals.request(publicationRequest);
		const record = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		if (record.kind !== "meetup-publication")
			throw new Error("Expected publication request");
		decision(f, {
			body: f.presenter.issue(
				{
					...record,
					publication: {
						...record.publication,
						url: "https://www.meetup.com/example/events/67890/",
					},
				},
				{ status: "approved" },
			),
		});

		// Act
		const result = await approvals.request(publicationRequest);

		// Assert
		expect(result.status).toBe("pending");
		expect(f.permission).not.toHaveBeenCalled();
	});
});

describe("OCGroups publication approvals", () => {
	it.each(["approved", "rejected"] as const)(
		"records organizer %s for OCGroups publication",
		async (status) => {
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
				f.client,
			);
			await approvals.request(communityRequest);
			await recordNotification(f);
			decision(f, {}, status);

			// Act
			const result = await approvals.request(communityRequest);
			const attention = await f.attention.synchronizeApprovals();

			// Assert
			expect(result.status).toBe(status);
			expect(attention[0]).toMatchObject({
				kind: "community-publication",
				status,
			});
			expect(f.comments[0]?.body).not.toContain("- [");

			expect(f.react).toHaveBeenCalledWith(expect.anything(), status);
		},
	);

	it("requires a new decision when the reviewed publication changes", async () => {
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
			f.client,
		);
		await approvals.request(communityRequest);
		decision(f);
		await approvals.request(communityRequest);

		// Act
		const result = await approvals.request({
			...communityRequest,
			revision: "c".repeat(64),
			publication: {
				...communityRequest.publication,
				title: "Changed content",
			},
		});

		// Assert
		expect(result.status).toBe("pending");
		expect(f.create).toHaveBeenCalledOnce();
		expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve publication");
	});

	it("rejects publication approval from a user without repository write permission", async () => {
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
			f.client,
		);
		await approvals.request(communityRequest);
		decision(f);
		f.permission.mockResolvedValue({ data: { permission: "read" } });

		// Act
		const result = await approvals.request(communityRequest);

		// Assert
		expect(result.status).toBe("pending");
	});
	it("does not accept modified publication facts as organizer approval", async () => {
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
			f.client,
		);
		await approvals.request(communityRequest);
		const record = new GithubOrganizerApprovalComposition()
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		if (record.kind !== "community-publication")
			throw new Error("Expected publication request");
		decision(f, {
			body: f.presenter.issue(
				{
					...record,
					publication: {
						...record.publication,
						url: "https://www.meetup.com/example/events/67890/",
					},
				},
				{ status: "approved" },
			),
		});

		// Act
		const result = await approvals.request(communityRequest);

		// Assert
		expect(result.status).toBe("pending");
		expect(f.permission).not.toHaveBeenCalled();
	});
});

describe("organizer text replacement", () => {
	it("preserves an edit through synchronization and approves exactly that text", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		const preview = new ContentTextPreview();
		const editedText = "Our meetup title";
		const validate = vi.fn(
			(text: string) => text.length > 0 && text.length <= 80,
		);
		// Act
		await approvals.request(contentRequest, validate);
		const pending =
			preview.replace(f.comments[0]?.body ?? "", editedText) ?? "";
		decision(f, { body: pending }, "pending");
		await approvals.synchronize();
		const pendingResult = await approvals.request(contentRequest, validate);
		const pendingBody = f.comments[0]?.body;
		decision(f, {
			body: pending.replace("- [ ] ✅ Approve", "- [x] ✅ Approve"),
		});
		await approvals.synchronize();
		const beforeValidation = (await f.repository.states())[0]?.record.decision;
		const result = await approvals.request(contentRequest, validate);
		await approvals.synchronize();
		const repeated = await approvals.request(contentRequest, validate);
		const record = (await f.repository.states())[0]?.record;
		// Assert
		expect(pendingResult).toMatchObject({ status: "pending", editedText });
		expect(pendingBody).toBe(pending);
		expect(beforeValidation).toBeUndefined();
		expect(result).toMatchObject({
			status: "approved",
			editedText,
			actor: "organizer",
		});
		expect(repeated).toMatchObject({ status: "approved", editedText });
		expect(record?.kind === "content-review" && record.content.draft.text).toBe(
			contentRequest.content.draft.text,
		);
		expect(record?.decision).toMatchObject({ editedText });
		expect(preview.read(f.comments[0]?.body ?? "")?.text).toBe(editedText);
	});
	it("keeps invalid text editable and accepts a later correction", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		const preview = new ContentTextPreview();
		const validate = (text: string) => text.length > 0 && text.length <= 80;
		// Act
		await approvals.request(contentRequest, validate);
		const original = f.comments[0]?.body ?? "";
		const invalid = (preview.replace(original, "x".repeat(81)) ?? "").replace(
			"- [ ] ✅ Approve",
			"- [x] ✅ Approve",
		);
		decision(f, { body: invalid });
		const rejected = await approvals.request(contentRequest, validate);
		const invalidBody = f.comments[0]?.body;
		const before = (await f.repository.states())[0]?.record.decision;
		decision(f, { body: preview.replace(invalid, "A corrected title") ?? "" });
		const corrected = await approvals.request(contentRequest, validate);
		// Assert
		expect(rejected).toMatchObject({ status: "pending", invalidText: true });
		expect(invalidBody).toBe(invalid);
		expect(before).toBeUndefined();
		expect(corrected).toMatchObject({
			status: "approved",
			editedText: "A corrected title",
		});
	});
	it("does not approve a text replacement by an unauthorized editor", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		const preview = new ContentTextPreview();
		// Act
		await approvals.request(contentRequest, () => true);
		const edited = (
			preview.replace(f.comments[0]?.body ?? "", "Untrusted replacement") ?? ""
		).replace("- [ ] ✅ Approve", "- [x] ✅ Approve");
		decision(f, { body: edited });
		f.permission.mockResolvedValue({ data: { permission: "read" } });
		const result = await approvals.request(contentRequest, () => true);
		const record = (await f.repository.states())[0]?.record;
		// Assert
		expect(result.status).toBe("pending");
		expect(record?.decision).toBeUndefined();
	});
});

describe("completed approval comment visibility", () => {
	it("hides a persisted decision and restores a reused comment for a new revision", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);

		// Act
		await approvals.request(request);
		decision(f);
		await approvals.request(request);
		await approvals.request({ ...request, revision: "c".repeat(64) });

		// Assert
		expect(
			f.visibility.synchronize.mock.calls.map(([id, , resolved]) => [
				id,
				resolved,
			]),
		).toEqual([
			[100, false],
			[100, true],
			[100, false],
		]);
		expect(f.create).toHaveBeenCalledTimes(1);
	});
	it("keeps a human decision visible when bot persistence fails", async () => {
		// Arrange
		const f = fixture();
		const approvals =
			new GithubOrganizerApprovalComposition().githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
		await approvals.request(request);
		decision(f);
		f.visibility.synchronize.mockClear();
		f.update.mockRejectedValueOnce(new Error("Unavailable"));

		// Act
		const result = approvals.request(request);

		// Assert
		await expect(result).rejects.toThrow("Unavailable");
		expect(f.visibility.synchronize).not.toHaveBeenCalled();
	});
});

describe("Meetup attendee delivery approvals", () => {
	it("persists a verified choice and requires new approval for a changed PDF", async () => {
		// Arrange
		const f = fixture();
		const composition = new GithubOrganizerApprovalComposition();
		const approvals = composition.githubOrganizerApproval(
			f.repository,
			f.records,
			f.finalizer,
			f.client,
		);
		await approvals.request(slidesRequest);
		const record = composition
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		decision(f, { body: f.presenter.issue(record, { status: "approved" }) });

		// Act
		const approved = await approvals.request(slidesRequest);
		const persisted = composition
			.approvalCommentCodec()
			.read(f.comments[0]?.body ?? "");
		const changed = await approvals.request({
			...slidesRequest,
			slides: {
				...slidesRequest.slides,
				pdfUrl: "https://drive.google.com/file/d/new-pdf/view",
			},
		});

		// Assert
		expect(approved.status).toBe("approved");
		expect(persisted.decision?.actor).toBe("organizer");
		expect(changed.status).toBe("pending");
		expect(f.create).toHaveBeenCalledOnce();
	});

	it.each(["approved", "rejected", "unauthorized"] as const)(
		"rechecks a %s response after refreshing a changed snapshot",
		async (status) => {
			// Arrange
			const f = fixture();
			const approvals =
				new GithubOrganizerApprovalComposition().githubOrganizerApproval(
					f.repository,
					f.records,
					f.finalizer,
					f.client,
				);
			await approvals.request(request);
			const original = f.client.edits.bind(f.client);
			vi.spyOn(f.client, "edits").mockImplementationOnce(async (comments) => {
				decision(f, {}, status === "rejected" ? "rejected" : "approved");
				return original(comments);
			});
			if (status === "unauthorized")
				f.permission.mockResolvedValue({ data: { permission: "read" } });

			// Act
			const result = await approvals.request(request);

			// Assert
			expect(result.status).toBe(
				status === "unauthorized" ? "pending" : status,
			);
			expect(f.permission).toHaveBeenCalledWith(
				expect.objectContaining({ username: "organizer" }),
			);
			expect(f.create).toHaveBeenCalledOnce();
		},
	);
});

describe.each([
	"host-introduction",
	"speaker-introduction",
	"host-thanks",
	"speaker-thanks",
] as const)("complete %s authorization", (kind) => {
	it.each(["pending", "approved"] as const)(
		"refreshes a %s edit before accepting a separate approval",
		async (status) => {
			// Arrange
			const f = fixture();
			const composition = new GithubOrganizerApprovalComposition();
			const approvals = composition.githubOrganizerApproval(
				f.repository,
				f.records,
				f.finalizer,
				f.client,
			);
			const request = emailReviewFor(kind);
			await approvals.request(request);
			const record = composition
				.approvalCommentCodec()
				.read(f.comments[0]?.body ?? "");
			decision(f, {
				body: f.presenter
					.issue(record, { status })
					.replace("`2099-06-08`", "`2099-06-09`"),
			});
			// Act: a changed preview cannot authorize dispatch.
			const refreshed = await approvals.request(request);
			const refreshedBody = f.comments[0]?.body ?? "";
			// Assert
			expect(refreshed.status).toBe("pending");
			expect(refreshedBody).toContain("- [ ] ✅ Approve sending");
			expect(refreshedBody).toContain(
				"&quot;eventDate&quot;: &quot;2099-06-09&quot;",
			);
			// Act: approve the exact refreshed payload.
			decision(f, {
				body: refreshedBody.replace("- [ ] ✅ Approve", "- [x] ✅ Approve"),
			});
			const approved = await approvals.request(request);
			const retried = await approvals.request(request);
			// Assert
			expect(approved.status).toBe("approved");
			expect(retried.emailParameters?.eventDate).toBe("2099-06-09");
			expect(f.comments[0]?.body).toContain(
				"&quot;eventDate&quot;: &quot;2099-06-09&quot;",
			);
			expect(f.comments[0]?.body).toContain("contact&#64;example.test");
			expect(f.create).toHaveBeenCalledOnce();
		},
	);

	it("requires a complete review before sending a previously summarized batch", async () => {
		// Arrange
		const f = fixture();
		const composition = new GithubOrganizerApprovalComposition();
		const approvals = composition.githubOrganizerApproval(
			f.repository,
			f.records,
			f.finalizer,
			f.client,
		);
		const request = emailReviewFor(kind);
		if (!request.details) throw new Error("Missing fixture");
		const summary = {
			...request,
			details: {
				...request.details,
				emails: request.details.emails.map(
					({ message: _message, ...email }) => email,
				),
			},
		};
		await approvals.request(summary);
		decision(f);
		await approvals.request(summary);
		// Act
		const result = await approvals.request(request);
		// Assert
		expect(result.status).toBe("pending");
		expect(f.comments[0]?.body).toContain("contact&#64;example.test");
		expect(f.comments[0]?.body).toContain("- [ ] ✅ Approve sending");
		expect(f.create).toHaveBeenCalledOnce();
	});
});

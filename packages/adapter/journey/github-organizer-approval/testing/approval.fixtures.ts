import { GithubOrganizerApprovalComposition } from "@meetup-automation/github-organizer-approval";
import {
	ApprovalNotificationPolicy,
	ApprovalRequestPolicy,
	DraftProposalComposition,
	FollowUpApprovalPolicy,
	JourneyPolicyComposition,
	type OrganizerApprovalNotification,
	type OrganizerApprovalRequest,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { vi } from "vitest";
import { ApprovalDecisionParser } from "../src/approval-decision-parser.js";
import { ApprovalNotifications } from "../src/approval-notifications.js";
import { ApprovalPresenter } from "../src/approval-presenter.js";
import { ApprovalRecordFactory } from "../src/approval-record-factory.js";
import { CommunityApprovalPresenter } from "../src/community-approval-presenter.js";
import { ContentTextPreview } from "../src/content-text-preview.js";
import { FinalizeApprovalDecision } from "../src/finalize-approval-decision.js";
import { GithubApprovalAttentionSource } from "../src/github-approval-attention-source.js";
import { GithubApprovalClient } from "../src/github-approval-client.js";
import type {
	ApprovalComment,
	ApprovalCommentEdit,
	ApprovalContentEdit,
} from "../src/github-approval-contracts.js";
import { GithubApprovalRepository } from "../src/github-approval-repository.js";
import { ApprovalMessages } from "../src/i18n/approval-messages.js";
import { ResolveApprovalDecision } from "../src/resolve-approval-decision.js";
import { SocialPublicationApprovalPresenter } from "../src/social-publication-approval-presenter.js";
import { TrustedApprovalState } from "../src/trusted-approval-state.js";
export const request = {
	kind: "email-introduction",
	revision: "a".repeat(64),
	eventDate: "2099-06-08",
	recipientCount: 2,
	requestedAt: "2099-06-01T10:00:00.000Z",
} satisfies OrganizerApprovalRequest;
export function fixture(locale = "en") {
	const comments: ApprovalComment[] = [];
	const edits = new Map<string, ApprovalCommentEdit>();
	const history = new Map<string, ApprovalContentEdit[]>();
	const presenter = new ApprovalPresenter(
		new GithubOrganizerApprovalComposition().approvalCommentCodec(),
		{
			"email-introduction":
				new GithubOrganizerApprovalComposition().emailApprovalPresenter(
					new ApprovalMessages(
						{ localeResolver: new LocalizationComposition().localeResolver() },
						locale,
					),
				),
			"email-thanks":
				new GithubOrganizerApprovalComposition().emailApprovalPresenter(
					new ApprovalMessages(
						{ localeResolver: new LocalizationComposition().localeResolver() },
						locale,
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
						{ localeResolver: new LocalizationComposition().localeResolver() },
						locale,
					),
				),
		},
	);
	const graphql = vi.fn().mockImplementation(async (_query, variables) => ({
		node: edits.has(variables.id)
			? {
					...edits.get(variables.id),
					userContentEdits: {
						nodes: history.get(variables.id) ?? [],
						pageInfo: { hasNextPage: false, endCursor: null },
					},
				}
			: null,
	}));
	const permission = vi
		.fn()
		.mockResolvedValue({ data: { permission: "write" } });
	const update = vi.fn(async (input: { comment_id: number; body: string }) => {
		const index = comments.findIndex(
			(comment) => comment.id === input.comment_id,
		);
		if (index < 0) throw new Error("Missing synthetic comment");
		comments[index] = {
			...comments[index],
			id: input.comment_id,
			node_id: `comment-${input.comment_id}`,
			body: input.body,
		};
		history.set(`comment-${input.comment_id}`, [
			{
				diff: input.body,
				deletedAt: null,
				editor: { login: "automation", __typename: "Bot" },
			},
			...(history.get(`comment-${input.comment_id}`) ?? []),
		]);
		edits.set(`comment-${input.comment_id}`, {
			id: `comment-${input.comment_id}`,
			body: input.body,
			editor: { login: "automation[bot]", __typename: "Bot" },
			lastEditedAt: request.requestedAt,
		});
	});
	const create = vi.fn(async (input: { body: string }) => {
		const id = comments.length + 100;
		comments.push({
			id,
			node_id: `comment-${id}`,
			body: input.body,
			user: { login: "automation[bot]", type: "Bot" },
		});
		edits.set(`comment-${id}`, {
			id: `comment-${id}`,
			body: input.body,
			editor: null,
			lastEditedAt: null,
		});
		history.set(`comment-${id}`, [
			{
				diff: input.body,
				deletedAt: null,
				editor: { login: "automation", __typename: "Bot" },
			},
		]);
		return { data: { id } };
	});
	const list = vi.fn(async () => ({ data: [...comments], headers: {} }));
	const api = {
		graphql,
		rest: {
			issues: {
				listComments: list,
				createComment: create,
				updateComment: update,
			},
			repos: { getCollaboratorPermissionLevel: permission },
		},
	};
	const client = new GithubApprovalClient(
		{
			githubApprovalResponse:
				new GithubOrganizerApprovalComposition().githubApprovalResponse(),
		},
		api,
		"example",
		"meetups",
		42,
	);
	const dispatch = vi.fn().mockResolvedValue({
		outcome: "accepted",
		message: { destination: "C12345", messageId: "100.001" },
	});
	const react = vi.fn().mockResolvedValue(true);
	const dependencies = approvalDependencies(client, presenter, {
		send: dispatch,
		react,
	});
	return {
		api,
		presenter,
		graphql,
		edits,
		history,
		react,
		comments,
		permission,
		update,
		create,
		list,
		client,
		dispatch,
		...dependencies,
		attention: new GithubApprovalAttentionSource(
			dependencies.repository,
			dependencies.finalizer,
		),
	};
}
export function decision(
	f: ReturnType<typeof fixture>,
	overrides: Partial<ApprovalCommentEdit> = {},
	status: "approved" | "rejected" | "pending" = "approved",
) {
	const comment = f.comments[0];
	if (!comment?.node_id) throw new Error("Missing synthetic approval");
	const record = new GithubOrganizerApprovalComposition()
		.approvalCommentCodec()
		.read(comment.body ?? "");
	const edit: ApprovalCommentEdit = {
		id: comment.node_id,
		body: f.presenter.issue(record, { status }),
		editor: { login: "organizer", __typename: "User" },
		lastEditedAt: request.requestedAt,
		...overrides,
	};
	f.comments[0] = { ...comment, body: edit.body };
	f.edits.set(comment.node_id, edit);
	f.history.set(comment.node_id, [
		{ diff: edit.body, deletedAt: null, editor: edit.editor },
		...(f.history.get(comment.node_id) ?? []),
	]);
}

export const publicationRequest = {
	kind: "meetup-publication",
	revision: "b".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: request.requestedAt,
	publication: {
		url: "https://www.meetup.com/example/events/12345/",
		title: "Cloud Native Evening",
		startTime: "18:45",
		endTime: "20:45",
		timeZone: "Europe/Paris",
		venue: { name: "Public Venue", city: "Marseille" },
	},
} satisfies OrganizerApprovalRequest;

export const detailedRequest = {
	...request,
	recipientCount: 1,
	details: {
		emails: [
			{
				kind: "speaker-thanks" as const,
				recipientName: "Alex Example",
				links: [
					{
						kind: "feedback" as const,
						title: "Reliable platforms",
						url: "https://openfeedback.io/example/0/talk?displayVotes=true",
					},
				],
				omittedLinks: 0,
			},
		],
		omittedEmails: 0,
	},
};

export function createStoredApproval(input: OrganizerApprovalRequest) {
	return new ApprovalRecordFactory(
		{
			followUpApprovalPolicy: new FollowUpApprovalPolicy(),
			approvalRequestSchema:
				new GithubOrganizerApprovalComposition().approvalRequestSchema(),
			approvalRequestPolicy:
				new JourneyPolicyComposition().approvalRequestPolicy(),
			storedApprovalSchema:
				new GithubOrganizerApprovalComposition().storedApprovalSchema(),
		},
		() => "00000000-0000-4000-8000-000000000001",
	).create(input);
}
export function approvalDependencies(
	client: GithubApprovalClient,
	presenter: ApprovalPresenter,
	notificationPort: OrganizerApprovalNotification,
) {
	let sequence = 0;
	const records = new ApprovalRecordFactory(
		{
			followUpApprovalPolicy: new FollowUpApprovalPolicy(),
			approvalRequestSchema:
				new GithubOrganizerApprovalComposition().approvalRequestSchema(),
			approvalRequestPolicy:
				new JourneyPolicyComposition().approvalRequestPolicy(),
			storedApprovalSchema:
				new GithubOrganizerApprovalComposition().storedApprovalSchema(),
		},
		() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
	);
	const notifications = new ApprovalNotifications(
		new ApprovalNotificationPolicy(),
		client,
		presenter,
		notificationPort,
		"organizer-channel",
	);
	const repository = new GithubApprovalRepository(
		{
			approvalRequestPolicy:
				new JourneyPolicyComposition().approvalRequestPolicy(),
			storedApprovalSchema:
				new GithubOrganizerApprovalComposition().storedApprovalSchema(),
		},
		client,
		new TrustedApprovalState(
			{
				approvalCommentCodec:
					new GithubOrganizerApprovalComposition().approvalCommentCodec(),
			},
			client,
			"automation[bot]",
		),
		"automation[bot]",
		presenter,
	);
	const finalizer = new FinalizeApprovalDecision(
		new ResolveApprovalDecision(
			client,
			new ApprovalDecisionParser(
				new ContentTextPreview(),
				new ApprovalRequestPolicy(
					new DraftProposalComposition().fingerprints(),
				),
				new GithubOrganizerApprovalComposition()
					.approvalPresenterFactory()
					.supportedLocales(),
			),
		),
		repository,
		notifications,
	);
	return {
		repository,
		records,
		finalizer,
		notifications,
	};
}

export const communityRequest = {
	...publicationRequest,
	kind: "community-publication",
	publication: {
		...publicationRequest.publication,
		url: "https://community.example.test/dashboard/group/events/10000000-0000-4000-8000-000000000001/update",
	},
} satisfies OrganizerApprovalRequest;

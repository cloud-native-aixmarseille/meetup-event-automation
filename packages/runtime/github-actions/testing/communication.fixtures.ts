import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import type { CommunicationRuntime } from "../src/communication.js";

const temporaryRoots: string[] = [];
export async function cleanupCommunicationFixtures() {
	await Promise.all(
		temporaryRoots
			.splice(0)
			.map((root) => rm(root, { force: true, recursive: true })),
	);
}
export async function createWorkspace(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "meetup-communication-runtime-"));
	temporaryRoots.push(root);
	await mkdir(join(root, "referentials"), { recursive: true });
	await writeFile(
		join(root, "referentials", "hosting.csv"),
		`host_id,name,contact_id,contact,mail,phone,address
host-0001,Public Venue,contact-0001,Private Host Contact,host@example.invalid,,"1 Private Street"
host-0001,Public Venue,contact-0002,Opted Out Contact,host-opted-out@example.invalid,,"1 Private Street"
`,
		"utf8",
	);
	await writeFile(
		join(root, "referentials", "speakers.csv"),
		`speaker_id,firstname,lastname,company,mail,phone
speaker-0001,Ada,Speaker,Public Company,speaker@example.invalid,
`,
		"utf8",
	);
	return root;
}

export function runtimeInput(
	workspaceRoot: string,
	override: Partial<
		Parameters<typeof CommunicationRuntime.runCommunicationReconcile>[0]
	> = {},
): Parameters<typeof CommunicationRuntime.runCommunicationReconcile>[0] {
	return {
		issueNumber: 42,
		githubToken: "github-token",
		mailingsToken: "mailings-token",
		openFeedbackApiKey: "oforg_synthetic",
		slackToken: "slack-token",
		slackOrganizerChannelId: "organizer-channel-id",
		owner: "organization",
		repo: "meetups",
		managedCommentAuthor: "automation[bot]",
		slidesUrl: "https://docs.google.com/presentation/d/event-deck/edit",
		workspaceRoot,
		...override,
	};
}

export function githubClients(
	override: {
		labels?: readonly string[];
		eventDate?: string;
		body?: string;
	} = {},
) {
	const labels = override.labels ?? [
		"meetup",
		"hoster:confirmed",
		"speakers:confirmed",
	];
	const eventDate = override.eventDate ?? "2099-06-08";
	const comments: Array<{
		id: number;
		node_id?: string;
		editor?: { login: string; __typename: string };
		body: string;
		user: { login: string; type?: string };
		created_at?: string;
		updated_at?: string;
	}> = [];
	const history = new Map<
		string,
		Array<{
			diff: string;
			deletedAt: null;
			editor: { login: string; __typename: string };
		}>
	>();
	const issue = {
		number: 42,
		state: "open",
		title: `[Meetup] - ${eventDate} - Platform Night`,
		labels,
		body: override.body ?? eventBody(eventDate),
	};
	const getIssue = vi
		.fn()
		.mockImplementation(async () => ({ data: { ...issue } }));
	const updateIssue = vi.fn().mockImplementation(async (patch) => {
		Object.assign(issue, patch);
	});
	const createComment = vi.fn(async (parameters: { body: string }) => {
		comments.push({
			id: 100 + comments.length,
			node_id: `comment-${100 + comments.length}`,
			body: parameters.body,
			user: { login: "automation[bot]", type: "Bot" },
		});
		const created = comments.at(-1);
		if (created?.node_id)
			history.set(created.node_id, [
				{
					diff: parameters.body,
					deletedAt: null,
					editor: { login: "automation", __typename: "Bot" },
				},
			]);
		return { data: { id: 100 + comments.length - 1 } };
	});
	const updateComment = vi.fn(
		async (parameters: { comment_id: number; body: string }): Promise<void> => {
			const comment = comments.find(({ id }) => id === parameters.comment_id);
			if (!comment) throw new Error("missing synthetic comment");
			comment.body = parameters.body;
			comment.editor = { login: "automation[bot]", __typename: "Bot" };
			if (comment.node_id)
				history.set(comment.node_id, [
					{ diff: parameters.body, deletedAt: null, editor: comment.editor },
					...(history.get(comment.node_id) ?? []),
				]);
		},
	);
	const permission = vi
		.fn()
		.mockResolvedValue({ data: { permission: "write" } });
	const graphql = vi.fn().mockImplementation(async (_query, variables) => {
		const comment = comments.find(({ node_id }) => node_id === variables.id);
		return {
			node: comment
				? {
						id: comment.node_id,
						body: comment.body,
						editor: comment.editor,
						lastEditedAt: comment.updated_at ?? null,
						userContentEdits: {
							nodes: history.get(variables.id) ?? [],
							pageInfo: { hasNextPage: false, endCursor: null },
						},
					}
				: null,
		};
	});
	const github = {
		graphql,
		rest: {
			repos: { getCollaboratorPermissionLevel: permission },
			issues: {
				get: getIssue,
				update: updateIssue,
				listForRepo: vi.fn(),
				listComments: vi.fn().mockImplementation(async () => ({
					data: comments.map((comment) => ({ ...comment })),
					headers: {},
				})),
				createComment,
				updateComment,
			},
		},
	};
	const createDispatchEvent = vi.fn().mockResolvedValue({ status: 204 });
	const mailings = {
		rest: { repos: { createDispatchEvent } },
	};
	return {
		graphql,
		history,
		permission,
		comments,
		github,
		mailings,
		createComment,
		updateComment,
		createDispatchEvent,
		getIssue,
		updateIssue,
		issue,
	};
}

export function githubIssueResponse(
	eventDate: string,
	labels: readonly string[] = [
		"meetup",
		"hoster:confirmed",
		"speakers:confirmed",
	],
) {
	return {
		data: {
			number: 42,
			state: "open",
			title: `[Meetup] - ${eventDate} - Platform Night`,
			labels,
			body: eventBody(eventDate),
		},
	};
}

export function eventBody(eventDate: string): string {
	return `<!-- meetup-event-schema:1 -->
<!-- meetup-event-references:{"schemaVersion":2,"host":{"id":"host-0001","displayName":"Public Venue"},"speakers":[{"id":"speaker-0001","displayName":"Ada Speaker"}]} -->
### Event Title

Platform Night

### Event Date

${eventDate}

### Hoster

Public Venue

### Event Description

Public event description.

### Agenda

- Ada Speaker: A public talk

### Meetup Link

https://www.meetup.com/cloud-native-aix-marseille/events/123

### CNCF Link

https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/platform-night

### Drive Link

https://drive.google.com/drive/folders/public-event-assets

### OpenFeedback Link

https://openfeedback.io/event-1

### Communication

- [ ] Mail introduction
- [ ] Cover image
- [ ] Slack - Public Community

### Post event

- [ ] Mail thanks hoster
- [ ] Mail thanks speakers
- [ ] Share slides to meetup
- [ ] Sync attendees from tally sheet to CNCF
- [ ] Social networks
`;
}

export function approveBatch(
	fixture: ReturnType<typeof githubClients>,
	choice = "Approve",
) {
	const comment = fixture.comments.find((comment) =>
		comment.body.startsWith("<!-- meetup-organizer-approval:v1 "),
	);
	if (!comment) throw new Error("Missing synthetic approval");
	const record = JSON.parse(
		(comment.body.split("\n")[0] ?? "").slice(
			"<!-- meetup-organizer-approval:v1 ".length,
			-4,
		),
	);
	comment.body = comment.body.replace(
		`- [ ] ${choice} sending this batch`,
		`- [x] ${choice} sending this batch`,
	);
	comment.editor = { login: "organizer", __typename: "User" };
	comment.updated_at = record.requestedAt;
}

import {
	type SocialDeliveryRecord,
	type SocialDestination,
	type SocialDispatchResult,
	type SocialPostInput,
	SocialPostTiming,
} from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import { vi } from "vitest";
import type {
	OrganizerApprovalRequest,
	OrganizerApprovalResult,
} from "../src/ports/organizer-approval.js";
import type {
	ContentProposal,
	ContentTarget,
} from "../src/proposals/promotional-content.js";
import type { ContentContext } from "../src/review/content-workspace.js";
import { SocialPublicationComposition } from "../src/social-publication-composition.js";
import { event, sourceDocument } from "./meetup-journey.fixtures.js";
import {
	contentFixture,
	media,
	socialDestinations,
} from "./promotional-content.fixtures.js";

export async function socialFixture(
	target: ContentTarget = "slack-engineering:announcement",
) {
	const f = contentFixture(target);
	const plan = target.startsWith("linkedin:")
		? f.plans.create(
				target,
				"fr",
				{ ...f.plan.facts, announcement: media },
				"09:00",
				socialDestinations[1],
			)
		: f.plan;
	const draft = {
		text: `Meetup ${plan.facts.registrationUrl}`,
		media: target.startsWith("linkedin:") ? [media] : [],
	};
	const proposal: ContentProposal = {
		...f.proposal,
		plan,
		draft,
		revision: f.fingerprints.proposal({ ...f.proposal, plan }, draft),
		decision: {
			status: "approved",
			actor: "organizer",
			decidedAt: "2026-10-01T10:00:00Z",
		},
	};
	await f.store.save(await f.store.load(), [proposal]);
	const context: ContentContext = {
		document: sourceDocument,
		event: { ...event, date: plan.facts.date },
		plan,
		destination: null,
	};
	const destination = plan.destination;
	if (!destination) throw new Error("Fixture destination missing");
	const state: {
		now: string;
		destinations: readonly SocialDestination[];
		context: ContentContext | undefined;
	} = {
		now: "2026-10-20T12:00:00Z",
		destinations: socialDestinations,
		context,
	};
	const records = new Map<string, SocialDeliveryRecord>();
	const journal = {
		load: vi.fn(async (id: string) => records.get(id)),
		save: vi.fn(
			async (
				previous: SocialDeliveryRecord | undefined,
				next: SocialDeliveryRecord,
			) => {
				if (
					f.fingerprints.digest(previous) !==
					f.fingerprints.digest(records.get(next.intentId))
				)
					throw new Error("Concurrent journal mutation");
				records.set(next.intentId, next);
			},
		),
	};
	const publish = async (
		input: SocialPostInput,
		beforeWrite: () => Promise<void>,
	): Promise<SocialDispatchResult> => {
		await beforeWrite();
		const destination = input.destination;
		return {
			status: "accepted",
			receipt:
				destination.provider === "slack"
					? {
							provider: "slack",
							workspaceId: destination.workspaceId,
							channelId: destination.channelId,
							ts: "1792497600.000001",
						}
					: {
							provider: "linkedin",
							organizationUrn: destination.organizationUrn,
							postUrn: "urn:li:share:123",
						},
		};
	};
	const posts = { publish: vi.fn(publish) };
	const images = { prepare: vi.fn() };
	let serial = 0;
	const dependencies = {
		store: f.store,
		journal,
		workspace: {
			read: vi.fn(
				async (
					_identity: EventIdentity,
					_target: ContentTarget,
					_language: "en" | "fr",
				) => state.context,
			),
		},
		policy: f.policy,
		fingerprints: f.fingerprints,
		timing: new SocialPostTiming(),
		approvals: {
			request: vi.fn(
				async (
					_request: OrganizerApprovalRequest,
				): Promise<OrganizerApprovalResult> => ({
					status: "approved",
					notificationFailed: false,
					actor: "organizer",
					decidedAt: "2026-10-20T10:00:00Z",
				}),
			),
			synchronize: vi.fn(),
		},
		configuration: vi.fn(async () => state.destinations),
		canApprove: vi.fn(async (_actor: string) => true),
		gateways: new Map(
			socialDestinations.map((item) => [item.key, { posts, images }]),
		),
		imageLoader: {
			load: vi.fn(async () => ({
				bytes: new Uint8Array([1]),
				mimeType: "image/png" as const,
			})),
		},
		imageFingerprint: { of: vi.fn(() => media.fingerprint) },
		now: () => state.now,
		createId: () => `attempt-${++serial}`,
		completion: { record: vi.fn() },
	};
	const composition = new SocialPublicationComposition();
	return {
		...f,
		context,
		draft,
		destination,
		publish,
		proposal,
		plan,
		state,
		records,
		journal,
		posts,
		images,
		dependencies,
		useCase: composition.create(dependencies),
		recovery: composition.recovery(dependencies),
	};
}

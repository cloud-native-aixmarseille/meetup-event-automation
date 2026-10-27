import type { SocialDestination } from "@meetup-automation/communication";
import { SocialPostTiming } from "@meetup-automation/communication";
import { DraftProposalComposition } from "@meetup-automation/journey";
import type {
	ContentImageBytes,
	ContentMedia,
} from "@meetup-automation/publication";
import { vi } from "vitest";
import { ContentPlanFactory } from "../src/proposals/content-plan-factory.js";
import { ContentProposalFactory } from "../src/proposals/content-proposal-factory.js";
import type {
	ContentFacts,
	ContentProposal,
	ContentTarget,
	PromotionalContentSnapshot,
} from "../src/proposals/promotional-content.js";
export const socialDestinations: readonly SocialDestination[] = [
	{
		key: "slack-engineering",
		provider: "slack",
		label: "Engineering",
		workspaceId: "TEXAMPLE",
		channelId: "CEXAMPLE",
	},
	{
		key: "linkedin",
		provider: "linkedin",
		label: "Community Page",
		organizationUrn: "urn:li:organization:123",
	},
];
export const facts: ContentFacts = {
	date: "2026-10-28",
	startTime: "18:45",
	endTime: "21:00",
	timeZone: "Europe/Paris",
	month: "Octobre",
	host: { name: "Example Host", city: "Example City" },
	talks: [
		{
			id: "talk-one",
			title: "Observable clusters",
			abstract: "Telemetry for clusters.",
			speakers: [{ id: "speaker-one", name: "Example Speaker" }],
		},
	],
	registrationUrl: "https://www.meetup.com/example/events/123/",
	aperitif: true,
	mentions: ["Example Organizer"],
	announcement: null,
};
export const media: ContentMedia = {
	id: "image-one",
	url: "https://images.example.test/cover.png",
	fingerprint: "a".repeat(64),
	width: 1792,
	height: 1024,
	mimeType: "image/png",
	description: "Playful cloud creatures",
	sourceRevision: "1",
};
export function contentFixture(target: ContentTarget = "title") {
	const fingerprints = new DraftProposalComposition().fingerprints();
	const plans = new ContentPlanFactory(fingerprints, new SocialPostTiming());
	const plan = plans.create(
		target,
		"fr",
		facts,
		"09:00",
		socialDestinations.find((item) => target.startsWith(`${item.key}:`)),
	);
	const factory = new ContentProposalFactory(
		() => "00000000-0000-4000-8000-000000000001",
		() => "2026-09-20T12:00:00Z",
	);
	const proposal = factory.create(
		plan,
		{ kind: "ai", provider: "gemini", model: "synthetic-model" },
		"",
		"Previous title",
	);
	let snapshot: PromotionalContentSnapshot = {
		revision: fingerprints.digest([proposal]),
		proposals: [proposal],
	};
	const store = {
		load: vi.fn(async () => snapshot),
		save: vi.fn(
			async (
				previous: PromotionalContentSnapshot,
				proposals: readonly ContentProposal[],
			) => {
				if (previous.revision !== snapshot.revision)
					throw new Error("Concurrent update");
				snapshot = { revision: fingerprints.digest(proposals), proposals };
				return snapshot;
			},
		),
	};
	let count = 0;
	const images = {
		reserve: vi.fn(async () => `image-${++count}`),
		persist: vi.fn(
			async (id: string, _image: ContentImageBytes, _description: string) => ({
				...media,
				id,
			}),
		),
		read: vi.fn(),
		verify: vi.fn(async () => true),
	};
	const textGenerator = {
		supported: vi.fn(() => true),
		provider: "gemini",
		model: "synthetic-model",
		generate: vi.fn(
			async (_brief: import("../src/ports/generation.js").GenerationBrief) =>
				"Kubernetes : observer et comprendre",
		),
	};
	const imageGenerator = {
		supported: vi.fn(() => true),
		provider: "gemini",
		model: "synthetic-model",
		generate: vi.fn(
			async (
				_brief: import("../src/ports/generation.js").ImageGenerationBrief,
			) => ({
				bytes: new Uint8Array([1]),
				mimeType: "image/png" as const,
			}),
		),
	};
	return {
		plan,
		proposal,
		store,
		images,
		textGenerator,
		imageGenerator,
		fingerprints,
		plans,
		factory,
		policy: new DraftProposalComposition().policy(),
	};
}

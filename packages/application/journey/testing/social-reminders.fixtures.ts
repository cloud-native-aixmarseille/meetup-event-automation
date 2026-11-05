import { SocialPostTiming } from "@meetup-automation/communication";
import { MeetupPublicationChecklist } from "@meetup-automation/event";
import { vi } from "vitest";
import { PrepareSocialReminders } from "../src/communication/prepare-social-reminders.js";
import { SocialReminderPlans } from "../src/communication/social-reminder-plans.js";
import { DraftProposalComposition } from "../src/draft-proposal-composition.js";
import { ContentProposalFactory } from "../src/proposals/content-proposal-factory.js";
import { GenerateTextProposal } from "../src/proposals/generate-text-proposal.js";
import { PreparePromotionalContent } from "../src/proposals/prepare-promotional-content.js";
import type { ContentWorkspace } from "../src/review/content-workspace.js";
import { event, sourceDocument } from "./meetup-journey.fixtures.js";
import {
	contentFixture,
	facts,
	media,
	socialDestinations,
} from "./promotional-content.fixtures.js";

export async function remindersFixture() {
	const f = contentFixture("slack-engineering:d0");
	await f.store.save(await f.store.load(), []);
	const state = {
		now: "2026-10-20T12:00:00Z",
		active: true,
		published: true,
		facts: { ...facts, announcement: media },
	};
	const publication = new MeetupPublicationChecklist();
	const workspace = {
		read: vi.fn<ContentWorkspace["read"]>(
			async (_identity, target, language) => {
				if (!state.active) return undefined;
				return {
					document: sourceDocument,
					event: publication.withStatus(
						{ ...event, date: state.facts.date, occurrenceStatus: "scheduled" },
						state.published,
					),
					plan: f.plans.create(
						target,
						language,
						state.facts,
						"09:00",
						socialDestinations.find((d) => target.startsWith(`${d.key}:`)),
					),
					destination: null,
				};
			},
		),
	};
	const planner = new SocialReminderPlans(
		workspace,
		new SocialPostTiming(),
		publication,
		"fr",
		() => state.now,
	);
	let serial = 0;
	const factory = new ContentProposalFactory(
		() => `proposal-${++serial}`,
		() => state.now,
	);
	const prepare = new PreparePromotionalContent(
		f.store,
		factory,
		f.policy,
		async () => true,
	);
	f.textGenerator.generate.mockResolvedValue(
		`Ce soir, meetup. Inscription sur Meetup.com : ${facts.registrationUrl}\n@Example Host - @Example Speaker - @Example Organizer`,
	);
	const generate = new GenerateTextProposal(
		f.store,
		f.textGenerator,
		f.fingerprints,
		f.policy,
		new DraftProposalComposition().socialPosts(),
	);
	return {
		...f,
		state,
		workspace,
		planner,
		origin: {
			kind: "ai",
			provider: "gemini",
			model: "synthetic-model",
		} as const,
		prepare: new PrepareSocialReminders(
			planner,
			f.store,
			prepare,
			generate,
			f.policy,
		),
	};
}

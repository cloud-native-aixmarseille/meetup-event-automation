import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { vi } from "vitest";
import type { AttentionFacts } from "../src/attention/evaluate-attention.js";
import type {
	AttentionCondition,
	AttentionObservation,
	AttentionState,
	AttentionView,
} from "../src/attention/model.js";
import { ReconcileAttention } from "../src/attention/reconcile-attention.js";
export function condition(
	overrides: Partial<AttentionCondition> = {},
): AttentionCondition {
	return {
		key: "host-confirmation:host",
		code: "host-confirmation",
		resource: "host",
		owner: "event",
		severity: "warning",
		policy: "preparation",
		...overrides,
	};
}
export function observation(
	overrides: Partial<AttentionObservation> = {},
): AttentionObservation {
	return {
		eventDate: "2099-06-08",
		stopped: false,
		conditions: [condition()],
		evaluated: [
			"event",
			"assets",
			"feedback",
			"communications",
			"approvals",
			"delivery",
		],
		...overrides,
	};
}
export function facts(overrides: Partial<AttentionFacts> = {}): AttentionFacts {
	return {
		eventDate: "2099-06-08",
		closed: false,
		occurrence: "scheduled",
		requiredDataMissing: false,
		hostConfirmed: true,
		speakersConfirmed: true,
		publicationPending: [],
		followUpPending: [],
		stages: [],
		approvals: [],
		recovery: [],
		...overrides,
	};
}
export function reconciliationFixture() {
	let saved: AttentionState | undefined;
	let now = new Date("2099-06-01T10:00:00Z");
	const repository = {
		load: vi.fn(async () => structuredClone(saved)),
		save: vi.fn(async (state: AttentionState) => {
			saved = structuredClone(state);
		}),
	};
	const notification = {
		fingerprint: vi.fn((view: AttentionView) =>
			JSON.stringify(
				view.conditions.map((item) => [item.condition.key, item.status]),
			),
		),
		post: vi.fn(async (_view: AttentionView) => ({
			outcome: "accepted" as const,
			message: { destination: "C123", messageId: "123.456" },
		})),
		update: vi.fn(async (_message: unknown, _view: AttentionView) => true),
	};
	return {
		repository,
		notification,
		useCase: new ReconcileAttention(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionEpisodes:
					new CommunicationDomainComposition().attentionEpisodes(),
			},
			repository,
			notification,
			{
				now: () => now,
			},
		),
		state: () => structuredClone(saved),
		time: (value: string) => {
			now = new Date(value);
		},
	};
}

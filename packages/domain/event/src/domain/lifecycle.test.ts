import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../testing/event.fixtures.js";
import { EventDomainComposition } from "../dependency-composition.js";
import { EventLifecycle } from "./lifecycle.js";
import { EXPECTED_POST_EVENT_TASK_NAMES } from "./model.js";

describe("EventLifecycle", () => {
	it("does not infer held from a past event date", () => {
		// Arrange
		const event = createTestEvent({
			date: "2020-01-01",
			occurrenceStatus: "scheduled",
		});

		// Act
		const readiness = new EventDomainComposition()
			.eventReadinessPolicy()
			.evaluateEventReadiness(event, []);
		const lifecycle = new EventLifecycle({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).evaluateEventLifecycle({
			event,
			readiness,
			now: "2030-01-01T00:00:00Z",
		});

		// Assert
		expect(readiness.status).toBe("ready");
		expect(lifecycle.state).toBe("ready");
		expect(lifecycle.evaluatedAt).toBe("2030-01-01T00:00:00Z");
	});
	it.each([
		["postponed", "postponed"],
		["cancelled", "cancelled"],
		["held", "held"],
	] as const)("derives %s occurrence as %s", (occurrenceStatus, expected) => {
		// Arrange
		const event = createTestEvent({ occurrenceStatus });

		// Act
		const lifecycle = new EventLifecycle({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).evaluateEventLifecycle({
			event,
			readiness: new EventDomainComposition()
				.eventReadinessPolicy()
				.evaluateEventReadiness(event, []),
			now: "2026-09-04T10:00:00+02:00",
		});

		// Assert
		expect(lifecycle.state).toBe(expected);
	});
	it("derives follow-up completion from the exact checklist", () => {
		// Arrange
		const event = createTestEvent({
			occurrenceStatus: "held",
			followUpComplete: true,
			operationalChecklists: {
				slidesAndContent: [],
				communication: [],
				postEvent: EXPECTED_POST_EVENT_TASK_NAMES.map((name) => ({
					name,
					completed: true,
				})),
			},
		});

		// Act
		const state = new EventLifecycle({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).evaluateEventLifecycle({
			event,
			readiness: new EventDomainComposition()
				.eventReadinessPolicy()
				.evaluateEventReadiness(event, []),
			now: "2026-09-04T10:00:00+02:00",
		}).state;

		// Assert
		expect(state).toBe("follow-up-complete");
	});
	it("does not trust a legacy completion flag without the exact checklist", () => {
		// Arrange
		const event = createTestEvent({
			occurrenceStatus: "held",
			followUpComplete: true,
			operationalChecklists: {
				slidesAndContent: [],
				communication: [],
				postEvent: [{ name: "Mail thanks hoster", completed: true }],
			},
		});

		// Act
		const state = new EventLifecycle({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).evaluateEventLifecycle({
			event,
			readiness: new EventDomainComposition()
				.eventReadinessPolicy()
				.evaluateEventReadiness(event, []),
			now: "2026-09-04T10:00:00+02:00",
		}).state;

		// Assert
		expect(state).toBe("held");
	});
	it("keeps a minimally populated event in draft", () => {
		// Arrange
		const event = createTestEvent({
			eventTitle: "",
			date: "",
			occurrenceStatus: undefined,
		});

		// Act
		const lifecycle = new EventLifecycle({
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
		}).evaluateEventLifecycle({
			event,
			readiness: new EventDomainComposition()
				.eventReadinessPolicy()
				.evaluateEventReadiness(event, []),
			now: "2026-09-04T10:00:00+02:00",
		});

		// Assert
		expect(lifecycle.state).toBe("draft");
	});
});

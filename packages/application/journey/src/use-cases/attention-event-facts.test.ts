import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { EventDomainComposition } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { createTestEvent } from "../../../../domain/event/testing/event.fixtures.js";
import {
	createPublicationUrlPolicyEngine,
	event as publishedEvent,
} from "../../testing/meetup-journey.fixtures.js";
import { JourneyPolicyComposition } from "../policy-composition.js";
import { AttentionEventFacts } from "./attention-event-facts.js";

describe("public attention event facts", () => {
	it.each([true, false])(
		"uses supplied publication URL rules for missing-data attention: %s",
		(allowed) => {
			// Arrange
			const event = {
				...publishedEvent,
				occurrenceStatus: "scheduled" as const,
			};
			const meetupEventUrlPrefix = allowed
				? "https://www.meetup.com/example-meetups/events/"
				: "https://www.meetup.com/another-group/events/";

			// Act
			const result = new AttentionEventFacts({
				eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
				eventPublicationEvaluation:
					new JourneyPolicyComposition().eventPublicationEvaluation(
						createPublicationUrlPolicyEngine(meetupEventUrlPrefix),
					),
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				communicationChecklist:
					new JourneyPolicyComposition().communicationChecklist(),
				createEventRuleEngine: (...args) =>
					new EventDomainComposition().eventRuleEngine(...args),
			}).create({ event, diagnostics: [] });

			// Assert
			expect(result.requiredDataMissing).toBe(!allowed);
		},
	);

	it.each([
		"Thanks speakers",
		"Thanks speakers and share openfeedback reports",
	])("recognizes completed legacy email tasks: %s", (speakerTask) => {
		// Arrange
		const event = createTestEvent({
			publicationLinks: publishedEvent.publicationLinks,
			operationalChecklists: {
				communication: [],
				slidesAndContent: [],
				postEvent: [
					{ name: "Thanks hoster", completed: true },
					{ name: speakerTask, completed: true },
				],
			},
		});

		// Act
		const result = new AttentionEventFacts({
			eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
			eventPublicationEvaluation:
				new JourneyPolicyComposition().eventPublicationEvaluation(
					createPublicationUrlPolicyEngine(),
				),
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			communicationChecklist:
				new JourneyPolicyComposition().communicationChecklist(),
			createEventRuleEngine: (...args) =>
				new EventDomainComposition().eventRuleEngine(...args),
		}).create({ event, diagnostics: [] });

		// Assert
		expect(result.followUpPending).toEqual([
			"import-attendance",
			"share-social",
		]);
	});
	it("leaves announcement tasks to social automation without manual publication reminders", () => {
		// Arrange
		const event = createTestEvent({
			publicationLinks: publishedEvent.publicationLinks,
			operationalChecklists: {
				slidesAndContent: [],
				communication: [
					{ name: "Slack - OpenBaR", completed: false },
					{ name: "LinkedIn", completed: false },
					{ name: "Social networks", completed: false },
					{ name: "Slack - AixMarseille.Tech", completed: true },
					{ name: "private@example.test", completed: false },
				],
				postEvent: [],
			},
		});

		// Act
		const result = new AttentionEventFacts({
			eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
			eventPublicationEvaluation:
				new JourneyPolicyComposition().eventPublicationEvaluation(
					createPublicationUrlPolicyEngine(),
				),
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			communicationChecklist:
				new JourneyPolicyComposition().communicationChecklist(),
			createEventRuleEngine: (...args) =>
				new EventDomainComposition().eventRuleEngine(...args),
		}).create({ event, diagnostics: [] });

		// Assert
		expect(
			result.publicationPending.filter((task) => task.startsWith("public-")),
		).toEqual([]);
		expect(result.hostConfirmed).toBe(true);
		expect(result.followUpPending).toContain("thank-host");
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});
	it("projects invalid imported dates as missing data without publishing their text", () => {
		// Arrange
		const event = createTestEvent({
			publicationLinks: publishedEvent.publicationLinks,
			date: "private@example.test",
		});

		// Act
		const result = new AttentionEventFacts({
			eventRuleFactory: new EventDomainComposition().eventRuleFactory(),
			eventPublicationEvaluation:
				new JourneyPolicyComposition().eventPublicationEvaluation(
					createPublicationUrlPolicyEngine(),
				),
			attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
			communicationChecklist:
				new JourneyPolicyComposition().communicationChecklist(),
			createEventRuleEngine: (...args) =>
				new EventDomainComposition().eventRuleEngine(...args),
		}).create({ event, diagnostics: [] });

		// Assert
		expect(result.eventDate).toBe("");
		expect(result.requiredDataMissing).toBe(true);
	});
});

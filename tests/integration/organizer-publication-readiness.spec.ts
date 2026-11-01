import { describe, expect, it } from "vitest";
import { JourneyPolicyComposition } from "../../packages/application/journey/src/policy-composition.js";
import { attentionReports } from "../../packages/application/journey/testing/attention-reports.fixtures.js";
import { CommunicationDomainComposition } from "../../packages/domain/communication/src/dependency-composition.js";
import {
	condition,
	facts,
	observation,
} from "../../packages/domain/communication/testing/attention.fixtures.js";

describe("organizer publication readiness", () => {
	it("clears stale audit warnings while preserving the pending publication task through a social audit", () => {
		// Arrange
		const domain = new CommunicationDomainComposition();
		const episodes = domain.attentionEpisodes();
		const evaluation =
			new JourneyPolicyComposition().attentionStageEvaluation();
		const now = new Date("2099-06-01T10:00:00Z");
		const previous = episodes.reconcile(
			undefined,
			observation({
				conditions: (["required-data", "stage-unknown"] as const).map((code) =>
					condition({
						key: `${code}:event`,
						code,
						resource: "event",
					}),
				),
			}),
			now,
		);
		const event = facts({ publicationPending: ["publish-community-event"] });
		const reports = attentionReports({
			event: {
				diagnostics: [
					{
						code: "publication.community.missing",
						severity: "warning",
						message: "Community event link missing.",
					},
				],
			},
		});

		// Act
		const completed = episodes.reconcile(
			previous,
			domain.evaluateAttention().execute(
				{
					...event,
					stages: evaluation.evaluate(reports),
				},
				now,
			),
			now,
		);
		const social = episodes.reconcile(
			completed,
			domain.evaluateAttention().execute(
				{
					...event,
					stages: evaluation.evaluate({
						social: {
							outcome: "success",
							reported: true,
							diagnostics: [],
						},
					}),
				},
				now,
			),
			now,
		);

		// Assert
		for (const state of [completed, social]) {
			expect(
				domain
					.attentionPolicy()
					.view(state)
					.conditions.map((episode) => episode.condition.key),
			).toEqual(["manual-publication:publish-community-event"]);
		}
	});
});

import { FeedbackResolutionError } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import { agenda, snapshot } from "../testing/feedback-agenda.fixtures.js";
import { OpenfeedbackEventGatewayComposition } from "./dependency-composition.js";
import { OpenFeedbackAgendaPlan } from "./openfeedback-agenda-plan.js";

describe("feedback agenda identities", () => {
	it("preserves proposal identities when multiple talks by the same speaker are renamed", () => {
		// Arrange
		const key = "example/meetups#12";
		const selected = {
			talks: [
				{ ...agenda.talks[0], sourceIdentity: "conference-hall:cfp:first" },
				{
					...agenda.talks[0],
					title: "Another talk",
					sourceIdentity: "conference-hall:cfp:second",
				},
			],
		};
		const created = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create(key, selected, {
			speakers: [],
			talks: [],
		});
		const changed = {
			talks: selected.talks.map((talk, index) => ({
				...talk,
				title: `Renamed ${index}`,
			})),
		};

		// Act
		const result = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create(key, changed, created);

		// Assert
		expect(result.talks.map((talk) => talk.id)).toEqual(
			created.talks.map((talk) => talk.id),
		);
		expect(result.talks.map((talk) => talk.title)).toEqual([
			"Renamed 0",
			"Renamed 1",
		]);
	});

	it("adopts existing matching talks and speakers without changing their IDs", () => {
		// Arrange
		const key = "example/meetups#12";

		// Act
		const result = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create(key, agenda, snapshot);

		// Assert
		expect(result).toEqual(snapshot);
	});

	it("preserves an existing talk ID when its title changes", () => {
		// Arrange
		const changed = {
			talks: [{ ...agenda.talks[0], title: "Operating platforms" }],
		};

		// Act
		const result = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", changed, snapshot);

		// Assert
		expect(result.talks).toEqual([
			{ ...snapshot.talks[0], title: "Operating platforms" },
		]);
	});

	it("keeps newly created identities stable on retries and after a speaker rename", () => {
		// Arrange
		const empty = { ...snapshot, talks: [], speakers: [] };
		const renamed = {
			talks: [
				{
					...agenda.talks[0],
					speakers: [{ id: "speaker-0001", name: "Alex Renamed" }],
				},
			],
		};

		// Act
		const created = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", agenda, empty);
		const retried = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", agenda, empty);
		const updated = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", renamed, created);

		// Assert
		expect(retried).toEqual(created);
		expect(updated.talks).toEqual(created.talks);
		expect(updated.speakers).toEqual([
			{ ...created.speakers[0], name: "Alex Renamed" },
		]);
	});

	it("preserves the talk ID when a uniquely titled talk changes speakers", () => {
		// Arrange
		const changed = {
			talks: [
				{
					...agenda.talks[0],
					speakers: [{ id: "speaker-0002", name: "Sam Example" }],
				},
			],
		};

		// Act
		const result = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", changed, snapshot);

		// Assert
		expect(result.talks).toEqual([
			{ ...snapshot.talks[0], speakers: [result.speakers[0].id] },
		]);
		expect(result.speakers[0].name).toBe("Sam Example");
	});

	it("rejects ambiguous speaker changes for talks sharing a title", () => {
		// Arrange
		const changed = {
			talks: [
				{
					...agenda.talks[0],
					speakers: [{ id: "speaker-0002", name: "Sam Example" }],
				},
			],
		};
		const current = {
			...snapshot,
			talks: [...snapshot.talks, { ...snapshot.talks[0], id: "second-talk" }],
		};

		// Act
		const plan = () =>
			new OpenFeedbackAgendaPlan({
				openFeedbackRecordEquality:
					new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
			}).create("example/meetups#12", changed, current);

		// Assert
		expect(plan).toThrow(new FeedbackResolutionError("conflict"));
	});

	it("rejects two source identities matching the same remote speaker", () => {
		// Arrange
		const changed = {
			talks: [
				{
					...agenda.talks[0],
					speakers: [
						agenda.talks[0].speakers[0],
						{ id: "speaker-0002", name: "Alex Example" },
					],
				},
			],
		};

		// Act
		const plan = () =>
			new OpenFeedbackAgendaPlan({
				openFeedbackRecordEquality:
					new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
			}).create("example/meetups#12", changed, snapshot);

		// Assert
		expect(plan).toThrow(new FeedbackResolutionError("conflict"));
	});

	it("supports several talks by the same speaker and preserves IDs after reordering", () => {
		// Arrange
		const original = {
			talks: [agenda.talks[0], { ...agenda.talks[0], title: "Delivery" }],
		};
		const empty = { ...snapshot, talks: [], speakers: [] };

		// Act
		const created = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", original, empty);
		const reordered = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create(
			"example/meetups#12",
			{ talks: [...original.talks].reverse() },
			created,
		);

		// Assert
		expect(new Set(created.talks.map((talk) => talk.id)).size).toBe(2);
		expect(reordered.talks).toEqual([...created.talks].reverse());
	});

	it("rejects ambiguous simultaneous title changes without assigning votes to another talk", () => {
		// Arrange
		const current = {
			...snapshot,
			talks: [
				snapshot.talks[0],
				{ ...snapshot.talks[0], id: "second-talk", title: "Delivery" },
			],
		};
		const changed = {
			talks: [
				{ ...agenda.talks[0], title: "New subject" },
				{ ...agenda.talks[0], title: "Another subject" },
			],
		};

		// Act
		const plan = () =>
			new OpenFeedbackAgendaPlan({
				openFeedbackRecordEquality:
					new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
			}).create("example/meetups#12", changed, current);

		// Assert
		expect(plan).toThrow(new FeedbackResolutionError("conflict"));
	});

	it("rejects duplicate names in the remote speaker catalog", () => {
		// Arrange
		const current = {
			...snapshot,
			speakers: [
				...snapshot.speakers,
				{ id: "duplicate", name: "Alex Example" },
			],
		};

		// Act
		const plan = () =>
			new OpenFeedbackAgendaPlan({
				openFeedbackRecordEquality:
					new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
			}).create("example/meetups#12", agenda, current);

		// Assert
		expect(plan).toThrow(new FeedbackResolutionError("conflict"));
	});

	it("does not include unrelated remote records in updates", () => {
		// Arrange
		const current = {
			...snapshot,
			talks: [
				...snapshot.talks,
				{ id: "other-talk", title: "Separate talk", speakers: [] },
			],
		};

		// Act
		const result = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", agenda, current);

		// Assert
		expect(result).toEqual(snapshot);
	});

	it("rejects duplicate source talks instead of creating duplicate polls", () => {
		// Arrange
		const duplicated = { talks: [agenda.talks[0], agenda.talks[0]] };

		// Act
		const plan = () =>
			new OpenFeedbackAgendaPlan({
				openFeedbackRecordEquality:
					new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
			}).create("example/meetups#12", duplicated, snapshot);

		// Assert
		expect(plan).toThrow(new FeedbackResolutionError("conflict"));
	});

	it("does not overwrite a generated ID whose title and speakers were both changed", () => {
		// Arrange
		const empty = { ...snapshot, talks: [], speakers: [] };

		// Act
		const created = new OpenFeedbackAgendaPlan({
			openFeedbackRecordEquality:
				new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
		}).create("example/meetups#12", agenda, empty);
		const remote = {
			...created,
			talks: [{ ...created.talks[0], title: "Separate topic", speakers: [] }],
		};
		const plan = () =>
			new OpenFeedbackAgendaPlan({
				openFeedbackRecordEquality:
					new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
			}).create("example/meetups#12", agenda, remote);

		// Assert
		expect(plan).toThrow(new FeedbackResolutionError("conflict"));
	});
});

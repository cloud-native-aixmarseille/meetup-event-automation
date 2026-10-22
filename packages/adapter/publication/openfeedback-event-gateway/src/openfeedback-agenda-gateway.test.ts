import { describe, expect, it, vi } from "vitest";
import {
	agenda,
	revision,
	speakerPage,
	talkPage,
} from "../testing/feedback-agenda.fixtures.js";
import { OpenfeedbackEventGatewayComposition } from "./dependency-composition.js";
import { OpenFeedbackAgendaGateway } from "./openfeedback-agenda-gateway.js";
import { OpenFeedbackClient } from "./openfeedback-client.js";
import { OpenFeedbackRecordsGateway } from "./openfeedback-records-gateway.js";

describe("feedback agenda synchronization", () => {
	it("reuses imported identities while preserving unrelated incomplete records", async () => {
		// Arrange
		const speakerId = "speaker:Aléx #1";
		const talkId = "session:Platforms #1";
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					...speakerPage,
					speakers: [
						{ ...speakerPage.speakers[0], id: speakerId },
						{ id: "unnamed", revision },
					],
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					...talkPage,
					talks: [
						{ ...talkPage.talks[0], id: talkId, speakers: [speakerId] },
						{ id: "untitled", revision, speakers: ["deleted-speaker"] },
					],
				}),
			)
			.mockResolvedValueOnce(Response.json({ id: talkId }));
		const gateway = new OpenFeedbackAgendaGateway(
			{
				openFeedbackAgendaSnapshot:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaPlan(),
			},
			new OpenFeedbackRecordsGateway(
				{
					openFeedbackResponse:
						new OpenfeedbackEventGatewayComposition().openFeedbackResponse(),
					openFeedbackRecordEquality:
						new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
					openFeedbackResourceId:
						new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
				},
				new OpenFeedbackClient("oforg_synthetic", fetcher),
			),
		);
		const changed = { talks: [{ ...agenda.talks[0], title: "Updated topic" }] };

		// Act
		await gateway.synchronize("event-1", "example/meetups#12", changed);

		// Assert
		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(fetcher).toHaveBeenLastCalledWith(
			"https://api.openfeedback.io/events/event-1/talks/session%3APlatforms%20%231",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({
					title: "Updated topic",
					speakers: [speakerId],
					revision,
				}),
			}),
		);
	});

	it("leaves unchanged talks and speakers untouched", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(speakerPage))
			.mockResolvedValueOnce(Response.json(talkPage));
		const gateway = new OpenFeedbackAgendaGateway(
			{
				openFeedbackAgendaSnapshot:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaPlan(),
			},
			new OpenFeedbackRecordsGateway(
				{
					openFeedbackResponse:
						new OpenfeedbackEventGatewayComposition().openFeedbackResponse(),
					openFeedbackRecordEquality:
						new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
					openFeedbackResourceId:
						new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
				},
				new OpenFeedbackClient("oforg_synthetic", fetcher),
			),
		);

		// Act
		await gateway.synchronize("event-1", "example/meetups#12", agenda);

		// Assert
		expect(
			fetcher.mock.calls.map(([url, options]) => [url, options?.method]),
		).toEqual([
			["https://api.openfeedback.io/events/event-1/speakers?limit=100", "GET"],
			["https://api.openfeedback.io/events/event-1/talks?limit=100", "GET"],
		]);
	});

	it("updates the matching talk using that talk's revision", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(speakerPage))
			.mockResolvedValueOnce(Response.json(talkPage))
			.mockResolvedValueOnce(Response.json({ id: "manual-talk" }));
		const gateway = new OpenFeedbackAgendaGateway(
			{
				openFeedbackAgendaSnapshot:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaPlan(),
			},
			new OpenFeedbackRecordsGateway(
				{
					openFeedbackResponse:
						new OpenfeedbackEventGatewayComposition().openFeedbackResponse(),
					openFeedbackRecordEquality:
						new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
					openFeedbackResourceId:
						new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
				},
				new OpenFeedbackClient("oforg_synthetic", fetcher),
			),
		);
		const changed = { talks: [{ ...agenda.talks[0], title: "Updated topic" }] };

		// Act
		await gateway.synchronize("event-1", "example/meetups#12", changed);
		const payload = JSON.parse(fetcher.mock.calls[2][1]?.body as string);

		// Assert
		expect(payload).toEqual({
			revision,
			title: "Updated topic",
			speakers: ["manual-speaker"],
		});
		expect(fetcher.mock.calls[2][0]).toBe(
			"https://api.openfeedback.io/events/event-1/talks/manual-talk",
		);
		expect(fetcher.mock.calls[2][1]?.method).toBe("PATCH");
	});

	it("recovers after speaker creation succeeds and talk creation fails", async () => {
		// Arrange
		const key = "example/meetups#12";
		const planned = new OpenfeedbackEventGatewayComposition()
			.openFeedbackAgendaPlan()
			.create(key, agenda, {
				speakers: [],
				talks: [],
			});
		const speaker = planned.speakers[0];
		const talk = planned.talks[0];
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json({ ...speakerPage, speakers: [] }))
			.mockResolvedValueOnce(Response.json({ ...talkPage, talks: [] }))
			.mockResolvedValueOnce(Response.json({ id: speaker.id }, { status: 201 }))
			.mockResolvedValueOnce(new Response("private details", { status: 500 }))
			.mockResolvedValueOnce(
				Response.json({ ...speakerPage, speakers: [{ ...speaker, revision }] }),
			)
			.mockResolvedValueOnce(Response.json({ ...talkPage, talks: [] }))
			.mockResolvedValueOnce(Response.json({ id: talk.id }, { status: 201 }));
		const gateway = new OpenFeedbackAgendaGateway(
			{
				openFeedbackAgendaSnapshot:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaPlan(),
			},
			new OpenFeedbackRecordsGateway(
				{
					openFeedbackResponse:
						new OpenfeedbackEventGatewayComposition().openFeedbackResponse(),
					openFeedbackRecordEquality:
						new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
					openFeedbackResourceId:
						new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
				},
				new OpenFeedbackClient("oforg_synthetic", fetcher),
			),
		);

		// Act
		const firstAttempt = gateway.synchronize("event-1", key, agenda);

		// Assert
		await expect(firstAttempt).rejects.toThrow(
			"OpenFeedback request failed (HTTP 500)",
		);
		expect(fetcher).toHaveBeenCalledTimes(4);

		// Act
		await gateway.synchronize("event-1", key, agenda);
		const writes = fetcher.mock.calls.filter(
			([, options]) => options?.method === "POST",
		);

		// Assert
		expect(writes.map(([url]) => url)).toEqual([
			"https://api.openfeedback.io/events/event-1/speakers",
			"https://api.openfeedback.io/events/event-1/talks",
			"https://api.openfeedback.io/events/event-1/talks",
		]);
		expect(JSON.parse(writes[2][1]?.body as string)).toEqual(talk);
		expect(talk.speakers).toEqual([speaker.id]);
	});

	it("resolves all identities before writing any records", async () => {
		// Arrange
		const duplicated = {
			...speakerPage,
			speakers: [
				...speakerPage.speakers,
				{ ...speakerPage.speakers[0], id: "duplicate" },
			],
		};
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(duplicated))
			.mockResolvedValueOnce(Response.json(talkPage));
		const gateway = new OpenFeedbackAgendaGateway(
			{
				openFeedbackAgendaSnapshot:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaSnapshot(),
				openFeedbackAgendaPlan:
					new OpenfeedbackEventGatewayComposition().openFeedbackAgendaPlan(),
			},
			new OpenFeedbackRecordsGateway(
				{
					openFeedbackResponse:
						new OpenfeedbackEventGatewayComposition().openFeedbackResponse(),
					openFeedbackRecordEquality:
						new OpenfeedbackEventGatewayComposition().openFeedbackRecordEquality(),
					openFeedbackResourceId:
						new OpenfeedbackEventGatewayComposition().openFeedbackResourceId(),
				},
				new OpenFeedbackClient("oforg_synthetic", fetcher),
			),
		);

		// Act
		const operation = gateway.synchronize(
			"event-1",
			"example/meetups#12",
			agenda,
		);

		// Assert
		await expect(operation).rejects.toThrow(
			"ambiguous talk or speaker identities",
		);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});

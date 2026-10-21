import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getOctokit } from "@actions/github";
import type {
	EventCommentRepository,
	EventDocument,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	AutomationConfigFactory,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import {
	type ReferentialRepository,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunicationComposition } from "./communication-composition.js";
import { SERVICES } from "./composition.js";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
	);
	vi.unstubAllGlobals();
});

async function fixture(selected = true) {
	const workspaceRoot = await mkdtemp(
		join(tmpdir(), "source-profile-composition-"),
	);
	roots.push(workspaceRoot);
	await writeFile(
		join(workspaceRoot, "hosts.csv"),
		"host_id,name,contact_id,contact,mail,phone,address\nhost-0001,Example Venue,contact-0001,Private Contact,host@example.test,,Private Address\n",
	);
	const csv =
		"speaker_id,display_name,firstname,lastname,company,mail,phone,picture_url,source_provider,source_event,source_speaker_id\nspeaker-0001,Old Name,Old,Name,Old Company,old@example.test,local phone,https://example.test/old.png,conference-hall,example-cfp,source-one\n";
	await writeFile(join(workspaceRoot, "speakers.csv"), csv);
	const identity = { repository: "example/events", issueNumber: 42 };
	let document: EventDocument = {
		identity,
		issueState: "open",
		issueTitle: "Example Meetup",
		labels: ["meetup"],
		body: `### Event Title\n\nExample Meetup\n\n### Event Date\n\n2026-11-05\n\n### Hoster\n\nExample Venue\n\n### Event Description\n\nExample\n\n### Agenda\n\n- Old Name [speaker-0001]: Old talk\n${selected ? "\n### Conference Hall proposals\n\n17\n" : ""}`,
	};
	const repository: EventRepository = {
		find: vi.fn(async () => document),
		listPage: vi.fn(),
		applyPatch: vi.fn(async (_identity, patch) => {
			document = { ...document, ...patch };
		}),
	};
	const create = () => {
		const container = CommunicationComposition.createCommunicationContainer({
			client: getOctokit("synthetic-test-token"),
			owner: "example",
			repo: "events",
			issueNumber: 42,
			commentAuthorLogin: "automation[bot]",
			workspaceRoot,
			repositoryRef: "local-revision",
			conferenceHallEvent: "example-cfp",
			conferenceHallApiKey: "synthetic-source-key",
			mailingsToken: "synthetic-mailings-token",
			slackToken: "",
			slackOrganizerChannelId: "synthetic-channel",
			config: {
				...AutomationConfigFactory.createAutomationConfig("example"),
				referentials: { hosts: "hosts.csv", speakers: "speakers.csv" },
			},
		});
		container
			.rebind<EventRepository>(SERVICES.eventRepository)
			.toConstantValue(repository);
		container
			.rebind<EventCommentRepository>(SERVICES.eventCommentRepository)
			.toConstantValue({
				reconcileDiagnostics: vi.fn().mockResolvedValue({ changed: false }),
			});
		return container;
	};
	return { create, identity, document: () => document, workspaceRoot, csv };
}

function response(name: string, title: string, email = "current@example.test") {
	return new Response(
		JSON.stringify({
			proposals: [
				{
					id: "proposal-one",
					proposalNumber: 17,
					title,
					abstract: "Current abstract",
					deliberationStatus: "ACCEPTED",
					confirmationStatus: "CONFIRMED",
					languages: ["fr"],
					formats: ["Talk"],
					speakers: [
						{ id: "source-one", name, email, company: null, picture: null },
					],
				},
			],
		}),
	);
}

describe("Conference Hall source precedence in runtime composition", () => {
	it("inherits profile and proposal edits on each invocation without a CSV merge", async () => {
		// Arrange
		const current = await fixture();
		const request = vi
			.fn()
			.mockResolvedValueOnce(response("Current Name", "Current title"))
			.mockResolvedValueOnce(Response.json({ proposals: [] }))
			.mockResolvedValueOnce(
				response("Renamed Speaker", "Renamed title", "renamed@example.test"),
			)
			.mockResolvedValueOnce(Response.json({ proposals: [] }));
		vi.stubGlobal("fetch", request);
		const first = current.create();

		// Act
		const result = await first
			.get(ManageMeetupEvent)
			.execute({ identity: current.identity, mode: "fix" });
		const catalog = await new ValidateReferentialCatalog(
			first.get<ReferentialRepository>(SERVICES.referentialRepository),
		).execute();
		const second = current.create();
		const changed = await second
			.get(ManageMeetupEvent)
			.execute({ identity: current.identity, mode: "fix" });
		const changedCatalog = await new ValidateReferentialCatalog(
			second.get<ReferentialRepository>(SERVICES.referentialRepository),
		).execute();
		const preservedCsv = await readFile(
			join(current.workspaceRoot, "speakers.csv"),
			"utf8",
		);
		const updatedDocument = current.document();

		// Assert
		expect(result).toMatchObject({
			event: {
				proposalStatus: "current",
				agenda: [
					{
						description: "Current title: Current abstract",
						speakers: [{ id: "speaker-0001", displayName: "Current Name" }],
					},
				],
			},
		});
		expect(catalog).toMatchObject({
			isValid: true,
			catalog: {
				speakers: [
					{
						id: "speaker-0001",
						email: "current@example.test",
						phone: "local phone",
						firstName: "Old",
						company: "",
					},
				],
			},
		});
		expect(changed).toMatchObject({
			event: {
				proposalStatus: "current",
				agenda: [
					{
						description: "Renamed title: Current abstract",
						speakers: [{ id: "speaker-0001", displayName: "Renamed Speaker" }],
					},
				],
			},
		});
		expect(changedCatalog).toMatchObject({
			isValid: true,
			catalog: {
				speakers: [{ id: "speaker-0001", email: "renamed@example.test" }],
			},
		});
		expect(request).toHaveBeenCalledTimes(4);
		expect(preservedCsv).toBe(current.csv);
		expect(updatedDocument.body).not.toMatch(
			/current@example|renamed@example|local phone|Private Address/,
		);
	});

	it("preserves the last selected agenda and blocks cached contacts during a source outage", async () => {
		// Arrange
		const current = await fixture();
		const request = vi
			.fn()
			.mockResolvedValue(new Response("unavailable", { status: 503 }));
		vi.stubGlobal("fetch", request);
		const container = current.create();

		// Act
		const result = await container
			.get(ManageMeetupEvent)
			.execute({ identity: current.identity, mode: "fix" });
		const catalog = await new ValidateReferentialCatalog(
			container.get<ReferentialRepository>(SERVICES.referentialRepository),
		).execute();

		// Assert
		expect(result).toMatchObject({
			event: { proposalStatus: "stale", agenda: [{ description: "Old talk" }] },
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: "referential.source.unavailable" }),
			]),
		});
		expect(catalog.isValid).toBe(false);
		expect(current.document().body).toContain(
			"- Old Name [speaker-0001]: Old talk",
		);
		expect(request).toHaveBeenCalledOnce();
	});

	it("safely inherits an archived speaker rename in a manual agenda and retains reference identity", async () => {
		// Arrange
		const current = await fixture(false);
		const name = "Example, Person: --><script>alert(1)</script>";
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(Response.json({ proposals: [] }))
				.mockResolvedValueOnce(response(name, "Unselected archived talk")),
		);
		const container = current.create();

		// Act
		const result = await container
			.get(ManageMeetupEvent)
			.execute({ identity: current.identity, mode: "fix" });
		const decoded = container
			.get<EventDocumentCodec>(SERVICES.eventDocumentCodec)
			.decode(current.document());

		// Assert
		expect(result).toMatchObject({
			event: {
				agenda: [
					{
						description: "Old talk",
						speakers: [{ id: "speaker-0001", displayName: name }],
					},
				],
			},
		});
		expect(current.document().body).not.toContain("<script>");
		expect(current.document().body).not.toContain("Unselected archived talk");
		expect(decoded.event.agenda[0].speakers).toMatchObject([
			{ id: "speaker-0001", displayName: name },
		]);
	});
});

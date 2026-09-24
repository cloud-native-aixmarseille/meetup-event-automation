import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventComposition, SERVICES } from "./composition.js";

const input = {
	client: getOctokit("synthetic-test-token"),
	owner: "community",
	repo: "meetups",
	commentAuthorLogin: "automation[bot]",
	workspaceRoot: "/must-not-read",
};

const identity = { repository: "community/meetups", issueNumber: 42 };

function unrelatedEventRepository(): EventRepository {
	return {
		find: vi.fn().mockResolvedValue({
			identity,
			issueTitle: "Unrelated",
			issueState: "open",
			body: "",
			labels: [],
		}),
		listPage: vi.fn(),
		applyPatch: vi.fn(),
	};
}

describe("composition", () => {
	it("shares instances within an invocation and isolates separate invocations", () => {
		// Arrange
		const first = EventComposition.createEventContainer(input);
		const second = EventComposition.createEventContainer(input);

		// Act
		const firstJourney = first.get(ManageMeetupEvent);
		const repeatedJourney = first.get(ManageMeetupEvent);
		const secondJourney = second.get(ManageMeetupEvent);
		const firstRepository = first.get(SERVICES.eventRepository);
		const secondRepository = second.get(SERVICES.eventRepository);
		const firstConfig = first.get(SERVICES.config);
		const secondConfig = second.get(SERVICES.config);

		// Assert
		expect(firstJourney).toBe(repeatedJourney);
		expect(firstJourney).not.toBe(secondJourney);
		expect(firstRepository).not.toBe(secondRepository);
		expect(firstConfig).not.toBe(secondConfig);
	});
	it("injects a replacement port into the journey without contacting GitHub or reading files", async () => {
		// Arrange
		const container = EventComposition.createEventContainer(input);
		const repository = unrelatedEventRepository();
		container
			.rebind<EventRepository>(SERVICES.eventRepository)
			.toConstantValue(repository);

		// Act
		const result = await container
			.get(ManageMeetupEvent)
			.execute({ identity, mode: "fix" });

		// Assert
		expect(result).toEqual({ skipped: true, diagnostics: [] });
		expect(repository.find).toHaveBeenCalledWith(identity);
		expect(repository.applyPatch).not.toHaveBeenCalled();
	});
	it("resolves referential validation without credentials and consumes the injected catalog", async () => {
		// Arrange
		const container = EventComposition.createReferentialContainer({
			workspaceRoot: "/must-not-read",
		});
		const load = vi.fn().mockResolvedValue({ hosts: [], speakers: [] });
		container
			.rebind<ReferentialRepository>(SERVICES.referentialRepository)
			.toConstantValue({ load });

		// Act
		await container.get(ValidateMeetupReferentials).execute();

		// Assert
		expect(load).toHaveBeenCalledOnce();
	});
});

describe("event referential links", () => {
	const roots: string[] = [];

	afterEach(async () => {
		await Promise.all(
			roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
		);
		vi.unstubAllEnvs();
	});

	const identity = { repository: "example/events", issueNumber: 42 };

	const body = `### Event Title

Platform Evening

### Event Date

2026-11-05

### Hoster

Example Venue

### Event Description

An evening about reliable platforms.

### Agenda

- Renée Example, Morgan Example: Reliable platforms
- Renée Example: Questions and answers
`;

	async function journey(
		options: { body?: string; repositoryRef?: string } = {},
	) {
		const workspaceRoot = await mkdtemp(
			join(tmpdir(), "meetup-reference-links-"),
		);
		roots.push(workspaceRoot);
		await writeFile(
			join(workspaceRoot, "venues.csv"),
			[
				"host_id,name,contact_id,contact,mail,phone,address",
				"host-0090,Another Venue,contact-0090,Private Contact,private@example.test,,Private address",
				"host-0042,Example Venue,contact-0042,Private Contact,private@example.test,,Private address",
				"host-0042,Example Venue,contact-0043,Other Contact,other@example.test,,Private address",
			].join("\n"),
		);
		await writeFile(
			join(workspaceRoot, "presenters.csv"),
			[
				"speaker_id,firstname,lastname,company,mail,phone",
				"speaker-0073,Morgan,Example,Example,private@example.test,",
				"speaker-0047,Renée,Example,Example,private@example.test,",
			].join("\n"),
		);
		let document: EventDocument = {
			identity,
			issueState: "open",
			issueTitle: "Platform Evening",
			labels: ["meetup"],
			body: options.body ?? body,
		};
		const repository: EventRepository = {
			find: vi.fn(async () => document),
			listPage: vi.fn(),
			applyPatch: vi.fn(async (_identity, patch) => {
				document = { ...document, ...patch };
			}),
		};
		const container = EventComposition.createEventContainer({
			client: getOctokit("synthetic-test-token"),
			owner: "example",
			repo: "events",
			commentAuthorLogin: "automation[bot]",
			workspaceRoot,
			repositoryRef: options.repositoryRef,
			config: {
				...AutomationConfigFactory.createAutomationConfig("example"),
				referentials: { hosts: "venues.csv", speakers: "presenters.csv" },
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
		return {
			manage: container.get(ManageMeetupEvent),
			codec: container.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
			repository,
			document: () => document,
		};
	}

	it.each([
		["plain names", body],
		[
			"legacy links",
			body
				.replace(
					"\n\nExample Venue\n",
					"\n\n[Example Venue](https://example.test/old-host)\n",
				)
				.replaceAll(
					"Renée Example",
					"[Renée Example](https://example.test/old-speaker)",
				),
		],
		[
			"bound IDs",
			'<!-- meetup-event-schema:1 -->\n<!-- meetup-event-references:{"schemaVersion":2,"host":{"id":"host-0042","displayName":"Example Venue"},"speakers":[{"id":"speaker-0047","displayName":"Renée Example"},{"id":"speaker-0073","displayName":"Morgan Example"}]} -->\n' +
				body,
		],
		[
			"outdated row links",
			body
				.replace(
					"\n\nExample Venue\n",
					"\n\n[Example Venue](https://github.com/example/events/blob/main/venues.csv#L8)\n",
				)
				.replaceAll(
					"Renée Example",
					"[Renée Example](https://github.com/example/events/blob/main/presenters.csv#L9)",
				),
		],
	])(
		"links %s to their current catalog rows",
		async (_scenario, sourceBody) => {
			// Arrange
			const fixture = await journey({
				body: sourceBody,
				repositoryRef: "catalog-revision",
			});

			// Act
			const result = await fixture.manage.execute({ identity, mode: "fix" });
			const document = fixture.document();
			const decoded = fixture.codec.decode(document);

			// Assert
			expect(result).toMatchObject({ skipped: false, persisted: true });
			expect(document.body).toContain(
				"### Hoster\n\n[Example Venue](https://github.com/example/events/blob/catalog-revision/venues.csv#L3)",
			);
			expect(document.body).toContain(
				"- [Renée Example](https://github.com/example/events/blob/catalog-revision/presenters.csv#L3), [Morgan Example](https://github.com/example/events/blob/catalog-revision/presenters.csv#L2): Reliable platforms",
			);
			expect(document.body).toContain(
				"- [Renée Example](https://github.com/example/events/blob/catalog-revision/presenters.csv#L3): Questions and answers",
			);
			expect(decoded.event.host).toMatchObject({
				id: "host-0042",
				displayName: "Example Venue",
			});
			expect(decoded.event.agenda[0].speakers).toMatchObject([
				{ id: "speaker-0047", displayName: "Renée Example" },
				{ id: "speaker-0073", displayName: "Morgan Example" },
			]);
			expect(document.body).not.toContain("Private Contact");
			expect(document.body).not.toContain("private@example.test");
			expect(document.body).not.toContain("Private address");
		},
	);

	it("keeps linked issues unchanged on a second reconciliation", async () => {
		// Arrange
		const fixture = await journey({ repositoryRef: "catalog-revision" });

		// Act
		await fixture.manage.execute({ identity, mode: "fix" });
		const firstBody = fixture.document().body;
		const second = await fixture.manage.execute({ identity, mode: "fix" });
		const secondBody = fixture.document().body;

		// Assert
		expect(second).toMatchObject({ persisted: false });
		expect(secondBody).toBe(firstBody);
		expect(fixture.repository.applyPatch).toHaveBeenCalledOnce();
	});

	it("resolves catalog locations in check mode without updating the issue", async () => {
		// Arrange
		const fixture = await journey();

		// Act
		const result = await fixture.manage.execute({ identity, mode: "check" });

		// Assert
		expect(result).toMatchObject({
			persisted: false,
			event: {
				host: { id: "host-0042", source: { path: "venues.csv", line: 3 } },
			},
		});
		expect(fixture.repository.applyPatch).not.toHaveBeenCalled();
	});

	it("uses the caller checkout revision by default", async () => {
		// Arrange
		vi.stubEnv("GITHUB_SHA", "caller-commit");
		const fixture = await journey();

		// Act
		await fixture.manage.execute({ identity, mode: "fix" });
		const document = fixture.document();

		// Assert
		expect(document.body).toContain(
			"https://github.com/example/events/blob/caller-commit/venues.csv#L3",
		);
	});
});

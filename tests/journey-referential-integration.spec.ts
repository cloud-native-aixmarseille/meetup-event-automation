import { describe, expect, it, vi } from "vitest";
import {
	type AutomationConfig,
	ManageMeetupEvent,
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "../packages/application/journey/src/index.js";
import type {
	EventDocument,
	ReconcileEventDependencies,
} from "../packages/domain/event/src/index.js";
import type { RawReferentialCatalog } from "../packages/domain/referential/src/index.js";

const config: AutomationConfig = {
	timezone: "Europe/Paris",
	event: {
		"issue-label": "meetup",
		"issue-form": ".github/ISSUE_TEMPLATE/meetup.yml",
		"occurrence-status-field": "event_status",
		"required-confirmation-labels": ["hoster:confirmed", "speakers:confirmed"],
	},
	referentials: {
		hosts: "referentials/hosting.csv",
		speakers: "referentials/speakers.csv",
	},
	communication: {
		"readiness-window-days": 7,
		"mailings-repository": "cloud-native-aixmarseille/mailings",
		"slack-enabled": true,
		"approval-label": "communication:approved",
		"dispatch-enabled": false,
		"policy-version": 1,
	},
	publication: {
		"meetup-event-url-prefix":
			"https://www.meetup.com/cloud-native-aix-marseille/events/",
		"cncf-event-url-prefix":
			"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/",
	},
};

const catalog: RawReferentialCatalog = {
	hosts: [
		{
			hostId: "host-0001",
			displayName: "Example Host",
			contactId: "contact-0001",
			contactName: "Synthetic Contact",
			email: "host@example.test",
			address: "Synthetic address",
		},
	],
	speakers: [
		{
			speakerId: "speaker-0001",
			firstName: "Example",
			lastName: "Speaker",
			company: "Example Company",
			email: "speaker@example.test",
		},
	],
};

const dependenciesFor = (rawCatalog: RawReferentialCatalog) => {
	const loadCatalog = vi.fn().mockResolvedValue(rawCatalog);
	const referentialRepository = { load: loadCatalog };

	return {
		dependencies: {
			config,
			referentialRepository,
		},
		loadCatalog,
	};
};

describe("referential journey orchestration", () => {
	it("validates the catalog using the injected configuration", async () => {
		// Arrange
		const fixture = dependenciesFor(catalog);

		// Act
		const result = await new ValidateMeetupReferentials(
			fixture.dependencies,
		).execute();

		// Assert
		expect(result.isValid).toBe(true);
		if (!result.isValid) throw new Error("Expected a valid synthetic catalog");
		expect(result.config).toBe(config);
		expect(result.catalog.hosts).toHaveLength(1);
		expect(result.catalog.speakers).toHaveLength(1);
		expect(result.diagnostics).toEqual([]);
		expect(fixture.loadCatalog).toHaveBeenCalledOnce();
	});

	it("stops issue-form projection when a catalog is invalid", async () => {
		// Arrange
		const fixture = dependenciesFor({
			...catalog,
			speakers: [{ ...catalog.speakers[0], email: "not-an-email" }],
		});
		const synchronize = vi.fn();

		// Act
		const result = await new SynchronizeMeetupIssueForm({
			validateReferentials: new ValidateMeetupReferentials(
				fixture.dependencies,
			),
			issueFormProjection: { synchronize },
		}).execute({ mode: "check" });

		// Assert
		expect(result.changed).toBe(false);
		expect(result.changedFiles).toEqual([]);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "referential.speaker.email.invalid",
				severity: "error",
			}),
		);
		expect(synchronize).not.toHaveBeenCalled();
	});

	it("projects a validated catalog with the configured field contract", async () => {
		// Arrange
		const fixture = dependenciesFor(catalog);
		const synchronize = vi.fn().mockResolvedValue({
			changed: true,
			changedFiles: [config.event["issue-form"]],
			diagnostics: [
				{
					code: "issue-form.projection.stale",
					severity: "warning",
					message: "The public projection is stale.",
				},
			],
		});

		// Act
		const result = await new SynchronizeMeetupIssueForm({
			validateReferentials: new ValidateMeetupReferentials(
				fixture.dependencies,
			),
			issueFormProjection: { synchronize },
		}).execute({ mode: "fix" });

		// Assert
		expect(result).toEqual({
			changed: true,
			changedFiles: [config.event["issue-form"]],
			diagnostics: [
				{
					code: "issue-form.projection.stale",
					severity: "warning",
					message: "The public projection is stale.",
				},
			],
		});
		expect(synchronize).toHaveBeenCalledWith({
			issueFormPath: config.event["issue-form"],
			occurrenceStatusFieldId: config.event["occurrence-status-field"],
			catalog: expect.objectContaining({
				hosts: expect.any(Array),
				speakers: expect.any(Array),
			}),
			mode: "fix",
		});
	});
});

describe("event journey selection", () => {
	const identity = {
		repository: "cloud-native-aixmarseille/meetups",
		issueNumber: 42,
	} as const;

	const eventDependencies = (
		document: EventDocument | undefined,
	): ReconcileEventDependencies => ({
		repository: {
			find: vi.fn().mockResolvedValue(document),
			applyPatch: vi.fn(),
			listPage: vi.fn(),
		},
		documentCodec: {
			decode: vi.fn(),
			createPatch: vi.fn(),
		},
		commentRepository: { reconcileDiagnostics: vi.fn() },
		clock: { now: () => "2026-09-04T10:00:00Z" },
	});

	it("fails explicitly when the requested issue no longer exists", async () => {
		// Arrange
		const useCase = new ManageMeetupEvent({
			config,
			referentialRepository: {
				load: vi.fn().mockResolvedValue(catalog),
			},
			eventDependencies: eventDependencies(undefined),
		});

		// Act
		const operation = useCase.execute({
			identity,
			mode: "check",
		});

		// Assert
		await expect(operation).rejects.toThrow(
			"Meetup event cloud-native-aixmarseille/meetups#42 was not found",
		);
	});

	it("skips issues outside the configured meetup label", async () => {
		// Arrange
		const document: EventDocument = {
			identity,
			issueState: "open",
			issueTitle: "A regular repository issue",
			labels: ["question"],
			body: "This is intentionally not a meetup.",
		};
		const useCase = new ManageMeetupEvent({
			config,
			referentialRepository: {
				load: vi.fn().mockResolvedValue(catalog),
			},
			eventDependencies: eventDependencies(document),
		});

		// Act
		const actual = await useCase.execute({
			identity,
			mode: "fix",
		});

		// Assert
		expect(actual).toEqual({ skipped: true, diagnostics: [] });
	});
});

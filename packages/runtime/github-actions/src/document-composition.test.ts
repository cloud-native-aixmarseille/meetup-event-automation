import { getOctokit } from "@actions/github";
import type { EventRepository } from "@meetup-automation/event";
import { ReconcileMeetupDocuments } from "@meetup-automation/journey";
import {
	type AssetRepository,
	PublicationDomainComposition,
	ReconcileAssetContent,
} from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { eventPublicationSettings } from "../testing/publication-urls.fixtures.js";
import { AssetTemplateDefaults } from "./assets/asset-template-defaults.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { SERVICES } from "./composition.js";
import {
	ASSET_REPOSITORY,
	DocumentComposition,
} from "./document-composition.js";

const input = {
	locale: "en" as const,
	recovery: {},
	...eventPublicationSettings,
	conferenceHallEvent: "example-cfp",
	conferenceHallApiKey: "synthetic-source-key",
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

describe("document-composition", () => {
	it("allows replacing Drive before resolving the asset journey", async () => {
		// Arrange
		const container = DocumentComposition.createDocumentContainer({
			issueNumber: 42,
			...input,
			credentials: "not-json",
			parentFolderId: "parent",
			templateFolderId: "templates",
		});
		container.rebind(ReconcileAssetContent).toConstantValue(
			new ReconcileAssetContent(
				{
					createDiscoverAssetContent: (...args) =>
						new PublicationDomainComposition().discoverAssetContent(...args),
					contentContractPolicy:
						new PublicationDomainComposition().contentContractPolicy(),
					contentRenderPlan:
						new PublicationDomainComposition().contentRenderPlan(),
					contentTextKey: new PublicationDomainComposition().contentTextKey(),
					contentManifestPolicy:
						new PublicationDomainComposition().contentManifestPolicy(),
					contentRecoveryFingerprint:
						new PublicationDomainComposition().contentRecoveryFingerprint(),
					contentRecoveryPlan:
						new PublicationDomainComposition().contentRecoveryPlan(),
					createResolveContentValues: (...args) =>
						new PublicationDomainComposition().resolveContentValues(
							{ value: (value) => value.value },
							...args,
						),
				},
				{ load: vi.fn(), save: vi.fn() },
				{},
				{ validate: vi.fn(), observe: vi.fn() },
				new AssetTemplateDefaults(
					new GithubActionsComposition().assetMessages("en"),
				).create(),
			),
		);
		const assets: AssetRepository = {
			findContainer: vi.fn(),
			ensureContainer: vi.fn(),
			listTemplates: vi.fn(),
			listFiles: vi.fn(),
			copyTemplate: vi.fn(),
			updateFile: vi.fn(),
		};
		container.rebind<AssetRepository>(ASSET_REPOSITORY).toConstantValue(assets);
		container
			.rebind<EventRepository>(SERVICES.eventRepository)
			.toConstantValue(unrelatedEventRepository());

		// Act
		const result = await container
			.get(ReconcileMeetupDocuments)
			.execute({ identity });

		// Assert
		expect(result).toMatchObject({ skipped: true, persisted: false });
		expect(assets.ensureContainer).not.toHaveBeenCalled();
	});
});

import { getOctokit } from "@actions/github";
import type { EventRepository } from "@meetup-automation/event";
import { ManageMeetupAssets } from "@meetup-automation/journey";
import {
	type AssetRepository,
	PublicationDomainComposition,
	ReconcileAssetContent,
	ReconcileSlidePdf,
} from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { eventPublicationSettings } from "../testing/publication-urls.fixtures.js";
import { SERVICES } from "./composition.js";
import {
	ASSET_REPOSITORY,
	PublicationComposition,
} from "./publication-composition.js";

const input = {
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

describe("publication-composition", () => {
	it.each(["parent", "templates"])(
		"rejects %s as the shared public destination",
		(publicFolderId) => {
			// Arrange
			const configuration = {
				...input,
				credentials: "not-json",
				parentFolderId: "parent",
				templateFolderId: "templates",
				publicFolderId,
			};

			// Act
			const create = () =>
				PublicationComposition.createPublicationContainer(configuration);

			// Assert
			expect(create).toThrow("The shared public folder must differ");
		},
	);
	it("allows replacing Drive before resolving the asset journey", async () => {
		// Arrange
		const container = PublicationComposition.createPublicationContainer({
			...input,
			credentials: "not-json",
			parentFolderId: "parent",
			publicFolderId: "public-folder",
			templateFolderId: "templates",
		});
		container.rebind(ReconcileAssetContent).toConstantValue(
			new ReconcileAssetContent(
				{
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
						new PublicationDomainComposition().resolveContentValues(...args),
				},
				{ load: vi.fn(), save: vi.fn() },
				{},
				{ validate: vi.fn(), observe: vi.fn() },
			),
		);
		container.rebind(ReconcileSlidePdf).toConstantValue(
			new PublicationDomainComposition().reconcileSlidePdf(
				{ observe: vi.fn(), export: vi.fn() },
				{
					find: vi.fn(),
					reserveId: vi.fn(),
					write: vi.fn(),
					placeInPublicFolder: vi.fn(),
				},
				{ load: vi.fn(), save: vi.fn() },
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
			.get(ManageMeetupAssets)
			.execute({ identity });

		// Assert
		expect(result).toMatchObject({ skipped: true, persisted: false });
		expect(assets.ensureContainer).not.toHaveBeenCalled();
	});
});

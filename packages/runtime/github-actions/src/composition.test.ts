import { getOctokit } from "@actions/github";
import type { EventRepository } from "@meetup-automation/event";
import {
	ManageMeetupAssets,
	ManageMeetupEvent,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import type { AssetRepository } from "@meetup-automation/publication";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import {
	createEventContainer,
	createReferentialContainer,
	SERVICES,
} from "./composition.js";
import {
	ASSET_REPOSITORY,
	createPublicationContainer,
} from "./publication-composition.js";

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

describe("runtime composition", () => {
	it("shares instances within an invocation and isolates separate invocations", () => {
		const first = createEventContainer(input);
		const second = createEventContainer(input);
		expect(first.get(ManageMeetupEvent)).toBe(first.get(ManageMeetupEvent));
		expect(first.get(ManageMeetupEvent)).not.toBe(
			second.get(ManageMeetupEvent),
		);
		expect(first.get(SERVICES.eventRepository)).not.toBe(
			second.get(SERVICES.eventRepository),
		);
		expect(first.get(SERVICES.config)).not.toBe(second.get(SERVICES.config));
	});

	it("injects a replacement port into the journey without contacting GitHub or reading files", async () => {
		const container = createEventContainer(input);
		const repository = unrelatedEventRepository();
		container
			.rebind<EventRepository>(SERVICES.eventRepository)
			.toConstantValue(repository);
		await expect(
			container.get(ManageMeetupEvent).execute({ identity, mode: "fix" }),
		).resolves.toEqual({ skipped: true, diagnostics: [] });
		expect(repository.find).toHaveBeenCalledWith(identity);
		expect(repository.applyPatch).not.toHaveBeenCalled();
	});

	it("resolves referential validation without credentials and consumes the injected catalog", async () => {
		const container = createReferentialContainer({
			workspaceRoot: "/must-not-read",
		});
		const load = vi.fn().mockResolvedValue({ hosts: [], speakers: [] });
		container
			.rebind<ReferentialRepository>(SERVICES.referentialRepository)
			.toConstantValue({ load });
		await container.get(ValidateMeetupReferentials).execute();
		expect(load).toHaveBeenCalledOnce();
	});

	it("allows replacing Drive before resolving the asset journey", async () => {
		const container = createPublicationContainer({
			...input,
			credentials: "not-json",
			parentFolderId: "",
			templateFolderId: "",
		});
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
		await expect(
			container.get(ManageMeetupAssets).execute({ identity, mode: "fix" }),
		).resolves.toMatchObject({ skipped: true, persisted: false });
		expect(assets.ensureContainer).not.toHaveBeenCalled();
	});
});

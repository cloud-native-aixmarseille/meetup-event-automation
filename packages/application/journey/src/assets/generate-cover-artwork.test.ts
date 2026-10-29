import { ContentMediaChangedError } from "@meetup-automation/publication";
import { describe, expect, it } from "vitest";
import {
	contentFixture,
	media,
} from "../../testing/promotional-content.fixtures.js";
import { DraftProposalComposition } from "../draft-proposal-composition.js";
import { GenerateCoverArtwork } from "./generate-cover-artwork.js";

describe("durable artwork generation", () => {
	it.each(["layout", "transport"])(
		"handles %s failure before image reservation",
		async (kind) => {
			// Arrange
			const f = contentFixture("cover");
			const error =
				kind === "layout"
					? new ContentMediaChangedError("Invalid media destination")
					: new Error("Service unavailable");
			f.images.reserve.mockRejectedValue(error);
			const useCase = new GenerateCoverArtwork(
				f.store,
				f.imageGenerator,
				f.images,
				f.fingerprints,
				f.policy,
				new DraftProposalComposition().artwork(),
			);
			const before = await f.store.load();
			// Act
			const result = useCase.execute(f.proposal.id);
			// Assert
			if (kind === "layout") await expect(result).resolves.toBe("recovery");
			else await expect(result).rejects.toBe(error);
			expect(f.imageGenerator.generate).not.toHaveBeenCalled();
			expect(f.images.persist).not.toHaveBeenCalled();
			expect(await f.store.load()).toEqual(before);
		},
	);
	it("awaits four independent image requests and persists separate artifacts", async () => {
		// Arrange
		const f = contentFixture("cover");
		const order: string[] = [];
		let active = false;
		f.imageGenerator.generate.mockImplementation(async () => {
			if (active) throw new Error("Parallel image generation");
			active = true;
			order.push("start");
			await Promise.resolve();
			active = false;
			order.push("end");
			return { bytes: new Uint8Array([1]), mimeType: "image/png" };
		});
		const useCase = new GenerateCoverArtwork(
			f.store,
			f.imageGenerator,
			f.images,
			f.fingerprints,
			f.policy,
			new DraftProposalComposition().artwork(),
		);
		// Act
		const status = await useCase.execute(f.proposal.id);
		const state = await f.store.load();
		// Assert
		expect(status).toBe("complete");
		for (const [brief] of f.imageGenerator.generate.mock.calls) {
			expect(brief.output).toEqual({
				width: 1792,
				height: 1024,
				mimeType: "image/png",
			});
		}
		expect(f.images.persist).toHaveBeenCalledWith(
			"image-1",
			{ bytes: new Uint8Array([1]), mimeType: "image/png" },
			expect.any(String),
		);
		expect(order).toEqual([
			"start",
			"end",
			"start",
			"end",
			"start",
			"end",
			"start",
			"end",
		]);
		expect(state.proposals[0].draft?.media.map((image) => image.id)).toEqual([
			"image-1",
			"image-2",
			"image-3",
			"image-4",
		]);
		expect(
			f.imageGenerator.generate.mock.calls.map((call) => call[0].instructions),
		).toEqual(
			new DraftProposalComposition()
				.artwork()
				.directions()
				.map(
					(direction) =>
						new DraftProposalComposition()
							.artwork()
							.brief(f.plan, direction, "").instructions,
				),
		);
	});
	it("recovers a completed image upload by its reserved identity without regenerating it", async () => {
		// Arrange
		const f = contentFixture("cover");
		const initial = await f.store.load();
		await f.store.save(initial, [
			{
				...f.proposal,
				attempts: [{ id: "existing-image", phase: "reserved" }],
			},
		]);
		f.images.read.mockResolvedValue({ ...media, id: "existing-image" });
		const useCase = new GenerateCoverArtwork(
			f.store,
			f.imageGenerator,
			f.images,
			f.fingerprints,
			f.policy,
			new DraftProposalComposition().artwork(),
		);
		// Act
		const result = await useCase.execute(f.proposal.id);
		const saved = await f.store.load();
		// Assert
		expect(result).toBe("complete");
		expect(f.imageGenerator.generate).toHaveBeenCalledTimes(3);
		expect(saved.proposals[0].draft?.media[0].id).toBe("existing-image");
	});
	it("retains successful candidates and the uncertain slot after a partial batch failure", async () => {
		// Arrange
		const f = contentFixture("cover");
		f.imageGenerator.generate
			.mockResolvedValueOnce({
				bytes: new Uint8Array([1]),
				mimeType: "image/png",
			})
			.mockRejectedValue(new Error("Unavailable"));
		const useCase = new GenerateCoverArtwork(
			f.store,
			f.imageGenerator,
			f.images,
			f.fingerprints,
			f.policy,
			new DraftProposalComposition().artwork(),
		);
		// Act
		await useCase.execute(f.proposal.id).catch(() => undefined);
		const rerun = await useCase.execute(f.proposal.id);
		const saved = await f.store.load();
		// Assert
		expect(rerun).toBe("recovery");
		expect(f.imageGenerator.generate).toHaveBeenCalledTimes(2);
		expect(saved.proposals[0].draft?.media).toHaveLength(1);
		expect(saved.proposals[0].attempts[1].phase).toBe("reserved");
	});
});

import { describe, expect, it } from "vitest";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import { DraftProposalComposition } from "../draft-proposal-composition.js";
import { GenerateTextProposal } from "./generate-text-proposal.js";

describe("durable text generation", () => {
	it("keeps overlong descriptions unapproved and does not repeat their generation", async () => {
		// Arrange
		const f = contentFixture("description");
		f.textGenerator.generate.mockResolvedValue("a".repeat(12001));
		const useCase = new GenerateTextProposal(
			f.store,
			f.textGenerator,
			f.fingerprints,
			f.policy,
			new DraftProposalComposition().eventCopy(),
		);
		// Act
		const failed = await useCase.execute(f.proposal.id).catch(() => "invalid");
		const rerun = await useCase.execute(f.proposal.id);
		const state = await f.store.load();
		// Assert
		expect(failed).toBe("invalid");
		expect(rerun).toBe("recovery");
		expect(state.proposals[0].draft).toBeNull();
		expect(state.proposals[0].attempts[0].phase).toBe("reserved");
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(1);
	});
	it("persists a text reservation before the provider effect and reuses its result", async () => {
		// Arrange
		const f = contentFixture();
		f.textGenerator.generate.mockImplementation(async () => {
			const state = await f.store.load();
			expect(state.proposals[0].attempts[0].phase).toBe("reserved");
			return "Kubernetes : observer et comprendre";
		});
		const useCase = new GenerateTextProposal(
			f.store,
			f.textGenerator,
			f.fingerprints,
			f.policy,
			new DraftProposalComposition().eventCopy(),
		);
		// Act
		const first = await useCase.execute(f.proposal.id);
		const second = await useCase.execute(f.proposal.id);
		const state = await f.store.load();
		// Assert
		expect([first, second]).toEqual(["complete", "complete"]);
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(1);
		expect(state.proposals[0].draft?.text).toContain("Kubernetes");
	});
	it("never retries an uncertain text request", async () => {
		// Arrange
		const f = contentFixture();
		f.textGenerator.generate.mockRejectedValue(new Error("Provider timeout"));
		const useCase = new GenerateTextProposal(
			f.store,
			f.textGenerator,
			f.fingerprints,
			f.policy,
			new DraftProposalComposition().eventCopy(),
		);
		// Act
		const failed = await useCase.execute(f.proposal.id).catch(() => "failed");
		const rerun = await useCase.execute(f.proposal.id);
		// Assert
		expect([failed, rerun]).toEqual(["failed", "recovery"]);
		expect(f.textGenerator.generate).toHaveBeenCalledTimes(1);
	});
});

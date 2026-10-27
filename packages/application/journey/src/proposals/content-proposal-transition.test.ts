import { describe, expect, it } from "vitest";
import { contentFixture } from "../../testing/promotional-content.fixtures.js";
import { ContentProposalTransition } from "./content-proposal-transition.js";

describe("trusted content publication history", () => {
	it("can anchor an existing proposal to its first delivery intent", () => {
		// Arrange
		const f = contentFixture("slack-engineering:announcement");
		const transitions = new ContentProposalTransition(f.fingerprints);
		const next = { ...f.proposal, publicationIntent: "a".repeat(64) };

		// Act
		const validate = () => transitions.validate(f.proposal, next);

		// Assert
		expect(validate).not.toThrow();
	});
	it.each([undefined, "b".repeat(64)])(
		"cannot erase or replace an anchored delivery intent %#",
		(publicationIntent) => {
			// Arrange
			const f = contentFixture("slack-engineering:announcement");
			const transitions = new ContentProposalTransition(f.fingerprints);
			const previous = { ...f.proposal, publicationIntent: "a".repeat(64) };
			const next = { ...previous, publicationIntent };

			// Act
			const validate = () => transitions.validate(previous, next);

			// Assert
			expect(validate).toThrow("cannot be removed or replaced");
		},
	);
});

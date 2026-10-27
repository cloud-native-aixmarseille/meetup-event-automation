import { describe, expect, it } from "vitest";
import {
	contentFixture,
	media,
} from "../../../../application/journey/testing/promotional-content.fixtures.js";
import { contentStoreFixture } from "../testing/content-store.fixtures.js";
import { ContentProposalCodec } from "./content-proposal-codec.js";

describe("proposal persistence schema", () => {
	it("retains the delivery anchor independently of the reviewed content fingerprint", () => {
		// Arrange
		const f = contentStoreFixture();
		const source = contentFixture("slack-engineering:announcement");
		const draft = {
			text: "Join this meetup: https://www.meetup.com/example/events/123/",
			media: [],
		};
		const proposal = {
			...source.proposal,
			publicationIntent: "a".repeat(64),
			draft,
			revision: source.fingerprints.proposal(source.proposal, draft),
		};

		// Act
		const decoded = f.codec.read(f.codec.write(proposal));

		// Assert
		expect(decoded).toEqual(proposal);
		expect(decoded.publicationIntent).toBe("a".repeat(64));
	});
	it("round-trips a reserved proposal without changing its fingerprint", () => {
		// Arrange
		const f = contentStoreFixture();
		const proposal = contentFixture().proposal;
		// Act
		const decoded = f.codec.read(f.codec.write(proposal));
		// Assert
		expect(f.codec).toBeInstanceOf(ContentProposalCodec);
		expect(decoded).toEqual(proposal);
	});
	it("rejects accepted text that differs from the approved draft", () => {
		// Arrange
		const f = contentStoreFixture();
		const source = contentFixture();
		const draft = { text: "A reviewed title", media: [] };
		const proposal = {
			...source.proposal,
			draft,
			revision: source.fingerprints.proposal(source.proposal, draft),
			decision: {
				status: "approved" as const,
				actor: "organizer",
				decidedAt: "2026-10-01T10:00:00Z",
			},
			accepted: { text: "Unreviewed text", media: [] },
		};
		// Act
		const write = () => f.codec.write(proposal);
		// Assert
		expect(write).toThrow("differs from the approved value");
	});
	it("rejects approval of an image outside the candidate batch", () => {
		// Arrange
		const f = contentStoreFixture();
		const source = contentFixture("cover");
		const draft = { text: "", media: [media] };
		const proposal = {
			...source.proposal,
			draft,
			revision: source.fingerprints.proposal(source.proposal, draft),
			decision: {
				status: "approved" as const,
				actor: "organizer",
				decidedAt: "2026-10-01T10:00:00Z",
				selectedImage: "different-image",
			},
		};
		// Act
		const write = () => f.codec.write(proposal);
		// Assert
		expect(write).toThrow("selection is missing");
	});
	it.each(["slack-engineering:announcement", "slack-aix:d7"] as const)(
		"preserves stored destination identity and source history for %s",
		(target) => {
			// Arrange
			const f = contentStoreFixture();
			const proposal = contentFixture(target).proposal;
			// Act
			const decoded = f.codec.read(f.codec.write(proposal));
			// Assert
			expect(decoded).toEqual(proposal);
		},
	);
});

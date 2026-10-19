import {
	ContentProposalTransition,
	DraftProposalComposition,
} from "@meetup-automation/journey";
import { PublicAssetUrl } from "@meetup-automation/publication";
import { ContentProposalCodec } from "../src/content-proposal-codec.js";
import { ContentValueSchema } from "../src/content-value-schema.js";
import { GithubContentProposalStore } from "../src/github-content-proposal-store.js";
import { fixture } from "./approval.fixtures.js";
export function contentStoreFixture() {
	const f = fixture();
	const fingerprints = new DraftProposalComposition().fingerprints();
	const values = new ContentValueSchema(new PublicAssetUrl());
	const codec = new ContentProposalCodec(
		values,
		new DraftProposalComposition().policy(),
		fingerprints,
	);
	const store = new GithubContentProposalStore(
		f.client,
		"automation[bot]",
		codec,
		fingerprints,
		new ContentProposalTransition(fingerprints),
	);
	return { ...f, store, codec, values, fingerprints };
}

import {
	CommunityEventIdentityPolicy,
	type CommunityGroupUrl,
} from "@meetup-automation/publication";
import { CommunityPublicationCommentCodec } from "./community-publication-comment-codec.js";
import { GithubCommunityPublicationJournal } from "./github-community-publication-journal.js";
import {
	GithubPublicationJournal,
	type GithubPublicationJournalArguments,
} from "./github-publication-journal.js";
import { PublicationCommentCodec } from "./publication-comment-codec.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubPublicationJournalComposition {
	communityJournal(
		group: CommunityGroupUrl,
		target: string,
		...args: GithubPublicationJournalArguments
	): GithubCommunityPublicationJournal {
		return new GithubCommunityPublicationJournal(
			new CommunityPublicationCommentCodec(
				new CommunityEventIdentityPolicy(group),
				target,
			),
			...args,
		);
	}

	githubPublicationJournal(
		...args: GithubPublicationJournalArguments
	): GithubPublicationJournal {
		return new GithubPublicationJournal(
			{ publicationCommentCodec: this.publicationCommentCodec() },
			...args,
		);
	}
	publicationCommentCodec(): PublicationCommentCodec {
		return new PublicationCommentCodec();
	}
}

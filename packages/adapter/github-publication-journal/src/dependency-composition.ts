import {
	GithubPublicationJournal,
	type GithubPublicationJournalArguments,
} from "./github-publication-journal.js";
import { PublicationCommentCodec } from "./publication-comment-codec.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubPublicationJournalComposition {
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

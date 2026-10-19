import type {
	ContentSubmission,
	ContentSubmissions,
	PromotionalContentFingerprint,
	PromotionalContentPolicy,
} from "@meetup-automation/journey";
import type { PublicAssetUrl } from "@meetup-automation/publication";
import type { ContentValueSchema } from "./content-value-schema.js";
import type { GithubApprovalClient } from "./github-approval-client.js";

export const CONTENT_SUBMISSION_MARKER =
	"<!-- meetup-content-submission:v1 -->";
/** Submission is an authenticated proposal, never an approval. */
export class GithubContentSubmissions implements ContentSubmissions {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly values: ContentValueSchema,
		private readonly policy: Pick<PromotionalContentPolicy, "target">,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
		private readonly urls: Pick<PublicAssetUrl, "valid">,
	) {}
	async read(): Promise<readonly ContentSubmission[]> {
		const result: ContentSubmission[] = [];
		for (const comment of await this.client.list()) {
			if (
				!comment.body?.startsWith(CONTENT_SUBMISSION_MARKER) ||
				comment.user?.type !== "User"
			)
				continue;
			const edit = await this.client.edit(comment);
			const actor =
				edit.editor ??
				(edit.lastEditedAt === null
					? { login: comment.user.login, __typename: "User" }
					: null);
			if (
				actor?.__typename !== "User" ||
				actor.login === "ghost" ||
				!(await this.client.canApprove(actor.login))
			)
				continue;
			if (edit.body.length > 20_000)
				throw new Error("Content submission limit exceeded");
			const parsed = this.parse(
				JSON.parse(edit.body.slice(CONTENT_SUBMISSION_MARKER.length)),
			);
			result.push({
				...parsed,
				actor: actor.login,
				id: `${comment.id}:${this.fingerprints.digest({ body: edit.body, actor: actor.login })}`,
			});
		}
		return result;
	}
	async verify(submission: ContentSubmission): Promise<boolean> {
		return (await this.read()).some(
			(item) => item.id === submission.id && item.actor === submission.actor,
		);
	}
	private parse(value: unknown): Omit<ContentSubmission, "id" | "actor"> {
		const item = this.values.object(value, [
			"target",
			"language",
			"text",
			"image",
		]);
		if (
			!this.policy.target(item.target) ||
			(item.language !== "en" && item.language !== "fr")
		)
			throw new Error("Invalid content submission target or language");
		let image: ContentSubmission["image"] = null;
		if (item.image !== null) {
			const input = this.values.object(item.image, ["url", "description"]);
			const url = this.values.text(input.url, 2000),
				description = this.values.text(input.description, 1000);
			if (!this.urls.valid(url) || !description.trim())
				throw new Error("Invalid submitted image");
			image = { url, description };
		}
		return {
			target: item.target,
			language: item.language,
			text: this.values.text(item.text, 12_000),
			image,
		};
	}
}

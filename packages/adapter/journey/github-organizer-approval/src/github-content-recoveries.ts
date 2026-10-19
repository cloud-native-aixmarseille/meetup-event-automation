import type {
	ContentRecoveryRequest,
	ContentRecoveryRequests,
	PromotionalContentFingerprint,
} from "@meetup-automation/journey";
import type { ContentValueSchema } from "./content-value-schema.js";
import type { GithubApprovalClient } from "./github-approval-client.js";

/** Explicit authorized recovery replaces an uncertain batch with one new intent. */
export class GithubContentRecoveries implements ContentRecoveryRequests {
	constructor(
		private readonly client: GithubApprovalClient,
		private readonly values: ContentValueSchema,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"digest"
		>,
	) {}
	async read(): Promise<readonly ContentRecoveryRequest[]> {
		const requests: ContentRecoveryRequest[] = [];
		const marker = "<!-- meetup-content-recovery:v1 -->";
		for (const comment of await this.client.list()) {
			if (!comment.body?.startsWith(marker) || comment.user?.type !== "User")
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
			if (edit.body.length > 3000)
				throw new Error("Content recovery request exceeds limit");
			const item = this.values.object(
				JSON.parse(edit.body.slice(marker.length)),
				["proposalId", "guidance"],
			);
			const proposalId = this.values.text(item.proposalId, 44);
			if (!/^content-[a-f0-9-]{36}$/.test(proposalId))
				throw new Error("Invalid recovery proposal identity");
			requests.push({
				id: `${comment.id}:${this.fingerprints.digest(edit.body)}`,
				actor: actor.login,
				proposalId,
				guidance: this.values.text(item.guidance, 2000),
			});
		}
		return requests;
	}
}

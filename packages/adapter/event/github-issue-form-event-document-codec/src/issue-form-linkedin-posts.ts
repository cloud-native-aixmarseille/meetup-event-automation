import type { LinkedInPostReference } from "@meetup-automation/communication";
import type { EventDiagnostic } from "@meetup-automation/event";

export class IssueFormLinkedInPosts {
	constructor(
		private readonly references: Pick<LinkedInPostReference, "read">,
	) {}
	read(
		value: string,
		diagnostics: EventDiagnostic[],
	): readonly string[] | undefined {
		if (!value) return undefined;
		const posts: string[] = [];
		for (const line of value.split("\n").filter((line) => line.trim())) {
			const post = this.references.read(line.trim().replace(/^[-*] +/, ""));
			if (post) posts.push(post.url);
			else if (
				!diagnostics.some((item) => item.code === "event.linkedin-post.invalid")
			)
				diagnostics.push({
					code: "event.linkedin-post.invalid",
					severity: "warning",
					category: "invalid",
					field: "linkedInPosts",
					message:
						"LinkedIn posts must contain one published post URL per line",
				});
		}
		return [...new Set(posts)];
	}
}

import { EVENT_DIAGNOSTIC_COMMENT_MARKER } from "./github-event-comment-repository-contracts.js";

export const SOCIAL_DIAGNOSTIC_START =
	"<!-- meetup-automation:social-diagnostics:v1 -->";
export const SOCIAL_DIAGNOSTIC_END =
	"<!-- /meetup-automation:social-diagnostics:v1 -->";

/** Keeps independently refreshed checklist sections in one canonical comment. */
export class DiagnosticCommentSections {
	merge(previous: string, rendered: string, scope?: "social"): string {
		const current = this.read(previous);
		if (!scope && !current.social) return rendered;
		const base = this.tasks(scope === "social" ? current.base : rendered);
		const social = this.tasks(
			scope === "social" ? rendered : current.social,
		).filter((line) => !base.includes(line));
		if (!base.length && !social.length) return rendered;
		return [
			EVENT_DIAGNOSTIC_COMMENT_MARKER,
			"",
			...base,
			...(social.length
				? [SOCIAL_DIAGNOSTIC_START, ...social, SOCIAL_DIAGNOSTIC_END]
				: []),
		].join("\n");
	}

	hasSocial(body: string): boolean {
		return Boolean(this.read(body).social);
	}

	private read(body: string): { base: string; social: string } {
		if (!body.includes("meetup-automation:social-diagnostics:"))
			return { base: body, social: "" };
		const start = body.indexOf(SOCIAL_DIAGNOSTIC_START);
		const end = body.indexOf(SOCIAL_DIAGNOSTIC_END);
		if (
			start < 0 ||
			end < start ||
			body.split(SOCIAL_DIAGNOSTIC_START).length !== 2 ||
			body.split(SOCIAL_DIAGNOSTIC_END).length !== 2
		)
			throw new Error("Invalid social diagnostic section");
		return {
			base:
				body.slice(0, start) + body.slice(end + SOCIAL_DIAGNOSTIC_END.length),
			social: body.slice(start + SOCIAL_DIAGNOSTIC_START.length, end),
		};
	}

	private tasks(body: string): string[] {
		return [
			...new Set(
				body
					.split("\n")
					.filter((line) => /^- \[[ x]\] \*\*.+?\*\*: .+$/.test(line)),
			),
		];
	}
}

import type { AttentionEpisode } from "@meetup-automation/communication";
import { ATTENTION_MARKER } from "./attention-record.js";

export const DIAGNOSTIC_MARKER =
	"<!-- meetup-automation:event-diagnostics:v1 -->";

/** The diagnostic writer owns the checklist prefix; attention owns its suffix. */
export class AttentionDiagnosticChecklist {
	private body = "";
	commentId?: number;
	set(commentId: number, body: string): void {
		if (!body.startsWith(DIAGNOSTIC_MARKER))
			throw new Error("Invalid diagnostic checklist");
		this.commentId = commentId;
		this.body = body.split(ATTENTION_MARKER, 1)[0].trim();
	}
	prefix(): string {
		return this.body;
	}
	lines(): string[] {
		return [
			...new Set(
				this.body.split("\n").filter((line) => line.startsWith("- [ ] **")),
			),
		];
	}
	containsAction(action: string): boolean {
		return this.lines().some((line) => line.endsWith(`**: ${action}`));
	}
	includes(episode: AttentionEpisode): boolean {
		const lines = this.lines();
		if (!lines.length) return false;
		const { code, resource } = episode.condition;
		if (code === "required-data") return true;
		if (code === "integration-failure" && resource === "event-data")
			return true;
		const fields =
			code === "manual-publication"
				? AttentionDiagnosticChecklist.RESOURCE_FIELDS.get(resource)
				: AttentionDiagnosticChecklist.CONDITION_FIELDS.get(code);
		return (
			fields?.some((field) =>
				lines.some((line) => line.startsWith(`- [ ] **${field}**:`)),
			) ?? false
		);
	}
	private static readonly CONDITION_FIELDS = new Map([
		["missing-date", ["Event Date"]],
		["host-confirmation", ["Hoster", "Host confirmation"]],
		["speaker-confirmation", ["Speaker confirmation"]],
	]);
	private static readonly RESOURCE_FIELDS = new Map([
		["publish-meetup-event", ["Meetup Link"]],
		["publish-community-event", ["CNCF Link"]],
	]);
}

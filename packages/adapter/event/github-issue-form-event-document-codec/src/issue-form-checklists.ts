import type {
	EventDiagnostic,
	EventDiagnostics,
	EventLogisticsIntent,
	OperationalChecklistItem,
} from "@meetup-automation/event";
import {
	CHECKLIST_LABELS,
	AUTOMATED_TASK_HEADINGS,
	type Checkbox,
	type Section,
} from "./github-issue-form-event-document-codec-contracts.js";
import type { IssueFormSections } from "./issue-form-sections.js";
import type { MarkdownLines } from "./markdown-lines.js";

export interface IssueFormChecklistsCollaborators {
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly issueFormSections: Pick<
		IssueFormSections,
		"cleanResponse" | "parseSections" | "replaceOrAppendSection" | "readSection"
	>;
	readonly markdownLines: Pick<MarkdownLines, "parseCheckboxLine">;
}

export class IssueFormChecklists {
	constructor(
		private readonly collaborators: IssueFormChecklistsCollaborators,
	) {}

	readCheckboxes(
		sections: ReadonlyMap<string, readonly Section[]>,
		heading: string,
		diagnostics: EventDiagnostic[],
	): readonly Checkbox[] {
		const matches = sections.get(heading) ?? [];
		if (matches.length > 1) {
			diagnostics.push(
				this.collaborators.eventDiagnostics.diagnostic({
					code: "event.document.heading.duplicate",
					severity: "error",
					category: "invalid",
					field: heading,
					message: `The ${heading} heading occurs more than once`,
				}),
			);
		}
		const value = this.collaborators.issueFormSections.cleanResponse(
			matches[0]?.value ?? "",
		);
		if (!value) {
			return [];
		}

		const checkboxes: Checkbox[] = [];
		for (const [index, line] of value.split(/\r?\n/).entries()) {
			if (!line.trim()) {
				continue;
			}
			const checkbox = this.collaborators.markdownLines.parseCheckboxLine(line);
			if (!checkbox) {
				diagnostics.push(
					this.collaborators.eventDiagnostics.diagnostic({
						code: "event.document.checkbox.invalid",
						severity: "warning",
						category: "invalid",
						field: heading,
						message: `${heading} checklist line ${index + 1} is malformed`,
					}),
				);
				continue;
			}
			checkboxes.push(checkbox);
		}
		return checkboxes;
	}

	toOperationalChecklist(
		checkboxes: readonly Checkbox[],
	): readonly OperationalChecklistItem[] {
		return checkboxes.map(({ checked, label }) => ({
			name: this.taskName(label),
			completed: checked,
		}));
	}

	replaceOrAppendChecklistSections(
		body: string,
		headings: readonly [string, ...string[]],
		items: readonly OperationalChecklistItem[],
	): string {
		const sections = this.collaborators.issueFormSections.parseSections(body);
		const originalSections: [string, string][] = [];
		for (const heading of headings) {
			const matches = sections.get(heading) ?? [];
			if (
				matches.length > 1 ||
				matches.some(
					(section) => !this.operationalChecklistIsWellFormed(section.value),
				)
			)
				return body;
			for (const { label } of this.readCheckboxes(sections, heading, [])) {
				originalSections.push([this.taskName(label), heading]);
			}
		}
		const sectionByTask = new Map(originalSections);
		if (sectionByTask.size !== originalSections.length) return body;
		let result = body;
		for (const heading of headings) {
			const selected = items.filter(
				({ name }) =>
					(sectionByTask.get(name) ?? this.defaultHeading(name, headings)) ===
					heading,
			);
			result = this.collaborators.issueFormSections.replaceOrAppendSection(
				result,
				heading,
				this.renderOperationalChecklist(selected, body, heading),
			);
		}
		return result;
	}

	operationalChecklistIsWellFormed(value: string): boolean {
		const cleaned = this.collaborators.issueFormSections.cleanResponse(value);
		return (
			cleaned === "" ||
			cleaned
				.split(/\r?\n/)
				.filter((line) => line.trim() !== "")
				.every(
					(line) =>
						this.collaborators.markdownLines.parseCheckboxLine(line) !==
						undefined,
				)
		);
	}

	renderOperationalChecklist(
		items: readonly OperationalChecklistItem[],
		body: string,
		heading: string,
	): string {
		const sections = this.collaborators.issueFormSections.parseSections(body);
		const labels = new Map(
			this.readCheckboxes(sections, heading, []).map(({ label }) => [
				this.taskName(label),
				label,
			]),
		);
		return items
			.map(
				({ name, completed }) =>
					`- [${completed ? "x" : " "}] ${labels.get(name) ?? (AUTOMATED_TASK_HEADINGS.has(name) ? CHECKLIST_LABELS.get(name) : undefined) ?? name}`,
			)
			.join("\n");
	}

	private taskName(label: string): string {
		for (const [name, publicLabel] of CHECKLIST_LABELS) {
			if (label === publicLabel) return name;
		}
		return label;
	}

	private defaultHeading(
		name: string,
		headings: readonly [string, ...string[]],
	): string {
		const preferred = AUTOMATED_TASK_HEADINGS.get(name);
		return preferred && headings.includes(preferred) ? preferred : headings[0];
	}

	readLogisticsIntent(
		sections: ReadonlyMap<string, readonly Section[]>,
		heading: string,
		diagnostics: EventDiagnostic[],
	): EventLogisticsIntent {
		const value = this.collaborators.issueFormSections.readSection(
			sections,
			heading,
			false,
			diagnostics,
		);
		if (!value) {
			return "unspecified";
		}
		if (value.toLocaleLowerCase("en-US") === "yes") {
			return "planned";
		}
		if (value.toLocaleLowerCase("en-US") === "no") {
			return "not-planned";
		}

		diagnostics.push(
			this.collaborators.eventDiagnostics.diagnostic({
				code: "event.logistics.intent.invalid",
				severity: "error",
				category: "invalid",
				field: heading,
				message: `${heading} must be Yes or No when specified`,
			}),
		);
		return "unspecified";
	}

	replaceOrAppendLogisticsIntent(
		body: string,
		heading: string,
		intent: EventLogisticsIntent,
	): string {
		return intent === "unspecified" ||
			(this.collaborators.issueFormSections.parseSections(body).get(heading)
				?.length ?? 0) > 1
			? body
			: this.collaborators.issueFormSections.replaceOrAppendSection(
					body,
					heading,
					this.renderLogisticsIntent(intent),
				);
	}

	renderLogisticsIntent(intent: EventLogisticsIntent): string {
		switch (intent) {
			case "planned":
				return "Yes";
			case "not-planned":
				return "No";
			case "unspecified":
				return "";
		}
	}
}

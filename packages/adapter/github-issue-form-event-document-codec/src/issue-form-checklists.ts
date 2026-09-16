import {
	type EventDiagnostic,
	EventDiagnostics,
	type EventLogisticsIntent,
	type OperationalChecklistItem,
} from "@meetup-automation/event";
import type {
	Checkbox,
	Section,
} from "./github-issue-form-event-document-codec-contracts.js";
import { IssueFormSections } from "./issue-form-sections.js";
import { MarkdownLines } from "./markdown-lines.js";

export class IssueFormChecklists {
	static readCheckboxes(
		sections: ReadonlyMap<string, readonly Section[]>,
		heading: string,
		diagnostics: EventDiagnostic[],
	): readonly Checkbox[] {
		const matches = sections.get(heading) ?? [];
		if (matches.length > 1) {
			diagnostics.push(
				EventDiagnostics.diagnostic({
					code: "event.document.heading.duplicate",
					severity: "error",
					category: "invalid",
					field: heading,
					message: `The ${heading} heading occurs more than once`,
				}),
			);
		}
		const value = IssueFormSections.cleanResponse(matches[0]?.value ?? "");
		if (!value) {
			return [];
		}

		const checkboxes: Checkbox[] = [];
		for (const [index, line] of value.split(/\r?\n/).entries()) {
			if (!line.trim()) {
				continue;
			}
			const checkbox = MarkdownLines.parseCheckboxLine(line);
			if (!checkbox) {
				diagnostics.push(
					EventDiagnostics.diagnostic({
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

	static toOperationalChecklist(
		checkboxes: readonly Checkbox[],
	): readonly OperationalChecklistItem[] {
		return checkboxes.map(({ checked, label }) => ({
			name: label,
			completed: checked,
		}));
	}

	static replaceOrAppendOperationalChecklist(
		body: string,
		heading: string,
		value: string,
	): string {
		const sections = IssueFormSections.parseSections(body).get(heading) ?? [];
		if (
			sections.length > 1 ||
			(sections[0] &&
				!IssueFormChecklists.operationalChecklistIsWellFormed(
					sections[0].value,
				))
		) {
			return body;
		}
		return IssueFormSections.replaceOrAppendSection(body, heading, value);
	}

	static operationalChecklistIsWellFormed(value: string): boolean {
		const cleaned = IssueFormSections.cleanResponse(value);
		return (
			cleaned === "" ||
			cleaned
				.split(/\r?\n/)
				.filter((line) => line.trim() !== "")
				.every((line) => MarkdownLines.parseCheckboxLine(line) !== undefined)
		);
	}

	static renderOperationalChecklist(
		items: readonly OperationalChecklistItem[],
	): string {
		return items
			.map(({ name, completed }) => `- [${completed ? "x" : " "}] ${name}`)
			.join("\n");
	}

	static readLogisticsIntent(
		sections: ReadonlyMap<string, readonly Section[]>,
		heading: string,
		diagnostics: EventDiagnostic[],
	): EventLogisticsIntent {
		const value = IssueFormSections.readSection(
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
			EventDiagnostics.diagnostic({
				code: "event.logistics.intent.invalid",
				severity: "error",
				category: "invalid",
				field: heading,
				message: `${heading} must be Yes or No when specified`,
			}),
		);
		return "unspecified";
	}

	static replaceOrAppendLogisticsIntent(
		body: string,
		heading: string,
		intent: EventLogisticsIntent,
	): string {
		return intent === "unspecified" ||
			(IssueFormSections.parseSections(body).get(heading)?.length ?? 0) > 1
			? body
			: IssueFormSections.replaceOrAppendSection(
					body,
					heading,
					IssueFormChecklists.renderLogisticsIntent(intent),
				);
	}

	static renderLogisticsIntent(intent: EventLogisticsIntent): string {
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

import { parseDocument } from "yaml";
import {
	AVAILABLE_SPEAKERS_MARKER,
	HOST_FIELD_ID,
	type UnknownRecord,
} from "./yaml-issue-form-projection-contracts.js";

/** Parse and minimally update the supported YAML issue form representation. */
export class YamlIssueFormDocument {
	static project(
		source: string,
		hostOptions: readonly string[],
		speakersMarkdown: string,
		occurrenceStatusFieldId: string,
	) {
		const document = parseDocument(source, {
			strict: true,
			uniqueKeys: true,
		});

		if (document.errors.length > 0) {
			throw new Error("Issue form is not valid YAML.");
		}

		const issueForm = document.toJS({ maxAliasCount: 100 }) as unknown;
		if (
			!YamlIssueFormDocument.isRecord(issueForm) ||
			!Array.isArray(issueForm.body)
		) {
			throw new Error("Issue form must contain a body array.");
		}

		const body = issueForm.body;
		const hostIndex = YamlIssueFormDocument.findSingleFieldIndex(
			body,
			HOST_FIELD_ID,
			"dropdown",
		);
		const speakersIndex = YamlIssueFormDocument.findSpeakersMarkdownIndex(body);
		const statusIndex = YamlIssueFormDocument.findOptionalFieldIndex(
			body,
			occurrenceStatusFieldId,
		);

		let changed = false;
		if (
			!YamlIssueFormDocument.sameStringArray(
				YamlIssueFormDocument.fieldOptions(body[hostIndex]),
				hostOptions,
			)
		) {
			document.setIn(["body", hostIndex, "attributes", "options"], hostOptions);
			changed = true;
		}

		if (
			speakersIndex !== undefined &&
			YamlIssueFormDocument.fieldValue(body[speakersIndex]) !== speakersMarkdown
		) {
			document.setIn(
				["body", speakersIndex, "attributes", "value"],
				speakersMarkdown,
			);
			changed = true;
		}

		if (statusIndex !== undefined) {
			document.deleteIn(["body", statusIndex]);
			changed = true;
		}

		return { document, changed };
	}
	private static findSingleFieldIndex(
		body: readonly unknown[],
		fieldId: string,
		expectedType: string,
	): number {
		const indexes = body.flatMap((item, index) =>
			YamlIssueFormDocument.isRecord(item) && item.id === fieldId
				? [index]
				: [],
		);
		if (indexes.length !== 1) {
			throw new Error(`Issue form must contain exactly one ${fieldId} field.`);
		}

		const index = indexes[0];
		const field = body[index];
		if (!YamlIssueFormDocument.isRecord(field) || field.type !== expectedType) {
			throw new Error(`Issue-form field ${fieldId} must be a ${expectedType}.`);
		}
		if (!YamlIssueFormDocument.isRecord(field.attributes)) {
			throw new Error(`Issue-form field ${fieldId} must have attributes.`);
		}

		return index;
	}

	private static findOptionalFieldIndex(
		body: readonly unknown[],
		fieldId: string,
	): number | undefined {
		const indexes = body.flatMap((item, index) =>
			YamlIssueFormDocument.isRecord(item) && item.id === fieldId
				? [index]
				: [],
		);
		if (indexes.length > 1) {
			throw new Error(`Issue form contains duplicate ${fieldId} fields.`);
		}
		return indexes[0];
	}

	private static findSpeakersMarkdownIndex(
		body: readonly unknown[],
	): number | undefined {
		const indexes = body.flatMap((item, index) => {
			if (!YamlIssueFormDocument.isRecord(item) || item.type !== "markdown") {
				return [];
			}
			const value = YamlIssueFormDocument.fieldValue(item);
			return value?.includes(AVAILABLE_SPEAKERS_MARKER) ? [index] : [];
		});
		if (
			indexes.length === 0 &&
			YamlIssueFormDocument.findOptionalFieldIndex(
				body,
				"conference_hall_proposals",
			) !== undefined
		) {
			YamlIssueFormDocument.findSingleFieldIndex(
				body,
				"conference_hall_proposals",
				"textarea",
			);
			return undefined;
		}
		if (indexes.length !== 1) {
			throw new Error(
				"Issue form must contain exactly one Available speakers markdown block.",
			);
		}
		return indexes[0];
	}

	private static isRecord(value: unknown): value is UnknownRecord {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	private static fieldOptions(field: unknown): unknown {
		if (
			!YamlIssueFormDocument.isRecord(field) ||
			!YamlIssueFormDocument.isRecord(field.attributes)
		) {
			return undefined;
		}
		return field.attributes.options;
	}

	private static fieldValue(field: unknown): string | undefined {
		if (
			!YamlIssueFormDocument.isRecord(field) ||
			!YamlIssueFormDocument.isRecord(field.attributes)
		) {
			return undefined;
		}
		return typeof field.attributes.value === "string"
			? field.attributes.value
			: undefined;
	}

	private static sameStringArray(
		actual: unknown,
		expected: readonly string[],
	): boolean {
		return (
			Array.isArray(actual) &&
			actual.length === expected.length &&
			actual.every((value, index) => value === expected[index])
		);
	}
}

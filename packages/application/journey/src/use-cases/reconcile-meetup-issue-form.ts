import type {
	IssueFormProjection,
	IssueFormProjectionMode,
} from "../ports/issue-form-projection.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { ValidateMeetupReferentials } from "./validate-meetup-referentials.js";

export interface ReconcileMeetupIssueFormDependencies {
	readonly validateReferentials: Pick<ValidateMeetupReferentials, "execute">;
	readonly issueFormProjection: IssueFormProjection;
}

export interface ReconcileMeetupIssueFormResult {
	changed: boolean;
	completed: boolean;
	changedFiles: readonly string[];
	diagnostics: readonly PublicDiagnostic[];
}

export class ReconcileMeetupIssueForm {
	constructor(
		private readonly dependencies: ReconcileMeetupIssueFormDependencies,
	) {}

	async execute(input: {
		mode: IssueFormProjectionMode;
	}): Promise<ReconcileMeetupIssueFormResult> {
		const validation = await this.dependencies.validateReferentials.execute();
		if (!validation.isValid) {
			return {
				changed: false,
				completed: false,
				changedFiles: [],
				diagnostics: validation.diagnostics,
			};
		}

		const projection = await this.dependencies.issueFormProjection.synchronize({
			issueFormPath: validation.config.event["issue-form"],
			occurrenceStatusFieldId:
				validation.config.event["occurrence-status-field"],
			catalog: validation.catalog,
			mode: input.mode,
		});
		return {
			changed: projection.changed,
			completed: !projection.diagnostics.some(
				(item) => item.severity === "error",
			),
			changedFiles: projection.changedFiles,
			diagnostics: [
				...validation.diagnostics,
				...projection.diagnostics.map((item) => ({ ...item })),
			],
		};
	}
}
export type ReconcileMeetupIssueFormArguments = ConstructorParameters<
	typeof ReconcileMeetupIssueForm
>;

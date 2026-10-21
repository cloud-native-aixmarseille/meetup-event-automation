import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type {
	IssueFormProjection,
	IssueFormProjectionMode,
} from "@meetup-automation/journey";
import type { ProjectReferentialChoices } from "@meetup-automation/referential";
import * as yamlPlugin from "prettier/plugins/yaml";
import { format } from "prettier/standalone";
import type {
	IssueFormMessages,
	IssueFormMessagesArguments,
} from "./i18n/issue-form-messages.js";
import type {
	SpeakerReferencesPresenter,
	SpeakerReferencesPresenterArguments,
} from "./speaker-references-presenter.js";
import type { YamlIssueFormDocument } from "./yaml-issue-form-document.js";
import type {
	IssueFormProjectionDiagnostic,
	IssueFormProjectionResult,
	ResolvedIssueFormPath,
	SynchronizeIssueFormInput,
	YamlIssueFormProjectionOptions,
} from "./yaml-issue-form-projection-contracts.js";

export interface YamlIssueFormProjectionCollaborators {
	readonly yamlIssueFormDocument: Pick<YamlIssueFormDocument, "project">;
	readonly createProjectReferentialChoices: () => ProjectReferentialChoices;
	readonly createSpeakerReferencesPresenter: (
		...args: SpeakerReferencesPresenterArguments
	) => SpeakerReferencesPresenter;
	readonly createIssueFormMessages: (
		...args: IssueFormMessagesArguments
	) => IssueFormMessages;
}

export class YamlIssueFormProjection implements IssueFormProjection {
	private readonly presenter: SpeakerReferencesPresenter;
	private readonly choices: ProjectReferentialChoices;

	constructor(
		private readonly collaborators: YamlIssueFormProjectionCollaborators,
		private readonly options: YamlIssueFormProjectionOptions,
	) {
		this.choices = this.collaborators.createProjectReferentialChoices();
		this.presenter = this.collaborators.createSpeakerReferencesPresenter(
			this.collaborators.createIssueFormMessages(options.locale),
		);
	}

	async synchronize(
		input: SynchronizeIssueFormInput,
	): Promise<IssueFormProjectionResult> {
		this.assertInput(input);
		const issueFormPath = await this.resolveIssueFormPath(input.issueFormPath);
		const source = await readFile(issueFormPath.absolutePath, "utf8");
		const projection = this.choices.execute(input.catalog);
		const { changed, document } =
			this.collaborators.yamlIssueFormDocument.project(
				source,
				projection.hostOptions,
				this.presenter.render(projection.speakerReferences),
				input.occurrenceStatusFieldId,
			);

		if (changed && input.mode === "fix") {
			const content = await format(document.toString(), {
				parser: "yaml",
				plugins: [yamlPlugin],
			});
			await writeFile(issueFormPath.absolutePath, content, "utf8");
		}

		return this.result(changed, issueFormPath.relativePath, input.mode);
	}

	private assertInput(input: SynchronizeIssueFormInput): void {
		if (!input.issueFormPath.trim()) {
			throw new Error("Issue-form path must not be empty.");
		}
		if (input.mode !== "check" && input.mode !== "fix") {
			throw new Error("Issue-form projection mode must be check or fix.");
		}
	}

	private async resolveIssueFormPath(
		inputPath: string,
	): Promise<ResolvedIssueFormPath> {
		const root = await realpath(resolve(this.options.workspaceRoot));
		const candidate = resolve(root, inputPath);
		this.assertInsideWorkspace(root, candidate);

		const absolutePath = await realpath(candidate);
		this.assertInsideWorkspace(root, absolutePath);
		const metadata = await stat(absolutePath);
		if (!metadata.isFile()) {
			throw new Error("Configured issue-form path must reference a file.");
		}

		return {
			absolutePath,
			relativePath: relative(root, candidate).split(sep).join("/"),
		};
	}

	private assertInsideWorkspace(root: string, candidate: string): void {
		const childPath = relative(root, candidate);
		if (
			isAbsolute(childPath) ||
			childPath === ".." ||
			childPath.startsWith(`..${sep}`) ||
			childPath === ""
		) {
			throw new Error("Issue-form path must stay inside the checkout.");
		}
	}

	private result(
		changed: boolean,
		relativePath: string,
		mode: IssueFormProjectionMode,
	): IssueFormProjectionResult {
		const changedFiles = Object.freeze(changed ? [relativePath] : []);
		const diagnostics: readonly IssueFormProjectionDiagnostic[] = changed
			? Object.freeze([
					Object.freeze(
						mode === "fix"
							? {
									code: "issue-form.updated" as const,
									severity: "info" as const,
									message: "Issue form was synchronized.",
								}
							: {
									code: "issue-form.out-of-date" as const,
									severity: "warning" as const,
									message: "Issue form requires synchronization.",
								},
					),
				])
			: Object.freeze([]);

		return Object.freeze({ changed, changedFiles, diagnostics });
	}
}
export type YamlIssueFormProjectionArguments =
	ConstructorParameters<typeof YamlIssueFormProjection> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;

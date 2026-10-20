import type {
	ContentContract,
	ContentRecovery,
	ContentStatus,
	PublicAssetModel,
} from "../domain/asset-content.js";
import { ContentError } from "../domain/content-error.js";
import type { PublicationDiagnostic } from "../domain/model.js";
import type {
	AssetContainer,
	AssetFile,
	AssetRepository,
	AssetTemplate,
} from "./ports.js";
import type { ReconcileAssetContent } from "./reconcile-asset-content.js";

type AssetFileInput = {
	container: AssetContainer;
	template: AssetTemplate;
	currentFiles: readonly AssetFile[];
	date: string;
	mode: "check" | "fix";
	diagnostics: PublicationDiagnostic[];
	model?: PublicAssetModel;
	recovery?: Readonly<Record<string, ContentRecovery>>;
};

export class ReconcileAssetFile {
	constructor(
		private readonly repository: AssetRepository,
		private readonly content?: ReconcileAssetContent,
	) {}

	async execute(
		input: AssetFileInput,
	): Promise<{ file?: AssetFile; status: ContentStatus }> {
		const matches = input.currentFiles.filter(
			(file) => file.templateId === input.template.id,
		);
		if (matches.length > 1)
			throw new Error(
				"Ambiguous event asset copies require manual reconciliation",
			);
		let file = matches[0] as AssetFile | undefined;
		const fresh = !file;
		try {
			await this.preflight(input, file);
			if (!file) file = await this.copyOrRename(input);
			if (!file)
				return {
					status: input.template.contentContract ? "pending" : "copy-only",
				};
			file = await this.enroll(input, file);
			const status = await this.render(input, file, fresh);
			if (!fresh && (status === "ready" || status === "copy-only"))
				file = await this.copyOrRename(input, file);
			return { file, status };
		} catch (error) {
			if (!(error instanceof ContentError)) throw error;
			return ReconcileAssetFile.failed(file, error, input.diagnostics);
		}
	}

	private static failed(
		file: AssetFile | undefined,
		error: ContentError,
		diagnostics: PublicationDiagnostic[],
	): { file?: AssetFile; status: ContentStatus } {
		diagnostics.push(ReconcileAssetFile.diagnostic(error.code));
		return {
			file,
			status:
				error.code === "conflict"
					? "conflict"
					: error.code === "recovery"
						? "recovery-required"
						: "pending",
		};
	}

	private async enroll(
		input: AssetFileInput,
		file: AssetFile,
	): Promise<AssetFile> {
		if (
			input.recovery?.[file.id]?.operation === "enroll" &&
			!file.contentManaged
		) {
			file = await this.repository.updateFile(
				{ ...file, contentManaged: true },
				input.template,
				file.name,
			);
		}
		return file;
	}

	private async preflight(
		input: AssetFileInput,
		file?: AssetFile,
	): Promise<void> {
		if (
			file &&
			(file.contentManaged || input.recovery?.[file.id]?.operation !== "enroll")
		)
			return;
		if (!input.template.contentContract) return;
		if (!this.content || !input.model) throw new ContentError("missing");
		await this.content.preflight(
			file?.id ?? input.template.id,
			input.template.kind,
			input.template.mimeType ?? "",
			input.template.contentContract,
			input.model,
		);
	}

	private async render(
		input: AssetFileInput,
		file: AssetFile,
		fresh: boolean,
	): Promise<ContentStatus> {
		const { template } = input;
		const recovery = input.recovery?.[file.id];
		if (
			!file.contentManaged &&
			!recovery &&
			(!fresh || !template.contentContract)
		)
			return "copy-only";
		if (input.mode === "check" || !this.content || !input.model)
			return "pending";
		const outcome = await this.content.execute({
			folderId: input.container.id,
			fileId: file.id,
			templateId: template.id,
			kind: template.kind,
			mimeType: file.mimeType ?? template.mimeType ?? "",
			contract: template.contentContract as ContentContract | undefined,
			fresh,
			managed: file.contentManaged,
			model: input.model,
			recovery,
		});
		if (outcome.fallback)
			input.diagnostics.push(ReconcileAssetFile.diagnostic("fallback"));
		if (outcome.status === "pending")
			input.diagnostics.push(ReconcileAssetFile.diagnostic("revision"));
		return outcome.status;
	}

	private async copyOrRename(
		input: {
			container: AssetContainer;
			template: AssetTemplate;
			date: string;
			mode: "check" | "fix";
			diagnostics: PublicationDiagnostic[];
		},
		file?: AssetFile,
	): Promise<AssetFile | undefined> {
		const { template } = input;
		const name = template.name.replaceAll(
			"[EVENT_DATE:YYYY-MM-DD]",
			input.date,
		);
		if (file?.name === name && file.kind === template.kind) return file;
		input.diagnostics.push({
			code: "publication.assets.file.drift",
			field: "assets",
			severity: "warning",
			message:
				"An event template copy is missing or its name or template metadata has changed",
			fixAvailable: true,
			fixApplied: input.mode === "fix",
		});
		if (input.mode !== "fix") return file;
		return file
			? this.repository.updateFile(file, template, name)
			: this.repository.copyTemplate(input.container.id, template, name);
	}

	private static diagnostic(code: string): PublicationDiagnostic {
		return {
			code: `publication.assets.content.${code}`,
			field: "assets",
			severity: "warning",
			message:
				"Review the asset content status, template contract, public inputs and recovery instructions before using this file",
			fixAvailable: false,
		};
	}
}

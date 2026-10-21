import type {
	ContentRecovery,
	ContentStatus,
	PublicAssetModel,
} from "../domain/asset-content.js";
import type { PublicationDiagnostic } from "../domain/model.js";
import type {
	AssetContainer,
	AssetRepository,
	AssetTemplate,
} from "./ports.js";
import type { ReconcileAssetContent } from "./reconcile-asset-content.js";
import type {
	ReconcileAssetFile,
	ReconcileAssetFileArguments,
} from "./reconcile-asset-file.js";

export type ReconcileEventAssetsResult = Readonly<{
	container?: AssetContainer;
	files: Readonly<Record<string, string>>;
	content?: Readonly<Record<string, ContentStatus>>;
	diagnostics: readonly PublicationDiagnostic[];
}>;

export type ReconcileEventAssetsMode = "check" | "fix";

export interface ReconcileEventAssetsCollaborators {
	readonly createReconcileAssetFile: (
		...args: ReconcileAssetFileArguments
	) => ReconcileAssetFile;
}

export class ReconcileEventAssets {
	constructor(
		private readonly collaborators: ReconcileEventAssetsCollaborators,
		private readonly repository: AssetRepository,
		private readonly content?: ReconcileAssetContent,
	) {}

	async execute(input: {
		eventId: string;
		date: string;
		hostName: string;
		existingUrl?: string;
		mode: ReconcileEventAssetsMode;
		model?: PublicAssetModel;
		recovery?: Readonly<Record<string, ContentRecovery>>;
	}): Promise<ReconcileEventAssetsResult> {
		const date = input.date.trim();
		const host = input.hostName.trim();
		if (!this.validDate(date) || !host) {
			return {
				files: {},
				diagnostics: [
					this.diagnostic(
						"prerequisites",
						"A valid event date and resolved host are required to reconcile assets",
						false,
					),
				],
			};
		}
		// Validate the complete template catalog before performing any mutation.
		const templates = await this.repository.listTemplates();
		this.validateTemplates(templates);
		const month = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(new Date(`${date}T00:00:00Z`));
		const request = {
			eventId: input.eventId,
			idempotencyKey: `${input.eventId}:assets:v1`,
			title: `${date} - ${month} - ${host}`,
		};
		const diagnostics: PublicationDiagnostic[] = [];
		let container = await this.repository.findContainer(request);
		if (!container || container.name !== request.title) {
			diagnostics.push(
				this.diagnostic(
					"container.drift",
					"The event asset folder must be created or renamed",
					input.mode === "fix",
				),
			);
			if (input.mode === "fix")
				container = await this.repository.ensureContainer(request);
		}
		if (!container) return { files: {}, diagnostics };
		if (container.url !== input.existingUrl) {
			diagnostics.push(
				this.diagnostic(
					"link.drift",
					"The event asset link must reference the managed folder",
					input.mode === "fix",
				),
			);
		}
		return this.reconcileFiles(container, templates, input, diagnostics);
	}

	private async reconcileFiles(
		container: AssetContainer,
		templates: readonly AssetTemplate[],
		input: {
			date: string;
			mode: ReconcileEventAssetsMode;
			model?: PublicAssetModel;
			recovery?: Readonly<Record<string, ContentRecovery>>;
		},
		diagnostics: PublicationDiagnostic[],
	): Promise<ReconcileEventAssetsResult> {
		const currentFiles = await this.repository.listFiles(container.id);
		const files: Record<string, string> = {};
		const content: Record<string, ContentStatus> = {};
		const reconcile = this.collaborators.createReconcileAssetFile(
			this.repository,
			this.content,
		);
		for (const template of templates) {
			const result = await reconcile.execute({
				...input,
				template,
				container,
				currentFiles,
				diagnostics,
			});
			if (result.file?.url) files[`${template.kind}-link`] = result.file.url;
			content[template.kind] = result.status;
		}
		return { container, files, content, diagnostics };
	}

	private diagnostic(
		code: string,
		message: string,
		fixApplied: boolean,
	): PublicationDiagnostic {
		return {
			code: `publication.assets.${code}`,
			field: "assets",
			severity: "warning",
			message,
			fixAvailable: code !== "prerequisites",
			fixApplied,
		};
	}

	private validDate(date: string): boolean {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
		const instant = new Date(`${date}T00:00:00Z`);
		return (
			!Number.isNaN(instant.valueOf()) &&
			instant.toISOString().slice(0, 10) === date
		);
	}

	private validateTemplates(templates: readonly AssetTemplate[]): void {
		if (
			!templates.length ||
			templates.some(
				(template) =>
					!template.id || !template.name.trim() || !template.kind.trim(),
			) ||
			new Set(templates.map(({ id }) => id)).size !== templates.length ||
			new Set(templates.map(({ kind }) => kind)).size !== templates.length
		) {
			throw new Error(
				"Asset templates must have unique IDs, unique kinds, and non-empty names",
			);
		}
	}
}
export type ReconcileEventAssetsArguments =
	ConstructorParameters<typeof ReconcileEventAssets> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;

import * as core from "@actions/core";
import type { DraftSourceInput } from "./draft-source-input.js";
export interface DraftMediaInput {
	readonly credentials: string;
	readonly publicFolderId: string;
}
export class DraftMediaInputReader {
	constructor(private readonly secrets: Pick<DraftSourceInput, "secret">) {}
	announcement(): { readonly credentials: string } {
		return { credentials: this.secrets.secret("google-credentials") };
	}
	artwork(): DraftMediaInput {
		return {
			...this.announcement(),
			publicFolderId: core.getInput("google-drive-public-folder-id", {
				required: true,
			}),
		};
	}
}

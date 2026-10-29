import type {
	DiscoverAssetContent,
	DiscoverAssetContentArguments,
} from "./discover-asset-content.js";
import type {
	ResolveContentValues,
	ResolveContentValuesArguments,
} from "./resolve-content-values.js";
import type { ContentContractPolicy } from "../domain/content-contract-policy.js";
import type { ContentManifestPolicy } from "../domain/content-manifest-policy.js";
import type { ContentRecoveryFingerprint } from "../domain/content-recovery-fingerprint.js";
import type { ContentRecoveryPlan } from "../domain/content-recovery-plan.js";
import type { ContentRenderPlan } from "../domain/content-render-plan.js";
import type { ContentTextKey } from "../domain/content-text-key.js";
import type {
	ContentRecovery,
	PublicAssetModel,
} from "../domain/asset-content.js";
export type ReconcileContentInput = Readonly<{
	folderId: string;
	fileId: string;
	templateId: string;
	kind: string;
	mimeType: string;
	contract?: unknown;
	fresh?: boolean;
	model: PublicAssetModel;
	recovery?: ContentRecovery;
	managed?: boolean;
}>;

export interface ReconcileAssetContentCollaborators {
	readonly createDiscoverAssetContent: (
		...args: DiscoverAssetContentArguments
	) => Pick<DiscoverAssetContent, "read">;
	readonly contentContractPolicy: Pick<ContentContractPolicy, "parse">;
	readonly contentRenderPlan: Pick<
		ContentRenderPlan,
		"initial" | "changes" | "pending" | "settle"
	>;
	readonly contentTextKey: Pick<ContentTextKey, "of">;
	readonly contentManifestPolicy: Pick<ContentManifestPolicy, "parse">;
	readonly contentRecoveryFingerprint: Pick<
		ContentRecoveryFingerprint,
		"create"
	>;
	readonly contentRecoveryPlan: Pick<
		ContentRecoveryPlan,
		"active" | "beforeRead" | "settle"
	>;
	readonly createResolveContentValues: (
		...args: ResolveContentValuesArguments
	) => ResolveContentValues;
}

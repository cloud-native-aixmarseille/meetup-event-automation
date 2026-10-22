import {
	ReconcileAssetContent,
	type ReconcileAssetContentArguments,
} from "./application/reconcile-asset-content.js";
import {
	ReconcileAssetFile,
	type ReconcileAssetFileArguments,
} from "./application/reconcile-asset-file.js";
import {
	ReconcileEventAssets,
	type ReconcileEventAssetsArguments,
} from "./application/reconcile-event-assets.js";
import {
	ReconcileSlidePdf,
	type ReconcileSlidePdfArguments,
} from "./application/reconcile-slide-pdf.js";
import {
	ResolveContentValues,
	type ResolveContentValuesArguments,
} from "./application/resolve-content-values.js";
import {
	AssetFolderUrlPolicy,
	type AssetFolderUrlPolicyArguments,
} from "./domain/asset-folder-url-policy.js";
import {
	CommunityEventUrlPolicy,
	type CommunityEventUrlPolicyArguments,
} from "./domain/community-event-url-policy.js";
import { ContentAnchorIdentity } from "./domain/content-anchor-identity.js";
import { ContentBindingPolicy } from "./domain/content-binding-policy.js";
import { ContentContractPolicy } from "./domain/content-contract-policy.js";
import { ContentFingerprint } from "./domain/content-fingerprint.js";
import { ContentManifestPolicy } from "./domain/content-manifest-policy.js";
import { ContentRecoveryFingerprint } from "./domain/content-recovery-fingerprint.js";
import { ContentRecoveryPlan } from "./domain/content-recovery-plan.js";
import { ContentRenderPlan } from "./domain/content-render-plan.js";
import { ContentTextKey } from "./domain/content-text-key.js";
import { FeedbackLinkSelection } from "./domain/feedback-link-selection.js";
import { FeedbackPolicy } from "./domain/feedback-policy.js";
import { ManualPublicationPolicy } from "./domain/manual-task-policy.js";
import {
	MeetupEventUrlPolicy,
	type MeetupEventUrlPolicyArguments,
} from "./domain/meetup-event-url-policy.js";
import { PublicationDiagnostics } from "./domain/model.js";
import { PdfExportPolicy } from "./domain/pdf-export-policy.js";
import { PresentationFileUrl } from "./domain/presentation-file-url.js";
import { PublicAssetUrl } from "./domain/public-asset-url.js";
import { PublicationLinkEvaluation } from "./domain/publication-link-evaluation.js";
import {
	PublicationUrlPolicyEngine,
	type PublicationUrlPolicyEngineArguments,
} from "./domain/publication-url-policy-engine.js";
import { ScheduledEventPolicy } from "./domain/scheduled-event-policy.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class PublicationDomainComposition {
	pdfExportPolicy(): PdfExportPolicy {
		return new PdfExportPolicy();
	}
	reconcileSlidePdf(...args: ReconcileSlidePdfArguments): ReconcileSlidePdf {
		return new ReconcileSlidePdf(this.pdfExportPolicy(), ...args);
	}
	assetFolderUrlPolicy(
		...args: AssetFolderUrlPolicyArguments
	): AssetFolderUrlPolicy {
		return new AssetFolderUrlPolicy(
			{ publicationLinkEvaluation: this.publicationLinkEvaluation() },
			...args,
		);
	}
	communityEventUrlPolicy(
		...args: CommunityEventUrlPolicyArguments
	): CommunityEventUrlPolicy {
		return new CommunityEventUrlPolicy(
			{ publicationLinkEvaluation: this.publicationLinkEvaluation() },
			...args,
		);
	}
	contentAnchorIdentity(): ContentAnchorIdentity {
		return new ContentAnchorIdentity();
	}
	contentBindingPolicy(): ContentBindingPolicy {
		return new ContentBindingPolicy({
			contentContractPolicy: this.contentContractPolicy(),
		});
	}
	contentContractPolicy(): ContentContractPolicy {
		return new ContentContractPolicy({ contentTextKey: this.contentTextKey() });
	}
	contentFingerprint(): ContentFingerprint {
		return new ContentFingerprint();
	}
	contentManifestPolicy(): ContentManifestPolicy {
		return new ContentManifestPolicy({
			contentAnchorIdentity: this.contentAnchorIdentity(),
			contentContractPolicy: this.contentContractPolicy(),
			contentBindingPolicy: this.contentBindingPolicy(),
			contentTextKey: this.contentTextKey(),
		});
	}
	contentRecoveryFingerprint(): ContentRecoveryFingerprint {
		return new ContentRecoveryFingerprint({
			contentFingerprint: this.contentFingerprint(),
		});
	}
	contentRecoveryPlan(): ContentRecoveryPlan {
		return new ContentRecoveryPlan({
			contentRecoveryFingerprint: this.contentRecoveryFingerprint(),
			contentRenderPlan: this.contentRenderPlan(),
		});
	}
	contentRenderPlan(): ContentRenderPlan {
		return new ContentRenderPlan({
			contentContractPolicy: this.contentContractPolicy(),
			contentAnchorIdentity: this.contentAnchorIdentity(),
		});
	}
	contentTextKey(): ContentTextKey {
		return new ContentTextKey();
	}
	feedbackLinkSelection(): FeedbackLinkSelection {
		return new FeedbackLinkSelection({ feedbackPolicy: this.feedbackPolicy() });
	}
	feedbackPolicy(): FeedbackPolicy {
		return new FeedbackPolicy();
	}
	manualPublicationPolicy(): ManualPublicationPolicy {
		return new ManualPublicationPolicy();
	}
	meetupEventUrlPolicy(
		...args: MeetupEventUrlPolicyArguments
	): MeetupEventUrlPolicy {
		return new MeetupEventUrlPolicy(
			{ publicationLinkEvaluation: this.publicationLinkEvaluation() },
			...args,
		);
	}
	presentationFileUrl(): PresentationFileUrl {
		return new PresentationFileUrl();
	}
	publicAssetUrl(): PublicAssetUrl {
		return new PublicAssetUrl();
	}
	publicationDiagnostics(): PublicationDiagnostics {
		return new PublicationDiagnostics();
	}
	publicationLinkEvaluation(): PublicationLinkEvaluation {
		return new PublicationLinkEvaluation();
	}
	publicationUrlPolicyEngine(
		...args: PublicationUrlPolicyEngineArguments
	): PublicationUrlPolicyEngine {
		return new PublicationUrlPolicyEngine(
			{ publicationDiagnostics: this.publicationDiagnostics() },
			...args,
		);
	}
	reconcileAssetContent(
		...args: ReconcileAssetContentArguments
	): ReconcileAssetContent {
		return new ReconcileAssetContent(
			{
				contentContractPolicy: this.contentContractPolicy(),
				contentRenderPlan: this.contentRenderPlan(),
				contentTextKey: this.contentTextKey(),
				contentManifestPolicy: this.contentManifestPolicy(),
				contentRecoveryFingerprint: this.contentRecoveryFingerprint(),
				contentRecoveryPlan: this.contentRecoveryPlan(),
				createResolveContentValues: (...args) =>
					this.resolveContentValues(...args),
			},
			...args,
		);
	}
	reconcileAssetFile(...args: ReconcileAssetFileArguments): ReconcileAssetFile {
		return new ReconcileAssetFile(...args);
	}
	reconcileEventAssets(
		...args: ReconcileEventAssetsArguments
	): ReconcileEventAssets {
		return new ReconcileEventAssets(
			{
				createReconcileAssetFile: (...args) => this.reconcileAssetFile(...args),
			},
			...args,
		);
	}
	resolveContentValues(
		...args: ResolveContentValuesArguments
	): ResolveContentValues {
		return new ResolveContentValues(
			{
				contentTextKey: this.contentTextKey(),
				contentContractPolicy: this.contentContractPolicy(),
				contentFingerprint: this.contentFingerprint(),
			},
			...args,
		);
	}
	scheduledEventPolicy(): ScheduledEventPolicy {
		return new ScheduledEventPolicy();
	}
}

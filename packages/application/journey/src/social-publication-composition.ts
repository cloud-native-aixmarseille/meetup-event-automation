import { SocialRecoveryReference } from "@meetup-automation/communication";
import { MeetupPublicationChecklist } from "@meetup-automation/event";
import { ReconcileSocialPublications } from "./communication/reconcile-social-publications.js";
import { RecoverSocialPublication } from "./communication/recover-social-publication.js";
import { SocialPublicationApprovalRequest } from "./communication/social-publication-approval-request.js";
import type { SocialPublicationDependencies } from "./communication/social-publication-contracts.js";
import { SocialPublicationDelivery } from "./communication/social-publication-delivery.js";
import { SocialPublicationIntents } from "./communication/social-publication-intents.js";
import { SocialPublicationReview } from "./communication/social-publication-review.js";

export class SocialPublicationComposition {
	recovery(
		dependencies: SocialPublicationDependencies,
	): RecoverSocialPublication {
		return new RecoverSocialPublication(
			dependencies.journal,
			dependencies.store,
			dependencies.approvals,
			new SocialPublicationApprovalRequest(
				dependencies.timing,
				dependencies.fingerprints,
			),
			new SocialRecoveryReference(),
			dependencies.fingerprints,
		);
	}
	create(
		dependencies: SocialPublicationDependencies,
	): ReconcileSocialPublications {
		const requests = new SocialPublicationApprovalRequest(
			dependencies.timing,
			dependencies.fingerprints,
		);
		const review = new SocialPublicationReview(
			dependencies,
			requests,
			new MeetupPublicationChecklist(),
		);
		const intents = new SocialPublicationIntents(dependencies);
		return new ReconcileSocialPublications(
			dependencies,
			review,
			requests,
			intents,
			new SocialPublicationDelivery(dependencies, intents, review),
		);
	}
}

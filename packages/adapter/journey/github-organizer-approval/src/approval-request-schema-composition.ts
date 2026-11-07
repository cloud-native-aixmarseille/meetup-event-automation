import {
	DraftProposalComposition,
	EmailReviewParameterPolicy,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import {
	PublicAssetUrl,
	PublicationDomainComposition,
} from "@meetup-automation/publication";
import { MeetupSlidesApprovalSchema } from "./meetup-slides-approval-schema.js";
import { PresentationFileUrl } from "@meetup-automation/publication";
import { ApprovalRequestSchema } from "./approval-request-schema.js";
import { ApprovalSchema } from "./approval-schema.js";
import { CommunityApprovalDetailsSchema } from "./community-approval-details-schema.js";
import { ContentApprovalSchema } from "./content-approval-schema.js";
import { ContentValueSchema } from "./content-value-schema.js";
import { EmailApprovalDetailsSchema } from "./email-approval-details-schema.js";
import { EmailApprovalMessageSchema } from "./email-approval-message-schema.js";
import type { FollowUpSchema } from "./follow-up-schema.js";
import type { MeetupApprovalDetailsSchema } from "./meetup-approval-details-schema.js";
import { SocialPublicationApprovalSchema } from "./social-publication-approval-schema.js";
import { StoredApprovalSchema } from "./stored-approval-schema.js";

/** Assemble the closed external schemas for each independent approval purpose. */
export class ApprovalRequestSchemaComposition {
	email(approvalSchema: ApprovalSchema): EmailApprovalDetailsSchema {
		return new EmailApprovalDetailsSchema({
			approvalSchema,
			messageSchema: new EmailApprovalMessageSchema(approvalSchema),
			parameterPolicy: new EmailReviewParameterPolicy(),
		});
	}
	stored(
		approvalRequestSchema: ApprovalRequestSchema,
		followUpSchema: FollowUpSchema,
	): StoredApprovalSchema {
		return new StoredApprovalSchema({
			approvalRequestSchema,
			followUpSchema,
			approvalSchema: new ApprovalSchema(),
			parameterPolicy: new EmailReviewParameterPolicy(),
			approvalRequestPolicy:
				new JourneyPolicyComposition().approvalRequestPolicy(),
		});
	}
	create(
		approvalSchema: ApprovalSchema,
		meetupApprovalDetailsSchema: MeetupApprovalDetailsSchema,
		emailApprovalDetailsSchema: EmailApprovalDetailsSchema,
	): ApprovalRequestSchema {
		const values = new ContentValueSchema(new PublicAssetUrl());
		return new ApprovalRequestSchema({
			slides: new MeetupSlidesApprovalSchema(
				approvalSchema,
				new PresentationFileUrl(),
			),
			approvalSchema,
			meetupApprovalDetailsSchema,
			emailApprovalDetailsSchema,
			socialPublicationApprovalSchema: new SocialPublicationApprovalSchema(
				values,
			),
			contentApprovalSchema: new ContentApprovalSchema(
				approvalSchema,
				new DraftProposalComposition().policy(),
				values,
			),
			communityApprovalDetailsSchema: new CommunityApprovalDetailsSchema({
				approvalSchema,
				scheduledEventPolicy:
					new PublicationDomainComposition().scheduledEventPolicy(),
			}),
		});
	}
}

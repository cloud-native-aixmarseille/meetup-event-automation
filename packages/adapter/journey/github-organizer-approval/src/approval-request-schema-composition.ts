import { DraftProposalComposition } from "@meetup-automation/journey";
import {
	PublicAssetUrl,
	PublicationDomainComposition,
} from "@meetup-automation/publication";
import { ApprovalRequestSchema } from "./approval-request-schema.js";
import type { ApprovalSchema } from "./approval-schema.js";
import { CommunityApprovalDetailsSchema } from "./community-approval-details-schema.js";
import { ContentApprovalSchema } from "./content-approval-schema.js";
import { ContentValueSchema } from "./content-value-schema.js";
import type { EmailApprovalDetailsSchema } from "./email-approval-details-schema.js";
import type { MeetupApprovalDetailsSchema } from "./meetup-approval-details-schema.js";
import { SocialPublicationApprovalSchema } from "./social-publication-approval-schema.js";

/** Assemble the closed external schemas for each independent approval purpose. */
export class ApprovalRequestSchemaComposition {
	create(
		approvalSchema: ApprovalSchema,
		meetupApprovalDetailsSchema: MeetupApprovalDetailsSchema,
		emailApprovalDetailsSchema: EmailApprovalDetailsSchema,
	): ApprovalRequestSchema {
		const values = new ContentValueSchema(new PublicAssetUrl());
		return new ApprovalRequestSchema({
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

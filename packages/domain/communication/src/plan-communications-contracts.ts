import {
	type CommunicationKind,
	MAIL_TEMPLATE_NAMES,
	type MailRecipient,
	type MailTemplateName,
} from "./model.js";

export type LocalDate = {
	readonly year: number;
	readonly month: number;
	readonly day: number;
};

export type MailPolicy = {
	readonly kind: CommunicationKind;
	readonly templateName: MailTemplateName;
};

export const MAIL_POLICIES = {
	introduction: {
		hosting: {
			kind: "host-introduction",
			templateName: MAIL_TEMPLATE_NAMES.hostIntroduction,
		},
		speaker: {
			kind: "speaker-introduction",
			templateName: MAIL_TEMPLATE_NAMES.speakerIntroduction,
		},
	},
	thanks: {
		hosting: {
			kind: "host-thanks",
			templateName: MAIL_TEMPLATE_NAMES.hostThanks,
		},
		speaker: {
			kind: "speaker-thanks",
			templateName: MAIL_TEMPLATE_NAMES.speakerThanks,
		},
	},
} as const satisfies Record<
	"introduction" | "thanks",
	Record<MailRecipient["role"], MailPolicy>
>;

import { EN_MESSAGES } from "./messages.en.js";
import { FR_MESSAGES } from "./messages.fr.js";
import { STAGE_MESSAGES_EN } from "./stage-messages.en.js";
import { STAGE_MESSAGES_FR } from "./stage-messages.fr.js";
export const CATALOGS = {
	en: { ...EN_MESSAGES, ...STAGE_MESSAGES_EN },
	fr: { ...FR_MESSAGES, ...STAGE_MESSAGES_FR },
} as const;
export type MessageId = keyof typeof CATALOGS.en;

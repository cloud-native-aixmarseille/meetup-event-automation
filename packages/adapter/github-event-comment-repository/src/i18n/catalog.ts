import { EN_MESSAGES } from "./messages.en.js";
import { FR_MESSAGES } from "./messages.fr.js";
export const CATALOGS = {
	en: { ...EN_MESSAGES },
	fr: { ...FR_MESSAGES },
} as const;
export type MessageId = keyof typeof CATALOGS.en;

import { DIAGNOSTICS_REFERENTIAL_EN } from "./diagnostics-referential.en.js";
import { DIAGNOSTICS_REFERENTIAL_FR } from "./diagnostics-referential.fr.js";
import { EN_MESSAGES } from "./messages.en.js";
import { FR_MESSAGES } from "./messages.fr.js";
import { REGISTRATION_EN } from "./registration.en.js";
import { REGISTRATION_FR } from "./registration.fr.js";
export const CATALOGS = {
	en: {
		...EN_MESSAGES,
		...DIAGNOSTICS_REFERENTIAL_EN,
		...REGISTRATION_EN,
	},
	fr: {
		...FR_MESSAGES,
		...DIAGNOSTICS_REFERENTIAL_FR,
		...REGISTRATION_FR,
	},
} as const;
export type MessageId = keyof typeof CATALOGS.en;

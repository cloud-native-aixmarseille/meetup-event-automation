import { DIAGNOSTICS_COMMUNICATION_EN } from "./diagnostics-communication.en.js";
import { DIAGNOSTICS_COMMUNICATION_FR } from "./diagnostics-communication.fr.js";
import { DIAGNOSTICS_EVENT_EN } from "./diagnostics-event.en.js";
import { DIAGNOSTICS_EVENT_FR } from "./diagnostics-event.fr.js";
import { DIAGNOSTICS_OTHER_EN } from "./diagnostics-other.en.js";
import { DIAGNOSTICS_OTHER_FR } from "./diagnostics-other.fr.js";
import { DIAGNOSTICS_REFERENTIAL_EN } from "./diagnostics-referential.en.js";
import { DIAGNOSTICS_REFERENTIAL_FR } from "./diagnostics-referential.fr.js";
import { EN_MESSAGES } from "./messages.en.js";
import { FR_MESSAGES } from "./messages.fr.js";
export const CATALOGS = {
	en: {
		...EN_MESSAGES,
		...DIAGNOSTICS_REFERENTIAL_EN,
		...DIAGNOSTICS_EVENT_EN,
		...DIAGNOSTICS_COMMUNICATION_EN,
		...DIAGNOSTICS_OTHER_EN,
	},
	fr: {
		...FR_MESSAGES,
		...DIAGNOSTICS_REFERENTIAL_FR,
		...DIAGNOSTICS_EVENT_FR,
		...DIAGNOSTICS_COMMUNICATION_FR,
		...DIAGNOSTICS_OTHER_FR,
	},
} as const;
export type MessageId = keyof typeof CATALOGS.en;

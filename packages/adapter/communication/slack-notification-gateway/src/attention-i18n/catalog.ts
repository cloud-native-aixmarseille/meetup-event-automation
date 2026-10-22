import { messages as en } from "./messages.en.js";
import { messages as fr } from "./messages.fr.js";
export const CATALOGS = { en, fr };
export type MessageId = keyof typeof en;

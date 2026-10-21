import { LocaleResolver } from "./locale-resolver.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class LocalizationComposition {
	localeResolver(): LocaleResolver {
		return new LocaleResolver();
	}
}

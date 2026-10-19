import {
	type AssetFileName,
	PublicationDomainComposition,
} from "@meetup-automation/publication";
import { TemplatingComposition } from "@meetup-automation/templating";

export class AssetFileNameComposition {
	create(locale: string): AssetFileName {
		return new PublicationDomainComposition().assetFileName(
			new TemplatingComposition().renderer(locale),
		);
	}
}

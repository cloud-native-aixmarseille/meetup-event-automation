import type { TemplateContentDefaults } from "@meetup-automation/publication";
import type { AssetMessages } from "./asset-messages.js";

const IMAGE_ROOT =
	"https://raw.githubusercontent.com/cloud-native-aixmarseille/meetup-event-automation/7aa93b28afb0de2af9dcff5d91ec82e7c2227600/assets/template-fallbacks";

export class AssetTemplateDefaults {
	constructor(private readonly messages: Pick<AssetMessages, "t">) {}
	create(): TemplateContentDefaults {
		return {
			missingNextEvent: this.messages.t("asset.next-event.missing", {}),
			missingAbstract: this.messages.t("asset.abstract.missing", {}),
			speaker: {
				url: `${IMAGE_ROOT}/generic-speaker.png`,
				description: this.messages.t("asset.speaker.generic", {}),
			},
			host: {
				url: `${IMAGE_ROOT}/generic-host.png`,
				description: this.messages.t("asset.host.generic", {}),
			},
		};
	}
}

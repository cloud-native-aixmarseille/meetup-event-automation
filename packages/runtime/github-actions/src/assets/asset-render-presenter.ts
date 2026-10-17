import type {
	AssetRenderPresenter,
	PublicAssetModel,
} from "@meetup-automation/publication";
import { AssetMessages } from "./asset-messages.js";

export class AssetRenderPresenterImpl implements AssetRenderPresenter {
	constructor(private readonly messages = new AssetMessages()) {}

	format(
		input: Parameters<AssetRenderPresenter["format"]>[0],
	): PublicAssetModel {
		return {
			text: {
				"event.title": input.title,
				"event.date": this.date(input.date, input.timeZone),
				"host.name": input.hostName,
				"event.feedback_url": input.feedbackUrl,
				agenda: input.agenda
					.map((talk) =>
						this.messages.t("asset.agenda.talk", {
							title: talk.title,
							speakers: new Intl.ListFormat(this.messages.locale, {
								style: "long",
								type: "conjunction",
							}).format(talk.speakers),
						}),
					)
					.join("\n"),
			},
			pictures: input.pictures,
		};
	}

	private date(date: string | undefined, timeZone: string): string | undefined {
		if (!date) return undefined;
		try {
			new Intl.DateTimeFormat(this.messages.locale, { timeZone });
			// The event stores a calendar date in its timezone, not a UTC instant.
			const instant = new Date(`${date}T00:00:00Z`);
			if (instant.toISOString().slice(0, 10) !== date) return undefined;
			return new Intl.DateTimeFormat(this.messages.locale, {
				dateStyle: "long",
				timeZone: "UTC",
			}).format(instant);
		} catch {
			return undefined;
		}
	}
}

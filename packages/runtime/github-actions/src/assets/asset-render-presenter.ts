import type {
	AssetRenderPresenter,
	PublicAssetModel,
	TextKey,
} from "@meetup-automation/publication";
import { AssetMessages } from "./asset-messages.js";
import { AssetDateFormatter } from "./asset-date-formatter.js";

type RenderInput = Parameters<AssetRenderPresenter["format"]>[0];

export class AssetRenderPresenterImpl implements AssetRenderPresenter {
	constructor(private readonly messages = new AssetMessages()) {}

	format(input: RenderInput): PublicAssetModel {
		const date = new AssetDateFormatter(this.messages.locale);
		return {
			text: {
				"event.title": input.title,
				"event.date": date.format(input.date, input.timeZone),
				"event.date.month": date.format(input.date, input.timeZone, "month"),
				"event.date.numeric": date.format(
					input.date,
					input.timeZone,
					"numeric",
				),
				"event.date.weekday": date.format(
					input.date,
					input.timeZone,
					"weekday",
				),
				"host.name": input.hostName,
				"host.address": input.venue?.address,
				"host.postal_code": input.venue?.postalCode,
				"host.city": input.venue?.city,
				"event.feedback_url": input.feedbackUrl,
				"next_event.date": date.format(input.nextEvent?.date, input.timeZone),
				"next_event.date.numeric": date.format(
					input.nextEvent?.date,
					input.timeZone,
					"numeric",
				),
				"next_event.host.name": input.nextEvent?.hostName,
				"next_event.host.city": input.nextEvent?.city,
				agenda: input.agenda
					.map((talk) =>
						this.messages.t("asset.agenda.talk", {
							title: talk.title,
							speakers: this.names(talk.speakers),
						}),
					)
					.join("\n"),
				...this.slots(input),
			},
			pictures: input.pictures,
			hostLogo: input.hostLogo,
		};
	}

	private slots(input: RenderInput): Partial<Record<TextKey, string>> {
		const text: Partial<Record<TextKey, string>> = {};
		for (const [slot, talk] of Object.entries(input.talks ?? {})) {
			text[`talk.title:${slot}`] = talk.title;
			text[`talk.abstract:${slot}`] = talk.abstract;
			text[`talk.speakers:${slot}`] = this.names(talk.speakers);
		}
		for (const [slot, name] of Object.entries(input.speakers ?? {}))
			text[`speaker.name:${slot}`] = name;
		return text;
	}

	private names(speakers: readonly string[]): string {
		return new Intl.ListFormat(this.messages.locale, {
			style: "long",
			type: "conjunction",
		}).format(speakers);
	}
}

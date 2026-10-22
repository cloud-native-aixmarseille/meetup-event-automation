import type { IssueFormMessages } from "./i18n/issue-form-messages.js";
import { AVAILABLE_SPEAKERS_MARKER } from "./yaml-issue-form-projection-contracts.js";

export class SpeakerReferencesPresenter {
	constructor(private readonly messages: IssueFormMessages) {}

	render(speakers: readonly string[]): string {
		const references = speakers
			.map((speaker) => `- <code>${this.escapeHtml(speaker)}</code>`)
			.join("\n");

		return [
			AVAILABLE_SPEAKERS_MARKER,
			"",
			this.messages.t("form.speakers.guidance"),
			"",
			"<details>",
			`<summary>${this.messages.t("form.speakers.show")}</summary>`,
			"",
			references,
			"",
			"</details>",
		].join("\n");
	}

	private escapeHtml(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	}
}
export type SpeakerReferencesPresenterArguments = ConstructorParameters<
	typeof SpeakerReferencesPresenter
>;

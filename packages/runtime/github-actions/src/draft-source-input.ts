import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { Locale } from "@meetup-automation/localization";
import type { ConferenceHallInput } from "./conference-hall-input.js";
import type { ContentConfiguration } from "./content-configuration.js";
import type { MeetupPublicationConfiguration } from "./meetup-publication-configuration.js";
import type { PublicationUrlInput } from "./publication-url-input.js";
import type { RuntimeInput } from "./runtime-input.js";

export class DraftSourceInput {
	constructor(
		private readonly runtime: Pick<RuntimeInput, "positiveIntegerInput">,
		private readonly urls: Pick<
			PublicationUrlInput,
			| "readMeetupEventUrlPrefix"
			| "readCommunityEventUrlPrefixes"
			| "readAssetFolderUrlPrefix"
		>,
		private readonly conference: Pick<ConferenceHallInput, "read">,
		private readonly configuration: Pick<ContentConfiguration, "load">,
		private readonly publication: Pick<MeetupPublicationConfiguration, "load">,
	) {}
	async read(locale: Locale) {
		return {
			...context.repo,
			locale,
			...this.conference.read(),
			issueNumber: this.runtime.positiveIntegerInput(
				"issue-number",
				core.getInput("issue-number", { required: true }),
			),
			meetupEventUrlPrefix: this.urls.readMeetupEventUrlPrefix(),
			communityEventUrlPrefixes: this.urls.readCommunityEventUrlPrefixes(),
			assetFolderUrlPrefix: this.urls.readAssetFolderUrlPrefix(),
			client: getOctokit(this.secret("github-token")),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			settings: await this.configuration.load(process.cwd()),
			publication: await this.publication.load(process.cwd()),
		};
	}
	secret(name: string): string {
		const value = core.getInput(name, { required: true });
		core.setSecret(value);
		return value;
	}
}

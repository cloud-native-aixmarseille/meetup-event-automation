import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ManageMeetupPublication } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import { ConferenceHallInput } from "./conference-hall-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { MessageId } from "./i18n/catalog.js";
import { MeetupPublicationComposition } from "./meetup-publication-composition.js";
import { MeetupPublicationConfiguration } from "./meetup-publication-configuration.js";
import { RuntimeInput } from "./runtime-input.js";

export class MeetupPublicationAction {
	static async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const email = MeetupPublicationAction.secret("meetup-email");
		const password = MeetupPublicationAction.secret("meetup-password");
		const geminiApiKey = MeetupPublicationAction.secret("gemini-api-key");
		const githubToken = MeetupPublicationAction.secret("github-token");
		const { owner, repo } = context.repo;
		const container = MeetupPublicationComposition.create({
			...ConferenceHallInput.read(),
			owner,
			repo,
			issueNumber,
			locale: messages.locale,
			client: getOctokit(githubToken),
			email,
			password,
			geminiApiKey,
			slackToken: MeetupPublicationAction.secret("slack-token"),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
			geminiModel: core.getInput("gemini-model", { required: true }),
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			settings: await MeetupPublicationConfiguration.load(process.cwd()),
		});
		const result = await container.get(ManageMeetupPublication).execute({
			repository: `${owner}/${repo}`,
			issueNumber,
		});
		return {
			details: [
				messages.t("report.event.context", { issue: issueNumber, mode: "fix" }),
				messages.t(`report.meetup.${result.status}`),
				...(result.reviewUrl
					? [messages.t("report.meetup.review", { url: result.reviewUrl })]
					: []),
				...result.diagnostics.map((item) =>
					messages.t(`diagnostic.${item.code}` as MessageId),
				),
			],
			diagnostics: result.diagnostics,
		};
	}

	private static secret(name: string): string {
		const value = core.getInput(name, {
			required: true,
			trimWhitespace: name !== "meetup-password",
		});
		core.setSecret(value);
		return value;
	}
}

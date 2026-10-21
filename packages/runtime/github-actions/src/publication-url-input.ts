import * as core from "@actions/core";
import { MeetupGroupUrl } from "@meetup-automation/publication";

/** Validate explicit deployment URL prefixes before constructing provider adapters. */
export class PublicationUrlInput {
	readMeetupEventUrlPrefix(): string {
		return this.validateMeetupEventUrlPrefix(
			core.getInput("meetup-event-url-prefix", {
				required: true,
				trimWhitespace: false,
			}),
		);
	}

	readCommunityEventUrlPrefixes(): readonly string[] {
		const community = core.getInput("community-event-url-prefixes", {
			required: true,
			trimWhitespace: false,
		});
		let communityEventUrlPrefixes: unknown;
		try {
			communityEventUrlPrefixes = JSON.parse(community);
		} catch {
			throw new Error("Invalid input: community-event-url-prefixes");
		}
		return this.validateCommunityEventUrlPrefixes(communityEventUrlPrefixes);
	}

	readAssetFolderUrlPrefix(): string {
		return this.validateAssetFolderUrlPrefix(
			core.getInput("asset-folder-url-prefix", {
				required: true,
				trimWhitespace: false,
			}),
		);
	}

	validateMeetupEventUrlPrefix(value: unknown): string {
		const meetupEventUrlPrefix = this.prefix(value, "meetup-event-url-prefix");
		if (!MeetupGroupUrl.fromEventUrlPrefix(meetupEventUrlPrefix))
			throw new Error("Invalid input: meetup-event-url-prefix");
		return meetupEventUrlPrefix;
	}

	validateCommunityEventUrlPrefixes(community: unknown): readonly string[] {
		if (!Array.isArray(community) || community.length === 0)
			throw new Error("Invalid input: community-event-url-prefixes");
		return community.map((prefix: unknown) =>
			this.prefix(prefix, "community-event-url-prefixes"),
		);
	}

	validateAssetFolderUrlPrefix(value: unknown): string {
		return this.prefix(value, "asset-folder-url-prefix");
	}

	private prefix(value: unknown, name: string): string {
		if (
			typeof value !== "string" ||
			!/^https:\/\/[^/?#@]+\/[^?#]*$/.test(value) ||
			/[\s\\\p{Cc}]/u.test(value)
		)
			throw new Error(`Invalid input: ${name}`);
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			throw new Error(`Invalid input: ${name}`);
		}
		if (
			url.protocol !== "https:" ||
			!url.hostname ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		)
			throw new Error(`Invalid input: ${name}`);
		return value;
	}
}

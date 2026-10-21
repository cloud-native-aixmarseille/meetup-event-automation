import * as core from "@actions/core";
import {
	MeetupGroupUrl,
	type PublicationUrlConfiguration,
} from "@meetup-automation/publication";
import type { RuntimeInput } from "./runtime-input.js";

/** Validate explicit deployment URL prefixes before constructing provider adapters. */
export class PublicationUrlInput {
	constructor(private readonly runtimeInput: Pick<RuntimeInput, "isObject">) {}
	read(): PublicationUrlConfiguration {
		const meetupEventUrlPrefix = core.getInput("meetup-event-url-prefix", {
			required: true,
			trimWhitespace: false,
		});
		const community = core.getInput("community-event-url-prefixes", {
			required: true,
			trimWhitespace: false,
		});
		const assetFolderUrlPrefix = core.getInput("asset-folder-url-prefix", {
			required: true,
			trimWhitespace: false,
		});
		let communityEventUrlPrefixes: unknown;
		try {
			communityEventUrlPrefixes = JSON.parse(community);
		} catch {
			throw new Error("Invalid input: community-event-url-prefixes");
		}
		return this.validate({
			meetupEventUrlPrefix,
			communityEventUrlPrefixes,
			assetFolderUrlPrefix,
		});
	}

	validate(configuration: unknown): PublicationUrlConfiguration {
		if (!this.runtimeInput.isObject(configuration))
			throw new Error("Invalid publication URL configuration");
		const meetupEventUrlPrefix = this.prefix(
			configuration.meetupEventUrlPrefix,
			"meetup-event-url-prefix",
		);
		if (!MeetupGroupUrl.fromEventUrlPrefix(meetupEventUrlPrefix))
			throw new Error("Invalid input: meetup-event-url-prefix");
		const community = configuration.communityEventUrlPrefixes;
		if (!Array.isArray(community) || community.length === 0)
			throw new Error("Invalid input: community-event-url-prefixes");
		const communityEventUrlPrefixes = community.map((prefix: unknown) =>
			this.prefix(prefix, "community-event-url-prefixes"),
		);
		return {
			meetupEventUrlPrefix,
			communityEventUrlPrefixes,
			assetFolderUrlPrefix: this.prefix(
				configuration.assetFolderUrlPrefix,
				"asset-folder-url-prefix",
			),
		};
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

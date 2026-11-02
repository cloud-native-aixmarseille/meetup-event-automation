import {
	EventWebsiteError,
	type EventWebsiteRepository,
	type WebsiteEvent,
} from "@meetup-automation/publication";
import type {
	GithubWebsiteClient,
	GithubWebsiteTarget,
} from "./github-website-client.js";
import type { WebsiteMessages } from "./i18n/website-messages.js";
import type { WebsiteCalendarCodec } from "./website-calendar-codec.js";

export class GithubEventWebsite implements EventWebsiteRepository {
	constructor(
		private readonly createClient: () => GithubWebsiteClient,
		private readonly target: GithubWebsiteTarget,
		private readonly codec: WebsiteCalendarCodec,
		private readonly messages: WebsiteMessages,
	) {}
	async upsert(
		event: WebsiteEvent,
		beforeWrite: () => Promise<void>,
	): Promise<void> {
		let client: GithubWebsiteClient;
		try {
			client = this.createClient();
		} catch {
			throw new EventWebsiteError("access");
		}
		for (let attempt = 0; attempt < 3; attempt++) {
			const file = await this.read(client);
			const updated = this.codec.upsert(file.content, event);
			if (updated === file.content) return;
			await beforeWrite();
			try {
				await client.rest.repos.createOrUpdateFileContents({
					...this.target,
					sha: file.sha,
					content: Buffer.from(updated).toString("base64"),
					message: this.messages.t("website.commit", { date: event.date }),
				});
				return;
			} catch (error) {
				if (this.status(error) === 409 && attempt < 2) continue;
				throw this.failure(error);
			}
		}
	}
	private async read(
		client: GithubWebsiteClient,
	): Promise<{ content: string; sha: string }> {
		let data: unknown;
		try {
			data = (await client.rest.repos.getContent(this.target)).data;
		} catch (error) {
			throw this.failure(error);
		}
		if (
			!data ||
			typeof data !== "object" ||
			Array.isArray(data) ||
			!("type" in data) ||
			data.type !== "file" ||
			!("encoding" in data) ||
			data.encoding !== "base64" ||
			!("content" in data) ||
			typeof data.content !== "string" ||
			data.content.length > 1_000_000 ||
			!("sha" in data) ||
			typeof data.sha !== "string" ||
			!/^[a-f0-9]{40}$/.test(data.sha)
		)
			throw new EventWebsiteError("format");
		return {
			content: Buffer.from(data.content, "base64").toString("utf8"),
			sha: data.sha,
		};
	}
	private status(error: unknown): number | undefined {
		return error &&
			typeof error === "object" &&
			"status" in error &&
			typeof error.status === "number"
			? error.status
			: undefined;
	}
	private failure(error: unknown): EventWebsiteError {
		const status = this.status(error);
		return new EventWebsiteError(
			status === 409
				? "conflict"
				: status === 401 || status === 403 || status === 404
					? "access"
					: "unavailable",
		);
	}
}

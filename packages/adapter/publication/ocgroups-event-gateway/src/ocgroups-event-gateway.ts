import {
	type CommunityEvent,
	type EventPublicationGateway,
	type EventPublicationIdentity,
	type SavedEventPublication,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { BrowserType, Page } from "playwright-core";
import type { OcgroupsEventEditor } from "./ocgroups-event-editor.js";
import type { OcgroupsEventPublisher } from "./ocgroups-event-publisher.js";
import type { OcgroupsLogin } from "./ocgroups-login.js";

export interface OcgroupsSessionComponents {
	login: Pick<OcgroupsLogin, "login">;
	editor: Pick<OcgroupsEventEditor, "save" | "inspect">;
	publisher: Pick<OcgroupsEventPublisher, "publish">;
}

export class OcgroupsEventGateway
	implements EventPublicationGateway<CommunityEvent>
{
	constructor(
		private readonly browserType: Pick<BrowserType, "launch">,
		private readonly credentials: Readonly<{
			username: string;
			password: string;
		}>,
		private readonly createSession: (page: Page) => OcgroupsSessionComponents,
	) {}

	inspect(reference: string): Promise<SavedEventPublication> {
		return this.withSession("UTC", (components) =>
			components.editor.inspect(reference),
		);
	}

	save(
		event: CommunityEvent,
		identity: EventPublicationIdentity | undefined,
		beforeSubmit: () => Promise<void>,
		onSaved: (identity: EventPublicationIdentity) => Promise<void>,
	): Promise<SavedEventPublication> {
		return this.withSession(event.timeZone, (components) =>
			components.editor.save(event, identity, beforeSubmit, onSaved),
		);
	}

	publish(
		event: CommunityEvent,
		identity: EventPublicationIdentity,
		beforePublish: () => Promise<void>,
	): Promise<SavedEventPublication> {
		return this.withSession(event.timeZone, (components) =>
			components.publisher.publish(event, identity, beforePublish),
		);
	}

	private async withSession(
		timezoneId: string,
		operation: (
			session: OcgroupsSessionComponents,
		) => Promise<SavedEventPublication>,
	): Promise<SavedEventPublication> {
		const browser = await this.browserType
			.launch({ headless: true })
			.catch(() => {
				throw new ScheduledEventError("unavailable");
			});
		try {
			const context = await browser.newContext({
				locale: "en-US",
				timezoneId,
				viewport: { width: 1600, height: 1200 },
			});
			const page = await context.newPage();
			page.setDefaultTimeout(20_000);
			const session = this.createSession(page);
			await session.login.login(
				this.credentials.username,
				this.credentials.password,
			);
			return await operation(session);
		} catch (error) {
			if (error instanceof ScheduledEventError) throw error;
			throw new ScheduledEventError("editor");
		} finally {
			await browser.close().catch(() => undefined);
		}
	}
}

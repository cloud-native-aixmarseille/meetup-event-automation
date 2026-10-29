import {
	CommunityEventIdentityPolicy,
	type ContentImageLoader,
} from "@meetup-automation/publication";
import { chromium, type Page } from "playwright-core";
import { OcgroupsDashboard } from "./ocgroups-dashboard.js";
import { OcgroupsEditorLocation } from "./ocgroups-editor-location.js";
import { OcgroupsEditorState } from "./ocgroups-editor-state.js";
import { OcgroupsEventContent } from "./ocgroups-event-content.js";
import { OcgroupsEventEditor } from "./ocgroups-event-editor.js";
import { OcgroupsEventFields } from "./ocgroups-event-fields.js";
import {
	OcgroupsEventGateway,
	type OcgroupsSessionComponents,
} from "./ocgroups-event-gateway.js";
import { OcgroupsEventPublisher } from "./ocgroups-event-publisher.js";
import { OcgroupsLogin } from "./ocgroups-login.js";
import { OcgroupsPhotoImage } from "./ocgroups-photo-image.js";
import { OcgroupsPhotos } from "./ocgroups-photos.js";
import { OcgroupsRegistration } from "./ocgroups-registration.js";
import { OcgroupsSpeakers } from "./ocgroups-speakers.js";
import { OcgroupsSponsors } from "./ocgroups-sponsors.js";
import type { OcgroupsTarget } from "./ocgroups-target.js";

export class OcgroupsEventGatewayComposition {
	constructor(private readonly images: ContentImageLoader) {}
	create(
		target: OcgroupsTarget,
		credentials: Readonly<{ username: string; password: string }>,
	): OcgroupsEventGateway {
		return new OcgroupsEventGateway(chromium, credentials, (page) =>
			this.session(page, target),
		);
	}

	session(page: Page, target: OcgroupsTarget): OcgroupsSessionComponents {
		const identities = new CommunityEventIdentityPolicy(target.group);
		const dashboard = new OcgroupsDashboard(page, target);
		const state = new OcgroupsEditorState(page, target, identities);
		const fields = new OcgroupsEventContent(
			new OcgroupsEventFields(page),
			new OcgroupsSpeakers(page),
			new OcgroupsSponsors(page),
			new OcgroupsPhotos(
				page,
				target.group.origin,
				new OcgroupsPhotoImage(page, this.images),
			),
		);
		const registration = new OcgroupsRegistration(page);
		return {
			login: new OcgroupsLogin(page, target.group.origin),
			editor: new OcgroupsEventEditor(
				page,
				target.group.origin,
				dashboard,
				state,
				fields,
				registration,
				new OcgroupsEditorLocation(target.group.origin, identities),
			),
			publisher: new OcgroupsEventPublisher(
				page,
				target.group.origin,
				dashboard,
				state,
				fields,
				registration,
			),
		};
	}
}

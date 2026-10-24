import { CommunityEventIdentityPolicy } from "@meetup-automation/publication";
import { chromium, type Page } from "playwright-core";
import { OcgroupsDashboard } from "./ocgroups-dashboard.js";
import { OcgroupsEditorLocation } from "./ocgroups-editor-location.js";
import { OcgroupsEditorState } from "./ocgroups-editor-state.js";
import { OcgroupsEventEditor } from "./ocgroups-event-editor.js";
import { OcgroupsEventFields } from "./ocgroups-event-fields.js";
import {
	OcgroupsEventGateway,
	type OcgroupsSessionComponents,
} from "./ocgroups-event-gateway.js";
import { OcgroupsEventPublisher } from "./ocgroups-event-publisher.js";
import { OcgroupsLogin } from "./ocgroups-login.js";
import { OcgroupsRegistration } from "./ocgroups-registration.js";
import type { OcgroupsTarget } from "./ocgroups-target.js";

export class OcgroupsEventGatewayComposition {
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
		const fields = new OcgroupsEventFields(page);
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

import {
	type CommunityEvent,
	CommunityGroupUrl,
} from "@meetup-automation/publication";
import type { BrowserContext } from "playwright-core";
import { contentForm, speaker, sponsor } from "./content-fixture.js";
import { cover, photoPath } from "./photo-fixture.js";

export const origin = "https://ocgroups.example.test";
export const id = "10000000-0000-4000-8000-000000000001";
export const communityId = "20000000-0000-4000-8000-000000000002";
export const groupId = "30000000-0000-4000-8000-000000000003";
export const categoryId = "40000000-0000-4000-8000-000000000004";
export const prefix = `${origin}/cncf/group/example/event/`;
export const remote = {
	id,
	reviewUrl: `${origin}/dashboard/group/events/${id}/update`,
	publicUrl: `${prefix}example-evening`,
};
export const event: CommunityEvent = {
	meetupUrl: "https://www.meetup.com/example/events/12345/",
	cover,
	speakers: [speaker],
	sponsor,
	title: "Example evening",
	description: "Public agenda\n\nExample Speaker: Reliable platforms",
	date: "2099-11-20",
	startTime: "18:45",
	endTime: "20:45",
	timeZone: "Europe/Paris",
	categoryId,
	venue: {
		name: "Example Venue",
		address: "1 Example Road",
		city: "Example City",
		zipCode: "10000",
		state: "Example State",
		country: "France",
		countryCode: "FR",
	},
	registration: {
		capacity: 75,
		waitlist: true,
		approvalRequired: false,
		reminder: true,
	},
};
export function target() {
	const group = CommunityGroupUrl.parse(prefix);
	if (!group) throw new Error("Invalid synthetic target");
	return { group, communityId, groupId };
}
export function values(input: CommunityEvent) {
	return {
		name: input.title,
		meetup_url: input.meetupUrl,
		description: input.description,
		kind_id: "in-person",
		category_id: input.categoryId,
		timezone: input.timeZone,
		starts_at: `${input.date}T${input.startTime}`,
		ends_at: `${input.date}T${input.endTime}`,
		venue_name: input.venue.name,
		venue_address: input.venue.address,
		venue_city: input.venue.city,
		venue_zip_code: input.venue.zipCode,
		venue_state_name: input.venue.state,
		venue_country_name: input.venue.country,
		venue_country_code: input.venue.countryCode,
		venue_state_code: "",
		latitude: "",
		longitude: "",
		waitlist_enabled: String(input.registration.waitlist),
		attendee_approval_required: String(input.registration.approvalRequired),
		event_reminder_enabled: String(input.registration.reminder),
		test_event: "false",
		meeting_requested: "false",
		registration_starts_at: "",
		registration_ends_at: "",
		"ticket_types[0][active]": "true",
		"ticket_types[0][availability]": "public",
		"ticket_types[0][seats_total]": String(input.registration.capacity),
		"ticket_types[0][price_windows][0][amount_minor]": "0",
	};
}
function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;");
}
function shell(body: string, selected = groupId) {
	return `<!doctype html><html lang="en"><head><meta name="description" content="Synthetic page"><style>
 label.toggle {position:relative;display:inline-flex;width:180px;height:24px}
 label.toggle input {position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
 label.toggle .toggle-track {position:absolute;inset:0;background:#ddd}
 </style></head><body>
 <button id="user-dropdown-button" data-logged-in="true">Account</button><div id="user-dropdown"><ul><li><div class="font-medium">example-organizer</div></li></ul></div>
 <a href="/cncf/group/example">Group public site</a><community-selector selected-community-id="${communityId}"></community-selector><group-selector selected-group-id="${selected}"></group-selector>
 ${body}</body></html>`;
}
function editor(
	data: Record<string, string>,
	published: boolean,
	creating: boolean,
	selected: string,
	canceled: boolean,
	series: boolean,
) {
	const ordinary = Object.entries(data)
		.filter(
			([key]) =>
				!["description", "kind_id", "category_id", "timezone"].includes(key) &&
				!/^(photos_urls|speakers\[|sponsors\[)/.test(key),
		)
		.map(
			([key, value]) =>
				`<input ${key === "starts_at" || key === "ends_at" ? 'type="datetime-local"' : 'type="text"'} name="${escapeHtml(key)}" id="${escapeHtml(key)}" value="${escapeHtml(value)}">`,
		)
		.join("");
	const toggles = [
		"test_event",
		"waitlist_enabled",
		"attendee_approval_required",
		"event_reminder_enabled",
	]
		.map(
			(key) =>
				`<label class="toggle"><input type="checkbox" id="toggle_${key}" ${data[key] === "true" ? "checked" : ""} onchange="document.getElementsByName('${key}')[0].value=String(this.checked)"><span class="toggle-track"></span>${key}</label>`,
		)
		.join("");
	return shell(
		`<div id="${creating ? "new-event" : "event-update-page"}" data-event-page="${creating ? "add" : "update"}" data-event-public-url="/cncf/group/example/event/example-evening" data-event-public-url-enabled="${published}" data-event-canceled="${canceled}" data-event-past="false" data-can-manage-events="true" data-community-name="cncf" data-group-slug="example">
 <button data-section="details">Details</button><button data-section="date-venue">Date and venue</button><button data-section="payments">Tickets</button>
 ${ordinary}${toggles}
 ${contentForm(data)}
 <timezone-selector name="timezone"><input type="hidden" name="timezone" value="${escapeHtml(data.timezone)}"></timezone-selector>
 <select name="kind_id" id="kind_id"><option value="in-person">In person</option></select><select id="category_id" name="category_id"><option value="${categoryId}">Meetup</option></select>
 <markdown-editor id="description" name="description"><textarea class="CodeMirror" oninput="document.querySelector('textarea[name=description]').value=this.value">${escapeHtml(data.description ?? "")}</textarea><textarea name="description" hidden>${escapeHtml(data.description ?? "")}</textarea></markdown-editor>
 <select id="recurrence_pattern"><option value="just-once">Just once</option></select>
 <button data-ticketing-action="edit-ticket">Edit</button><input id="ticket-title-draft"><input id="ticket-seats-draft"><select id="ticket-availability-draft"><option value="public">Public</option></select><label class="toggle"><input type="checkbox" data-ticket-field="active"><span class="toggle-track"></span>Active</label><input data-ticket-window-field="amount" value="0" readonly>
 <button data-ticketing-action="save-ticket" onclick="document.getElementsByName('ticket_types[0][seats_total]')[0].value=document.getElementById('ticket-seats-draft').value">Save ticket</button>
 <button id="${creating ? "add" : "update"}-event-button" ${creating ? 'hx-post="/dashboard/group/events/add"' : `hx-put="/dashboard/group/events/${id}/update"`} onclick="save()">Save</button>
 <button id="publish-event-button" data-has-related-events="${series}" data-action-url="/dashboard/group/events/${id}/publish" ${published ? 'disabled title="This event is already published."' : ""} onclick="document.querySelector('.swal2-popup').hidden=false">Publish</button>
 <div class="swal2-popup" hidden><div class="swal2-html-container">Are you sure you wish to publish this event?</div><button onclick="fetch('/dashboard/group/events/${id}/publish?return=editor', {method:'PUT'})">Yes</button></div>
 </div><script>
 async function save() {
 const data=Object.fromEntries(Array.from(document.querySelectorAll('input[name], textarea[name], select[name]')).map(input=>[input.name,input.value]));
 await fetch('${creating ? "/dashboard/group/events/add" : `/dashboard/group/events/${id}/update`}', {method:'${creating ? "POST" : "PUT"}', body:JSON.stringify(data)});
 }
 </script>`,
		selected,
	);
}
export async function installBrowserFixture(
	context: BrowserContext,
	initial: "missing" | "draft" | "published" = "missing",
) {
	const state = {
		exists: initial !== "missing",
		published: initial === "published",
		fields: values(event) as Record<string, string>,
		saves: 0,
		uploads: 0,
		publishes: 0,
		selected: groupId,
		canceled: false,
		series: false,
		brokenAfterSave: false,
		invalidLocation: false,
		username: "example-organizer",
	};
	if (initial !== "missing")
		Object.assign(state.fields, {
			"photos_urls[]": photoPath,
			"speakers[0][user_id]": speaker.userId,
			"speakers[0][featured]": "false",
			"sponsors[0][group_sponsor_id]": sponsor.id,
			"sponsors[0][level]": sponsor.level,
		});
	await context.route(`${origin}/**`, async (route) => {
		const path = new URL(route.request().url()).pathname;
		const method = route.request().method();
		if (path === "/images" && method === "POST") {
			state.uploads++;
			return route.fulfill({ status: 201, json: { url: photoPath } });
		}
		if (path === "/log-in") {
			if (method === "POST")
				return route.fulfill({
					status: 303,
					headers: { location: "/dashboard/group?tab=events" },
				});
			return route.fulfill({
				contentType: "text/html",
				body: `<form method="post" action="/log-in" onsubmit="event.preventDefault(); location.href='/dashboard/group?tab=events'"><input name="username" id="username"><input name="password" id="password" type="password"><button>Sign In</button></form>`,
			});
		}
		if (path.endsWith("/publish") && method === "PUT") {
			state.publishes++;
			state.published = true;
			return route.fulfill({ status: 204 });
		}
		if (
			(path.endsWith("/add") || path.endsWith("/update")) &&
			method !== "GET"
		) {
			state.saves++;
			state.exists = true;
			state.fields = route.request().postDataJSON();
			return route.fulfill({
				status: 201,
				headers: {
					"hx-location": state.invalidLocation
						? "{}"
						: JSON.stringify({
								path: `/dashboard/group/events/${id}/update`,
								target: "#dashboard-content",
								push: "false",
							}),
				},
			});
		}
		if (path === "/dashboard/group")
			return route.fulfill({
				contentType: "text/html",
				body: shell(
					`<button hx-get="/dashboard/group/events/add" onclick="location.href='/dashboard/group/events/add'">Add event</button><div id="upcoming-content"><div id="upcoming-events-list">${state.exists ? `<button hx-get="/dashboard/group/events/${id}/update" onclick="location.href='/dashboard/group/events/${id}/update'">Example evening</button>` : ""}</div></div>`,
					state.selected,
				).replace(">example-organizer<", `>${state.username}<`),
			});
		if (state.brokenAfterSave && state.saves)
			return route.fulfill({ status: 503, body: "Unavailable" });
		return route.fulfill({
			contentType: "text/html",
			body: editor(
				state.fields,
				state.published,
				path.endsWith("/add"),
				state.selected,
				state.canceled,
				state.series,
			),
		});
	});
	return state;
}

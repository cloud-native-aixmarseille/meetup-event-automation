import type { ScheduledEvent } from "@meetup-automation/publication";
import type { BrowserContext } from "playwright-core";
import type { SavedMeetupEvent } from "../src/saved-meetup-event.js";

export const groupUrl = "https://www.meetup.com/example-group/";
export const eventUrl = `${groupUrl}events/12345/`;
export const desiredEvent: ScheduledEvent = {
	title: "Example evening",
	description: "A public description\n\nExample Speaker\nA useful talk",
	date: "2026-11-20",
	startTime: "18:45",
	endTime: "20:45",
	timeZone: "Europe/Paris",
	venue: { name: "Example Venue", city: "Example City" },
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll('"', "&quot;");
}

function editor(
	event: ScheduledEvent | undefined,
	status: SavedMeetupEvent["status"],
	previewAvailable: boolean,
) {
	const value = event ?? {
		...desiredEvent,
		title: "",
		description: "",
		date: "2026-10-20",
	};
	return `<!doctype html><html lang="en"><body>
<input data-testid="event-name-input" value="${escapeHtml(value.title)}">
<button aria-label="Open date picker" onclick="openCalendar('start')">Date</button>
<input type="time" aria-label="Edit start time" value="${value.startTime}">
<div id="duration"><button onclick="document.querySelector('[role=menuitem]').hidden=false">2 hours</button></div>
<button role="menuitem" hidden onclick="document.getElementById('custom-end').hidden=false;this.hidden=true">Set an end time...</button>
<div id="custom-end" hidden><button aria-label="Open end date picker" onclick="openCalendar('end')">End date</button>
<input type="time" aria-label="Edit end time" value="${value.endTime}"></div>
<div id="calendar" hidden></div>
<div data-testid="event-description-editor"><div contenteditable="true">${escapeHtml(value.description)}</div></div>
<div><div><h3 id="venue-heading" ${event ? "" : "hidden"}>${escapeHtml(value.venue.name)}</h3></div><p>${escapeHtml(value.venue.city)}</p></div>
<button id="change" hidden onclick="document.getElementById('venue-heading').hidden=true">Change</button>
<input placeholder="Search or add location..." oninput="document.getElementById('venue-search-dropdown').hidden=false">
<div id="venue-search-dropdown" hidden><ul><li onclick="document.getElementById('venue-heading').hidden=false;document.getElementById('change').hidden=false;document.getElementById('venue-search-dropdown').hidden=true"><span>Example Venue</span><span>Example City</span></li></ul></div>
${
	status === "draft"
		? `<button data-testid="event-save-draft-btn">Save as draft</button>
${previewAvailable ? '<button data-testid="event-preview-btn" onclick="save(&quot;draft&quot;)">Preview</button>' : ""}
<button data-testid="event-publish-btn" onclick="save(&quot;published&quot;)">Publish</button>`
		: '<button onclick="save(&quot;published&quot;)">Save changes</button>'
}
<button data-testid="event-publish-btn" hidden>Publish</button>
<script>
let selectedDate=${JSON.stringify(value.date)}, endDate=${JSON.stringify((value as ScheduledEvent & { endDate?: string }).endDate ?? value.date)}, month=selectedDate.slice(0,7), mode='start';
function openCalendar(next) { mode=next; document.getElementById('calendar').hidden=false; renderCalendar(); }
function renderCalendar() {
document.getElementById('calendar').innerHTML='<button aria-label="Go to the Previous Month" onclick="month=\\'2026-10\\';renderCalendar()">Previous</button><button aria-label="Go to the Next Month" onclick="month=\\'2026-11\\';renderCalendar()">Next</button>' +
Array.from({length:28},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'); return '<div data-day="'+date+'" data-selected="'+(date===(mode==='start'?selectedDate:endDate))+'"><button onclick="selectDate(\\''+date+'\\')">'+(i+1)+'</button></div>';}).join('');
}
function selectDate(date) { if(mode==='start') selectedDate=date; else endDate=date; document.getElementById('calendar').hidden=true; }
document.addEventListener('keydown', event => { if(event.key==='Escape') document.getElementById('calendar').hidden=true; });
async function save(status) {
await fetch('/__synthetic-save', {method:'POST',body:JSON.stringify({
status, title:document.querySelector('[data-testid=event-name-input]').value,
description:document.querySelector('[contenteditable=true]').innerText,
date:selectedDate, endDate,
startTime:document.querySelector('[aria-label="Edit start time"]').value,
endTime:document.querySelector('[aria-label="Edit end time"]').value,
timeZone:'Europe/Paris', venue:{name:document.getElementById('venue-heading').innerText,city:'Example City'}
})}); location.href=${JSON.stringify(eventUrl)};
}
</script></body></html>`;
}

export async function editorFixture(
	context: BrowserContext,
	existing?: ScheduledEvent,
	status: SavedMeetupEvent["status"] = "draft",
) {
	const state = {
		event: existing,
		status,
		writes: 0,
		publishClicks: 0,
		corruptSaved: undefined as Partial<ScheduledEvent> | undefined,
		previewAvailable: true,
	};
	await context.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === "/__synthetic-save") {
			state.writes++;
			const saved = JSON.parse(route.request().postData() ?? "{}");
			if (saved.status === "published" && state.status === "draft")
				state.publishClicks++;
			state.status = saved.status;
			state.event = saved;
			if (state.corruptSaved && state.event)
				state.event = { ...state.event, ...state.corruptSaved };
			await route.fulfill({ status: 200, body: "{}" });
			return;
		}
		if (
			url.pathname.endsWith("/schedule/") ||
			url.pathname.endsWith("/edit/")
		) {
			await route.fulfill({
				contentType: "text/html",
				body: editor(
					url.pathname.endsWith("/edit/") ? state.event : undefined,
					state.status,
					state.previewAvailable,
				),
			});
			return;
		}
		const event = state.event;
		const json =
			event && state.status === "published"
				? {
						"@type": "Event",
						name: event.title,
						description: event.description.slice(0, 155),
						startDate: `${event.date}T${event.startTime}:00+01:00`,
						endDate: `${event.date}T${event.endTime}:00+01:00`,
						location: {
							name: event.venue.name,
							address: { addressLocality: event.venue.city },
						},
					}
				: {};
		await route.fulfill({
			contentType: "text/html",
			body: `<script type="application/ld+json">${JSON.stringify(json).replaceAll("<", "\\u003c")}</script>`,
		});
	});
	return state;
}

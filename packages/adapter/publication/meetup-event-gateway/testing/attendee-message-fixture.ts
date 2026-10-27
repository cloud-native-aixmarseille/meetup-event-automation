import type { BrowserContext } from "playwright-core";
import { groupUrl } from "./editor-fixture.js";

/** Synthetic controls matching the saved Meetup contact page; no member data. */
export async function attendeeMessageFixture(context: BrowserContext) {
	const state = {
		redirectUrl: "",
		stickyRsvp: false,
		sends: [] as {
			eventId: string;
			audience: string;
			statuses: string[];
			subject: string;
			message: string;
		}[],
	};
	await context.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === "/synthetic-send") {
			state.sends.push(route.request().postDataJSON());
			await route.fulfill({ contentType: "application/json", body: "{}" });
		} else if (state.redirectUrl && url.href !== state.redirectUrl) {
			await route.fulfill({
				contentType: "text/html",
				body: `<script>history.replaceState({}, '', ${JSON.stringify(state.redirectUrl)})</script>`,
			});
		} else if (url.pathname.endsWith("/messages/send/")) {
			await route.fulfill({
				contentType: "text/html",
				body: `<!doctype html><html lang="en"><body>
      <p>Send this message to:</p><div role="radiogroup">
      <label for="all"><button id="all" role="radio" aria-checked="true" value="all_members" onclick="audience(this)"></button>All members<span>Group members subscribed to group announcements</span></label>
      <label for="rsvp"><button id="rsvp" role="radio" aria-checked="false" value="subscribers" onclick="audience(this)"></button>Members based on RSVP status to a given event
      <div role="combobox">Example meetup</div></label></div>
      ${[
				["RSVP_YES", "Members who RSVPed Yes for this event"],
				["RSVP_NO", "Members who RSVPed No for this event"],
				["RSVP_UNANSWERED", "Members who haven't RSVPed for this event yet"],
				["WAITLIST", "Members on the waitlist"],
				["ATTENDED", "Members who went to this event"],
			]
				.map(
					([value, label]) =>
						`<div><button role="checkbox" id="selection-option-${value}" aria-checked="${value === "RSVP_YES" || value === "WAITLIST"}" onclick="toggle(this)"></button><label for="selection-option-${value}">${label}</label></div>`,
				)
				.join("")}
      <span>Subject:</span><input id="subject" type="text">
      <div id="groupDescriptionFieldLabel">Message:</div>
      <div class="toastui-editor md-mode active"><textarea hidden></textarea><div class="ProseMirror" contenteditable="true"></div></div>
      <div class="toastui-editor ww-mode" hidden><div class="ProseMirror toastui-editor-contents" contenteditable="true"></div></div>
      <button onclick="send()">Send message</button>
      <script>
      function audience(control) { document.querySelectorAll('[role=radio]').forEach(n=>n.setAttribute('aria-checked',String(n===control))); }
      function toggle(control) { if (${state.stickyRsvp} && control.id==='selection-option-RSVP_YES') return; control.setAttribute('aria-checked',String(control.getAttribute('aria-checked')!=='true')); }
      async function send() {
        await fetch('/synthetic-send', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
          eventId:new URL(location.href).searchParams.get('eventId'),
          audience:document.querySelector('[role=radio][aria-checked=true]').value,
          statuses:[...document.querySelectorAll('[role=checkbox][aria-checked=true]')].map(n=>n.id.replace('selection-option-','')),
          subject:document.querySelector('#subject').value,
          message:document.querySelector('.md-mode .ProseMirror').textContent
        }) }); history.pushState({},'', '${groupUrl}?success=email_sent'); document.body.innerHTML='<div role="status">Email has been successfully sent!</div>';
      }</script></body></html>`,
			});
		} else await route.abort();
	});
	return state;
}

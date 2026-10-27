export const EN_MESSAGES = {
	"comment.guidance.meetup.slides-source":
		"Fix the issue errors before sending slides to Meetup attendees.",
	"comment.guidance.meetup.slides-link":
		"Provide the published Meetup event link before sending slides.",
	"comment.guidance.meetup.slides-pdf-pending":
		"Run document and PDF reconciliation before sending slides to Meetup attendees.",
	"comment.guidance.meetup.slides-delivery-recovery":
		"Check the Meetup attendee message before retrying; delivery is unconfirmed.",
	"comment.guidance.meetup.slides-form-unavailable":
		"The Meetup attendee message form could not be verified. Check organizer access and the browser flow.",
	"comment.guidance.meetup.slides-source-changed":
		"The event changed before sending slides. Run publication reconciliation again.",
	"comment.guidance.content.review":
		"Review the current content request, supply missing public facts, or submit replacement content. Changed content needs fresh approval.",

	"comment.guidance.proposals.invalid-selection":
		"Enter distinct proposal numbers, one per line, from their Conference Hall URLs.",
	"comment.guidance.proposals.invalid":
		"Check the Conference Hall proposal selection and export format.",
	"comment.guidance.proposals.unavailable":
		"Conference Hall is unavailable. Check the CFP slug and API key, then retry.",
	"comment.guidance.proposals.rate-limited":
		"Conference Hall rate limit reached. Wait before retrying.",
	"comment.guidance.proposals.mapping-required":
		"Synchronize Conference Hall speakers and merge their identity mappings, then retry.",
	"comment.guidance.proposals.conflict":
		"Conflicting Conference Hall identifiers. Check the proposal and speaker mappings.",
	"comment.guidance.proposals.not-found":
		"Proposal number not found in this CFP. Check its Conference Hall URL.",
	"comment.guidance.proposals.not-accepted":
		"Accept the selected proposal in Conference Hall and check that the speaker has not declined.",
	"comment.guidance.event.link.feedback.invalid":
		"Enter a valid HTTPS link to the OpenFeedback event page.",
	"comment.resolved": "✅ Event details complete.",
	"comment.duplicate": "Superseded duplicate automation comment.",
	"comment.unknown": "Ask a maintainer to review the workflow diagnostics.",
	"comment.referential":
		"Ask a maintainer to correct the host or speaker catalog.",
	"comment.agenda.item": "Agenda (item {item}{speaker})",
	"comment.agenda.speaker-suffix": ", speaker {speaker}",
	"comment.agenda.speaker": "Agenda (speaker {speaker})",
	"comment.guidance.event.title.missing":
		"Generate or submit the event title, then approve it for automatic application.",
	"comment.guidance.event.date.missing":
		"Add the event date in YYYY-MM-DD format.",
	"comment.guidance.event.date.invalid":
		"Enter a valid calendar date in YYYY-MM-DD format.",
	"comment.guidance.event.description.missing":
		"Generate or submit the event description, then approve it for automatic application.",
	"comment.guidance.event.hoster.missing": "Select a host from the host list.",
	"comment.guidance.event.hoster.invalid":
		"Use a host name or stable ID from the host list.",
	"comment.guidance.event.hoster.multiple":
		"Select exactly one host for the event.",
	"comment.guidance.event.agenda.missing":
		"Add at least one talk using `- Speaker: Talk description`.",
	"comment.guidance.event.agenda.legacy-line-invalid":
		"Use `- Speaker: Talk description` for each agenda line.",
	"comment.guidance.event.agenda.speaker.missing":
		"Add at least one speaker for this talk.",
	"comment.guidance.event.agenda.speaker.invalid":
		"Enter a speaker name from the speaker list.",
	"comment.guidance.event.agenda.description.missing":
		"Add a talk description after the speaker name and colon.",
	"comment.guidance.publication.meetup.unpublished":
		"Approve or reject Meetup publication.",
	"comment.guidance.publication.meetup.missing":
		"Run event publication synchronization to populate the verified Meetup link.",
	"comment.guidance.publication.community.missing":
		"Run event publication synchronization and approve CNCF / OCGroups publication; automation adds the verified public link.",
	"comment.guidance.publication.assets.missing":
		"Run asset reconciliation to create the event folder and populate its Google Drive link.",
	"comment.guidance.event.link.meetup.invalid":
		"Enter a valid HTTPS link to the Meetup event page.",
	"comment.guidance.event.link.community.invalid":
		"Enter a valid HTTPS link to the CNCF / OCGroups event page.",
	"comment.guidance.event.link.assets.invalid":
		"Enter a valid HTTPS link to the event's Google Drive folder.",
	"comment.guidance.publication.meetup-url.invalid":
		"Use this group's Meetup event URL, ending with the numeric event ID.",
	"comment.guidance.publication.community-url.invalid":
		"Use this group's CNCF / OCGroups event URL.",
	"comment.guidance.publication.asset-url.invalid":
		"Use a Google Drive folder URL: `https://drive.google.com/drive/folders/FOLDER_ID`.",
	"comment.guidance.event.confirmation.host.missing":
		"Confirm the host, then add the `hoster:confirmed` label.",
	"comment.guidance.event.confirmation.speakers.missing":
		"Confirm the speakers, then add the `speakers:confirmed` label.",
	"comment.guidance.event.logistics.intent.invalid":
		"Choose `Yes` or `No`, or leave the response empty if undecided.",
	"comment.guidance.event.occurrence-status.invalid":
		"Use `scheduled`, `postponed`, `held`, or `cancelled`.",
	"comment.guidance.event.occurrence-status.label-conflict":
		"Keep only one occurrence label: `event:postponed`, `event:held`, or `event:cancelled`.",
	"comment.guidance.event.document.heading.missing":
		"Restore this section heading from the meetup issue template.",
	"comment.guidance.event.document.heading.duplicate":
		"Keep a single section with this heading and merge its content.",
	"comment.guidance.event.document.checkbox.invalid":
		"Use `- [ ] Task` for pending tasks and `- [x] Task` for completed tasks.",
	"comment.guidance.event.document.invalid-field-type":
		"Enter a text response in this field.",
	"comment.guidance.event.document.invalid-hoster-type":
		"Select one host from the host list.",
	"comment.guidance.event.document.invalid-hoster-entry":
		"Use a host name or stable ID from the host list.",
	"comment.guidance.event.document.invalid-agenda-type":
		"Write the agenda as a list of `- Speaker: Talk description` lines.",
	"comment.guidance.event.document.schema-marker.duplicate":
		"Ask a maintainer to repair the duplicate automation metadata in the issue description.",
	"comment.guidance.event.document.schema-version.unsupported":
		"Ask a maintainer to update the automation to support this issue format.",
	"comment.guidance.event.document.reference-metadata.missing":
		"Ask a maintainer to regenerate the missing host and speaker reference metadata.",
	"comment.guidance.event.document.reference-metadata.duplicate":
		"Ask a maintainer to repair the duplicate host and speaker reference metadata.",
	"comment.guidance.event.document.reference-metadata.invalid":
		"Ask a maintainer to regenerate the invalid host and speaker reference metadata.",
	"comment.guidance.event.document.reference-metadata.legacy":
		"Check the host and agenda references, then rerun the issue update workflow to refresh their old metadata.",
	"comment.guidance.event.document.reference-metadata.stale":
		"Check the host and agenda references, then rerun the issue update workflow to refresh their metadata.",
	"comment.guidance.referential.reference.host.unknown":
		"This host was not found in the host list. Copy its exact name, including accents, or use a name with its stable ID: `Host name [host-0001]`.",
	"comment.guidance.referential.reference.host.ambiguous":
		"Several hosts share this name. Include the correct stable ID: `Host name [host-0001]`.",
	"comment.guidance.referential.reference.host.display-name-mismatch":
		"Use the host name associated with this stable ID in the host list.",
	"comment.guidance.referential.reference.host.invalid":
		"Choose a host from the host list using its name or `Host name [host-0001]`.",
	"comment.guidance.referential.reference.speaker.unknown":
		"This speaker was not found in the speaker list. Copy its exact name, including accents, or use a name with its stable ID: `Speaker name [speaker-0001]`.",
	"comment.guidance.referential.reference.speaker.ambiguous":
		"Several speakers share this name. Include the correct stable ID: `Speaker name [speaker-0001]`.",
	"comment.guidance.referential.reference.speaker.display-name-mismatch":
		"Use the speaker name associated with this stable ID in the speaker list.",
	"comment.guidance.referential.reference.speaker.invalid":
		"Choose a speaker from the speaker list using its name or `Speaker name [speaker-0001]`.",
} as const;

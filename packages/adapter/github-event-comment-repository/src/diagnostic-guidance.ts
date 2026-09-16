export const FIELD_ORDER = [
	"Event Title",
	"Event Date",
	"Hoster",
	"Event Description",
	"Agenda",
	"Meetup Link",
	"CNCF Link",
	"Drive Link",
	"Slides & Content",
	"Communication",
	"Aperitif",
	"Restaurant / Bar",
	"Post event",
	"Host confirmation",
	"Speaker confirmation",
	"Event Status",
	"Issue format",
	"Referentials",
	"Meetup issue",
];

// These are presentation templates, not raw diagnostic messages: messages and
// arbitrary field paths can contain issue text or private referential values.
export const GUIDANCE = new Map<
	string,
	readonly [field: string, message: string]
>([
	["event.title.missing", ["Event Title", "Add a title for the event."]],
	[
		"event.date.missing",
		["Event Date", "Add the event date in YYYY-MM-DD format."],
	],
	[
		"event.date.invalid",
		["Event Date", "Enter a valid calendar date in YYYY-MM-DD format."],
	],
	[
		"event.description.missing",
		["Event Description", "Add a short description of the event."],
	],
	["event.hoster.missing", ["Hoster", "Select a host from the host list."]],
	[
		"event.hoster.invalid",
		["Hoster", "Use a host name or stable ID from the host list."],
	],
	[
		"event.hoster.multiple",
		["Hoster", "Select exactly one host for the event."],
	],
	[
		"event.agenda.missing",
		["Agenda", "Add at least one talk using `- Speaker: Talk description`."],
	],
	[
		"event.agenda.legacy-line-invalid",
		["Agenda", "Use `- Speaker: Talk description` for each agenda line."],
	],
	[
		"event.agenda.speaker.missing",
		["Agenda", "Add at least one speaker for this talk."],
	],
	[
		"event.agenda.speaker.invalid",
		["Agenda", "Enter a speaker name from the speaker list."],
	],
	[
		"event.agenda.description.missing",
		["Agenda", "Add a talk description after the speaker name and colon."],
	],
	[
		"publication.meetup.missing",
		["Meetup Link", "Add the link to the Meetup event page."],
	],
	[
		"publication.community.missing",
		["CNCF Link", "Add the link to the CNCF / OCGroups event page."],
	],
	[
		"publication.assets.missing",
		["Drive Link", "Add the link to the event's Google Drive folder."],
	],
	[
		"event.link.meetup.invalid",
		["Meetup Link", "Enter a valid HTTPS link to the Meetup event page."],
	],
	[
		"event.link.community.invalid",
		[
			"CNCF Link",
			"Enter a valid HTTPS link to the CNCF / OCGroups event page.",
		],
	],
	[
		"event.link.assets.invalid",
		[
			"Drive Link",
			"Enter a valid HTTPS link to the event's Google Drive folder.",
		],
	],
	[
		"publication.meetup-url.invalid",
		[
			"Meetup Link",
			"Use this group's Meetup event URL, ending with the numeric event ID.",
		],
	],
	[
		"publication.community-url.invalid",
		["CNCF Link", "Use this group's CNCF / OCGroups event URL."],
	],
	[
		"publication.asset-url.invalid",
		[
			"Drive Link",
			"Use a Google Drive folder URL: `https://drive.google.com/drive/folders/FOLDER_ID`.",
		],
	],
	[
		"event.confirmation.host.missing",
		[
			"Host confirmation",
			"Confirm the host, then add the `hoster:confirmed` label.",
		],
	],
	[
		"event.confirmation.speakers.missing",
		[
			"Speaker confirmation",
			"Confirm the speakers, then add the `speakers:confirmed` label.",
		],
	],
	[
		"event.logistics.intent.invalid",
		[
			"Logistics",
			"Choose `Yes` or `No`, or leave the response empty if undecided.",
		],
	],
	[
		"event.occurrence-status.invalid",
		["Event Status", "Use `scheduled`, `postponed`, `held`, or `cancelled`."],
	],
	[
		"event.occurrence-status.label-conflict",
		[
			"Event Status",
			"Keep only one occurrence label: `event:postponed`, `event:held`, or `event:cancelled`.",
		],
	],
	[
		"event.document.heading.missing",
		[
			"Issue format",
			"Restore this section heading from the meetup issue template.",
		],
	],
	[
		"event.document.heading.duplicate",
		[
			"Issue format",
			"Keep a single section with this heading and merge its content.",
		],
	],
	[
		"event.document.checkbox.invalid",
		[
			"Issue format",
			"Use `- [ ] Task` for pending tasks and `- [x] Task` for completed tasks.",
		],
	],
	[
		"event.document.invalid-field-type",
		["Issue format", "Enter a text response in this field."],
	],
	[
		"event.document.invalid-hoster-type",
		["Hoster", "Select one host from the host list."],
	],
	[
		"event.document.invalid-hoster-entry",
		["Hoster", "Use a host name or stable ID from the host list."],
	],
	[
		"event.document.invalid-agenda-type",
		[
			"Agenda",
			"Write the agenda as a list of `- Speaker: Talk description` lines.",
		],
	],
	[
		"event.document.schema-marker.duplicate",
		[
			"Issue format",
			"Ask a maintainer to repair the duplicate automation metadata in the issue description.",
		],
	],
	[
		"event.document.schema-version.unsupported",
		[
			"Issue format",
			"Ask a maintainer to update the automation to support this issue format.",
		],
	],
	[
		"event.document.reference-metadata.missing",
		[
			"Issue format",
			"Ask a maintainer to regenerate the missing host and speaker reference metadata.",
		],
	],
	[
		"event.document.reference-metadata.duplicate",
		[
			"Issue format",
			"Ask a maintainer to repair the duplicate host and speaker reference metadata.",
		],
	],
	[
		"event.document.reference-metadata.invalid",
		[
			"Issue format",
			"Ask a maintainer to regenerate the invalid host and speaker reference metadata.",
		],
	],
	[
		"event.document.reference-metadata.legacy",
		[
			"Issue format",
			"Check the host and agenda references, then rerun the issue update workflow to refresh their old metadata.",
		],
	],
	[
		"event.document.reference-metadata.stale",
		[
			"Issue format",
			"Check the host and agenda references, then rerun the issue update workflow to refresh their metadata.",
		],
	],
]);

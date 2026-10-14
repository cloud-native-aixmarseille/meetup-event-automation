export const EN_MESSAGES = {
	"communication.organizer-attention":
		"Meetup #{issue} · {date} is approaching and is not ready.\n\nPlease resolve:\n{reasons}\n\nReview and update the meetup issue: {url}",
	"communication.date-unknown": "date to confirm",
	"communication.reason.host-confirmation":
		"Confirm the host and add the hoster:confirmed label.",
	"communication.reason.speaker-confirmation":
		"Confirm the speakers and add the speakers:confirmed label.",
	"communication.reason.title": "Add the event title.",
	"communication.reason.date":
		"Set Event Date to a valid date in YYYY-MM-DD format.",
	"communication.reason.description": "Add the event description.",
	"communication.reason.host": "Choose one valid host in Hoster.",
	"communication.reason.agenda":
		"Complete Agenda with one line per talk: - Speaker: Talk description.",
	"communication.reason.agenda-speaker":
		"Choose a valid speaker for each talk in Agenda.",
	"communication.reason.agenda-description":
		"Add a description for each talk in Agenda.",
	"communication.reason.meetup-link":
		"Add or correct Meetup Link using the event URL without a language prefix (such as /fr-fr/).",
	"communication.reason.community-link":
		"Add or correct CNCF Link using the community event URL.",
	"communication.reason.assets-link":
		"Add or correct Drive Link using the event folder URL.",
	"communication.reason.feedback-link":
		"Correct OpenFeedback Link using an HTTPS event URL.",
	"communication.reason.aperitif": "Set Aperitif to Yes or No.",
	"communication.reason.restaurant": "Set Restaurant / Bar to Yes or No.",
	"communication.reason.logistics": "Set the logistics choices to Yes or No.",
	"communication.reason.issue-format":
		"Repair the issue format using the automation's validation comment.",
	"communication.reason.referentials":
		"Check the host and speaker references against the catalogs.",
	"communication.reason.unknown":
		"Review the remaining validation items on the meetup issue.",
} as const;

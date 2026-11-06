export const EN_MESSAGES = {
	"request.meetup-slides":
		"Slides delivery needs approval · {date} · <{url}|Review the PDF and approve sending>",
	"request.social-publication":
		"Post on {target} · {date}\nReview and approve publication: {url}",
	"request.community-publication":
		"CNCF · {date}\nReview and approve the event and OCGroups notifications: {url}",
	"request.content":
		"Content for {date} · {target}\nEdit if needed, then approve: {url}",
	"request.introduction":
		"{kind, select, host_introduction {Preparation email — host} speaker_introduction {Preparation emails — speakers} other {Introduction emails}} · {date} · Up to {count, plural, one {# recipient} other {# recipients}}\nApprove or reject: {url}",
	"request.publication":
		"Meetup · {date}\nReview and approve publication: {url}",
} as const;

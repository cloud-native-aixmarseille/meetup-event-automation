export const FR_MESSAGES = {
	"request.meetup-slides":
		"Envoi des slides à approuver · {date} · <{url}|Vérifier le PDF et approuver l'envoi>",
	"request.social-publication":
		"Publication sur {target} · {date}\nVérifiez et validez la publication : {url}",
	"request.community-publication":
		"CNCF · {date}\nValidez l'événement et les notifications OCGroups : {url}",
	"request.content":
		"Contenu du {date} · {target}\nModifiez si besoin, puis validez : {url}",
	"request.introduction":
		"{kind, select, host_introduction {Email de préparation — hôte} speaker_introduction {Emails de préparation — intervenants} other {Emails de préparation}} · {date} · {count, plural, one {# destinataire} other {# destinataires}} maximum\nApprouver ou refuser : {url}",
	"request.publication":
		"Meetup · {date}\nVérifiez et validez la publication : {url}",
} as const;

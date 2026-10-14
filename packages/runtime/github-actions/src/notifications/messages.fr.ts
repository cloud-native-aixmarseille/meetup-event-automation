import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"communication.organizer-attention":
		"Le meetup #{issue} · {date} approche et n'est pas prêt.\n\nPoints à résoudre :\n{reasons}\n\nConsultez et mettez à jour le ticket du meetup : {url}",
	"communication.date-unknown": "date à confirmer",
	"communication.reason.host-confirmation":
		"Confirmez le lieu d'accueil et ajoutez le label hoster:confirmed.",
	"communication.reason.speaker-confirmation":
		"Confirmez les intervenants et ajoutez le label speakers:confirmed.",
	"communication.reason.title": "Ajoutez le titre du meetup.",
	"communication.reason.date":
		"Renseignez Event Date avec une date valide au format YYYY-MM-DD.",
	"communication.reason.description": "Ajoutez la description du meetup.",
	"communication.reason.host":
		"Sélectionnez un seul lieu d'accueil valide dans Hoster.",
	"communication.reason.agenda":
		"Complétez Agenda avec une ligne par présentation : - Intervenant: Description.",
	"communication.reason.agenda-speaker":
		"Sélectionnez un intervenant valide pour chaque présentation dans Agenda.",
	"communication.reason.agenda-description":
		"Ajoutez une description pour chaque présentation dans Agenda.",
	"communication.reason.meetup-link":
		"Ajoutez ou corrigez Meetup Link avec l'URL de l'événement sans préfixe de langue (comme /fr-fr/).",
	"communication.reason.community-link":
		"Ajoutez ou corrigez CNCF Link avec l'URL de l'événement communautaire.",
	"communication.reason.assets-link":
		"Ajoutez ou corrigez Drive Link avec l'URL du dossier du meetup.",
	"communication.reason.feedback-link":
		"Corrigez OpenFeedback Link avec une URL HTTPS de l'événement.",
	"communication.reason.aperitif": "Renseignez Aperitif avec Yes ou No.",
	"communication.reason.restaurant":
		"Renseignez Restaurant / Bar avec Yes ou No.",
	"communication.reason.logistics":
		"Renseignez les choix logistiques avec Yes ou No.",
	"communication.reason.issue-format":
		"Corrigez le format du ticket en suivant le commentaire de validation de l'automatisation.",
	"communication.reason.referentials":
		"Vérifiez les références du lieu et des intervenants dans les catalogues.",
	"communication.reason.unknown":
		"Consultez les autres points de validation dans le ticket du meetup.",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

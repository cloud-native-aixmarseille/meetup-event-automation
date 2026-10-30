export const messages = {
	"action.content-approval-pending":
		"Modifiez le texte si besoin, puis validez ou demandez une autre proposition.",
	"action.social-approval-pending":
		"Vérifiez l'annonce et approuvez sa publication pour cette destination.",
	"failure.social": "La publication a échoué.",
	"task.social": "publications sur les réseaux",
	"action.community-approval-pending":
		"Approuvez ou refusez la publication OCGroups.",
	"failure.communications": "La préparation ou l'envoi des emails a échoué.",
	"failure.feedback": "La synchronisation OpenFeedback a échoué.",
	"failure.assets": "La préparation des fichiers Drive a échoué.",
	"failure.event": "La mise à jour du ticket a échoué.",
	"task.event-data": "informations du meetup",
	"slack.title": "Meetup #{issue}",
	"slack.more":
		"+{count, plural, one {# autre tâche} other {# autres tâches}} → Tout voir",
	"slack.run": "Voir l'exécution",
	"slack.review": "Voir les détails",
	"slack.unknown": "statut non vérifié",
	"action.missing-date": "Renseignez la date du meetup.",
	"action.required-data": "Complétez les informations du meetup.",
	"action.host-confirmation":
		"Sélectionnez un hôte dans le formulaire du meetup.",
	"action.speaker-confirmation":
		"Confirmez les intervenants (`speakers:confirmed`).",
	"action.manual-publication": "{task}.",
	"action.meetup-approval-pending":
		"Approuvez ou refusez la publication Meetup.",
	"action.approval-pending": "Approuvez ou refusez les emails.",
	"action.integration-failure": "Automatisation en échec : {task}.",
	"action.delivery-recovery": "Vérifiez l'envoi avant toute reprise.",
	"action.occurrence-decision":
		"Date passée : indiquez tenu, reporté ou annulé.",
	"action.follow-up": "{task}.",
	"action.stage-unknown": "Vérifiez l'étape inachevée : {task}.",

	"task.approvals": "validation des emails",
	"task.delivery": "reprise des envois",

	"attention.clear": "Aucune tâche en attente.",
	"task.publish-meetup-event": "Approuver la publication Meetup",
	"task.publish-community-event": "Publiez sur la plateforme CNCF",
	"task.create-asset-folder": "Préparez le dossier des ressources",
	"task.thank-host": "Remerciez l'hôte",
	"task.thank-speakers": "Remerciez les intervenants",
	"task.share-slides": "Partagez les présentations",
	"task.import-attendance": "Importez les présences",
	"task.share-social": "Publiez un récapitulatif sur LinkedIn",
	"task.event": "validation du meetup",
	"task.assets": "ressources",
	"task.feedback": "évaluations",
	"task.communications": "communications",
	"task.unknown": "consulter le ticket",
} as const;

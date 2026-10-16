export const messages = {
	"attention.redirect":
		"La confirmation et le suivi des tâches après le meetup sont dans le [commentaire de suivi commun]({url}).",
	"slack.title": "Meetup #{issue}",
	"slack.more":
		"+{count, plural, one {# autre tâche} other {# autres tâches}} → Tout voir",
	"slack.run": "Voir l'exécution",
	"slack.review": "Voir les détails",
	"slack.unknown": "statut non vérifié",
	"slack.missing-date": "Renseignez la date du meetup.",
	"slack.required-data": "Complétez les informations du meetup.",
	"slack.host-confirmation": "Confirmez le lieu hôte.",
	"slack.speaker-confirmation": "Confirmez les intervenants.",
	"slack.manual-publication": "Publication : {task}.",
	"slack.approval-pending": "Approuvez ou refusez le lot de courriels.",
	"slack.integration-failure": "Échec ou blocage : {task}.",
	"slack.delivery-recovery": "Vérifiez l'envoi avant toute reprise.",
	"slack.occurrence-decision":
		"Date passée : indiquez tenu, reporté ou annulé.",
	"slack.follow-up": "Suivi : {task}.",
	"slack.stage-unknown": "Vérifiez l'étape inachevée : {task}.",

	"attention.diagnostics": "Diagnostics détaillés",
	"task.approvals": "approbation des courriels",
	"task.delivery": "reprise des envois",
	"task.public-slack-local": "publier l'annonce sur le Slack local",
	"task.public-slack-community": "publier l'annonce sur le Slack communautaire",
	"task.public-social": "publier sur les réseaux sociaux",

	"attention.title": "Points à traiter par les organisateurs",
	"attention.date": "Date du meetup : {date}",
	"attention.full": "Consulter le statut complet sur le ticket",
	"attention.clear": "Aucune tâche organisateur en attente.",
	"attention.stopped":
		"Rappels des tâches arrêtés : le meetup est fermé, annulé ou reporté. Les envois non vérifiés nécessitent toujours une intervention.",
	"attention.pending":
		"La confirmation Slack est incertaine. Vérifiez le message réservé avant une reprise explicite ; tout nouvel envoi automatique est bloqué.",
	"attention.retry":
		"Slack a refusé le message. Une nouvelle tentative aura lieu après le délai de reprise.",
	"attention.unknown":
		"Évaluation indisponible ; les points précédents restent non résolus.",
	"attention.resolved": "Points résolus : {count, number}.",
	"attention.missing-date": "Renseignez une date valide dans le ticket.",
	"attention.required-data":
		"Complétez les informations requises du meetup ; consultez le commentaire de diagnostic.",
	"attention.host-confirmation":
		"Confirmez le lieu et ajoutez le label de confirmation.",
	"attention.speaker-confirmation":
		"Confirmez les intervenants et ajoutez le label de confirmation.",
	"attention.manual-publication":
		"Terminez la tâche de publication manuelle : {task}.",
	"attention.approval-pending":
		"Approuvez ou refusez le lot de courriels dans sa demande initiale.",
	"attention.integration-failure":
		"Consultez l'étape en échec ou bloquée ({task}) dans l'exécution ; corrigez sa configuration ou ses données avant de réessayer.",
	"attention.delivery-recovery":
		"Vérifiez l'envoi externe et son registre avant toute reprise. Ne renvoyez pas un message dont le statut est incertain.",
	"attention.occurrence-decision":
		"La date prévue est passée. Indiquez si le meetup a eu lieu, est reporté ou est annulé.",
	"attention.follow-up":
		"Terminez la tâche de suivi : {task}. Un envoi de courriel accepté ne prouve pas sa réception.",
	"attention.stage-unknown":
		"L'étape {task} ne s'est pas terminée. Consultez l'exécution ; ses points précédents restent non résolus.",
	"task.publish-meetup-event": "publier sur Meetup",
	"task.publish-community-event": "publier sur la plateforme CNCF",
	"task.create-asset-folder": "préparer le dossier des ressources",
	"task.thank-host": "envoyer les remerciements au lieu hôte",
	"task.thank-speakers": "envoyer les remerciements aux intervenants",
	"task.share-slides": "partager les présentations",
	"task.import-attendance": "importer les présences",
	"task.share-social": "partager sur les réseaux sociaux",
	"task.event": "validation du meetup",
	"task.assets": "ressources",
	"task.feedback": "évaluations",
	"task.communications": "communications",
	"task.unknown": "consulter le ticket",
} as const;

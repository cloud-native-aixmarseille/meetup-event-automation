export const messages = {
	"action.slides-approval-pending":
		"Approuver l'envoi du PDF aux participants Meetup.",
	"failure.publication.meetup.authentication-configuration":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-captcha-required":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-captcha-rejected":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-captcha-unavailable":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-session-not-reusable":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-login-page-unavailable":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-login-form-unavailable":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-submit-unavailable":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-redirect-timeout":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-account-unavailable":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-account-mismatch":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-unexpected-page":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-rate-limited":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.authentication-browser":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.editor":
		"Publication Meetup bloquée. Consultez le workflow.",
	"failure.publication.meetup.verification":
		"Publication Meetup bloquée. Consultez le workflow.",
	"action.content-approval-pending": "Contenu à approuver.",
	"action.social-target-approval-pending":
		"Publication à approuver : {target}.",
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
	"action.required-data": "Complétez ou corrigez : {task}.",
	"action.host-confirmation":
		"Sélectionnez un hôte dans le formulaire du meetup.",
	"action.speaker-confirmation":
		"Confirmez les intervenants (`speakers:confirmed`).",
	"action.manual-publication": "{task}.",
	"action.meetup-approval-pending":
		"Approuvez ou refusez la publication Meetup.",
	"action.email-target-approval-pending":
		"{target, select, host_introduction {Approuvez ou refusez l'email de préparation pour l'hôte.} speaker_introduction {Approuvez ou refusez les emails de préparation pour les intervenants.} host_thanks {Approuvez ou refusez l'email de remerciement pour l'hôte.} speaker_thanks {Approuvez ou refusez les emails de remerciement pour les intervenants.} other {Approuvez ou refusez les emails.}}",
	"action.approval-pending": "Approuvez ou refusez les emails.",
	"action.integration-failure": "Automatisation en échec : {task}.",
	"action.delivery-recovery": "Vérifiez l'envoi avant toute reprise.",
	"action.occurrence-decision":
		"Date passée : indiquez tenu, reporté ou annulé.",
	"action.follow-up": "{task}.",
	"action.stage-unknown": "Résultat non vérifié : {task}.",

	"task.approvals": "validation des emails",
	"task.delivery": "reprise des envois",

	"attention.clear": "Aucune tâche en attente.",
	"task.publish-community-event":
		'Publiez sur la plateforme CNCF et renseignez le champ "CNCF Link"',
	"task.date": "date du meetup",
	"task.title": "titre du meetup",
	"task.description": "description du meetup",
	"task.agenda": "programme des talks",
	"task.agenda-speakers": "intervenants des talks",
	"task.agenda-descriptions": "descriptions des talks",
	"task.host": "hôte du meetup",
	"task.event-status": "statut du meetup",
	"task.publication-links": "liens de publication",
	"task.meetup-link": "Meetup Link",
	"task.community-link": "CNCF Link",
	"task.assets-link": "lien du dossier des ressources",
	"task.feedback-link": "OpenFeedback Link",
	"task.confirmations": "confirmation des intervenants",
	"task.event-form": "formulaire du meetup",
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

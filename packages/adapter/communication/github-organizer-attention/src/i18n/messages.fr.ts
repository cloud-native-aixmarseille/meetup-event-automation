export const messages = {
	"action.slides-approval-pending":
		"Approuver l'envoi du PDF aux participants Meetup.",
	"failure.publication.meetup.authentication-configuration":
		"Les identifiants Meetup manquent dans la configuration de l'automatisation. Vérifiez PUBLICATION_CREDENTIALS.",
	"failure.publication.meetup.authentication-captcha-required":
		"Meetup demande un CAPTCHA que l'automatisation n'a pas pu résoudre. Publication suspendue.",
	"failure.publication.meetup.authentication-captcha-rejected":
		"Meetup a refusé la réponse au CAPTCHA. Les retries sont épuisés ; relancez la synchronisation plus tard.",
	"failure.publication.meetup.authentication-captcha-unavailable":
		"Le solveur de CAPTCHA a échoué avant la fin de la connexion. Vérifiez sa disponibilité et relancez la synchronisation.",
	"failure.publication.meetup.authentication-session-not-reusable":
		"Meetup renvoie la vérification du compte vers la connexion malgré les retries. La session n'a pas été conservée ; relancez la synchronisation.",
	"failure.publication.meetup.authentication-login-page-unavailable":
		"La page de connexion Meetup n'a pas pu être chargée malgré les retries. Relancez la synchronisation plus tard.",
	"failure.publication.meetup.authentication-login-form-unavailable":
		"Le formulaire email/mot de passe Meetup n'a pas pu être rempli malgré les retries. Vérifiez les sélecteurs du formulaire.",
	"failure.publication.meetup.authentication-submit-unavailable":
		"Le bouton de connexion Meetup n'a pas pu être activé malgré les retries. Vérifiez les contrôles de la page de connexion.",
	"failure.publication.meetup.authentication-redirect-timeout":
		"Meetup n'a pas terminé la redirection après connexion malgré les retries. Aucun refus des identifiants n'a été détecté ; relancez plus tard.",
	"failure.publication.meetup.authentication-account-unavailable":
		"Le compte connecté n'a pas pu être vérifié malgré les retries. Vérifiez le chargement et les sélecteurs de la page du compte.",
	"failure.publication.meetup.authentication-account-mismatch":
		"Le compte connecté sur Meetup ne correspond pas au compte configuré. La session a été écartée.",
	"failure.publication.meetup.authentication-unexpected-page":
		"La connexion Meetup a abouti à une page inattendue. L'authentification s'est arrêtée ; vérifiez le parcours avant de relancer.",
	"failure.publication.meetup.authentication-rate-limited":
		"Meetup a renvoyé HTTP 429 pendant l'authentification. Les retries sont arrêtés ; attendez avant de relancer la synchronisation.",
	"failure.publication.meetup.authentication-browser":
		"Chrome n'a pas démarré ou sa connexion d'authentification a échoué malgré les retries. Vérifiez le runtime du navigateur.",
	"failure.publication.meetup.editor":
		"Le chargement ou la préparation de l'éditeur Meetup a échoué. Vérifiez les contrôles de l'éditeur dans le run en échec.",
	"failure.publication.meetup.verification":
		"La vérification de l'événement Meetup a échoué. Vérifiez l'événement enregistré avant de relancer.",
	"action.content-approval-pending":
		"Modifiez le texte si besoin, puis validez ou demandez une autre proposition.",
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
	"attention.redirect": "[Tâches et approbations après le meetup]({url})",
	"attention.review": "Voir les détails",
	"attention.unknown": "statut non vérifié",
	"action.missing-date": "Renseignez la date du meetup.",
	"action.required-data": "Complétez ou corrigez : {task}.",
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
	"action.stage-unknown": "Résultat non vérifié : {task}.",

	"task.approvals": "validation des emails",
	"task.delivery": "reprise des envois",

	"attention.clear": "Aucune tâche en attente.",
	"attention.pending":
		"Vérifiez le message Slack avant de réessayer : envoi non confirmé.",
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
	"task.content": "contenu",
	"task.communications": "communications",
	"task.unknown": "consulter le ticket",
} as const;

export const STAGE_MESSAGES_FR = {
	"comment.assets.content-file": "[Ouvrir le fichier concerné]({documentUrl}).",
	"comment.assets.content-conflict":
		"L'automatisation ne retrouve pas une zone gérée ou constate une différence avec son état enregistré. Demandez à un mainteneur de comparer le fichier avec son état enregistré et de choisir une [reprise qui préserve les ajouts manuels](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/docs/integrations/assets.md#recover-a-content-conflict), puis [relancez la synchronisation]({workflowUrl}).",
	"comment.assets.slides-blocked":
		"Ce conflit bloque le PDF et la préparation des emails de remerciement. Les demandes d'approbation des envois seront proposées après correction.",
	"comment.guidance.meetup.slides-approval-rejected":
		"L'envoi des slides a été refusé. Révisez le PDF avant de demander une nouvelle approbation.",
	"comment.guidance.meetup.slides-approval-unavailable":
		"Impossible de vérifier l'approbation d'envoi des slides. Vérifiez l'accès GitHub et relancez.",

	"comment.guidance.communication.email-parameters-invalid":
		"Corrigez les paramètres de l'email : date au format YYYY-MM-DD, liens HTTPS et noms des paramètres inchangés. Puis approuvez l'envoi.",
	"comment.guidance.meetup.uncertain":
		"La synchronisation n'a pas pu confirmer les changements sur Meetup. [Ouvrez l'événement sur Meetup]({eventUrl}) et comparez son titre, sa description et son image aux contenus approuvés ici. [Relancez la synchronisation]({workflowUrl}) avec le bouton \"Run workflow\". Si l'alerte revient, demandez à un mainteneur d'examiner le run.",
	"comment.guidance.meetup.uncertain-missing-link":
		"La synchronisation n'a pas pu confirmer les changements sur Meetup. Aucun lien d'événement Meetup valide n'a été trouvé dans l'issue. [Relancez la synchronisation]({workflowUrl}) avec le bouton \"Run workflow\". Si le lien reste absent, demandez à un mainteneur d'examiner le run ; ne recréez pas l'événement.",
	"comment.guidance.meetup.authentication-configuration":
		"Les identifiants Meetup manquent dans la configuration de l'automatisation. Vérifiez PUBLICATION_CREDENTIALS.",
	"comment.guidance.meetup.authentication-captcha-required":
		"Meetup demande un CAPTCHA que l'automatisation n'a pas pu résoudre. Publication suspendue.",
	"comment.guidance.meetup.authentication-captcha-rejected":
		"Meetup a refusé la réponse au CAPTCHA. Les retries sont épuisés ; relancez la synchronisation plus tard.",
	"comment.guidance.meetup.authentication-captcha-unavailable":
		"Le solveur de CAPTCHA a échoué avant la fin de la connexion. Vérifiez sa disponibilité et relancez la synchronisation.",
	"comment.guidance.meetup.authentication-one-time-code":
		"Meetup demande un code à usage unique. La connexion automatique s'est arrêtée sans nouvel envoi des identifiants.",
	"comment.guidance.meetup.authentication-credentials-rejected":
		"Meetup a explicitement refusé les identifiants envoyés. Vérifiez PUBLICATION_CREDENTIALS avant de relancer.",
	"comment.guidance.meetup.authentication-session-not-reusable":
		"Meetup renvoie la vérification du compte vers la connexion malgré les retries. La session n'a pas été conservée ; relancez la synchronisation.",
	"comment.guidance.meetup.authentication-login-page-unavailable":
		"La page de connexion Meetup n'a pas pu être chargée malgré les retries. Relancez la synchronisation plus tard.",
	"comment.guidance.meetup.authentication-login-form-unavailable":
		"Le formulaire email/mot de passe Meetup n'a pas pu être rempli malgré les retries. Vérifiez les sélecteurs du formulaire.",
	"comment.guidance.meetup.authentication-submit-unavailable":
		"Le bouton de connexion Meetup n'a pas pu être activé malgré les retries. Vérifiez les contrôles de la page de connexion.",
	"comment.guidance.meetup.authentication-redirect-timeout":
		"Meetup n'a pas terminé la redirection après connexion malgré les retries. Aucun refus des identifiants n'a été détecté ; relancez plus tard.",
	"comment.guidance.meetup.authentication-account-unavailable":
		"Le compte connecté n'a pas pu être vérifié malgré les retries. Vérifiez le chargement et les sélecteurs de la page du compte.",
	"comment.guidance.meetup.authentication-account-mismatch":
		"Le compte connecté sur Meetup ne correspond pas au compte configuré. La session a été écartée.",
	"comment.guidance.meetup.authentication-unexpected-page":
		"La connexion Meetup a abouti à une page inattendue. L'authentification s'est arrêtée ; vérifiez le parcours avant de relancer.",
	"comment.guidance.meetup.authentication-rate-limited":
		"Meetup a renvoyé HTTP 429 pendant l'authentification. Les retries sont arrêtés ; attendez avant de relancer la synchronisation.",
	"comment.guidance.meetup.authentication-browser":
		"Chrome n'a pas démarré ou sa connexion d'authentification a échoué malgré les retries. Vérifiez le runtime du navigateur.",
	"comment.guidance.meetup.authentication":
		"Connexion automatique Meetup interrompue sans étape précise dans ce rapport. Relancez la synchronisation pour obtenir le diagnostic détaillé.",
	"comment.social.target": "Publication ({destination}, {purpose})",
	"comment.guidance.social.content-pending":
		"Examinez le brouillon de cette publication dans l'issue. Après validation du contenu, une demande distincte permettra d'autoriser sa publication.",
	"comment.guidance.social.missing":
		"Ce rappel n'a pas de brouillon. Relancez la réconciliation des publications pour le préparer, puis examinez les demandes de validation du contenu et de publication.",
	"comment.guidance.social.generation-recovery":
		"La génération de ce rappel nécessite une reprise. Examinez sa proposition et suivez la procédure de reprise du contenu avant de réessayer.",
	"comment.guidance.social.preparation-failed":
		"La préparation de ce rappel a échoué. Consultez le workflow et relancez-le après correction de l'erreur technique.",
	"comment.guidance.social.pending":
		"Vérifiez l'annonce et approuvez sa publication pour cette destination.",
	"comment.guidance.social.blocked":
		"Vérifiez la revue, les informations du meetup et les accès à la destination avant de réessayer.",
	"comment.guidance.social.uncertain":
		"Vérifiez la publication distante et consignez la reprise avant de publier à nouveau.",
	"comment.guidance.social.expired":
		"Le créneau de publication approuvé a expiré. Vérifiez la date du meetup et préparez une nouvelle publication si nécessaire.",
	"comment.guidance.social.evaluation-failed":
		"Publication non vérifiable. Vérifiez les accès aux sources et le registre des envois avant de relancer.",
	"comment.guidance.communication.concurrent-checklist":
		"Le ticket a changé après les envois. Relancez pour actualiser les tâches terminées.",
	"comment.guidance.feedback.conflict":
		"Corrigez les conférences ou intervenants en double ou ambigus dans OpenFeedback.",
	"comment.guidance.feedback.results":
		"Synchronisez chaque conférence dans OpenFeedback avant les remerciements aux intervenants.",
	"comment.guidance.feedback.access":
		"Vérifiez les accès OpenFeedback, puis réessayez.",
	"comment.guidance.assets.slides":
		"Complétez la présentation et son lien public avant les envois.",
	"comment.guidance.communication.approval": "Approuvez ou refusez les emails.",
	"comment.guidance.communication.rejected":
		"Emails refusés. Modifiez leur contenu pour demander une nouvelle validation.",
	"comment.guidance.communication.approval-unavailable":
		"Approbation non vérifiable. Vérifiez la demande d'approbation, puis réessayez.",
	"comment.guidance.communication.approval-notification":
		"La notification Slack a échoué. Validez les emails dans le commentaire de cette issue.",
	"comment.guidance.communication.delivery-uncertain":
		"Vérifiez l'envoi avant toute reprise.",
	"comment.guidance.communication.delivery-rejected":
		"Envoi refusé. Vérifiez la passerelle d'envoi avant de réessayer.",
	"comment.guidance.communication.delivery-deferred":
		"Envoi différé ; la prochaine exécution réessaiera.",
	"comment.guidance.communication.configuration":
		"Demandez à un responsable de vérifier la configuration des communications.",
	"comment.guidance.communication.ledger":
		"Vérifiez le registre des envois avant de réessayer.",
	"comment.guidance.communication.destination":
		"Ajoutez une adresse email pour chaque destinataire.",
	"comment.guidance.communication.content":
		"Complétez le contenu de la notification avant de réessayer.",
	"comment.guidance.communication.checklist":
		"Relancez pour cocher les tâches d'email terminées.",
	"comment.guidance.communication.concurrent":
		"Le ticket a changé pendant le traitement. Réessayez après les modifications.",
	"comment.guidance.communication.references":
		"Sélectionnez des hôtes et intervenants connus avant les envois.",
	"comment.guidance.communication.catalog":
		"Demandez à un responsable de corriger le référentiel des hôtes ou des intervenants.",
	"comment.guidance.feedback.agenda":
		"Complétez les sujets et intervenants avant de synchroniser OpenFeedback.",
	"comment.guidance.feedback.prerequisites":
		"Complétez le titre, la date et le lien OpenFeedback.",
	"comment.guidance.feedback-link.prerequisites":
		"Vérifiez le meetup actif sélectionné pour le lien partagé et complétez son URL OpenFeedback.",
	"comment.guidance.feedback-link.ambiguous-date":
		"Plusieurs meetups actifs ont la date sélectionnée. Choisissez manuellement la cible du lien partagé.",
	"comment.guidance.assets.prerequisites":
		"Sélectionnez l'hôte et la date avant de préparer les fichiers Drive.",
	"comment.guidance.assets.drift":
		"Restaurez le fichier Drive manquant ou ses métadonnées de modèle.",
	"comment.guidance.assets.template":
		"Corrigez les variables, emplacements d'images ou la structure du modèle.",
	"comment.guidance.assets.missing":
		"Complétez les textes et liens requis pour la présentation.",
	"comment.guidance.assets.recovery":
		"Vérifiez les modifications manuelles et restaurez les liens du contenu géré avant de réessayer.",
	"comment.guidance.assets.revision":
		"Le document a changé. Réessayez après les modifications.",
	"comment.guidance.assets.image":
		"La synchronisation n'a pas pu vérifier une image du document. Relancez-la pour identifier l'image et la cause de l'échec.",
	"comment.assets.image-context":
		"{kind, select, cover {Visuel de couverture généré et approuvé} host_logo {Logo de l'hôte} speaker_picture {Photo de l'intervenant} fallback {Image de secours du modèle} other {Image intégrée au document}} (emplacement `{slot}`) dans [ce document]({documentUrl}).",
	"comment.assets.cover-recovery":
		"Demandez à un mainteneur de corriger le traitement automatique du visuel ; l'image approuvée doit rester utilisable.",
	"comment.guidance.assets.image-source":
		"La source de l'image est invalide : une URL HTTPS publique et une description sont nécessaires.",
	"comment.guidance.assets.image-format":
		"Les données ou le type de contenu de l'image sont invalides. Formats pris en charge : PNG, JPEG et GIF.",
	"comment.guidance.assets.image-size":
		"Le téléchargement de l'image atteint la limite de 50 Mo.",
	"comment.guidance.assets.image-dimensions":
		"Les dimensions de l'image sont invalides ou dépassent 25 mégapixels.",
	"comment.guidance.assets.image-download":
		"La synchronisation n'a pas pu télécharger l'image. Relancez-la ; si l'échec persiste, demandez à un mainteneur d'examiner le run.",
	"comment.guidance.assets.image-changed":
		"Le contenu de l'image diffère du visuel de couverture approuvé.",
	"comment.guidance.assets.fallback":
		"Une image générique est utilisée. Vérifiez la photo de l'intervenant ou le logo de l'hôte.",
	"comment.guidance.pdf.source":
		"Utilisez une présentation Google Slides gérée comme source du PDF.",
	"comment.guidance.pdf.source-pending":
		"Corrigez le contenu de la présentation avant son export en PDF.",
	"comment.guidance.pdf.revision":
		"La présentation a changé pendant l'export. Réessayez après les modifications.",
	"comment.guidance.pdf.recovery":
		"Vérifiez le dossier public partagé et le PDF géré, puis l'état d'export dans le dossier du meetup. Restaurez un état vérifié avant de réessayer.",
	"comment.guidance.pdf.limit":
		"Réduisez la présentation pour que le PDF exporté respecte la limite de 50 Mo.",
	"comment.guidance.pdf.invalid":
		"La vérification du PDF a échoué. Demandez à un responsable de vérifier l'export avant de réessayer.",
	"comment.guidance.pdf.sharing":
		"Autorisez le compte de service à partager le PDF géré. Vérifiez l'accès en lecture pour toute personne disposant du lien, sans référencement dans les recherches. Gardez le dossier restreint et réessayez après avoir corrigé l'accès au fichier.",
} as const;

import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"report.speaker-sync.pr-title":
		"feat(referential): synchroniser les intervenants Conference Hall",
	"report.speaker-sync.pr-body":
		"Vérifiez les identités, la copie CSV et les champs locaux préservés. Les nouvelles identités seront disponibles après fusion. Les profils déjà liés sont actualisés directement depuis Conference Hall à chaque exécution. Le workflow lié identifie cette copie ; la fusion automatique est désactivée.",
	"action.referential.sync-speakers":
		"Synchroniser les intervenants Conference Hall",
	"report.speaker-sync.completed":
		"Catalogue et formulaire préparés : {count} intervenants. Vérifiez la pull request privée avant fusion.",
	"report.speaker-sync.failed":
		"La synchronisation des intervenants a échoué pendant {stage}. Aucune branche de revue n'a été publiée. Corrigez les diagnostics ci-dessous avant de réessayer.",
	"report.speaker-sync.stage.read-catalog": "la lecture du catalogue local",
	"report.speaker-sync.stage.load-source":
		"la lecture de l'export Conference Hall",
	"report.speaker-sync.stage.merge-speakers":
		"la fusion des identités des intervenants",
	"report.speaker-sync.stage.validate-catalog":
		"la validation du catalogue candidat",
	"report.speaker-sync.stage.check-form": "la vérification du formulaire",
	"report.speaker-sync.stage.save-catalog": "l'enregistrement du catalogue",
	"report.speaker-sync.stage.update-form": "la mise à jour du formulaire",
	"report.speaker-sync.stage.unknown": "la synchronisation des intervenants",
	"diagnostic.speaker-sync.configuration":
		"La configuration Conference Hall est invalide. Renseignez le slug du CFP dans conference-hall-event et une clé non vide dans conference-hall-api-key.",
	"diagnostic.speaker-sync.http":
		"Conference Hall a renvoyé un statut HTTP d'échec. Vérifiez la disponibilité du service et les paramètres Web API du CFP avant de réessayer.",
	"diagnostic.speaker-sync.authentication":
		"Conference Hall a refusé la clé API. Vérifiez que CONFERENCE_HALL_API_KEY correspond à la clé dans Settings > Web API du CFP et est transmise via conference-hall-api-key.",
	"diagnostic.speaker-sync.event-not-found":
		"Conference Hall ne trouve pas le CFP. Vérifiez que CONFERENCE_HALL_EVENT contient son slug et est transmis via conference-hall-event.",
	"diagnostic.speaker-sync.network":
		"La requête Conference Hall ou le transfert de la réponse a échoué. Vérifiez l'accès réseau du runner à conference-hall.io avant de réessayer.",
	"diagnostic.speaker-sync.timeout":
		"La requête Conference Hall a dépassé le délai de 15 secondes. Vérifiez la disponibilité du service puis réessayez.",
	"diagnostic.speaker-sync.json":
		"Conference Hall a renvoyé un JSON invalide. Vérifiez la réponse Web API du CFP sans publier ses données privées.",
	"diagnostic.speaker-sync.schema":
		"L'export Conference Hall contient un champ obligatoire absent ou invalide à la position indiquée. Vérifiez ce champ dans la réponse Web API du CFP sans publier les valeurs privées.",
	"diagnostic.speaker-sync.response-size":
		"La réponse Conference Hall est vide ou dépasse la limite de 5 Mio. Vérifiez la taille de l'export Web API du CFP.",
	"diagnostic.speaker-sync.unavailable":
		"La lecture de Conference Hall a échoué. Vérifiez le slug du CFP, la clé API et l'accès réseau du runner avant de réessayer.",
	"diagnostic.speaker-sync.invalid":
		"Les données de synchronisation sont invalides. Validez le CSV, les réservations d'identifiants et le formulaire, puis vérifiez l'export Conference Hall.",
	"diagnostic.speaker-sync.mapping-required":
		"Un intervenant CSV existant peut correspondre à un profil Conference Hall sans identité source. Vérifiez referentials/speakers.csv et renseignez source_provider, source_event et source_speaker_id sur la ligne existante. Préservez speaker_id ; les identités ne sont pas fusionnées automatiquement.",
	"diagnostic.speaker-sync.conflict":
		"Les identités source, les réservations d'identifiants ou les révisions du catalogue sont en conflit. Vérifiez les doublons et les modifications concurrentes avant de réessayer.",
	"diagnostic.speaker-sync.rate-limited":
		"Conference Hall limite les requêtes. Attendez au moins retry-after-seconds avant de réessayer ; aucune nouvelle tentative automatique n'a eu lieu.",
	"diagnostic.speaker-sync.unexpected":
		"Une erreur inattendue a interrompu cette étape. Vérifiez ses fichiers d'entrée et les permissions sur un runner de confiance ; les détails privés sont masqués.",
	"report.speaker-sync.private":
		"La synchronisation des intervenants nécessite un dépôt privé.",

	"action.communication.reconcile-attention":
		"Synchroniser les points à traiter par les organisateurs",
	"report.attention.updated":
		"Le statut des points à traiter est enregistré sur le ticket. Consultez les conditions actuelles et les consignes de reprise.",
	"report.attention.skipped":
		"Le ticket ne correspond pas à un meetup configuré ; la synchronisation a été ignorée.",
	"report.attention.failed":
		"La synchronisation des points à traiter est incomplète. Consultez le statut GitHub et vérifiez les envois incertains avant toute reprise.",
	"action.publication.reconcile-feedback":
		"Vérifier et mettre à jour les retours du meetup",
	"report.feedback.skipped":
		"La mise à jour des retours a été ignorée ; consultez les diagnostics pour connaître la raison.",
	"report.feedback.completed":
		"La vérification et la mise à jour des retours sont terminées.",
	"report.feedback.changes":
		"Modifications du ticket enregistrées : {persisted, select, true {oui} other {non}} ; lien partagé des retours mis à jour : {linkUpdated, select, true {oui} other {non}}.",
	"report.feedback.guidance":
		"Consultez les diagnostics des retours. Les titres et les noms des intervenants suivent le programme de l'issue ; gérez les horaires, les photos et les présentations retirées dans OpenFeedback.",
	"error.OpenFeedbackAgendaConflictError":
		"Plusieurs présentations ou intervenants correspondent au programme de l'issue. Corrigez les noms en double ou modifiez une présentation à la fois avant de réessayer ; les retours existants sont conservés.",
	"error.EventNotFoundError":
		"L'événement est introuvable. Vérifiez le numéro d'issue et le dépôt.",
	"error.EventConcurrentModificationError":
		"L'événement a changé pendant la synchronisation. Relancez-la sur sa dernière version.",
	"error.GoogleDriveAssetRepositoryError":
		"La synchronisation des fichiers Google Drive a échoué. Vérifiez les identifiants, les dossiers configurés et les autorisations.",
	"error.GitHubEventRepositoryConfigurationError":
		"La configuration du dépôt d'événements est invalide. Vérifiez les paramètres du dépôt.",
	"error.GitHubEventRepositoryScopeError":
		"L'événement est hors du périmètre du dépôt configuré.",
	"error.GitHubEventRepositoryResponseError":
		"La réponse GitHub pour l'événement est invalide. Vérifiez la disponibilité du service et l'accès au dépôt.",
	"error.GitHubEventCommentRepositoryConfigurationError":
		"La configuration du dépôt de commentaires est invalide. Vérifiez les paramètres du dépôt et du bot.",
	"error.GitHubEventCommentRepositoryScopeError":
		"Le commentaire est hors du périmètre du dépôt configuré.",
	"error.GitHubEventCommentRepositoryResponseError":
		"La réponse GitHub pour les commentaires est invalide. Vérifiez la disponibilité du service et l'accès au dépôt.",
	"action.referential.validate": "Valider les référentiels du meetup",
	"action.referential.sync-issue-form": "Synchroniser le formulaire du meetup",
	"action.event.reconcile": "Vérifier et mettre à jour le meetup",
	"action.event.list-active": "Lister les meetups actifs",
	"action.communication.reconcile":
		"Vérifier et envoyer les communications du meetup",
	"action.publication.reconcile-assets":
		"Vérifier et mettre à jour les ressources du meetup",
	"report.no-diagnostics": "Aucun diagnostic.",
	"report.fix-applied":
		"correction appliquée : {applied, select, true {oui} other {non}}",
	"report.failed": "Échec de l'action : {reason}",
	"report.summary-unavailable":
		"Le résumé de la tâche n'a pas pu être écrit ; le rapport est disponible dans les journaux et les annotations.",
	"report.severity.error": "erreur",
	"report.severity.warning": "avertissement",
	"report.severity.info": "information",
	"report.execution.failed": "L'action a échoué avant de produire un résultat.",
	"report.execution.guidance":
		"Vérifiez les paramètres de l'action et la configuration des services. Reproduisez le problème sur un exécuteur de confiance si un débogage privé est nécessaire.",
	"report.error.unexpected":
		"L'automatisation du meetup a échoué ; effectuez le diagnostic sur un exécuteur de confiance.",
	"report.referential.valid": "Référentiels : valides.",
	"report.referential.invalid": "Référentiels : invalides.",
	"report.referential.counts":
		"Structures d'accueil valides : {hosts, number} ; intervenants valides : {speakers, number}.",
	"report.referential.guidance":
		"Corrigez les champs du référentiel indiqués ci-dessous, puis relancez la validation. Les indices désignent la position des enregistrements, à partir de zéro.",
	"report.issue-form.blocked":
		"La synchronisation du formulaire est bloquée par des référentiels invalides.",
	"report.issue-form.stale": "Le formulaire n'est pas à jour.",
	"report.issue-form.drift-allowed":
		"Le décalage du formulaire ne bloque pas cette vérification. La synchronisation peut être exécutée après la fusion.",
	"report.issue-form.updated": "Le formulaire a été mis à jour.",
	"report.issue-form.current": "Le formulaire est à jour.",
	"report.issue-form.files": "Fichiers concernés : {files}.",
	"report.event.context": "Ticket : #{issue} ; mode : {mode}.",
	"report.event.skipped":
		"Ignoré : ce ticket ne correspond pas à un meetup configuré.",
	"report.event.state":
		"État du meetup : {state} ; prêt : {ready, select, true {oui} other {non}}.",
	"report.event.persisted":
		"Modifications du ticket enregistrées : {persisted, select, true {oui} other {non}} ; commentaire de diagnostic mis à jour : {comment, select, true {oui} other {non}}.",
	"report.event.guidance":
		"Corrigez les champs du meetup et terminez les tâches indiquées dans les diagnostics.",
	"report.events.count":
		"{count, plural, =0 {Aucun meetup actif.} one {# meetup actif.} other {# meetups actifs.}}",
	"report.events.issues": "Numéros des tickets : {issues}.",
	"report.events.empty": "Aucun meetup actif n'a été trouvé.",
	"report.assets.skipped":
		"La mise à jour des ressources a été ignorée : le meetup n'est pas éligible ou des prérequis manquent.",
	"report.assets.completed":
		"La vérification et la mise à jour des ressources sont terminées.",
	"report.assets.counts":
		"Modifications du ticket enregistrées : {persisted, select, true {oui} other {non}} ; fichiers de ressources : {count, number}.",
	"report.communication.mode": "Mode de communication : {mode}.",
	"report.communication.planned":
		"Planifiées : {planned, number} ; à envoyer : {due, number} ; tentatives d'envoi : {dispatched, number}.",
	"report.communication.accepted":
		"Acceptées : {accepted, number} ; déjà enregistrées : {recorded, number} ; différées : {deferred, number}.",
	"report.communication.uncertain":
		"Résultats incertains : {uncertain, number} ; rejets : {rejected, number}.",
	"report.communication.guidance":
		"Consultez les diagnostics de liste de tâches et d'envoi avant de réessayer.",
	"report.communication.uncertain-guidance":
		"Vérifiez les envois incertains auprès du fournisseur et dans le registre avant tout nouvel envoi.",
	"report.communication.issue-reported":
		"Les diagnostics de communication sont enregistrés dans le ticket du meetup ; les erreurs signalées ne font pas échouer cette vérification.",
	"report.communication.failed":
		"La vérification des communications a échoué ; consultez les annotations de diagnostic et le résumé de la tâche.",
	"workflow.referential.failed":
		"Les référentiels du meetup sont invalides. Corrigez les champs indiqués dans les annotations de validation et le résumé de la tâche.",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"diagnostic.publication.meetup.slides-source":
		"Corrigez les erreurs de l'issue avant d'envoyer les slides aux participants Meetup.",
	"diagnostic.publication.meetup.slides-link":
		"Renseignez le lien Meetup publié avant d'envoyer les slides.",
	"diagnostic.publication.meetup.slides-pdf-pending":
		"Lancez la synchronisation des documents et du PDF avant d'envoyer les slides aux participants Meetup.",
	"diagnostic.publication.meetup.slides-delivery-recovery":
		"Vérifiez le message aux participants Meetup avant de réessayer ; l'envoi est incertain.",
	"diagnostic.publication.meetup.slides-form-unavailable":
		"Le formulaire de message aux participants Meetup n'a pas pu être vérifié. Vérifiez les droits organisateur et le parcours du navigateur.",
	"diagnostic.publication.meetup.slides-source-changed":
		"L'événement a changé avant l'envoi des slides. Relancez la synchronisation des publications.",
	"action.publication.prepare-runtime": "Préparer le runtime de publication",
	"report.publication.draft":
		"fournisseur_publication={provider} evenement=brouillon approbation=requise",
	"report.publication.updated":
		"fournisseur_publication={provider} evenement=synchronise",
	"report.publication.skipped":
		"fournisseur_publication={provider} evenement=ignore",
	"report.publication.blocked":
		"fournisseur_publication={provider} evenement=bloque",
	"report.publication.review":
		"fournisseur_publication={provider} url_validation={url}",
	"diagnostic.publication.community.content-review":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.community.approval-pending":
		"Approuvez ou refusez la publication dans le commentaire d'approbation. L'événement reste en brouillon avant approbation.",
	"diagnostic.publication.community.approval-rejected":
		"La publication a été refusée. L'événement reste en brouillon ; toute modification nécessite une nouvelle approbation.",
	"diagnostic.publication.community.approval-unavailable":
		"Impossible de vérifier l'approbation de publication. Vérifiez le commentaire et les permissions de la GitHub App avant de relancer.",
	"diagnostic.publication.community.approval-notification-failed":
		"La notification d'approbation n'a pas pu être confirmée. Consultez le commentaire d'approbation dans l'issue.",
	"diagnostic.publication.community.source":
		"La lecture des sources a échoué. Résolvez les diagnostics techniques des sources avant de synchroniser.",
	"diagnostic.publication.community.unavailable":
		"Le démarrage du navigateur ou la connexion a échoué. Vérifiez les dépendances, le réseau, les sélecteurs de connexion.",

	"diagnostic.publication.community.inactive":
		"La publication OCGroups est inactive pour cette issue.",
	"diagnostic.publication.community.prerequisites":
		"Complétez la date future, le titre, la description, les confirmations, le programme résolu et le lieu public, puis corrigez les cases mal formées dans Communication avant de synchroniser.",
	"diagnostic.publication.community.link":
		"Renseignez une URL d'événement valide du groupe OCGroups configuré.",
	"diagnostic.publication.community.conflict":
		"Le lien de l'issue diffère de l'événement enregistré. Rétablissez le lien enregistré avant de relancer.",
	"diagnostic.publication.community.uncertain":
		"Le résultat est incertain. Vérifiez le tableau de bord OCGroups et récupérez le UUID vérifié dans le journal community avant de relancer. Gardez les brouillons hors de CNCF Link. Effacez une réservation seulement après avoir confirmé qu'aucun événement n'a été créé.",
	"diagnostic.publication.community.authentication":
		"Connexion organisateur non vérifiée. Vérifiez le compte, les identifiants et les droits du groupe ; terminez manuellement toute vérification non prise en charge.",
	"diagnostic.publication.community.editor":
		"Impossible de préparer l'éditeur OCGroups. Vérifiez les droits organisateur, le lieu configuré et les sélecteurs du navigateur.",
	"diagnostic.publication.community.verification":
		"Les champs enregistrés sur OCGroups ne correspondent pas. L'identité est conservée ; vérifiez l'événement puis relancez sa mise à jour.",

	"action.event.generate-copy": "Générer le titre ou la description",
	"action.assets.generate-cover": "Générer les illustrations",
	"action.communication.generate-slack-post": "Générer le message Slack",
	"action.communication.generate-linkedin-post":
		"Générer la publication LinkedIn",
	"action.organizer.review-drafts": "Vérifier les propositions",
	"diagnostic.publication.content.prerequisites":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.pending":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.rejected":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.iteration-requested":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.recovery":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.stale":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.title-review":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.content.description-review":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.publication.meetup.content-review":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",
	"diagnostic.communication.content-review":
		"Vérifiez la proposition de contenu, complétez les faits publics ou proposez un remplacement. Un contenu modifié nécessite une nouvelle validation.",

	"report.content.generated": "Génération du contenu évaluée.",
	"report.content.reviewed": "Validations du contenu synchronisées.",

	"action.assets.reconcile-slides-pdf": "Mettre à jour le PDF des slides",
	"action.feedback.reconcile-short-link":
		"Mettre à jour le lien de feedback partagé",
	"action.organizer.reconcile-checklist":
		"Mettre à jour la checklist organisateur",
	"report.checklist.updated": "checklist=persisted",
	"report.checklist.retained": "checklist=retained",
	"report.feedback.link": "link_updated={updated}",

	"diagnostic.publication.meetup.approval-pending":
		"Approuvez ou refusez la publication dans le commentaire d'approbation. L'événement reste en brouillon avant approbation.",
	"diagnostic.publication.meetup.approval-rejected":
		"La publication a été refusée. L'événement reste en brouillon ; toute modification nécessite une nouvelle approbation.",
	"diagnostic.publication.meetup.approval-unavailable":
		"Impossible de vérifier l'approbation de publication. Vérifiez le commentaire et les permissions de la GitHub App avant de relancer.",
	"diagnostic.publication.meetup.approval-notification-failed":
		"La notification d'approbation n'a pas pu être confirmée. Consultez le commentaire d'approbation dans l'issue.",

	"diagnostic.publication.meetup.source":
		"La lecture des sources a échoué. Résolvez les diagnostics techniques des sources avant de synchroniser.",
	"diagnostic.publication.meetup.unavailable":
		"Le démarrage du navigateur ou la connexion a échoué. Vérifiez les dépendances, le réseau, le solveur et les sélecteurs de connexion.",
	"action.publication.reconcile-event":
		"Réconcilier la publication de l'événement",

	"diagnostic.publication.meetup.inactive":
		"La publication Meetup est inactive pour cette issue.",
	"diagnostic.publication.meetup.prerequisites":
		"Complétez la date future, le titre, la description, les confirmations, le programme résolu et le lieu public, puis corrigez les cases mal formées dans Communication avant de synchroniser.",
	"diagnostic.publication.meetup.link":
		"Renseignez une URL d'événement valide du groupe Meetup configuré.",
	"diagnostic.publication.meetup.conflict":
		"Le lien de l'issue diffère de l'événement enregistré. Rétablissez le lien enregistré avant de relancer.",
	"diagnostic.publication.meetup.uncertain":
		"Synchronisation interrompue. Vérifiez Meetup et inscrivez le lien vérifié du brouillon ou de l'événement publié dans Meetup Link avant de relancer. Laissez Meetup event published décoché tant que la publication n'est pas confirmée. Ne supprimez le journal qu'après avoir vérifié qu'aucun événement n'a été créé.",
	"diagnostic.publication.meetup.authentication":
		"Connexion organisateur non vérifiée. Vérifiez le compte, les identifiants et la configuration IA ; terminez manuellement toute vérification non prise en charge.",
	"diagnostic.publication.meetup.editor":
		"Impossible de préparer l'éditeur Meetup. Vérifiez les droits organisateur, le lieu configuré et les sélecteurs du navigateur.",
	"diagnostic.publication.meetup.verification":
		"Les champs enregistrés sur Meetup ne correspondent pas. L'identité est conservée ; vérifiez l'événement puis relancez sa mise à jour.",
	"diagnostic.issue-form.out-of-date": "Synchronisez le formulaire d'issue.",
	"diagnostic.issue-form.updated": "Formulaire d'issue synchronisé.",
	"report.speaker-sync.pr-title":
		"feat(referential): synchroniser les intervenants Conference Hall",
	"report.speaker-sync.pr-body":
		"Vérifiez les identités des intervenants et les champs locaux du CSV avant fusion.",
	"action.referential.reconcile-speakers":
		"Mettre à jour le référentiel des intervenants",
	"report.speaker-sync.completed": "speaker_sync=completed speakers={count}",
	"report.speaker-sync.failed": "speaker_sync=blocked stage={stage}",
	"report.speaker-sync.stage.read-catalog": "read-catalog",
	"report.speaker-sync.stage.load-source": "load-source",
	"report.speaker-sync.stage.merge-speakers": "merge-speakers",
	"report.speaker-sync.stage.validate-catalog": "validate-catalog",
	"report.speaker-sync.stage.save-catalog": "save-catalog",
	"report.speaker-sync.stage.unknown": "unknown",
	"diagnostic.speaker-sync.configuration":
		"Configurez le slug du CFP et sa clé Web API.",
	"diagnostic.speaker-sync.http":
		"Conference Hall renvoie une erreur HTTP ; réessayez quand le service est disponible.",
	"diagnostic.speaker-sync.authentication":
		"Vérifiez la clé API dans Settings > Web API du CFP.",
	"diagnostic.speaker-sync.event-not-found":
		"Vérifiez le slug du CFP dans CONFERENCE_HALL_EVENT.",
	"diagnostic.speaker-sync.network":
		"Vérifiez l'accès réseau de l'exécuteur à conference-hall.io.",
	"diagnostic.speaker-sync.timeout":
		"Conference Hall a dépassé le délai de 15 secondes ; réessayez.",
	"diagnostic.speaker-sync.json":
		"La Web API du CFP a renvoyé un JSON invalide.",
	"diagnostic.speaker-sync.schema":
		"Corrigez le champ obligatoire indiqué dans l'export Web API du CFP.",
	"diagnostic.speaker-sync.response-size":
		"La réponse Web API du CFP doit contenir entre 1 octet et 5 Mio.",
	"diagnostic.speaker-sync.history-unavailable":
		"L'historique des identifiants d'intervenants est indisponible. Récupérez tout l'historique du dépôt (fetch-depth: 0) et vérifiez que Git peut le lire avant de réessayer.",
	"diagnostic.speaker-sync.unavailable":
		"Vérifiez le slug du CFP, sa clé API et l'accès réseau de l'exécuteur.",
	"diagnostic.speaker-sync.invalid":
		"Vérifiez le CSV des intervenants, les identifiants réservés et le formulaire d'issue.",
	"diagnostic.speaker-sync.mapping-required":
		"Renseignez source_provider, source_event et source_speaker_id pour l'intervenant existant dans referentials/speakers.csv ; conservez speaker_id.",
	"diagnostic.speaker-sync.conflict":
		"Corrigez les correspondances en double ou les modifications concurrentes du catalogue.",
	"diagnostic.speaker-sync.rate-limited":
		"Limite API Conference Hall atteinte ; réessayez après le délai imposé.",
	"diagnostic.speaker-sync.unexpected":
		"Erreur technique inattendue pendant la synchronisation des intervenants.",
	"report.speaker-sync.private":
		"speaker_sync=blocked reason=private-repository-required",

	"action.organizer.reconcile-attention":
		"Synchroniser les points à traiter par les organisateurs",
	"report.attention.updated": "attention=persisted",
	"report.attention.skipped": "attention=skipped reason=unrelated-issue",
	"report.attention.failed": "attention=synchronization-failed",
	"action.feedback.reconcile-event":
		"Vérifier et mettre à jour les retours du meetup",
	"report.feedback.skipped": "feedback=skipped",
	"report.feedback.completed": "feedback=completed",
	"report.feedback.changes": "issue_persisted={persisted}",
	"error.EventNotFoundError": "L'événement est introuvable.",
	"error.EventConcurrentModificationError":
		"L'événement a changé pendant la synchronisation.",
	"error.GoogleDriveAssetRepositoryError":
		"La synchronisation des fichiers Google Drive a échoué.",
	"error.GitHubEventRepositoryConfigurationError":
		"La configuration du dépôt d'événements est invalide.",
	"error.GitHubEventRepositoryScopeError":
		"L'événement est hors du périmètre du dépôt configuré.",
	"error.GitHubEventRepositoryResponseError":
		"La réponse GitHub pour l'événement est invalide.",
	"error.GitHubEventCommentRepositoryConfigurationError":
		"La configuration du dépôt de commentaires est invalide.",
	"error.GitHubEventCommentRepositoryScopeError":
		"Le commentaire est hors du périmètre du dépôt configuré.",
	"error.GitHubEventCommentRepositoryResponseError":
		"La réponse GitHub pour les commentaires est invalide.",
	"action.referential.validate": "Valider les référentiels du meetup",
	"action.issue-form.reconcile": "Synchroniser le formulaire du meetup",
	"action.event.reconcile": "Vérifier et mettre à jour le meetup",
	"action.event.list-active": "Lister les meetups actifs",
	"action.communication.reconcile-email":
		"Vérifier et envoyer les communications du meetup",
	"action.assets.reconcile-documents":
		"Vérifier et mettre à jour les ressources du meetup",
	"report.failed": "failure={reason}",
	"report.technical-failure": "technical_failure={codes}",
	"report.summary-unavailable": "summary=unavailable",
	"report.error.unexpected": "Erreur technique inattendue.",
	"report.referential.valid": "referentials=valid",
	"report.referential.invalid": "referentials=invalid",
	"report.referential.counts":
		"hosts={hosts, number} speakers={speakers, number}",
	"report.issue-form.blocked": "issue_form=blocked reason=invalid-referentials",
	"report.issue-form.stale": "issue_form=stale",
	"report.issue-form.updated": "issue_form=updated",
	"report.issue-form.current": "issue_form=current",
	"report.issue-form.files": "files={files}",
	"report.event.context": "issue={issue} mode={mode}",
	"report.event.skipped": "event=skipped reason=unrelated-issue",
	"report.event.state": "state={state} ready={ready}",
	"report.event.persisted": "issue_persisted={persisted}",
	"report.events.count": "active_events={count, number}",
	"report.events.issues": "issues={issues}",
	"report.events.empty": "active_events=0",
	"report.assets.skipped": "assets=skipped",
	"report.assets.pdf": "pdf={status}; updated={updated}",
	"report.assets.completed": "assets=completed",
	"report.assets.counts":
		"issue_persisted={persisted} asset_files={count, number}",
	"report.communication.mode": "communication_mode={mode}",
	"report.communication.planned":
		"planned={planned, number} due={due, number} dispatched={dispatched, number}",
	"report.communication.accepted":
		"accepted={accepted, number} recorded={recorded, number} deferred={deferred, number}",
	"report.communication.uncertain":
		"uncertain={uncertain, number} rejected={rejected, number}",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

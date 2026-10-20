import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"diagnostic.issue-form.out-of-date": "Synchronisez le formulaire d'issue.",
	"diagnostic.issue-form.updated": "Formulaire d'issue synchronisé.",
	"report.speaker-sync.pr-title":
		"feat(referential): synchroniser les intervenants Conference Hall",
	"report.speaker-sync.pr-body":
		"Vérifiez les identités des intervenants et les champs locaux du CSV avant fusion.",
	"action.referential.sync-speakers":
		"Synchroniser les intervenants Conference Hall",
	"report.speaker-sync.completed": "speaker_sync=completed speakers={count}",
	"report.speaker-sync.failed": "speaker_sync=blocked stage={stage}",
	"report.speaker-sync.stage.read-catalog": "read-catalog",
	"report.speaker-sync.stage.load-source": "load-source",
	"report.speaker-sync.stage.merge-speakers": "merge-speakers",
	"report.speaker-sync.stage.validate-catalog": "validate-catalog",
	"report.speaker-sync.stage.check-form": "check-form",
	"report.speaker-sync.stage.save-catalog": "save-catalog",
	"report.speaker-sync.stage.update-form": "update-form",
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

	"action.communication.reconcile-attention":
		"Synchroniser les points à traiter par les organisateurs",
	"report.attention.updated": "attention=persisted",
	"report.attention.skipped": "attention=skipped reason=unrelated-issue",
	"report.attention.failed": "attention=synchronization-failed",
	"action.publication.reconcile-feedback":
		"Vérifier et mettre à jour les retours du meetup",
	"report.feedback.skipped": "feedback=skipped",
	"report.feedback.completed": "feedback=completed",
	"report.feedback.changes":
		"issue_persisted={persisted} feedback_link_updated={linkUpdated}",
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
	"action.referential.sync-issue-form": "Synchroniser le formulaire du meetup",
	"action.event.reconcile": "Vérifier et mettre à jour le meetup",
	"action.event.list-active": "Lister les meetups actifs",
	"action.communication.reconcile":
		"Vérifier et envoyer les communications du meetup",
	"action.publication.reconcile-assets":
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

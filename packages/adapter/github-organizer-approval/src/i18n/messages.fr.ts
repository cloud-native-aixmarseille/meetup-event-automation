export const FR_MESSAGES = {
	"follow-up.title": "## Suivi après le meetup · {date}",
	"follow-up.instructions":
		"Ce récapitulatif suit la liste Post event du ticket. Cochez les tâches manuelles dans le ticket. La confirmation ci-dessous autorise le lot de remerciements sans terminer les autres tâches. Les tâches d'e-mail sont cochées après acceptation de l'envoi.",
	"follow-up.task":
		"{task, select, thank_host {Remercier l'hôte} thank_speakers {Remercier les intervenants} share_slides {Partager la présentation sur Meetup} import_attendance {Importer la participation dans CNCF} share_social {Partager sur les réseaux sociaux} other {Tâche après le meetup}}",
	"follow-up.stopped":
		"Le suivi est suspendu : le meetup ne remplit pas actuellement les conditions. Aucune confirmation d'envoi n'est demandée.",
	"follow-up.waiting":
		"La confirmation apparaîtra ici lorsque le lot de remerciements sera prêt. Consultez les diagnostics du workflow si la préparation est bloquée.",
	"follow-up.emails-complete":
		"La liste du ticket ne contient aucun e-mail de remerciement en attente.",
	"approval.details.summary": "Voir le détail des e-mails",
	"approval.details.email":
		"{kind, select, host_introduction {Introduction pour le contact de l'hôte} speaker_introduction {Introduction pour l'intervenant} host_thanks {Remerciement pour le contact de l'hôte} speaker_thanks {Remerciement pour l'intervenant} other {E-mail}}",
	"approval.details.purpose":
		"{kind, select, host_introduction {Remercie l'hôte pour son accueil et partage les liens du meetup, la présentation et les besoins logistiques.} speaker_introduction {Partage les liens du meetup, les informations d'arrivée et de lieu, ainsi que les consignes de présentation.} host_thanks {Remercie l'hôte pour l'organisation du meetup et propose de renouveler la collaboration.} speaker_thanks {Remercie l'intervenant, partage les résultats des retours sur ses présentations et sollicite ses suggestions pour le meetup.} other {Envoie l'e-mail prévu.}}",
	"approval.details.link":
		"{kind, select, meetup {Événement Meetup} community {Événement de la communauté CNCF} slides {Présentation du meetup} other {Lien du meetup}}",
	"approval.details.feedback": "Résultats des retours : {title}",
	"approval.details.omitted-emails":
		"{count, plural, one {# e-mail supplémentaire fait partie de ce lot mais ne figure pas dans ce résumé.} other {# e-mails supplémentaires font partie de ce lot mais ne figurent pas dans ce résumé.}}",
	"approval.details.omitted-links":
		"{count, plural, one {# lien supplémentaire figure dans cet e-mail mais pas dans ce résumé.} other {# liens supplémentaires figurent dans cet e-mail mais pas dans ce résumé.}}",
	"approval.final":
		"### Confirmation des organisateurs : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}}\n\nDate du meetup : {date}. Ce lot concerne au maximum {count, number} destinataires ; les envois déjà terminés sont ignorés.\n\n{status, select, approved {✅ **Approuvé**} rejected {❌ **Refusé**} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\nCette décision est définitive pour cette version du lot. {status, select, approved {Les e-mails approuvés peuvent être envoyés lorsque les contrôles de livraison réussissent. Leur envoi est suivi dans la liste de tâches du ticket.} rejected {Ce lot ne sera pas envoyé.} other {}} Toute modification des détails du meetup ou des destinataires nécessite une nouvelle confirmation.",
	"approval.request":
		"### Confirmation des organisateurs : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}}\n\nDate du meetup : {date}. Ce lot concerne au maximum {count, number} destinataires ; les envois déjà terminés sont ignorés.\n\nOrganisateurs disposant d'un accès en écriture au dépôt : cochez un choix ci-dessous. Laissez les deux cases décochées pour attendre. Cocher les deux est invalide et laisse la demande en attente.\n\n- [{approveMark}] Approuver l'envoi de ce lot\n- [{rejectMark}] Refuser l'envoi de ce lot\n\nLa confirmation concerne cette version du lot. Toute modification des détails du meetup ou des destinataires nécessite une nouvelle confirmation. Les cases des e-mails dans le ticket sont cochées après acceptation de l'envoi.",
	"approval.slack":
		"Confirmation des organisateurs nécessaire : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}} pour le {date}, au maximum {count, number} destinataires. Ouvrez la demande et cochez Approuver ou Refuser : {url}",
} as const;

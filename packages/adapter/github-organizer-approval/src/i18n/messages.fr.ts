export const FR_MESSAGES = {
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
		"### Confirmation des organisateurs : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}}\n\nDate du meetup : {date}. Ce lot concerne au maximum {count, number} destinataires ; les envois déjà terminés sont ignorés.\n\nOrganisateurs disposant d'un accès en écriture au dépôt : cochez un choix ci-dessous. Laissez les deux cases décochées pour attendre.\n\n- [{approveMark}] Approuver l'envoi de ce lot\n- [{rejectMark}] Refuser l'envoi de ce lot\n\nLa confirmation concerne cette version du lot. Toute modification des détails du meetup ou des destinataires nécessite une nouvelle confirmation. Les cases des e-mails dans le ticket sont cochées après acceptation de l'envoi.",
	"approval.slack":
		"Confirmation des organisateurs nécessaire : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}} pour le {date}, au maximum {count, number} destinataires. Ouvrez la demande et cochez Approuver ou Refuser : {url}",
} as const;

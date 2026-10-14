export const FR_MESSAGES = {
	"approval.request":
		"### Confirmation des organisateurs : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}}\n\nDate du meetup : {date}. Ce lot concerne au maximum {count, number} destinataires ; les envois déjà terminés sont ignorés.\n\nOrganisateurs disposant d'un accès en écriture au dépôt : cochez un choix ci-dessous. Laissez les deux cases décochées pour attendre.\n\n- [{approveMark}] Approuver l'envoi de ce lot\n- [{rejectMark}] Refuser l'envoi de ce lot\n\nLa confirmation concerne cette version du lot. Toute modification des détails du meetup ou des destinataires nécessite une nouvelle confirmation. Les cases des e-mails dans le ticket sont cochées après acceptation de l'envoi.",
	"approval.slack":
		"Confirmation des organisateurs nécessaire : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}} pour le {date}, au maximum {count, number} destinataires. Ouvrez la demande et cochez Approuver ou Refuser : {url}",
} as const;

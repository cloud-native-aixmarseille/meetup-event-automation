import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"ledger.title": "### Suivi des envois",
	"ledger.empty": "Aucun envoi enregistré.",
	"ledger.row": "- {kind} : {status} ({count, number})",
	"ledger.kind":
		"{kind, select, host_introduction {Informations pour l'hôte} speaker_introduction {Informations pour les intervenants} host_thanks {Remerciements à l'hôte} speaker_thanks {Remerciements aux intervenants} attendee_slides {Slides aux participants Meetup} readiness_reminder {Rappel Slack aux organisateurs} other {Message}}",
	"ledger.status":
		"{status, select, accepted {Accepté} pending {En cours ou à vérifier} rejected {Refusé} uncertain {À vérifier} other {Inconnu}}",
	"ledger.explanation":
		"Accepté par le service d'envoi ; réception non vérifiée.",
	"ledger.attention":
		"Vérifiez l'envoi auprès du fournisseur avant de réessayer.",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

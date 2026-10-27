import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"ledger.title": "### État des communications",
	"ledger.empty": "Aucun envoi enregistré.",
	"ledger.row": "- {kind} : {status} ({count, number})",
	"ledger.kind":
		"{kind, select, host_introduction {Courriel de présentation au lieu d'accueil} speaker_introduction {Courriel de présentation aux intervenants} host_thanks {Courriel de remerciement au lieu d'accueil} speaker_thanks {Courriel de remerciement aux intervenants} attendee_slides {Courriel des slides aux participants Meetup} readiness_reminder {Rappel Slack aux organisateurs} other {Message}}",
	"ledger.status":
		"{status, select, accepted {Demande acceptée} pending {Envoi en cours ou à vérifier} rejected {Demande refusée} uncertain {Envoi à vérifier} other {État inconnu}}",
	"ledger.explanation":
		"Accepté par le service d'envoi ; réception non vérifiée.",
	"ledger.attention":
		"Vérifiez les envois refusés ou incertains auprès du fournisseur avant de réessayer.",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

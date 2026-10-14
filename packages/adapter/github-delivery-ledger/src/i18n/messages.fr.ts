import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"ledger.title": "### État des communications",
	"ledger.empty": "Aucune demande d'envoi n'est enregistrée actuellement.",
	"ledger.row": "- {kind} : {status} ({count, number})",
	"ledger.kind":
		"{kind, select, host_introduction {Courriel de présentation au lieu d'accueil} speaker_introduction {Courriel de présentation aux intervenants} host_thanks {Courriel de remerciement au lieu d'accueil} speaker_thanks {Courriel de remerciement aux intervenants} readiness_reminder {Rappel Slack aux organisateurs} other {Message}}",
	"ledger.status":
		"{status, select, accepted {Demande acceptée} pending {Envoi en cours ou à vérifier} rejected {Demande refusée} uncertain {Envoi à vérifier} other {État inconnu}}",
	"ledger.explanation":
		"Les demandes de courriel acceptées sont transmises au service d'envoi ; consultez son résultat pour vérifier la livraison.",
	"ledger.attention":
		"Pour les demandes refusées, corrigez la configuration avant de demander une nouvelle tentative. Pour les envois à vérifier, consultez le fournisseur avant de réessayer afin d'éviter les doublons.",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

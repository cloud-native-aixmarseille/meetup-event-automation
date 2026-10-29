import type { REGISTRATION_EN } from "./registration.en.js";

export const REGISTRATION_FR = {
	"action.publication.reconcile-registrations":
		"Réconcilier les inscriptions au meetup",
	"report.registration.counts":
		"registration_reconciliation={status} source_responses={responses, number} source_participants={participants, number} duplicates={duplicates, number} invalid={invalid, number}",
	"report.registration.blocked":
		"Réconciliation bloquée : les opérations OCGroups nécessaires à l'adhésion au groupe et à l'inscription à l'événement ne sont pas disponibles. Les réponses sources sont valides, mais aucun des deux résultats distants n'a été vérifié. Gardez la tâche CNCF ouverte jusqu'à la vérification des deux résultats.",
	"report.registration.invalid":
		"Vérifiez le CNCF Link, l'en-tête de la colonne email et les lignes sélectionnées dans la feuille privée. Corrigez les identités manquantes ou invalides avant de relancer. La tâche d'inscription CNCF reste en attente.",
	"report.registration.skipped":
		"La réconciliation nécessite une issue meetup ouverte avec le statut d'événement held. Aucune réponse n'a été lue ; la tâche d'inscription CNCF reste inchangée.",
} satisfies Record<keyof typeof REGISTRATION_EN, string>;

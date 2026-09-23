import type { DIAGNOSTICS_OTHER_EN } from "./diagnostics-other.en.js";
export const DIAGNOSTICS_OTHER_FR = {
	"diagnostic.publication.assets.unavailable":
		"Les identifiants Google Drive sont indisponibles ; la gestion des fichiers reste manuelle.",
	"diagnostic.publication.assets.prerequisites":
		"Résolvez les références de l’hôte et de la date avant de synchroniser les fichiers.",
	"diagnostic.publication.community-url.invalid":
		"L’URL doit utiliser un préfixe CNCF/OCGroups autorisé et un identifiant.",
	"diagnostic.publication.meetup.missing":
		"Le lien de publication Meetup est obligatoire.",
	"diagnostic.publication.community.missing":
		"Le lien de publication CNCF / OCGroups est obligatoire.",
	"diagnostic.publication.assets.missing":
		"Le lien vers le dossier des fichiers est obligatoire.",
	"diagnostic.publication.meetup-url.invalid":
		"Utilisez l’URL Meetup de ce groupe, terminée par l’identifiant numérique de l’événement.",
	"diagnostic.publication.asset-url.invalid":
		"Utilisez une URL de dossier Google Drive.",
	"diagnostic.issue-form.out-of-date":
		"Le formulaire d’issue doit être synchronisé.",
	"diagnostic.issue-form.updated": "Le formulaire d’issue a été synchronisé.",
	"diagnostic.action.execution.failed":
		"L’automatisation a échoué ; consultez les journaux de débogage sur un exécuteur de confiance.",
} satisfies Record<keyof typeof DIAGNOSTICS_OTHER_EN, string>;

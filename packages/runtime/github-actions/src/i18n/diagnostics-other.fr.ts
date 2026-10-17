import type { DIAGNOSTICS_OTHER_EN } from "./diagnostics-other.en.js";
export const DIAGNOSTICS_OTHER_FR = {
	"diagnostic.publication.assets.file.drift":
		"Une copie du modèle manque ou son nom ou ses métadonnées ont changé.",
	"diagnostic.publication.assets.content.contract":
		"Vérifiez le contrat de contenu versionné, le type MIME, les jetons, les images et le mode de cadrage.",
	"diagnostic.publication.assets.content.missing":
		"Complétez le texte ou le lien public requis, puis relancez la réconciliation. La copie existante est réutilisée.",
	"diagnostic.publication.assets.content.location":
		"Placez les jetons Slides dans des formes de texte entières et les jetons Docs dans les paragraphes du corps. Vérifiez les identifiants, le texte alternatif et les structures prises en charge.",
	"diagnostic.publication.assets.content.conflict":
		"Un emplacement géré a changé ou son ancre manque. Préservez la modification et utilisez une restauration ou un retrait lié à la révision dans la configuration des contenus.",
	"diagnostic.publication.assets.content.recovery":
		"Inspectez le fichier et son manifeste. Restaurez un état valide ou utilisez une inscription ou une récupération explicite ; ne supprimez pas le fichier et ne réinitialisez pas les envois.",
	"diagnostic.publication.assets.content.revision":
		"Le document a changé pendant le rendu. Relancez la réconciliation après la modification en cours.",
	"diagnostic.publication.assets.content.image":
		"Vérifiez le portrait HTTPS public et son image de remplacement : PNG, JPEG ou GIF, moins de 50 Mo et au plus 25 mégapixels. Les URL privées ou signées ne sont pas prises en charge.",
	"diagnostic.publication.assets.content.fallback":
		"Un portrait facultatif utilise son image générique validée. Le fichier reste prêt ; vérifiez le choix de l'intervenant et son URL publique.",

	"diagnostic.publication.feedback.agenda":
		"Complétez les sujets des présentations et résolvez les références des intervenants dans l'issue avant de synchroniser le programme des retours. Les retours existants sont conservés.",
	"diagnostic.publication.feedback.unrelated":
		"Ce ticket ne correspond pas à un meetup.",
	"diagnostic.publication.feedback.inactive":
		"L'automatisation des retours est inactive pour cet événement.",
	"diagnostic.publication.feedback.prerequisites":
		"Corrigez le titre, la date et le lien des retours avant de mettre à jour les retours.",
	"diagnostic.publication.feedback.current-event":
		"Un meetup actif a lieu aujourd'hui ; conservez son lien partagé de retours jusqu'à la fin de la journée.",
	"diagnostic.publication.feedback.ambiguous-date":
		"Plusieurs meetups actifs ont lieu à cette date ; mettez à jour le lien partagé des retours manuellement.",
	"diagnostic.publication.assets.prerequisites":
		"Résolvez les références de l'hôte et de la date avant de synchroniser les fichiers.",
	"diagnostic.publication.community-url.invalid":
		"L'URL doit utiliser un préfixe CNCF/OCGroups autorisé et un identifiant.",
	"diagnostic.publication.meetup.missing":
		"Le lien de publication Meetup est obligatoire.",
	"diagnostic.publication.community.missing":
		"Le lien de publication CNCF / OCGroups est obligatoire.",
	"diagnostic.publication.assets.missing":
		"Le lien vers le dossier des fichiers est obligatoire.",
	"diagnostic.publication.meetup-url.invalid":
		"Utilisez l'URL Meetup de ce groupe, terminée par l'identifiant numérique de l'événement.",
	"diagnostic.publication.asset-url.invalid":
		"Utilisez une URL de dossier Google Drive.",
	"diagnostic.issue-form.out-of-date":
		"Le formulaire d'issue doit être synchronisé.",
	"diagnostic.issue-form.updated": "Le formulaire d'issue a été synchronisé.",
	"diagnostic.action.execution.failed":
		"L'automatisation a échoué ; consultez les journaux de débogage sur un exécuteur de confiance.",
} satisfies Record<keyof typeof DIAGNOSTICS_OTHER_EN, string>;

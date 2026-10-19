export const FR_MESSAGES = {
	"approval.content.planned":
		"Publication prévue : {time}. Vérifiez à nouveau la validité avant publication.",
	"approval.content.slot":
		"Image {index} : {status, select, complete {enregistrée} reserved {résultat incertain ; aucun nouvel essai automatique} failed {échec} other {non demandée}}.",

	"approval.content.title":
		"### Vérification du contenu : {target}\n\nLangue : {language} · Auteur : {origin}",
	"approval.content.request":
		"Vérifiez le texte exact et les images ci-dessus. Cochez un seul choix. L'approbation autorise ce contenu ; la publication et l'envoi ont leurs propres validations. Soumettez les remplacements ou consignes séparément.\n\n{approve}\n- [{rejectMark}] Refuser ce contenu\n- [{iterateMark}] Demander une nouvelle proposition",
	"approval.content.text-choice": "- [{mark}] Approuver ce contenu",
	"approval.content.image-choice":
		"- [{mark}] Approuver l'image {index, number} comme couverture",
	"approval.content.final":
		"{status, select, approved {✅ Contenu approuvé} rejected {❌ Contenu refusé} iteration_requested {🔄 Nouvelle proposition demandée} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\nImage sélectionnée : {image}\n\nCette décision est définitive pour cette version. Un contenu modifié nécessite une nouvelle vérification.",
	"approval.meetup.details":
		"### Confirmation des organisateurs : publier le meetup\n\n**{title}**\n\n{date} · {startTime}–{endTime} ({timeZone})\n\n{venue}, {city}\n\n[Vérifiez le brouillon Meetup]({url}) avant d'approuver sa publication.",
	"approval.meetup.request":
		"Organisateurs avec accès en écriture : cochez un seul choix. Après approbation, l'automatisation publie le brouillon vérifié. Toute modification de l'événement nécessite une nouvelle approbation.\n\n- [{approveMark}] Approuver la publication de ce meetup\n- [{rejectMark}] Refuser la publication de ce meetup",
	"approval.meetup.final":
		"{status, select, approved {✅ **Publication approuvée**} rejected {❌ **Publication refusée**} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\n{status, select, approved {L'automatisation peut publier ce brouillon après avoir vérifié son contenu. La case de l'issue indique la publication vérifiée.} rejected {L'automatisation conserve cet événement en brouillon.} other {}} Toute modification de l'événement nécessite une nouvelle approbation.",

	"follow-up.title": "## Suivi après le meetup · {date}",
	"follow-up.instructions":
		"Cochez les tâches manuelles dans la liste Post event du ticket.",
	"follow-up.task":
		"{task, select, thank_host {Remercier l'hôte} thank_speakers {Remercier les intervenants} share_slides {Partager la présentation sur Meetup} import_attendance {Importer la participation dans CNCF} share_social {Partager sur les réseaux sociaux} other {Tâche après le meetup}}",
	"follow-up.stopped": "Suivi suspendu.",
	"follow-up.waiting": "Les remerciements ne sont pas prêts pour approbation.",
	"follow-up.emails-complete": "Aucun courriel de remerciement en attente.",
	"approval.details.summary": "Voir le détail des e-mails",
	"approval.details.email":
		"{kind, select, host_introduction {Introduction pour le contact de l'hôte} speaker_introduction {Introduction pour l'intervenant} host_thanks {Remerciement pour le contact de l'hôte} speaker_thanks {Remerciement pour l'intervenant} other {E-mail}}",
	"approval.details.purpose":
		"{kind, select, host_introduction {Remercie l'hôte pour son accueil et partage les liens du meetup, la présentation et les besoins logistiques.} speaker_introduction {Partage les liens du meetup, les informations d'arrivée et de lieu, ainsi que les consignes de présentation.} host_thanks {Remercie l'hôte pour l'organisation du meetup et propose de renouveler la collaboration.} speaker_thanks {Remercie l'intervenant, partage les résultats des retours sur ses présentations et sollicite ses suggestions pour le meetup.} other {Envoie l'e-mail prévu.}}",
	"approval.details.link":
		"{kind, select, meetup {Événement Meetup} community {Événement de la communauté CNCF} slides {Présentation du meetup} other {Lien du meetup}}",
	"approval.details.feedback": "Résultats des retours : {title}",
	"approval.details.omitted-emails":
		"{count, plural, one {# autre courriel dans ce lot.} other {# autres courriels dans ce lot.}}",
	"approval.details.omitted-links":
		"{count, plural, one {# autre lien.} other {# autres liens.}}",
	"approval.final":
		"### Confirmation des organisateurs : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}}\n\n{date} · Au maximum {count, number} destinataires.\n\n{status, select, approved {✅ **Approuvé**} rejected {❌ **Refusé**} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\n{status, select, approved {Envoi autorisé ; les envois déjà terminés sont ignorés.} rejected {Ce lot ne sera pas envoyé.} other {}} Toute modification du lot nécessite une nouvelle approbation.",
	"approval.request":
		"### Confirmation des organisateurs : {kind, select, introduction {e-mails d'introduction} thanks {e-mails de remerciement} other {action}}\n\n{date} · Au maximum {count, number} destinataires. Les envois déjà terminés sont ignorés.\n\nOrganisateurs avec accès en écriture : cochez un seul choix.\n\n- [{approveMark}] Approuver l'envoi de ce lot\n- [{rejectMark}] Refuser l'envoi de ce lot\n\nToute modification du lot nécessite une nouvelle approbation.",
} as const;

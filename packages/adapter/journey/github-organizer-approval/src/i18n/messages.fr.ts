export const FR_MESSAGES = {
	"approval.content.image-label": "#### Visuel {index, number}",
	"approval.social.after-approval": "après approbation",
	"approval.social.details":
		"### Publier sur {target}\n\n{destination} · {identity}\n\nPublication : {plannedAt} ; expiration : {expiresAt}.\n\nVérifiez le message ci-dessous.",
	"approval.social.request":
		"Cochez un choix pour publier ce message à la destination indiquée. Toute modification demande une nouvelle validation.\n\n- [{approveMark}] Approuver la publication\n- [{rejectMark}] Refuser la publication",
	"approval.social.evidence":
		"Preuve : {reference}\n\nRésultat : {outcome, select, published {publié} not_published {non publié} other {inconnu}}.",
	"approval.social.recovery":
		"Vérifiez la preuve ci-dessus avant de choisir.\n\n- [{approveMark}] {outcome, select, published {Confirmer la publication et enregistrer son identifiant} not_published {Confirmer qu'aucun message n'a été publié et autoriser un nouvel essai après validation} other {Confirmer la reprise}}\n- [{rejectMark}] Garder la publication bloquée",
	"approval.social.final":
		"{status, select, approved {✅ Publication approuvée} rejected {❌ Publication refusée} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\nConsultez le suivi des envois pour le résultat.",
	"approval.community.details":
		"### Publier sur CNCF\n\n**{title}**\n\n{date} · {startTime}–{endTime} ({timeZone})\n\n{venue}, {city}\n\n[Vérifier le brouillon OCGroups]({url}). La publication peut notifier les membres du groupe et les intervenants.",
	"approval.community.request":
		"Cochez un choix. La validation inclut les notifications OCGroups.\n\n- [{approveMark}] Approuver la publication\n- [{rejectMark}] Refuser la publication",
	"approval.community.final":
		"{status, select, approved {✅ Publication CNCF approuvée} rejected {❌ Publication CNCF refusée} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\nCNCF Link sera ajouté après vérification de la publication.",
	"approval.content.planned": "Publication prévue : {time}.",
	"approval.content.slot":
		"Visuel {index} : {status, select, complete {prêt} reserved {résultat inconnu ; vérifiez avant de relancer} failed {génération en échec} other {non généré}}.",

	"approval.content.title":
		"### {target, select, title {Titre du meetup} description {Description du meetup} cover {Visuels du meetup} other {Texte pour {target}}}",
	"approval.content.request":
		"{target, select, cover {Choisissez un visuel.} other {Modifiez le texte de ce commentaire si besoin, puis cochez un choix.}} La publication se valide séparément.\n\n{approve}\n- [{rejectMark}] ❌ Refuser\n- [{iterateMark}] 🔄 Générer une autre proposition",
	"approval.content.text-choice": "- [{mark}] ✅ Approuver",
	"approval.content.image-choice":
		"- [{mark}] ✅ Choisir le visuel {index, number}",
	"approval.content.final":
		"{status, select, approved {✅ Approuvé} rejected {❌ Refusé} iteration_requested {🔄 Nouvelle proposition demandée} other {Décision enregistrée}} par @{actor} le {decidedAt}.{image, plural, =0 {} other {\n\nVisuel choisi : #}}",
	"approval.meetup.details":
		"### Publier sur Meetup\n\n**{title}**\n\n{date} · {startTime}–{endTime} ({timeZone})\n\n{venue}, {city}\n\n[Vérifier le brouillon Meetup]({url}).",
	"approval.meetup.request":
		"Cochez un choix. L'automatisation publiera le brouillon approuvé.\n\n- [{approveMark}] Approuver la publication\n- [{rejectMark}] Refuser la publication",
	"approval.meetup.final":
		"{status, select, approved {✅ Publication approuvée} rejected {❌ Publication refusée} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\n{status, select, approved {La case de l'issue confirme la publication.} rejected {L'événement reste en brouillon.} other {}}",

	"follow-up.title": "## Suivi après le meetup · {date}",
	"follow-up.instructions":
		"Cochez les tâches manuelles dans la liste Post event du ticket.",
	"follow-up.task":
		"{task, select, thank_host {Remercier l'hôte} thank_speakers {Remercier les intervenants} share_slides {Envoi automatique des slides aux participants Meetup} import_attendance {Importer la participation dans CNCF} share_social {Publier un récapitulatif du meetup sur LinkedIn} other {Tâche après le meetup}}",
	"follow-up.stopped": "Suivi suspendu.",
	"follow-up.waiting": "Les emails de remerciement ne sont pas encore prêts.",
	"follow-up.emails-complete": "Aucun email de remerciement en attente.",
	"approval.details.summary": "Détail des emails",
	"approval.details.email":
		"{kind, select, host_introduction {Informations pour l'hôte} speaker_introduction {Informations pour l'intervenant} host_thanks {Remerciement à l'hôte} speaker_thanks {Remerciement à l'intervenant} other {Email}}",
	"approval.details.purpose":
		"{kind, select, host_introduction {Liens du meetup, slides et logistique.} speaker_introduction {Liens du meetup, accès au lieu et consignes pour le talk.} host_thanks {Remerciements et proposition d'accueillir un prochain meetup.} speaker_thanks {Remerciements, retours sur le talk et demande de suggestions.} other {Email prévu.}}",
	"approval.details.link":
		"{kind, select, meetup {Événement Meetup} community {Événement de la communauté CNCF} slides {Présentation du meetup} other {Lien du meetup}}",
	"approval.details.feedback": "Résultats des retours : {title}",
	"approval.details.omitted-emails":
		"{count, plural, one {# autre email.} other {# autres emails.}}",
	"approval.details.omitted-links":
		"{count, plural, one {# autre lien.} other {# autres liens.}}",
	"approval.final":
		"### {kind, select, introduction {Emails de préparation} thanks {Emails de remerciement} other {Action}}\n\n{date} · {count, plural, one {# destinataire} other {# destinataires}} maximum\n\n{status, select, approved {✅ Approuvé} rejected {❌ Refusé} other {Décision enregistrée}} par @{actor} le {decidedAt}.\n\n{status, select, approved {Les emails déjà envoyés ne seront pas renvoyés.} rejected {Ces emails ne seront pas envoyés.} other {}}",
	"approval.request":
		"### {kind, select, introduction {Emails de préparation} thanks {Emails de remerciement} other {Action}}\n\n{date} · {count, plural, one {# destinataire} other {# destinataires}} maximum\n\nCochez un choix. Les emails déjà envoyés sont ignorés. Toute modification demande une nouvelle validation.\n\n- [{approveMark}] Approuver l'envoi\n- [{rejectMark}] Refuser l'envoi",
} as const;

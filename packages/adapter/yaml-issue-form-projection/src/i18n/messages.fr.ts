import type { EN_MESSAGES } from "./messages.en.js";
export const FR_MESSAGES = {
	"form.speakers.guidance":
		"Sélectionnez les intervenants en copiant une ou plusieurs références dans le programme.",
	"form.speakers.show": "Afficher les références des intervenants disponibles",
} satisfies Record<keyof typeof EN_MESSAGES, string>;

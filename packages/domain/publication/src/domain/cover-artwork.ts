export interface CoverArtworkFacts {
	readonly month: string;
	readonly talks: readonly Readonly<{
		id: string;
		title: string;
		abstract: string;
		speakers: readonly Readonly<{ id: string; name: string }>[];
	}>[];
}

/** Art direction belongs to the asset being commissioned, never to its provider. */
export class CoverArtwork {
	readonly directions = [
		"Invent an exuberant tactile clay-animation scene with expressive miniature characters and physical technology metaphors",
		"Invent a luminous hand-painted fantasy adventure with playful creatures and technology woven into the landscape",
		"Invent a witty retro-futurist screen-print composition with bold shapes, mechanical characters and a strong visual gag",
		"Invent a cinematic stylized 3D underwater or aerial ecosystem where infrastructure becomes a surprising living community",
	] as const;
	ready(facts: CoverArtworkFacts): boolean {
		return Boolean(facts.month.trim());
	}
	valid(text: string, imageCount: number): boolean {
		return (
			text === "" && imageCount > 0 && imageCount <= this.directions.length
		);
	}
	source(facts: CoverArtworkFacts) {
		return {
			month: facts.month,
			talks: facts.talks.map((talk) => ({
				id: talk.id,
				title: talk.title,
				abstract: talk.abstract,
				speakers: talk.speakers.map((speaker) => ({
					id: speaker.id,
					name: speaker.name,
				})),
			})),
		};
	}
	brief(facts: CoverArtworkFacts, direction: string, guidance: string) {
		return {
			output: { width: 1792, height: 1024, mimeType: "image/png" as const },
			guidance,
			instructions: [
				"Create one bright, engaging, polished, humorous social-preview illustration for a Cloud Native / IT meetup. One coherent full-canvas scene, no collage, grids, panels, mockup frames or composite alternatives. Deliver exactly one image, preferably PNG 1792x1024. Fill the landscape canvas, with a readable central composition that works as a small social preview.",
				"The only readable text anywhere is the exact supplied month. No logos containing other text, brands as lettering, code, captions, watermarks, dates, numbers or UI labels.",
				`${direction}. Invent a specific visual metaphor using the supplied topics; vary characters, setting, palette and visual style. Technology objects should feel native to the scene. Warm, witty and professional, never generic corporate stock imagery.`,
			],
			facts: {
				month: facts.month,
				topics: facts.talks.map((talk) => ({
					title: talk.title,
					abstract: talk.abstract,
				})),
			},
		};
	}
}

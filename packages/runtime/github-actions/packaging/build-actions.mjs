import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export const actionBundles = [
	[
		"packages/runtime/github-actions/src/entrypoints/communication-reconcile-social.ts",
		"actions/communication/reconcile-social/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/communication-recover-social.ts",
		"actions/communication/recover-social/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/publication-prepare-runtime.ts",
		"actions/publication/prepare-runtime/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/event-generate-copy.ts",
		"actions/event/generate-copy/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/assets-generate-cover.ts",
		"actions/assets/generate-cover/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/communication-generate-slack-post.ts",
		"actions/communication/generate-slack-post/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/communication-generate-linkedin-post.ts",
		"actions/communication/generate-linkedin-post/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/organizer-review-drafts.ts",
		"actions/organizer/review-drafts/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/assets-reconcile-slides-pdf.ts",
		"actions/assets/reconcile-slides-pdf/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/feedback-reconcile-short-link.ts",
		"actions/feedback/reconcile-short-link/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/organizer-reconcile-checklist.ts",
		"actions/organizer/reconcile-checklist/dist/index.js",
	],

	[
		"packages/runtime/github-actions/src/entrypoints/publication-reconcile-event.ts",
		"actions/publication/reconcile-event/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/referential-reconcile-speakers.ts",
		"actions/referential/reconcile-speakers/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/organizer-reconcile-attention.ts",
		"actions/organizer/reconcile-attention/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/feedback-reconcile-event.ts",
		"actions/feedback/reconcile-event/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/assets-reconcile-documents.ts",
		"actions/assets/reconcile-documents/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/event-reconcile.ts",
		"actions/event/reconcile/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/event-list-active.ts",
		"actions/event/list-active/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/referential-validate.ts",
		"actions/referential/validate/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/issue-form-reconcile.ts",
		"actions/issue-form/reconcile/dist/index.js",
	],
	[
		"packages/runtime/github-actions/src/entrypoints/communication-reconcile-email.ts",
		"actions/communication/reconcile-email/dist/index.js",
	],
];

export async function buildActionBundles() {
	for (const [entryPoint, outfile] of actionBundles) {
		await mkdir(dirname(outfile), { recursive: true });
		await build({
			entryPoints: [entryPoint],
			outfile,
			bundle: true,
			external: ["playwright-core"],
			format: "esm",
			platform: "node",
			target: "node24",
			sourcemap: false,
			banner: {
				js: 'import { createRequire } from "node:module";const require = createRequire(import.meta.url);',
			},
		});
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	await buildActionBundles();
}

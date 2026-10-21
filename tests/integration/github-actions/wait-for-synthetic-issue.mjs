import { setTimeout } from "node:timers/promises";

export async function waitForSyntheticIssue({
	github,
	owner,
	repo,
	issueNumber,
	wait = setTimeout,
}) {
	const attempts = 31;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const { data } = await github.rest.issues.listForRepo({
			owner,
			repo,
			state: "open",
			labels: "meetup",
			page: 1,
			per_page: 100,
		});
		if (
			data.some(
				(issue) =>
					issue.number === issueNumber &&
					issue.state === "open" &&
					(issue.pull_request === undefined || issue.pull_request === null),
			)
		) {
			return;
		}
		if (attempt < attempts - 1) await wait(2000);
	}
	throw new Error(
		"Synthetic meetup issue did not become visible in the active issue listing",
	);
}

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
	ReferentialDomainComposition,
	SpeakerCatalogHistoryError,
} from "@meetup-automation/referential";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeakerAllocationHistory } from "./speaker-allocation-history.js";

const directories: string[] = [];
const run = promisify(execFile);
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});
async function catalogHistory() {
	const root = await mkdtemp(join(tmpdir(), "speaker-history-"));
	directories.push(root);
	const git = (args: string[]) => run("git", args, { cwd: root });
	await git(["init", "--initial-branch=main"]);
	await git(["config", "user.name", "Synthetic Test"]);
	await git(["config", "user.email", "test@example.invalid"]);
	await mkdir(join(root, "referentials"));
	const catalog = join(root, "referentials/speakers.csv");
	await writeFile(
		catalog,
		"speaker_id,display_name\nspeaker-0001,First\nspeaker-0004,Fourth\n",
	);
	await git(["add", "referentials/speakers.csv"]);
	await git(["commit", "--quiet", "--no-gpg-sign", "-m", "Add speakers"]);
	await writeFile(catalog, "speaker_id,display_name\nspeaker-0004,Fourth\n");
	await git([
		"commit",
		"--quiet",
		"--no-gpg-sign",
		"-am",
		"Remove first speaker",
	]);
	return { root, git, catalog };
}

describe("SpeakerAllocationHistory", () => {
	it("preserves deleted speaker IDs from every available branch", async () => {
		// Arrange
		const { root, git, catalog } = await catalogHistory();
		await git(["checkout", "--quiet", "-b", "other-event"]);
		await writeFile(catalog, "speaker_id,display_name\nspeaker-0009,Ninth\n");
		await git(["commit", "--quiet", "--no-gpg-sign", "-am", "Another event"]);
		await git(["checkout", "--quiet", "main"]);
		const history = new SpeakerAllocationHistory(
			{
				referentialIdentifiers:
					new ReferentialDomainComposition().referentialIdentifiers(),
			},
			root,
			run,
		);

		// Act
		const reserved = await history.read();

		// Assert
		expect(reserved).toEqual(["speaker-0001", "speaker-0004", "speaker-0009"]);
	});

	it("refuses an incomplete shallow history instead of allowing deleted IDs to be reused", async () => {
		// Arrange
		const { root } = await catalogHistory();
		const shallow = await mkdtemp(join(tmpdir(), "speaker-shallow-"));
		directories.push(shallow);
		await run("git", [
			"clone",
			"--quiet",
			"--depth=1",
			pathToFileURL(root).href,
			shallow,
		]);
		const history = new SpeakerAllocationHistory(
			{
				referentialIdentifiers:
					new ReferentialDomainComposition().referentialIdentifiers(),
			},
			shallow,
			run,
		);

		// Act
		const result = history.read();

		// Assert
		await expect(result).rejects.toBeInstanceOf(SpeakerCatalogHistoryError);
	});

	it("uses bounded read-only commands with separate arguments", async () => {
		// Arrange
		const command = vi
			.fn()
			.mockResolvedValueOnce({ stdout: "false\n" })
			.mockResolvedValueOnce({
				stdout:
					"+speaker-0002,Name\n-speaker-0001,Name\n+speaker-0002,Name\n+speaker-99999,Invalid\n",
			});
		const history = new SpeakerAllocationHistory(
			{
				referentialIdentifiers:
					new ReferentialDomainComposition().referentialIdentifiers(),
			},
			"/checkout with spaces",
			command,
		);

		// Act
		const reserved = await history.read();

		// Assert
		expect(reserved).toEqual(["speaker-0001", "speaker-0002"]);
		expect(command).toHaveBeenNthCalledWith(
			2,
			"git",
			["log", "--all", "--format=", "-p", "--", "referentials/speakers.csv"],
			{
				cwd: "/checkout with spaces",
				encoding: "utf8",
				timeout: 30_000,
				maxBuffer: 16 * 1024 * 1024,
			},
		);
	});

	it("fails closed without exposing private git error contents", async () => {
		// Arrange
		const command = vi
			.fn()
			.mockResolvedValueOnce({ stdout: "false\n" })
			.mockRejectedValueOnce(
				new Error("private@example.test git history failed"),
			);
		const history = new SpeakerAllocationHistory(
			{
				referentialIdentifiers:
					new ReferentialDomainComposition().referentialIdentifiers(),
			},
			"/checkout",
			command,
		);

		// Act
		const result = history.read();

		// Assert
		await expect(result).rejects.toMatchObject({
			name: "SpeakerCatalogHistoryError",
			message: "Speaker catalog allocation history is unavailable.",
		});
	});
});

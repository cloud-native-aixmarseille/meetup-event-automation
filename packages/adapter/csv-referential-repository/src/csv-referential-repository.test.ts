import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CsvReferentialRepository } from "./csv-referential-repository.js";

describe("CsvReferentialRepository", () => {
	it("maps the checked-out CSV files without logging contact data", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "meetup-csv-"));
		await mkdir(join(root, "referentials"));
		await writeFile(
			join(root, "referentials/hosts.csv"),
			"host_id,name,contact_id,contact,mail,phone,address\n" +
				"host-0001,Example,contact-0001,Pat,pat@example.invalid,,Somewhere\n",
		);
		await writeFile(
			join(root, "referentials/speakers.csv"),
			"speaker_id,firstname,lastname,company,mail,phone\n" +
				"speaker-0001,Sam,Example,Example,sam@example.invalid,\n",
		);

		// Act
		const result = await new CsvReferentialRepository({
			workspaceRoot: root,
			hostsPath: "referentials/hosts.csv",
			speakersPath: "referentials/speakers.csv",
		}).load();

		// Assert
		expect(result.hosts).toHaveLength(1);
		expect(result.speakers[0]?.speakerId).toBe("speaker-0001");
		expect(result.hosts[0]?.contactId).toBe("contact-0001");
	});

	it.each(["\n", "\r\n", "\r"])(
		"tracks physical source lines with %j line endings",
		async (newline) => {
			// Arrange
			const root = await mkdtemp(join(tmpdir(), "meetup-csv-lines-"));
			await writeFile(
				join(root, "venues.csv"),
				[
					"host_id,name,contact_id,contact,mail,phone,address",
					"",
					'host-0042,Example Venue,contact-0042,Pat,pat@example.test,,"First line',
					'Second line"',
					"host-0090,Another Venue,contact-0090,Sam,sam@example.test,,Somewhere",
				].join(newline),
			);
			await writeFile(
				join(root, "presenters.csv"),
				[
					"speaker_id,firstname,lastname,company,mail,phone",
					"speaker-0073,Morgan,Example,Example,morgan@example.test,",
					"",
					"speaker-0047,Renée,Example,Example,renee@example.test,",
				].join(newline),
			);
			const repository = new CsvReferentialRepository({
				workspaceRoot: root,
				hostsPath: "venues.csv",
				speakersPath: "presenters.csv",
			});

			// Act
			const result = await repository.load();

			// Assert
			expect(
				result.hosts.map(({ hostId, source }) => ({ hostId, source })),
			).toEqual([
				{ hostId: "host-0042", source: { path: "venues.csv", line: 3 } },
				{ hostId: "host-0090", source: { path: "venues.csv", line: 5 } },
			]);
			expect(
				result.speakers.map(({ speakerId, source }) => ({ speakerId, source })),
			).toEqual([
				{
					speakerId: "speaker-0073",
					source: { path: "presenters.csv", line: 2 },
				},
				{
					speakerId: "speaker-0047",
					source: { path: "presenters.csv", line: 4 },
				},
			]);
		},
	);

	it("rejects paths outside the checkout", async () => {
		// Arrange
		const root = await mkdtemp(join(tmpdir(), "meetup-csv-"));

		// Act
		const operation = new CsvReferentialRepository({
			workspaceRoot: root,
			hostsPath: "../hosts.csv",
			speakersPath: "speakers.csv",
		}).load();

		// Assert
		await expect(operation).rejects.toThrow(/inside the checkout/);
	});
});

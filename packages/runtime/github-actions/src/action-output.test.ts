import * as core from "@actions/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionOutput } from "./action-output.js";

describe("GitHub Action output boundary", () => {
	beforeEach(() => vi.clearAllMocks());

	it("serializes structured outputs exactly once", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		ActionOutput.setJsonOutput("result", { status: "ok", count: 2 });
		ActionOutput.setDiagnosticsOutput([
			{ code: "safe.code", severity: "warning", message: "Safe message" },
		]);

		// Assert
		expect(core.setOutput).toHaveBeenNthCalledWith(
			1,
			"result",
			'{"status":"ok","count":2}',
		);
		expect(core.setOutput).toHaveBeenNthCalledWith(
			2,
			"diagnostics",
			'[{"code":"safe.code","severity":"warning","message":"Safe message"}]',
		);
	});
});

vi.mock("@actions/core", () => ({ setOutput: vi.fn() }));

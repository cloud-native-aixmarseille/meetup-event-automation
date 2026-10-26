"""One pre-login challenge in an existing Chromium session; no account credentials."""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from hcaptcha_challenger import AgentConfig, AgentV
from hcaptcha_challenger.models import ChallengeSignal
from loguru import logger
from playwright.async_api import async_playwright


class HcaptchaChallenge:
    """The parent owns the browser, temporary directory and hard process deadline."""

    def __init__(self, agent_factory):
        self.agent_factory = agent_factory

    def config(self, api_key, model, directory):
        """Constrain the library's model selection, retries, logging and storage."""
        if not api_key.strip() or not model.strip():
            raise ValueError("Gemini configuration is required.")
        return AgentConfig(
            _env_file=None,
            GEMINI_API_KEY=api_key,
            CHALLENGE_CLASSIFIER_MODEL=model,
            IMAGE_CLASSIFIER_MODEL=model,
            SPATIAL_POINT_REASONER_MODEL=model,
            SPATIAL_PATH_REASONER_MODEL=model,
            cache_dir=directory / "cache",
            challenge_dir=directory / "challenges",
            captcha_response_dir=directory / "responses",
            enable_challenger_debug=False,
            enable_skills_update=False,
            RETRY_ON_FAILURE=False,
            EXECUTION_TIMEOUT=80,
            RESPONSE_TIMEOUT=10,
            MAX_CRUMB_COUNT=2,
        )

    async def solve(self, browser, config, target_url):
        """Attempt one challenge on the specified HTTPS page before credentials are filled."""
        pages = [page for context in browser.contexts for page in context.pages]
        if len(pages) != 1:
            return "unavailable"
        page = pages[0]
        location = urlparse(target_url)
        if (
            location.scheme != "https"
            or not location.hostname
            or location.username is not None
            or location.password is not None
        ):
            return "unavailable"
        if page.url != target_url:
            return "unavailable"
        credentials = page.locator(
            'input[type="email"], input[type="password"], '
            'input[autocomplete="username"], input[autocomplete="current-password"], '
            'input[name="email"], input[name="current-password"]'
        )
        for field in await credentials.all():
            if await field.input_value():
                return "unavailable"
        agent = self.agent_factory(page=page, agent_config=config)
        await agent.robotic_arm.click_checkbox()
        signal = await agent.wait_for_challenge()
        return "solved" if signal == ChallengeSignal.SUCCESS else "blocked"

    async def run(self, request):
        """Attach locally and disconnect before returning the fixed result."""
        endpoint = urlparse(request["endpoint"])
        if endpoint.scheme != "ws" or endpoint.hostname != "127.0.0.1":
            return "unavailable"
        config = self.config(request["apiKey"], request["model"], Path.cwd())
        async with async_playwright() as playwright:
            browser = await playwright.chromium.connect_over_cdp(
                request["endpoint"], timeout=15_000
            )
            try:
                return await asyncio.wait_for(
                    self.solve(browser, config, request["targetUrl"]), timeout=100
                )
            finally:
                # Disconnect this client; the TypeScript parent owns Chromium.
                await browser.close()

    @classmethod
    def main(cls):
        """Read private input and emit only a status on the dedicated descriptor."""
        logger.remove()
        logging.disable(logging.CRITICAL)
        try:
            request = json.load(sys.stdin)
            result = asyncio.run(cls(AgentV).run(request))
        except TimeoutError:
            result = "blocked"
        except Exception:  # noqa: BLE001  # pylint: disable=broad-exception-caught
            # Provider errors can include prompts, credentials and response tokens.
            result = "unavailable"
        os.write(3, f"{result}\n".encode("ascii"))


if __name__ == "__main__":
    HcaptchaChallenge.main()

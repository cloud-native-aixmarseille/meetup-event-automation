"""Synthetic challenge boundary checks; no Gemini or Meetup requests."""

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from hcaptcha_challenger.models import ChallengeSignal
from solve import MeetupChallenge


class MeetupChallengeTest(unittest.IsolatedAsyncioTestCase):
    """Exercise the provider boundary with deterministic browser and agent fakes."""

    def fixture(self, email="", password="", url="https://events.example.test:8443/login/"):
        """Construct one isolated login page and a successful challenge agent."""
        fields = {
            'input[name="email"]': SimpleNamespace(input_value=AsyncMock(return_value=email)),
            'input[name="current-password"]': SimpleNamespace(
                input_value=AsyncMock(return_value=password)
            ),
        }
        page = SimpleNamespace(url=url, locator=fields.__getitem__)
        browser = SimpleNamespace(contexts=[SimpleNamespace(pages=[page])])
        agent = SimpleNamespace(
            robotic_arm=SimpleNamespace(click_checkbox=AsyncMock()),
            wait_for_challenge=AsyncMock(return_value=ChallengeSignal.SUCCESS),
        )
        factory = Mock(return_value=agent)
        return MeetupChallenge(factory), browser, factory, agent

    async def test_solves_only_an_empty_login_page(self):
        """The configured agent receives only the empty login page."""
        # Arrange
        solver, browser, factory, agent = self.fixture()
        config = object()
        # Act
        result = await solver.solve(browser, config, "https://events.example.test:8443/login/")
        # Assert
        self.assertEqual(result, "solved")
        factory.assert_called_once_with(page=browser.contexts[0].pages[0], agent_config=config)
        agent.robotic_arm.click_checkbox.assert_awaited_once()
        agent.wait_for_challenge.assert_awaited_once()

    async def test_rejects_pages_containing_credentials(self):
        """Account credentials prevent agent construction."""
        for fields in ({"email": "organizer@example.test"}, {"password": "synthetic"}):
            with self.subTest(fields=fields):
                # Arrange
                solver, browser, factory, _ = self.fixture(**fields)
                # Act
                result = await solver.solve(
                    browser, object(), "https://events.example.test:8443/login/"
                )
                # Assert
                self.assertEqual(result, "unavailable")
                factory.assert_not_called()

    async def test_rejects_unexpected_pages(self):
        """Only the caller-selected HTTPS login location is accepted."""
        for url in (
            "https://www.meetup.com/account/",
            "https://unexpected.example.test/login/",
            "http://www.meetup.com/login/",
        ):
            with self.subTest(url=url):
                # Arrange
                solver, browser, factory, _ = self.fixture(url=url)
                # Act
                result = await solver.solve(
                    browser, object(), "https://events.example.test:8443/login/"
                )
                # Assert
                self.assertEqual(result, "unavailable")
                factory.assert_not_called()

    async def test_requires_one_browser_page(self):
        """Multiple tabs prevent ambiguous browser access."""
        # Arrange
        solver, browser, factory, _ = self.fixture()
        browser.contexts[0].pages *= 2
        # Act
        result = await solver.solve(browser, object(), "https://events.example.test:8443/login/")
        # Assert
        self.assertEqual(result, "unavailable")
        factory.assert_not_called()

    async def test_reports_unsolved_challenge_without_retrying(self):
        """An unsuccessful result makes no additional attempt."""
        # Arrange
        solver, browser, _, agent = self.fixture()
        agent.wait_for_challenge.return_value = None
        # Act
        result = await solver.solve(browser, object(), "https://events.example.test:8443/login/")
        # Assert
        self.assertEqual(result, "blocked")
        agent.robotic_arm.click_checkbox.assert_awaited_once()

    async def test_rejects_remote_debugging_endpoints(self):
        """Remote browser addresses cannot reach connection setup."""
        # Arrange
        solver = MeetupChallenge()
        # Act
        result = await solver.run({"endpoint": "ws://remote.example.test:1234"})
        # Assert
        self.assertEqual(result, "unavailable")

    def test_config_uses_pinned_library_api_and_temporary_storage(self):
        """The installed library honors explicit models and ephemeral storage."""
        # Arrange
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            # Act
            config = MeetupChallenge.config("synthetic-key", "synthetic-model", path)
            # Assert
            self.assertEqual(config.GEMINI_API_KEY.get_secret_value(), "synthetic-key")
            self.assertEqual(config.CHALLENGE_CLASSIFIER_MODEL, "synthetic-model")
            self.assertEqual(config.IMAGE_CLASSIFIER_MODEL, "synthetic-model")
            self.assertEqual(config.SPATIAL_POINT_REASONER_MODEL, "synthetic-model")
            self.assertEqual(config.SPATIAL_PATH_REASONER_MODEL, "synthetic-model")
            self.assertEqual(config.cache_dir, path / "cache")
            self.assertEqual(config.challenge_dir, path / "challenges")
            self.assertEqual(config.captcha_response_dir, path / "responses")
            self.assertFalse(config.RETRY_ON_FAILURE)
            self.assertFalse(config.enable_challenger_debug)
            self.assertFalse(config.enable_skills_update)


if __name__ == "__main__":
    unittest.main()

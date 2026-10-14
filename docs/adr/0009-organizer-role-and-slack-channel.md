# ADR 0009: Use one organizer role and an explicit organizer Slack channel

Status: Accepted

Date: 2026-10-14

## Context

The people managing a meetup need one role name across approval requests,
readiness reminders, configuration, and code. Internal coordination and public
event announcements have different audiences and destinations.

## Decision

Use `organizer` for the meetup management role, including `OrganizerApproval`,
`GithubOrganizerApproval`, and English/French generated messages. GitHub's
platform permission names retain their API meanings; repository write access
or higher qualifies an organizer to approve an email batch.

Require `slack-organizer-channel-id` in the communication action and both event
workflows. Consumers supply it from `SLACK_ORGANIZER_CHANNEL_ID`. Approval
requests and readiness reminders use this explicit internal destination.

Public Slack announcements are manual tasks in the issue's Communication
checklist. Their channels are separate from the organizer channel. The
automation exposes no public-posting input and sends no public announcements.

## Consequences

Both event callers must supply the organizer channel. A missing destination
fails before integration calls. Organizers manage public announcement tasks
independently of email approvals and internal reminders.

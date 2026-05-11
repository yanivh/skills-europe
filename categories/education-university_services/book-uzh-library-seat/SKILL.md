---
name: book-uzh-library-seat
description: Automate UZH library seat booking in Booked-UB, with login-first checks and challenge-loop handling. Use when users ask to find or book seats in the University of Zurich library booking portal.
---

# Book UZH Library Seat

Use this skill for Booked-UB seat lookup and booking:
`https://ubbooked01.ub.uzh.ch/ub/Web/index.php`

## Required Inputs

- `mode`: `list` or `book`
- `email`: UZH login email
- `password`: UZH password
- `date`: target date (`YYYY-MM-DD` preferred)
- `startTime`: optional start time (for example `09:00`)
- `endTime`: optional end time (for example `11:00`)
- `building`: optional building/library hint
- `room`: optional room/zone hint
- `seat`: optional seat label/id hint

## Login-First Workflow (Token Optimized)

1. Open the Booked-UB URL.
2. Check if already logged in before attempting credentials:
   - logged-in signals: visible schedule UI (`Terminplan ansehen`, calendar/resources, booking controls), or authenticated menu state.
   - if logged in: skip login.
3. Only if not logged in:
   - on `Booked-UB - Log In`, fill `Email` and `Password`
   - optionally set `Remember Me` when persistent local sessions are desired
   - click login action (`Log In` / localized equivalent)
4. Handle security challenge loop:
   - if security-check/passcode screen appears, do not loop endlessly.
   - do max 2 retries for passive waits/refreshes.
   - if still blocked, return `challenge_required` and ask user to complete manual verification.
5. Continue only after authenticated schedule state is confirmed.

## Mode Behavior

- `list`
  - find matching available seats/resources for date/time filters
  - no booking clicks
- `book`
  - choose best matching available seat
  - submit one booking action
  - verify booking success state/message

## Retry Limits

- Critical UI steps: max 2 retries
- Never restart full flow if already on the authenticated schedule page
- For transient seat availability changes, refresh and re-check from current page context only

## Cron Scheduling Policy

Use this default recurring schedule for automated runs:

- Weekly: Sunday at 06:00
- Cron expression: `0 6 * * 0`

Execution rules for cron runs:

1. Try existing authenticated session first.
2. If schedule page is already accessible, continue booking/listing directly.
3. If login is required, perform login flow.
4. If security-check/passcode appears, return `challenge_required` immediately after bounded retries.
5. Do not loop indefinitely waiting for passcode in unattended cron mode.

## Output Format

Return JSON:

```json
{
  "mode": "list|book",
  "reason": "success|login_failed|challenge_required|seat_not_found|slot_unavailable|booking_failed|automation_error",
  "statusMessage": "",
  "requested": {
    "date": "",
    "startTime": "",
    "endTime": "",
    "building": "",
    "room": "",
    "seat": ""
  },
  "resolved": {
    "buildingMatched": "",
    "roomMatched": "",
    "seatMatched": "",
    "timeMatched": ""
  },
  "results": [],
  "booked": false
}
```

## Security Rules

- Never hardcode production credentials in `SKILL.md`.
- Use local config/secrets at runtime.
- Never print password in logs or output.

## Login UI Anchors (Current)

Use these labels as first-choice anchors on the login form:

- Page title: `Booked-UB - Log In`
- Email field: `Email`
- Password field: `Password`
- Checkbox: `Remember Me`

# Book UZH Library Seat

Skill for listing and booking seats in University of Zurich Booked-UB.

Portal:
`https://ubbooked01.ub.uzh.ch/ub/Web/index.php`

## What it does

- Checks if the user is already logged in first (saves steps/tokens).
- Logs in only when needed.
- Handles security challenge loops with bounded retries.
- Supports:
  - `list` mode: find available seats
  - `book` mode: reserve one matching seat

## Current login page labels

The skill is aligned to this login form text:

- `Booked-UB - Log In`
- `Email`
- `Password`
- `Remember Me`

## Config

Create a local config file (do not commit secrets):

`config.local.json`

```json
{
  "email": "Ed.ison@uzh.ch",
  "password": "CHANGE_ME",
  "baseUrl": "https://ubbooked01.ub.uzh.ch/ub/Web/index.php"
}
```

If you want to test quickly with temporary credentials, you can replace `CHANGE_ME` locally.

## Use in chat

```text
Use $book-uzh-library-seat to list available seats on 2026-05-12 from 09:00 to 11:00 in the main library.
```

```text
Use $book-uzh-library-seat to book one seat on 2026-05-12 from 14:00 to 16:00.
```

## Cron schedule (default)

- Weekly Sunday at 06:00
- Cron: `0 6 * * 0`

Recommended cron behavior:

- Reuse existing session if valid.
- If passcode challenge appears, stop with `challenge_required` and notify for manual verification.

## Expected edge-case behavior

- If security challenge remains active after retries, return `challenge_required` and stop.
- If no matching seat exists, return `seat_not_found`.
- If slot becomes unavailable during booking click, return `slot_unavailable`.

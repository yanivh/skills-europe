# Fitness First Course Booking (DE)

Portables Skill zur automatischen Kursbuchung mit deutschem Mitgliederbereich-Flow.

## Was dieses Skill macht

- Geht ueber `https://www.fitnessfirst.de/mein-fitnessfirst`.
- Klickt `Mitglieder-Login` / `Logge dich ein!`.
- Meldet sich per EGYM-Login an.
- Oeffnet `Kursbuchung` und filtert nach Club + Kurs.
- Akzeptiert auch teilweise Club- oder Kursnamen und waehlt den besten passenden Treffer.
- Kann Clubnamen auch ueber Endungen/Suffixe aufloesen, z. B. `SSC` -> `Berlin - Steglitz SSC`.
- Akzeptiert Datumsangaben mit deutschen oder englischen Wochentagen.
- Akzeptiert auch unscharfe Zeitangaben, z. B. `17` -> passende `17:xx` Slots.
- Prueft rechts Datum/Uhrzeit und klickt `Kurs buchen`, wenn verfuegbar.
- Wenn `date` und `time` fehlen, bucht es alle sichtbaren `Kurs buchen`-Slots fuer den gewaehlten Kurs.
- Unterstuetzt zeitgesteuerten Start (`runAt`) in der Zielplattform.
- Verwendet deterministische Matching-Regeln und liefert ein strukturiertes JSON-Ergebnis.

## Publication-Tight Guarantees

- Deterministische Match-Reihenfolge fuer `club`/`course` (exact -> token -> suffix -> contains -> fuzzy).
- Sichere Klickregeln (kein Klick auf `stornieren`, `voll`, `nicht mehr moeglich`).
- Bei `Kursbuchung noch nicht moeglich`: automatische Refresh-Retries (max. 4 Versuche).
- Nach Klick verbindliche Erfolgskontrolle (`Kurs gebucht` oder Statuswechsel auf `stornieren`).
- Standardisiertes Resultat mit `requested`, `resolved`, `bookedSlots`, `skippedSlots`, `reason`.

## Praxis-Hinweis aus Test

Bei `Berlin - Steglitz SSC` + `Yoga (L1/L2)` wurden fuer `Mittwoch, 29. April` buchbare Slots mit `Kurs buchen` sichtbar (z. B. `12:00` und `19:00`).

## Use in chat

```text
Use $book-acourse-fitnessfirst to book Yoga (L1/L2) in Berlin - Steglitz SSC on Mittwoch, 29. April at 12:00.
```

## Files

- `SKILL.md` for behavior definition
- `README.md` for usage guidance

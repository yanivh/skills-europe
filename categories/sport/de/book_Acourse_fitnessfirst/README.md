# Fitness First Course Booking (DE)

Portables Skill zum Finden und Buchen von Fitness First Kursen mit deutschem Mitgliederbereich-Flow.

## Was dieses Skill macht

- Geht ueber `https://www.fitnessfirst.de/mein-fitnessfirst`.
- Klickt `Mitglieder-Login` / `Logge dich ein!`.
- Meldet sich per EGYM-Login an.
- Oeffnet `Kursbuchung` und filtert nach Club + Kurs.
- Unterstuetzt `list`-Mode zum Finden offener Kursoptionen ohne Buchung.
- Unterstuetzt `book`-Mode fuer die eigentliche Buchung.
- Akzeptiert auch teilweise Club- oder Kursnamen und waehlt den besten passenden Treffer.
- Kann Clubnamen auch ueber Endungen/Suffixe aufloesen, z. B. `SSC` -> `Berlin - Steglitz SSC`.
- Wenn `city` gesetzt und `club` leer ist, durchsucht es alle passenden Clubs dieser Stadt.
- Akzeptiert Datumsangaben mit deutschen oder englischen Wochentagen.
- Akzeptiert auch unscharfe Zeitangaben, z. B. `17` -> passende `17:xx` Slots.
- Prueft rechts Datum/Uhrzeit und klickt `Kurs buchen`, wenn verfuegbar.
- Wenn `date` und `time` fehlen, bucht es alle sichtbaren `Kurs buchen`-Slots fuer den gewaehlten Kurs.
- Unterstuetzt zeitgesteuerten Start (`runAt`) in der Zielplattform.
- Optional mit `profiles.json` fuer Multi-User, mehrere Defaults und mehrere Zeitslots pro Tag.
- Verwendet deterministische Matching-Regeln und liefert ein strukturiertes JSON-Ergebnis.

## Publication-Tight Guarantees

- Deterministische Match-Reihenfolge fuer `club`/`course` (exact -> token -> suffix -> contains -> fuzzy).
- Sichere Klickregeln (kein Klick auf `stornieren`, `voll`, `nicht mehr moeglich`).
- Bei `Kursbuchung noch nicht moeglich`: automatische Refresh-Retries (max. 4 Versuche).
- Nach Klick verbindliche Erfolgskontrolle (`Kurs gebucht` oder Statuswechsel auf `stornieren`).
- Standardisiertes Resultat mit `requested`, `resolved`, `bookedSlots`, `skippedSlots`, `reason`.

## Optional: `profiles.json` fuer nanoclaw

- Unterstuetzt mehrere Benutzerprofile.
- Unterstuetzt wiederkehrende Slots pro Nutzer (`schedule`).
- Unterstuetzt optionale Mehrfach-Defaults (`defaultLessons`).
- Empfohlene Triggerlogik: Buchungsjob 24 Stunden vor geplantem Slot starten.

## List + Book Flow

- Erst `list`, um offene Moeglichkeiten zu sehen.
- Danach `book`, um eine gewaehlte Option zu buchen.
- Typischer Flow:
  - `list open for booking Yoga-kurse in Berlin`
  - `book the 19:00 one in Steglitz`

## Praxis-Hinweis aus Test

Bei `Berlin - Steglitz SSC` + `Yoga (L1/L2)` wurden fuer `Mittwoch, 29. April` buchbare Slots mit `Kurs buchen` sichtbar (z. B. `12:00` und `19:00`).

## Use in chat

```text
Use $book-acourse-fitnessfirst to book Yoga (L1/L2) in Berlin - Steglitz SSC on Mittwoch, 29. April at 12:00.
```

```text
Use $book-acourse-fitnessfirst to list open for booking Yoga-kurse in Berlin on Wednesday, 29. April at 17.
```

## Files

- `SKILL.md` for behavior definition
- `README.md` for usage guidance

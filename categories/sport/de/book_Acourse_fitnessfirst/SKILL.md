---
name: book-acourse-fitnessfirst
description: Automatisiert Fitness First Kursbuchungen und Kurslisten im Mitgliederbereich mit deutschem UI-Flow (`Mitglieder-Login` -> `Logge dich ein!` -> `Kursbuchung`). Nutzt `list` zum Finden offener Slots und `book` zum Buchen passender Kursoptionen.
---

# Fitness First Course Booking (DE)

Nutze dieses Skill, wenn Kurse im Fitness First Mitgliederbereich gefunden oder automatisch gebucht werden sollen.

## Benoetigte Eingaben

- `mode` (`list` oder `book`)
- `email` (Login)
- `password` (Login)
- `city` (optional, z. B. `Berlin`, `Duesseldorf`)
- `club` (vollstaendig oder teilweise, z. B. `Steglitz`, `Berlin Steglitz`, `Berlin - Steglitz SSC`)
- `course` (vollstaendig oder teilweise, z. B. `Yoga`, `Hyrox`, `Yoga (L1/L2)`)
- `date` (optional, z. B. `Mittwoch, 29. April`, `Wednesday, 29. April` oder `YYYY-MM-DD`)
- `time` (optional, z. B. `12:00` oder `19:00`)
- `runAt` (optional, geplanter Startzeitpunkt im ISO-Format)

## Workflow (deutsches UI)

1. Pflichtfelder pruefen.
2. Falls `runAt` gesetzt ist, bis zur Zielzeit warten.
3. Startseite oeffnen: `https://www.fitnessfirst.de/mein-fitnessfirst`.
4. Auf `Mitglieder-Login` bzw. `Logge dich ein!` klicken.
5. EGYM-Login ausfuellen (`Email address`, `Password`) und `Sign in` klicken.
6. Nach erfolgreichem Login auf `Kursbuchung` wechseln (direkt oder ueber `Kurse & Termine`).
7. Auf `https://mein.fitnessfirst.de/member/courses` sicherstellen.
8. Suchbereich festlegen:
- Wenn `club` gesetzt ist: besten passenden Club waehlen.
- Wenn `city` gesetzt und `club` leer ist: alle sichtbaren Clubs dieser Stadt durchlaufen.
- Wenn weder `city` noch `club` gesetzt ist: `defaultClub` nutzen, falls vorhanden; sonst mit klarer Ursache beenden.
9. Fuer jeden relevanten Club:
- `Club auswaehlen`
- Kursbutton mit bestmoeglich passendem `course` auswaehlen
- rechte Kursliste scannen
10. Modus anwenden:
- `list`: offene, passende Moeglichkeiten sammeln und nichts klicken
- `book`: genau passenden Slot finden und `Kurs buchen` klicken
11. Nach jedem Buchungsklick auf Erfolgsmeldung/Statuswechsel pruefen (z. B. `Kurs gebucht`, Button wird `... stornieren`).
12. Ergebnis strukturiert zurueckgeben.

## Modus `list`

Nutze `list`, wenn der Nutzer Formulierungen wie diese verwendet:

- `list open for booking Yoga-kurse`
- `show me possibilities`
- `find available courses`
- `what is open in Berlin`

Verhalten:

1. Keine Buchung ausloesen.
2. Nur passende Slots sammeln.
3. Standardmaessig nur aktuell buchbare Slots (`Kurs buchen`) zurueckgeben.
4. Optionale Filter anwenden:
- `city`
- `club`
- `course`
- `date`
- `time`
5. Falls `city` gesetzt und `club` leer ist:
- alle passenden Stadt-Clubs nacheinander pruefen
- Ergebnisse ueber alle Clubs aggregieren

## Modus `book`

Nutze `book`, wenn der Nutzer explizit buchen will, z. B.:

- `book it`
- `book Yoga at 19:00`
- `book the Steglitz one`

Verhalten:

1. Genau einen passenden Slot bestimmen.
2. Nur klicken, wenn der Slot aktuell buchbar ist.
3. Falls der Nutzer vorher eine Liste angefordert hat, kann `book` die gleichen Kriterien erneut verwenden oder auf eine gewaehlte Option aus der Liste zielen.

## Regel fuer `city`

Wenn `city` angegeben ist und `club` fehlt:

- alle sichtbaren Clubs matchen, deren Name zur Stadt passt
- Beispiel:
  - `Berlin` -> alle `Berlin - ...` Clubs
  - `Duesseldorf` -> alle `Duesseldorf - ...` Clubs
- fuer jeden passenden Club Kurs und Slots pruefen
- Ergebnisse gesammelt zurueckgeben

Wenn sowohl `city` als auch `club` gesetzt sind:

- `club` hat Vorrang
- `city` dient nur als weiches Zusatzsignal

## Regel fuer fehlendes Datum/Uhrzeit

Wenn `date` und `time` beide fehlen, gilt:

- Nur den angegebenen Kurs (linke Kursauswahl) verwenden.
- Danach alle aktuell sichtbaren Buttons mit Text `Kurs buchen` bzw. `... buchen` in der Kursliste buchen.
- Nach jedem Buchungsklick kurz warten und die Liste neu pruefen.
- Falls ein Slot bereits `... stornieren`, `Kurs ist bereits voll` oder `Buchung nicht mehr moeglich` zeigt, diesen ueberspringen.

In `list`-Mode ohne `date`/`time`:

- alle sichtbaren buchbaren Slots des passenden Kurses zurueckgeben
- nichts klicken

## Regel fuer deutsche und englische Wochentage

Bei `date` deutsche und englische Schreibweisen akzeptieren.

Beispiele:

- `Mittwoch, 29. April`
- `Wednesday, 29. April`
- `Wed, 29. April`
- `Dienstag, 28. April`
- `Tuesday, 28. April`

Mapping:

- `Montag` <-> `Monday`
- `Dienstag` <-> `Tuesday`
- `Mittwoch` <-> `Wednesday`
- `Donnerstag` <-> `Thursday`
- `Freitag` <-> `Friday`
- `Samstag` <-> `Saturday`
- `Sonntag` <-> `Sunday`

Wenn die Website deutsche Datumslabels anzeigt, englische Eingaben vorher auf deutsche Wochentage normalisieren.

## Regel fuer fuzzy Zeit-Matching

Zeitangaben duerfen vollstaendig oder teilweise sein:

- Vollstaendig: `17:30`
- Teilweise Stunde: `17`
- Teilweise Stunde mit Trennzeichen: `17:`

Matching-Regeln fuer `time`:

1. Exakter Treffer zuerst (z. B. `17:30` -> `17:30`).
2. Wenn nur Stunde angegeben ist (z. B. `17`), alle Slots mit Stunde `17` als Kandidaten akzeptieren:
- `17:00`, `17:15`, `17:30`, `17:45` usw.
3. Bei mehreren Treffern:
- den fruehesten verfuegbaren Slot in dieser Stunde bevorzugen
- oder, falls Plattformvorgabe anders ist, den ersten stabil sichtbaren Slot in dieser Stunde
4. Falls kein Treffer in dieser Stunde existiert, sauber mit `class_not_found` oder `button_not_available` beenden.

## Beobachtungen aus Live-Test

- Direkter Einstieg ueber `https://mein.fitnessfirst.de/member/courses` kann ohne Session zu `401 Unauthorized` fuehren.
- Stabiler Einstieg ist ueber `https://www.fitnessfirst.de/mein-fitnessfirst` und dann `Logge dich ein!`.
- Nach Filterung fuer `Berlin - Steglitz SSC` und `Yoga (L1/L2)` sind in der Kursliste z. B. Slots mit `Kurs buchen` sichtbar (u. a. `12:00` und `19:00` am `Mittwoch, 29. April`).

## Regel fuer teilweise Namen

Wenn `club` oder `course` nicht vollstaendig angegeben sind:

- Nicht auf exakte Uebereinstimmung bestehen.
- Den wahrscheinlich besten Treffer aus sichtbaren Optionen waehlen.
- Bevorzuge Treffer, die das Teilwort enthalten und semantisch am naechsten liegen.
- Bei Clubnamen auch auf Endungen/Suffixe matchen, nicht nur auf den Anfang.
- Beispiel Club:
  - `Steglitz` -> `Berlin - Steglitz SSC`
  - `SSC` -> `Berlin - Steglitz SSC`
  - `Duesseltal` -> `Duesseldorf - Duesseltal`
  - `Prenzlauer Berg` -> `Berlin - Prenzlauer Berg`
- Beispiel Kurs:
  - `Yoga` -> `Yoga (L1/L2)` oder naechstliegender Yoga-Kurs, falls genau dieser Button nicht existiert.
- Nur dann hart fehlschlagen, wenn es wirklich keinen plausiblen Treffer gibt.

## Matching-Prioritaet fuer Clubnamen

Fuer `club` diese Reihenfolge verwenden:

1. Exakter Treffer
2. Normalisierter Treffer ohne Sonderzeichen / Gross-Kleinschreibung
3. Enthaltenes Teilwort irgendwo im Namen
4. Endet-auf-Treffer (Suffix), z. B. `SSC`, `Duesseltal`
5. Bester sichtbarer Naeherungstreffer

Wenn mehrere Clubs passen:

- Den spezifischsten sichtbaren Treffer waehlen.
- Treffer mit mehr gemeinsamen Tokens bevorzugen.
- Bei Berlin-Clubs nicht beim ersten `Berlin - ...` stoppen; bis zum besten Match vergleichen.

## Deterministische Matching-Regeln

Vor jedem Vergleich Eingaben und UI-Texte normalisieren:

- lowercase
- trim + Mehrfach-Leerzeichen reduzieren
- Sonderzeichen/Punkte/Kommas ignorieren, sofern sinnvoll
- deutsche Umlaute ae/oe/ue/ss robust behandeln

Matching-Reihenfolge fuer `course` und `club`:

1. Exakt (normalisiert)
2. Token-genau (alle Such-Tokens enthalten)
3. Suffix/Endet-auf-Treffer (wichtig bei Club-Endungen wie `SSC`)
4. Enthaltenes Teilwort
5. Fuzzy-Naeherung (nur wenn 1-4 keinen klaren Treffer liefern)

Tie-Breaker bei mehreren Treffern:

- hoehere Token-Ueberschneidung gewinnt
- laengerer/spezifischerer Labeltext gewinnt
- bei Gleichstand ersten stabil sichtbaren Treffer nehmen und im Ergebnis als `matchStrategy` dokumentieren

## Sichere Buchungsregeln

Vor jedem Klick:

- Nie auf Buttons klicken, die `stornieren` enthalten.
- Nie auf deaktivierte oder nicht klickbare Buttons klicken.
- Nie auf Slots mit `Kurs ist bereits voll` oder `Buchung nicht mehr moeglich` klicken.
- Wenn fuer den gesuchten Slot `Kursbuchung noch nicht moeglich` erscheint: Refresh-Strategie anwenden (siehe unten).

### Refresh-Strategie bei `Kursbuchung noch nicht moeglich`

Wenn der Status `Kursbuchung noch nicht moeglich` erkannt wird:

1. Seite neu laden (`refresh`).
2. Club/Kurs-Filter erneut anwenden.
3. Slot erneut pruefen.
4. Maximal 4 Gesamtversuche (initiale Pruefung + bis zu 3 Refresh-Retries).

Abbruchbedingung:

- Sobald `Kurs buchen` sichtbar ist, normalen Klick-Flow ausfuehren.
- Wenn nach 4 Versuchen weiterhin `Kursbuchung noch nicht moeglich`, dann nicht klicken und mit eindeutiger Ursache beenden.

Nach jedem Buchungsklick:

1. Kurz warten (inkrementell).
2. Auf Erfolg pruefen:
- Meldung `Kurs gebucht`
- oder Button-Status wechselt von `... buchen` zu `... stornieren`
3. Wenn kein Erfolgssignal erscheint:
- genau einen Snapshot-Refresh
- maximal ein kontrollierter Recheck
- keine Endlosschleife/Blind-Retries

## Scheduling / Auto-Trigger

Wenn die Zielplattform zeitgesteuerte Jobs unterstuetzt, diese Felder in den Job uebergeben:

- `email`
- `password`
- `club`
- `course`
- `date`
- `time` (optional)
- `runAt` (optional)

Empfohlenes Verhalten:

1. Eingaben vor dem Planen validieren.
2. Workflow zu `runAt` starten, sonst sofort.
3. Nur sichere Retries nutzen (keine Doppelbuchung).
4. Nach dem Versuch immer ein strukturiertes Ergebnis zurueckgeben.

## Optional: Multi-User Profile-Konfiguration (`profiles.json`)

Fuer Plattformen wie nanoclaw kann optional eine zentrale `profiles.json` genutzt werden.
Ziel:

- mehrere Nutzer verwalten
- Default-Club/Default-Kurse hinterlegen
- mehrere wiederkehrende Zeitslots definieren
- Job-Trigger automatisch 24 Stunden vor Kurszeit starten

Empfohlene Struktur:

```json
{
  "users": {
    "yaniv": {
      "email": "yaniv@example.com",
      "password": "<SECRET>",
      "defaultClub": "Steglitz SSC",
      "defaultCourse": "Hyrox",
      "defaultLessons": [
        { "course": "Hyrox", "time": "19:00" },
        { "course": "Red Bull Gym Clash", "time": "17:30" }
      ],
      "schedule": [
        { "day": "saturday", "time": "10:00" },
        { "day": "saturday", "time": "11:00" },
        { "day": "sunday", "time": "11:00" },
        { "day": "wednesday", "time": "19:00" },
        { "day": "wednesday", "time": "20:00" }
      ]
    }
  }
}
```

Regeln:

- `defaultLessons` ist optional und ergaenzt `defaultCourse`.
- `schedule` darf mehrere Eintraege pro Tag enthalten.
- Ein `schedule`-Eintrag darf optional `course`/`club` enthalten und ueberschreibt dann Defaults.
- Wochentage in Deutsch oder Englisch akzeptieren (inkl. Mapping-Regeln oben).

24h-Logik:

1. Fuer jeden `schedule`-Eintrag naechsten passenden Kurstermin berechnen.
2. Triggerzeit = Kursdatum/Zeit minus 24 Stunden.
3. Genau zu Triggerzeit den Buchungsworkflow starten.
4. Bei bereits gebuchtem Slot nicht erneut buchen (idempotent).

## Verbindliches Ergebnisformat

Nach jedem Lauf ein JSON-objekt mit folgenden Feldern zurueckgeben:

```json
{
  "booked": true,
  "reason": "success",
  "statusMessage": "Kurs gebucht",
  "requested": {
    "club": "SSC",
    "course": "Yoga",
    "date": "Wednesday, 29. April",
    "time": "19:00",
    "runAt": null
  },
  "resolved": {
    "clubMatched": "Berlin - Steglitz SSC",
    "courseMatched": "Yoga (L1/L2)",
    "resolvedDate": "Mittwoch, 29. April",
    "resolvedTime": "19:00",
    "matchStrategy": "token+suffix"
  },
  "bookedSlots": [
    "Mittwoch, 29. April 19:00"
  ],
  "skippedSlots": [],
  "attemptedClicks": 1
}
```

`reason` darf nur einer der folgenden Werte sein:

- `success`
- `class_not_found`
- `button_not_available`
- `login_failed`
- `page_changed`
- `ambiguous_match`
- `booking_not_open_yet`
- `retry_exhausted`
- `automation_error`

## Verbindliches Ergebnisformat fuer `list`

Im `list`-Mode dieses Format verwenden:

```json
{
  "mode": "list",
  "reason": "success",
  "statusMessage": "2 open slots found",
  "requested": {
    "city": "Berlin",
    "club": null,
    "course": "Yoga",
    "date": "Wednesday, 29. April",
    "time": "17",
    "runAt": null
  },
  "results": [
    {
      "clubMatched": "Berlin - Steglitz SSC",
      "courseMatched": "Yoga (L1/L2)",
      "dateLabel": "Mittwoch, 29. April",
      "timeLabel": "17:30",
      "actionLabel": "Kurs buchen",
      "bookingPossible": true,
      "matchStrategy": "city+token+hour"
    }
  ]
}
```

`results`-Eintrag:

- `clubMatched`
- `courseMatched`
- `dateLabel`
- `timeLabel`
- `actionLabel`
- `bookingPossible`
- `matchStrategy`

## Sicherheitsregeln

- Zugangsdaten niemals im Repository speichern.
- Secrets aus Secret-Store/Runtime-Variablen beziehen.
- Passwoerter nicht in Logs ausgeben.

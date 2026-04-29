---
name: book-acourse-fitnessfirst
description: Automatisiert Fitness First Kursbuchungen im Mitgliederbereich mit deutschem UI-Flow (`Mitglieder-Login` -> `Logge dich ein!` -> `Kursbuchung`) und klickt `Kurs buchen`, sobald ein passender Slot verfuegbar ist.
---

# Fitness First Course Booking (DE)

Nutze dieses Skill, wenn ein Kurs im Fitness First Mitgliederbereich automatisch gebucht werden soll.

## Benoetigte Eingaben

- `email` (Login)
- `password` (Login)
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
8. Links filtern:
- `Club auswaehlen` -> besten passenden `club` waehlen
- Kursbutton mit bestmoeglich passendem `course` auswaehlen
9. Buchungsmodus entscheiden:
- Wenn `date` und/oder `time` gesetzt sind: passenden Eintrag im `Kursplan` finden.
- Wenn weder `date` noch `time` gesetzt sind: alle sichtbaren `Kurs buchen`-Buttons fuer den gewaehlten Kurs eins nach dem anderen klicken.
10. Nach jedem Klick auf Erfolgsmeldung/Statuswechsel pruefen (z. B. `Kurs gebucht`, Button wird `... stornieren`).
11. Ergebnis strukturiert zurueckgeben:
- `booked` (`true`/`false`)
- `club`, `course`, `date`, `time`
- `statusMessage`
- `reason` (`class_not_found`, `button_not_available`, `login_failed`, `page_changed`)

## Regel fuer fehlendes Datum/Uhrzeit

Wenn `date` und `time` beide fehlen, gilt:

- Nur den angegebenen Kurs (linke Kursauswahl) verwenden.
- Danach alle aktuell sichtbaren Buttons mit Text `Kurs buchen` bzw. `... buchen` in der Kursliste buchen.
- Nach jedem Buchungsklick kurz warten und die Liste neu pruefen.
- Falls ein Slot bereits `... stornieren`, `Kurs ist bereits voll` oder `Buchung nicht mehr moeglich` zeigt, diesen ueberspringen.

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

## Sicherheitsregeln

- Zugangsdaten niemals im Repository speichern.
- Secrets aus Secret-Store/Runtime-Variablen beziehen.
- Passwoerter nicht in Logs ausgeben.

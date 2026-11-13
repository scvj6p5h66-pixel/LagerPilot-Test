# SA-12c – Nachweis: Mindestbestandsregel und Überschreibschutz (Artikelverwaltung)

Branch: `feature/sa-12c-nachweis` (von `development` 9b6115a). Enthält **nur Tests und diesen Bericht, keinen Anwendungscode.**

## Befund zum Ausgangsstand
Beide Korrekturen sind bereits in `development` enthalten: Commit `8fde636` („AP4 SA-12c: remove min/max rule and protect articles from accidental overwrite“, 11.11.2026) liegt zwischen 0b3462f und 9b6115a. Eine zweite Umsetzung hätte denselben Code doppelt verändert; deshalb wurde nichts neu implementiert, sondern der Ist-Stand gegen alle acht geforderten Prüfpunkte getestet.

## Umsetzung im Code (index.html, Artikelverwaltung)
- Regel „Mindestbestand darf die maximale Boxmenge nicht überschreiten“ ist entfernt (0 Treffer im Code). Mindestbestand (Gesamtbestand) und Boxmenge (je Box) werden nur noch einzeln geprüft (ganze Zahl ≥ 0 bzw. ≥ 1).
- Expliziter Bearbeitungsmodus (`articleEditCode`): nur über „Bearbeiten“ im Artikelstamm, Artikelnummer gesperrt, Hinweiszeile; „Eingabe leeren“ führt zurück zur Neuanlage.
- Neuanlage mit vorhandener Nummer (ohne Beachtung der Groß-/Kleinschreibung, nach Trim) wird mit verständlicher Meldung abgewiesen.
- Absicherung in der Speicherlogik (`transaction`), nicht nur im Formular: Bearbeitung nur, wenn der Artikel noch existiert; Neuanlage prüft Duplikate erneut; Einheit/Packgröße bei Bestand gesperrt; Gewicht/Maximum bei Bestand nicht löschbar und gegen Boxmengen und Lasten geprüft.

## Tests (`tests/articles/sa12c-artikel.js`, 43 Prüfungen)
Aufruf: `node tests/articles/sa12c-artikel.js http://localhost:PORT/index.html`.
Ergebnis gegen `development` 9b6115a: **43 PASS / 0 FAIL, keine JS-Fehler.**
Negativkontrolle gegen 0b3462f (vor SA-12c): schon die erste Neuanlage (Mindestbestand 500 / Box 100) scheitert mit der alten Fehlermeldung; der Test erkennt den Fehler also.

| Punkt | Geprüft |
|---|---|
| 1 Neuanlage | Artikel gespeichert; Artikel, Boxen, Plätze, QR-Zuordnung, Konfiguration unverändert; Formular zurück im Neuanlage-Modus |
| 2 Duplikate | exakt, klein, mit Leerzeichen, gemischt, frisch angelegter Artikel → abgewiesen mit „existiert bereits … über ‚Bearbeiten‘“; Daten und Rohspeicher byteidentisch; Barcode-/Lagerplatz-Kollisionen abgewiesen; Schutz bleibt nach Import aktiv |
| 3 Bearbeiten | Hinweis, gesperrte Nummer; Name/Mindestbestand ändern; Barcode, Einheit, Gewicht, Boxen, Plätze unverändert; manipulierte Nummer im Bearbeitungsmodus abgewiesen |
| 4 Mindestbestand | 500 bei Box 100 zulässig (Neuanlage und Bearbeitung); 0 zulässig; negativ, Dezimal, Box 0, fehlende Bezeichnung/Nummer, Pack 0 weiter abgewiesen |
| 5 Bestände/Boxen | Einheit, Packgröße, Max unter Bestand, Löschen von Gewicht/Max bei Bestand → abgelehnt, Zustand unverändert; Artikel während der Bearbeitung gelöscht → wird nicht neu angelegt |
| 6 Import/Export | Export = Ist-Daten; Import identisch; Export→Import→Export identisch; Altartikel mit Min > Box unverändert |
| 7 Wiederholtes Speichern | 5× Bearbeiten: keine Duplikate, Bestände/Plätze/QR identisch; Doppelklick auf Speichern legt genau einen Artikel an |
| 8 Regression | Der volle Regressionslauf (ap1–ap16, Schein-, Portal-, Demo-, Equivalence-Tests) lief am 13.11. auf einem Stand, der 8fde636 enthält, und war identisch mit den Baselines (keine neuen Fehler). |

## Datenintegrität
Keine Migration, keine Bereinigung, keine Änderung an Speicherformaten. Altdaten mit Mindestbestand > Boxmenge bleiben unverändert erhalten und werden weiter geladen, exportiert und importiert.

## Restrisiken
- Zwei Browser-Tabs: bleibt durch den vorhandenen Tab-Schutz in `persist` abgedeckt, hier nicht neu getestet.
- Die Duplikatprüfung gilt für die Artikelverwaltung; ein vollständiger Import ersetzt den Bestand absichtlich komplett (Sicherung wiederherstellen), das ist kein Überschreibschutz-Fall.
- Echtgerätetests (iPhone/Android) nicht durchgeführt; Prüfung in Chromium-Emulation.

# Tests und Messungen (SA-14)

Diese Skripte sind eigenständig und verändern weder die Anwendung noch deren Daten. Sie laufen in einem frischen, leeren Browserprofil
(Playwright/Chromium) gegen eine lokal ausgelieferte `index.html`.

## Voraussetzungen
- Node.js mit installiertem `playwright` (Chromium).
- Die App über HTTP ausliefern, z. B. im Repository-Hauptverzeichnis: `python3 -m http.server 8123`

## Äquivalenz- und Regressionstest
```
node tests/unit/suggestions-equivalence.js http://localhost:8123/index.html
```
Vergleicht die aktuelle `suggestions()` mit der Referenz aus Commit 8fde636 (`tests/legacy/suggestions_legacy.js`) auf Randfällen,
300 Zufallsdatensätzen und großen Beständen (bis 10.000 Boxen). Prüft außerdem die Belegungszählung der Startseite
(`tests/legacy/home_occupancy_legacy.js`), dass Anzeigeoperationen den Bestand nicht verändern und dass der Zusammenführ-Tab nie veraltet ist.
Der Lauf mit der alten Referenz bei 6.480 und 10.000 Boxen dauert wegen deren quadratischer Laufzeit mehrere Minuten.
Exit-Code 0 = alle Prüfungen bestanden.

## Leistungsmessung
```
node tests/perf/benchmark.js http://localhost:8123/index.html ergebnis.json 500,2000,6480,10000 worst,multi,many
```
Erzeugt deterministische Datensätze (`tests/perf/dataset.js`), schreibt sie in den Browserspeicher, lädt neu und misst im Browser mit
`performance.now()`: `suggestions()`, `renderMerge()`, `render()`, eine Buchung (Wareneingang über die Oberfläche) und eine Umlagerung
(erster geeigneter Zusammenführvorschlag). Median über 3 Wiederholungen (ab 6.480 Boxen 1 Durchlauf).
Szenarien: `worst` (1 Artikel, ab 10.000 Boxen 2 Artikel; ungünstigster Fall), `multi` (50 Artikel), `many` (1.000 Artikel).
Mit `SKIP_BASE=1` werden nur Buchung/Umlagerung gemessen, mit `ONLY=szenario:n,...` nur ausgewählte Zeilen.
Absolute Zeiten hängen vom Rechner ab; für Vorher-Nachher-Vergleiche denselben Rechner und dieselben Daten verwenden.

## Hinweis zu `tests/legacy/`
Die Dateien dort sind unveränderte Referenzkopien alter Logik und dürfen nicht in die Anwendung eingebunden werden.

## Kommissionierschein und Auftragsabschluss (SA-15)
```
node tests/pick/sa15-kommissionierschein.js http://localhost:8123/index.html
```
Eigenständiger Test (frisches Browserprofil, ändert weder App noch Repository). Prüft: Abschluss über Mitarbeiter- und Admin-Oberfläche,
Abschlussansicht, automatischer Druckaufruf (`window.print` wird im Test ersetzt, es wird nichts gedruckt), Scanner/Gerät, erfolgreiche und
fehlerhafte/unvollständige Gewichtskontrolle, Mengenabweichung mit/ohne Freigabe, Europalette/kleine Einwegpalette/tariert, 100 Positionen
(mehrseitiges A4-PDF über `page.pdf`, benötigt `pdfinfo`/`pdftotext` aus poppler-utils), fehlende optionale Angaben und Altaufträge,
5-faches Nachdrucken ohne Datenänderung, Maskierung von Sonderzeichen, iPhone-14-/iPad-Pro-11-Emulation, Export/Import.
Exit-Code 0 = alle Prüfungen bestanden.

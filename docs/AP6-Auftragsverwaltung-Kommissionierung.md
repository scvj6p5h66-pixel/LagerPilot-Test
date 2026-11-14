# AP6 – Auftragsverwaltung, mobile Kommissionierung und sichere Bestandsbuchungen

Stand: 14.11.2026 · Basis: `feature/ap5-final-systemtest` (1e26c85) · Branch: `feature/ap6-auftragsverwaltung-kommissionierung`

## 1. Branch und Commit
Branch `feature/ap6-auftragsverwaltung-kommissionierung`, abgeleitet von 1e26c85. `main` (05b614d) und `development` (9b6115a) unverändert. Kein Merge, keine Veröffentlichung. Commit-Hash: siehe Git-Log des Branches.

## 2. Umgesetzte Funktionen
- **Fix A (2A):** Aufträge mit mehr Positionen als verfügbaren Artikeln werden beim Anzeigen nicht mehr zurückgesetzt. Vorhandene Positionen, Fortschritt und Status bleiben erhalten; fehlende Positionen werden als „fehlen N Position(en) (Bestand)“ gekennzeichnet. Demodaten nur bei echter Erstinitialisierung. Geprüft mit 20, 50 und 100 Positionen (Maximum 100, die 101. wird abgewiesen).
- **Fix B (2B):** Import ohne `schema` nur noch bei ausdrücklich erkanntem Altformat LagerPilot 2.5 (`isLegacy25`), im Bestätigungsdialog als „ALTFORMAT ERKANNT“ gekennzeichnet; sonst Ablehnung mit Meldung, ohne Änderung und ohne Sicherung. Keine stille Konvertierung, keine automatische Migration.
- **Auftragsverwaltung (Verwaltung):** Auftrag anlegen (eindeutige Nummer, ohne Beachtung der Groß-/Kleinschreibung), Positionen hinzufügen/ändern/entfernen, Packartikel nur in Vielfachen, Zuweisung an Mitarbeiter, Fortschrittsanzeige, Pausieren/Fortsetzen/Abschließen, Stornieren mit Grund (neuer Status „Storniert“). Gebuchte Positionen sind nicht entfernbar und nicht unter die gebuchte Menge reduzierbar. Reset der Testdaten ist bei Journal/manuellen Aufträgen gesperrt.
- **Mobile Kommissionierung:** Ablauf Mitarbeiter → Scanner → Auftrag → nächste Position → Platz scannen → Artikel scannen (Artikelnummer/Barcode, Mehrdeutigkeitsprüfung) → hervorgehobene Entnahmemenge (änderbar) → Quellbox wählbar → „Entnahme buchen“. „Position mit Fehlmenge abschließen“ und Wiederöffnen.
- **Sofortbuchung:** Bestand wird nach jeder bestätigten Entnahme ausgebucht, nicht erst beim Abschluss.
- **Korrekturen:** Gegenbuchung mit Bezug auf die Originalbuchung, Menge, Grund (mind. 5 Zeichen), Person, Zeit.
- **Kommissionierschein:** Abschnitt „Gebuchte Entnahmen (Lagerbestand)“; A4-Layout unverändert einseitig.

## 3. Geänderte Dateien
`index.html`, `styles/05-kommissionierung.css`, `styles/08-kommissionierschein.css`, `tests/final/lib.js` (Dialog-Eingabewarteschlange, bisheriges Verhalten bleibt), neu: `tests/ap6/ap6-auftraege-buchung.js`, `docs/AP6-…md`, `docs/ap6-logs/`.

## 4. Ablauf der Bestandsbuchung
1. Platz- und Artikelscan erzeugen für die Position eine Buchungskennung (`PB-…`, Token am Auftrag).
2. Beim Buchen werden Menge (ganzzahlig, ≥1, ≤ Rest, Vielfaches der Packgröße), Quellbox, freier Bestand, Sperren und Journalgrenze geprüft; bei abweichendem Platz Rückfrage.
3. Ein einziger Schreibvorgang (`setItem` auf den Lagerschlüssel) enthält Boxbestand (leere Box wird entfernt), Historie **und** das Buchungsjournal `pickJournal` (Eintrag: Kennung, Auftrag, Position, Artikel, Menge, Platz, Box, Mitarbeiter, Gerät, Zeit).
4. Danach wird der Auftragsfortschritt als aus dem Journal abgeleitete Projektion fortgeschrieben (zweiter Schlüssel). Erfolg wird erst gemeldet, wenn beides gespeichert ist.

## 5. Technischer Schutz gegen Doppelbuchungen
- Eindeutige Kennung je Bestätigung; eine Kennung, die schon im Journal steht, wird nie erneut gebucht (Idempotenz, auch nach Neuladen).
- Sperrflag gegen Doppelklick/Mehrfachverarbeitung; nach Teilentnahme ist ein neuer Scan nötig.
- Gegen Zwei-Tab-Konflikte: die bestehende Schnappschussprüfung (`inventoryStorageSnapshot`) lehnt Schreibvorgänge eines veralteten Tabs ab.
- **Atomarität:** Zwei unabhängige localStorage-Schlüssel können nicht gemeinsam atomar geschrieben werden. Lösung: Bestand + Journal in *einem* Schlüssel (atomar), Auftragsfortschritt ist nur eine abgeleitete Projektion. Schlägt der zweite Schritt fehl, wird der Bestand kompensiert zurückgesetzt (Speicher und Schlüssel); stürzt die Seite dazwischen ab, wird der Fortschritt beim Laden aus dem Journal neu berechnet. So gibt es keinen dauerhaften Zustand „Bestand reduziert, Auftrag unverändert“.
- **Keine Mehrbenutzersicherheit wird behauptet.** localStorage ist pro Browser; verschiedene Geräte teilen keine Daten. Parallele Tabs im selben Browser sind abgesichert, die Absicherung ist ein Schutz gegen veraltete Tabs, keine Sperre.

## 6. Korrektur- und Stornoablauf
- Korrektur: nur über „Korrektur“ an einer Buchung, nie durch Überschreiben. Nur Rückbuchung bis zur noch nicht zurückgebuchten Menge (Beispiel: 12 bestätigt, 10 tatsächlich → +2; Original bleibt im Journal). Rückbuchung in die ursprüngliche Box (bei entfernter Box mit gleicher Box-ID am gleichen Platz); gesperrte Boxen/Plätze, Lastgrenzen und doppelte Korrektur werden abgewiesen. Für abgeschlossene Aufträge nicht möglich (Verweis auf Bestandskorrektur unter Warenbewegungen).
- Storno: Grund Pflicht, Status „Storniert“, bereits gebuchte Entnahmen bleiben bestehen und müssen bei Bedarf einzeln korrigiert werden – nichts wird unbemerkt zurückgedreht.

## 7. AP6-Testergebnisse
`tests/ap6/ap6-auftraege-buchung.js`: **132 PASS / 0 FAIL**, 1 NICHT-DURCHFÜHRBAR (echte Geräte). Abgedeckt: Anlegen/Zuweisen, 20/50/100 Positionen, eine/mehrere Boxen, Sofortabzug, Mehrfachklick, Korrekturen, Teilentnahme und Fortsetzen, Storno, Zwei Tabs, Neuladen, Speicher voll (Lagerschlüssel und Auftragsschlüssel, mit Rücknahme), Absturzsimulation, mehrdeutige Barcodes, Gewicht, Schein, Import/Export, 6.480 Plätze/QR, Blindinventur, 320 px (Emulation).
Vorher/Nachher: gegen 1e26c85 scheitern die [VORHER]-Tests (K-1043 wird zurückgesetzt; Dateien ohne `schema` werden angenommen) – siehe `docs/ap6-logs/`. Im Lauf gefundene echte Fehler (beide behoben): Scan-Status blieb nach Teilbuchung stehen; Korrektur in gesperrten Platz wurde nicht abgewiesen.

## 8. Gesamtregression
**2.872 PASS / 0 FAIL** (identisch zur Basis, 26 Suiten, `docs/ap6-logs/regression/`). Ein erster Lauf zeigte 1 FAIL in ap55 (Meldungstext „Ungültiges Backupformat“); behoben durch Anpassung der App-Meldung, der Test blieb unverändert. Es wurde kein bestehender Test abgeschwächt, entfernt oder übersprungen.

## 9. Datenintegrität und Altkompatibilität
Artikel, Barcodes, Bestände, Boxen, 6.480 Plätze, QR-Zuordnungen, Blindinventur, Demoaufträge und Einseiten-Druck sind unverändert. Das Journal ist optional: Exporte aus AP5 ohne Journal bleiben importierbar; Importe mit doppelten Kennungen oder falschen Vorzeichen im Journal werden abgelehnt. Keine automatische Migration oder Löschung von Altdaten; AP5.5/5.5a-Sicherungen unberührt.

## 10. Offene Risiken und Demo-Tauglichkeit
- Echte Geräte (iPhone Safari, Android, AirPrint, Kamera, Handscanner) **nicht getestet**, nur Chromium-Emulation.
- Keine Mehrbenutzer-/Mehrgerätesicherheit (Demo-Architektur, localStorage); für den Produktivbetrieb ist ein Server mit Transaktionen nötig.
- Das Journal ist auf 20.000 Einträge begrenzt; danach werden Buchungen abgewiesen.
- Zwischen den beiden Schreibschritten gilt Kompensation, kein echter Zwei-Schlüssel-Commit; ein Totalausfall exakt dazwischen wird beim nächsten Laden aus dem Journal repariert.
- Demo-tauglich für Einzelgerät/Einzelbrowser nach gemeinsamer Prüfung.

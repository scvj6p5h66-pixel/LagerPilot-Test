# AP5.4 – Regressionstests bereinigen und Datenintegrität prüfen

Ausgangsbasis: `feature/ap5-3b-sicherheitskorrekturen`, Commit `90697a4`. Neuer Branch: `feature/ap5-4-testbereinigung`.
`main` (05b614df) und `development` (9b6115a) unverändert. Kein Merge, keine Veröffentlichung.
**Der Anwendungscode (`index.html`, `styles/`) ist unverändert** (`git diff 90697a4 -- index.html styles` leer). Geändert wurden nur Testdateien, ein Läufer und Dokumentation.

## 1 Ergebnis in Kürze

| | vorher (90697a4) | nachher |
|---|---|---|
| Kern-Regression (ap1–ap16, equiv, sa15, portal, sa12c) | 1.143 PASS / 21 FAIL | **1.168 PASS / 0 FAIL** |
| ap7 Bearbeiten-Modus (bisher „bekannt“, nicht in den 21) | 56 PASS / 9 FAIL | **66 PASS / 0 FAIL** |
| AP5.1 / AP5.2 / AP5.3b | 77 / 238 / 1.051 | 77/77 · 238/238 · 1.051/1.051 |
| Zwei-Tab-Test · AP5-Diagnose | 12/12 · 18/0 | 12/12 · 18/0 |
| **neu:** Import/Export | – | **74 PASS / 0 FAIL** |

**Tatsächliche Anwendungsfehler unter den 21 Fehlern: keine.** Alle 21 waren Fehler in den Tests (veraltete Erwartung, fehlerhafte Testdaten, Testumgebung). Kein Test wurde gelöscht, übersprungen oder abgeschwächt (Einzelheiten und Ausnahmen siehe 2 und 6).

Die 9 Fehler in `ap7-edit-modus.js` zählten nicht zu den 21 und waren im AP5-Bericht und in meinen früheren Berichten nur als „Testabläufe nicht umgestellt“ geführt. Ich habe sie hier ebenfalls einzeln untersucht und korrigiert (Abschnitt 3).

## 2 Die 21 ursprünglichen Fehler

Kategorien: **A** veraltete Testerwartung, **B** fehlerhafte Testdaten, **C** Anwendungsfehler, **D** Testumgebung. Belege: jeweils am aktuellen Code verifiziert (Test läuft nach Korrektur und prüft das tatsächliche Verhalten).

| # | Suite / Prüfung | Kat. | Ursache | Korrektur | Ergebnis |
|---|---|---|---|---|---|
| 1–7 | ap9 Abschn. 5: v2.7-Speicher mit Fachlast 800 / 600 / null: „bleibt unverändert“, „Einlagern möglich/gesperrt“, „Ausbuchen“ | B | Seed hatte `places:{}` bei vorhandener Box. `valid()` verlangt für jede Box einen vorhandenen Platz, die App lehnte den Speicher zu Recht ab und sperrte ihn. | Seed mit der vollständigen Platzliste der App. | 51/0 (vorher 44/7). Das Fachlastverhalten geladener v2.7-Speicher wird damit erstmals wirklich geprüft: 800 und 600 erlauben Einlagern, `null` sperrt Einlagern, Ausbuchen bleibt möglich. |
| 8 | ap11: „5 Artikel ohne Gewicht: Zählung 51 abgelehnt“ | B | Kommentar sagt „weight null“, Seed setzte Gewicht 2. Mit Gewicht 2 ist 50→51 korrekt erlaubt. | Seed mit `weight:null` für A1 (Parameter `items` in `mk`/`scen`). | 173/0. App lehnt mit „Gewichts-/Traglastdaten unvollständig“ ab, Speicher unverändert. |
| 9 | ap12: „1 Hinweis nennt erkannten Artikel und dass Eingaben bleiben“ | A | Hinweistext seit AP4 SA-12 (e03c6dd): „Barcode gehört bereits zu A1 und kann für diesen Artikel nicht verwendet werden.“ | Erwartung auf den definierten Text und Klasse „warning“. Dass die Eingaben bleiben, prüft die Feldprüfung direkt davor weiter. | 45/0 |
| 10 | ap12: „2 Warnhinweis ‚Kein passender Artikel…‘“ | A | Seit e03c6dd meldet die App bei unbekanntem Barcode „Barcode übernommen. Bitte Artikelangaben prüfen und anschließend speichern.“ als Hinweis (Klasse `hint`), nicht als Warnung. | Erwartung auf genauen Text und Klasse `hint`. | 45/0 |
| 11 | ap13: „4 Scan bekannter Barcode: ‚gehört bereits zu A1‘“ | B | Seed enthält Legacy-Artikel L2 mit Barcode `bc1` (Schreibweise-Dublette zu `BC1`). Die Suche ignoriert Groß-/Kleinschreibung und nennt den ersten Treffer (L2). | Erwartung „A1 oder L2“, wie es die direkt folgende Prüfung desselben Tests bereits tut. | 67/0 |
| 12–13 | ap14: Bezeichnung 151 / 5000 Zeichen abgelehnt | A | Regex `/Bezeichnung darf höchstens 150/` ist case-sensitiv, Meldung beginnt „Artikelbezeichnung …“. Ablehnung funktioniert. | Regex mit `/i`. | bestanden |
| 14–15 | ap14: neue Nummer „a1“ / „aB1“ abgelehnt | A | Text seit SA-12b geändert („… existiert bereits (Groß-/Kleinschreibung wird nicht unterschieden)“). | Erwartung jetzt je Fall mit genauer Nummer („Artikelnummer A1 existiert bereits“, „… ab1 …“). Strenger als vorher. | bestanden |
| 16 | ap14: „4 Meldung Artikelnummer reserviert“ | B | Seed enthält absichtlich einen Legacy-Artikel `toString`; die Dublettenprüfung kommt vor der Reserviert-Prüfung. | In zwei Prüfungen getrennt: Legacy-Zustand (Dublettenmeldung, nichts geändert) und sauberer Zustand („Diese Artikelnummer ist reserviert und nicht zulässig.“). | bestanden, eine Prüfung mehr |
| 17, 19, 20 | ap14: „Min 10 > Max 5“, „Mindestbestand 500 / Box-Max 100“, „A2 Min 101 > Max 100“ abgelehnt | A | Commit 8fde636 „SA-12c: remove min/max rule“: Die Regel wurde bewusst entfernt (Mindestbestand = Gesamtbestand, Maximum gilt je Box). Der Test enthält denselben Gedanken selbst („min>max ist fachlich zulässig“). | Erwartung umgekehrt („erlaubt“) und zusätzlich geprüft, dass Min/Max exakt so gespeichert werden und Boxen unverändert bleiben. | bestanden, drei Prüfungen mehr |
| 18 | ap14: „Home zeigt Mindestbestand-Warnung für LM“ | A | Die Startseite zeigt nur „⚠ n Artikel unter Mindestbestand“, keine Namen. Die Rechnung selbst stimmt. | Prüfung vergleicht die angezeigte Anzahl mit einer unabhängigen Berechnung aus dem Speicher (Artikel mit Minimum und Gesamtbestand unter Minimum) und verlangt, dass LM darunter liegt. | bestanden |
| 26 | ap16: „Edit-Modus + A1 per Import entfernt“ | D | Der Import fragt per `confirm()` nach; ohne Dialog-Handler lehnt Playwright ab, der Import lief nie. | Dialog bestätigen, auf Neuladen warten, zusätzlich prüfen, dass der Import wirklich lief (A1 weg, Sicherung vor Import vorhanden). | 55/0 |

Summe: ap9 7 + ap11 1 + ap12 2 + ap13 1 + ap14 9 + ap16 1 = **21**. Begründete Ausnahme zu „nicht abschwächen“: bei #11 akzeptiert die Erwartung A1 **oder** L2, weil die Seed-Daten zwei berechtigte Besitzer enthalten; alle anderen Korrekturen haben Prüfungen gleich streng oder strenger gemacht.

## 3 Zusätzlich: die 9 Fehler in `tests/ap5/ap7-edit-modus.js`

Alle 9 waren Testfehler seit SA-12c (Artikel dürfen nur noch über „Bearbeiten“ geändert werden):
- **ap7 #1/#2 (3 Prüfungen):** Hilfsfunktion `pe` füllte das Formular für P1, ohne „Bearbeiten“ zu öffnen → Neuanlage-Dublettenmeldung. Jetzt wird „Bearbeiten“ vorher geöffnet.
- **ap7 #4/#7 (3 Prüfungen):** gleiche Ursache bei Artikel A2 → `edit()` verwendet.
- **ap7 #7 „Box-Menge 0“:** gleiche Ursache.
- **ap7 #8 „Veralteter Tab“:** zweiter Tab war nicht im Bearbeiten-Modus → Dublettenmeldung statt Zwei-Tab-Schutz. Jetzt Bearbeiten-Modus geöffnet; der Schutz („in einem anderen Tab geändert … NICHT gespeichert“) wird nachgewiesen.
- **ap7 #5 „Gewicht 14,5 & Max 60 erlaubt“:** Rechenfehler im Test: 55 × 14,5 + 25 = 822,5 kg liegt über der Fachlast 800 kg, die App lehnt **zu Recht** ab. Die Prüfung erwartet jetzt die Ablehnung mit Platz H4A-5-1 und Speicher unverändert; zusätzlich Gewicht 14 (795 kg) mit Max 60 erlaubt. Die QS-Prüfung verwendet 14, damit nur die Boxmenge die Ablehnung auslöst.

Ergebnis: 66/0 (vorher 56/9). Damit ist die frühere Einordnung „bekannte Testabläufe“ eingelöst und belegt.

## 4 Import/Export (neu: `tests/import-export/ap54-import-export.js`, 74 PASS / 0 FAIL)

Jede Instanz läuft in einem eigenen Browser-Kontext. Die Downloads (auch die Sicherung vor dem Import) werden abgefangen und inhaltlich geprüft.

| Bereich | Geprüft | Ergebnis |
|---|---|---|
| Vollständiger Export | Dateiname; items, boxes, places, qrMap, config, history, inventoryLogs, legacyOrders identisch zum Speicher; Barcodes, Pack-/Stückartikel, gesperrte Box, QR-Zuordnung; `_pick` (Aufträge, Verpackung, Toleranz) identisch; Speicher vor/nach Export byte-gleich; Export ohne gespeicherte Kommissionierdaten; CSV (Kopfzeile, Zeilen je Box, 3 Pack = 36 Stück) | bestanden |
| Round-Trip | Export aus Instanz A, Import in Instanz B mit anderen Daten: alle Felder identisch zu A, Kommissionierdaten identisch, keine Reste von B, App entsperrt, keine JS-Fehler | bestanden |
| Sicherung vor Import | Rückfrage nennt die Sicherung; `lagerpilot_before_import` enthält den vorherigen Lager- und Kommissionierstand byte-gleich; Datei „vor-import“ wird heruntergeladen; **Wiederherstellung** durch Import dieser Datei stellt den Ausgangsstand wieder her | bestanden |
| Abbruch der Rückfrage | Speicher byte-gleich, keine Sicherheitskopie, kein Download, kein Neuladen | bestanden |
| 23 ungültige/beschädigte Dateien | kein JSON, abgeschnitten, leer, `null`, Array, `{}`, Schema 99, items kein Array, Box mit unbekanntem Artikel/Platz/negativer/Dezimal-/Textmenge, history Objekt, places Array, qrMap mit ungültigem Platz, config negativ/Text, `_pick` (orders Text, Status, Menge 1,5, session fehlt, null): jeweils Fehlermeldung, **keine** Rückfrage, kein Neuladen, kein Download, Speicher byte-gleich, keine Sicherheitskopie | alle abgelehnt |
| Fehlerinjektion beim Schreiben | (a) Sicherheitskopie nicht speicherbar → Import abgebrochen; (b) Schreiben der Lagerdaten schlägt fehl → nichts importiert; (c) Schreiben der Kommissionierdaten schlägt fehl, Lagerdaten bereits geschrieben → **Rollback**, beide Speicher byte-gleich zum Vorzustand | bestanden |
| Beschädigter Speicher | App gesperrt; Import einer gültigen Sicherung stellt den Betrieb wieder her; der beschädigte Rohstand bleibt in Quarantäne/Sicherheitskopie erhalten | bestanden |
| Mehrfachimport | Erster Import: Sicherheitskopie = Ausgangsstand; zweiter Import (andere Datei): Sicherheitskopie wird überschrieben; je Import eine Datei „vor-import“; gleiche Datei zweimal importiert: Stand identisch | bestanden (Verhalten siehe Risiken) |
| Import ohne `_pick` | Lagerdaten ersetzt, vorhandene Kommissionierdaten unverändert | bestanden |
| Zwei-Tab-Schutz | veralteter zweiter Tab kann nach einem Import nichts überschreiben | bestanden |

Bereits zuvor abgedeckt und weiter bestanden: Altformate Schema 2.5/2.6 und Backups (ap1 59, ap2 88, ap1c 25), Speichersperre/Quarantäne, `valid()`-Randfälle (ap4–ap6 im Archiv).

## 5 Vollständige Regression nach den Korrekturen

Läufer im Repo: `tests/regression-archiv/run_regression_ap54.sh` (Ports: 8123 aktueller Stand, 8124 Vergleichsstand e03c6dd für ap13/ap14, 8130 Stand 1c01db1 für den ap53b-Desktopvergleich). Logs: `docs/ap54-logs/`.

ap1 59/0 · ap1c 25/0 · ap2 88/0 · ap8 62/0 · ap9 51/0 · ap10 46/0 · ap11 173/0 · ap12 45/0 · ap13 67/0 · ap14 84/0 · ap15 78/0 · ap16 55/0 · equiv 85/0 · sa15 (Kommissionierschein/iPhone-Druck) 81/0 · portal 126/0 · sa12c 43/0 → **1.168 / 0**. Dazu: ap7 66/0 · AP5.1 77/0 · AP5.2 238/0 · AP5.3b 1.051/0 (Desktop-Vergleich mit 1c01db1 echt, nicht mit sich selbst) · Zwei-Tab 12/0 · AP5-Diagnose 18/0 (0 Befunde) · Import/Export 74/0.
Scanner (Kamera-Rückruf simuliert, ap12/ap13/ap15, Kommissionierung sa15/portal), Kommissionierung und Gewichtskontrolle (ap51, ap52, ap53b, sa15) sowie iPhone-Drucklayout (sa15) sind in diesen Läufen enthalten.

Hinweis zur Testumgebung (Korrektur einer früheren Annahme): Der Vergleichsserver für den „alten Stand“ von ap13/ap14 (Port 8124) lieferte in den AP5.3/5.3b-Läufen den **aktuellen** Stand, die Gegenüberstellung alt/neu war dort wirkungslos. Jetzt liefert er e03c6dd (vor SA-12b); ap13 und ap14 bestehen mit echtem Vergleich. Außerdem fehlte `lib_old.js` im Archiv, `ap13`/`ap14` liefen dort nicht bis zum Ende.

## 6 Geänderte / neue Dateien

Geändert: `tests/regression-archiv/ap9.js`, `ap11.js`, `ap12.js`, `ap13.js`, `ap14.js`, `ap16.js`, `README.md`; `tests/ap5/ap7-edit-modus.js`.
Neu: `tests/import-export/ap54-import-export.js`, `tests/regression-archiv/lib_old.js`, `tests/regression-archiv/run_regression_ap54.sh`, `docs/ap54-logs/`, dieser Bericht.
Keine Änderung an `index.html`, `styles/`, Artikel-, Lager- oder Auftragsdaten. Keine Migration.

## 7 Verbleibende Risiken und Beobachtungen

1. **Sicherung vor Import hat nur einen Speicherplatz** (`lagerpilot_before_import`). Ein zweiter Import überschreibt sie mit dem Stand nach dem ersten Import. Der ursprüngliche Stand bleibt nur in der heruntergeladenen Datei „lagerpilot-vor-import-…json“. Außerdem ist dieser Speicherplatz nicht im Rohdaten-Download („Rohdaten sichern“) enthalten, und es gibt keine Oberfläche zum Wiederherstellen daraus; der echte Rettungsweg ist der erneute Import der heruntergeladenen Datei (getestet). **Nicht auf echten Geräten geprüft:** ob iPhone-Safari oder Android-Chrome den automatischen Download der Datei „vor-import“ zulassen; bei blockiertem Download bliebe nur der eine Speicherplatz. Das ist kein Fehler im engeren Sinn, aber eine Sicherheitsfrage für die gemeinsame Prüfung.
2. Importfehler melden bei vielen Ursachen nur „Ungültiges Backupformat.“; welche Zeile/Feld defekt ist, erfährt man nicht (Bedienbarkeit, kein Datenrisiko).
3. Die Startseite nennt unter Mindestbestand nur eine Anzahl, keine Artikel (bekannter Verbesserungswunsch B4). Sie zählt auch Artikel mit Minimum ohne jeden Bestand.
4. Meldungstexte sind in vielen alten Tests fest eingebaut. Künftige Textänderungen führen wieder zu Testfehlern; ein Teil der Prüfungen sollte langfristig auf Codes/Ergebnisse statt Wortlaut umgestellt werden.
5. Weiter offen aus früheren Paketen: echte Geräte (iPhone/Android, Kamera, Handscanner, AirPrint) nicht getestet; keine Gewichtsobergrenze; Kartenansicht benötigt `:has()`.
6. `ap16b` ist eine Sonde ohne Prüfungen (0 PASS) und zählt nicht als Test.

## 8 Tatsächliche Anwendungsfehler, die eine Freigabe benötigen

**Keine.** Es wurde kein Anwendungsfehler gefunden. Zur Entscheidung (jeweils nur Vorschlag, nicht umgesetzt):
- Soll die Sicherung vor dem Import in den Rohdaten-Download aufgenommen und dem Nutzer ein Hinweis „Datei ‚vor-import‘ aufbewahren“ angezeigt werden? (Risiko 1)
- Soll die Startseite die betroffenen Artikel unter Mindestbestand nennen? (Risiko 3)

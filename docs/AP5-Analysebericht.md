# AP5 – Analyse der 26 bestehenden Testfehler

Branch: `feature/ap5-qualitaetssicherung` (Basis: `feature/sa-12c-nachweis` a000991 = `development` 9b6115a + SA-12c-Nachweis)
Prüfstand: Chromium (Playwright, headless). **Keine Änderung am Anwendungscode.** Kein Merge, keine Veröffentlichung.

Kategorien: **A** = veralteter/fehlerhafter Test, **B** = echter Programmfehler, **C** = Ursache noch unklar.
Nicht real getestet (nur emuliert bzw. nicht möglich): iPhone-Safari, Android, AirPrint, Kamera, Handscanner.

## 1 Ergebnis in Kürze

| Kategorie | Anzahl der 26 | Bemerkung |
|---|---|---|
| A – Testfehler / veraltete Erwartung | 22 | App verhält sich korrekt oder bewusst geändert |
| B – echter Programmfehler | 4 | #21 (Gewicht), #23–25 (Tap-Ziel, ein Befund in drei Geräteprofilen) |
| C – unklar | 0 | #26 ist geklärt (Testfehler) |

Zusätzlich fand die Analyse zwei weitere Programm-Befunde ohne Testfehler (B2: Gewicht ohne Obergrenze; B4: Mindestbestand-Hinweis ohne Artikelnamen) und mehrere Testlücken (Abschnitt 6).
**Der Regressionsstand 1138 PASS / 26 FAIL ist unverändert; kein Fehler führt zu Datenverlust.**

## 2 Die 26 Fehler einzeln

Quelle: `docs/ap5-logs/regression/` (Lauf auf a000991).

| # | Test / Prüfung | Ist-Ergebnis | Kat. | Ursache | Auswirkung | Prio | Empfehlung |
|---|---|---|---|---|---|---|---|
| 1–7 | ap9 Abschn. 5: v2.7 mit Fachlast 800/600/null „bleibt unverändert“, „Einlagern möglich/gesperrt“, „Ausbuchen“ | Zustand `null`, „Artikel und gültige Menge eingeben“ | **A** | Test-Seed hat `places:{}` **und** eine Box auf H4A-1-1. `valid()` verlangt, dass jeder Box-Platz in `places` existiert → Speicher wird abgelehnt, in `lagerpilot_v2_7_quarantine` gesichert, `storageLocked=true`. Das Verhalten der App ist korrekt und schützt die Daten. | Keine Datenfolge (Original bleibt, nichts überschrieben). Aber: Fachlast-Verhalten für „geladene v2.7-Speicher“ wird durch diese 7 Tests **nicht** geprüft (Testlücke). | Mittel (Testlücke) | Seed mit vollständiger 6480-Plätze-Liste erzeugen (z. B. erst App starten, dann `transaction()`), danach Fachlast 800/600/null prüfen. Gegenprobe in `tests/ap5/ap5-diagnose.js` zeigt: Konfiguration wird mit 6480 Plätzen korrekt übernommen. |
| 8 | ap11: „5 Artikel ohne Gewicht: Zählung 51 abgelehnt“ | „✓ Inventurdifferenz gespeichert.“ | **A** | Der Test benutzt Artikel A1 mit Gewicht 2 (Kommentar sagt „weight null“, Seed setzt es nicht). Mit Gewicht 2 ist Erhöhung 50→51 korrekt erlaubt. Mit echtem `weight:null` lehnt die App ab („Gewichts-/Traglastdaten unvollständig…“) und ändert nichts (Diagnose bestätigt). | keine | Niedrig | Seed mit `weight:null` verwenden. |
| 9 | ap12: „1 Hinweis nennt erkannten Artikel und dass Eingaben bleiben“ | „Barcode gehört bereits zu A1 und kann für diesen Artikel nicht verwendet werden.“ | **A** | Hinweistext wurde geändert; Test erwartet Artikelname + „unverändert“. Schutz funktioniert (Barcode nicht übernommen). | keine | Niedrig | Erwartung an aktuellen Text anpassen. |
| 10 | ap12: „2 Warnhinweis ‚Kein passender Artikel…‘“ | „Barcode übernommen. Bitte Artikelangaben prüfen und anschließend speichern.“ (Hinweis, nicht Warnung) | **A** | Bewusst geändertes Verhalten: unbekannter Barcode wird im Artikelformular übernommen und als Hinweis gemeldet. | keine | Niedrig | Test anpassen. |
| 11 | ap13: „4 Scan bekannter Barcode: Warnung ‚gehört bereits zu A1‘“ | „…gehört bereits zu L2…“ | **A** | Der Seed enthält Altartikel L2 mit Barcode `bc1` (Schreibweise-Dublette zu A1 `BC1`). Die Suche vergleicht ohne Groß-/Kleinschreibung und nennt den ersten Treffer. Warnung und Schutz greifen in beiden Fällen. | keine; bei Legacy-Dubletten wird nur der erste von mehreren Besitzern genannt | Niedrig | Test akzeptiert „A1 oder L2“ (die Parallelprüfung „bc1“ im selben Test tut das bereits). |
| 12–13 | ap14: Bezeichnung 151 / 5000 Zeichen abgelehnt | Meldung „Artikelbezeichnung darf höchstens 150 Zeichen enthalten.“ | **A** | Regex `/Bezeichnung darf höchstens 150/` ist case-sensitiv; die Meldung lautet „Artikelbezeichnung darf…“ (kleines „b"), daher kein Treffer. Die Ablehnung selbst funktioniert. | keine | Niedrig | Regex `/bezeichnung darf höchstens 150/i`. |
| 14–15 | ap14: neue Nummer „a1“ bzw. „aB1“ abgelehnt | „Artikelnummer … existiert bereits (Groß-/Kleinschreibung wird nicht unterschieden)…“ | **A** | Test erwartet alte Formulierung „bereits vergeben“; SA-12c hat den Text bewusst geändert. Ablehnung korrekt, nichts geändert (Test prüft das). | keine | Niedrig | Regex auf „existiert bereits“. |
| 16 | ap14: „4 Meldung Artikelnummer reserviert“ | „Artikelnummer toString existiert bereits…“ | **A** | Der Test-Seed enthält absichtlich einen **Altartikel** `toString`. Die Dublettenprüfung kommt vor der Reserviert-Prüfung. Im sauberen Zustand antwortet die App korrekt „Diese Artikelnummer ist reserviert und nicht zulässig.“ (Diagnose; ebenso `TOSTRING`, `__proto__`, `constructor`). | Altartikel mit reservierten Namen bleiben weiter bearbeitbar (gewollt, keine Bereinigung). | Niedrig | Test auf sauberen Zustand umstellen, Altfall getrennt prüfen. |
| 17, 19, 20 | ap14: „Min 10 > Max 5“, „Mindestbestand 500 / Box-Max 100“, „A2 Min 101 > Max 100“ abgelehnt | „Artikel gespeichert.“ | **A** | SA-12c hat die Regel „Mindestbestand ≤ Box-Max“ bewusst entfernt (Mindestbestand ist Gesamtbestand, Box-Max gilt je Box). | keine | Niedrig | Erwartungen umkehren (jetzt erlaubt) und festschreiben. |
| 18 | ap14: „Home zeigt Mindestbestand-Warnung für LM“ | Home zeigt „⚠ 1 Artikel unter Mindestbestand“ | **A** (Test) / **B4** (Verbesserung) | Test sucht „LM“ im Text; Home zeigt nur eine Anzahl, keine Namen. **Rechnung korrekt** (Diagnose): LM 160 < 500 → gezählt; OK 120 ≥ 100 → nicht; Artikel ohne Mindestbestand → nicht. | keine Fehlrechnung; Nutzer sieht nicht, welcher Artikel betroffen ist | Niedrig–Mittel | Test auf Anzahl prüfen. Optional später: Artikelnamen/Link im Hinweis anzeigen. |
| 21 | ap14: „6 Gewicht 1e999 → passende Einzelmeldung“ | „Artikel gespeichert.“ | **B** | `aWeight` ist `type=number`: der Browser verwirft ungültige Eingaben (`1e999`, `abc`, `Infinity`, `1,5`) → `value=''`. Die App liest „leer“ und speichert **ohne Fehlermeldung** den Artikel mit `weight:null` (alle Fälle bestätigt). Die Prüfung `Number.isFinite` greift nie, weil nie ein Wert ankommt. | Neuanlage: Artikel ohne Gewicht gespeichert, Nutzer wird nicht informiert (Buchungen werden ohne Gewicht sicher blockiert). **Bearbeiten ohne Bestand: ein vorhandenes Gewicht (z. B. 2 kg) wird durch eine ungültige Eingabe still auf `null` gesetzt** (Diagnose F21c). Mit Bestand greift der Schutz („Gewicht … dürfen bei vorhandenem Bestand nicht gelöscht werden“), Gewicht bleibt. | | **Mittel–Hoch** | `validity.badInput` bzw. leeres Feld bei nicht leerem Rohtext erkennen und mit Meldung ablehnen; Obergrenze definieren. |
| 22 | ap14: „6 Barcode = Artikelnummer → passende Einzelmeldung“ | „Artikelnummer MS existiert bereits…“ | **A** (Folge von #21) | Der Test verwendet für alle Fälle derselbe Code `MS`. Der vorherige Fall „Gewicht 1e999“ hat `MS` durch den Fehler #21 **tatsächlich gespeichert**; der nächste Fall trifft deshalb die Dublettenprüfung. | keine eigene | Niedrig | Pro Fall eindeutige Nummer; nach Korrektur von #21 entfällt die Folge. |
| 23–25 | ap16: Bearbeiten-Button Tap-Ziel ≥ 32 px (iPhone 14, iPad Pro 11 hoch/quer) | 87 × 30 px | **B** (UI, D) | Button im Artikelstamm 30 px hoch; Empfehlung für Touch ≥ 44 px (Portal nutzt 44 px). Ein Befund, dreimal je Geräteprofil gezählt. | Fehlbedienung auf Touchgeräten möglich (neben Löschen/anderen Aktionen) | Niedrig–Mittel | `min-height:44px` für Tabellen-Buttons im Artikeltab. Echtgerätetest nötig. |
| 26 | ap16: „Edit-Modus + A1 per Import entfernt: Speichern legt A1 NICHT neu an“ | A1 nach Import vorhanden, „Artikel gespeichert.“ | **A** | Der Import fragt per `confirm(…)` nach. ap16 hat keinen Dialog-Handler; Playwright lehnt Dialoge automatisch ab → Import wird **abgebrochen**, es wurde nie importiert, die Voraussetzung des Tests war nie erfüllt. Mit bestätigtem Dialog (Diagnose): Seite lädt neu, A1 entfernt, Sicherung `lagerpilot_before_import` vorhanden, Bearbeitungsmodus zurückgesetzt, A1 wird nicht neu angelegt. Bei abgelehntem Dialog bleibt der Speicher byteweise unverändert. | **Kein Datenverlust, nichts ungewollt behalten.** | Niedrig | Test mit `page.on('dialog', d=>d.accept())` und auf Neuladen warten. |

### Sonderprüfungen

- **A – AP16-Import:** geklärt (s. #26): abgebrochener Import wegen nicht bestätigten Dialogs. Keine Datenfolge. Beobachtung: `lagerpilot_before_import` ist ein einziger Schlüssel; ein zweiter Import überschreibt die erste Sicherung (Datenrisiko 2).
- **B – Mindestbestand Home:** vergleicht Gesamtbestand je Artikel mit dem gespeicherten Minimum (korrekt, Test bestätigt). Verbesserungswunsch: Namen anzeigen.
- **C – Artikelverwaltung:** Barcode-Warnungen, Namenslänge, reservierte Namen und Dublettenschutz funktionieren; die Testfehler sind Wortlaut/Fixture. Echter Fehler nur #21 (Gewicht).
- **D – Mobil:** Bearbeiten-Button 30 px (#23–25). ap16c: Nach Tipp auf „Bearbeiten“ scrollt die Seite zum Hinweis; **„Speichern“ liegt dann außerhalb des Sichtbereichs** (Hinweis oben sichtbar: ja; Speichern: nein) – Komfortpunkt, kein Fehler.
- **E – Lagerverwaltung:** Fachlast/Boxen/Plätze im Artikel-Edit (ap7 auf Bearbeiten-Modus umgestellt, `tests/ap5/ap7-edit-modus.js`): 56 Prüfungen bestanden (Max gegen Boxmenge, Gewicht gegen Fachlast/Palette/Feldlast, fehlende Lastdaten, QS-gesperrte Boxen, atomar „keine Teiländerung“). Inventur gegen Fachlast (ap11) bis auf #8 bestanden.

## 3 Zusätzliche Tests (außerhalb des Standardlaufs)

Alle Skripte wurden gesucht; ausführbare liefen (Logs in `docs/ap5-logs/zusatz/`).

| Skript | Ergebnis | Bewertung |
|---|---|---|
| ap3 (Inventurprotokolle bei Grenze 10000) | 56 PASS / 2 FAIL | **A**: Test erwartet bei Start 9500 genau 10000 Einträge; korrekt sind 9501. |
| ap4 (Import/Migration, Historie 3500) | 55 / 2 | **A**: Import hängt Migrationseintrag oben an; `history[0]==='h0'` gilt nicht mehr. Länge 3000 korrekt, älteste Einträge entfallen und sind im Migrationstext vermerkt. |
| ap5 (Migration v2.6/Legacy) | 46 / 3 | **A**: Hinweiszeile steht im Tab „Mehr“, Test prüft Home; Legacy „3 verfügbar + 1 gesperrt“ wird korrekt zu Menge 4/gesperrt 1 (nichts geht verloren); bei fehlendem Leergewicht warnt die Migration „Lastprüfung nicht vollständig möglich“ statt „Überlast“ (**B5**, niedrig). Originalschlüssel bleiben unverändert. |
| ap6 | 53 / 1 | **A/Design**: „history null“ wird mit klarer Meldung abgelehnt statt als „fehlend“ behandelt. |
| ap7 (alter Artikel-Edit) | 27 / 38 | **A**: überschreibt Artikel über Neuanlage – seit SA-12c bewusst gesperrt. Umgestellt: ap7e 56 / 9 (Rest: Testabläufe nicht umgestellt bzw. falsche Rechnung 14,5 × 55 + 25 = 822,5 > 800, die App ist richtig). |
| ap9c | 10 / 0 | PASS |
| ap21 (Vergleich alt 8fde636 ↔ neu) | 15 / 0 | PASS |
| ap22 (iPhone-Emulation, CPU 4×, 6480 Boxen) | 20 / 0 | PASS |
| ap16c, ap17–ap20 | Messwerte/Info, keine Assertions | ap17: kein XSS, Vollbelegung 396 ms; ap18–20: Leistungswerte unauffällig; ap16c siehe D |
| ap1b, ap2b, ap2c, ap5b, ap7b, ap9b/d, ap10b, ap13b, ap14b | Sonden ohne Assertions | ap2b/ap2c brechen mit TypeError ab (Sonden setzen Historie voraus) – A, nicht relevant |
| ap1, ap1c, ap2, ap8, ap10, ap11, ap12–ap16, equiv, sa15, portal, sa12c | Standardlauf, 1138 PASS / 26 FAIL | s. Abschnitt 2 |
| a*, k*, m*, n*, q*, r*, s*, t*, u*, dbg*, mk*, prof* | Explorationsskripte (geben Werte aus, keine PASS/FAIL) | nicht als Regression gewertet |

**Nicht ausführbar / nicht real geprüft:** iPhone-Safari/Android, AirPrint, Kamera-Scan, Handscanner, WebKit (nur Chromium vorhanden), Dev-Test-Pages-Adresse (GitHub-Pages im Sandbox-Netz gesperrt).

## 4 Erkannte Datenrisiken

1. **Stilles Verwerfen ungültiger Gewichte** (#21): Neuanlage ohne Gewicht ohne Meldung; beim Bearbeiten eines Artikels **ohne Bestand** geht ein vorhandenes Gewicht verloren (mit Bestand geschützt).
2. **Eine einzige Import-Sicherung** (`lagerpilot_before_import`): ein zweiter Import überschreibt sie. Empfehlung: vor Import zusätzlich JSON-Export herunterladen.
3. **Mehrere Tabs/Geräte:** Lagerbestand hat Stale-Banner und Konflikterkennung (SA-12c, getestet), Kommissionierdaten nur teilweise; Geräte synchronisieren nicht.
4. **Begrenzte Historie** (3000 Einträge, 10000 Inventurprotokolle): älteste Einträge werden verworfen; bei Import im Migrationstext vermerkt, im Normalbetrieb ohne Hinweis.
5. **Gewicht ohne Obergrenze** (1e308 kg wird gespeichert, B2): kann Last-Berechnungen verfälschen (es blockiert dann sicher).
6. **Altlasten:** Altartikel mit reserviertem Namen oder Schreibweise-Dublette bleiben unverändert (bewusst, keine automatische Bereinigung); Scan nennt nur den ersten Besitzer eines Barcodes.

Bestätigt geschützt: Artikel, Barcodes, Bestand, Boxen, Plätze, Aufträge und QR-Zuordnungen wurden in keinem Lauf verändert (Test-Seeds in frischen Browserprofilen); fehlerhafte Speicher werden quarantänisiert statt überschrieben.

## 5 Priorisierte Korrekturempfehlung (noch nicht umgesetzt – wartet auf gemeinsame Prüfung)

1. **Mittel–Hoch – #21/B2:** Ungültige oder leere-trotz-Eingabe Gewichtswerte erkennen (`validity.badInput`), Meldung zeigen, Speichern abbrechen; Obergrenze festlegen. Edit-Pfad ist in `ap5-diagnose.js` abgedeckt.
2. **Mittel – Testlücke Fachlast (#1–7):** ap9-Abschnitt 5 mit gültigem Seed reparieren.
3. **Niedrig/Mittel – #23–25:** Tap-Ziele ≥ 44 px (Bearbeiten, ggf. weitere Tabellenbuttons); Echtgerätetest.
4. **Niedrig – Testpflege (A-Fälle):** Erwartungen an SA-12c anpassen (#9–20, 22, 26 usw.), ap3/ap4/ap5/ap6 aktualisieren, ap7 durch ap7-edit-modus ersetzen.
5. **Niedrig – Verbesserungen:** Home-Hinweis mit Artikelnamen (B4), Migrationswarnung bei fehlendem Leergewicht klarer (B5), Speichern-Button nach „Bearbeiten“ auf Mobil sichtbar halten, zweite Import-Sicherung.

## 6 Fehlende Tests für die Auftragsverwaltung (Kommissionierung)

Gefunden per Schlagwortsuche über sa15, portal und ap-Skripte (Näherung):
- Auftrag **zuweisen** (`data-pick-assign`) und Zuweisung ändern – keine Abdeckung.
- **Statuswechsel** und unzulässige Übergänge (Offen → Zugewiesen → In Bearbeitung → Pausiert → Abgeschlossen) inkl. **Pausenstatus** – keine Abdeckung.
- Auftrag **entfernen** (`data-pick-remove`) und Zurücksetzen (`pickReset`): Bestand/Boxen/Aufträge unverändert? – kaum Abdeckung.
- **Mehr-Tab-/Mehr-Geräte-Konflikt** bei Kommissionierdaten (offener Punkt in `docs/BEKANNTE_FEHLER.md`) – keine Abdeckung.
- Import/Export mit `_pick` (Grenzen: max. 100 Positionen, ungültige Status, fehlende Felder) – nur Teile.
- Persistenz über Neuladen/Seitenwechsel während laufender Kommissionierung.
- Falscher Platz/Artikel gescannt, Mengenabweichung mit/ohne Freigabe über Reload.
- Zusammenspiel Bestandsbuchung ↔ Auftrag (keine Buchung durch Kommissionierdemo).
- Echtgerät-Tests (iPhone/Android/AirPrint/Scanner).

## 7 Geänderte/neue Dateien

- `docs/AP5-Analysebericht.md` (neu)
- `docs/ap5-logs/` (neu): Logs des Regressionslaufs, der Zusatzläufe und des Diagnosetests
- `tests/ap5/ap5-diagnose.js` (neu): Diagnose zu #1–8, 16, 18, 21, 23–26 (15 PASS, 4 BEFUND)
- `tests/ap5/ap7-edit-modus.js` (neu): ap7 für den Bearbeiten-Modus
- `tests/regression-archiv/` (neu): Archivkopien der bisher nur lokal vorhandenen Regressionsskripte (ap1–ap22, lib.js, Läufer); enthalten feste Pfade/Ports (localhost:8123), siehe README dort
- **Kein** Anwendungscode (`index.html`, `styles/`) geändert.

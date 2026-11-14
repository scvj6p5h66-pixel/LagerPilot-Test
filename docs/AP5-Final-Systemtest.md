# LagerPilot – AP5-Final: System-, Sicherheits- und Praxistest

Stand: 14.11.2026 · Prüfer: Claude (zweiter Entwickler) · Sprache/Format: PASS / FAIL / BEFUND / NICHT-DURCHFÜHRBAR

**Wichtig vorab:** Alle Tests liefen als **Chromium-Emulation** (Playwright) mit isolierten Testdaten je Browserkontext. **Kein Test wurde auf einem echten Gerät ausgeführt.** Kamera und Scanner sind durch einen Mock ersetzt, Druck durch A4-PDF-Rendering mit Druck-CSS. Echtgeräte-Tests sind unter „nicht durchführbar“ aufgeführt und dürfen nicht als bestanden gelten.

## 1. Branch und Commit

| | |
|---|---|
| Geprüfter Anwendungsstand | `feature/ap5-5a-altimport` @ **53c60f4** |
| Neuer Branch | `feature/ap5-final-systemtest` |
| Änderungen am Anwendungscode | **keine** (`git diff 53c60f4 -- index.html styles` leer) |
| `main` | unverändert (05b614df) |
| `development` | unverändert (9b6115a) |
| Merge / Veröffentlichung | keiner |

**Nachweis, dass die Tests den richtigen Commit nutzen:** Testserver Port 8123 liefert `index.html` mit SHA-256 `b9de7e1d…e48e`, identisch mit dem Stand in HEAD (53c60f4); `styles/` ebenfalls geprüft; Arbeitsbaum sauber. Vergleichsserver 8124 = e03c6dd, 8130 = 1c01db1 (ebenfalls per SHA-256 belegt). Siehe `docs/ap5final-logs/server-nachweis.txt`.

## 2. Vollständige Testergebnisse

### 2.1 Regression auf dem endgültigen Stand (Logs: `docs/ap5final-logs/regression/`)

| Suite | Baseline | Ergebnis |
|---|---|---|
| Kern-Regression (ap1–ap16, equiv, sa15, portal, sa12c u. a.) | 1.173 PASS | **1.173 PASS / 0 FAIL** |
| Import/Export | 74 | **74 / 0** |
| AP5.3b | 1.051 | **1.051 / 0** |
| AP5.5 | 81 | **81 / 0** |
| AP5.5a | 81 | **81 / 0** |
| Zwei-Tab | 13 | **13 / 0** |
| **Gesamt** | **2.872 / 0** | **2.872 PASS / 0 FAIL** (identisch zur Baseline) |

Kein bestehender Test wurde geändert, gelöscht, übersprungen oder abgeschwächt.

### 2.2 Neue AP5-Final-Tests (Dateien in `tests/final/`)

| Test | PASS | FAIL | BEFUND | NICHT-DURCHFÜHRBAR |
|---|---|---|---|---|
| Praxistest (`ap5final-praxis.js`) | 121 | **1** | 3 | 1 |
| Sicherheitstest (`ap5final-sicherheit.js`) | 88 | 0 | 3 | 0 |
| Mobiltest (`ap5final-mobil.js`) | 92 | 0 | 18 | 5 |

Das eine FAIL im Praxistest ist ein **echter Anwendungsfehler** (F1, siehe Abschnitt 6). Der Test bleibt unverändert rot stehen.

### 2.3 Korrekturen an meinen eigenen neuen Tests während des Laufs (transparent)

Es handelt sich ausschließlich um neu geschriebene AP5-Final-Tests; bestehende Tests blieben unberührt. Frühere Läufe liegen als `verlauf-*.log` bei.

- **Praxistest, Lauf 1 (116 PASS / 7 FAIL):** Falsche Testannahmen korrigiert – Min > Max als BEFUND statt FAIL (App akzeptiert es, s. F4); QS-Buchung benötigt Mitarbeitername (`lagerpilot_qs_actor`); Bestandsliste zeigt „N Orte“ statt Plätze; Blindinventur-Regex traf den Hinweistext; Heimwarnung dynamisch berechnet.
- **Sicherheitstest, Lauf 1 (85 / 3 FAIL):**
  - „UTF-8-BOM“: Die Datei ist nach BOM-Entfernung inhaltlich gültig und wird korrekt importiert → falsche Erwartung, jetzt als eigener Test mit Integritätsprüfung.
  - „Schema fehlt“: Import erfolgte, obwohl Ablehnung erwartet war → nach Analyse **echter Befund F2** (kein Testfehler).
  - Großbestand-Test erzeugte selbst 3.001 Historieneinträge (über dem Limit 3.000) → Testgenerator korrigiert.
- **Mobiltest, Lauf 1 (79 / 13 FAIL):** Testfehler – Auftrag war im Test keinem Mitarbeiter zugeteilt (Mitarbeiteransicht leer); Druck wurde fälschlich mit Viewport-Breite statt Papierbreite geprüft (Druck erfolgt auf A4) → jetzt A4-PDF-Rendering; Touch-Schwelle auf 40 px gesetzt (43-px-Felder waren kein Befund). `bookQty` ohne `inputmode` ist ein **echter Befund (F6)**.

## 3. Ergebnisse der realistischen Lagerabläufe

| Bereich | Ergebnis |
|---|---|
| **Artikelverwaltung** | PASS: Anlegen/Bearbeiten, doppelte Artikelnummern verhindert, Barcodekonflikte (auch Barcode = fremde Artikelnummer) abgewiesen, ca. 20 ungültige Eingaben (Zahlen, Gewicht, Pack, Max, negativ, Text, Dezimal-/Kommaformen) abgewiesen. BEFUND: Mindestbestand > Boxkapazität wird gespeichert (F4). |
| **Konfiguration/Tragfähigkeit** | PASS: Buchungen bleiben ohne vollständige Traglastdaten gesperrt; Boxkapazität, Fachlast, Feldlast, Palettentragfähigkeit lösen die jeweiligen Sperren/Warnungen aus. |
| **Lager** | PASS: Wareneingang, Einlagerung in Boxen, Umlagerung, Ausbuchung (nie unter 0), Korrektur (nur mit Grund), QS-Sperre/-Umlagerung, Platzsperren, Bestände nach jedem Schritt konsistent. |
| **Inventur** | PASS: Sollbestand bis zur Zählung verborgen, Ist-Eingabe, Abweichungsanzeige, Buchung erst nach separater Bestätigung (Signaturprüfung), mehrdeutiger Barcode wird nicht zugeordnet und meldet beide Artikel. |
| **Auftragsverwaltung** | Zuteilung, Status, Fortschritt, Start/Pause/Abschluss: PASS. **NICHT-DURCHFÜHRBAR:** Auftrag anlegen, Positionen hinzufügen, Auftrag ändern – in der Oberfläche nicht vorhanden (feste Testaufträge K-1042/1043/1044). |
| **Mobile Kommissionierung** | PASS: Mitarbeiter-/Scannerwahl, Platz- dann Artikelscan, falscher Platz/Artikel/unbekannter/mehrdeutiger Barcode abgewiesen, Mengenänderung mit Abweichung, Stückgewicht- und Gesamtgewicht korrekt (Netto, Tara, Brutto), Toleranzgrenzen, Wiederaufnahme nach Neuladen, Pause, Kommissionierschein. F1 (K-1043) und F3 (keine Auto-Ausbuchung) siehe unten. |
| **Übergänge** | PASS: Daten aus Wareneingang/Umlagerung/Inventur erscheinen korrekt in Kommissionierpositionen; Bestände vor und nach Kommissionierung byte-gleich (s. F3). |

## 4. Prüfung der Datenintegrität

- **Lagerstruktur:** PASS – 22 Regale Halle 4A (3.564 Plätze), 18 Regale Halle 4B (2.916), gesamt 40 Regale / **6.480 Plätze**, je Regal 18 Türme × 9; Platzkennungen `H4A-r-n`/`H4B-r-n` und QR-Zuordnungen nach allen Abläufen, Export, Import und Wiederherstellung unverändert.
- **Export und Wiederimport:** PASS – Daten byte-gleich (Artikel, Boxen, Plätze, QR, Konfiguration, Historie, Inventurprotokolle, Kommissionierdaten).
- **Sicherungsstände:** PASS – maximal 3, jüngster = vorheriger Stand byte-gleich, Datum/Uhrzeit, Hinweis beim Entfernen des ältesten.
- **Wiederherstellung älterer Daten:** PASS – nur nach ausdrücklicher Bestätigung; Abbruch lässt alles unverändert; aktueller Stand wird vorher gesichert.
- **Ausnahmeimport (Barcode-Konflikt):** PASS – Standard „nicht importieren“, getrennte Bestätigung, beide Abbrüche unverändert, Scannersicherheit danach erhalten.
- **Ungültige/beschädigte Dateien:** PASS – 35 Varianten (leer, Binärmüll, abgeschnitten, Typfehler, ungültige Mengen/Plätze/Artikel/Gewichte/Konfiguration/Historie/Kommissionierdaten, Prototype-Pollution, 1e309) werden abgewiesen; Daten und Sicherungsstände byte-gleich. Ausnahme: F2.
- **Zwei-Tab-Konflikte:** PASS – veralteter Tab kann weder buchen noch Artikel/Konfiguration/Inventur schreiben (Lost-Update verhindert), Warnbanner, Kommissionierdaten-Hinweis.
- **Speicherfehler:** PASS – bei vollem Speicher Fehlermeldung, gespeicherter Stand **und** Arbeitsspeicher bleiben unverändert (keine „Geisterbuchung“); danach funktioniert alles wieder.
- **Grenzfälle:** PASS – Historie am Limit 3.000 und Protokolle am Limit 10.000 bleiben buchbar; nach allen Tests Bestände ganzzahlig, ≥ 0, gesperrt ≤ Menge; beschädigte Auftragsdaten sperren den Abschluss.
- **Keine JavaScript-Fehler** in allen Läufen.

## 5. Mobile Testergebnisse (Emulation, keine echten Geräte)

Breiten: 320, 375, 390, 430 px, Tablet 820×1180, Desktop 1440.

| Prüfung | Ergebnis |
|---|---|
| Kein horizontales Scrollen, nichts rechts außerhalb, nichts abgeschnitten (10 Tabs + Mitarbeiteransicht × 6 Größen) | **PASS** |
| Kamerafeld und „Kamera stoppen“ passen in die Breite (Mock) | PASS |
| Zahlen-/Dezimaleingaben (Inventur, Artikel, Konfiguration, Umlagerung, Kommissionierung): `numeric`/`decimal` | PASS; Ausnahme F6 |
| Dezimaleingabe mit Komma | PASS |
| Kommissionierschein als A4-Druck: 1 Seite, alle Daten, Gewichte korrekt (PDF: `docs/ap5final-logs/kommissionierschein-emulation.pdf`) | PASS (Emulation) |
| Touch-Ziele < 40 px | BEFUND gering (F7): „Orte“-Buttons 46×30, Regalfelder 53×31 (162), „Bearbeiten“ 87×30 (Tablet) |
| Text < 11 px | BEFUND gering: „Software Solutions“ (Logo-Zusatz) 10 px |

**Nicht durchführbar (kein Gerät):** iPhone Safari (Layout, Kamera, AirPrint), Android Chrome, Kamera-Erkennung mit echten Etiketten, Handscanner (Tastaturkeil/Enter), Waage und echter Druck. Der frühere iPhone-Druckfix wurde nicht verändert, aber auch **nicht auf einem Gerät erneut verifiziert**.

## 6. Kritische und weniger kritische Fehler

Alle Befunde sind am Stand 53c60f4 reproduzierbar; keine wurde im Anwendungscode korrigiert (nicht freigegeben).

| Nr. | Schwere | Befund | Reproduktion |
|---|---|---|---|
| **F1** | **hoch** | Auftrag mit mehr Positionen als verfügbaren Artikeln (K-1043: 8 Positionen) wird bei jedem Rendern als „repariert“ markiert; bereits gescannte/bestätigte Positionen werden zurückgesetzt – der Auftrag lässt sich nicht fortschreiten. | Lager mit nur 2 Artikeln mit freiem Bestand; K-1043 einem Mitarbeiter zuteilen, anmelden, starten → Meldung „Auftragsdaten waren beschädigt und wurden zurückgesetzt“, `lines=8 items=2`. (Praxistest, Abschnitt 6, **FAIL**) |
| **F2** | mittel | Sicherungsdatei ohne Feld `schema` wird als Altformat (2.5) importiert und verwirft Bestand (alle Boxen), QR-Zuordnungen, Konfiguration, Artikelgewichte/Max; Barcode wird auf Artikelnummer gesetzt. Beide Rückfragen erwähnen das nicht. Vorheriger Stand ist byte-gleich gesichert (wiederherstellbar). | Gültigen Export öffnen, Schlüssel `"schema"` löschen, importieren, beide Rückfragen bestätigen. |
| **F3** | mittel | Kommissionierabschluss bucht keinen Lagerbestand aus (Bestand nach Abschluss byte-gleich). Die Ausbuchung muss separat erfolgen → Differenzgefahr. Im Testmodus laut Oberfläche so vorgesehen; für Praxisbetrieb relevant. | K-1042 komplett kommissionieren und abschließen, Bestand vergleichen. |
| **F4** | mittel | Mindestbestand größer als maximale Boxkapazität wird gespeichert (z. B. max 5, min 9) → dauerhafte Unterbestandswarnung. Kein Datenverlust. | Artikel mit max=5, min=9 speichern → „Artikel gespeichert“. |
| **F5** | mittel (gering bei normalen Bestandsgrößen) | Bei sehr großem Datenbestand (2.000 Artikel, 4.000 Boxen, 3.000 Historie ≈ 1 MB je Stand) scheitert nach 3 Importen das Anlegen des Sicherungsstands (Speicherkontingent). Der Import bricht dabei **sicher ab**, Daten unverändert. | Großbestand importieren, vier Importe nacheinander. |
| **F6** | gering | Mengenfeld im Buchungsformular (`bookQty`) hat kein `inputmode`; auf dem Smartphone erscheint die Text- statt der Zahlentastatur (alle anderen Zahlenfelder korrekt). | Tab „Buchen“ auf iPhone/Android öffnen, Mengenfeld antippen (Emulation: Attribut fehlt). |
| **F7** | gering | Kleine Touch-Ziele (siehe Abschnitt 5) und 10-px-Text im Logo. | – |
| **F8** | gering (Emulation) | Zwei synchron ausgelöste Klicks auf „Buchen“ erzeugen zwei Buchungen (+2 statt +1), da die Bestätigung im Test automatisch erfolgt. Auf echten Geräten blockiert der Bestätigungsdialog (`confirm`) einen zweiten Tipp vermutlich – **nicht geprüft**. | Emulation: `click()` zweimal direkt hintereinander. |

Nicht gefunden: stille Datenverluste bei Fehlschlägen, falsche Artikelzuordnung bei mehrdeutigen Barcodes, negative/ungültige Bestände, falsche Gewichtsberechnung, Lost-Updates durch veraltete Tabs, fehlerhafte Wiederherstellungen.

## 7. Verbleibende Risiken

1. **Keine Echtgeräte-Tests** (iPhone Safari, Android, AirPrint, Kamera, Handscanner, Waage). Größtes Restrisiko für den Praxiseinsatz.
2. **Browser-Speicher:** Alle Daten liegen lokal im Browser (Kontingent, Löschen der Websitedaten, kein Mehrgeräteabgleich). Sicherungsstände liegen im selben Speicher; echte Sicherheit nur durch heruntergeladene JSON-Dateien.
3. **Kommissionierung entkoppelt vom Bestand** (F3) und feste Testaufträge (kein Auftrag anlegen/ändern).
4. **F1** kann im Demobetrieb auftreten, sobald weniger Artikel mit Bestand vorhanden sind als Positionen.
5. Nicht abgedeckt: Mehrbenutzerbetrieb gleichzeitig auf verschiedenen Geräten (nur Tabs im selben Browser), Langzeitverhalten, Performance auf schwachen Geräten.

## 8. Einschätzung der Demo-Reife

- **Geführte Demo am Schreibtisch/mit Emulation: bereit**, wenn der Bestand mindestens so viele Artikel mit freiem Bestand enthält wie die Positionen der gezeigten Aufträge (K-1043 benötigt 8, K-1044 5, K-1042 3) – oder K-1043 nicht gezeigt wird (F1).
- **Demo auf echten Geräten:** bedingt. Vorher je einmal manuell prüfen: iPhone-Druck des Scheins, Kamerascan, Zahlentastatur im Buchungsformular.
- **Produktiver Einsatz:** noch nicht bereit (F1–F3, fehlende Auftragsanlage, keine Echtgeräte-Verifikation).

## 9. Priorisierte Empfehlung für die nächste Entwicklungsphase

1. **F1 beheben** (K-1043/Auftragspositionen bei zu wenigen Artikeln; Reparaturschleife beenden) – klein, Demo-relevant.
2. **Auftragsverwaltung:** Aufträge anlegen/ändern mit mehreren Positionen; danach Kommissionierung auf echten Aufträgen statt aus Bestand abgeleiteten Demo-Positionen.
3. **Kommissionierung ↔ Bestand (F3):** definierter Ausbuchungsablauf (z. B. Bestätigung „Entnahme buchen“ mit Differenzprüfung).
4. **Echtgeräte-Testlauf** (iPhone, Android, AirPrint, Kamera, Handscanner) mit der Checkliste aus den NICHT-DURCHFÜHRBAR-Punkten.
5. **F2:** Import ohne `schema` ausdrücklich als Altformat kennzeichnen (oder ablehnen) und vor dem Verwerfen von Daten warnen.
6. **F4/F6/F7:** Plausibilitätsprüfung Min ≤ Max, `inputmode="numeric"` für `bookQty`, größere Touch-Ziele.
7. Mittelfristig: Speicherstrategie (Kontingent, Hinweis bei knappem Speicher, Sicherungsstände komprimieren).

Alle Code-Korrekturen erst nach gesonderter Freigabe.

---
Dateien: `tests/final/` (lib, praxis, sicherheit, mobil), `docs/ap5final-logs/` (Regressionslogs, Neutest-Logs, Serverbeleg, Beispiel-PDF).

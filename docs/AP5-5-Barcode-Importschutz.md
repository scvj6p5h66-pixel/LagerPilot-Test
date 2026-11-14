# AP5.5 – Barcode-Sicherheit und Importschutz

Branch `feature/ap5-5-barcode-importschutz`, Basis `feature/ap5-4a-abschlusspruefung` @ ea12664. Kein Merge nach `main`/`development`, keine Veröffentlichung.
Alle Tests sind Playwright/Chromium-Emulation. **Echtgeräte-Tests (iPhone Safari, Android, AirPrint, Kamera, Scanner-Hardware) wurden nicht durchgeführt.**

## 1. Geänderte Dateien
| Datei | Änderung |
|---|---|
| `index.html` | Anwendungscode (+46/−5 Zeilen): Dublettenprüfung beim Import, Mehrdeutigkeitsschutz in 5 Scan-Pfaden, Sicherungsstände (Speicher, Oberfläche, Wiederherstellung) |
| `tests/ap55/ap55-barcode-importschutz.js` | neu, 81 Prüfungen |
| `tests/regression-archiv/ap13.js` | 3 Erwartungen wegen der neuen Regel angepasst (siehe Abschnitt 6), 71 → 72 Prüfungen |
| `tests/barcode/ap54a-barcode-zuordnung.js` | als historisch gekennzeichnet (beschreibt Stand ea12664) |
| `docs/AP5-5-Barcode-Importschutz.md`, `docs/ap55-logs/` | Bericht und Logs |
Keine Änderung an `styles/`, Import-/Exportdateiformat, Schema (bleibt 27), Artikeln, Beständen, Boxen, Lagerplätzen, QR-Codes, Aufträgen. Keine Migration.

## 2. Barcode-Sicherheitsmaßnahmen
**Import:** Nach der Formatprüfung (auch für Schema 26 und Altformate) wird geprüft: (a) Barcodes gleich (Groß-/Kleinschreibung ignoriert, wie die Speicherprüfung), (b) Barcode eines Artikels ist zugleich Artikelnummer eines anderen. Bei Treffern wird der Import vor der Rückfrage abgebrochen: keine Sicherung, kein Download, nichts geschrieben, keine Zuordnung. Meldung nennt Barcode, Art (identisch / Schreibvarianten / zugleich Artikelnummer von …) und alle betroffenen Artikelnummern (max. 8 Fälle, dann „… und N weitere“). Leere/fehlende Barcodes zählen nicht. Altdaten im bestehenden Speicher werden nicht angefasst.

**Scans:** Gemeinsame Prüfung „passt der Wert zu mehr als einem Artikel (Artikelnummer oder Barcode, exakt)?“. Bei Mehrdeutigkeit: Warnung mit allen Artikeln, keine Auswahl, keine Änderung:
| Pfad | Verhalten bei Mehrdeutigkeit |
|---|---|
| Inventur-Artikelscan | Artikelfeld bleibt leer, Fehlermeldung, Kamera scannt weiter |
| Bestandssuche | Suchfeld bleibt unverändert, Fehlermeldung |
| Artikelformular | Warnung nennt alle Artikel (Groß-/Kleinschreibung ignoriert, reihenfolgeunabhängig); es wird nichts gespeichert |
| Kommissionierung | Scan abgelehnt („nichts gebucht“), Zeile bleibt offen; auch wenn der Wert zum erwarteten Artikel passt |
| Scanner-Tab | bestand schon, nennt jetzt zusätzlich die betroffenen Artikel |
Eindeutige Barcodes und Artikelnummern werden unverändert verarbeitet (getestet).

## 3. Importsicherung und Wiederherstellung
**Machbarkeit:** `localStorage` (ca. 5 MB je Herkunft, geteilt mit Lager- und Kommissionierdaten). Eine Sicherung = Kopie beider Rohstrings. Daher Limit **3 Stände**. Umsetzung ohne Formatänderung: neuer Schlüssel `lagerpilot_import_backups_v1` (`{v:1,items:[{id,createdAt,source,inventory,picking}]}`); der bisherige Schlüssel `lagerpilot_before_import` und die Datei `lagerpilot-vor-import-DATUM.json` bleiben unverändert (Kompatibilität).
- Jeder Import legt vor dem Schreiben einen datierten Stand ab. Ist die Liste voll, nennt die Importrückfrage ausdrücklich, dass der älteste (mit Datum) entfernt wird; erst nach Bestätigung wird er ersetzt.
- Anzeige unter „Mehr → Sicherungsstände vor Import“: Datum/Uhrzeit, Artikel-/Boxzahl, Größe.
- **Wiederherstellung** nur nach ausdrücklicher Bestätigung (Datum, Umfang, Hinweis auf Ersetzen). Der aktuelle Stand wird vorher selbst als Stand „vor Wiederherstellung“ gesichert. Verweigert bei: gesperrtem Speicher, unlesbarem/ungültigem/leerem Stand, Änderung in einem anderen Tab. Löschen einzelner Stände ebenfalls nur nach Bestätigung.
- Speicher voll / nicht schreibbar: Import bzw. Wiederherstellung wird **vor** jeder Datenänderung abgebrochen, Rollback der Liste.
- Beschädigte Liste: Import wird abgebrochen (nichts überschrieben), Oberfläche bietet „zurücksetzen“ (mit Bestätigung). „Rohdaten sichern“ enthält die Liste.
- Das Anlegen einer Sicherung verändert keine Lager-/Kommissionierdaten (byte-gleich geprüft).
**Restrisiko:** Im ungünstigen Fall liegen Lagerdaten + bis zu 3 Sicherungen + Altschlüssel im selben 5-MB-Kontingent; bei großen Beständen schlägt das Anlegen fehl und der Import wird abgebrochen (sicher, aber ärgerlich). Ein Stand lässt sich dann löschen oder die Datei-Sicherung nutzen.

## 4. Testergebnisse
| Suite | Ausgang | Jetzt |
|---|---|---|
| Kern-Regression | 1.172 / 0 | **1.173 / 0** (ap13 +1) |
| Import/Export (AP5.4) | 74 / 0 | 74 / 0 |
| AP5.3b | 1.051 / 0 | 1.051 / 0 |
| AP5.1 / AP5.2 / zwei-tabs / Diagnose / ap7e | 77 / 238 / 12 / 18 / 66 | unverändert, 0 FAIL |
| **AP5.5 neu** | – | **81 / 0** |
Gesamt 2.709 PASS (Regressionssuiten) + 81 neu, 0 FAIL. Der neue Test gegen den Vorgängerstand ea12664: 29 PASS / 33 FAIL (`docs/ap55-logs/ap55-test-gegen-ea12664.log`) – er trennt neu von alt.
Abgedeckt: eindeutige Barcodes, exakte/normalisierte Dubletten, Barcode = fremde Artikelnummer, Schema 26 mit/ohne Dublette, 10 Gruppen (Kürzung), Zielspeicher mit Alt-Dubletten, beschädigte Dateien (4 Arten), Mehrfachimporte inkl. voller Liste, Wiederherstellung (abgebrochen/bestätigt), Löschen, beschädigte Einträge/Liste, Speicherlimit, Altschlüssel, Rohdaten-Download, Zwei-Tab, Scans in 5 Pfaden, Kommissionierung.

## 5. Altdatenkompatibilität – KONFLIKT, bitte entscheiden
Die neue Importregel blockiert Sicherungen, die Barcode-Mehrdeutigkeiten enthalten. Solche Dateien können real existieren (Schreibvarianten waren vor SA-12b anlegbar). Nachweis im eigenen Test-Seed: Der ap13-Export enthält A1 „BC1“ / L2 „bc1“ und L5 mit Barcode „A3“ (= Artikelnummer A3) → wird jetzt blockiert. Ich habe die Regel wie beauftragt „vorläufig“ umgesetzt. Ohne Bereinigung der Quelle lässt sich eine solche Datei nicht mehr importieren.
**Vorschlag (nicht umgesetzt, braucht Freigabe):** zweistufig – Standard bleibt Blockade. Zusätzlich im Importdialog eine zweite, deutlich formulierte Bestätigung „Sicherung enthält mehrdeutige Barcodes: A1/L2 … Trotzdem importieren? Scans dieser Barcodes bleiben gesperrt, bis der Artikelstamm bereinigt ist.“ Das ist jetzt vertretbar, weil mehrdeutige Scans geschützt sind. Alternativ: Blockade nur für exakte Dubletten, Schreibvarianten nur als Warnung. Bitte wählen.

## 6. Geänderte Testerwartungen (nicht abgeschwächt)
ap13 #7 „Import des Exports (Altdaten)“: erwartet nun Blockade mit Nennung von A1, L2, L5 und leerem Speicher; zusätzlich neue Prüfung, dass derselbe Export nach Bereinigung der beiden Barcodes byteweise gleich importiert wird. ap13 #4 „Scan BC1 im frischen Zustand“: erwartet jetzt die Mehrdeutigkeitswarnung mit A1 **und** L2 (statt nur A1). Beide Änderungen folgen zwingend aus den freigegebenen Anforderungen.

## 7. Verbleibende Risiken
1. Altdaten-Konflikt (Abschnitt 5) offen bis zur Entscheidung.
2. Bereits im Speicher vorhandene Dubletten (nicht per Import) bleiben bestehen; sie werden nur gemeldet, nicht korrigiert (wie gefordert).
3. localStorage-Kontingent (Abschnitt 3); Sicherungsstände sind browserlokal und gehen mit gelöschten Browserdaten verloren, die Download-Datei bleibt der verlässliche Weg.
4. Scan-Vergleich bleibt exakt (groß/klein unterscheidend); Schreibvarianten sind für Scans eindeutig, im Artikelformular aber als mehrdeutig gewarnt.
5. Echtgeräte-Tests offen.

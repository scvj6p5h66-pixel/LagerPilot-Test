# AP5.5a – Altdatenkompatibler Import mit kontrollierter Ausnahme

Branch `feature/ap5-5a-altimport`, Basis `feature/ap5-5-barcode-importschutz` @ d38a300. Kein Merge nach `main`/`development`, keine Veröffentlichung.
Alle Tests sind Playwright/Chromium-Emulation. **Echtgeräte-Tests (iPhone Safari, Android, AirPrint, Kamera, Scanner-Hardware) wurden nicht durchgeführt.**

## 1. Geänderte Dateien
| Datei | Änderung |
|---|---|
| `index.html` | Anwendungscode, **nur der Importablauf** (netto 4 Zeilen gegenüber AP5.5, siehe Abschnitt 2) |
| `tests/ap55a/ap55a-altimport.js` | neu, 81 Prüfungen |
| `tests/ap55/ap55-barcode-importschutz.js` | Erwartungen der Konflikt-Importe auf „ohne Ausnahmebestätigung blockiert“ umgestellt (81 Prüfungen, gleiche Anzahl) |
| `tests/regression-archiv/ap13.js` | #7 (Import des Altdaten-Exports) zurück auf die ursprüngliche Aussage „akzeptiert, Artikel byteweise gleich“, jetzt nach bestätigtem Ausnahmeimport; zusätzlich Nachweis, dass derselbe Export nach Bereinigung ohne Ausnahme importiert wird |
| `tests/articles/sa12c-zwei-tabs.js` | Szenario 5 an die neue Abbruchregel angepasst (siehe Abschnitt 4), +2 Prüfungen |
| `tests/regression-archiv/run_regression_ap54.sh` | ap55 und ap55a aufgenommen |
| `docs/…`, `docs/ap55a-logs/` | Bericht, Logs |
Unverändert: `styles/`, Importformat, Schema 27, Artikel, Bestände, Boxen, Lagerplätze, QR-Codes, Aufträge, Gewichtskontrolle, Drucklayout, Scan-Pfade aus AP5.5. Keine Migration, keine Gewichtsobergrenze.

## 2. Ablauf
**Normaler Import (ohne Barcode-Konflikt):** Datei prüfen (Format/Struktur) → normale Importrückfrage → Zwei-Tab-Prüfung → Sicherung des bisherigen Stands (Liste, Altschlüssel, Datei) → Schreiben → Neuladen. Genau **eine** Rückfrage.

**Ausnahmeimport (strukturell gültige Datei mit Barcode-Mehrdeutigkeit):**
1. Datei prüfen. Strukturell ungültig → gesperrt wie bisher, **keine** Ausnahmefrage.
2. Alle Konflikte werden vollständig ermittelt (exakte Dubletten, Schreibvarianten, Barcode = fremde Artikelnummer) und in einer **separaten, ausdrücklichen Rückfrage** genannt („ACHTUNG: MEHRDEUTIGE BARCODES …“ mit Barcode, Art, Artikelnummern; max. 8, dann „… und N weitere“). Text: nichts wird geändert, zusammengeführt oder gelöscht; Scans bleiben gewarnt. Standard = nicht importieren; „Abbrechen“ → Meldung „nicht bestätigt, nichts verändert“.
3. Danach die **normale Importrückfrage** (unverändert; bei voller Liste mit Hinweis auf Entfernung des ältesten Standes).
4. Zwei-Tab-Prüfung, Sicherung, Schreiben wie oben. Der Abschlussdialog weist auf die mehrdeutigen Barcodes hin.
Nichts wird vor Abschluss aller Rückfragen und der erfolgreichen Sicherung verändert.

## 3. Verhalten bei Abbruch und Speicherfehlern
| Fall | Ergebnis (getestet, Lager-/Kommissionier-/Sicherungsdaten byte-gleich) |
|---|---|
| Abbruch der Ausnahmefrage | nichts verändert, kein Download, keine Sicherung |
| Ausnahme bestätigt, normale Importfrage abgebrochen | nichts verändert, kein Download, keine Sicherung |
| Sicherungsliste nicht schreibbar (Speicher voll) | Import abgebrochen, Meldung |
| Altschlüssel nicht schreibbar | Import abgebrochen, Liste zurückgerollt |
| Schreiben der Lagerdaten schlägt fehl | Rückstellung, Meldung „Import fehlgeschlagen; bisherige Daten wiederhergestellt“ |
| Sicherungsliste beschädigt | Import abgebrochen, nichts überschrieben |
| Änderung in anderem Tab während der Rückfrage | sicherer Abbruch (normaler und Ausnahmeimport), keine Sicherung, Änderung aus Tab 2 bleibt erhalten |
| beschädigte/ungültige Dateien (7 Arten, auch mit gleichzeitigem Barcode-Konflikt) | gesperrt, keine Ausnahmefrage |

## 4. Fachliche Korrektur der Zwei-Tab-Regel
Bisher fragte der Import nur und ersetzte auch neuere Änderungen eines anderen Tabs „bewusst“ (alter Test `sa12c-zwei-tabs` Szenario 5). Auftrag AP5.5a verlangt sicheren Abbruch. Umgesetzt: Prüfung **nach** den Rückfragen (die Rückfrage blockiert den Tab, während ein anderer Tab ändern kann), mit kurzer Event-Loop-Pause (60 ms), damit Chromium eine gleichzeitige Schreibänderung eines anderen Tabs sicher sichtbar macht (ohne diese Pause las der Import in Tests den veralteten Wert). Der alte Test prüft jetzt: veralteter Tab wird abgebrochen (nichts verändert), nach Neuladen ersetzt der Import den Stand wie zuvor und sichert die A-Änderung. Wer bewusst überschreiben will, lädt die Seite neu.

## 5. Testergebnisse (Basis d38a300 → jetzt, alle 0 FAIL)
| Suite | Ausgang | Jetzt |
|---|---|---|
| Kern-Regression | 1.173 | 1.173 |
| Import/Export | 74 | 74 |
| AP5.3b | 1.051 | 1.051 |
| AP5.5 | 81 | 81 |
| **AP5.5a neu** | – | **81** |
| AP5.1 / AP5.2 / Diagnose / ap7e | 77 / 238 / 18 / 66 | unverändert |
| zwei-tabs | 12 | 13 |
Gesamt: **2.872 PASS / 0 FAIL** (`docs/ap55a-logs/`). Hinweis zur Nachvollziehbarkeit: ap13 lief im Gesamtlauf mit einer noch fehlerhaften Testerwartung (Dialogtexte gehen durch das Neuladen verloren; Log `ap13_vor_Korrektur_der_Testerwartung.log`, 72/1) und wurde nach Korrektur einzeln wiederholt (72/0). `index.html` blieb dazwischen unverändert.
Der neue Test deckt ab: normaler Import, exakte Dubletten, Schreibvarianten, Barcode = fremde Artikelnummer, Schema 26, beide Abbrüche, erfolgreichen Ausnahmeimport, Datenintegrität, Scanner-Sicherheit (Inventur, Bestandssuche, Artikelformular, Scanner-Tab, Kommissionierung inkl. eindeutiger Barcodes), 7 ungültige Dateiarten, 4 Speicherfehler, Zwei-Tab (beide Importarten), vier wiederholte Importe mit Listenlimit und Wiederherstellung eines Ausnahme-Stands. Der Vergleichslauf gegen d38a300 (Teilprotokoll) zeigte bereits Fehlschläge bei den ersten Konfliktprüfungen und brach dann ab, weil dort die Dialoge fehlen; er ist nur ein Indiz, kein vollständiger Nachweis.

## 6. Nachweis der Datenintegrität
- Nach Ausnahmeimport sind `items, boxes, places, qrMap, config, history, inventoryLogs` byte-gleich zur Importdatei (kein Korrigieren, Zusammenführen oder Löschen; die Dublette bleibt bestehen).
- Bei jedem Abbruch/Speicherfehler sind Lager-, Kommissionier- und Sicherungsdaten byte-gleich zum Zustand davor.
- Der Vorstand liegt nach jedem Import byte-gleich in der Sicherungsliste und als Datei vor; Wiederherstellung (auch eines Ausnahme-Stands) stellt ihn byte-gleich her.
- Scans verändern keine Lagerdaten.

## 7. Verbleibende Risiken
1. Nach einem Ausnahmeimport bleiben die Dubletten bestehen; mehrdeutige Barcodes sind für Scans und Kommissionierung unbenutzbar, bis der Artikelstamm bereinigt ist (bewusst).
2. Die 60-ms-Pause ist eine pragmatische Absicherung gegen verzögerte Sichtbarkeit von localStorage-Schreibvorgängen anderer Tabs; ein Rest-Zeitfenster zwischen Prüfung und Schreiben bleibt prinzipbedingt (kein atomarer Vergleich-und-Schreibe in localStorage).
3. Sicherungsstände sind browserlokal (max. 3, ca. 5-MB-Kontingent).
4. Zwei-Tab-Verhalten wurde fachlich verschärft (Abschnitt 4): wer in einem veralteten Tab importiert, muss zuerst neu laden.
5. Echtgeräte-Tests offen.

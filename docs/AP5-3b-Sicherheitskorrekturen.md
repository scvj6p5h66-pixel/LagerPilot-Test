# AP5.3b – Sicherheitskorrekturen und mobile Optimierung

Ausgangsbasis: `feature/ap5-3-mobile-sicherheit`, Commit `1c01db1`. Neuer Branch: `feature/ap5-3b-sicherheitskorrekturen`.
`main` (05b614df) und `development` (9b6115a) unverändert. Kein Merge, keine Veröffentlichung.

## 1 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `index.html` | S1–S4 (Zeilen: Hilfsfunktionen `readQty`/`qtyNum`/`overloadedBoxes`, Eingabefelder, Kommissionier-Handler, `cfgSave`, Artikelzeilen) |
| `styles/01-basis.css` | +17 Zeilen: Kartenansicht der Artikeltabelle unter 600 px |
| `tests/mobile/ap53b-sicherheitskorrekturen.js` | neu, gezielte Tests S1–S4 (1051 Prüfungen) |
| `docs/ap53b-logs/` | Logs der Läufe |
| `docs/AP5-3b-Sicherheitskorrekturen.md` | dieser Bericht |

Keine Datenmigration, keine Änderung an Speicherformat, Import/Export, Scanner, Kamera, Gewichtskontrolle, Kommissionierschein/Druck.

## 2 Umsetzung

**S1 – Dezimalfehler (1,5 → 15).** Ursache: `type=number`-Felder liefern je nach Browser/Tastatur `15` für getipptes `1,5`. Alle zehn betroffenen Felder sind jetzt `type=text` mit `inputmode` (`decimal` bzw. `numeric`) und werden mit der strengen, bereits vorhandenen Prüfung (`parseNumField`) gelesen:
- Kommissionierung: Palettengewicht, Boxgewicht, gemessenes Gewicht, Toleranz, Stückgewicht je Position (Dezimal: `1,5` und `1.5` → 1,5), Istmenge je Position (nur ganze Zahlen).
- Lagerverwaltung: Buchungsmenge, Inventurmenge, Umlagerungsmenge, Stück pro Pack (nur ganze Zahlen; Bestandskorrektur erlaubt weiterhin ein Minus).
- Abgewiesen mit verständlicher Meldung, ohne Änderung der gespeicherten Daten: `1e999`, `--`, `1e`, `abc`, `1,5,5`, `1.234,5`, `1,`, `-5`, Leerzeichen in der Zahl; bei Stückzahlen zusätzlich `1,5`/`1.5`. Toleranz über 100 % wird weiterhin abgewiesen. Die Prüfung läuft im Änderungs-Handler bzw. unmittelbar im Speichern-/Buchen-Klick, vor jeder Datenänderung. Nach Ablehnung zeigt das Feld wieder den gespeicherten Wert. Die fachliche Toleranz und die Gewichtsberechnung sind unverändert. Das Scanner-Eingabefeld ist unverändert `type=text`.

**S2 – Löschschutz.** Das Leeren von Palettengewicht, Boxgewicht, gemessenem Gewicht oder Toleranz mit vorhandenem Wert fragt zuerst: „Gespeicherten Wert entfernen? … Abbrechen behält den Wert.“ Bei Palette/Box erwähnt die Rückfrage, dass das gemessene Gewicht ebenfalls zurückgesetzt wird. Abbruch: Wert unverändert, Speicher byte-gleich, Feld zeigt wieder den Wert. Bereits leere Felder und Neueingaben laufen ohne Rückfrage. Stückgewicht und Istmenge je Position lassen sich weiterhin nicht leeren.

**S3 – Lastreduzierung.** `overloadedBoxes()` verwendet die bestehende Rechenregel von `loadCheck` (Boxgewicht = Menge × Packgewicht + Leergewicht, je Box gegen Fachlast, Palettentragfähigkeit, Feldlast). Beim Speichern der Lastparameter erscheint eine Warnung, wenn durch die Änderung Boxen neu über eine Grenze kommen (auch bei Erhöhung des Leergewichts). Sie nennt Platz, Artikel, Menge, Boxgewicht und die überschrittene Grenze (bis 5 Boxen, dann „und n weitere“), und dass nichts verändert wird. Abbruch: alte Konfiguration bleibt. Bestätigung: es wird nur der Parameter gespeichert; Boxen, QR-Zuordnungen, Plätze, Artikel bleiben byte-gleich. Keine Warnung bei Absenkung ohne Überschreitung, bei Erhöhung und bei bereits vorher überlasteten Boxen, wenn ein anderer Parameter geändert wird. Boxen ohne bekanntes Artikelgewicht sind nicht prüfbar und werden nicht gemeldet. Keine neue Gewichtsgrenze für Artikel.

**S4 – Mobile Artikelkarten.** Unter 600 px (reines CSS, `:has()`) wird jede Zeile der bestehenden Artikeltabelle zur Karte: Bezeichnung und Artikelnummer, **Bestand** (Summe der vorhandenen Boxen, bei Packartikeln „84 Stück (7 Pack)“), Einheit, Pack/Max., Gewicht und rechts der Bearbeiten-Button (mindestens 44 × 44 px, zum Test 99 × 44). Es gibt keine zweite Datenquelle: dieselben Zeilen, der Bestand wird aus `state.boxes` berechnet. Die Bestandszeile ist am Desktop ausgeblendet; Tabelle ab 601 px identisch zum Ausgangsstand. Die Artikelverwaltung besitzt keine Such- oder Filterfunktion, daher ist dazu nichts zu prüfen.

## 3 Testergebnisse

| Prüfung | Ergebnis |
|---|---|
| Neue Tests S1–S4 (`ap53b-sicherheitskorrekturen.js`) | **1051 PASS / 0 FAIL** |
| Vollständige Regression (16 Suiten) | **1143 PASS / 21 FAIL – identisch zum Ausgangsstand, Fehlerlisten Suite für Suite gleich, kein neuer Fehler** |
| AP5.1 | 77/77 |
| AP5.2 | 238/238 |
| Zwei-Tab-Test | 12/12 |
| AP5-Diagnose | 18/0, 0 Befunde |
| ap7 Edit-Modus | 56/9 (unverändert, bekannte Testabläufe) |
| Kommissionierschein/Druck (sa15), Portal, Artikel (sa12c), Äquivalenz | 81 / 126 / 43 / 85, alle ohne Fehler |
| Import/Export | durch sa15 (Export/Import), sa12c und die Datenintegritätsprüfungen der Suiten abgedeckt |

Neue Tests im Einzelnen: vier Gebietsschemata (de-DE, de-CH, en-US, fr-FR), Desktop und iPhone 14; 6 Kommissionierfelder × 11 Eingaben, Leeren mit Abbruch/Bestätigung; 4 Mengenfelder; Lastwarnung in 5 Varianten plus Gegenproben; Kartenansicht bei 320, 360, 375, 390, 414, 430, 600 px und Desktop 601–1400 px im Direktvergleich mit dem Ausgangsstand.

Während der Arbeit zeigten zwei alte Tests (ap10, ap14) Textabweichungen meiner neuen Fehlermeldungen. Die Meldungen wurden an den bisherigen Wortlaut angeglichen (ap10 46/0, ap14 72/9 wie vorher); die Tests selbst blieben unverändert.

Die 21 bekannten Testfehler (ap9 ×7, ap11 ×1, ap12 ×2, ap13 ×1, ap14 ×9, ap16 ×1) sind unverändert und gehören zur späteren Testpflege.
Die Analysetests aus AP5.3 (`tests/mobile/ap53-*.js`) beschreiben den Ausgangsstand und sind durch die neuen Tests ersetzt; sie werden nicht mehr gepflegt.

## 4 Datenintegrität

Abgelehnte Eingaben: Speicher vor/nach byte-gleich (Kommissionierdaten, Lagerdaten), geprüft je Feld und Locale. Lastwarnung: Boxen, QR-Zuordnungen, Plätze, Artikel byte-gleich, `valid()` besteht. Kartenansicht: Daten vor/nach dem Rendern und dem Öffnen von „Bearbeiten“ unverändert. Keine Migration, keine automatische Korrektur vorhandener Daten.

## 5 Mobile Darstellung

Bei allen geprüften Breiten ab 320 px: Alle Bearbeiten-Buttons vollständig im Bild, mindestens 44 × 44 px, keine Überlappung, kein seitlicher Überlauf, Bestand sichtbar, Bearbeiten öffnet das Formular. Desktop (601–1400 px): Zeilenhöhe, Buttongröße und Spaltenbreiten identisch zum Ausgangsstand. Screenshots wurden nicht neu erstellt; der CSS-Vorschlag aus AP5.3 ist die Grundlage.

## 6 Verbleibende Risiken

1. **Echte Geräte nicht getestet:** Deutsches/englisches iPhone, Android, Kamera, Handscanner, AirPrint. Die Prüfumgebung ist Chromium mit Emulation; das Verhalten der Bildschirmtastatur (`inputmode`, Komma-Taste) muss auf den Geräten geprüft werden. Mit Textfeldern erscheint auf manchen Geräten statt der Zahlentastatur die Dezimaltastatur; ein Dezimalkomma wird akzeptiert, nicht verfälscht.
2. Bestandskorrektur in der Buchung hat bewusst keinen `inputmode` (Minus-Zeichen nötig); auf dem iPhone erscheint die normale Tastatur.
3. Kartenansicht benötigt `:has()` (iOS Safari ≥ 15.4, Chrome ≥ 105); ältere Browser behalten die scrollbare Tabelle (Bearbeiten nur durch Wischen erreichbar).
4. Die Lastwarnung ist eine Rückfrage beim Speichern; ein dauerhafter Hinweis auf der Startseite ist nicht umgesetzt (im Auftrag nicht verlangt). Überlastete Boxen bleiben bis zu einer manuellen Klärung bestehen.
5. Weiterhin keine Gewichtsobergrenze (bewusst).
6. Gespeicherte Altwerte werden nicht umgewandelt; ein als Text gespeichertes `"1,5"` in alten Kommissionierdaten wird weiter als „fehlt“ behandelt (unverändert).
7. Die 21 bekannten Testfehler bestehen weiter.

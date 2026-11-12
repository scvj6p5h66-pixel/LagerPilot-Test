# SA-15 Nachbesserung – Testbericht

Branch `feature/kommissionierschein-abschluss` · Basis `325579b` · Prüfdatum 12.11.2026 (Chromium/Playwright, Emulation iPhone 14 / iPad Pro 11, A4-PDF über `page.pdf`)

## Änderungen
1. **Seitenumbruch:** Gewichtskontrolle, Unterschriftenbereich und Fußzeile bilden einen zusammenhängenden Block (`.slip-end`, nicht teilbar). Die Unterschriften stehen nie allein auf einer Seite. Dabei wurde zusätzlich ein Randfall behoben (bei 13 Positionen lag nur die Fußzeile allein auf Seite 2).
2. **Abstand:** Zwischen Gewichtskontrolle und Unterschriften von 16 mm auf 9 mm (Druck: 14 mm auf 8 mm) reduziert.
3. **Rechter Rand:** Ränder der Rahmen wurden im PDF am rechten Rand angeschnitten; mit 2 px Sicherheitsabstand behoben.
4. Design, Branding, Artikeltabelle, Mengenabweichungen, Bemerkungen und Gewichtskontrolle sind inhaltlich und gestalterisch unverändert.

## Ergebnisse (PASS/FAIL)
| Prüfung | Ergebnis |
|---|---|
| Kurzer Auftrag: genau 1 A4-Seite (6 und 5 Positionen) | PASS |
| Langer Auftrag, 100 Positionen: A4, 11 Seiten (mit sehr langen Namen), alle 100 Positionen vollständig, Tabellenkopf auf jeder Seite | PASS |
| Letzte Seite enthält Gewichtskontrolle **und** Unterschriften; Unterschriften genau einmal | PASS |
| Schleife 1–130 Positionen (Schritt 1, ab 40 Schritt 3): Unterschrift nie allein, alle Positionen vorhanden (max. 4 Seiten bei normalen Namen) | PASS |
| Keine abgeschnittenen Tabellen/Unterschriften (Sichtprüfung PDF) | PASS |
| Seitenzahlen „Seite x von y“ korrekt (Chromium-PDF) | PASS |
| PDF-Erstellung | PASS |
| Mobile Vorschau iPhone 14 / iPad Pro 11 (Emulator): Dialog, Vorschau, Nachdruck, Tap-Ziele ≥ 44 px, kein Seitenüberlauf | PASS |
| Druck und 5× Nachdruck verändern weder Auftrags- noch Lagerdaten (byte-identisch) | PASS |
| SA-15-Testsuite gesamt | **81/81 PASS** |
| Regression: SA-12c 78/78, Basis 59/59, ap1c 25/25, Aufträge/Kommissionierung 88/88, SA-05 62/62, SA-06 46/46, SA-14-Äquivalenz 85/85 | PASS |
| Regression mit bekannten Altfehlern (ap9 7, ap11 1, ap12 2, ap13 1, ap14 11, ap16 4): FAIL-Listen identisch zu SA-14 | unverändert, keine neuen Fehler |

## Nicht geprüft – nicht als bestanden gemeldet
- **Echter AirPrint-Druck** (iPhone/iPad) – nicht durchgeführt.
- **Automatischer Druck direkt aus Safari** (`window.print()` nach Abschluss) – nicht durchgeführt; im Test wird `window.print` nur ersetzt und gezählt.
- Echtes Seitenumbruchverhalten von Safari/WebKit (die Seitenumbruchprüfung erfolgte mit Chromium; „Seite x von y“ kann in Safari fehlen).
- Reale Drucker, Kamera/Scanner, echte Geräte außer dem bereits gemeldeten Öffnen der PDF-Datei auf dem iPhone.

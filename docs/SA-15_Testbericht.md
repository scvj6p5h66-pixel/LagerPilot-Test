# SA-15 – Kommissionierschein und Auftragsabschluss: Testbericht

Branch `feature/kommissionierschein-abschluss` · Basis: SA-14 (8224daa) + Konzept (f6403f4) · Prüfdatum 12.11.2026
Geprüft mit Playwright (Chromium, Emulation iPhone 14 / iPad Pro 11), A4-PDF über `page.pdf`. Echte Drucker, Safari/iOS-AirPrint und echte Geräte wurden **nicht** geprüft.

## Umgesetzt
- **Abschlussansicht** (Dialog) nach erfolgreichem Abschluss, aus Mitarbeiter- und Admin-Pfad: Auftrag, Abschlusszeit, Mitarbeiter, Scanner/Gerät, Positionen, Soll/Ist-Menge, Abweichungen (Freigabestatus), erwartetes/gewogenes Gewicht, Differenz, Ergebnis der Gewichtskontrolle. Buttons: Drucken, Schein ansehen (Vorschau), Schließen.
- **Abschluss-Sperre** zentral in `pickComplete`: ohne bestandene Gewichtskontrolle (nicht bestanden, Waagenwert/Toleranz/Gewichte fehlen) oder ohne freigegebene Mengenabweichung kein Abschluss, auch nicht bei direktem Aufruf.
- **A4-Kommissionierschein** (IntraBold-/LagerPilot-Branding) mit allen Feldern aus dem Konzept; fehlende Angaben erscheinen als „–“, nichts wird ergänzt. Gewichtskontrolle mit drei Ergebnissen: BESTANDEN / NICHT BESTANDEN / NICHT GEPRÜFT. Vorläufiger Schein klar als „VORLÄUFIG – NICHT ABGESCHLOSSEN“ gekennzeichnet.
- **Druck**: automatisch nach Abschluss, Nachdruck aus Abschlussansicht und Auftragsliste, mehrseitig (Tabellenkopf wiederholt, Zeilen nicht geteilt, „Seite x von y“), nur der Schein im Druck.
- Neue optionale Felder am Auftrag: `completion {at, assignee, device}` (beim Abschluss festgehalten) und `note` (Bemerkung, max. 500 Zeichen, Eingabefeld in der Mitarbeiteransicht). Alte Aufträge und Sicherungen ohne diese Felder funktionieren unverändert.
- Der Druck-/Anzeigecode verändert keine Daten und ruft weder `pickSave` noch eine Lagerbuchung auf.

## Neue Tests (`tests/pick/sa15-kommissionierschein.js`): 76/76 PASS
| Bereich | Ergebnis |
|---|---|
| 1 Vollständiger Auftrag, erfolgreiche Gewichtskontrolle, Abschlussansicht, Auto-Druck (1×), Lagerdaten unverändert | PASS (12) |
| 2 Fehlerhafte Gewichtskontrolle (zu hoher Wert, fehlender Wert, fehlende Toleranz), UI-/Admin-/Direktaufruf verweigert, Schein „NICHT BESTANDEN/NICHT GEPRÜFT“ | PASS (9) |
| 3 Europalette, kleine Einwegpalette, tariert/Brutto | PASS (5) |
| 4 100 Positionen mit langen Namen: A4, 10 Seiten, alle 100 Positionen, Tabellenkopf je Seite, Seitennummern | PASS (9) |
| 5 Fehlende Angaben, Altauftrag ohne Positionen, nichts erfunden | PASS (5) |
| 6 5× Nachdruck: Kommissionier- und Lagerdaten byte-identisch | PASS (5) |
| 7 Mengenabweichung ohne/mit Freigabe | PASS (5) |
| 8 Bemerkung, Maskierung von HTML/Sonderzeichen (kein Skript ausgeführt) | PASS (5) |
| 9 iPhone 14 / iPad Pro 11: Dialog passt, kein Überlauf, Tap-Ziele 48/60 px, Vorschau, Nachdruck; kurzer Auftrag = 1 A4-Seite | PASS (15) |
| 10 Export/Import mit `completion`/`note`; Sicherung im alten Format importierbar | PASS (5) |
| 11 Platzhalter der Designvorschau (AU-2026-001458, Max Mustermann, 71,40) nirgends | PASS (1) |

## Regression (frischer Stand dieses Branches)
Artikelverwaltung SA-12c 78/78 · Basis/Backup/Kommissionierdaten 59/59 · ap1c 25/25 · Aufträge/Kommissionierung ap2 88/88 · SA-05 62/62 · SA-06 46/46 · SA-14-Äquivalenz 85/85. Suiten mit **bekannten Altfehlern** (ap9 7, ap11 1, ap12 2, ap13 1, ap14 11, ap16 4): FAIL-Listen identisch zu SA-14, keine neuen Fehler. Import/Export, Lagerbuchungen und Artikelverwaltung: keine Abweichung.

## Bekannte Einschränkungen
1. **Designvorlage**: Die freigegebene Chat-Vorschau lag nicht vor. Layout nach Konzept-Feldliste und IntraBold-Branding; Feinabgleich mit der Vorlage steht aus.
2. **Kein Barcode/QR-Code** auf dem Schein (Konzept: nur wenn technisch zuverlässig und ohne externen Dienst; keine QR-Bibliothek eingebunden).
3. Keine Angaben zu Kunde/Bereich, Priorität, Auftragstyp, Maßen/Volumen, Packstückzahl: im Datenmodell nicht vorhanden.
4. **Scanner/Gerät** wird erst ab diesem Stand beim Abschluss gespeichert; ältere Aufträge zeigen „–“.
5. **Kein Abschluss mit Gewichtsabweichung per Freigabe**: Eine unzulässige Gewichtsabweichung blockiert den Abschluss vollständig (konservative Auslegung des Konzepts; eine „berechtigte Freigabe“ gibt es nur für Mengenabweichungen). Falls gewünscht: eigene fachliche Entscheidung.
6. Bei 100 Positionen mit sehr langen Namen steht die Unterschriftszeile allein auf der letzten Seite.
7. „Seite x von y“ nutzt CSS-Seitenrandboxen (Chromium); Safari zeigt sie ggf. nicht. Automatischer Druck nutzt `window.print()`; Verhalten auf iOS (AirPrint) nicht geprüft.
8. Toleranz bleibt der bestehende „vorläufige Testwert“ des Auftrags (keine feste Vorgabe).
9. Die Kommissionierung bleibt Demo-Modul ohne Bestandsbuchung (unverändert).

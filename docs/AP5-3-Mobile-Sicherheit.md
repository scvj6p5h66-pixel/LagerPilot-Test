# AP5.3 – Abschlussregression und mobile Sicherheit (reine Analyse)

Ausgangsbranch: `feature/ap5-2-zahlenfelder`, Commit `076b039`. Neuer Branch: `feature/ap5-3-mobile-sicherheit`.
**Der Anwendungscode (`index.html`, `styles/`) ist unverändert.** Neu sind nur Analysetests, ein CSS-Vorschlag (nicht eingebunden) und Dokumentation. `main` (05b614df) und `development` (9b6115a) unverändert. Kein Merge, keine Veröffentlichung, keine neue Gewichtsobergrenze.

## 1 Vollständige Regression auf dem unveränderten Ausgangsstand (076b039)

| Suite | PASS / FAIL | | Suite | PASS / FAIL |
|---|---|---|---|---|
| ap1 | 59/0 | | ap13 | 66/1 |
| ap1c | 25/0 | | ap14 | 72/9 |
| ap2 | 88/0 | | ap15 | 78/0 |
| ap8 | 62/0 | | ap16 | 53/1 |
| ap9 | 44/7 | | equiv | 85/0 |
| ap10 | 46/0 | | sa15 | 81/0 |
| ap11 | 172/1 | | portal | 126/0 |
| ap12 | 43/2 | | sa12c | 43/0 |

**Summe: 1143 PASS / 21 FAIL – identisch mit AP5.2, kein neuer Fehler.** Dazu: AP5.1-Gewichtstest 77/0, AP5.2-Zahlenfeldtest 238/0, Zwei-Tab-Test 12/0, AP5-Diagnose 18/0 (0 Befunde), ap7-Edit-Modus 56/9 (bekannte Testabläufe). AP5.1 und AP5.2 sind damit vollständig erhalten. Logs: `docs/ap53-logs/`.

Die 21 bekannten Fehler (Nummern wie im AP5-Bericht, alle Kategorie A = veralteter/fehlerhafter Test):

| # | Suite | Prüfung | Ursache |
|---|---|---|---|
| 1–7 | ap9 | v2.7 mit Fachlast 800/600/null: bleibt unverändert, Einlagern möglich/gesperrt, Ausbuchen | Test-Seed mit `places:{}` und Box, `valid()` lehnt ab → Sperre/Quarantäne |
| 8 | ap11 | „5 Artikel ohne Gewicht: Zählung 51 abgelehnt“ | Testartikel hat Gewicht 2 |
| 9, 10 | ap12 | Barcode-Hinweistexte | Wortlaut geändert |
| 11 | ap13 | „gehört bereits zu A1“ | Legacy-Dublette `bc1`, erster Treffer L2 |
| 12–13 | ap14 | Bezeichnung 151/5000 Zeichen | Regex case-sensitiv |
| 14–15 | ap14 | Nummer „a1“/„aB1“ doppelt | Wortlaut „existiert bereits“ |
| 16 | ap14 | Artikelnummer reserviert | Altartikel `toString` im Seed, Dublette zuerst |
| 17, 19, 20 | ap14 | Min > Max abgelehnt | Regel in SA-12c bewusst entfernt |
| 18 | ap14 | Home nennt „LM“ | Home zeigt nur Anzahl |
| 26 | ap16 | Edit-Modus + Import | Test ohne Dialog-Handler, Import abgebrochen |

(Behoben seit AP5: #21/#22 in AP5.1, #23–25 in AP5.2.) Neue Fehler: keine.

## 2 Kommissionierung und Mengenfelder: mobile Eingaben

Test `tests/mobile/ap53-kommissionier-eingaben.js`: vier Gebietsschemata (de-DE, de-CH, en-US, fr-FR), je Desktop und iPhone-14-Emulation, getippt per Tastatur. **268 PASS / 0 FAIL / 112 Befunde.**

Geprüfte Felder: Palettengewicht, Boxgewicht, Messwert, Toleranz, Stückgewicht je Position, Istmenge (Kommissionierung) sowie Buchungsmenge, Inventurmenge, Umlagerungsmenge, Stück pro Pack.

**Bestanden (sicher):**
- Ungültige Eingaben (`1e999`, `--`, `1e`) und negative Werte werden abgewiesen, der vorhandene Wert bleibt, die Warnung erscheint.
- `1.5` wird bei Gewichten gespeichert, bei Stückzahlen (Istmenge) abgewiesen: Stückzahlen bleiben ganzzahlig.
- Istmenge und Stückgewicht lassen sich nicht auf leer setzen.
- Das Scanner-Eingabefeld (`#pickScanInput`) ist `type=text` und von allen Zahlenfeldern unabhängig; sa15/portal (207 Prüfungen) bestehen. Die Kamera konnte nicht getestet werden (kein Gerät).

**Sicherheitsprobleme:**

| ID | Befund | Schwere | Beleg |
|---|---|---|---|
| S1 | **Getipptes `1,5` wird in allen `type=number`-Feldern still zu `15`** (Faktor 10): Palettengewicht, Boxgewicht, Messwert, Stückgewicht, Toleranz, Istmenge sowie Buchungs-, Inventur-, Umlagerungsmenge und Stück pro Pack. Das Feld zeigt dann `15`; es gibt keine Meldung. Kritisch: **Toleranz 1,5 % wird 15 %** (Gewichtskontrolle wird großzügiger, unsicher); Menge 1,5 wird 15 (ganzzahlig, wird so gebucht). | **Hoch** | In Chromium bei allen vier Gebietsschemata reproduziert (96 + 32 Befunde). |
| S2 | Leeren von Palettengewicht, Boxgewicht, Messwert, Toleranz löscht den vorhandenen Wert ohne Rückfrage; bei Palette/Box wird der gekoppelte Messwert zurückgesetzt. Bisher bewusst als normaler Korrekturweg zugelassen. | Niedrig–Mittel | 32 Befunde |

**Wichtige Einschränkung der Aussage:** Chromium (Prüfumgebung) verwirft das Komma in `type=number`-Feldern unabhängig vom eingestellten Gebietsschema, auch im Emulationsmodus. Auf echten deutschen Geräten (iOS Safari/Android mit deutscher Tastatur) akzeptieren Browser das Komma meist als Dezimaltrenner und liefern `1.5`. Das **Risiko tritt dort auf, wo Browser-/Tastatursprache nicht zur eingegebenen Schreibweise passt** (z. B. englisches iPhone mit deutscher Tastatur, Desktop-Chrome mit englischer Oberfläche). Ob bzw. in welchen Konstellationen echte Geräte betroffen sind, ist **nicht geprüft**; ein Test auf echten Geräten (deutsches und englisches iPhone, Android) ist nötig. Als Ergebnis darf keine Aussage „auf iPhone/Android bestanden“ abgeleitet werden.

**Vorschlag (benötigt Freigabe, nicht umgesetzt):** Die Kommissionier- und Mengenfelder auf `type="text" inputmode="decimal"` (Gewichte, Toleranz) bzw. `inputmode="numeric"` (Stückzahlen) umstellen und mit einer gemeinsamen strengen Prüfung auswerten: Dezimalkomma und -punkt zulässig, Stückzahlen nur Ziffern, alles andere wird mit Meldung abgewiesen (wie `parseNumField` aus AP5.2). `pickNumber` liefert für Text `1,5` heute `null` → würde abgewiesen statt zu 15 verfälscht; ein Zwischenschritt ist daher fail-safe. Zusätzlich: nach dem Speichern den interpretierten Wert mit Einheit anzeigen („1,5 kg“, „1,5 %“). Die Tests dieses Pakets würden dann von Befund auf PASS wechseln. Risiko: Änderung am geschützten Kommissionier-Markup, daher nur nach Freigabe und mit sa15/portal-Regression und echtem Gerätetest. Optional für S2: Rückfrage beim Leeren von Palette/Box, wenn ein Messwert vorhanden ist.

## 3 Lastkonfiguration: Absenken bei bereits überschreitenden Boxen

Test `tests/mobile/ap53-lastkonfiguration.js`: **26 PASS / 0 FAIL / 5 Befunde.** (Boxgewicht = Menge × Packgewicht + Leergewicht, je Box gegen Fachlast, Feldlast und Palettentragfähigkeit; so rechnet `loadCheck`.)

Verhalten heute, Beispiel: Box 300 Stück × 2 kg + 25 kg = 625 kg, neue Fachlast 300 kg:
- Die Konfiguration wird **ohne Warnung gespeichert** („Parameter gespeichert.“). Gleiches gilt für Feldlast, Palettentragfähigkeit und für eine Erhöhung des Leergewichts. (**Sicherheitsproblem S3, Mittel**: Eine physisch überlastete Box bleibt unbemerkt.)
- Boxen, Bestände, QR-Zuordnung und Plätze bleiben byteweise unverändert, `valid()` besteht (gut, nichts wird automatisch verändert).
- Ausbuchen aus der überladenen Box bleibt möglich; Erhöhung (+1) wird mit „Fachlast von 300 kg überschritten.“ gesperrt; neue Boxen über der Grenze werden gesperrt, darunter erlaubt; Namensänderung des Artikels möglich; Gewichtserhöhung des Artikels wird abgelehnt; die Startseite weist nicht auf überladene Boxen hin.

**Vorschlag Warnung (nicht umgesetzt):** Beim Speichern der Lastparameter die Boxen berechnen, die die neue Grenze überschreiten, und vor dem Speichern anzeigen:

> **Achtung: 3 vorhandene Boxen liegen über der neuen Fachlast (300 kg).**
> z. B. H4A-1-1: 625 kg · H4A-1-3: 225 kg … (bis zu 5 Beispiele, „und n weitere“)
> Es wird nichts verändert oder umgelagert. Auf diesen Plätzen sind Ausbuchen und Zählen weiter möglich; Erhöhungen und neue Einlagerungen über der Grenze werden abgelehnt. Bitte die Plätze prüfen.
> [Abbrechen] [Trotzdem speichern]

Dazu: (a) Nach dem Speichern dauerhafter Hinweis auf der Startseite „⚠ n Boxen über Traglast“ mit Liste (nur lesend), (b) Boxen mit unbekanntem Artikelgewicht als „nicht prüfbar“ zählen, (c) Entfernen/Absenken wirkt nie auf Bestände. Die Berechnung ist reine Lesearbeit auf `state.boxes`; die Testfunktion `overloaded()` im Analysetest entspricht dieser Logik und liefert für alle vier Szenarien die erwarteten Boxen.

## 4 Mobile Artikelverwaltung (320 px)

Test `tests/mobile/ap53-artikeltabelle.js`: **16 PASS / 0 FAIL / 6 Befunde.**

Ist-Zustand: Die Artikeltabelle hat eine Mindestbreite von 448 px, der verfügbare Platz auf Telefonen beträgt 262–372 px. **Der Bearbeiten-Button liegt bei 320, 360, 375, 390, 414 und 430 px außerhalb des Bildschirms** und ist nur durch seitliches Wischen in der Tabelle erreichbar (dann ist er 99 × 44 px, gut bedienbar; Seite selbst läuft nicht über; Funktion ok). Schwere: Mittel (Bedienbarkeit, kein Datenrisiko).

**Vorschlag (nicht eingebunden): `docs/ap53/artikeltabelle-vorschlag.css`** – Kartenansicht unter 600 px, reines CSS ohne Änderung an HTML/JS: Kopfzeile ausgeblendet, je Artikel eine Karte (Name/Nummer, Einheit, Pack, Gewicht), Bearbeiten-Button rechts, 99 × 44 px. Im Test: bei allen Breiten 320–430 px alle Buttons sichtbar, ≥ 44 × 44, keine Überlappung, kein Seitenüberlauf, Bearbeiten öffnet das Formular; bei 601, 768, 1100, 1400 px Zeilenhöhe und Buttongröße **identisch** zur heutigen Darstellung. Screenshots: `docs/ap53/artikeltabelle-320-aktuell.png`, `…-vorschlag.png`. Voraussetzung `:has()` (iOS Safari ≥ 15.4, Chrome ≥ 105); ältere Browser behalten die scrollbare Tabelle. Nachteil: Zeilen werden höher (148 px bei 320 px statt 98 px), also mehr Scrollen; alternativ wäre eine „sticky“ Aktionsspalte denkbar (weniger Platz für den Namen). Empfehlung: Kartenansicht.

## 5 Offene Risiken

1. S1 (Hoch) ist in der Prüfumgebung belegt, auf echten Geräten nicht geprüft; keine Entwarnung möglich, solange nicht getestet.
2. S3: Lastabsenkung ohne Warnung.
3. Der Bearbeiten-Button ist auf Telefonen nicht ohne Wischen sichtbar.
4. S2: Leeren von Packstückfeldern ohne Rückfrage.
5. Kamera, Handscanner, AirPrint: nicht real getestet (nur Chromium); der Scanner-Eingabepfad (`type=text`) bleibt unberührt.
6. Weiterhin keine Gewichtsobergrenze (Entscheidung aus AP5.1/5.2 offen).
7. Die 21 bekannten Testfehler (Kategorie A) bestehen weiter; Testpflege steht aus.

## 6 Geänderte Dateien

- `tests/mobile/ap53-kommissionier-eingaben.js`, `tests/mobile/ap53-lastkonfiguration.js`, `tests/mobile/ap53-artikeltabelle.js` (neu)
- `docs/ap53/artikeltabelle-vorschlag.css`, zwei Screenshots, `docs/AP5-3-Mobile-Sicherheit.md`, `docs/ap53-logs/` (neu)
- **Kein** Anwendungscode.

## 7 Empfohlene nächste Freigaben

1. AP5.4a: Kommissionier-/Mengenfelder strikt parsen (S1), nach Freigabe; zuvor/zugleich Test auf echtem iPhone (deutsch/englisch) und Android.
2. AP5.4b: Warnung beim Absenken der Last (S3) und Hinweis auf der Startseite.
3. AP5.4c: Kartenansicht der Artikeltabelle auf Telefonen.

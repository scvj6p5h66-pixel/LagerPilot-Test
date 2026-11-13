# AP5.2 – Zahlenfelder absichern und mobile Bedienbarkeit

Ausgangsbranch: `feature/ap5-1-gewichtssicherheit`, Commit `fb2ad0a`. Neuer Branch: `feature/ap5-2-zahlenfelder`. Es wurden keine anderen Entwicklungsbranches übernommen. `main` (05b614df) und `development` (9b6115a) unverändert. Kein Merge, keine Veröffentlichung.

## 1 Untersuchte Zahlenfelder (alle 16 `type=number`-Felder plus Gewicht)

Grundmuster des Fehlers: Ein `type=number`-Feld liefert bei vom Browser verworfener Eingabe (`1e999`, bei Überlauf, `--`) einen leeren Wert. Wird „leer“ als „nicht angegeben“ gelesen, entsteht eine stille Löschung.

| Feld | Zweck / Einheit | Verhalten **vorher** | Befund | Verhalten **jetzt** |
|---|---|---|---|---|
| Gewicht pro Pack (`aWeight`) | kg je Lagereinheit | AP5.1 behoben | – | unverändert (AP5.1) |
| Maximale Boxmenge (`aMax`) | ganze Zahl ≥ 1, in Lagereinheiten (Pack bzw. Stück) | `Number`, leer = `null` | **Fehler:** ungültig → stilles `null`, Wert ohne Bestand verloren | Rohtext-Prüfung (nur Ziffern), Fehlermeldung, kein Speichern; Entfernen nur nach Bestätigung (mit Bestand gesperrt wie bisher) |
| Mindestbestand (`aMin`) | ganze Zahl ≥ 0, Gesamtbestand | wie oben | **Fehler** (auch mit Bestand: stilles Löschen möglich) | wie oben; Entfernen nach Bestätigung (auch mit Bestand erlaubt, bewusst) |
| Stück pro Pack (`aPack`) | ganze Zahl ≥ 1 | ungültig → 0 → abgelehnt | sicher, aber unklare Meldung | zusätzlich eindeutige Meldung bei ungültiger Eingabe |
| Leergewicht (`cfgTare`) | kg, Dezimal ≥ 0 | `Number`, leer = `null` | **Fehler:** stilles Löschen | Parser mit Dezimalkomma, Meldung, Entfernen nur nach Bestätigung |
| Fachlast (`cfgShelf`) | kg, Dezimal ≥ 1, Pflicht | ungültig → `null` → „muss angegeben werden“ | irreführende Meldung, kein Datenverlust | Parser, klare Meldung |
| Feldlast (`cfgBay`), Palettentragfähigkeit (`cfgPalletMax`) | kg, Dezimal ≥ 1 | wie Leergewicht | **Fehler** | wie Leergewicht |
| Menge Buchen (`bookQty`) | ganze Zahl (Korrektur mit Vorzeichen) | ungültig → 0 → abgelehnt | sicher, allgemeine Meldung | zusätzlich eindeutige Meldung (Eingabe bleibt `type=number`) |
| Menge Umlagern (`mergeQty`), Inventurmenge (`invQty`) | ganze Zahl | wie Buchen | sicher | wie Buchen |
| Kommissionierung: Palettengewicht, Boxgewicht, Messwert, Toleranz (`pick-*`) | kg bzw. % | ungültig → leer → `null` gespeichert; **zusätzlich** wurde bei abgelehnten Werten der Messwert schon vor der Prüfung gelöscht | **Fehler:** stilles Löschen; Messwert-Verlust | Ungültige Eingabe wird erkannt, Warnung, nichts gespeichert, **Messwert bleibt**; Messwert wird nur bei akzeptiertem neuem Paletten-/Boxgewicht zurückgesetzt (wie bisher) |
| Kommissionierung: Istmenge, Stückgewicht je Position | ganze Zahl bzw. kg | leer → Warnung (sicher) | sicher, allgemeine Meldung | zusätzlich eindeutige Meldung bei `badInput` |

Weitere Zahlenfelder mit ähnlichem Verhalten: keine. Alle Eingabefelder wurden per Suche nach `type="number"`, `Number(…value)`, `parseInt/parseFloat` geprüft. Die Textfelder (Barcode, Plätze, Artikelnummern) sind nicht numerisch.

## 2 Tatsächlich gefundene Fehler

1. **Maximale Boxmenge und Mindestbestand:** ungültige Eingabe → stilles `null` (Artikel ohne Bestand verliert Wert; Mindestbestand auch mit Bestand).
2. **Konfiguration Leergewicht/Feldlast/Palettentragfähigkeit:** ungültige Eingabe → stilles `null`; Lastprüfung danach unvollständig (Einlagerungen werden dann sicher blockiert, aber der Wert ist verloren). Fachlast: nur irreführende Meldung.
3. **Kommissionierung Packstückgewichte:** ungültige Eingabe → stilles `null`; zusätzlich Löschen des Messwerts vor der Validierung.
4. **Bearbeiten-Button 30 px** (AP5 #23–25).

## 3 Änderungen (nur `index.html` 21 Zeilen, `styles/01-basis.css` 3 Zeilen)

- Neue Funktion `parseNumField(raw,{int,min,msg})`: leer = „nicht angegeben“; sonst nur Ziffern (ganze Zahlen) bzw. Ziffern mit **einem** Dezimalpunkt oder -komma (Dezimalfelder); kein Exponent, kein Vorzeichen, endlich, ≤ `Number.MAX_SAFE_INTEGER`, ≥ Mindestwert des Feldes. **Die bisherigen fachlichen Mindestwerte sind unverändert** (Max ≥ 1, Min ≥ 0, Fachlast/Feldlast/Palette ≥ 1, Leergewicht ≥ 0, keine neuen Grenzen).
- Felder `aMax`, `aMin`, `cfgShelf/Bay/PalletMax/Tare` auf `type="text"` mit `inputmode` (`numeric` bzw. `decimal`) umgestellt, damit der Rohtext geprüft werden kann. Ganze Stückzahlen bleiben ganze Zahlen; Dezimalkomma wird nur bei Dezimalfeldern akzeptiert.
- **Entfernen vs. leer:** Ein leeres Feld bei vorhandenem Wert fragt per Dialog nach (Maximale Boxmenge nur ohne Bestand, Mindestbestand, Feldlast, Palettentragfähigkeit, Leergewicht). Leere Felder ohne vorhandenen Wert bleiben „unbekannt“ ohne Dialog. Fachlast bleibt Pflicht.
- **Speicherlogik:** `transaction` im Artikelspeichern lehnt jetzt auch nicht ganzzahlige Max/Min und ein nicht bestätigtes Entfernen von Gewicht, Max oder Min ab. Die Konfiguration prüft Typ/Endlichkeit und nicht bestätigtes Entfernen in der Transaktion. `valid()` unverändert (lehnt weiterhin ungültige Werte beim Persistieren/Import ab).
- Mengenfelder (Buchen, Umlagern, Inventur, Pack) und Kommissionierungsfelder: Erkennung von `validity.badInput` mit eindeutiger Meldung; Kommissionierung rendert neu und speichert nicht.
- Konfigurationsfehler beginnen weiter mit „Ungültiger Wert (<schlüssel>)“, damit bestehende Tests und Meldungsmuster gültig bleiben.
- **Bearbeiten-Button:** `#articleRows button[data-edit]{min-height:44px;min-width:44px;padding:8px 14px}` nur in `@media(pointer:coarse),(max-width:700px)`. Desktop bleibt bei 30 px.

Nicht geändert: Bestände, Boxen, Plätze, QR-Codes, Artikelgewichte und alle sonstigen Daten (keine Migration), Kommissionierungsdemo, iPhone-Druckfix, Druck/Schein-Layout.

**Zurückgestellt (Begründung):** Die Kommissionierungs-Eingabefelder bleiben `type=number`. Eine Umstellung auf Text würde das geschützte Kommissionierungs-Markup ändern. In Browsern mit englischem Gebietsschema entfernt ein `type=number`-Feld ein getipptes Komma (`1,5` wird `15`), ohne dass die App das erkennen kann. Das betrifft die Kommissionier- und Mengenfelder; Vorschlag: eigenes Arbeitspaket mit Freigabe (Textfeld + `parseNumField`), zusammen mit einem Test auf echten Geräten (deutsches iPhone). Die Packstück-Eingaben der Kommissionierung dürfen bewusst geleert werden (leer = nicht eingetragen), das ist der normale Korrekturweg und wurde nicht mit Dialog versehen.

## 4 Artikelgewicht: Einheit und Vorschlag Plausibilitätsprüfung (nichts implementiert)

**Einheit:** `items[].weight` ist kg je **Lagereinheit**: je Pack bei Einheit `P`, je Stück bei `STK` (Feldbezeichnung „Gewicht pro Pack (kg)“, Listenanzeige „kg/P“). Boxbestände zählen in derselben Einheit; Boxgewicht = `Menge × Gewicht + Leergewicht`. In der Kommissionierung wird das Stückgewicht bei `P` als `Gewicht ÷ Stück pro Pack` abgeleitet. Artikelgewicht, Boxgewicht (berechnet), Leergewicht, Fachlast, Feldlast und Palettentragfähigkeit bleiben fachlich getrennt; eine Obergrenze ist **nicht** implementiert, bestehende Artikelgewichte wurden nicht verändert.

**Vorschlag** (zur gemeinsamen Entscheidung):
1. *Abgeleitete Grenze statt fester Zahl:* Für neue oder geänderte Artikelgewichte gilt, wenn Fachlast und Leergewicht bekannt sind: `Gewicht + Leergewicht ≤ min(Fachlast, Palettentragfähigkeit, Feldlast)` (dieselbe Regel wie beim Einlagern einer einzelnen Lagereinheit). Beispiel bei Fachlast 800 kg und Leergewicht 25 kg: höchstens 775 kg.
2. *Hinweis statt Sperre* für auffällige Werte: Gewicht 0 kg, Gewicht ≥ 50 % der Fachlast, Änderung um mehr als Faktor 10 gegenüber dem bisherigen Wert (Bestätigung).
3. *Fallback ohne Konfiguration:* feste Obergrenze nach Festlegung durch den Betrieb (Wert offen).
4. Altdaten nur anzeigen (Liste „Artikel über der abgeleiteten Grenze“), niemals automatisch ändern.

## 5 Tests

Neuer Test `tests/numbers/ap52-zahlenfelder.js`: **238 PASS / 0 FAIL** (auf dem Stand AP5.1: 147 FAIL). Abgedeckt: (1) gültige Zahlen; (2) ungültige Zeichen (18 Muster für ganze Zahlen, 17 für Dezimalfelder, u. a. `abc`, `1e3`, `1e999`, Vorzeichen, Mehrfach-Trennzeichen, `0x10`, fremde Ziffern); (3) 400-stellige und 2⁵³-Werte; (4) negative Werte, Null bei Feldern mit Mindestwert 1; (5) Dezimalkomma und -punkt nur bei Dezimalfeldern, `1,5` bei ganzen Zahlen abgelehnt; (6) leere Eingaben mit/ohne Bestätigung, Pflicht Fachlast; (7) Bearbeiten Artikel ohne und mit Bestand; (8) Schutz vorhandener Werte, Speicher byteweise gleich bei jeder Ablehnung; Speicherlogik direkt (`Infinity`, `NaN`, Strings, negative Werte); Mengenfelder mit echter Tastatureingabe (`1e999`, `--`); Kommissionierung inkl. Messwertschutz; (9) Export, Import gültig/ungültig, Altdaten (Min 500 > Max 100); Layout in sechs Geräteprofilen; AP5.1-Gewicht weiter gültig.
Gewichtstest AP5.1: **77/77 weiterhin PASS.**

Vollständige Regression (identische Läufer wie AP5/AP5.1, Logs `docs/ap52-logs/`):

| Suite | AP5.1 | AP5.2 |
|---|---|---|
| ap1, ap1c, ap2, ap8, ap10, ap15 | 59/0, 25/0, 88/0, 62/0, 46/0, 78/0 | identisch |
| ap9 | 44/7 | 44/7 (erste Fassung brach 5 Prüfungen wegen geänderten Meldungstexts, Meldungspräfix angepasst) |
| ap11, ap12, ap13, ap14 | 172/1, 43/2, 66/1, 72/9 | identisch |
| ap16 | 50/4 | **53/1** (Tap-Ziel-Fehler #23–25 behoben) |
| equiv, sa15, portal, sa12c, Zwei-Tab | 85/0, 81/0, 126/0, 43/0, 12/0 | identisch |
| AP5-Diagnose | 17/0, 1 Befund | **18/0, 0 Befunde** |
| ap7 Edit-Modus | 56/9 | 56/9 |

Standardlauf gesamt: 1140 PASS / 24 FAIL → **1143 PASS / 21 FAIL**. Die 21 verbleibenden Fehler sind die bekannten Testfehler der Kategorie A aus AP5 (ap9: 7, ap11: 1, ap12: 2, ap13: 1, ap14: 9, ap16: 1 – letzteres der Test „Edit-Modus + Import“ #26). Es gibt keinen neuen Fehler.
Nach der letzten Einzeländerung (Fehlertext der Konfiguration) wurden ap9, ap51, ap52, sa12c, Zwei-Tab und AP5-Diagnose erneut gefahren; der vollständige Lauf davor lag auf der unmittelbar vorherigen, sonst identischen Fassung.

## 6 Datenintegrität

Der Test seedet Artikel (mit/ohne Bestand/Werte), Box mit Bestand 50, QR-Zuordnung, Konfiguration und vergleicht nach allen Eingaben: **Boxen, Plätze, QR-Zuordnung byteweise unverändert**, Altartikel erhalten, `valid()` besteht. Jede abgelehnte Eingabe lässt den **gesamten Speicher byteweise gleich**. Importe mit ungültigen Typen/Werten (String, 1.5, negativ, ungültige Konfiguration) werden abgelehnt und lassen den Bestand unverändert; Altdaten mit Mindestbestand > Max werden weiter akzeptiert. Es wurde nichts migriert; keine echten Firmendaten.

## 7 Mobile Layoutprüfung (Chromium-Emulation)

| Profil | Bearbeiten-Button | Überlappung | Seitenüberlauf | Funktion |
|---|---|---|---|---|
| Desktop 1100 | 87 × 30 (unverändert) | nein | nein | ok |
| iPhone SE (320 px) | 99 × 44 | nein | nein | ok |
| iPhone 14, Pixel 7 | 99 × 44 | nein | nein | ok |
| iPad Pro 11 hoch/quer | 99 × 44 | nein | nein | ok |

Screenshots: `docs/ap52-screens/`. **Echtgerät-Test (iPhone/Android) steht aus.**

## 8 Offene Risiken

1. Auf kleinen Telefonen liegt die Spalte „Aktion“ der Artikeltabelle rechts außerhalb des Sichtfeldes und ist nur durch seitliches Wischen in der Tabelle erreichbar (bestand schon vorher; nicht verändert). Vorschlag: eigenes Layout-Paket (Aktion unter dem Artikelnamen).
2. Kommissionier- und Mengenfelder bleiben `type=number`: in Browsern mit englischem Gebietsschema wird `1,5` zu `15` (siehe Abschnitt 3).
3. Dezimalkomma-Regel: `1,500` wird als 1,5 gelesen (gilt auch für Konfiguration).
4. Keine Gewichtsobergrenze (Entscheidung offen, Vorschlag Abschnitt 4).
5. Bestätigungsdialoge nutzen `confirm()`; wo Dialoge unterdrückt werden, ist Entfernen nicht möglich (sicher).
6. Lastkonfiguration kann herabgesetzt werden, ohne bestehende Boxen neu zu prüfen (bestehendes Verhalten, nicht Teil dieses Pakets).
7. Nur Chromium getestet; kein Safari/WebKit, keine echten Geräte.

## 9 Geänderte Dateien

- `index.html`, `styles/01-basis.css`
- `tests/numbers/ap52-zahlenfelder.js` (neu)
- `docs/AP5-2-Zahlenfelder.md`, `docs/ap52-logs/`, `docs/ap52-screens/` (neu)

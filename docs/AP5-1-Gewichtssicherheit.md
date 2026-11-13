# AP5.1 – Gewichtseingaben absichern

Branch: `feature/ap5-1-gewichtssicherheit` (Basis: `feature/ap5-qualitaetssicherung` 166d246). Kein Merge, keine Veröffentlichung. `main` (05b614df) und `development` (9b6115a) unverändert.

## 1 Ursache und Behebung (Befund #21 / F21c aus AP5)

**Ursache:** Das Feld „Gewicht pro Pack (kg)“ war `type="number"`. Ungültige Eingaben (`1e999`, `abc`, `Infinity`, in manchen Browsern `1,5`) liefert der Browser als leeren Wert. Die App las „leer“ = „Gewicht unbekannt“, speicherte `weight:null` und meldete „Artikel gespeichert.“. Die Prüfung `Number.isFinite` wurde nie erreicht. Beim Bearbeiten eines Artikels **ohne Bestand** wurde so ein vorhandenes Gewicht still gelöscht (mit Bestand schützte bereits die vorhandene Regel).

**Behebung (nur `index.html`, 3 Stellen):**
1. Feld auf `type="text" inputmode="decimal"` umgestellt, damit der Rohtext ankommt (Dezimaltastatur bleibt erhalten).
2. Neue Funktion `parseWeightInput(raw)`: leer = „unbekannt“; sonst nur Ziffern mit einem Dezimalpunkt **oder** -komma (`2.5`, `2,5`); alles andere (Buchstaben, Exponent, Vorzeichen, mehrere Trennzeichen, `.5`, `5.`, fremde Ziffernzeichen) und nicht endliche oder größer als `Number.MAX_SAFE_INTEGER` → Fehlermeldung „Gewicht muss eine gültige Zahl ab 0 kg sein (…). Eingegeben: „…“. Zum Entfernen das Feld leer lassen.“, **kein Speichern**, Formular bleibt erhalten.
3. **Bewusstes Entfernen:** Leeres Feld bei einem Artikel mit vorhandenem Gewicht fragt per Bestätigungsdialog nach (nur ohne Bestand; mit Bestand lehnt die vorhandene Regel ab). Ohne Bestätigung: nicht gespeichert. Zusätzlich verweigert die **Speicherlogik** (in `transaction`) das Entfernen eines vorhandenen Gewichts ohne diese ausdrückliche Bestätigung sowie jedes nicht endliche/negative/nicht numerische Gewicht. `valid()` lehnt solche Werte beim Persistieren/Import weiterhin ab (unverändert).

Keine Migration, keine Änderung an Beständen, Boxen, Plätzen, QR-Codes, Kommissionierung oder Gewichtskontrolle. Altdaten werden nicht angefasst.

**Entscheidung zur Prüfung:** Dezimalkomma wird als Dezimaltrenner akzeptiert (`2,5` = 2.5), weil die deutsche iPhone-Dezimaltastatur keinen Punkt anbietet. Mehrdeutiges (`1.500,5`, `1,2,3`) wird abgelehnt. `1,500` gilt als 1,5 kg (bitte bestätigen).

## 2 Gewichtsfelder und Einheiten (Bestandsaufnahme)

| Feld | Speicherort / Eingabe | Einheit | Bedeutung | Validierung heute |
|---|---|---|---|---|
| Artikelgewicht („Gewicht pro Pack“) | `items[].weight`, Artikelformular `aWeight` | kg je Pack (Einheit `P`) bzw. je Stück (`STK`); in der Kommissionierung je Stück = Gewicht ÷ Packgröße bei `P` | Grundlage aller Boxgewichte und der Kommissionier-Gewichtskontrolle | **neu:** strenger Parser; `valid()`: endlich, ≥ 0 oder `null`; **keine Obergrenze** |
| Boxgewicht (berechnet) | nicht gespeichert: `qty × weight + tare` | kg | wird bei Einlagern/Zählung/Artikeländerung gegen Fachlast, Palette, Feld geprüft | rechnerisch |
| Leergewicht („Palette + Box“) | `config.tare`, `cfgTare` (`type=number`, ≥ 0, step 0,1) | kg je Box/Platz | Eigengewicht, in jedes Boxgewicht eingerechnet | `valid()`: endlich, ≥ 0 oder `null` |
| Fachlast | `config.shelf`, `cfgShelf` (`type=number`, ≥ 1, Pflicht) | kg | Traglast je Fachplatz (Hersteller) | wie oben; Speichern verlangt Fachlast |
| Feldlast | `config.bay`, `cfgBay` (optional) | kg | Traglast je Regalfeld | wie oben; leer = unbekannt |
| Palettentragfähigkeit | `config.palletMax`, `cfgPalletMax` | kg | Grenze je Palette/Bodenplatz | wie oben |
| Kommissionierung: Palettengewicht | `order.packaging.palletWeight` (`type=number`, step any) | kg | Leergewicht Palette für die Waagenkontrolle | `pickNumber` (endlich, ≥ 0 sonst `null`) |
| Kommissionierung: Boxgewicht | `order.packaging.boxWeight` | kg | Tara je Packstück | wie oben |
| Kommissionierung: Messwert | `order.packaging.measuredWeight` | kg | gewogener Wert | wie oben |
| Kommissionierung: Toleranz | `order.packaging.tolerancePercent` | % (0–100) | zulässige Abweichung | 0 ≤ x ≤ 100 |
| Kommissionierung: Stückgewicht je Position | `order.items[].unitWeight` | kg je Stück | aus Artikelgewicht abgeleitet | `pickNumber` |

Alle Gewichte sind kg. Es gibt keine Einheit „g“ und keine Umrechnung.

**Gleichartiges Restrisiko (nicht Teil dieses Arbeitspakets, nicht geändert):** Die Felder Leergewicht, Feldlast, Palettentragfähigkeit (Konfiguration), maximale Boxmenge, Mindestbestand und die Kommissionier-Gewichtsfelder sind weiterhin `type=number`. Auch dort wird ein vom Browser verworfener Wert als „leer“ gelesen. Besonders kritisch: Konfiguration `cfgSave` (leeres Feld = `null` = Lastprüfung unvollständig, Buchungen werden dann blockiert, aber der alte Wert ist weg). Empfehlung: dieselbe Rohtext-Prüfung als eigenes Arbeitspaket (AP5.2).

## 3 Vorschlag Gewichtsobergrenze (Entscheidung offen, nichts umgesetzt)

Heute gilt nur eine technische Grenze (endlich, ≤ 9,007 × 10¹⁵). Das ist keine fachliche Grenze: 1 000 000 kg wird akzeptiert. Fachlich ableitbar ist:

- **Vorschlag A (empfohlen, fachlich begründet):** Ein einzelnes Pack muss in ein Fach passen. Ist Fachlast und Leergewicht bekannt, gilt für **neue oder geänderte** Artikelgewichte: `Gewicht + Leergewicht ≤ min(Fachlast, Palettentragfähigkeit, Feldlast)`. Bei Fachlast 800 kg und Leergewicht 25 kg also ≤ 775 kg je Pack. Die Grenze folgt der Konfiguration, keine willkürliche Zahl. Bei Altdaten mit größerem Gewicht: nur Hinweis, keine automatische Änderung.
- **Fallback, wenn Konfiguration fehlt:** harte Obergrenze, die der Betrieb festlegt (z. B. die schwerste real vorkommende Palette). **Hier brauchen wir Ihre Entscheidung**: Welcher Wert (z. B. 1000 kg wie eine Euro-Palette oder weniger)?
- Alternative B: nur Warnung statt Sperre, falls Packs zeitweise außerhalb von Fächern (Boden/Palette) geführt werden.

Empfehlung: A als Sperre für neue Eingaben plus Fallback-Wert nach Ihrer Entscheidung; Altdaten unverändert lassen.

## 4 Tests und Ergebnisse

Neuer Test `tests/weight/ap51-gewicht.js`: **77 PASS / 0 FAIL** (Gegenprobe auf dem alten Stand: 44 FAIL).
Abgedeckt: (1) gültige Werte `2`, `2.5`, `2,5`, `0`, `0.001`, ` 3 `, `007`, `12,75`, 9007199254740991; (2) 26 ungültige Eingaben (Buchstaben, Exponent, `Infinity`, `NaN`, Vorzeichen, mehrere Trennzeichen, `0x10`, Einheiten, fremde Ziffern, `null`/`undefined`); (3) 400-stellige Zahl, 2⁵³, 10³⁰; (4) Neuanlage: Meldung, kein Artikel, Speicher byteweise gleich, Formular bleibt; (5) Bearbeiten je ohne und mit Bestand: Gewicht bleibt, Speicher byteweise gleich, auch Name nicht geändert; (6) Schutz vorhandener Gewichte; (7) bewusstes Entfernen: nur nach Bestätigung, protokolliert, mit Bestand abgelehnt, Artikel ohne Gewicht und leere Neuanlage weiter erlaubt; (8) Fachlastgrenze mit Bestand unverändert (15,5 ok / 15,6 abgelehnt); Speicherlogik lehnt `Infinity`, `NaN`, negativ, String, `undefined` direkt in `transaction` ab; (9) Export (Gewichte unverändert) und Import (3.25, `null` und 1e308 übernommen; `"abc"`, `"2"`, `-1` abgelehnt, Bestand unverändert); Altdaten nach Reload; Integrität; keine JS-Fehler.

Regression (gleiche Läufer wie AP5, `docs/ap51-logs/`):

| Suite | vorher (a000991) | nachher |
|---|---|---|
| ap1 / ap1c / ap2 / ap8 / ap10 / ap15 | 59/0, 25/0, 88/0, 62/0, 46/0, 78/0 | identisch |
| ap9 | 44/7 | identisch |
| ap11 / ap12 / ap13 / ap16 | 172/1, 43/2, 66/1, 50/4 | identisch |
| ap14 | 70/11 | **72/9**: Fehler #21 („Gewicht 1e999“) und Folgefehler #22 sind behoben |
| equiv / sa15 / portal / sa12c | 85/0, 81/0, 126/0, 43/0 | identisch |
| SA-12c Zwei-Tab-Test | 12/12 | 12/12 |
| AP5-Diagnose | 15 PASS, 4 BEFUND | 17 PASS, 1 BEFUND (nur noch Tap-Ziel 30 px) |
| ap7-Edit-Modus | 56/9 | 56/9 |

Gesamt Standardlauf: 1138 PASS / 26 FAIL → **1140 PASS / 24 FAIL** (+ neue 77/0). Die 24 verbleibenden Fehler sind die bekannten Kategorie-A-Fälle und der Tap-Ziel-Befund aus AP5; kein neuer Fehler.
Hinweis: ap13/ap14 benötigen den Vergleichsserver für den alten Stand (Port 8124); sie wurden nach dessen Start wiederholt.

## 5 Datenintegritätsprüfung

Im Gewichtstest (Seed mit Artikeln, Bestand 50 auf H4A-1-1, QR-Zuordnung, Konfiguration) werden Boxen, Plätze, QR-Zuordnung und Konfiguration vor und nach allen Eingaben verglichen: **alle byteweise unverändert**; `valid()` besteht; bei jeder abgelehnten Eingabe bleibt der gesamte Speicher byteweise gleich. Importtests lassen den Bestand bei abgelehntem Import unverändert. Die Regression bestätigt unveränderte Bestände, Boxen, Plätze und Aufträge. Keine echten Firmendaten verwendet.

## 6 Restrisiken

1. Gleichartige stille Verwerfung bei den übrigen Zahlenfeldern (s. Abschnitt 2), besonders Konfiguration `cfgSave`. Vorschlag AP5.2.
2. Keine fachliche Gewichtsobergrenze (Entscheidung offen).
3. Bestätigungsdialog zum Entfernen nutzt `confirm()`; in Browsern, die Dialoge unterdrücken, bricht das Entfernen ab (sicher, aber ohne Möglichkeit zum Entfernen). Echtgerätetest iPhone/Android steht aus.
4. `1,500` wird als 1,5 gelesen (Dezimalkomma); bitte fachlich bestätigen.
5. Tests liefen nur in Chromium; Safari/WebKit und echte Mobilgeräte nicht geprüft.
6. Bekannte offene Punkte aus AP5 (Tap-Ziel 30 px, Testpflege) unverändert.

## 7 Geänderte Dateien

- `index.html` (3 Stellen: Eingabefeld, `parseWeightInput`, Speicherhandler/-logik)
- `tests/weight/ap51-gewicht.js` (neu)
- `docs/AP5-1-Gewichtssicherheit.md` (neu), `docs/ap51-logs/` (neu, Testlogs)
- Nicht geändert: Styles, Bestände, Boxen, Plätze, QR-Codes, Kommissionierung, Gewichtskontrolle, Demo, Druck, `main`, `development`.

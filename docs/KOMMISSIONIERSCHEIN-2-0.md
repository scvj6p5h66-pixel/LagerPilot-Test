# Kommissionierschein 2.0 (IntraBold-Layout)

Branch: `feature/kommissionierschein-2-0` (von `feature/demo-kommissionierung` 99ef5c9). Nicht gemergt, nicht veröffentlicht.

## Änderungen
- `index.html` – nur `pickSlipHtml()` (reine Darstellung): neuer Kopf (Logo links, Titel + Status rechts), 4×2-Auftragsinfos, Tabelle ohne „Abw.“-Spalte (Abweichungen: Zeilenmarkierung + Abschnitt in „Bemerkungen“), Summenzeile (Stückzahl, Warengewicht), zweispaltiger Block Gewichtskontrolle | Bemerkungen, Unterschriftsfelder, Fußzeile.
- `styles/08-kommissionierschein.css` – Layout, Druck-CSS (A4 hoch, Ränder 10/12/14 mm, Tabellenkopf wiederholt sich, Abschlussblock bleibt zusammen, Seitenzahl im Seitenfuß).
- Tests: `tests/pick/kommissionierschein-2-0.js` (neu, 32 Prüfungen mit echten PDF-Ausdrucken).
- Nicht geändert: Berechnungen (`pickWeightCheck`), Scan-, Mengen- und Gewichtslogik, Speicherformate, Demo-Ablauf, Bestände.

## Toleranz – wichtig
Die Demo speichert `tolerancePercent: 2` und zeigt „± 2 %“; geprüft wird prozentual zum Sollgewicht. Der Ausdruck zeigt daher **± 2 %** und rechnet den Wert aus den Auftragsdaten in kg um (z. B. „± 2 % (± 0,37 kg)“). „±2 kg“ wäre falsch. Die Designvorlage (±2 %) stimmt damit überein.

## Werte
Alle Zahlen stammen aus den Auftragsdaten (Positionen, Palette/Box, gewogener Wert, Toleranz); es gibt keine festen Beispielwerte im Schein.

## Bekannte Einschränkungen
- Seitenzahl („Seite x von y“) kommt aus `@page`-Randboxen (Chrome/Edge). iPhone Safari unterstützt diese nicht; dort fehlt die Seitenzahl, der übrige Schein ist gleich. Nur am echten Gerät prüfbar.
- Auf echten Geräten (iPhone Safari, AirPrint) nicht getestet; PDF-Tests laufen in Chromium-Emulation.
- Gemessen: 8 Positionen = 1 Seite, 15 und 30 Positionen = je 2 Seiten. Wenn die Tabelle die Seite füllt, rutscht der Block Gewichtskontrolle/Bemerkungen/Unterschriften als Ganzes auf die nächste Seite (kein Zerreißen).

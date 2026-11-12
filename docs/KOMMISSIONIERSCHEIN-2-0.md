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

## Nachbesserung nach iPhone-Befund (AirPrint-Vorschau, Safari, 12.11.2026 21:02)
Befund: Der Stand 2f7cb89 lief am echten iPhone auf 2 Seiten (Tabelle | Gewichtskontrolle), Bezeichnungen stark umbrochen.
Ursache (Analyse, nicht am Gerät bewiesen): iOS Safari setzt den Druck sichtbar größer als Chrome (Layoutbreite kleiner als Papierbreite). Dadurch (1) wurden die festen mm-Spaltenbreiten zu breit für die Bezeichnung, (2) wurde der Block Gewichtskontrolle/Bemerkungen/Unterschriften (bewusst ohne Seitenumbruch) höher als der Restplatz und rutschte komplett auf Seite 2. In Chromium lässt sich das über Druckskalierung nachstellen: der alte Stand bricht ab 120 % um, genau wie im Screenshot.
Maßnahmen: Spaltenbreiten per `<colgroup>` in Prozent; kompaktere Abstände im Druck; kürzere Beschriftung „Berechnetes Bruttogewicht (Soll)“. Ergebnis: 4 Positionen = 1 Seite bis 140 % Skalierung (Test 2b), bei 150 % wieder 2 Seiten.
Offen: Bestätigung am echten iPhone. Die Seitenzahl aus `@page` fehlt in Safari weiterhin; iOS fügt eigene Kopf-/Fußzeile (URL, Datum, Seite) hinzu – das lässt sich aus der Seite nicht abschalten.

# Interaktive Kommissionierungsdemo (Mitarbeiter-Testdemo)

Branch: `feature/demo-kommissionierung` (von `development` 9b6115a). Nicht gemergt.

## Aufruf
Mitarbeiter-Testdemo → Max anmelden → Startseite → Button **„Demo-Kommissionierung starten“**.

## Ablauf
1. Vorbereitung: Palette und Karton wählen (Taragewichte werden angezeigt).
2. Vier Positionen nacheinander (Halle 4A/4B): Artikelnr., Bezeichnung, Lagerplatz, Soll-/Pick-Menge, Gewicht.
3. Je Position „Demo-Scan auslösen“ (Platz → Artikel, vorhandene Scan-Logik `resolve()`), Menge bestätigen, Fortschrittsanzeige.
4. Erwartetes Gesamtgewicht inkl. Palette + Karton; simulierte Waage (Toleranz ±2 kg) mit sichtbarer Abweichung, Treffer und Fehlerfall.
5. Abschluss und vollständiger Kommissionierschein.
6. „Demo zurücksetzen / neu starten“.
Zum Testen (eingeklappt): Fehlscan und falsche Menge.

## Datensicherheit
- Eigener localStorage-Schlüssel `lagerpilot_demo_kommissionierung_v1`; nicht in `pickState`, nicht im App-State, nicht im Export.
- Keine Änderung an echten Artikeln, Beständen, Kartons oder regulären Aufträgen; keine Bestandsbuchung.
- Demo-Scan und simulierte Waage sind sichtbar gekennzeichnet.

## Korrekturen im bestehenden Kommissionierbereich
- Bei 0 Positionen nie „Alle Positionen bestätigt“, sondern „Keine Positionen vorhanden“.
- Bei leerem Auftrag kein scheinbar gültiger Waagenwert.

## Tests
`node tests/demo/demo-kommissionierung.js <URL>` (86 Prüfungen, Playwright-Emulation iPhone/Android/iPad).
Echtgerätetests (iPhone Safari, Android, AirPrint, Kamera, Scanner) sind **nicht** durchgeführt.

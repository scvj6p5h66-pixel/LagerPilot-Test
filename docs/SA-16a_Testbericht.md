# SA-16a – Testbericht (Mitarbeiterportal, Phase 1)

Basis: development 1c7af217d5e6d8d1ae3f83c096d743a3fc67270f. Test: Playwright/Headless-Chromium (Emulation), lokaler Server.

## Neue Portal-Suite `tests/portal/sa16a-mitarbeiterportal.js`: 126 Prüfungen, 126 PASS, 0 FAIL
| Nr. | Anforderung | Ergebnis |
|---|---|---|
| 1 | Portal öffnet über eigenen Link und `mitarbeiter.html`; keine PIN-Attrappe | PASS |
| 2 | Max, Peter, Leon melden sich an (Gerät 1/2/3 vorausgefüllt) | PASS |
| 3 | Gerät wählbar, Mitarbeiterwechsel, Neuladen/neuer Tab | PASS |
| 4 | Vier Kacheln + Zurück-Navigation, keine Buchungsschaltflächen | PASS |
| 5 | Verwaltungsbereiche per Navigation/`tab()`/Klick nicht erreichbar, QS-/Technik-Bedienelemente nicht gerendert (Gegenprobe in Verwaltung vorhanden) | PASS |
| 6 | Verwaltungsoberfläche unverändert (10 Bereiche, Test-Anmeldung/Abmeldung) | PASS |
| 7 | Lagerdaten byte-identisch, Artikel/Boxen/Plätze 3.564 / 2.916 / 6.480 | PASS |
| 8 | Aufträge erhalten; Positionserzeugung für Peter identisch zur Verwaltung | PASS |
| 9 | SA-15 Abschluss, Schein, Nachdruck im Portal | PASS |
| 10 | Export/Import nach Portalnutzung | PASS |
| 11 | iPhone 14, Pixel 7, iPad Pro 11 (Emulation): kein Seitenüberlauf, Touch-Ziele ≥ 44 px, Kacheln ≥ 100 px | PASS |
| 12 | Keine JavaScript-Fehler | PASS |

## Regression (gegen Stand 1c7af21)
SA-15-Suite 81/81 PASS, Äquivalenz 85/85 PASS, ap1 59, ap1c 25, ap2 88, ap8 62, ap10 46, ap15 78: alle PASS.
**Bekannte Altfehler unverändert (identische FAIL-Listen, keine neuen Fehler):** ap9 7, ap11 1, ap12 2, ap13 1, ap14 11, ap16 4.

## Nicht getestet / NICHT bestanden gemeldet
Echte Geräte (iPhone Safari, Android Chrome, iPad), Kamera-/Hardware-Scanner, AirPrint und automatischer Druck aus Safari: nicht geprüft. Emulation ersetzt keinen Gerätetest.

## Einschränkungen
Siehe `docs/SA-16a-mitarbeiterportal.md` (keine Synchronisierung, keine echte Authentifizierung, Schutz nur gegen Fehlbedienung).

## Nachtrag: Textkorrektur Bestandshinweis
Im Portal entfällt im Demo-Bestandshinweis der Satz „Über „Regale“ ein- und ausschalten.“ (Verwaltungs-Umschalter dort nicht sichtbar); die Verwaltung zeigt den Hinweis unverändert. Neue Prüfungen 4 und 6: PASS. Portal-Suite 102/102, SA-15-Suite 81/81 PASS.

## Nachtrag 2: Mitarbeiter-Testdemo in „Mehr“
Neu: Eintrag „Mitarbeiter-Testdemo“ in „Mehr“, Rückweg „← Zur Verwaltung“ im Portal (nur bei Einstieg aus der Verwaltung). Neue Prüfungen (Block 12, 20 Stück): Eintrag vorhanden, Navigation unverändert, Auswahl Max/Peter/Leon (auch bei altem Tab-Merker), Geräteauswahl, Rückweg sichtbar (Anmeldung, Startseite, Unterbereich, nach Neuladen), Rückkehr in normale Verwaltung, Lagerdaten byte-identisch, Aufträge unverändert, separate Portal-Adresse unverändert, iPhone 14 / Pixel 7 / iPad Pro 11 (Emulation), keine JS-Fehler: alle PASS.
Regression erneut: SA-15 81/81, Äquivalenz 85/85, ap1/ap1c/ap2/ap8/ap10/ap15 PASS; Altfehler unverändert (ap9 7, ap11 1, ap12 2, ap13 1, ap14 11, ap16 4, identische Listen).
Design: Die beiden freigegebenen Designbilder liegen nicht vor; die visuelle Anpassung ist **nicht** umgesetzt und nicht als bestanden gemeldet. Echte Gerätetests weiterhin offen.

## Nachtrag 3: Design und Rückweg (Auftrag mit Designbildern)
Umgesetzt: Kopfzeile/Karten/Kacheln nach Konzeptbildern (nicht pixelgenau), Eintrag in „Mehr“ als Zeile mit Symbol und Pfeil, Abmeldung-erfolgreich-Ansicht. „Zur Verwaltung“ beendet nur die Demo-Mitarbeitersitzung (getestet, auch dass eine bestehende Verwaltungs-Anmeldung unberührt bleibt). Portal-Suite 126/126 PASS (inkl. Block 12 mit Wechsel Verwaltung → Demo → Portal → Verwaltung, erneutem Einstieg, Mobil-Emulation). Regression unverändert: SA-15 81/81, Äquivalenz 85/85, ap1/ap1c/ap2/ap8/ap10/ap15 PASS, Altfehler identisch (ap9 7, ap11 1, ap12 2, ap13 1, ap14 11, ap16 4).
Sichtprüfung per Screenshot (Emulation iPhone 14, iPad Pro 11). Echte Geräte (Safari/Android), Kamera/Scanner, AirPrint: weiterhin NICHT getestet.

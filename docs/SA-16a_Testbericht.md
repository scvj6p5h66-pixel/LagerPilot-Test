# SA-16a – Testbericht (Mitarbeiterportal, Phase 1)

Basis: development 1c7af217d5e6d8d1ae3f83c096d743a3fc67270f. Test: Playwright/Headless-Chromium (Emulation), lokaler Server.

## Neue Portal-Suite `tests/portal/sa16a-mitarbeiterportal.js`: 102 Prüfungen, 102 PASS, 0 FAIL
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

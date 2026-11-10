# Bekannte Auffälligkeiten und offene Prüfungen

Stand: November 2026, Branch `development`. Dies ist **keine** Liste ausschließlich bestätigter Fehler: Manche Punkte sind offene Anforderungen oder noch nicht erneut getestet.

| Thema | Stand / nächste Prüfung |
|---|---|
| AP0-b CSS-Auslagerung | Auf `development` umgesetzt; visueller Browser-/Mobiltest nach der Auslagerung ausstehend. |
| Mehrere Tabs | Konflikterkennung für Kommissionierdaten vorhanden; Verhalten nach der letzten Korrektur erneut testen. Lagerbestandsdaten (`state`) nicht entsprechend geschützt. |
| Mehrere Geräte | Keine zentrale Synchronisierung; `localStorage` ist geräte-/browserlokal. |
| Scanner und Kamera | Handscanner-Eingabe und wiederholte Platzcodes wurden im Headless-Browser geprüft; echtes iPhone, iPad und echter Scanner noch offen. |
| Abschlusskontrollen | Scanpflicht, Pausenstatus und Reparaturmarkierung wurden im Code nachgebessert; vollständiger Regressionstest steht aus. |
| Gewichtstoleranz / Selbstfreigabe | Rundungsgrenze und Groß-/Kleinschreibung nachgebessert; Browsertest ausstehend. |
| Demo-Lagerplätze | Frühere Prüfungen zeigten mehrfach denselben Lagerplatz bei Demo-Positionen; Datenverteilung prüfen. |
| Import-Backup | Format der Sicherung vor Import aus AP0-a als möglicherweise unbrauchbar gemeldet; noch offen. |
| Artikel-Scanner | Mögliches Überschreiben von Artikelnummer/Name im Artikelformular laut AP0-a; noch offen. |
| Wareneingang | `loadCheck` könnte Wareneingang ohne Ladungsdaten blockieren; noch offen. |
| Inventur | Inventur ohne Differenz könnte ohne Protokolleintrag bleiben; noch offen. |
| Speichertrennung | Prüfen, ob Test- und Hauptanwendung bei gleicher Herkunft lokale Speicherschlüssel teilen. Migration nur mit Datensicherung. |
| CSS-Selektoren | AP0-a meldet `#pick` statt `#picking` in einigen Mobil-/Druckregeln; noch gezielt prüfen. |

Die ursprüngliche AP0-a-Liste bezog sich auf einen älteren Codezustand. Mehrere damals gemeldete Kommissionier- und Scannerpunkte wurden zwischenzeitlich verändert und dürfen nicht ungeprüft als weiterhin offen bezeichnet werden.

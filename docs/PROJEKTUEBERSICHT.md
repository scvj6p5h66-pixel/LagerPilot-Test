# Projektübersicht – LagerPilot-Test

Stand: `development`, November 2026. Diese Übersicht beschreibt den aktuellen Entwicklungsstand, nicht den stabilen `main`-Branch.

## Aktueller Aufbau

- `index.html`: HTML und JavaScript der Anwendung, Navigation, Lagerverwaltung und Kommissionierung.
- `styles/01-basis.css` bis `styles/07-gewicht.css`: ausgelagerte CSS-Regeln; Reihenfolge der Einbindung ist für das Layout entscheidend.
- `docs/`: Projektübersicht, Regalstruktur und Fehler-/Testliste.
- `README.md`: kurze Repository-Beschreibung.

## Funktionsbereiche

Start, Scanner, Artikelbestand, Anbruchsboxen, Buchen, Regale, Artikel, Inventur, weitere Verwaltung, Auftragsverwaltung und Mitarbeiter-Kommissionierung. Die Kommissionierung unterstützt die Reihenfolge Lagerplatz-QR → Artikelbarcode, manuelle/Handscanner-Eingabe mit Enter, Mengenbestätigung, Abweichungsfreigabe, Gewichtskontrolle und Belegdruck.

## Wichtige technische Funktionen

- Lager: `valid`, `migrate`, `persist`, `transaction`, `canonicalPlace`, `resolve`, `renderRack`.
- Scanner: `startCamera`, `stopCamera`, `handleScan`.
- Kommissionierung: `pickLoad`, `pickEnsureLines`, `pickSave`, `pickAcceptScan`, `pickWeightCheck`, `pickComplete`, `pickPrintReceipt`, `pickWorkerRender`, `pickRender`.

## Datenhaltung und Einschränkungen

Der Teststand verwendet browserlokales `localStorage`. Für Kommissionierdaten gibt es eine Mehr-Tab-Konflikterkennung; eine gemeinsame Synchronisierung über mehrere Geräte ist **nicht** implementiert. Auch die Bestandsdaten sind dadurch nicht gegen konkurrierende Änderungen in mehreren Tabs abgesichert. Die Kamera lädt `html5-qrcode` über einen externen Dienst nach und benötigt dafür Netzwerkzugriff.

## Zielbild (noch nicht umgesetzt)

Eine weitere modulare Trennung von JavaScript, Datenmodell, Benutzeroberfläche und gemeinsamen Diensten ist für spätere Ausbaustufen vorgesehen. Die CSS-Auslagerung ist bereits erfolgt, die JavaScript-Auslagerung nicht. Änderungen werden zuerst auf `development` geprüft und erst nach Freigabe nach `main` übernommen.

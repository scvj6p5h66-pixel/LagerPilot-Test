# LagerPilot – Kommissionierschein beim Auftragsabschluss

Status: freigegebene Designvorlage, technische Integration noch offen.
Referenz: im Chat am 12.11.2026 erzeugte A4-Vorschau „Kommissionierschein / Auftragsabschluss“.
Dieser Branch basiert auf sa-14-performance-optimierung. Keine Änderungen an main/development.

## Gewünschtes Ergebnis
Eine echte, druckoptimierte A4-Ansicht (keine statische Bilddatei) im Stil der freigegebenen Vorschau. Sie wird mit den realen Daten des jeweiligen Auftrags befüllt, nach erfolgreicher Gewichtskontrolle angezeigt und ist später erneut aufrufbar/druckbar.

## Datenfelder
- LagerPilot-/IntraBold-Branding; Auftragsnummer, Auftragstyp, Kunde/Bereich sofern im Datenmodell vorhanden, Priorität sofern vorhanden
- Status, Abschlusszeitpunkt, Kommissionierer und Scanner/Gerät sofern erfasst
- Positionen: Artikelnummer, Artikelbezeichnung, Lagerplatz, Sollmenge, tatsächlich entnommene Menge, Abweichung, Einzelgewicht und Positionsgewicht
- Summen: Positionen, Mengen, Warengewicht
- Gewichtskontrolle: berechnetes Warengewicht, erfasstes Verpackungs-/Palettengewicht, erwartetes Bruttogewicht, tatsächliches Waagengewicht, Differenz, zulässige Toleranz und Prüfergebnis
- Verpackung/Versand: Palettentyp (Europalette oder kleine Einwegpalette), Packstücke, Palettengewicht; Maße/Volumen nur wenn tatsächlich erfasst
- Bemerkungen, Barcode/QR-Code mit korrekter Auftragskennung nur wenn technisch zuverlässig generierbar
- Unterschriftsfeld nur als leeres Feld; keine erfundene Signatur

## Schutz und Verhalten
- Beispielwerte der Vorschau (z.B. AU-2026-001458, Max Mustermann, 71,40 kg) sind Platzhalter und dürfen niemals als echte Auftragsdaten gespeichert werden.
- Abschluss nur bei erfolgreicher Gewichtskontrolle oder ausdrücklich dokumentierter, berechtigter Freigabe einer Abweichung; keine Umgehung bestehender Validierungen.
- Keine erneute Bestandsabbuchung beim Anzeigen oder Nachdrucken.
- Bestehende Aufträge, Artikel, Bestände, Boxen, QR-Codes, Import/Export und Altdaten unverändert erhalten.
- Mobil gut lesbare Abschlussansicht; A4-Druckansicht ohne Navigationsleisten; lange Aufträge über mehrere Seiten sauber umbrechen.
- Kein externer Netzwerkdienst für personenbezogene Auftragsdaten oder Barcodes ohne gesonderte Freigabe.

## Tests vor Integration
- Auftrag mit mehreren Positionen, unterschiedlichen Mengen und Lagerplätzen
- Erfolgreiche Gewichtskontrolle, unzulässige Abweichung, erlaubte Freigabe
- Europalette und kleine Einwegpalette
- Fehlende optionale Daten, Altdaten, lange Artikelbezeichnungen und mehrseitige Aufträge
- Erneutes Drucken ohne Bestandsänderung, Browserdruck, iPhone-Ansicht
- Regression für Kommissionierung, Gewichtskontrolle, Bestände, Import/Export

## Freigabeprozess
Implementierung und Tests zunächst nur auf diesem Feature-Branch. Kein Merge nach development oder main ohne ausdrückliche Nutzerfreigabe.

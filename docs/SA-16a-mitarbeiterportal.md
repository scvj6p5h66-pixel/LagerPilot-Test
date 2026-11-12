# SA-16a – Mitarbeiterportal, Phase 1 (Grundstruktur und mobiler Einstieg)

## Einstieg
- `index.html?portal=mitarbeiter` startet den Portal-Modus der bestehenden Anwendung (keine zweite Kopie).
- `mitarbeiter.html` ist nur ein Direktzugang und leitet auf diesen Link weiter.
- Ohne den Parameter startet unverändert die Verwaltungsoberfläche.

- **Aus der Verwaltung:** „Mehr“ → „Mitarbeiter-Testdemo öffnen“ lädt dieselbe Seite als `index.html?portal=mitarbeiter&from=verwaltung` im selben Tab (gleicher Speicher, keine Datenänderung). Der Tab-Merker der Demo-Identifikation wird dabei gelöscht, damit die Auswahl Max/Peter/Leon immer erscheint. Mit `from=verwaltung` zeigt die dunkelblaue Kopfzeile des Portals den Rückweg „← Zur Verwaltung“. Ein Klick beendet **ausschließlich die Demo-Mitarbeitersitzung** (nur wenn im Portal angemeldet; eine bestehende Test-Anmeldung der Verwaltung bleibt unberührt), zeigt kurz „Abmeldung erfolgreich“ und leitet nach ca. 1,5 s (oder per Button) zur Verwaltung. Aufträge, Bestände und alle übrigen Daten bleiben unverändert; ein erneuter Demo-Einstieg zeigt wieder die Mitarbeiterauswahl. Die separate Portal-Adresse ohne `from` hat keinen Rückweg.

## Ablauf
1. **Demo-Anmeldung:** Max, Peter oder Leon wählen; das bisherige Gerät (Scanner 1/2/3) ist vorausgefüllt und frei wählbar.
2. **Startseite:** genau vier Kacheln – Meine Aufträge, Artikelbestand, Regalansicht, Scanner – und ein unauffälliger Bereich „Weitere Funktionen“ (nur Hinweis, keine Buchungsschaltflächen; Wareneingang/Ausbuchung/Umlagerung folgen in SA-16d).
3. **Zurück zur Startseite:** jeder Bereich hat einen Zurück-Knopf; „Wechseln“ beendet die Demo-Identifikation und führt zur Anmeldung.

Die Kacheln öffnen die vorhandenen Bereiche (Mitarbeiter-Kommissionierung, Bestandsübersicht, Regalansicht Hallen 4A/4B, Barcode-/QR-Suche). Auftragslogik, Gewichtskontrolle und SA-15 sind unverändert.

## Schutz vor Fehlbedienung (keine Sicherheitsfunktion)
Im Portal-Modus werden gesperrt: Artikelstammdaten, Auftragsverwaltung, Import/Export/Reset, Benutzerverwaltung, Inventur, Buchen/Zusammenführen sowie QS- und technische Lagerplatzsperren.
Umsetzung: `tab()` lässt nur Portal-Bereiche zu; Verwaltungsbereiche sind per CSS ausgeblendet und mit `inert` gesperrt; schreibende Bedienelemente in den Platzdetails werden entfernt.

**Wichtig – Grenze:** Das ist ausschließlich ein Schutz vor Fehlbedienung. Wer den Link ohne `?portal=…` öffnet, die Browser-Konsole oder den Browserspeicher benutzt, umgeht ihn. Es gibt keine echte Zugriffssicherheit.

## Daten
- Speicherschlüssel `lagerpilot_v2_7` und `lagerpilot_pick_demo_v1` sowie das Datenformat sind unverändert; keine Migration, keine Rücksetzung.
- Die Portalnutzung (Ansehen, Suchen, Scannen, Wechseln) schreibt keine Lagerdaten. Die Demo-Anmeldung speichert wie die bisherige Test-Anmeldung nur Mitarbeiter/Sitzung im Kommissionierspeicher.
- Neu: ein Marker `lagerpilot_portal_user` im **sessionStorage** (nur der aktuelle Tab, keine Lagerdaten), damit eine Neuladung im selben Tab angemeldet bleibt; ein neuer Tab verlangt wieder die Anmeldung.

## Bekannte Grenzen
- Keine automatische Synchronisierung zwischen Geräten (Daten liegen lokal pro Browser/Adresse).
- Keine echte Authentifizierung; die Anmeldung ist nur eine Demo-Identifikation (bewusst ohne PIN).
- Keine serverseitigen Berechtigungen, keine zentrale Datenbank, keine produktive Mehrbenutzerfähigkeit.
- Das Regalraster scrollt bei schmalen Displays waagerecht in seinem eigenen Container (Seite selbst ohne Überlauf); Plätze sind im Portal 44 px hoch.
- Öffnet ein Mitarbeiter „Meine Aufträge“, erzeugt die bestehende Kommissionierung wie in der Verwaltung die Positionen eines ihm zugewiesenen Auftrags (bestehendes Verhalten, getestet als identisch).

## Design (nach den freigegebenen Konzeptbildern)
Dunkelblaue Kopfzeile (Marke, Kontext „Mitarbeiter-Testdemo“ bzw. „Mitarbeiter-Portal · Name“, Rückweg, Benutzer-Chip zum Wechseln), heller Hintergrund, weiße Karten mit dezenter blauer Umrandung. Auswahlkarten für Max/Peter/Leon, Startseite „Hallo <Name>!“ mit vier Karten (Symbolfarben blau/grün/violett/orange), Hinweisfeld „Weitere Funktionen“, Eintrag „Mitarbeiter-Testdemo“ in „Mehr“ im Stil von Designbild 2. Die Bilder wurden als Gestaltungsreferenz genutzt, nicht pixelgenau nachgebaut; bewusst nicht übernommen: erfundene Rollenbezeichnungen unter den Namen, Beispielaufträge/-kunden, Umbau der Verwaltungsnavigation, vollflächig farbige Kacheln (Vorgabe „weiße Funktionskarten“).

# SA-12c – Abschlussprüfung

Getestet: Branch `feature/sa-12c-nachweis` (Commit 5565f43 = `development` 9b6115a + Nachweistest; Anwendungscode identisch mit `development`). Keine Änderung am Anwendungscode.

## 1. Zwei-Tab-Test (`tests/articles/sa12c-zwei-tabs.js`, 12 Prüfungen, 12 PASS)
Zwei Tabs im selben Browser (gemeinsamer localStorage).
- Tab A und B öffnen denselben Artikel; A speichert; B speichert danach seine veraltete Version → **abgewiesen** („Lagerdaten wurden in einem anderen Tab geändert. Deine Änderung wurde NICHT gespeichert. Bitte Seite neu laden …“). Der Speicher bleibt byteidentisch mit dem Stand von A. Es geht keine Änderung unbemerkt verloren.
- Tab B zeigt zuvor automatisch ein Warnbanner („…möglicherweise veraltete Bestände. Bitte Seite neu laden“).
- Nach Neuladen sieht B die Änderung von A und kann speichern, ohne sie zu verlieren.
- Ebenfalls abgewiesen: B ändert einen anderen Artikel (grobe Sperre), beide legen dieselbe neue Artikelnummer an (es bleibt genau der Artikel von A), B bucht Bestand.
- Import im veralteten Tab ersetzt den Bestand bewusst (Wiederherstellung); die Sicherung „vor Import“ wird angelegt und enthält den vorherigen Stand.
Ursache des Schutzes: `persist()` vergleicht beim Speichern den Speicherinhalt mit dem beim Laden gemerkten Stand (`inventoryStorageSnapshot`); alle Schreibpfade laufen darüber.

Beobachtungen (keine Fehler, nur Hinweise):
- Das Schutzverfahren ist grob: Jede Änderung in einem anderen Tab blockiert veraltete Tabs komplett, auch bei verschiedenen Artikeln. Eigene Eingaben im veralteten Tab müssen nach dem Neuladen neu eingegeben werden.
- Die Ansicht in B aktualisiert sich nicht von selbst, nur das Banner erscheint.
- Nicht getestet: zwei verschiedene Browser/Geräte (haben getrennten Speicher, kein gemeinsamer Zustand).

## 2. Regressionstests (Stand 9b6115a-Code, Ports 8123/8124)
| Suite | PASS | FAIL |
|---|---|---|
| ap1 | 59 | 0 |
| ap1c | 25 | 0 |
| ap2 | 88 | 0 |
| ap8 | 62 | 0 |
| ap9 | 44 | 7 |
| ap10 | 46 | 0 |
| ap11 | 172 | 1 |
| ap12 | 43 | 2 |
| ap13 | 66 | 1 |
| ap14 | 70 | 11 |
| ap15 | 78 | 0 |
| ap16 | 50 | 4 |
| Equivalence | 85 | 0 |
| SA-15 Kommissionierschein | 81 | 0 |
| Mitarbeiterportal | 126 | 0 |
| SA-12c-Nachweis | 43 | 0 |
| **Summe** | **1.138** | **26** |
Die 26 FAIL sind in Anzahl und Namen **identisch mit der früheren Baseline** (ap9 7, ap11 1, ap12 2, ap13 1, ap14 11, ap16 4); keine neuen Fehler. Stichproben:
- ap13/ap14 „Min > Max → abgelehnt“ (Neu 10>5, Praxisfall 500/100, A2 101>100): veraltete Erwartung; die Regel wurde mit SA-12c bewusst entfernt.
- ap14 „Home zeigt Mindestbestand-Warnung für LM“: Test sucht „LM“ im Text, die Startseite zeigt nur „⚠ n Artikel unter Mindestbestand“ (Berechnung Min vs. Gesamtbestand korrekt).
- ap16 „Bearbeiten-Button Tap-Ziel ≥ 32 px“: Button 30 px hoch (Layout, kein Datenrisiko).
- ap16 „Edit-Modus + A1 per Import entfernt“: der Import greift im Test nicht (A1 bleibt vorhanden), die Annahme des Tests ist damit nicht gegeben; Ursache nicht abschließend geklärt. Das Reload-Szenario deckt ap16b ab (A1 wird nicht neu angelegt).
- Übrige (Meldungstexte der Barcode-Warnung, Bezeichnungslänge, reservierte Namen) nicht einzeln neu bewertet.
Gegenüber der Baseline geändert: ap16 durchläuft jetzt 14 statt 11 Tabs (Portal-Tabs aus SA-16a), Ergebnis unverändert PASS.
Hinweis: Das ap-Set ist der bisher verwendete Regressionsumfang; weitere vorhandene Einzelskripte (z. B. ap17–ap22) gehören nicht zum Standardlauf.

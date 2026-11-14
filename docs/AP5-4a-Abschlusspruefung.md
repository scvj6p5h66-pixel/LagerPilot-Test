# AP5.4a – Abschlussprüfung (Barcode-Zuordnung, Vergleichsserver, Endtests)

Basis: `feature/ap5-4-testbereinigung` @ 95529eb. Prüfbranch: `feature/ap5-4a-abschlusspruefung`.
**Anwendungscode unverändert** (`git diff 95529eb -- index.html styles` leer). Kein Merge, keine Veröffentlichung.
Echtgeräte-Tests (iPhone Safari, Android, AirPrint, Kamera, Scanner-Hardware) wurden **nicht** durchgeführt; alles unten ist Playwright/Chromium-Emulation.

## 1. Barcode-Zuordnung (früher: Test akzeptiert „A1 oder L2“)

**Ursache.** Im Test ap13 ändert ein früherer Schritt den Barcode von A1 auf eine 64-stellige Zahl. Zum Zeitpunkt der Prüfung trägt nur noch L2 (`bc1`) den Barcode „BC1“ (Schreibweise-Variante). Die App nennt daher zu Recht L2. Meine frühere Begründung („zwei berechtigte Besitzer“) war falsch; die Aufweichung auf „A1 oder L2“ war unnötig und hat die tatsächliche Ursache verdeckt.
**Korrektur.** Die Erwartung wird jetzt aus dem Speicher berechnet (genau ein Besitzer → dessen Nummer wird verlangt). Zusätzlich im frischen Zustand: „BC1“ → A1, „bc1“ → L2 (keine Verwechslung), Scanner-Tab mit zustandsabgeleitetem Orakel. ap13: 67 → 71 PASS / 0 FAIL, strenger als vorher.

**Antworten auf die Prüffragen** (Test `tests/barcode/ap54a-barcode-zuordnung.js`, 31 PASS / 0 FAIL / 4 Befunde):
| Frage | Ergebnis |
|---|---|
| Können zwei Artikel denselben Barcode haben? | Über die Oberfläche **nein**: Neuanlage und Bearbeitung lehnen exakte und Groß-/Kleinschreib-Dubletten ab. **Ja** über Import einer Sicherung oder Altbestand (Import prüft Eindeutigkeit nicht; BEFUND 1). Altartikel mit Schreibvariante (A1 „BC1“ / L2 „bc1“) bleiben speicherbar, nichts wird automatisch korrigiert. |
| Ist die Zuordnung eindeutig? | Scanner-Tab: ja (exakter Vergleich; bei mehreren Treffern Meldung „mehrfach vergeben“). Kommissionierung: ja, falscher Artikel wird immer abgelehnt („Falscher Artikel!“). |
| Wird Mehrdeutigkeit angezeigt? | Scanner-Tab ja. **Nein** bei: Inventur-Artikelscan und Bestandssuche (wählen still den ersten Treffer, zeigen aber dessen Namen; BEFUND 3) und Artikelformular-Scan (nennt den ersten Treffer der Liste, reihenfolgeabhängig; BEFUND 2; es wird nichts gespeichert). |
| Risiko falscher Artikelwahl? | Nur bei bereits vorhandenen exakten Dubletten (Import/Altdaten) in Inventur-Scan/Bestandssuche. Die Pickliste ist nicht betroffen. |

**Offene Punkte / Vorschläge (nicht umgesetzt, brauchen Freigabe):** (a) Import: Warnung bei doppelten Barcodes, (b) Mehrdeutigkeitsmeldung in Inventur-Artikelscan, Bestandssuche und Artikelformular-Scan.

## 2. Vergleichsserver – Nachweis
Datei `docs/ap54a-logs/server-nachweis.txt`. SHA-256 der ausgelieferten `index.html` je Port gegen `git show <Commit>:index.html`:
| Port | Verzeichnis | Commit | Ergebnis |
|---|---|---|---|
| 8123 | wt_ap53 | 95529eb | identisch (178.243 Byte, readQty ×5) |
| 8124 | old_e03c6dd | e03c6dd | identisch (142.909 Byte, readQty ×0, kein Groß-/Klein-Text) |
| 8130 | base0 | 1c01db1 | identisch (174.628 Byte, readQty ×0) |
Auch alle Dateien unter `styles/` stimmen mit dem jeweiligen Commit überein. Die drei Stände sind verschieden (`git diff --stat e03c6dd 95529eb -- index.html`: 229 Zeilen neu / 42 entfernt).
Die Vergleichsmatrizen in ap13/ap14 zeigen echte Unterschiede alt/neu (z. B. L2:barcodeBC1: alt „abgelehnt“, neu „abgelehnt: Artikelnummer oder Barcode ist bereits einem anderen Artikel zugeordnet“; `PASS JS Matrix old/new`).
**Korrektur früherer Angabe:** In den AP5.3/5.3b-Läufen lieferte Port 8124 den aktuellen Stand, der damalige Alt/Neu-Vergleich war wirkungslos. Seit AP5.4 (und jetzt nachgewiesen) ist er e03c6dd.

## 3. Endtests (aktueller Stand 95529eb + Teständerungen, volle Läufe in `docs/ap54a-logs/`)
| Suite | Basis | Jetzt |
|---|---|---|
| Kern-Regression (ap1–ap16, equiv, sa15, portal, sa12c) | 1.168/1.168 | **1.172 PASS / 0 FAIL** (+4 = neue strenge Prüfungen in ap13) |
| Import/Export | 74/74 | 74 / 0 |
| AP5.3b | 1.051/1.051 | 1.051 / 0 |
| AP5.1 / AP5.2 | 77 / 238 | 77 / 238, 0 FAIL |
| zwei-tabs / Diagnose / ap7e | 12 / 18 / 66 | 12 / 18 / 66, 0 FAIL |
| Barcode-Zuordnung (neu) | – | 31 PASS / 0 FAIL / 4 Befunde |
Gesamt 2.708 PASS / 0 FAIL über alle Logs (ohne den Barcode-Test). Keine Tests gelöscht, übersprungen oder abgeschwächt.

## 4. Verbleibende Risiken
1. Exakte Barcode-Dubletten via Import/Altdaten: stille Wahl des ersten Treffers (Inventur, Bestandssuche).
2. Import validiert Barcode-Eindeutigkeit nicht.
3. Sicherung vor Import ist ein einziger Speicherplatz (wird bei jedem Import überschrieben); die heruntergeladene Datei ist der echte Rückweg.
4. Echtgeräte-Tests offen.

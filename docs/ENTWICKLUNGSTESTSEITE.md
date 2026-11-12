# Entwicklungstestseite (development auf dem iPhone testen)

Stand der Prüfung: 2026-11-12, development = 9b6115a (SA-16a).

## Ausgangslage (geprüft)
- GitHub Pages veröffentlicht den Branch **main** (Deployments der Umgebung `github-pages` laufen ausschließlich mit Ref `main`; der einzige Workflow ist der Standard-`pages-build-deployment`; eigene Workflows gibt es nicht). Die Pages-Einstellungen selbst waren von der Prüfumgebung aus nicht lesbar (API gesperrt); „Quelle = Branch main“ ist aus den Deployments abgeleitet und sollte in *Settings → Pages* gegengeprüft werden.
- Die bisherige iPhone-Testseite liegt als Ordner `test/` **in main** (Version 2.7.2, SA-12c) und isoliert ihre Daten über einen Speicher-Präfix `lagerpilot_iphone_test::`.
- GitHub Pages kann pro Repository nur **eine** Quelle (ein Branch bzw. ein Workflow-Artefakt) veröffentlichen. development kann deshalb nicht zusätzlich unter einem eigenen Pfad veröffentlicht werden, ohne main zu ändern oder die Pages-Quelle umzustellen.

## Datentrennung (wichtig)
Der Browser-Speicher gilt pro **Origin** (Schema + Host), nicht pro Pfad. Alle Seiten unter `scvj6p5h66-pixel.github.io` – Hauptseite, `/test/`, jedes weitere Repository – teilen sich denselben localStorage. Die App verwendet feste Schlüssel (`lagerpilot_v2_7`, `lagerpilot_pick_demo_v1`, …). Eine neue Seite unter dieser Adresse **ohne** Schutz würde dieselben Daten lesen und überschreiben.
Schutz: Die gebaute Testseite stellt dem Anwendungscode ein Skript voran, das `localStorage`/`sessionStorage` durch Wrapper mit dem Präfix **`lagerpilot_devtest::`** ersetzt. Der Quellcode der App und seine Schlüssel bleiben unverändert; nur die gebaute Kopie ist umgeleitet. Nachgewiesen (Test `tests/devtest/devtest-build.js`): fremde Daten bleiben byte-identisch, die Testseite sieht sie nicht, die Hauptseite sieht keine Testdaten, und es entstehen keine unpräfixierten Schlüssel.
Hinweis: Alle Seiten derselben Origin teilen sich das Speicherkontingent des Browsers (ca. 5 MB) und die Safari-Regel zur Löschung nach längerer Nichtnutzung.

## Lösungsvarianten
| Variante | Einstellungsänderung | Risiko für bestehende Seite | Bewertung |
|---|---|---|---|
| **A. Eigenes kleines Pages-Repository (empfohlen)**, z. B. `LagerPilot-Dev-Test`; Inhalt = gebaute Kopie von development | nur ein neues Repository + dessen Pages (Quelle `main`, Ordner `/`); `LagerPilot-Test` bleibt unangetastet | keines (Pages-Deployments getrennt); Datentrennung über Präfix | einfach, kostenlos, wiederverwendbar |
| B. Pages-Quelle von `LagerPilot-Test` auf „GitHub Actions“ umstellen, Workflow veröffentlicht main unverändert + `dev/` | ändert die Pages-Quelle, Umgebungsregeln `github-pages` (Branch-Schutz) müssen angepasst werden | mittel: ein fehlerhafter Workflow kann die bestehende Testseite offline nehmen | nicht empfohlen |
| C. Build in `main` unter `/dev/` einchecken | keine | verändert main – **ausgeschlossen** | nein |
| D. Cloudflare Pages | externes Konto | – | vom Auftraggeber verworfen |

## Empfohlene Lösung A – Schritte (noch nicht ausgeführt, Freigabe nötig)
1. Neues **öffentliches** Repository `scvj6p5h66-pixel/LagerPilot-Dev-Test` anlegen (leer, Standardbranch `main`). Kein Zugriff auf `LagerPilot-Test`-Einstellungen nötig.
2. In einer Kopie von development (Branch development, Stand freigegeben) bauen:
   `node tools/build-dev-testseite.js ../LagerPilot-Dev-Test-site "Stand development @ <Commit>"`
3. Inhalt des Zielordners (index.html, styles/, mitarbeiter.html, .nojekyll, build-info.json) in das neue Repository committen und auf `main` pushen.
4. Im neuen Repository *Settings → Pages → Deploy from a branch → main /(root)* aktivieren.
5. iPhone-Adresse: `https://scvj6p5h66-pixel.github.io/LagerPilot-Dev-Test/` (Mitarbeiter-Testdemo: „Mehr“ → „Mitarbeiter-Testdemo“; Direktlink `…/?portal=mitarbeiter`). Der orange Balken unter der Kopfzeile nennt den gebauten Stand und den Speicher-Präfix.
6. Spätere Phasen: Schritt 2–3 wiederholen (die Adresse bleibt gleich; Testdaten bleiben im Präfix-Speicher erhalten). Optional kann ein Workflow in `LagerPilot-Test` den Build bei jedem Push auf development automatisch in das Dev-Repository schreiben; das braucht ein Zugriffs-Token als Secret und ist nicht Teil dieser Vorbereitung.
7. Echte Lagerdaten in die Testseite übernehmen: Export-JSON von der anderen Seite herunterladen und in der Testseite über „Mehr“ importieren (kopiert, ändert die Quelle nicht).

## Grenzen
- Die Seite ist öffentlich erreichbar (nur Demo-/Testdaten verwenden); GitHub Pages hat keinen Zugriffsschutz.
- Keine Synchronisierung zwischen Geräten: jedes Gerät/jeder Browser hat eigenen Testspeicher.
- Der Speicher-Wrapper wurde nur in Chromium-Emulation getestet; die bestehende Testseite `/test/` nutzt dieselbe Technik. Safari/WebKit auf einem echten iPhone ist **nicht** getestet.
- Die Veröffentlichung selbst ist noch nicht erfolgt; es gibt noch keine erreichbare Adresse.

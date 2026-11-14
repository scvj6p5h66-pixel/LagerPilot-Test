# Archivkopien der Regressionsskripte (AP5)

Diese Skripte (ap1–ap22, Hilfsskripte, `lib.js`) lagen bisher nur lokal im Arbeitsverzeichnis und wurden hier zur Nachvollziehbarkeit abgelegt.
Sie sind **nicht** aufgeräumt: Sie erwarten die App unter `http://localhost:8123/index.html` (`lib.js`), ap21 zusätzlich den Stand 8fde636 auf Port 8125,
einige schreiben nach `/tmp`, und die Läufer (`run_*.sh`) enthalten absolute Pfade der Arbeitsumgebung.
Aufruf je Skript: `cd tests/regression-archiv && node ap14.js`. Ergebnisse und Bewertung: `docs/AP5-Analysebericht.md`, Logs: `docs/ap5-logs/`.
Hinweis: Vor AP5.4 enthielten mehrere Skripte veraltete Erwartungen (siehe Bericht, Kategorie A); sie wurden in AP5.4 bereinigt.
Explorationsskripte (a*, k*, m*, n*, q*, r*, s*, t*, u*, dbg*) sind hier nicht enthalten.

## Stand AP5.4 (Testbereinigung)

- Die Regressionsskripte laufen jetzt vollständig aus diesem Verzeichnis: `lib_old.js` (Vergleichsstand für ap13/ap14, Port 8124) wurde ergänzt.
- Läufer: `run_regression_ap54.sh <Ausgabeverzeichnis>`. Ports: 8123 = zu prüfender Stand (Repo-Wurzel), 8124 = Stand e03c6dd (`git archive e03c6dd`, "alter Stand" der Matrix in ap13/ap14), 8130 = Stand 1c01db1 (nur ap53b-Desktopvergleich).
- ap9, ap11, ap12, ap13, ap14, ap16 und `tests/ap5/ap7-edit-modus.js` wurden korrigiert (Begründung je Fehler: `docs/AP5-4-Testbereinigung.md`). Die Aussage oben „bekannte veraltete Erwartungen“ gilt damit nicht mehr.

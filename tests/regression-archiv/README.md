# Archivkopien der Regressionsskripte (AP5)

Diese Skripte (ap1–ap22, Hilfsskripte, `lib.js`) lagen bisher nur lokal im Arbeitsverzeichnis und wurden hier zur Nachvollziehbarkeit abgelegt.
Sie sind **nicht** aufgeräumt: Sie erwarten die App unter `http://localhost:8123/index.html` (`lib.js`), ap21 zusätzlich den Stand 8fde636 auf Port 8125,
einige schreiben nach `/tmp`, und die Läufer (`run_*.sh`) enthalten absolute Pfade der Arbeitsumgebung.
Aufruf je Skript: `cd tests/regression-archiv && node ap14.js`. Ergebnisse und Bewertung: `docs/AP5-Analysebericht.md`, Logs: `docs/ap5-logs/`.
Mehrere Skripte enthalten bekannte veraltete Erwartungen (siehe Bericht, Kategorie A) und dürfen nicht als Sollzustand gelesen werden.
Explorationsskripte (a*, k*, m*, n*, q*, r*, s*, t*, u*, dbg*) sind hier nicht enthalten.

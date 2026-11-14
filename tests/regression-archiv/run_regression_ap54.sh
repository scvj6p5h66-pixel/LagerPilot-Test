#!/bin/bash
# AP5.4 – vollständige Regression aus dem Repository (nur committete Testdateien).
# Voraussetzung: Port 8123 = zu prüfender Stand (Repo-Wurzel), Port 8124 = Vergleichsstand e03c6dd (für ap13/ap14, "alter Stand").
#   Port 8130 = Stand 1c01db1 (nur für den Desktop-Vergleich in ap53b: git archive 1c01db1).
#   (cd <repo> && python3 -m http.server 8123 &) ; git archive e03c6dd | tar -x -C <dir> && (cd <dir> && python3 -m http.server 8124 &)
# Aufruf: tests/regression-archiv/run_regression_ap54.sh <Ausgabeverzeichnis>
OUT=${1:?Ausgabeverzeichnis fehlt}; mkdir -p "$OUT"; ROOT=$(cd "$(dirname "$0")/../.." && pwd); B=http://localhost:8123
cd "$ROOT/tests/regression-archiv"
for s in ap15 ap1 ap1c ap2 ap8 ap10 ap11 ap9 ap12 ap13 ap14 ap16b ap16; do [ -f $s.js ] || continue; timeout 900 node $s.js > "$OUT/$s.log" 2>&1; echo "exit $?" >> "$OUT/$s.log"; done
cd "$ROOT"
run(){ n=$1; shift; timeout 900 "$@" > "$OUT/$n.log" 2>&1; echo "exit $?" >> "$OUT/$n.log"; }
run equiv node tests/unit/suggestions-equivalence.js $B/index.html
run sa15 node tests/pick/sa15-kommissionierschein.js $B/
run portal node tests/portal/sa16a-mitarbeiterportal.js $B/
run sa12c node tests/articles/sa12c-artikel.js $B/index.html
run zwei-tabs node tests/articles/sa12c-zwei-tabs.js $B/index.html
run ap51 node tests/weight/ap51-gewicht.js
run ap52 node tests/numbers/ap52-zahlenfelder.js
run ap53b env BASE=$B/index.html BASE0=${BASE0:-http://localhost:8130/index.html} node tests/mobile/ap53b-sicherheitskorrekturen.js
run ap5-diagnose node tests/ap5/ap5-diagnose.js
run ap7e bash -c "cd tests/ap5 && node ap7-edit-modus.js"
run import-export env BASE=$B/index.html node tests/import-export/ap54-import-export.js
run ap55 env BASE=$B/index.html node tests/ap55/ap55-barcode-importschutz.js
run ap55a env BASE=$B/index.html node tests/ap55a/ap55a-altimport.js
touch "$OUT/FERTIG"

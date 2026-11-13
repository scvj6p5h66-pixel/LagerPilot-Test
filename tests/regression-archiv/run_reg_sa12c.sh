#!/bin/bash
S=/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad
cd $S/t
for s in ap15 ap1 ap1c ap2 ap8 ap10 ap11 ap9 ap12 ap13 ap14 ap16b ap16; do
  [ -f $s.js ] || continue
  timeout 900 node $s.js > ../results/sa12c/$s.log 2>&1; echo "exit $?" >> ../results/sa12c/$s.log
done
cd $S/wt_dev
timeout 900 node tests/unit/suggestions-equivalence.js http://localhost:8123/index.html > ../results/sa12c/equiv.log 2>&1; echo "exit $?" >> ../results/sa12c/equiv.log
timeout 900 node tests/pick/sa15-kommissionierschein.js http://localhost:8123/ > ../results/sa12c/sa15.log 2>&1; echo "exit $?" >> ../results/sa12c/sa15.log
timeout 900 node tests/portal/sa16a-mitarbeiterportal.js http://localhost:8123/ > ../results/sa12c/portal.log 2>&1; echo "exit $?" >> ../results/sa12c/portal.log
timeout 900 node tests/articles/sa12c-artikel.js http://localhost:8123/index.html > ../results/sa12c/sa12c.log 2>&1; echo "exit $?" >> ../results/sa12c/sa12c.log
touch $S/results/sa12c/done

#!/bin/bash
S=/tmp/claude-0/-home-claude/f5834085-23a3-5aa7-8e32-8dde603bf47e/scratchpad
cd $S/t
for s in ap3 ap4 ap5 ap6 ap7 ap16c ap17 ap18 ap19 ap20 ap21 ap22 ap5b ap7b ap9b ap9c ap9d ap10b ap13b ap14b ap1b ap2b ap2c; do
  [ -f $s.js ] || continue
  timeout 600 node $s.js > ../results/ap5/$s.log 2>&1; echo "exit $?" >> ../results/ap5/$s.log
done
touch ../results/ap5/done

#!/bin/bash
# Every check, one line each: bash test/all.sh [war|ground|base|station|whole]  (needs the game served on :8080)
cd "$(dirname "$0")/.."
(pgrep -f "http.server 8080" >/dev/null || (python3 -m http.server 8080 >/dev/null 2>&1 &)); sleep 1
run() { local out; out=$(timeout "${T:-280}" "$@" 2>&1); local c=$?; printf '%-5s %-28s %s\n' "$([ $c -eq 0 ] && echo PASS || echo FAIL)" "${*:2}" "$(echo "$out" | grep -v '^no page errors' | tail -1 | cut -c1-110)"; }
case "${1:-all}" in
  war)     for t in shell.py armoury.py fleets.py map.py map_war.py menu.py network.py; do run python3 test/$t; done; T=420 run python3 test/tutorial.py ;;
  ground)  run python3 test/mission.py victory; run python3 test/mission.py defeat; for t in field.py enemies.py props.py air.py view.py sites3d.py; do run python3 test/$t; done; run python3 test/enemies.py grass bots; run python3 test/enemies.py grass lizards ;;
  base)    run python3 test/sites.py base; run python3 test/people.py base; run python3 test/buildings.py ;;
  station) run python3 test/sites.py orbit; run python3 test/people.py orbit ;;
  whole)   T=560 run node test/sim.mjs; T=560 run node test/games.mjs ;;
  all)     for g in war ground base station whole; do echo "== $g"; bash "$0" $g; done ;;
esac

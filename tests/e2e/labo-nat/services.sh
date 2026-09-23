#!/bin/bash
# services.sh <mode-relais> : (re)lance les services de l'Internet du labo
D=$(cd "$(dirname "$0")" && pwd)
T=${TMPDIR:-/tmp}/oc-labo; mkdir -p "$T"
[ -f "$T/services.pid" ] && kill $(cat "$T/services.pid") 2>/dev/null
ps -eo pid,args | awk '$2=="node" && ($3 ~ /stun.mjs$/ || $3 ~ /services.mjs$/){print $1}' | xargs -r kill 2>/dev/null
sleep 0.5
LABO_VARIANTE=${LABO_VARIANTE:-} LABO_RELAIS=${1:-sain} ip netns exec oc-inet node "$D/services.mjs" > "$T/services.log" 2>&1 &
echo $! > "$T/services.pid"
for i in $(seq 1 40); do grep -q "^APP" "$T/services.log" && break; sleep 0.25; done
cat "$T/services.log"

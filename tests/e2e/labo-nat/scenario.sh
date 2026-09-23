#!/bin/bash
# scenario.sh <mode-relais> <nsA> <nsB> <n> : n essais, un résumé par essai
D=$(cd "$(dirname "$0")" && pwd); "$D"/services.sh "$1" >/dev/null
for i in $(seq 1 $4); do
  LABO_ATTENTE=${ATTENTE:-30000} timeout 120 node "$D/lanceur.mjs" $2 $3 2>/dev/null | python3 -c "
import sys,json; t=sys.stdin.read(); d=json.loads(t[t.index('{'):]); n=d['negociation']
c=lambda k: '%d/%d%s' % (n[k]['livres'], n[k]['envoyes'], (' (%d refusés)' % n[k]['refuses']) if n[k]['refuses'] else '')
print('  essai $i :', ('RELIÉS en %ss via %s ↔ %s' % (d['duree'], d['paire']['local'], d['paire']['distant'])) if d['relie'] and d['paire'] else ('RELIÉS en %ss' % d['duree'] if d['relie'] else 'ÉCHEC'),
  '| offre A→B', c('A→B offre'), 'B→A', c('B→A offre'), '| réponse', c('A→B réponse'), c('B→A réponse'), '| candidats A→B', c('A→B candidats'), 'B→A', c('B→A candidats'),
  ('| cause : ' + ('sansturn' if any('configure TURN' in e for e in d['erreurs']) else d['erreurs'][0][:60])) if d['erreurs'] else '')"
done

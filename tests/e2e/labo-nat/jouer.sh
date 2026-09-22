#!/bin/bash
# ============================================================
#  LABO « DEUX RÉSEAUX » — rejoue toute la démonstration
#
#  Pourquoi ce labo : toutes les sondes du dépôt font tourner les deux
#  pairs sur la MÊME machine, où la liaison directe passe par la boucle
#  locale. Ce qui rend une liaison possible ENTRE DEUX RÉSEAUX — le
#  candidat srflx, l'adresse publique apprise du STUN, et son voyage
#  par un relais — n'y est jamais mis à l'épreuve. Ici on construit
#  deux vraies maisons :
#
#      oc-ha  oc-ha2 ── box A (NAT) ──┐
#                                     ├── « Internet » : STUN, relais, app
#      oc-hb  oc-hb2 ── box B (NAT) ──┘
#
#  Les deux box ont le MÊME plan d'adresses privé (192.168.1.0/24),
#  comme deux maisons. Box « cône » = une box domestique ordinaire ;
#  « symétrique » = un port neuf par destination (une partie des
#  opérateurs mobiles).
#
#  Prérequis : root, iproute2, iptables, Playwright + Chromium (la même
#  chose qu'un runner GitHub Actions avec sudo). Le labo ne touche à
#  rien hors de ses espaces de noms oc-*.
#  usage : sudo tests/e2e/labo-nat/jouer.sh
# ============================================================
set -u
D=$(cd "$(dirname "$0")" && pwd)
ok(){ echo; echo "── $1"; }
"$D/reseau.sh" down >/dev/null 2>&1; "$D/reseau.sh" up cone >/dev/null

ok "La page de sonde (bibliothèque seule) — deux réseaux, box ordinaires"
echo "① relais sain";                              "$D/scenario.sh" sain oc-ha oc-hb 1
echo "② relais qui perd les candidats ICE";        "$D/scenario.sh" perd oc-ha oc-hb 1
echo "③ même relais, MÊME réseau";                 "$D/scenario.sh" perd oc-ha oc-ha2 1

ok "La VRAIE app, « Partage en groupe »"
"$D/services.sh" sain >/dev/null;         echo "④ deux réseaux, relais sain";            node "$D/lanceur-app.mjs" oc-ha oc-hb sain | head -3
"$D/services.sh" perd >/dev/null;         echo "⑤ deux réseaux, candidats perdus";       node "$D/lanceur-app.mjs" oc-ha oc-hb perd | head -3
                                          echo "⑥ même réseau, candidats perdus";        node "$D/lanceur-app.mjs" oc-ha oc-ha2 perd-meme | head -3
"$D/services.sh" perd-reponse >/dev/null; echo "⑦ deux réseaux, RÉPONSE perdue";         LABO_ATTENTE=40000 node "$D/lanceur-app.mjs" oc-ha oc-hb perd-reponse | head -3

ok "Le NAT de chaque maison, vu d'un navigateur"
"$D/services.sh" sain >/dev/null; echo -n "box ordinaire : "; node "$D/detecter-nat.mjs" oc-ha
"$D/reseau.sh" down >/dev/null; "$D/reseau.sh" up symetrique >/dev/null; "$D/services.sh" sain >/dev/null
echo -n "box symétrique : "; node "$D/detecter-nat.mjs" oc-ha
echo "⑧ la vraie app entre deux box SYMÉTRIQUES, relais sain"; LABO_ATTENTE=40000 node "$D/lanceur-app.mjs" oc-ha oc-hb symetrique | head -3

"$D/reseau.sh" down >/dev/null
kill $(cat "${TMPDIR:-/tmp}/oc-labo/services.pid" 2>/dev/null) 2>/dev/null
echo; echo "Captures : tests/e2e/captures/labo-*.png"

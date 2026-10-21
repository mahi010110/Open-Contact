# 0006 — Sans serveur au début, mesuré pendant la bêta

**Statut** : **acceptée** le 20 octobre 2026, par délégation — le
mainteneur a laissé les choix à l'assistant (« tu as l'entière main sur
tout »). Rien ne change : la règle §10 de `CLAUDE.md` s'applique telle
quelle, aucun serveur OpenContact ; la mesure se fait pendant la bêta,
en demandant aux testeurs.

## Contexte

Pour qu'un téléphone affiche une notification quand l'app est fermée, il
faut un serveur qui la déclenche. C'est vrai pour une app web (l'API
Push) comme pour une app du store. Or un réseau qu'il faut penser à
ouvrir perd contre WhatsApp : une demande d'un ami peut attendre des
jours sans être vue.

Deux options :

1. **Rester sans serveur.** On ouvre l'app chaque jour, « Aujourd'hui »
   dit ce qui attend, et les rappels passent par l'agenda du téléphone,
   comme aujourd'hui.
2. **Une sonnette.** Un tout petit service qui ne reçoit qu'un signal
   chiffré, « tu as du nouveau », sans contenu ni nom. Il faudrait
   réécrire §10 : rien d'OpenContact ne verrait tes données, mais
   quelque chose tournerait quelque part.

## Décision proposée

Commencer sans serveur. Pendant la bêta, relever les demandes restées
sans réponse faute d'avoir été vues (en demandant aux testeurs, pas par
télémétrie). Passer à la sonnette seulement si elles comptent.

## Conséquences

- Rien ne change dans le code ni dans `CLAUDE.md` tant que la mesure ne
  le demande pas.
- Si la sonnette devient nécessaire, elle passe la question ② de
  `CLAUDE.md` §0 (une démarche permanente du mainteneur) et demande une
  fiche à part.

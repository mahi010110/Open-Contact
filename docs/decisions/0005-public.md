# 0005 — L'informatique d'abord, tous les métiers ensuite

**Statut** : proposée, en attente du mainteneur. En attendant, rien ne
change : l'app reste pensée pour les étudiants IT et cyber (`CLAUDE.md`
§1).

## Contexte

Les tables de l'app — métiers, technos, codes d'activité, formations —
sont pensées pour le BTS SIO, le BUT informatique et la cyber. C'est là
que l'app est juste aujourd'hui. Le référentiel des métiers de France
Travail (ROME 4.0, données ouvertes) permettrait de s'ouvrir à toutes
les formations.

## Décision proposée

Rester sur l'informatique pendant le recadrage (R1 à R8), et ouvrir à
tous les métiers en R9 avec le ROME, réduit à ce qui sert et embarqué
hors ligne.

## Conséquences

- Les premiers testeurs viennent de la promo du mainteneur : c'est le
  public pour lequel la recherche et la carte sont déjà justes.
- Ouvrir plus tôt demanderait de revoir les cent phrases de la barre de
  recherche et les tables de `engine/lieux.js` et `engine/marche.js`
  avant d'avoir mesuré quoi que ce soit.

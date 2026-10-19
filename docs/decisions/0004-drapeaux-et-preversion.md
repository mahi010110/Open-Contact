# 0004 — Les lots derrière des drapeaux datés, et la préversion

**Statut** : acceptée par le mainteneur, 19 octobre 2026.

## Contexte

Le recadrage (décision 0001) arrive par lots, et chaque lot doit être
vérifié avec de vraies personnes avant d'être vu de tous. L'app n'a ni
serveur ni compte (`CLAUDE.md` §10) : pas de « bêta » côté serveur, pas
de liste de testeurs. Elle a déjà des drapeaux, ceux du périmètre
(`ui/perimetre.js`), mais ce sont des décisions de produit sans date :
la surface ordinateur, l'IA, l'envoi direct.

Un drapeau de livraison qu'on oublie devient deux chemins à tenir pour
toujours (Pete Hodgson, *Feature Toggles*, martinfowler.com).

## Décision

- **Un registre des drapeaux de livraison** (`engine/drapeaux.js`) :
  chaque drapeau porte son lot, sa raison, sa date de naissance et sa
  **date de retrait**, six mois au plus après sa naissance.
- **Un drapeau qui dépasse sa date fait échouer `?test`.** On ouvre alors
  le lot et on retire l'ancien chemin, ou on repousse la date exprès,
  dans un commit qui dit pourquoi.
- **La préversion** : une ligne de Réglages, « Préversion », allume les
  lots en test sur cet appareil seulement. La ligne n'existe que s'il y a
  un lot en test.
- **Un écran demande le lot, jamais la préversion** (`lot('reseau')`,
  `ui/state.js`). Le jour où le lot s'ouvre à tous, rien d'autre ne
  change.
- **Une clé nouvelle, propre à l'appareil** : `oc_preversion_v1`, `'1'`
  quand elle est allumée, absente sinon. Ni scellée (elle ne dit rien de
  toi), ni sync, ni copie, ni partage. « Effacer cet appareil »
  l'emporte : un téléphone prêté ne doit pas montrer des écrans pas
  encore vérifiés.

## Conséquences

- Le mainteneur et ses testeurs voient la suite, les autres ne voient
  rien bouger. Un lot s'éteint d'un geste, sans toucher aux données.
- Pendant une préversion, les gardes jouent les DEUX chemins.
- La préversion ne voyage pas : un testeur l'allume sur chaque appareil.
  C'est voulu : un réglage de test ne doit pas se propager tout seul.
- Le périmètre et la livraison restent séparés. `ui/perimetre.js`
  n'importe rien, parce que `tests/e2e/tous.mjs` le lit sous Node pour
  choisir les scénarios à sauter.

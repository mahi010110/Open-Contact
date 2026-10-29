# 0009 — Tout ce qui se règle vit dans « Réglages »

**Statut** : **acceptée par délégation**, 29 octobre 2026. Le mainteneur
l'a demandé (« mettre tous les paramètres dans les réglages ») ; le
dessin est de l'assistant.

## Contexte

Depuis le 29 septembre 2026 (annexe de `CLAUDE.md`), « Moi » portait,
sous le profil, deux cadres : « Ce que j'envoie » (modèles d'emails, CV,
lettres) et « Ma copie » (le fichier, son cadenas, la phrase de secours).
Le reste — protection, appareils, installation, demandes de mes amis,
thème, touches, aide, restaurer, effacer — vivait derrière la porte
« Réglages ».

La copie de ses données se cherchait donc à deux endroits : le fichier
et la phrase dans « Moi », la protection, les appareils et la
restauration dans « Réglages ». Trois des quatre façons de ne rien
perdre étaient d'un côté, la quatrième de l'autre.

## Décision

- **« Moi » dit qui je suis et ce que j'envoie** : le profil, « Je peux
  aider », « Mon visage », « Ce que j'envoie ». Plus aucun réglage.
- **« Réglages » ouvre sur « Ma copie »** : le fichier (« Enregistrer »
  au doigt, « Télécharger » au poste, et son cadenas), puis la phrase de
  secours. Suivent « Mes données », « Réseau », « Préférences », « Aide »,
  puis restaurer et effacer.
- **L'alerte suit la copie.** Quand la copie manque vraiment
  (`sansFilet` : au moins cinq pistes, ni copie ni autre appareil depuis
  trente jours), « Ma copie » prend le bord ambre et sa phrase ; sur
  « Moi », la porte des Réglages le dit d'un mot, « sans copie », dans le
  langage d'urgence de l'app (`.mark.mark-late`). Une perte qu'on ne voit
  pas venir se dit là où l'on passe.

## Options écartées

- **Laisser « Ma copie » dans « Moi »** : c'est ce que le mainteneur
  refuse.
- **Une porte « Ma copie » à part dans « Moi »** : une porte de plus pour
  une chose qu'on fait rarement ; elle vit avec les autres réglages.
- **Taire l'alerte hors des Réglages** : la perte la plus lourde de l'app
  (tout vit dans un seul navigateur, et Safari efface un site non ouvert
  depuis sept jours) ne doit pas dépendre d'une porte qu'on n'ouvre pas.

## Conséquences

- Au poste, « Ma copie » ouvre la colonne des Réglages.
- Les scénarios qui touchent la copie ouvrent d'abord les Réglages
  (`ouvrirReglages`) : `e2e-moi.mjs`, `e2e-un-seul-moi.mjs`,
  `e2e-ux-audit.mjs`. `e2e-moi.mjs` refuse un réglage revenu dans
  « Moi », mutation à l'appui.
- Aucune donnée ne bouge, aucune clé ne change.

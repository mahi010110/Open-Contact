# Journal des modifications

Ce qui change pour toi, version par version, en mots simples. Le format
suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et les
numéros la [gestion sémantique de version](https://semver.org/lang/fr/) :
le dernier chiffre pour un correctif, celui du milieu pour une nouveauté,
le premier pour une rupture. La bascule du recadrage sera la 7.0.0
(`docs/recadrage.md`).

Les versions d'avant la 6.76 se lisent dans l'historique du dépôt.

## [6.78.0] — 19 octobre 2026

Le premier lot du recadrage, R0 : les fondations. Rien ne change à
l'écran, sauf une ligne.

### Ajouté

- **« Préversion »**, dans Réglages : elle allume sur ton appareil les
  écrans encore en test. Elle n'existe que lorsqu'un écran est en test,
  et ne vaut que pour l'appareil où tu l'allumes.
- Les anciennes adresses de l'app mèneront toujours quelque part, même
  quand un écran déménage.

### Pour qui développe

- `engine/drapeaux.js` : les drapeaux de livraison, chacun avec sa date
  de retrait ; `?test` refuse un drapeau périmé.
- `engine/destinations.js` : le registre des écrans et des anciennes
  adresses.
- Les fiches de décision (`docs/decisions/`), le plan du recadrage
  (`docs/recadrage.md`), le protocole des tests avec de vraies personnes
  (`docs/mesure/protocole.md`) et son jeu de données
  (`tests/mesure/jeu-de-test.mjs`).
- Une clé nouvelle, propre à l'appareil : `oc_preversion_v1`
  (`CONTRAT.md`).

## [6.77.0] — 19 octobre 2026

### Modifié

- **Les boutons** ont un contenant, léger : un aplat de leur couleur, qui
  fonce et s'enfonce quand on le touche. On ne les confond plus avec des
  liens. Le bouton principal est posé sur un rebord.
- **« Aujourd'hui »** : une case « Fait » en tête de chaque action, et un
  seul geste au bout, avec son mot.
- **La fiche** : « Clôturer » est à côté de « Où j'en suis », la prochaine
  action se touche pour la changer, et les gestes d'un contact sont des
  tuiles.
- Les listes à cocher de « Prospecter » et « Donner » sont à plat.

### Corrigé

- La flèche de retour de Réglages est assez large pour le doigt.
- L'icône d'« Historique » ne flotte plus au milieu de sa ligne.

## [6.76.0] — 19 octobre 2026

### Ajouté

- **« Premiers pas »** sur « Aujourd'hui » : remplir ton profil, ajouter
  une piste, écrire ton premier mail. Chaque case se coche toute seule,
  et la liste disparaît après le premier mail.

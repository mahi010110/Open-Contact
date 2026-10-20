# Journal des modifications

Ce qui change pour toi, version par version, en mots simples. Le format
suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et les
numéros la [gestion sémantique de version](https://semver.org/lang/fr/) :
le dernier chiffre pour un correctif, celui du milieu pour une nouveauté,
le premier pour une rupture. La bascule du recadrage sera la 7.0.0
(`docs/recadrage.md`).

Les versions d'avant la 6.76 se lisent dans l'historique du dépôt.

## [6.81.0] — 20 octobre 2026

Le recadrage, lot R1-c : au poste. Toujours en **préversion**.

### Ajouté, en préversion

- **Au poste, une barre latérale** à la place des onglets du haut : le
  logo, « Ajouter », puis Aujourd'hui, Mes pistes, Réseau et Moi, chacun
  avec son icône. L'écran prend toute la hauteur à côté.

## [6.80.0] — 20 octobre 2026

Le recadrage, lot R1-b : la fiche. Toujours en **préversion**.

### Ajouté, en préversion

- **La fiche commence par les gens** : qui peut t'ouvrir la porte, puis
  tes contacts, puis où tu en es. Au poste, les gens prennent la colonne
  de gauche.
- **« Donner » depuis la fiche**, à côté de « Modifier » : la feuille
  ne montre que cette piste.
- **« Un contact » depuis le +** : quelqu'un que tu viens de
  rencontrer, son nom d'abord, son entreprise ensuite. Sans entreprise,
  il t'attend dans « Contacts à rattacher » ; une entreprise que tu
  suis déjà le reçoit dans sa fiche.

## [6.79.0] — 20 octobre 2026

Le recadrage, lot R1-a : l'onglet « Réseau ». Tout est en
**préversion** : rien ne change tant que tu ne l'allumes pas dans
Réglages.

### Ajouté, en préversion

- **« Réseau »** prend la place d'« Échanger » et répond à une seule
  question, *qui peut m'aider ?* Tes demandes en cours en tête, avec le
  contact qu'un ami t'a donné juste dessous, puis tes conversations, puis
  « Mes amis ».
- **« Mes amis »** quitte « Mes pistes » pour vivre avec ses
  conversations. Sa recherche trouve un ami par une entreprise (« Thales »),
  et « cyber Lille » propose de demander à tes amis.
- **Le + fait tout entrer** : « Une piste » sous le pouce, et ce qu'on
  te tend (QR, fichier, texte) sous « Recevoir ».
- **Donner part de tes pistes** : « Choisir », coche, puis « Donner » ;
  la feuille ne montre que ce que tu as coché.
- L'ancienne adresse `#/echanger` mène à « Réseau », et l'inverse quand
  la préversion est éteinte.

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

# Reprendre la refonte

*Pour l'assistant qui reprend la refonte dans une nouvelle discussion.
Mise à jour à chaque lot, en même temps que le journal du brief.
Dernière mise à jour : 17 novembre 2026, lot 6 montré.*

Le premier message à donner à une nouvelle discussion :

> Reprends la refonte d'OpenContact. Elle vit sur la branche
> `claude/admiring-cori-3pcocf` : pars de cette branche et lis
> `docs/refonte-reprendre.md` avant tout.

## 1. Où on en est

**Phase 1, les maquettes.** Un lot à la fois, montré en images, validé
par le mainteneur avant le suivant (`docs/brief-refonte.md` §9).

| Lot | Contenu | État |
|---|---|---|
| 1 | Trouver, la page d'une entreprise | validé le 17 novembre (« Tout me va ») |
| 2 | Pistes, la page d'une piste, écrire par quatre canaux | validé le 17 novembre (« Super ») |
| 3 | Réseau : la classe, les amis, les demandes, donner, recevoir | validé le 17 novembre (« Go ») |
| 4 | Moi : profil, documents, messages types, copie, réglages | validé le 17 novembre (« Super ») |
| 5 | le premier jour, les états vides, les erreurs, le hors ligne, l'écran verrouillé | validé le 17 novembre (« Continue ») |
| 6 | le poste, un établi : coller une offre, le clavier, déposer ; « Depuis mes e-mails » et le bac | montré le 17 novembre, **en attente de son avis** |

**Phase 2, le code** : seulement quand toutes les maquettes sont validées
(`docs/brief-refonte.md` §9 et §10). Le lot 6 est le dernier : validé,
la phase 1 est finie.

- **La maquette** : `design/maquettes/app/index.html`. Elle est publiée,
  privée, pour le mainteneur : https://claude.ai/artifact/N8vGKspC37MQYTZEPg1gJZ.
  On la met à jour en republiant ce fichier à cette adresse (outil
  Artifact, `url` = cette adresse). Une autre adresse ferait une seconde
  maquette.
- **La branche** : `claude/admiring-cori-3pcocf`, pas fusionnée dans
  `main`. Une nouvelle discussion part d'elle : `git fetch origin
  claude/admiring-cori-3pcocf`, puis la récupérer sur sa propre branche.
  Jamais `claude/refonte-arc` (son dessin est refusé ; son moteur
  `etape.js` et `contrat.js` peut servir).

## 2. Lire d'abord

1. `docs/brief-refonte.md` : §2 (ce qui est décidé), §4 (le concept), §8
   (les erreurs à ne pas refaire), §9 (la méthode), §12 (le journal des
   lots : ce qui a été montré, ce qu'il en a dit).
2. `docs/table-de-passage.md` : où vit chaque capacité.
3. La maquette elle-même, ouverte et touchée : la régie en haut change le
   jour (Jour 1 vide, Jour 8 avec 8 pistes, Mois 3 « le pire jour ») et
   coupe le réseau (Hors ligne).
4. `CLAUDE.md` : pour la nouvelle interface, seul le socle oblige (§0 les
   deux questions et la règle des captures, §1, §2, §3, le matériel de §4,
   les mots de §7, §10). Le reste sert de leçons.

## 3. Travailler avec le mainteneur

- Il ne lit pas les longs textes : huit lignes au plus, les images
  d'abord, les questions à cocher.
- À chaque lot : les planches avant / après (téléphone, puis ordinateur),
  le lien de la maquette, et une question : ça te va ?
- Il répond court. « Go », « Super », « Continue », « Tout me va » : le
  lot est validé, on note sa phrase dans le journal et on passe au
  suivant.
- **« Sois attentif aux détails »** (17 novembre). Avant de montrer quoi
  que ce soit : chaque capture regardée à l'œil, au téléphone (390 et
  360 px) et au poste, en clair et en sombre ; chaque mot relu ; chaque
  geste joué jusqu'au bout, « Annuler » compris.
- **On approfondit ce qui est validé, on ne le remplace pas** (lot 1, sa
  première version refusée). Une idée neuve se propose à côté, jamais à
  la place.
- **Chaque écran mène à un geste qui se fait pour de vrai** : « une
  interface simple et logique, et qu'il puisse agir ».
- Dire ce qui est vérifié et ce qui ne l'est pas, WebKit (l'iPhone) en
  premier.
- Rien dans `main` sans son accord. Pas de pull request s'il ne la
  demande pas.

## 4. Comment la maquette est faite

- **Un seul fichier, un fragment HTML** (ni `<html>` ni `<body>` : la
  page publiée l'enveloppe) : le style (jetons 98, thème sombre), les
  icônes en symboles SVG, la régie, les notes, le téléphone (`#tel`), le
  poste (`figure.poste`), puis un script.
- **`app(root, poste)` est lancée deux fois**, téléphone et poste. Chaque
  instance a son état `S`, refait par `init()` à chaque changement de
  jour. Partagés : `ENT` (les entreprises), `G` (`G.jour`, `G.hl` pour
  hors ligne). La date de la maquette est le mardi 17 novembre 2026
  (`AUJ`).
- **Un bloc par lot** dans le script, dans l'ordre : Trouver, Pistes,
  Réseau (`R_VUES`, `ouvrirR`, `feuilleR`, `gesteR`), Moi (pages ajoutées
  à `R_VUES`, `ouvrirM`, `retourM`, `feuilleM`, `gesteM`, `changeM`),
  les états (`gesteE`, `feuilleE`, le verrou), le poste (`coller`,
  `offreEnAttente`, `deposerFichier`, `viser`, puis `feuilleX` et
  `gesteX` pour « Depuis mes e-mails » et le bac). `lireOffre` est hors
  de `app()`, à côté des données.
- **Une page** est une fonction qui rend `{titre, corps, pied}`. Au
  téléphone elle est poussée (`S.pile`, barre de titre avec retour) ; au
  poste elle s'ouvre à droite (`S.rsel`, `S.msel`).
- **Une feuille** : `S.sheet = {type, …}` puis `couche.innerHTML = ''`.
  Elle ne se redessine que si la couche est vide : pour changer une
  feuille ouverte sans la faire remonter, la retoucher en place.
- **Un geste** : `data-a="…"` sur l'élément. Les gestes d'un lot ont leur
  préfixe (`r-`, `m-`, `c-` `e-` `v-`, `o-`, `x-`) et rendent `'fait'`
  (rien à redessiner) ou `'rendre'`.
- **Le clavier du poste** : `touche()` (renvoyée par `app()`) reçoit les
  touches hors du téléphone. Une lettre ne vit que hors d'un champ ; ↵
  n'est jamais pris à un bouton, un lien ou une ligne qui a le focus.
- **« Annuler »** : `annuler(texte, défaire)`. Un retour sans annulation :
  `toast(texte)`, seulement si l'écran ne le dit pas déjà.
- **Les icônes** : les pixelarticons de `assets/icons/`, copiés en
  `<symbol id="i-nom">`, appelés par `ic('nom')`.

## 5. Vérifier

`design/maquettes/app/outils/` (voir son `README.md`) :

- `node design/maquettes/app/outils/jouer-lot6.mjs` (et lots 1 à 5) :
  rejoue les gestes d'un lot au téléphone et au poste, écrit ses
  captures, finit par « ERREURS 0 ». **Les six se relancent après
  chaque changement** : un lot peut en casser un autre.
- Puis **regarder les captures**. Une suite verte dit que c'est conforme,
  pas que c'est bien.
- Ici, seul Chromium existe. WebKit n'est pas mesuré ; la CI sait le
  faire pour l'app actuelle (`OC_NAVIGATEUR=webkit`, `audit-captures`).

Pièges déjà payés :

- une fonction globale qui porte le nom d'une fonction de `app()` la
  masque (`init` a dû devenir `initiales`) ;
- `.rang span{display:block}` vaut pour tout `span` d'une rangée : un
  indicateur s'écrit en `div` ;
- un `<input>` coupe une valeur longue : l'objet d'un mail est un
  `textarea.zone.un`, qui se replie ;
- un scénario qui suppose le jour d'ouverture ou l'onglet du poste casse
  quand un lot change ces défauts (au jour 8, le poste s'ouvre sur Moi) ;
- éditer `index.html` par de petits scripts Python écrits dans un
  fichier : une vérification de sécurité bloque les here-docs qui
  contiennent `$$` ;
- la régie doit rester au-dessus de tout (`z-index:40`) : sinon une
  feuille ouverte passe devant son menu ;
- le menu « ⋯ » de la régie provoque ce qu'aucun geste ne provoque :
  arriver par un lien de Karim, l'annuaire en panne, verrouiller l'app
  (code 123456), coller une offre ;
- un raccourci qui fait `preventDefault` sur ↵ vole l'appui d'un bouton
  qui a le focus : « Oui, envoyé » ne répondait plus. Il ne prend ↵ que
  si rien n'a le focus ;
- un collage multiligne dans un `<input>` perd ses sauts de ligne : la
  barre lit l'événement `paste` elle-même, avant que le champ l'aplatisse ;
- pour tester un collage ou un dépôt, Playwright envoie un
  `ClipboardEvent` ou un `DragEvent` qui porte un `DataTransfer`
  (`jouer-lot6.mjs`).

## 6. Montrer

1. Les captures de l'app actuelle (l'« avant ») :
   `OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs`, qui les écrit
   dans `tests/e2e/captures/audit/chromium/` (`14-moi--390.png`,
   `14-moi--1280.png`…).
2. Les planches : `outils/planches-lot6.mjs` est le dernier modèle ;
   `planche()` pose l'avant au-dessus de l'après (`pile: true` pour
   l'ordinateur, deux images par rang).
3. Publier la maquette à son adresse (§1), envoyer les planches, huit
   lignes, la question.
4. Après sa réponse : le journal (`docs/brief-refonte.md` §12), la table
   de passage, ce fichier, un commit en français, `git push`.

## 7. Ce qui reste

- **Après l'avis du mainteneur sur le lot 6** : noter sa phrase (journal,
  table, ce fichier), puis la phase 2, dans l'ordre du brief §9.
- **Plus tard**, validé comme idée : la carte des entreprises autour de
  soi (brief §12).
- **Au moment du code** : les modèles de messages sans genre
  (`engine/model.js`), la lecture d'un lien collé dans Trouver, la suite
  d'une piste et d'un « oui » (`etape.js`, `contrat.js` de
  `claude/refonte-arc`). La lecture d'une offre collée, dans le moteur
  et testée (une table, pas une IA). Où vit l'offre d'une piste : le
  schéma d'une piste est intouchable (`CONTRAT.md` §3), donc une clé
  neuve ou les champs qui existent, à décider avec lui. Le bac garde sa
  clé (`oc_orphans_v1`) ; la réponse de « Depuis mes e-mails » passe par
  la même fusion que Recevoir.
- **À vérifier avant le code** : la longueur d'un mot d'invitation
  LinkedIn (200 caractères annoncés, pas lu sur l'aide de LinkedIn) et le
  nombre d'invitations avec un mot par mois ; WebKit sur chaque lot.

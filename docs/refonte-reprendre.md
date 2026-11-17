# Reprendre la refonte

*Pour l'assistant qui reprend la refonte dans une nouvelle discussion.
Mise à jour à chaque lot, en même temps que le journal du brief.
Dernière mise à jour : 17 novembre 2026, code : lot 2 montré.*

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
| 6 | le poste, un établi : coller une offre, le clavier, déposer ; « Depuis mes e-mails » et le bac | validé le 17 novembre (« commence ! ») |

**La phase 1 est finie** : les six lots sont validés. **Phase 2, le
code** : commencée le 17 novembre (« commence ! »), voir §8.

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

## 8. La phase 2, le code

Commencée le 17 novembre 2026. La méthode reste celle des maquettes
(`docs/brief-refonte.md` §9) : le moteur d'abord, avec ses tests ; puis
un lot d'écrans à la fois, dans l'ordre des maquettes, montré en images
(avant : l'app actuelle ; après : la nouvelle, pour de vrai) avec un
lien pour l'essayer sur l'iPhone, et validé avant le suivant.

| Lot du code | Reprend la maquette | État |
|---|---|---|
| 1 | la coque (les quatre onglets, les pages, le poste) et Trouver | validé le 17 novembre (« Continue ») |
| 2 | Pistes, une piste, écrire par quatre canaux | montré le 17 novembre, **en attente de son avis** |
| 3 | Réseau | à faire |
| 4 | Moi | à faire |
| 5 | les états : premier jour, vide, erreurs, hors ligne, verrou | à faire |
| 6 | le poste, un établi | à faire |

**La nouvelle interface grandit à côté de l'ancienne**, sans la toucher.
L'app actuelle (`index.html`, `app.js`, `ui/`, `styles/app.css`) reste
entière sur la branche jusqu'à la bascule : ses scénarios restent verts
et servent de filet. La nouvelle vit dans sa page et son dossier, et
n'importe rien de `ui/` : ce qu'elle reprend (l'état, le clavier
d'iOS…) y est recopié puis adapté.

**La bascule** se fait une fois, le jour où le mainteneur le décide : la
nouvelle page devient `index.html`, son dossier devient `ui/`, l'ancien
part ; les scénarios e2e sont portés ou retirés dans une liste nommée,
aucun ne reste rouge ; `sw.js` (`CACHE`, `PRECACHE`) suit ; `CLAUDE.md`
se réécrit pour la nouvelle interface, plus court.

### Où vit le code

| Fichier | Ce qu'il porte | À la bascule |
|---|---|---|
| `refonte.html` | la page : la fenêtre, les onglets, l'écran, la barre d'état, la barre « Annuler », la région qui parle | devient `index.html` |
| `refonte.js` | l'amorce : charger, le thème, inscrire les onglets, démarrer | devient `app.js` |
| `styles/refonte.css` | le style de la maquette, posé sur les vrais jetons (tailles en rem) | devient `styles/app.css` |
| `ecrans/coque.js` | les onglets, l'adresse (`#/trouver`), la pile des pages dans l'historique, « Annuler », le glissé, le clavier du poste | `ecrans/` devient `ui/` |
| `ecrans/etat.js` | l'état et son stockage, repris de `ui/state.js`, mêmes clés | |
| `ecrans/annuaire.js` | `chercheur()` : une question à l'annuaire, ses pages, ses refus (repris de `ui/decouvrir.js`) | |
| `ecrans/carte.js` | ce que Wikidata, le BODACC, Wikipédia, Egapro disent d'une entreprise ; relire une piste par son SIREN | |
| `ecrans/trouver.js` | l'onglet Trouver et la page d'une entreprise | |
| `ecrans/pistes.js` | Pistes, la page d'une piste, écrire par quatre canaux, la feuille d'un contact | |
| `ecrans/zone-visible.js` | le clavier d'iOS ne couvre rien (repris de `ui/zone-visible.js`) | |
| `ecrans/bientot.js` | Réseau et Moi en attendant leurs lots | disparaît |
| `engine/formations.js` | les formations de « Tu étudies » et leur métier (testé par `?test`) | reste |
| `engine/suite.js` | la suite d'une piste (sa phrase, son geste, son rang dans « À faire »), le canal, les gestes qui écrivent l'historique | reste |
| `engine/contrat.js` | du « oui » au contrat, repris de `claude/refonte-arc` avec ses tests | reste |

- **La nouvelle n'importe rien de `ui/`.** Ce qu'elle reprend y est
  recopié puis adapté ; l'app actuelle ne bouge pas.
- **Une vue** (un onglet) : `{ rendre(ecran, {poste, premier}),
  geste(a, el, ev), clavier(ev, {champ, poste}), etat(), compte() }`,
  inscrite par `inscrire(id, vue)`. Elle se redessine par
  `remplacer(zone, html)` (`ecrans/outils.js`), qui garde le défilement
  et rend le focus à l'élément qui a pris la place de l'ancien.
- **Une page** (au téléphone) : `{ titre(p), rendre(p) → {titre, corps,
  pied}, geste(a, el, ev, p) }`, inscrite par `inscrirePage(t, page)`,
  ouverte par `pousser({t, id}, depuis)`. Le descripteur `{t, id}` vit
  dans `history.state` : le retour du téléphone et du navigateur
  referment la page, et revenir rend la main à la ligne qui l'avait
  ouverte. Chaque onglet garde sa pile ; re-taper l'onglet revient à
  sa racine. Au poste, il n'y a pas de pile : la page s'ouvre à droite.
- **Un geste** : `data-a` et `data-id`, comme dans la maquette. La
  coque prend les siens (`onglet`, `retour`, `annuler`), puis la feuille
  ouverte, puis la page, puis l'onglet.
- **Une feuille** (une question courte) : `ouvrirFeuille({ titre,
  rendre, geste, focus })`. Elle a son entrée d'historique : le retour
  la ferme, Échap aussi, la tabulation reste dedans, la main revient
  d'où elle venait. Une feuille qui se ferme rend son entrée une
  micro-tâche plus tard ; ce qui s'ouvre dans le même élan la reprend
  (`poserEntree`), et nos propres retours se comptent.
- **L'historique d'une piste est un contrat** entre `phraseEnvoi` (qui
  l'écrit) et `dernierEvenement` (qui le relit) : « Écrit à Claire
  Durand, par mail », « Réponse : un entretien le … », « Merci envoyé
  … ». Changer une phrase, c'est changer les deux, et `tests.js`.

### Vérifier

- `node tests/refonte/jouer-lot1.mjs` : Trouver de bout en bout, au
  téléphone (390 et 360 px, clair et sombre) et au poste (clair et
  sombre), sur un annuaire fictif dans son format réel
  (`tests/refonte/annuaire-fictif.mjs`). Finit par « ÉCHECS 0 ·
  ERREURS 0 ». Puis **regarder les captures**.
- `node tests/refonte/jouer-lot2.mjs` : Pistes de bout en bout, ce qui
  sortirait de l'app (Mail, LinkedIn, l'agenda) intercepté.
- Restent verts : `node tests/e2e/unitaires.mjs` (`?test`, 291 tests),
  `e2e-pages-sw.mjs` (la page d'essai est servie elle-même, pas l'app),
  `e2e-decouvrir.mjs`, `e2e-classement.mjs`, `e2e-sobriete.mjs`.
- Les planches : `OC_AVANT=<captures de l'app actuelle> node
  tests/refonte/planches-lot1.mjs`. `planche()` prend `reelle: true`
  quand l'après vient de l'app (rien à couper en haut).

### L'essayer sur l'iPhone

GitHub Pages ne sert que `main`. La branche se lit par GitHack, qui sert
les fichiers d'un dépôt public, quelques minutes après chaque envoi :
https://raw.githack.com/mahi010110/Open-Contact/claude/admiring-cori-3pcocf/refonte.html

C'est une adresse à part : les vraies pistes du mainteneur n'y sont pas,
et rien de ce qu'il y fait ne touche son app. Elle est partagée avec
d'autres projets servis par GitHack (même origine) : rien de privé ne
doit y entrer. La page d'essai n'enregistre pas de service worker.

### Décisions prises en codant le lot 1 (montrées avec lui)

- « Garder » range la personne à qui écrire quand l'annuaire la nomme
  (le dirigeant d'une PME : nom et rôle, aucune adresse inventée),
  comme la maquette validée. L'app actuelle ne le faisait pas.
- Les trois réponses vivent dans le profil, sous ses clés :
  `recherche`, `formation`, `ville`, `rayon`. Une ville que la table ne
  connaît pas se dit sous le champ, la saisie gardée.
- « BUT R&T » dit le réseau, « BUT Informatique » ne dit aucun métier
  (exprès, déjà le cas) : `engine/formations.js`.
- « colle à ta formation » ne se dit que s'il départage les lignes à
  l'écran. Une liste demandée pour ton métier y colle presque toujours :
  sinon la ligne se répétait partout.
- « Annuler » dure trente secondes (invariant ②), pas six comme dans la
  maquette.
- Un nom tapé se cherche dans toute la France ; un métier, autour de ta
  ville. La distance se lit toujours depuis ta ville.

### Décisions prises en codant le lot 2 (montrées avec lui)

- Les messages de départ se disent sans genre : la relance (« J'ai
  toujours très envie de vous rejoindre », objet « Ma candidature chez
  … ») et le merci (la signature commune). Un modèle jamais retouché
  passe à la nouvelle version, un modèle retouché jamais. `{{date}}`
  dit le jour de la candidature (« du 10 novembre »).
- Le contrat d'après un « oui » vit dans un champ privé de la piste,
  `suite` (CONTRAT.md §3) : jamais dans un partage.
- « Laisser tomber » reste sur la page (« Rangée. », « Rouvrir ») ;
  « Annuler » trente secondes, comme pour « C'est non », « C'est oui »,
  « Ranger » et le glissé.
- Un entretien au-delà de six jours : « Un autre jour », une date qui
  se VALIDE par « OK » (la roue d'iOS change en route).
- Les brouillons et « C'est parti ? » survivent à un aller-retour dans
  l'app Mail : `sessionStorage`, le temps de l'onglet.
- Attendent leur lot : « Demander à un ami » (rang 3 de la suite, lot 3),
  Ctrl ↵ pour envoyer (lot 6, la touche ne s'annonce pas avant).

### Pièges déjà payés (le code)

- `innerText` rend les majuscules que le CSS impose (`text-transform`) :
  un scénario compare sans la casse.
- Les données vivent dans IndexedDB : un scénario les lit par `kvGet`
  (`lireCle`, `tests/refonte/outils.mjs`), jamais dans `localStorage`.
- Un `role="button"` ne contient pas de bouton : VoiceOver ne verrait
  plus « Garder ». La ligne a deux enfants, la partie qui s'ouvre et le
  bouton ; c'est la ligne qui porte l'anneau de focus (`:has`).
- `e2e-pages-sw.mjs` reconnaît l'app actuelle à `#app` : la nouvelle
  page a `id="oc"`.
- Une règle posée plus bas (`.tb{display:flex}`) rallume ce qu'une règle
  d'avant cachait (`.fen-tb{display:none}`) : préciser le sélecteur.
- Une commande qui écrit `\u00a0` dans un here-doc a été bloquée par une
  vérification de sécurité : passer par un script écrit dans un fichier.
- `engine/requete.js` est précaché par l'app actuelle : un module qu'il
  importe entre dans `PRECACHE` (`sw.js`), et `CACHE` monte d'un cran.
  Même chose pour `engine/model.js`, qui importe `contrat.js`.
- Deux fonctions du même nom dans un module : la seconde efface la
  première sans rien dire (`geste`, devenue `gesteDe`).
- Une espace insécable peut être écrite telle quelle dans un fichier :
  un script qui cherche « \u00a0 » ne la trouve pas.
- Pour jouer un envoi, un scénario intercepte les liens `mailto:`,
  `tel:` et `target="_blank"`, et `window.open` : rien ne part, tout se
  note.

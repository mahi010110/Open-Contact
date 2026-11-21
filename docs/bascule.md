# La bascule : la nouvelle interface devient l'app

*21 novembre 2026. Le plan, avant d'exécuter quoi que ce soit. Demandé
par `docs/refonte-reprendre.md` §8 : « la nouvelle page devient
`index.html`, son dossier devient `ui/`, l'ancien part ; les scénarios
e2e sont portés ou retirés dans une liste nommée, aucun ne reste rouge ;
`sw.js` suit ; `CLAUDE.md` se réécrit ». Le mainteneur a dit « C'est
parfait continue » après le lot 6 : ce plan est la suite. Rien n'arrive
dans `main` sans son accord.*

## 1. Avant : ce qu'il décide

1. **Ce qui ne revient pas** (`docs/table-de-passage.md`, « Ce qui quitte
   l'écran ») : la liste lui est montrée en entier, comme promis. En
   vérifiant le code, trois gestes manquaient à la liste et n'ont pas
   de remplaçant :
   - **modifier une piste** (son nom, sa ville, son site, ses technos) :
     une piste gardée telle qu'on l'a écrite garde sa faute de frappe ;
   - **« J'y suis passé » sur une piste** : le prénom qui part avec une
     piste donnée (« Léa y a fait son stage », CLAUDE.md §8, le levier
     40 contre 1). « Mon parcours » le dit aux amis, pas au groupe ;
   - **« Affiner » et trier Pistes**, et les étiquettes de sa recherche :
     la nouvelle barre de Pistes cherche des mots, à partir de dix pistes.
   Recommandé : remettre les deux premiers (dessinés, montrés), laisser
   le troisième (« À faire » et les étapes font le tri).
2. **Le dormant** : les capacités masquées (`PC`, `⏸` : campagnes,
   l'ordinateur relié, l'IA, l'envoi direct, l'analyse de la boîte) ont
   leur écran dans l'ancien `ui/`. CLAUDE.md §0 : « rien n'est
   supprimé… la suppression franche se décidera après la première
   bêta ». Recommandé : leurs modules partent dans `dormant/`, non
   chargés, leurs scénarios sautés comme aujourd'hui. L'écran de la
   surface ordinateur se dessinera dans la nouvelle interface quand elle
   s'ouvrira.

## 2. Les fichiers

| Aujourd'hui | Après |
|---|---|
| `refonte.html` | `index.html` (l'ancien part) |
| `refonte.js` | `app.js`, avec ce que l'ancien portait et que la page d'essai n'avait pas : le service worker et l'annonce d'une nouvelle version, les auto-tests `?test` |
| `ecrans/` | `ui/` (l'ancien part, sauf le dormant) |
| `styles/refonte.css` | `styles/app.css` (l'ancien part) |
| `tests/refonte/jouer-lotN.mjs` | des scénarios de `tests/e2e/`, lancés par `tous.mjs`, décrits dans son README |
| `sw.js` | `PRECACHE` dit les fichiers de la nouvelle interface, `CACHE` monte d'un cran |
| `CLAUDE.md` | réécrit pour la nouvelle interface, plus court ; le « pourquoi » des §4 à §8 reste en annexe, au rang de leçons |
| `natif/` | ne bouge pas : son cerveau a sa propre page et copie `engine/` |

Aucune clé de stockage ne bouge, aucun module du moteur ne part. La page
d'essai disparaît : le lien d'essai devient `index.html` sur la branche.

## 3. Les scénarios, un par un

**Gardés** — ils ne regardent pas le dessin (au plus, la page qu'ils
ouvrent change) : `unitaires`, `e2e-sonde-relais`, `e2e-socle` (il lira
la nouvelle feuille de style), `e2e-pages-sw`, `e2e-pages-lecture`,
`e2e-maj` (avec le service worker dans le nouvel `app.js`). Les vingt
sondes gardent leur rôle ; `sonde-deux-machines` et `sonde-rdv-reel`
changent seulement le chemin du module de liaison
(`ui/synclive.js` → `ui/liaison.js`).

**Portés** — leur règle vaut pour la nouvelle interface ; ils changent de
gestes et de sélecteurs :

- *la fuite d'abord (invariant ①)* : `e2e-decouvrir` (aucun mot privé
  ne part vers l'annuaire), `e2e-carte` et `e2e-enrichir` (ce qui part
  vers les sources), `e2e-amis` (le QR ne porte que le profil),
  `e2e-demande`, `e2e-sauts` (à quatre), `e2e-groupes`,
  `e2e-groupe-demande`, `e2e-groupe-sur-demande`, `e2e-groupe-reglages`,
  `e2e-groupe-retirer` (à trois et quatre), `e2e-messages` (le
  faussaire), `e2e-aide`, `e2e-parcours`, `e2e-un-seul-moi`,
  `e2e-diagnostic` ; `e2e-vecu` si « J'y suis passé » revient ;
- *le coffre et ce qui dure* : `e2e-verrou`, `e2e-recuperation`,
  `e2e-stockage`, `e2e-durabilite` ;
- *la liaison* : `e2e-liaison`, `e2e-portage`, `e2e-offre-perimee` ;
- *les gardes transverses* : `e2e-ux-audit` (44 px au doigt, texte
  doublé, survol, `touchcancel`), `e2e-focus` (l'anneau se voit),
  `e2e-annonce` (chaque cible a un nom, ce qui change se dit),
  `e2e-ecrire` (le clavier de l'iPhone ne couvre pas la feuille),
  `e2e-mouvement`, `e2e-etats` (vide et plein), `e2e-echelle` (400
  pistes, 200 amis), `e2e-replis`, `e2e-sobriete` (ses comptes sur
  `ui/`, qui sera la nouvelle), `e2e-classement`, `e2e-utile`,
  `e2e-mesure`.

**Retirés** — ils gardaient un dessin qui part ; ce qu'ils protégeaient
vit dans les scénarios de la refonte (`jouer-lotN`), ou ne s'applique
plus :

| Scénario | Remplacé par |
|---|---|
| `e2e-commencer` (« Aujourd'hui ») | lot 2 : « À faire » |
| `e2e-parcours-neuf` (le premier jour de l'ancienne) | lot 5, ⑥ |
| `e2e-pistes` (« Affiner », le tableau) | lot 2 ; « Affiner » part (§1) |
| `e2e-recherche` (les étiquettes de Mes pistes) | lot 1 (la barre de Trouver comprend) ; celles de Pistes partent (§1) |
| `e2e-reseau`, `e2e-boite`, `e2e-conversations`, `e2e-suivi`, `e2e-amis-onglet` | lot 3 |
| `e2e-moi`, `e2e-profil`, `e2e-appareils` | lot 4 |
| `e2e-partage-qui` (« → qui ») | part (table de passage) |
| `e2e-boutons`, `e2e-colonnes`, `e2e-finitions`, `e2e-montrer`, `e2e-decroche`, `e2e-fenetre`, `e2e-clavier` | le dessin de l'ancienne ; leurs leçons restent dans CLAUDE.md, les règles qui valent partout sont portées (`e2e-ux-audit`) |

**Le dormant** — sautés comme aujourd'hui, avec leurs écrans :
`e2e-envoi`, `e2e-campagne`, `e2e-ia`, `e2e-analyse`, `e2e-ordinateur`,
et les scénarios du vrai binaire (`e2e-ordinateur-envoi`,
`-reponses`, `-scan`, `-ia`, `e2e-c8-telephone`, `e2e-mcp`).

## 4. L'ordre

1. Ses choix (§1). Ce qui revient se dessine et se montre d'abord.
2. Déplacer les fichiers (§2), le dormant à part ; le nouvel `app.js`
   reprend le service worker et `?test`.
3. Porter, dans cet ordre : la fuite d'abord, le coffre, la liaison, les
   gardes transverses. Retirer le reste, nommément (§3), en mettant à
   jour le README et `tous.mjs`.
4. `tous.mjs` vert, la CI verte, le regard WebKit sans relevé.
5. `CLAUDE.md` réécrit.
6. Montrer : les captures sont celles qu'il a validées, plus le lien
   d'essai de `index.html`. Fusionner dans `main` seulement avec son
   accord.

*Tranché par l'assistant, à valider :* le classement du §3 et le dormant.

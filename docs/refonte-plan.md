# La refonte — plan de mise en œuvre

**Ce document dit comment la refonte se fait : quoi, dans quel ordre, et
à quoi on reconnaît qu'une étape est finie.** Le périmètre est dans
[`refonte.md`](refonte.md), le pourquoi dans les fiches
[0013](decisions/0013-la-refonte.md) et
[0014](decisions/0014-arc-search-dans-main.md).

*Révisé le 9 novembre 2026 après trois décisions du mainteneur : pas
d'entretiens, directement dans main, l'expérience d'Arc Search. Les
décisions encore ouvertes sont au §6.*

---

## En bref

- **La cible.** OpenContact s'utilise comme Arc Search : une barre qui
  comprend ce que tu tapes, une app qui te prépare la page, presque pas
  de navigation, et ce qui ne sert plus qui se range tout seul. Le style
  reste « Utilitaire 98 ». Le téléphone et l'ordinateur ont chacun leur
  dessin.
- **Ce qu'on garde.** Le moteur (`engine/`, testé), les données, le
  style, et les briques d'écran déjà éprouvées (feuilles, « Annuler »,
  clavier de l'iPhone, gestes).
- **Comment.** Directement dans main, lot par lot. Tous les écrans sont
  dessinés **avant** le premier lot, pour que chaque lot construise une
  partie d'un même ensemble. La navigation ne change qu'une fois.
- **Qui teste.** Toi, en t'en servant pour ta propre recherche, avec les
  trois rapports de recherche comme garde-fou.

---

## 1. Les quatre idées d'Arc Search, traduites

| Idée | Au téléphone | À l'ordinateur | Déjà là | À faire |
|---|---|---|---|---|
| **Une barre qui comprend** | en bas, sous le pouce, toujours là | en haut, au centre ; « / » y met le curseur | la barre de « Pistes » comprend déjà métier, ville, état, groupe, et propose les fautes de frappe (`engine/requete.js`) | les verbes (« relancer Advens », « ajouter Thales », « écrire à Claire ») et les noms d'amis et de groupes : une table, sans IA |
| **L'app fait le travail** | tu tapes un nom, l'app ouvre une page toute faite : ce que fait l'entreprise, qui y est passé, à qui écrire, la prochaine étape, « Ajouter à mes pistes » | la même page, plus large | la carte (annuaire, BODACC, Wikipédia…), qui y est passé, le dirigeant proposé, l'aide à l'embauche | réunir ces morceaux en une seule page, et proposer la prochaine étape |
| **Presque pas de navigation** | plus de barre d'onglets. En bas, trois boutons, comme dans Arc Search : à gauche **tes pistes** (la dernière ouverte posée sur la pile, comme les onglets d'Arc), au centre le grand **+** qui ouvre la barre, à droite **toi** (profil, réseau, réglages). L'accueil n'est pas vide comme chez Arc : il dit ce qu'il y a à faire, et ce qu'un ami te demande y apparaît | pas d'onglets non plus : la barre en haut ; dessous, ce qu'il y a à faire et la page ouverte | les routes, les feuilles | la nouvelle coque, téléphone et ordinateur |
| **Le rangement automatique** | une piste sans nouvelles depuis 45 jours se range seule dans « Rangées » ; l'accueil le dit, avec « Annuler » | pareil | les seuils de 7, 21 et 45 jours (`engine/assist.js`), la clôture « Abandonné » | ranger sans geste, et l'annoncer ; rien n'est jamais supprimé (invariant ②) |

**Le parcours se pose dans ce cadre** (détail dans `refonte.md`) : la
cible et les entreprises proposées au début ; l'accueil qui dit quoi
faire au milieu ; la liste du contrat après « Décroché » à la fin ; la
reprise sans liste de retards et le geste après un refus pour le moral.
Une bonne partie du moteur existe déjà sans écran : la reprise après une
pause (`engine/suivi.js`), les brouillons gardés (`engine/prets.js`), les
premiers pas (`engine/assist.js`). Une partie est neuve : la liste du
contrat (`engine/contrat.js`, un champ privé, son test de fuite écrit
avant son écran) et la table des verbes.

---

## 2. Directement dans main, sans refaire la 7.x

La 7.x avait été construite lot par lot dans main, chaque lot défendable
seul, et leur somme n'était plus reconnaissable (fiche 0011). Six règles
pour que ça ne se reproduise pas :

1. **Tout dessiner d'abord.** Les maquettes de tous les écrans,
   téléphone et ordinateur, validées ensemble avant le premier lot.
   Chaque lot construit une partie de ce dessin, jamais une idée du jour.
2. **La navigation ne change qu'une fois**, dans un seul lot, quand la
   barre et la page d'entreprise sont prêtes.
3. **Chaque lot laisse l'app utilisable**, et se montre en captures
   (téléphone, ordinateur, clair, sombre, texte à 100 % et à 200 %)
   avant la fusion.
4. **Ce qu'un lot remplace part dans le même lot**, avec son style et ses
   gardes.
5. **Le moteur d'abord**, testé ; aucune clé ne bouge ; tout champ neuf
   entre dans `CONTRAT.md` et `tests.js` dans le même commit.
6. **Une version par lot** (8.2, 8.3…), et la 9.0 quand la nouvelle
   navigation arrive.

---

## 3. Les étapes

### Étape 1 — Vérifier *(aucun code d'écran)*

- **Une heure sur un vrai iPhone**, app installée : la caméra (QR), le
  rappel d'agenda (trois façons), le stockage de Safari contre celui de
  l'app installée, un lien ouvert depuis WhatsApp. L'assistant prépare
  la grille ; le résultat décide du sort de « Me le rappeler » sur
  iPhone.
- **Les chiffres du README et de `CLAUDE.md`** que la recherche n'a pas
  confirmés : remplacés par des formulations sourcées.
- **Ton carnet** : pendant que tu t'en sers pour ta recherche, tu notes
  en une ligne ce qui t'agace. C'est la seule source d'usage réel.

### Étape 2 — Dessiner

1. **Les principes de la nouvelle interface** : une page, dix règles au
   plus.
2. **La carte de l'app**, téléphone et ordinateur : ce que porte chaque
   écran, d'où s'ouvre chaque page.
3. **Les maquettes**, avec les données du jeu de test : la première
   ouverture ; l'accueil avec trente pistes ; la barre qui comprend ;
   la page d'une entreprise ; écrire, puis « et ensuite » ; une piste
   sans nouvelles et le rangement ; le retour après une pause ; un
   refus ; « Décroché » et le contrat ; le réseau ; « Moi ». D'abord au
   téléphone, puis à l'ordinateur.
   *Commencées le 9 novembre 2026* : `design/maquettes/refonte/telephone.html`
   (l'accueil, le + vide et en train de taper, la fiche d'une entreprise,
   la liste des pistes), en clair et en sombre, avec les jetons et les
   icônes de l'app. Un écran par adresse : `?ecran=…&theme=dark`.

*On passe à la suite quand* : tu as validé l'ensemble en captures.

### Étape 3 — Construire, dans main

| Lot | Contenu | Ce qui change à l'écran |
|---|---|---|
| **0. Le moteur de la barre** | les verbes, les noms, leurs tests | rien |
| **1. La page d'une entreprise** | la fiche et l'aperçu de « À découvrir » deviennent une seule page qui prépare tout | la fiche |
| **2. La barre** | la recherche de « Pistes » devient la barre qui comprend tout, dans la navigation actuelle | la barre de « Pistes » |
| **3. Le rangement automatique** | ranger, annoncer, annuler | l'accueil |
| **4. La nouvelle navigation** | téléphone : la barre en bas, plus d'onglets ; ordinateur : la barre en haut (version 9.0) | toute la coque |
| **5. Le début** | la première ouverture, la cible, les entreprises proposées | l'accueil vide |
| **6. La fin** | « Décroché », la liste du contrat, les alertes, les échéances | la fiche décrochée |
| **7. Le moral** | la reprise, le geste après un refus, le silence expliqué | l'accueil |
| **8. Le réseau** | dans la nouvelle navigation ; la conversation libre masquée | le réseau |
| **9. Moi et la finition** | profil, documents, copie, phrase de secours, appareils, réglages, accessibilité | « Moi » |

*On passe à la suite quand* : les quatre parties se jouent de bout en
bout, `?test` est vert, et le tout a tourné sur un vrai iPhone et un
vrai Android.

### Étape 4 — Montrer

Quand tu le décides, à qui tu veux. Avant, chacun enregistre une copie
ou crée sa phrase de secours.

---

## 4. Qui fait quoi

| Toi | L'assistant |
|---|---|
| tu décides, et tu valides chaque lot en captures | il prépare la grille iPhone et les maquettes |
| tu fais le test iPhone | il écrit le moteur, les tests et les écrans |
| tu t'en sers pour ta recherche, et tu notes ce qui agace | il montre les captures avant toute fusion, et dit ce qui n'est pas vérifié |

---

## 5. Les risques

| Risque | La parade |
|---|---|
| **Concevoir pour une seule personne** | les rapports de recherche ; les gardes d'accessibilité ; ton carnet d'usage |
| **Le prix de la nouveauté** (Arc a été arrêté pour ça) | chaque geste neuf a un chemin visible ; la barre vide propose ce qu'on peut taper, en pointillé, au lieu d'attendre qu'on le devine |
| **La barre ne comprend pas** | ce qu'elle ne comprend pas reste une simple recherche ; mieux vaut ne pas comprendre que mal comprendre |
| **Les lots qui dérivent** | tout dessiner d'abord ; la navigation ne change qu'une fois |
| **Le rangement qui surprend** | il s'annonce, se rattrape, et ne supprime jamais |
| **L'iPhone** (rappel, caméra, stockage) | le test de l'étape 1 ; ce qui ne marche pas sur iPhone n'y apparaît pas |
| **Une refonte qui ne finit pas** | la première version mince ; une liste « plus tard » |

---

## 6. Les décisions encore ouvertes

| | Décision | Recommandation |
|---|---|---|
| **D1** | Au téléphone, le clavier s'ouvre-t-il tout seul à l'ouverture, comme dans Arc Search ? | non, d'un tap : sinon il cache ce qu'il y a à faire. À voir en maquette |
| **D2** | À l'ordinateur, la page d'une entreprise s'ouvre à côté de la liste, ou en fenêtre ? | à voir en maquette (tu avais refusé « à côté » le 3 novembre) |
| **D3** | Masquer la conversation libre, sans rien supprimer | oui |
| **D4** | Pas d'IA dans la première version | oui |
| **D5** | Corriger les chiffres du README | oui |
| **D6** | Ranger automatiquement après 45 jours de silence | oui, avec annonce et « Annuler » |
| **D7** | L'accessibilité dans le socle (44 px au doigt, texte à 200 %) | oui |

---

## 7. Par quoi on commence

1. Tes réponses aux décisions D3 à D7 (D1 et D2 se voient en maquette).
2. La grille du test iPhone, puis le test.
3. Les maquettes : d'abord le téléphone (l'accueil, la barre, la page
   d'une entreprise), puis l'ordinateur.

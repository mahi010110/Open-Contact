# La recherche, présentée — le concept

*5 octobre 2026. Suite d'un retour du mainteneur sur les lots 1 à 3 de
[`recherche.md`](recherche.md), testés sur son téléphone : « c'est bien,
mais extrêmement mal présenté — l'UX est horrible pour une fonctionnalité
aussi incroyable. Le maître mot de l'app est facilité et intuitivité,
couplé aux deux interfaces du design adaptatif. » Ce document dit ce qui
était raté, pourquoi, et ce qui le remplace. Les règles qu'il applique
étaient déjà écrites dans `CLAUDE.md` ; elles n'avaient pas été suivies.*

---

## Ce qui était raté — relevé sur captures, au pouce et au poste

L'audit a été joué sur l'app réelle, neuf pistes semées, l'annuaire
remplacé par des réponses à sa forme relevée, en 390 × 844 et 1280 × 800,
clair et sombre.

| # | Le défaut | Où | La règle qu'il viole |
|---|---|---|---|
| 1 | **« À découvrir » est invisible.** Rien ne dit qu'on peut trouver de nouvelles entreprises ; une fois la recherche tapée, la section vit SOUS tes pistes — et, au pouce, sous le clavier, qui prend la moitié de l'écran. Au poste, elle vit sous le tableau : plus on a de pistes, plus elle s'enfonce | pouce, poste | §6 « un écran montre les affaires de l'utilisateur » : la meilleure fonction de la recherche ne se montre qu'à qui la cherche déjà |
| 2 | **Le titre de la section se fait rogner** par la barre collante quand on y descend | pouce | §5, la barre collante ne mange pas ce qu'elle commande |
| 3 | **Tes pistes et les entreprises de l'annuaire se ressemblent** : mêmes lignes, même encre, un titre en petites capitales grises pour seule frontière | pouce, poste | NN/g et les études « bento » : séparer clairement les sources fait trouver plus, plus vite |
| 4 | **Dix boutons « Ajouter » identiques**, un par ligne : un papier peint | pouce, poste | §6 règle 1 (l'encre va à ce qui change) ; Material 3 : pas d'action répétée sur chaque ligne, sauf une **bascule** qui porte un état propre à la ligne |
| 5 | **Aucune ligne ne dit pourquoi elle est là** — ni distance, ni raison. Au poste, la colonne « Activité » répète dix fois « Conseil en systèmes et logiciels informa… » | pouce, poste | §6 « le tri a une raison, et elle se voit » ; une colonne qui ne varie pas ne départage rien |
| 6 | **L'aperçu est un tableau brut** : sept rangées de même poids, le nom seulement dans la barre de titre, en petites capitales pixel | pouce, poste | §6 « trois niveaux au maximum », l'attribut distinctif en tête |
| 7 | **Au poste, l'aperçu est une fenêtre qui cache la liste** : comparer deux entreprises demande d'ouvrir, lire, fermer, ouvrir | poste | Material 3, disposition canonique liste-détail : au large, la liste et le détail côte à côte |
| 8 | **Dans la fiche, le bloc « Annuaire » est rangé par SOURCE** : replié tout en bas, sous un titre qui ne parle à personne, il mêle trois gestes de recherche, sept données et un contact possible. « Anciens de mon école » — le geste qui mène à une personne, donc à l'entretien — y est enterré | pouce, poste | §6, en toutes lettres : « les groupes rangés par **usage**, pas par type » |

## Ce que disent les sources

- **Apple, barre de portée** (*scope bar*) : quand une recherche couvre
  des ensembles **clairement distincts**, un contrôle segmenté juste sous
  le champ laisse choisir lequel. **NN/g, recherche à portée** : la portée
  se voit, se change d'un tap, et un résultat vide dans l'une doit mener à
  l'autre. Ici les deux ensembles sont aussi distincts que possible : ce
  que tu suis, et ce que tu ne connais pas encore.
- **Un contrôle segmenté** bascule **sur place** entre des vues du même
  contenu — un ou deux mots par segment, deux ou trois segments.
- **Material 3, liste-détail** : au large, la liste et le détail côte à
  côte, et choisir une ligne met le détail à jour ; à l'étroit, l'un puis
  l'autre.
- **Material 3, listes** : pas d'action supplémentaire répétée sur chaque
  ligne, **sauf une bascule** (une étoile, une épingle) — elle dit quelque
  chose de propre à chaque ligne.
- **Ce que les étudiants regardent** pour choisir une entreprise d'accueil
  (Apec ; Planète Grandes Écoles) : les missions (66 %), le secteur
  (47 %), la distance (43,8 %). L'aperçu met donc en tête l'activité et
  le lieu, puis la taille — jamais le SIREN.

---

## La nouvelle présentation

### 1. « À découvrir » est une vue, pas une section enterrée

Sous la barre de « Mes pistes », **un contrôle à deux segments** :

```
[ Mes pistes · 4 ] [ À découvrir · 10 ]
```

- Il est là **en permanence** : la fonction se voit avant d'avoir servi.
- Les deux comptes se remplissent **pendant qu'on tape** : au pouce, ils
  sont au-dessus du clavier — on voit « 10 » sans rien faire de plus.
- Rien ne part du réseau **au démarrage** (invariant ④) : sans recherche
  tapée, « À découvrir » n'a pas de compte ; c'est le **tap** sur le
  segment qui pose la question par défaut (ta zone, le numérique,
  l'employeur d'abord).
- **Mes pistes vide → À découvrir.** Une recherche qui ne trouve rien dans
  tes pistes ouvre l'autre segment : c'est la règle de NN/g, et c'est
  exactement le moment où l'annuaire sert.
- La portée tient pour la session, comme un onglet garde sa place (§5).

Les étiquettes de la barre valent pour les deux vues ; **la zone**, qui ne
concerne que l'annuaire, n'apparaît que dans « À découvrir », parmi les
étiquettes.

### 2. Au pouce : une liste, puis l'aperçu en feuille

- **Une ligne** : le nom (il plie, §4), puis une sous-ligne qui s'élide —
  `Lille · 2 km · 100-199 salariés`. Ce qui départage passe devant ;
  l'activité, presque toujours la même, ne prend plus de place.
- **Une bascule au bout** : `+` (44 px, une icône que tout le monde lit,
  et un nom complet pour le lecteur d'écran). Tapée, elle devient `✓`
  plein, **la ligne reste à sa place** — on voit où est partie
  l'entreprise (§4, « où est-ce parti ? ») — et la barre Annuler se pose.
- **La ligne** ouvre l'aperçu, en feuille.

### 3. Au poste : la liste et l'aperçu côte à côte

La disposition canonique liste-détail. La liste à gauche, l'aperçu à
droite, collé en haut pendant que la liste défile. La première ligne est
choisie d'office ; la flèche ↓ / ↑ change de ligne et l'aperçu suit le
focus. Comparer dix entreprises ne coûte plus dix fenêtres.

### 4. L'aperçu : ce qui décide d'abord

```
Capgemini Technology Services                 ← le nom, en titre
Conseil en systèmes et logiciels informatiques
⌖ Lille · 2 km    ⚇ 10 000 salariés et plus    ◷ depuis 2004
[↗ Anciens de mon école]  [↗ Offres]
────────────────────────────────────────────────
Adresse · Dirigeant · établissements · SIREN · fiche officielle  ← plus petit
[ + Ajouter à mes pistes ]                    ← le seul geste plein
```

Trois niveaux, pas sept : **qui** (le nom), **quoi et où** (activité, lieu,
taille, âge), **comment y entrer** (les anciens de ton école, les offres).
Le reste est là, plus petit, pour qui le cherche.

### 5. La fiche : chaque donnée de l'annuaire là où elle sert

Le bloc « Annuaire » disparaît ; ce qu'il portait rejoint son usage :

| Ce que l'annuaire apporte | Où ça va | Pourquoi là |
|---|---|---|
| « Anciens de mon école », « Qui y travaille » | **Contacts** | c'est un moyen de trouver quelqu'un à qui écrire |
| le dirigeant | **Contacts**, en suggestion avec `+` | c'est un contact possible |
| activité, effectif, création, établissements, site, offres | **À savoir** | c'est ce qu'on sait de l'entreprise |
| « Compléter ma fiche » (les vides seulement, avec Annuler) | **À savoir** | il complète ce qui est à côté |
| entreprise fermée | **en tête de la fiche**, au langage d'urgence | c'est la seule donnée qui réclame quelque chose |

Les règles du lot 3 ne bougent pas : rien ne part pour un bloc qu'on ne
regarde pas, rien ne change sans geste, une réponse redessine son bloc et
jamais la fiche.

---

## Les lots

**A. « À découvrir » en vue** — le contrôle segmenté, la liste au pouce
avec sa bascule, la liste-détail au poste, l'aperçu en trois niveaux. Il
emporte le lot 4 des sources (l'employeur, la jumelle, ta zone), écrit
juste avant ce retour.

**B. La fiche par usage** — le bloc « Annuaire » dissous dans Contacts et
À savoir.

Chacun se livre dans main, se regarde sur captures (pouce, poste, clair,
sombre, 200 % de texte, 320 px), et se garde : la fonction visible dès
l'ouverture, aucun appel réseau au démarrage, les comptes au-dessus du
clavier, la bascule qui garde sa ligne, la liste-détail au poste, aucun
mot privé qui sorte — le garde d'origine, rejoué tel quel.

---

*Sources : Apple, Human Interface Guidelines, champs de recherche et
barre de portée ; Nielsen Norman Group, « Scoped Search » ; études
« bento » des bibliothèques universitaires (Franklin University, Smith
College, University of Calgary) ; Material Design 3, dispositions
canoniques (liste-détail), listes, boutons segmentés ; Apec et Planète
Grandes Écoles, critères de choix d'une entreprise d'accueil.*

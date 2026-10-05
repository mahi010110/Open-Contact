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

## La nouvelle présentation — en léger

Une première version a suivi ce relevé à la lettre : un contrôle segmenté
à deux comptes, une bascule `+` sur chaque ligne, des liens habillés en
boutons, le dirigeant en puce `+` dans les contacts. Le mainteneur l'a
regardée le jour même : **« il faut que ce soit léger, discret et
optimisé au max — pas de gros boutons ni de rajout dégoulinant »**. La
seconde passe a retiré tout ce qui n'était pas indispensable. Ce qu'elle
a enlevé, et pourquoi :

| Première version | Livré | Pourquoi |
|---|---|---|
| un contrôle segmenté encadré, deux comptes | **deux onglets de texte**, un trait sous l'actif, un seul compte (celui d'« À découvrir ») | un cadre en relief pèse comme un bouton ; le compte de tes pistes est déjà dans le titre de l'écran |
| une bascule `+` au bout de chaque ligne | **aucun bouton dans la liste** : la ligne ouvre l'aperçu, qui porte le seul geste plein | dix `+` restent dix boutons identiques, le papier peint du défaut n° 4 sous un autre habit |
| « Anciens de mon école », « Offres » en boutons contourés | **des liens texte** avec ↗ | §6 : un lien emmène ailleurs, un bouton change des données |
| la zone dans un bandeau de la vue | **une étiquette parmi les autres**, avec sa croix ; retirée, elle revient en pointillé | une seule rangée d'étiquettes, un seul langage : posé en plein, proposé en pointillé |
| le dirigeant en puce `+` dans les contacts | **proposé dans « Ajouter un contact »**, en pointillé (« Selon l'annuaire ») | il sert au moment où l'on ajoute quelqu'un, pas avant ; un tap remplit le nom et le rôle, rien ne s'ajoute sans « Enregistrer » |
| sept rangées de données dans la fiche | **quatre au plus** (Activité, Taille, Dirigeant, Site) et **une ligne grise** pour la source, le SIREN, la fiche officielle, les offres | « Taille » dit effectif, âge et sites en une ligne ; la source se lit, elle ne se regarde pas |

### 1. « À découvrir » est un onglet de la barre

```
Mes pistes   À découvrir 10
             ──────────
```

- Il est là **en permanence**, sous la barre : la fonction se voit avant
  d'avoir servi, et au pouce elle reste au-dessus du clavier.
- Son compte se remplit **pendant qu'on tape**.
- Rien ne part du réseau **au démarrage** (invariant ④) : sans recherche
  tapée, c'est le **tap** sur l'onglet qui pose la question par défaut
  (ta zone, le numérique, l'employeur d'abord).
- **Sans aucune piste**, une recherche ouvre directement « À découvrir » :
  c'est la règle de NN/g, et c'est le moment où l'annuaire sert.
- L'onglet tient pour la session, comme un onglet de navigation (§5).
- Dans cette vue, « Affiner » s'efface : il trie et filtre TES pistes.

### 2. Au pouce : une liste, puis l'aperçu en feuille

- **Une ligne** : le nom (il plie, §4), puis une sous-ligne qui s'élide :
  `Lille · 2 km · 100-199 salariés`. L'activité, presque toujours la
  même, ne prend plus de place.
- **La ligne ouvre l'aperçu.** Son pied porte « Ajouter à mes pistes »,
  le seul geste plein. Une fois ajoutée, la ligne **reste à sa place** et
  dit `✓ dans tes pistes` en tête de sa sous-ligne. La barre Annuler se
  pose.

### 3. Au poste : la liste et l'aperçu côte à côte

La disposition canonique liste-détail : la liste à gauche, l'aperçu à
droite, collé en haut pendant que la liste défile. La première ligne est
choisie d'office, marquée d'un liseré navy (le châssis dit *où tu es*,
§4). ↓ / ↑ depuis la barre parcourt la liste, et l'aperçu suit le focus.

### 4. L'aperçu : ce qui décide d'abord

```
Capgemini Technology Services                 ← le nom, en titre
Conseil en systèmes et logiciels informatiques
Lille · 2 km · 10 000 salariés et plus · depuis 2004
Qui y travaille ↗   Offres d'emploi ↗          ← des liens
2 av. … · Thomas Leroy, président              ← plus petit, gris
SIREN … · 12 établissements · fiche officielle ↗
[ Ajouter à mes pistes ]                       ← le seul geste plein
```

Trois niveaux : **qui**, **quoi et où**, **comment y entrer**. Le reste
est là, en gris, pour qui le cherche. Le corps ne porte aucun bouton.

### 5. La fiche : chaque donnée de l'annuaire là où elle sert

Le bloc « Annuaire » disparaît. Ce qu'il portait rejoint son usage :

| Ce que l'annuaire apporte | Où ça va | Sous quelle forme |
|---|---|---|
| « Anciens de mon école » | **Contacts**, sous la liste | un lien ↗ |
| le dirigeant | **« Ajouter un contact »** | une proposition en pointillé, qui remplit nom et rôle |
| activité, effectif, âge, sites, dirigeant, site | **À savoir** | quatre rangées au plus |
| source, SIREN, fiche officielle, offres | **À savoir**, en dernier | une ligne grise |
| « Compléter ma fiche » | **À savoir**, au-dessus de la ligne grise | un bouton compact, **seulement s'il y a un vide**, avec ce qu'il ajoutera à côté |
| entreprise fermée | **à côté du nom** | le langage d'urgence (`mark-late`) |

**Ce qui part change sur un point, et c'est voulu.** La question par
SIREN part maintenant **à l'ouverture de la fiche**, et non plus au
dépliage d'un bloc. Ce qu'elle rapporte sert dans deux endroits qu'on
regarde sans rien déplier : la marque « fermée » à côté du nom, et le
dirigeant proposé dans « Ajouter un contact ». Elle ne porte que neuf
chiffres publics, elle part une fois par fiche et par session, et rien ne
change dans la fiche sans un geste. Une piste **sans** SIREN ne se cherche
toujours que sur « Trouver dans l'annuaire ».

---

## Les lots

**A. « À découvrir » en onglet** : les deux onglets de texte, la liste
sans bouton, la liste-détail au poste, l'aperçu en trois niveaux, la zone
parmi les étiquettes. Il emporte le lot 4 des sources (l'employeur, la
jumelle, ta zone), écrit juste avant ce retour.

**B. La fiche par usage** : le bloc « Annuaire » dissous dans Contacts,
« Ajouter un contact » et À savoir.

Livrés ensemble. Captures regardées au pouce et au poste, en clair et en
sombre, à 320 px et à 200 % de texte. Gardes :
- `e2e-decouvrir.mjs` : l'onglet visible dès l'ouverture, aucun appel au
  démarrage, le compte pendant la frappe, aucun bouton dans la liste ni
  dans le corps de l'aperçu, la ligne qui reste à sa place, la
  liste-détail au poste, aucun mot privé qui sorte (le garde d'origine,
  rejoué tel quel) ;
- `e2e-classement.mjs` : la zone parmi les étiquettes ;
- `e2e-enrichir.mjs` : chaque donnée à sa place, le dirigeant proposé
  dans « Ajouter un contact » sans s'ajouter tout seul.

---

*Sources : Apple, Human Interface Guidelines, champs de recherche et
barre de portée ; Nielsen Norman Group, « Scoped Search » ; études
« bento » des bibliothèques universitaires (Franklin University, Smith
College, University of Calgary) ; Material Design 3, dispositions
canoniques (liste-détail), listes, boutons segmentés ; Apec et Planète
Grandes Écoles, critères de choix d'une entreprise d'accueil.*

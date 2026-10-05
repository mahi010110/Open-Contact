# Des sources qui convergent, une recherche qui s'adapte — le concept

*Version de travail, 5 octobre 2026. Suite de [`recherche.md`](recherche.md),
dont les trois lots sont livrés (6.44.0 à 6.46.0). Ce document dit ce qu'on
ajoute, pourquoi, et comment on saura que c'est juste. Tout ce qu'il affirme
d'une source a été **mesuré** par `tests/e2e/sonde-sources.mjs` en CI, depuis
un vrai navigateur — jamais supposé.*

---

## Le but, en une phrase

**« À découvrir » ne dit plus seulement « ces entreprises existent » : il dit
« celles-ci peuvent te prendre, près de chez toi, et voici pourquoi ».**

## Ce qui manque aujourd'hui

Relevé dans le code de la 6.47.0 et dans la mesure du
[MESURE-BRUIT] :

| # | Le manque | Ce qu'il coûte |
|---|---|---|
| 1 | **L'app ne classe rien en ligne** : les entreprises arrivent dans l'ordre de l'annuaire, question par question | l'ordre n'a aucune raison, donc aucune ligne ne peut dire pourquoi elle est là (§6, « le tri doit avoir une raison ») |
| 2 | **Le bruit** : [MESURE-BRUIT-PHRASE] | un étudiant lit des noms qui ne peuvent pas l'accueillir |
| 3 | **« cyber » seul interroge toute la France** | un étudiant de Lille reçoit Rennes et Toulouse ; la distance est le 2ᵉ critère des étudiants (43,8 %) |
| 4 | **Rien ne dit qui recrute** | c'est pourtant la question : « où est-ce que je peux postuler ? » |
| 5 | **Une faute de frappe = rien compris** : « alternence », « Lile », « cybersécurté » | jusqu'à 27 % des requêtes portent une faute, une abréviation ou une autre graphie (Baymard) |
| 6 | **Zéro résultat en ligne = impasse** : « Rien de nouveau dans l'annuaire. » | NN/g : un écran vide doit dire pourquoi et proposer une sortie |
| 7 | **Rien n'apprend** : un étudiant cyber à Lille et un étudiant dev à Lyon voient le même ordre | l'app sait déjà ce qui leur ressemble — leurs pistes le disent — et ne s'en sert pas |

---

## Les sources, mesurées

[TABLE-SOURCES]

---

## Converger : une entreprise, plusieurs témoins

**La clé est le SIREN**, le même partout : l'annuaire le donne, La Bonne
Alternance donne le SIRET (ses neuf premiers chiffres sont le SIREN), le
BODACC et Wikidata se lisent par lui. À défaut — une liste qui ne porte que
des noms —, la correspondance se fait UNE fois, à la construction de la
liste, et la liste embarquée porte ses SIREN : jamais de rapprochement par
le nom au moment de la recherche (un homonyme deviendrait un témoin faux).

**Une entreprise trouvée par deux sources ne sort qu'une fois**, et chaque
source qui la connaît devient un **témoin** sur la ligne. Le principe 5 de
`recherche.md` (une entreprise = une ligne) s'étend aux sources nouvelles.

**L'ordre se fusionne sans se calibrer.** Les sources ne notent pas sur la
même échelle — l'annuaire ne note rien, La Bonne Alternance classe par sa
prédiction d'embauche. La fusion par rangs réciproques (*Reciprocal Rank
Fusion*, Cormack, Clarke et Buettcher, 2009) additionne pour chaque
entreprise `1 / (60 + son rang)` dans chaque source qui la rend : elle n'a
besoin d'aucun score commun, elle bat les fusions par score dans les
mesures publiées, et une entreprise que deux sources rendent monte
naturellement. C'est le socle ; le classement de la maison vient dessus.

---

## Classer : une raison par ligne

Le classement de « À découvrir » suit la même règle que celui des pistes
(§6, « choisir à la place de l'utilisateur ») : **chaque critère se lit sur
la ligne**, et la sous-ligne dit le premier qui départage. Dans l'ordre :

1. **Elle recrute** — une offre en cours, ou « embauche souvent des
   alternants » (La Bonne Alternance), quand tu cherches une alternance.
   C'est la réponse directe à « où postuler ».
2. **Elle peut t'accueillir** — elle a des salariés. Une entreprise sans
   salarié passe en dernier : elle n'est pas cachée (mieux vaut ne pas
   comprendre que mal comprendre), elle ne passe plus devant.
3. **Elle est près** — de ta position si tu l'as donnée, sinon de la ville
   tapée, sinon de ta zone (plus bas). Par paliers lisibles (moins de 5 km,
   10, 20, 50), jamais au mètre près : deux entreprises à 3,1 et 3,4 km ne
   se départagent pas par la distance.
4. **Elle ressemble à ce que tu fais déjà** — voir « S'adapter ».

La raison prend l'accent, **jamais un `mark-*`** : rien ne presse, c'est un
atout (§6). Et elle nomme : « comme Sopra Steria » vaut mieux que
« correspond à ton profil » — une information qui ne mène à personne ne
mène à rien (§8).

---

## S'adapter : ce que l'app sait déjà de toi

**Rien ne se saisit, tout se déduit** (§8, règle 2). L'app sait déjà :

| Ce qu'elle sait | D'où | Ce qu'elle en fait |
|---|---|---|
| **ta zone** | les villes et codes postaux de tes pistes (le département qui en porte le plus) | borne une question qui n'a pas de lieu — « cyber » cherche autour de chez toi, pas dans toute la France |
| **ce que tu cherches** | le profil (stage, alternance, emploi) | met « recrute en alternance » devant quand tu cherches une alternance |
| **les métiers qui t'intéressent** | les domaines de tes pistes **engagées** (contactées, en cours, réponse, gagnée) et de ce que tu as ajouté depuis l'annuaire | « comme Sopra Steria » : ce qui ressemble passe devant |
| **ce qui ne t'intéresse pas** | les pistes que tu as closes « abandonnée » | ce qui leur ressemble perd un peu, jamais tout |

Trois règles l'empêchent de devenir une bulle ou un mouchard :

- **L'adaptation réordonne, elle ne cache rien.** Une entreprise qui ne
  ressemble à rien de ce que tu fais reste dans la liste, plus bas. Le
  seul retrait est celui que tu fais toi-même.
- **Le récent pèse plus que l'ancien.** Le même principe que la
  « frecency » de Firefox (fréquence × fraîcheur, par paliers de temps) :
  une piste engagée cette semaine compte plus qu'une piste close il y a
  six mois. Tes goûts d'il y a un an ne décident pas de ceux d'aujourd'hui.
- **Rien de tout ça ne sort.** Le calcul vit sur l'appareil. Ce qui part
  reste la question (principe 4 de `recherche.md`) : un métier en codes
  d'activité, un lieu. La zone déduite part comme un lieu tapé — et elle
  **se voit**, avec sa croix, comme toute étiquette : on sait toujours ce
  que l'app a demandé en ton nom.

C'est la forme la plus simple de ce que la recherche appelle le filtrage
par le contenu (profil construit à partir des objets avec lesquels on a
interagi, rapproché vers ce qu'on garde et éloigné de ce qu'on écarte —
l'algorithme de Rocchio), et elle évite le défaut connu des méthodes
collaboratives : le **démarrage à froid**. Elle marche dès la deuxième
piste, sans aucune donnée d'autrui.

---

## Tolérer les fautes

- **Les seuils de l'industrie** : une faute permise dès 4 lettres, deux dès
  8 (les réglages par défaut d'Algolia) ; une inversion de deux lettres
  compte pour une faute (distance de Damerau-Levenshtein).
- **Contre quoi** : la table de vocabulaire (métiers, recherches, états,
  tailles), la table des villes, et les noms de tes pistes. Jamais contre
  un dictionnaire : « Orange » ne se corrige en rien.
- **Proposé en pointillé, jamais posé** (principe 2 de `recherche.md`) :
  « alternence » fait apparaître la puce pointillée **alternance**, qui
  remplace le mot d'un tap. La barre ne réécrit jamais ce que tu as tapé
  dans ton dos.
- **Un mot qui trouve déjà quelque chose ne se corrige pas.** Si
  « Lile » est le nom d'une de tes pistes, il reste « Lile ».
- **Un mot corrigé ne part pas en ligne tel quel** : tant qu'il n'est pas
  corrigé, il reste du texte local — « alternence » ne va pas chercher
  des noms d'entreprise dans l'annuaire.

---

## Ne jamais finir sur rien

NN/g : un résultat vide doit **dire** qu'il n'y a rien, **proposer** une
correction, et **montrer** quelque chose de proche. « À découvrir » le fait
avec le motif qui existe déjà pour tes pistes (`elargir`, en pointillé, avec
son compte) :

- une ville s'élargit à son département, un département à sa région ;
- une taille se retire (« sans « PME » · 34 ») ;
- un mot de texte se retire.

**Chaque proposition porte son compte** et n'est faite que si elle trouve
(§6 : jamais une valeur absente des données). Le compte coûte une question
de plus à l'annuaire (une seule ligne demandée, `per_page=1`), deux au plus,
et seulement quand la réponse est vide.

---

## Ce que le lot ne fait pas

- **Aucune IA, aucun apprentissage machine, aucune télémétrie.** Les
  règles sont une table et quelques comptes ; elles se lisent, se testent
  et s'expliquent sur la ligne (principe 7 de `recherche.md`).
- **Aucune clé, aucun compte** (§0, question ②). Une source qui en
  demande une est écartée, quelle que soit sa qualité — c'est le cas de
  l'API Offres d'emploi de France Travail et de La Bonne Boîte.
- **Aucune aspiration.** Des liens et des API ouvertes, jamais une page
  lue à la place de quelqu'un.
- **Aucun réglage.** Pas de curseur de pertinence, pas de choix de
  sources : chaque option est une décision que le concepteur n'a pas
  prise (§8, règle 3).

---

## Comment on saura que c'est juste

**Le moteur** (`tests.js`) :

- la fusion : une entreprise rendue par deux sources sort une fois, avec
  ses deux témoins, et passe devant une entreprise rendue par une seule ;
- le classement rend sa **raison** avec son rang, et la raison affichée
  est bien le premier critère qui départage ;
- l'adaptation : deux jeux de pistes (un cyber à Lille, un dev à Lyon)
  rendent deux ordres différents sur la même réponse, et aucun ne perd
  une ligne ;
- les fautes : une table de fautes réelles → la correction attendue, et
  les cent phrases du lot 1 rendent **exactement** les mêmes étiquettes
  qu'avant (aucune correction ne se glisse dans une phrase juste).

**Les scénarios** (e2e, requêtes interceptées et lues) :

- **aucun mot privé ne sort**, vers aucune source nouvelle ; une question
  vers La Bonne Alternance ne porte qu'un métier et un point ;
- la zone déduite se voit et se retire, et sa question part sans elle ;
- hors ligne, panne, limite de débit : chaque source se tait seule, les
  autres continuent ;
- chaque garde se prouve par une mutation.

---

## Les lots

[LOTS]

---

## Décisions à prendre

[DECISIONS]

---

*Sources : G. V. Cormack, C. L. A. Clarke, S. Büttcher, « Reciprocal Rank
Fusion outperforms Condorcet and individual rank learning methods »,
SIGIR 2009 ; Baymard Institute, études sur la recherche en e-commerce
(fautes, synonymes, autocomplétion) ; Algolia, documentation de la
tolérance aux fautes ; NN/g, « No results » et pages de résultats vides ;
Mozilla, documentation du classement de la barre d'adresse (frecency) ;
J. J. Rocchio, retour de pertinence, et Jannach et al., *Recommender
Systems: An Introduction*, ch. 3 (recommandation par le contenu) ;
La Bonne Alternance (France Travail, ministère du Travail), algorithme
prédictif d'embauche ; [SOURCES-MESUREES].*

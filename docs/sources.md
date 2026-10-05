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

Relevé dans le code de la 6.47.0, et mesuré en CI le 5 octobre 2026
(`sonde-sources.mjs`, partie D, sur le vrai annuaire) :

| # | Le manque | Ce qu'il coûte |
|---|---|---|
| 1 | **L'app ne classe rien en ligne** : elle montre l'ordre de l'annuaire, et **sans mot tapé l'annuaire trie par nombre d'établissements**. « numérique · Nord » rend en tête Capgemini, Sopra Steria, Inetum, Orange Business Services, Altran, CGI — les mêmes partout, autour de Lille comme dans tout le Nord | « À découvrir » fait découvrir… les entreprises que tout étudiant connaît déjà, et aucune ligne ne peut dire pourquoi elle est là (§6, « le tri doit avoir une raison ») |
| 2 | **Le bruit, derrière les géants** : sur 7 897 entreprises du numérique dans le Nord, **3 121 (40 %) sont des entrepreneurs individuels** — une personne, son nom en guise de raison sociale — et **6 379 (81 %) ne déclarent aucun salarié** (zéro, ou taille inconnue). Avec un mot, c'est l'inverse : « cyber · Nord » rend 10 entreprises, dont 7 de taille inconnue et 2 personnes en nom propre | un étudiant lit des noms qui ne peuvent pas l'accueillir — et des noms de personnes que l'app affiche sans qu'elles l'aient demandé, à rebours de « aucune personne importée d'office » |
| 3 | **« cyber » seul interroge toute la France** | un étudiant de Lille reçoit Rennes et Toulouse ; la distance est le 2ᵉ critère des étudiants (43,8 %) |
| 4 | **Rien ne dit qui peut t'accueillir** | c'est pourtant la question : « où est-ce que je peux postuler ? » |
| 5 | **Une faute de frappe = rien compris** : « alternence », « Lile », « cybersécurté » | jusqu'à 27 % des requêtes portent une faute, une abréviation ou une autre graphie (Baymard) |
| 6 | **Zéro résultat en ligne = impasse** : « Rien de nouveau dans l'annuaire. » | NN/g : un écran vide doit dire pourquoi et proposer une sortie |
| 7 | **Rien n'apprend** : un étudiant cyber à Lille et un étudiant dev à Lyon reçoivent les mêmes propositions et, pour « cyber », la même liste nationale | l'app sait déjà où ils cherchent et ce qu'ils font — leurs pistes le disent — et ne s'en sert pas |

---

## Les sources, mesurées

Treize candidates relevées le 5 octobre 2026, depuis un vrai Chromium
(partie A : la page appelle) puis côté serveur (A bis : pourquoi un refus ;
B : ce que l'API dit savoir). **La question n'est pas « est-ce une bonne
source ? » mais « répond-elle à une page web, sans clé ? »** — sans quoi il
faudrait un serveur OpenContact (§10) ou un compte du mainteneur (§0,
question ②).

| Source | Depuis le navigateur, sans clé | Ce qu'elle apporte | Sort |
|---|---|---|---|
| **Annuaire des entreprises** | ✓ (déjà en service) | ce qu'on ne lui demandait pas : `est_entrepreneur_individuel`, `convention_collective_renseignee`, la liste des conventions (`liste_idcc`), le caractère employeur de l'établissement, l'ordre par taille ou non (`sort_by_size`) | **on s'en sert mieux** — c'est là qu'est le gain (lot 4) |
| **BODACC** (annonces légales, DILA) | ✓ 0,8 s, licence ouverte | les **procédures collectives** par SIREN : redressement, liquidation — relevé : le jugement dit en clair « Ouvre les opérations de la liquidation judiciaire », avec sa date | **sur la fiche** : la seule information qui réclame quelque chose (lot 6) |
| **Géoplateforme** (géocodage de l'IGN, base adresse nationale) | ✓ 1 s, 50 appels/s | la position d'une adresse française, de la même base que celle de l'annuaire | **remplace Nominatim** (1 appel/s, pensé pour le monde) pour placer une piste (lot 6) |
| **Wikidata** | ✓ 75 ms | en plus du site : l'**identifiant LinkedIn** de l'entreprise (P4264 — relevé : « orange », « engie », la fin de l'adresse de sa page) | « Qui y travaille » mène à **la page de l'entreprise**, plus à une recherche de mots (lot 6) |
| **OpenStreetMap** (Overpass) | ✓ serveur principal 1,7 à 3 s ; un miroir a mis 230 s, l'autre n'a pas répondu | des bureaux « informatique » avec parfois un site ou un téléphone | **pas maintenant** : couverture mince, service irrégulier |
| **La Bonne Alternance** | ✗ — l'ancienne API (v1) n'existe plus (404) ; la nouvelle (v3) exige un jeton (401) | « entreprises susceptibles de recruter en alternance », par prédiction | **exclue par la question ②** : un jeton est un compte du mainteneur |
| **API apprentissage** (offres d'alternance) | ✗ — « Vous devez fournir une clé d'API valide » (401) | les offres d'alternance | **exclue** (②) |
| **France Travail** (offres), **La Bonne Boîte** | ✗ — compte et clé, connu | offres, prédiction d'embauche | **exclues** (②) — restent des liens |
| **Prestataires qualifiés ANSSI** | un PDF (catalogue de l'ANSSI) ; aucun jeu de données ouvert | « qualifié ANSSI » pour une entreprise de cyber | **plus tard** : il faudrait embarquer une liste et la tenir à jour |
| **Apprentis par entreprise** (data.gouv) | aucun jeu de données trouvé | — | rien |

Une dernière mesure (partie E) a fixé la façon de mieux l'interroger :

- **l'ordre par taille ne se débraye pas.** `sort_by_size=false` rend
  les mêmes groupes nationaux en tête, autour d'un point comme dans un
  département. L'ordre par distance se fait donc chez toi, sur ce que
  l'annuaire a rendu ;
- **« convention renseignée » rend aussi les géants en tête** — 1 384
  employeurs sur 4 776 entreprises (hors entrepreneurs individuels), mais
  la même première page ;
- **« 10 à 499 salariés » rend d'autres entreprises** : sur les mêmes
  codes, dans le Nord, Jiliti, Cofidoc, Incomm, Visiativ, ChapsVision,
  Hays — 528 employeurs de taille moyenne, presque tous à moins de 10 km
  de Lille, qu'aucune première page ne montrait. C'est cette question-là
  qui fait découvrir ;
- **des appels rapprochés rendent « 429 »** dès une dizaine d'affilée :
  trois questions par recherche au plus, espacées.

**Ce que la mesure tranche : le gain n'est pas dans une source de plus,
il est dans la source qu'on a.** La seule source qui aurait dit « elle
recrute des alternants » est fermée sans clé. Mais l'annuaire porte déjà
le signal qui s'en approche le plus : **la convention collective n'est
renseignée que pour une entreprise qui déclare des salariés** (elle vient
des déclarations sociales des employeurs, avec quelques mois de retard —
une entreprise créée cette année ne l'a pas encore). Syntec (1486), la convention
du conseil et des services numériques, figure chez 17 des 25 premières
entreprises du numérique dans le Nord. L'app ne la demandait pas.

---

## Converger : une entreprise, plusieurs témoins

Les sources ouvertes ne se recoupent pas : chacune répond à une question
différente sur la même entreprise. **La clé qui les relie est le SIREN**,
le même partout : l'annuaire le donne, le BODACC et Wikidata se lisent
par lui. Elles convergent à deux endroits.

**Dans « À découvrir », plusieurs questions font une liste.** Une seule
question à l'annuaire rend un ordre qui a ses raisons à lui — la taille,
quand on n'a pas tapé de mot. Deux questions (ce que tu as tapé, et les
employeurs de taille moyenne au même endroit) rendent deux ordres, et une entreprise que les
deux rendent est plus sûrement celle qu'on cherche. Les listes se
fusionnent **sans se calibrer**, par rangs réciproques (*Reciprocal Rank
Fusion*, Cormack, Clarke et Büttcher, 2009) : chaque entreprise reçoit
`1 / (60 + son rang)` dans chaque liste qui la contient. Aucun score
commun n'est nécessaire, la méthode bat les fusions par score dans les
mesures publiées, et une entreprise que deux questions rendent monte
d'elle-même. C'est le socle ; le classement de la maison vient dessus.
Une entreprise = une ligne (principe 5 de `recherche.md`), quel que soit
le nombre de questions qui l'ont trouvée.

**Sur la fiche, chaque source dit ce qu'elle seule sait** : l'annuaire,
qui elle est ; le BODACC, si elle traverse une procédure collective ;
Wikidata, son site et sa page LinkedIn ; la Géoplateforme, où se trouve
l'adresse que tu as saisie. Aucune ne se rapproche par le nom au moment
d'afficher — un homonyme deviendrait un témoin faux : sans SIREN, c'est
toi qui choisis la bonne entreprise (« Trouver dans l'annuaire », lot 3).

---

## Classer : une raison par ligne

Le classement de « À découvrir » suit la même règle que celui des pistes
(§6, « choisir à la place de l'utilisateur ») : **chaque critère se lit sur
la ligne**, et la sous-ligne dit le premier qui départage. Dans l'ordre :

1. **Elle emploie des salariés** — une convention collective renseignée,
   ou une tranche d'effectif déclarée. C'est le signal mesurable le plus
   proche de « elle peut t'accueillir » : la seule source qui aurait dit
   « elle recrute des alternants » est fermée sans clé. Une entreprise
   sans signal passe après : elle n'est pas cachée (mieux vaut ne pas
   comprendre que mal comprendre — une entreprise créée cette année n'a
   pas encore de convention), elle ne passe plus devant.
2. **Elle est près** — de ta position si tu l'as donnée, sinon de la ville
   tapée, sinon de ta zone (plus bas). Par paliers lisibles (moins de 5 km,
   10, 20, 50), jamais au mètre près : deux entreprises à 3,1 et 3,4 km ne
   se départagent pas par la distance. La distance est le deuxième critère
   des étudiants pour choisir une entreprise d'accueil (43,8 %), juste
   derrière les missions.
À égalité, l'ordre de la fusion décide : il garde la trace de ce que
l'annuaire jugeait pertinent pour le texte tapé.

La raison prend l'accent, **jamais un `mark-*`** : rien ne presse, c'est un
atout (§6). Et elle nomme : « comme Sopra Steria » vaut mieux que
« correspond à ton profil » — une information qui ne mène à personne ne
mène à rien (§8).

---

## S'adapter : ce que l'app sait déjà de toi

**Rien ne se saisit, tout se déduit** (§8, règle 2). L'app sait déjà :

| Ce qu'elle sait | D'où | Ce qu'elle en fait |
|---|---|---|
| **ta zone** | les villes et codes postaux de tes pistes (le département qui en porte le plus, deux pistes au moins) | borne une question qui n'a pas de lieu — « cyber » cherche autour de chez toi, plus dans toute la France |
| **où tu es** | ta position, si tu l'as donnée (« près de moi ») | la distance de chaque établissement, par paliers |
| **ton métier du moment** | les domaines de tes pistes **engagées** (contactées, en cours, réponse, décrochée), pondérés par leur fraîcheur | la barre vide te propose ta recherche à toi : « alternance · Cybersécurité · Lille », avec son compte |
| **ce que tu cherches** | le profil (stage, alternance, emploi) | déjà en service : la première proposition de la barre |

**Ce qu'elle ne sait pas encore, et ce qu'il faudrait pour le savoir.**
« Comme Advens et Lumen Data » — ce qui ressemble à ce que tu fais passe
devant — est la raison la plus personnelle qu'une ligne puisse donner.
Mais mesurée sur les données d'aujourd'hui, elle ne départage rien : une
piste ne garde ni sa taille ni son code d'activité, et presque toutes les
découvertes du numérique tombent dans le même domaine. Elle demande deux
signaux que l'app n'a pas : **ce que tu écartes** (« Pas pour moi », voir
les décisions) et **la taille de ce que tu ajoutes** (la tranche
d'effectif gardée sur la piste à l'ajout — un champ de plus au contrat).
Elle viendra avec eux, pas avant : un critère qui ne départage rien est
du code mort (§6).

Trois règles empêchent l'adaptation de devenir une bulle ou un mouchard :

- **L'adaptation réordonne et propose, elle ne cache rien.** Une
  entreprise loin de ta zone reste trouvable : il suffit de taper un
  lieu, ou de retirer l'étiquette de zone. Le seul retrait est celui que
  tu fais toi-même.
- **Le récent pèse plus que l'ancien.** Le même principe que la
  « frecency » de Firefox (fréquence × fraîcheur, par paliers : moins de
  4 jours, 14, 31, 90, au-delà) : une piste engagée cette semaine compte
  plus qu'une piste close il y a six mois. Ton métier d'il y a un an ne
  décide pas de celui d'aujourd'hui.
- **Rien de tout ça ne sort.** Le calcul vit sur l'appareil. Ce qui part
  reste la question (principe 4 de `recherche.md`) : un métier en codes
  d'activité, un lieu. La zone déduite part comme un lieu tapé — et elle
  **se voit**, avec sa croix, comme toute étiquette : on sait toujours ce
  que l'app a demandé en ton nom.

C'est la forme la plus simple de ce que la recherche appelle le filtrage
par le contenu (un profil construit à partir des objets avec lesquels on a
interagi — l'algorithme de Rocchio en est l'ancêtre), et elle évite le
défaut connu des méthodes collaboratives : le **démarrage à froid**. Elle
marche dès la deuxième piste, sans aucune donnée d'autrui.

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
  rendent deux zones et deux propositions différentes, et la même
  réponse de l'annuaire ne perd aucune ligne chez l'un ou l'autre ;
- les fautes : une table de fautes réelles → la correction attendue, et
  les cent phrases du lot 1 rendent **exactement** les mêmes étiquettes
  qu'avant (aucune correction ne se glisse dans une phrase juste).

**Les scénarios** (e2e, requêtes interceptées et lues) :

- **aucun mot privé ne sort**, vers aucune source nouvelle ; une question
  vers le BODACC ou Wikidata ne porte qu'un SIREN ;
- la zone déduite se voit et se retire, et sa question part sans elle ;
- hors ligne, panne, limite de débit : chaque source se tait seule, les
  autres continuent ;
- chaque garde se prouve par une mutation.

---

## Les lots

Chacun se livre dans main, se teste sur le téléphone, et se mesure **avant
et après** sur les mêmes questions réelles (sonde en CI) : combien
d'entreprises différentes, combien d'employeurs, à quelle distance.

4. **Une liste qui peut t'accueillir.** Rien de nouveau à appeler :
   l'annuaire, mieux interrogé, et un classement qui dit sa raison.
   - plus aucune **personne** dans « À découvrir » : les entrepreneurs
     individuels ne sont plus demandés (40 % du numérique dans le Nord) ;
   - **deux questions, une liste** : celle d'aujourd'hui, et sa jumelle
     limitée aux **employeurs de 10 à 499 salariés**, fusionnées par rangs
     réciproques — sans quoi les géants nationaux prennent toute la
     première page (sauf si tu as tapé une taille : ta taille décide) ;
   - le **classement de la maison** (employeur, distance par paliers)
     et **sa raison sur la ligne** ;
   - la **zone déduite** de tes pistes quand la question n'a pas de lieu,
     visible et retirable ;
   - la barre vide qui propose **ton métier du moment**.
5. **Les fautes et le zéro résultat.** La correction proposée en
   pointillé (prototype mesuré : 38 fautes sur 41 retrouvées, **aucune**
   correction proposée sur 80 mots justes — noms d'entreprises, technos,
   prénoms, petites villes), et « À découvrir » qui élargit au lieu de
   finir sur « Rien de nouveau ».
6. **La fiche converge.** Une procédure collective en cours se dit
   (BODACC), « Qui y travaille » ouvre la page LinkedIn de l'entreprise
   quand Wikidata la connaît, et une adresse se place par le géocodage
   officiel.

**Après, si tu le veux** : « Pas pour moi » sur une ligne de « À
découvrir » (voir les décisions), la liste ANSSI pour la cyber.

---

## Décisions du mainteneur (5 octobre 2026)

1. **La zone déduite part d'office, et se voit.** Une question en ligne
   sans lieu prend le département de tes pistes, affiché comme une
   étiquette avec sa croix : un tap et elle part sans.
2. **« Pas pour moi » : plus tard.** Le classement et la zone d'abord ;
   la question se rouvre après les essais sur le téléphone. Sans lui, la
   ressemblance (« comme Advens ») attend aussi — elle n'a pas de quoi
   départager.
3. **La liste ANSSI : plus tard**, si les étudiants en cyber la demandent.

---

*Sources : G. V. Cormack, C. L. A. Clarke, S. Büttcher, « Reciprocal Rank
Fusion outperforms Condorcet and individual rank learning methods »,
SIGIR 2009 ; Baymard Institute, études sur la recherche en e-commerce
(fautes, synonymes, autocomplétion) ; Algolia, documentation de la
tolérance aux fautes ; NN/g, « No results » et pages de résultats vides ;
Mozilla, documentation du classement de la barre d'adresse (frecency) ;
J. J. Rocchio, retour de pertinence, et Jannach et al., *Recommender
Systems: An Introduction*, ch. 3 (recommandation par le contenu) ;
Planète Grandes Écoles et Apec, enquêtes sur les
critères de choix d'une entreprise d'accueil (missions 66 %, secteur 47 %,
distance 43,8 %) ; ministère du Travail, jeu de données `siret2idcc`
(conventions collectives par établissement, tirées de la DSN) ; DILA,
API BODACC ; IGN, service de géocodage de la Géoplateforme ; mesures du
5 octobre 2026, `tests/e2e/sonde-sources.mjs`.*

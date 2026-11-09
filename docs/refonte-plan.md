# La refonte — plan de mise en œuvre

**Ce document dit comment la refonte se fait : quoi, dans quel ordre, par
qui, et à quoi on reconnaît qu'une étape est finie.** Le périmètre est
dans [`refonte.md`](refonte.md), le pourquoi dans la fiche
[0013](decisions/0013-la-refonte.md), les preuves dans `reports/`.

*Proposé par l'assistant le 9 novembre 2026. Rien ici n'est décidé tant
que le mainteneur ne l'a pas validé : les sept décisions à prendre sont
au §6.*

---

## En une page

- **Ce qu'on construit.** La même app, entièrement redessinée dans un
  cadre qui ne bouge pas : Aujourd'hui · Pistes · Réseau · Moi. Elle
  accompagne du choix de la cible jusqu'au contrat qui tient.
- **Ce qu'on garde.** Le moteur (`engine/`, 13 300 lignes, testé), les
  données, le style 98, et les briques d'écran déjà éprouvées (feuilles,
  « Annuler », clavier, gestes).
- **Ce qu'on réécrit.** Les écrans : environ 19 700 lignes dans `ui/` et
  4 000 dans `styles/app.css`. C'est le gros du travail.
- **Comment.** Une seconde entrée, `nouveau.html`, à côté de l'app
  actuelle, sur les mêmes données. L'app actuelle ne change pas jusqu'à
  la bascule.
- **Dans quel ordre.** Comprendre, dessiner, construire en neuf lots,
  essayer avec une classe, basculer. Chaque étape a une condition de
  sortie.
- **Le premier geste.** Pas du code : cinq conversations avec des
  étudiants, et une heure de test sur un vrai iPhone.

---

## 1. La première version : mince, mais complète

Les quatre parties du parcours existent dès la première version, chacune
à son minimum. La colonne « déjà là » vient d'une relecture du code le
9 novembre 2026.

| Partie | Ce que vit l'étudiant | Déjà là | À ajouter |
|---|---|---|---|
| **Le début** | Il dit ce qu'il cherche en quatre taps. L'app lui propose tout de suite des entreprises autour de lui. Il en garde quelques-unes. | Le profil porte déjà la cible (contrat, formation, ville, rayon, début). « À découvrir » et l'annuaire. `premiersPas` (`engine/assist.js`). | L'écran d'accueil de la première ouverture. Sur iPhone, proposer d'installer l'app **avant** la première saisie (§2). |
| **Le milieu** | « Aujourd'hui » dit sa recherche en une ligne, puis ce qu'il a à faire, toutes pistes confondues. Après un envoi, il décide de la suite : « si pas de réponse lundi, je relance ». Un silence a toujours une sortie. | Les relances dues, « Sans nouvelles » à 7, 21 et 45 jours, le composeur, le rappel d'agenda. Les brouillons gardés (`engine/prets.js`, écrit, sans écran). | L'en-tête « ma recherche ». La suite formulée en « si… alors ». |
| **La fin** | Avant un entretien, il relit ce qu'il sait de l'entreprise et qui y est passé. Quand on lui dit oui, la fiche le mène jusqu'au contrat : convention signée (stage) ; promesse, CERFA, début, OPCO, 45ᵉ jour (alternance). | « Décroché » s'arrête aujourd'hui à « Ajouter à mon parcours ». L'aide à l'embauche (`engine/marche.js`). | Un module neuf, `engine/contrat.js`, et un champ privé sur la piste. Deux alertes contre les arnaques. Les échéances dans l'agenda. |
| **Le moral** | S'il revient après trois semaines, l'app lui dit par où reprendre, sans liste de retards. Après un refus, un geste facultatif et privé, puis une autre piste. | `enPause` et `reprendre` (`engine/suivi.js`, écrits, sans écran). | L'écran de reprise. Le geste après « Refusé ». Une phrase quand une piste passe « Sans nouvelles ». |

**Le réseau** garde ce que personne d'autre ne fait : qui est passé où,
la demande qui va de proche en proche, les groupes qui reçoivent des
pistes et des demandes, Donner et Recevoir. **La conversation libre**
(messages de groupe, messages entre amis) n'est pas redessinée dans la
première version : elle est masquée, ses données restent (décision D3).

**Ce qui n'entre pas dans la première version** : l'IA, les filières
hors informatique (seul le vocabulaire devient neutre), l'app des
stores, tout compteur de candidatures, toute série de jours.

**Un module à ne pas reprendre tel quel** : `engine/semaine.js` fixe un
objectif en nombre de mails partis. La recherche dit que le volume
prédit mal le résultat (van Hooft et al., 2021). L'app montrera ce qui a
avancé, jamais un quota.

---

## 2. Comment on construit à côté

**Une seconde entrée, à la racine du site.** `nouveau.html` charge son
propre amorçage, son dossier d'écrans et sa feuille de style (noms
provisoires : `app-nouveau.js`, `ui-nouveau/`, `styles/app-nouveau.css`).
Elle partage avec l'app actuelle le moteur, les jetons de
`styles/tokens/`, les polices, les icônes et **le stockage** : même
origine, donc mêmes données.

Pourquoi cette forme plutôt qu'un interrupteur dans l'app :

- l'app en service n'est jamais touchée, donc jamais cassée ;
- le service worker sert déjà toute page `.html` nommée à la racine
  (`sw.js`) — un sous-dossier, lui, retomberait sur `index.html` ;
- deux onglets ouverts se préviennent déjà quand l'un écrit
  (`ui/state.js`) ;
- pendant la construction, ce que la nouvelle version ne sait pas encore
  faire reste faisable dans l'ancienne, sur les mêmes pistes.

**Ce qui se réutilise.** `ui/state.js` (l'état, l'enregistrement, les
gestes sur une piste) est importé tel quel. Les briques de `ui/dom.js`
(feuilles, toast, « Annuler », suppression au geste, champs qui
grandissent) et `ui/zone-visible.js` (le clavier de l'iPhone) servent de
point de départ : elles portent des corrections payées cher. Règle : la
nouvelle version **importe** ce qui ne change pas et **copie** ce qu'elle
doit changer. Elle ne modifie jamais un fichier de l'app en service.

**Les données.** Aucune clé ne bouge. Un champ neuf entre dans
`CONTRAT.md` et dans `tests.js` dans le même commit. Le seul prévu : la
suite d'une piste décrochée (les étapes du contrat), **privée**. Son
test de fuite s'écrit avant son écran.

**Les tests.**

- `?test` reste vert à chaque commit.
- Les scénarios qui gardent les données et la vie privée (stockage,
  durabilité, mise à jour, verrou, sync, fuites des partages) sont
  rejoués sur la nouvelle entrée, lot par lot.
- Chaque lot ajoute un scénario qui joue son parcours de bout en bout.
- Les gardes au pixel de l'interface actuelle ne sont pas portés
  d'office : ils partent avec elle, et un garde revient si son problème
  revient (règle du socle).

**Ce qui se montre avant d'entrer dans main.** Chaque lot finit par des
captures : téléphone (390 × 844 et 360 × 640), tablette, poste ; clair et
sombre ; texte à 100 % et à 200 %. Le mainteneur les regarde, puis joue
le lot sur son téléphone. Ensuite seulement, la fusion : `nouveau.html`
arrive dans main sans que l'app actuelle y mène.

**L'iPhone, à part.** Une app installée sur l'écran d'accueil n'a pas le
même stockage que Safari : qui commence dans Safari puis installe
retrouve une app vide. La nouvelle version propose donc l'installation
avant la première saisie, et la bêta s'installe depuis `nouveau.html`.
À vérifier sur un vrai appareil (étape 1).

---

## 3. Les étapes

### Étape 1 — Comprendre *(aucun code)*

| Quoi | Qui | Ce qui en sort |
|---|---|---|
| **Une heure sur un vrai iPhone**, app installée : la caméra (QR), le rappel d'agenda (trois façons), le stockage Safari contre app installée, un lien ouvert depuis WhatsApp | le mainteneur, avec une grille préparée par l'assistant | un tableau rempli dans `docs/`. Il décide du sort de « Me le rappeler » et de l'accueil sur iPhone |
| **Cinq entretiens de 45 minutes** avec des étudiants qui cherchent ou viennent de chercher, plus un enseignant qui suit les stages. Dix minutes de chaque entretien : la personne se sert de l'app actuelle, sans aide (les parcours de `docs/mesure/protocole.md`) | le mainteneur. L'assistant prépare le guide et met les notes au propre | la carte du parcours vécu, avec ses émotions et ses risques. Les réponses à quatre questions : où vit la classe, quel moment est le plus dur, quel usage de l'IA, comment ils suivent leurs candidatures |
| **Un test de premier clic** sur les mots des onglets : deux barres en image, huit tâches, cinq étudiants par barre | le mainteneur, pendant les entretiens | les quatre mots confirmés, ou un mot à changer |
| **Les chiffres du README et de `CLAUDE.md`** que la recherche n'a pas confirmés (« 40 pour 1 », « 34 fois », « 66 % contre 32 % ») | l'assistant, sur accord (D6) | des formulations sourcées |

*On passe à la suite quand* : cinq entretiens sont faits, le mainteneur
reconnaît le parcours dans la carte, le tableau iPhone est rempli, les
décisions du §6 sont prises.

### Étape 2 — Dessiner

1. **Les principes de la nouvelle interface**, une page, dix règles au
   plus, tirées de la recherche et du socle.
2. **La carte de l'app** : les quatre lieux, ce que porte chaque écran,
   quelles feuilles s'ouvrent d'où.
3. **Les maquettes des dix moments**, avec les données du jeu de test,
   au téléphone puis au poste, en clair et en sombre : la première
   ouverture ; les entreprises proposées ; « Aujourd'hui » avec trente
   pistes ; la fiche ; écrire, puis « et ensuite » ; une piste sans
   nouvelles et le retour après une pause ; un refus ; « Décroché » et le
   contrat ; le réseau ; « Moi ».
4. **Des essais à voix haute** avec cinq étudiants, sur des maquettes
   cliquables que le mainteneur ouvre sur son téléphone. Un journal des
   problèmes, une retouche entre deux séances.

*On passe à la suite quand* : le mainteneur a validé les maquettes en
captures, et au moins quatre étudiants sur cinq comprennent chaque
partie du parcours sans aide.

### Étape 3 — Construire, en neuf lots

Chaque lot suit le même chemin : le moteur et ses tests, l'écran au
téléphone **et** au poste, les captures, l'accord du mainteneur, la
fusion.

| Lot | Contenu | Taille |
|---|---|---|
| **0. La coquille** | `nouveau.html`, la navigation (en bas au téléphone, en haut dès 901 px), le thème, les feuilles, l'état partagé, le service worker | moyen |
| **1. Pistes et fiche** | la liste, la recherche, ajouter une piste, la fiche (statut, prochaine action, notes, contacts, « À savoir »), supprimer et annuler | gros |
| **2. Aujourd'hui et écrire** | l'en-tête « ma recherche », ce qu'il y a à faire, « Sans nouvelles », le composeur, « et ensuite », les brouillons gardés, le rappel | gros |
| **3. Le début** | la première ouverture, la cible, les entreprises proposées, les écrans vides, « J'ai déjà OpenContact » | moyen |
| **4. La fin** | préparer un entretien, « Décroché » et la liste du contrat, les alertes, les échéances | moyen |
| **5. Le moral** | la reprise après une pause, le geste après un refus, le silence expliqué, ce qui a avancé | petit |
| **6. Le réseau** | les amis et qui est passé où ; Donner et Recevoir ; les demandes suivies ; les groupes qui reçoivent pistes et demandes | gros, à découper en trois |
| **7. Moi et la sécurité** | le profil, les documents, la copie, la phrase de secours, les appareils, le verrou, les réglages | gros |
| **8. La finition** | le clavier et le lecteur d'écran, le texte à 200 %, l'aide et la confidentialité, le résumé que l'étudiant choisit d'envoyer | moyen |

Après les lots 0 à 2, le mainteneur peut se servir de la nouvelle version
tous les jours pour sa propre recherche. C'est le premier vrai test.

*On passe à la suite quand* : les quatre parties se jouent de bout en
bout, `?test` est vert, les scénarios des données et de la vie privée
sont verts sur la nouvelle entrée, et le tout a tourné sur un vrai
iPhone et un vrai Android.

### Étape 4 — Essayer

- **Une classe, pas des individus.** Le réseau ne vaut que si plusieurs
  camarades ont l'app. La bêta se joue avec la classe du mainteneur, ou
  celle d'un enseignant volontaire : dix minutes de présentation, un QR
  pour installer, un groupe créé d'avance.
- **Des adultes volontaires**, prévenus que c'est un essai.
- **La copie d'abord.** Chaque testeur enregistre une copie ou crée sa
  phrase de secours le premier jour.
- **Des retours sans mouchard.** Toutes les deux semaines, l'app calcule
  un résumé sans aucun nom (pistes par étape, silences relancés ou
  clos). L'étudiant le lit, puis l'envoie lui-même s'il le veut. Un
  court échange à chaque fois.
- **Une vraie saison.** Selon l'Apec, les recrutements d'alternants se
  concentrent en mai et juin. Une bêta qui commence avant le printemps
  2027 voit la recherche en vrai ; sinon, il faut attendre la saison
  suivante.

*On passe à la suite quand* : les parcours se font seuls, aucun signe de
préjudice (culpabilité, anxiété, données perdues), les retours sont
traités. Ce qui juge : les étudiants qui décrochent et ce qu'ils disent,
jamais le nombre d'ouvertures.

### Étape 5 — Basculer

1. Le mainteneur décide ; la décision entre dans une fiche.
2. `index.html` devient la nouvelle app (version 9.0.0). Les données ne
   bougent pas.
3. L'ancienne interface reste une version sous une adresse à part, le
   temps de s'assurer que rien ne manque. Puis elle part, avec son
   style et ses gardes.
4. `CLAUDE.md` est réécrit autour de la nouvelle interface, en court.
   Les anciennes règles vont dans une archive.
5. L'aide, la page de confidentialité, le README et `surfaces.md`
   suivent.

---

## 4. Qui fait quoi

| Le mainteneur | L'assistant |
|---|---|
| décide (§6) et tranche à chaque fin de lot | prépare les guides, les grilles et les maquettes |
| parle aux étudiants et à l'enseignant | écrit le moteur, les tests et les écrans |
| teste sur son téléphone | fait les captures et les montre avant toute fusion |
| trouve la classe de la bêta | tient les documents à jour, et dit ce qui n'est pas vérifié |

Un lot tient en quelques séances de travail. Chaque séance finit par un
commit poussé : un travail coupé en route ne se perd pas.

---

## 5. Les risques

| Risque | Comment on le voit venir | La parade |
|---|---|---|
| **Une refonte qui ne sort jamais** (tout redessiner, quatre parties, pas de date) | un lot qui double de taille, une étape sans fin | la première version mince, les conditions de sortie, une liste « plus tard » tenue dans `refonte.md` |
| **Personne ne s'en sert** | une bêta sans retours | parler aux étudiants avant de dessiner ; une classe plutôt que des individus ; un enseignant relais |
| **Ce qui plaît au mainteneur ne convient pas aux étudiants, ou l'inverse** | un « c'était mieux avant » après coup | les maquettes avant le code, les captures avant la fusion, les essais à voix haute |
| **L'iPhone** (rappel, caméra, stockage) | le test de l'étape 1 | un repli prévu pour chacun ; ce qui ne marche pas sur iPhone n'y apparaît pas |
| **Un réseau vide** | l'onglet Réseau sans personne | l'app doit servir seul ; le réseau n'est jamais le premier écran ; l'adoption se fait par classe |
| **Des preuves fragiles** (sources lues en extrait, rien de propre au BTS SIO) | — | les entretiens ; chaque idée notée comme hypothèse ; aucun chiffre affiché sans sa source |
| **Un testeur perd ses données** | — | la copie le premier jour, la phrase de secours, l'installation avant la saisie |

---

## 6. Les décisions à prendre maintenant

| | Décision | Recommandation |
|---|---|---|
| **D1** | Garder les quatre onglets (Aujourd'hui · Pistes · Réseau · Moi) et tout redessiner à l'intérieur | oui : c'est ce que disent les guides et la recherche, et c'est le moins risqué |
| **D2** | Valider les garde-fous de la fiche 0013 : des étapes à condition de sortie, une première version mince mais complète, l'app actuelle en service jusqu'à la bascule, l'accessibilité dans le socle | oui |
| **D3** | La conversation libre : ne pas la redessiner dans la première version, la masquer sans rien supprimer | oui, à confirmer après les entretiens |
| **D4** | Une première version sans IA | oui ; « relire, pas rédiger » à étudier après la bêta |
| **D5** | Montrer l'app actuelle à ses contacts dès maintenant, comme premier pas de l'étape 1 | oui |
| **D6** | Corriger maintenant les chiffres du README et de `CLAUDE.md` | oui |
| **D7** | Prendre le printemps 2027 comme repère pour la bêta — un repère, pas une date de sortie | oui |

---

## 7. Par quoi on commence

1. Les sept décisions : dix minutes.
2. La grille du test iPhone, puis le test : une heure.
3. Le guide d'entretien, puis les deux premiers entretiens.
4. Les chiffres du README.

Aucune ligne de la nouvelle interface ne s'écrit avant la fin de
l'étape 2.

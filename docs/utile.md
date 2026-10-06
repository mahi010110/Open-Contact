# « À découvrir » doit être utile

*6 octobre 2026. Retour du mainteneur sur « À découvrir » et la carte de
l'entreprise : « je veux vraiment que cette fonctionnalité soit utile ! pour
l'instant elle ne l'est pas ». Il a coché les quatre manques proposés : je
ne sais pas à qui écrire ; les entreprises ne correspondent pas ; je ne
sais pas si elles recrutent ; la carte ne m'aide pas à choisir.*

Chaque manque a été **mesuré avant d'être corrigé**, sur le vrai monde et
depuis une vraie page (`tests/e2e/sonde-utile.mjs`, en CI : le bac à sable
n'atteint pas ces services).

---

## 1. Les entreprises ne correspondent pas

Six recherches d'étudiant, jouées par la vraie chaîne de l'app.

| Ce qu'on a relevé | La cause | Ce qui change |
|---|---|---|
| « alternance réseau Lille » : Orange Store, Espace SFR, les clubs Bouygues Telecom, les magasins Free | les codes 61.20Z et 61.90Z rangent les **boutiques** de télécoms | seuls les opérateurs de réseau (61.10Z) restent |
| les intégrateurs absents : Computacenter, SCC, Cybertek, Antemeta | ils sont rangés en commerce de gros d'ordinateurs (46.51Z) | 46.51Z rejoint « réseau » et « support » : ils installent les serveurs et les réseaux de leurs clients |
| « stage cybersécurité Lille » : NAO Cyber, Cyber Shark Conseil, MY Cyber Royaume — une ou deux personnes, ou aucun salarié | le mot « cyber » dans le nom ne dit pas qu'on peut y être accueilli | cette question ne demande que des employeurs de dix salariés et plus |
| « Lille » rendait Maubeuge, Dunkerque, Valenciennes, et Sopra Steria **à Annecy** | la question visait le **département** (le Nord fait 150 km) ; sans établissement correspondant, c'est le siège qui s'affichait | une ville tapée cherche **autour de son centre** (15 km), et ce qui tombe à plus de 30 km est écarté |
| « Euro-Information Européenne de Traitement de l'Information », « T D F » | la raison sociale n'est pas le nom qu'on connaît | le sigle du registre la remplace quand elle est longue ou épelée (Euro Information, ONISEP, TDF) |

Après correction, sur les mêmes six recherches : **0** entreprise sans
salarié ou de moins de dix, **0** boutique, et tout ce qui sort à Lille, Lyon
ou Roubaix est à moins de 15 km.

**Le centre des villes vit dans l'app**, pas dans un service : les 347 villes
que la barre reconnaît ont leurs coordonnées dans `engine/lieux.js`, relevées
une fois au découpage officiel (geo.api.gouv.fr). Hors ligne, à chaque
frappe, sans rien demander.

**Relevé en passant** : la recherche autour d'un point (`/near_point`) garde
le métier mais **ignore la taille**. La jumelle « 10-499 salariés » reste donc
la question du département, et c'est la distance au centre qui écarte ce qui
est trop loin.

## 2. Je ne sais pas si elles recrutent

L'annuaire ne le dit pas. Qui le sait ?

| Piste | Relevé | Verdict |
|---|---|---|
| **API de La bonne alternance** (API apprentissage) | elle a exactement ce qu'il faut — les offres et les « entreprises susceptibles de recruter » —, mais demande un jeton, **refuse toute page web** (aucun en-tête CORS, avec ou sans jeton), et ses conditions **interdisent de diffuser un jeton** | fermée |
| Pages carrières publiques (Lever, Greenhouse, Recruitee, SmartRecruiters, Workable) | 0 tableau d'offres chez 45 entreprises réelles, aucune réponse lisible depuis une page | fermée |
| **Le site de La bonne alternance**, par un lien | « réseau » autour de Lille : **10 offres d'alternance** d'entreprises locales (Synergy à Lezennes, Waybox à Villeneuve-d'Ascq…), où l'on postule directement ; développement à Lyon, support à Marseille, informatique à Rennes : 10 chacun | **retenu** |

**Le libellé décide, pas seulement les codes.** Le site cherche aussi par
mot-clé sur le libellé du métier : mêmes codes ROME, même ville, « Administration
réseau » rend dix offres à Nantes, « Systèmes et cloud » aucune (même à
Lille), « Cybersécurité » une seule, hors sujet, à 84 km. Seuls les libellés
mesurés porteurs sont gardés ; le cloud et la cyber passent par
l'administration des systèmes et des réseaux, le métier qu'on y fait en
alternance.

Un lien **« Offres d'alternance autour de … »** tient la tête de la liste de
« À découvrir » : pour une alternance (tapée, ou celle du profil), avec un
lieu qui a un centre. Il porte les codes ROME du métier et le centre de la
ville, rien d'autre (`offresAlternance`, `engine/annuaire.js`).

Le stage n'a pas de lien : aucun format de recherche de stage public n'a
gardé ses paramètres une fois ouvert (1jeune1solution les perd).

## 3. Je ne sais pas à qui écrire

Une piste ajoutée depuis l'annuaire n'a personne : le premier geste du
produit — écrire — n'avait pas de destinataire.

**Ce qui décide est la taille** :

- jusqu'à 249 salariés, c'est le dirigeant qui décide d'accueillir un
  stagiaire ou un alternant : on lui écrit, par son nom ;
- au-delà, ou dans la filiale d'un groupe (ETI, grande entreprise), un
  service recrute : on écrit au recrutement.

L'app **ne devine aucune adresse** : une adresse inventée part dans le vide,
et personne ne le saura. Elle nomme la personne et ouvre la recherche
LinkedIn qui la trouve, sur ton geste (`aQui`, `engine/carte.js`).

« Écrire à » se montre à trois endroits, chacun là où il sert :

- dans l'aperçu de « À découvrir », comme une ligne de la carte ;
- dans la fiche, **avec les contacts**, tant que la piste n'a pas d'adresse ;
- dans le composeur, quand il n'y a pas d'email : « Pas d'email — Copier,
  puis Thomas Leroy sur LinkedIn ».

## 4. La carte ne m'aide pas à choisir

Le chiffre d'affaires, la date de création et le nombre de sites ne
départagent rien pour un étudiant. Ils sont partis. Restent trois lignes,
toujours dans cet ordre :

```
Advens
Lille · 2 km
Entreprise de cybersécurité
MISSIONS     Conseil et intégration informatique  ✓ colle à ta formation
TAILLE       100 à 199 salariés
ÉCRIRE À     Thomas Leroy, président  LinkedIn ↗
```

- **Missions** : le code d'activité traduit en mots d'étudiant
  (`TRAVAIL`) — « infogérance : les serveurs et réseaux de ses clients »
  plutôt que « Gestion d'installations informatiques ». Hors du numérique,
  passé 50 salariés, « informatique interne ».
- **« colle à ta formation »**, en accent, quand les missions rejoignent le
  métier que dit ta formation : BTS SIO SISR → réseau, SLAM →
  développement, « cyber » → cybersécurité. Une formation qui ne dit aucun
  métier (« BUT informatique ») ne dit rien (`metierDuProfil`).
- **Taille** en mots, avec son groupe quand Wikidata le connaît.
- **Écrire à** : la personne (§3).

« En bref » est **ta** phrase : une piste venue de l'annuaire n'y reçoit
plus le libellé de l'INSEE.

## Ce qui part, et quand

Rien de nouveau ne part sans geste :

- l'annuaire reçoit, pour une ville, les coordonnées de son centre (une
  donnée publique, lue dans la table) ;
- La bonne alternance et LinkedIn ne reçoivent quelque chose que quand tu
  touches leur lien.

Et une faute de longue date est corrigée en passant : **une question vidée
par le tri ne part plus du tout**, pas même celle de ta zone. Le cache la
masquait tant que la zone posait la même question qu'une recherche
précédente ; chercher autour des villes l'a montrée.

---

*Sources : mesures du 6 octobre 2026, `sonde-utile.mjs` (trois passages en
CI) ; Apec et l'Étudiant, à qui adresser une candidature selon la taille de
l'entreprise ; La bonne alternance, CGU de l'espace développeurs (article 5.2,
le jeton) ; geo.api.gouv.fr, découpage administratif.*

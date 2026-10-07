# Une recherche à ta mesure

*6 octobre 2026. Demande du mainteneur : « j'aimerais que la recherche
passe au niveau supérieur ! que les informations soient précises et
adaptées au profil du user ». Quatre décisions ont été prises après une
première enquête :*

| Question | Décision |
|---|---|
| Le profil dit-il où l'on cherche ? | **oui** : une ville et un rayon (5, 15 ou 30 km) |
| Quels services ouvrir ? | **HelloWork** pour les stages, **Clearbit** pour le site web |
| L'app se souvient-elle ? | **« Nouveau »** et **« Pas pour moi »** |
| Le marché local ? | **oui, une ligne** |

Chaque source a été **mesurée avant d'être branchée**, depuis une page
vierge et un vrai navigateur, en CI (`tests/e2e/sonde-profil.mjs`,
`tests/e2e/sonde-bmo.py`). La leçon de la veille est appliquée : une
sonde qui tourne depuis la page de l'app mesure sa CSP, pas le service
(`docs/utile.md`).

---

## 1. « Autour de » : ta ville et ton rayon

Dans « Mon profil », sous « Ce que tu cherches », un champ **Autour de**
et trois puces : **5 km** (à côté), **15 km** (la métropole), **30 km**
(le département).

- Seules les **347 villes que l'app sait placer** sont acceptées : leur
  centre vit dans `engine/lieux.js`. Une ville inconnue ne servirait à
  rien, sans que rien ne le dise. L'erreur se dit **sous le champ**, et
  la feuille ne se ferme pas (§6). Pour une faute de frappe, la ville la
  plus proche est proposée : « Ville inconnue. Lille ? ».
- La ville s'enregistre **comme l'app l'écrit** : « saint etienne »
  devient « Saint-Étienne », ce que l'étiquette montrera.

**Ce que le profil ajoute à une recherche**, quand la barre ne le dit pas
(`ajoutsProfil`, `engine/annuaire.js`) :

- **ta ville et ton rayon** si la question n'a pas de lieu. Ta ville
  passe devant ta zone : « Autour de Lille » est une intention, la zone
  du département de tes pistes n'est qu'une déduction ;
- **le métier de ta formation** si la question n'a ni métier ni texte.
  BTS SIO SISR donne réseau, SLAM donne développement (`metierDuProfil`).
  Un nom tapé (« Orange ») se cherche partout, sans être bridé.

Chacun devient une **étiquette** dans la rangée de la barre : « Réseau »,
« Lille · 15 km ». Rien ne part en ton nom sans se voir. La croix retire
l'étiquette pour la session. Elle reste alors **proposée en pointillé**,
et un tap la remet.

Le rayon vaut aussi pour une ville **tapée**. Ce qui tombe au-delà du
double du rayon est écarté, jamais plus loin que 50 km (`loinDe`).

**Ce qui part** : le centre de la ville, lu dans la table, et des codes
d'activité. Jamais le texte du profil, jamais la formation.

## 2. Le site qu'on rejoindrait

Relevé autour de Lille (sonde ①) : l'établissement a **sa** taille et
**son** activité, et elles ne sont pas celles de l'entreprise.

| Entreprise | En tout | Ici |
|---|---|---|
| Fiducial Informatique | 500 à 999 salariés | 6 à 9, à Villeneuve-d'Ascq |
| Inetum | 5 000 à 9 999 | 1 000 à 1 999, à Lille |
| Sopra Steria | conseil (62.02A) | édition de logiciels (58.29C), à Lille |

Un stagiaire rejoint un bureau, pas un groupe. La ligne dit donc
« 6-9 salariés ici », et la carte « 6 à 9 salariés ici · 500 à 999 en
tout ». Les missions se lisent d'après le code d'activité **du site**.

Deux codes ne disent rien et sont ignorés : « NN » (non diffusé) et
« 00 ». Le second a été relevé sur des sites qui emploient. Un code
d'activité ancien (« 72.1Z ») laisse la place à celui de l'entreprise.

## 3. L'aide à l'embauche d'un apprenti

Pour une alternance, la carte dit ce que l'État verse à **cette**
entreprise si elle te prend. C'est un argument pour la lettre, et une PME
ne le connaît pas toujours. Le composeur le reprend dans « À savoir ».

Décret n° 2026-168 du 6 mars 2026. Il vaut pour un contrat conclu depuis
le 8 mars 2026 et qui commence avant le 1er janvier 2027, la première
année seulement :

| Niveau | Moins de 250 salariés | 250 et plus (sous conditions) |
|---|---|---|
| 3-4 (CAP, bac) | 5 000 € | — |
| 5 (BTS, DUT, titres pro) | 4 500 € | 1 500 € |
| 6-7 (BUT, licence, master) | 2 000 € | 750 € |

**Mieux vaut ne rien afficher qu'un montant faux.** La ligne se tait dans
quatre cas (`aideEmbauche`, `engine/marche.js`) :

- le niveau ne se lit pas dans la formation ;
- la taille de l'entreprise est inconnue ;
- la recherche n'est pas une alternance ;
- le début du contrat tombe après la fin du dispositif.

## 4. Les offres de stage : HelloWork

Le lien « Offres d'alternance autour de … » existait (La bonne
alternance). Le stage n'en avait pas : 1jeune1solution perd ses critères,
Welcome to the Jungle et Indeed refusent un navigateur automatisé (403).
HelloWork **garde les siens dans son adresse** (sonde ⑥, en CI) :

| Mots | Ville | Offres |
|---|---|---|
| stage réseau | Lille | 9 |
| stage développeur | Lyon | 64 |
| stage cybersécurité | Rennes | 6 |
| stage support informatique | Marseille | **1** |
| stage informatique | Nantes | 67 |

Seuls les mots **mesurés porteurs** sont gardés : le support passe par
« stage informatique ». Le lien prend la ville tapée, sinon celle du
profil (`offresStage`). Il ne part que si on le touche.

## 5. Le site web : Clearbit

Quand ni ta fiche ni Wikidata ne connaissent le site, l'autocomplétion
de Clearbit le propose, par le nom. La mesure a été faite sur vingt
entreprises réelles (sonde ⑦) : le **premier** résultat est souvent un
autre. « Advens » rendait d'abord advenser.com, « Linkt » Linktree.

Trois gardes (`lireClearbit`) :

- le nom rendu est **exactement** celui cherché ;
- le domaine finit par une extension générique ou française. Un homonyme
  belge, australien ou brésilien ne passe pas ;
- le domaine qui **est** le nom passe devant : inetum.com plutôt que
  l'ancien gfi-info.fr.

Résultat : **12 bons sites sur 20, aucun faux**.

**Ce qui part** : le nom public de l'entreprise que tu regardes, et
seulement quand Wikidata n'a pas de site à donner. La CSP de l'app nomme
le domaine (`autocomplete.clearbit.com`).

## 6. « Nouveau » et « Pas pour moi »

- **Pas pour moi.** Le bouton se trouve dans l'aperçu (au pied de la
  feuille au pouce, à côté d'« Ajouter » au poste). On peut aussi glisser
  la ligne au doigt : c'est le motif de la suppression, avec **son** mot,
  parce que rien n'est supprimé. L'entreprise sort de la liste et n'y
  revient plus. Annuler la rend dans les 30 secondes. « Écartées · N », en
  pied de liste, les remet une à une. Elles vivent dans le profil
  (`ecartees`), donc sur tes appareils et dans ta copie.
- **Nouveau.** Refaire une recherche marque ce qui n'y était pas la fois
  d'avant. La première fois, rien n'est marqué : tout serait nouveau,
  donc rien ne départagerait. Le souvenir vit sur **cet** appareil
  (`oc_vus_v1`, 30 recherches de 300 entreprises au plus). C'est un
  repère, pas une donnée.

Dans la même veine, **« ta formation »** s'écrit en accent sur les lignes
qui collent au métier de ta formation. Elle ne s'écrit que si elle
départage, c'est-à-dire si elle n'est vraie ni de toutes ni d'aucune. À
égalité d'employeur, ces lignes passent devant les plus proches.

## 7. Le marché autour de toi

*Retiré de l'écran le 7 octobre 2026 (minimalisme, CLAUDE.md §6) : la
ligne n'aidait à choisir aucune entreprise. La table reste dans
`engine/marche.js`.*

Une ligne sous les offres, la source au bout :

> Nord : **380** embauches prévues en réseau et support, **66 %**
> difficiles à pourvoir. France Travail, 2026

C'est l'enquête « Besoins en main-d'œuvre » 2026 de France Travail
(data.gouv.fr, licence ouverte), relevée une fois. Le fichier range le
dictionnaire des variables dans sa première feuille et les données dans
la seconde. La première version de la sonde lisait la mauvaise. La ligne
porte deux métiers, ceux qu'un BTS ou un BUT vise :

| Code | Métier | France, 2026 |
|---|---|---|
| M1X80 | techniciens d'étude et de développement en informatique | 9 331 embauches, 43 % difficiles |
| M1X81 | techniciens de production, d'exploitation, de maintenance et de support | 7 667 embauches, 48 % difficiles |

709 lignes de bassin d'emploi sont au secret statistique : les petits
départements sont sous-comptés. Un département qui compte **moins de
30 embauches cède la place à sa région**, plutôt que d'afficher un
chiffre faux par défaut. La table vit dans `engine/marche.js`, hors
ligne.

## 8. Une faute de frappe se propose

« Lile », « reseua », « alternanse » : un mot qui ne se comprend pas et
qui est à une faute d'un mot connu (une lettre en trop, en moins,
changée, ou deux lettres inversées). La tolérance est celle des moteurs
du commerce : une faute à partir de quatre lettres, deux à partir de
huit (Algolia, « typo tolerance »).

La correction se **propose** en pointillé, « Lille ? », et un tap
réécrit la barre. Elle ne s'applique jamais d'office, et ne se propose
pas pour un mot qui trouve déjà quelque chose : « Lilly » est peut-être
une de tes pistes (`correction`, `engine/requete.js`).

## Ce qui a été mesuré et laissé de côté

| Piste | Relevé | Verdict |
|---|---|---|
| Pages carrières (Lever, Greenhouse, SmartRecruiters) | lisibles, mais 2 tableaux sur 45 entreprises | trop rare |
| API de La bonne alternance | refuse toute page web, jeton interdit de diffusion | fermée |
| Temps de trajet (IGN Géoplateforme) | lisible depuis une page, voiture et piéton seulement | à reprendre avec les transports en commun |
| Créations récentes (BODACC) | surtout des micro-entreprises | du bruit |
| 1jeune1solution, Welcome to the Jungle, Indeed | critères perdus, ou 403 | pas de lien |

## Ce qui part, et quand

| Vers | Quoi | Quand |
|---|---|---|
| l'annuaire | le centre de ta ville, ton rayon, des codes d'activité | quand tu cherches |
| Clearbit | le nom de l'entreprise regardée | aperçu ou fiche ouverts, sans site connu |
| HelloWork, La bonne alternance | rien | quand tu touches le lien |

Rien d'autre : ni le texte du profil, ni un contact, ni une note.

---

*Gardé par `tests/e2e/e2e-mesure.mjs` et les tests unitaires « à ta
mesure » de `tests.js`. Sources : mesures du 6 octobre 2026
(`sonde-profil.mjs`, `sonde-bmo.py`) ; décret n° 2026-168 du 6 mars 2026 ;
France Travail, enquête BMO 2026 ; Algolia, documentation de la
tolérance aux fautes.*

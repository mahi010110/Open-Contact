# 0013 — La refonte : accompagner du début à la fin

**Statut** : **acceptée**, 4 novembre 2026, pour l'ampleur, le parcours,
l'échéance, le style et les règles : le mainteneur les a choisis un à un.
**Proposée** pour trois garde-fous (des étapes à condition de sortie à la
place d'une date, une première version mince mais complète, l'interface
actuelle en service jusqu'à la bascule) et pour l'accessibilité dans le
socle : l'assistant les recommande, le mainteneur ne les a pas encore
validés. **Méthode remplacée par la fiche 0014** (9 novembre 2026) :
construite dans main, sans entretiens, avec l'expérience d'Arc Search.

## Contexte

Le 3 novembre 2026, l'interface est revenue à la 6.70 (fiche 0011), puis
le réseau de la 7.4 y est revenu (fiche 0012). Le lendemain, le
mainteneur : « aujourd'hui ma vision sur l'app a beaucoup changé,
aujourd'hui je veux faire une app qui accompagne dans la recherche du
début jusqu'à la fin ».

Une recherche en six volets a précédé le cadrage : la psychologie de la
recherche d'emploi, le réseau et l'aide, le contexte français du stage et
de l'alternance, l'expérience utilisateur des parcours longs, les
concurrents français et internationaux. Sa synthèse est dans
`reports/Accompagner la recherche de stage.md`. Ce qu'elle établit, en
bref :

- aucun outil, français ou étranger, ne suit un étudiant du choix de sa
  cible au contrat signé ; les deux bouts du parcours ne sont outillés
  par personne ;
- la qualité de la recherche prédit la qualité du stage, le volume de
  candidatures très peu ; un plan concret fait mieux que des rappels ;
  une aide ne marche que si elle combine savoir-faire et motivation ;
- l'app actuelle couvre le milieu du parcours (suivre, écrire, relancer,
  se faire recommander) ; il lui manque le début, la fin, et la moitié
  « motivation ».

## Décision

- **Tout redessiner** : toute l'interface, à partir de la nouvelle
  promesse. Le moteur (`engine/`) et les données restent.
- **Les quatre parties du parcours dès la première version** : le début
  (choisir sa cible, bâtir sa liste), le milieu (candidater, relancer, se
  faire recommander), la fin (entretiens, choix, du « oui » au contrat
  qui tient), le moral (refus, silence, retour après une pause).
- **Pas de date** : la qualité d'abord.
- **Le style « Utilitaire 98 » reste.**
- **Le socle seulement** : pour la nouvelle interface, seuls s'appliquent
  les deux questions et la règle des captures (§0), les invariants (§2),
  l'architecture (§3), l'identité visuelle (§4) et les interdits (§10).
  Des principes courts, tirés de la recherche, remplacent le reste ; une
  ancienne règle revient si le même problème revient.
- **L'IA n'est pas tranchée** : elle le sera à l'étape « Dessiner », après
  les entretiens.

Le périmètre, les hypothèses de départ et les étapes sont dans
[`../refonte.md`](../refonte.md).

## Options écartées

- **Réorganiser autour du parcours** : la même interface, un accueil qui
  suit l'étape où en est l'étudiant. Recommandée par l'assistant, écartée
  par le mainteneur au profit d'une refonte complète.
- **Compléter l'existant** : ajouter les étapes manquantes dans les
  écrans actuels, avec le risque du « juste un bouton en plus » que le
  mainteneur reprochait aux mises à jour le 7 octobre.
- **Une échéance** (une bêta en février 2027, pendant la saison des
  alternances) : écartée pour ne pas presser la qualité.
- **Repenser aussi l'identité visuelle**, **garder toutes les règles**,
  **repartir de zéro sur les règles**.

## Conséquences

- **Le risque principal est l'« effet second système »** (Fred Brooks,
  *The Mythical Man-Month*, 1975) : une deuxième version qui veut tout
  faire et ne sort jamais. Tout redessiner, couvrir les quatre parties et
  ne pas fixer de date le réunissent. D'où les trois garde-fous proposés :
  des étapes qui ne se franchissent qu'à leur condition de sortie, une
  première version mince mais complète, et l'interface actuelle qui reste
  en service tant que la nouvelle n'est pas validée.
- **Aucune donnée ne bouge** : la nouvelle interface lit et écrit les
  mêmes clés que l'actuelle (`CONTRAT.md`).
- **`CLAUDE.md` dit la règle** (§0, « La refonte ») : pour la nouvelle
  interface, le socle seulement ; les règles de §4 à §9 continuent de
  tenir l'interface actuelle jusqu'à la bascule.
- **La feuille de route est à revoir** : la bêta de l'interface actuelle
  a-t-elle encore lieu pendant la refonte ? La question est ouverte dans
  `refonte.md`.

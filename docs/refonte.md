# La refonte

**Ce document dit ce que couvre la refonte, ce qui n'en fait pas partie,
et dans quel ordre elle avance.** Le pourquoi est dans les fiches
[0013](decisions/0013-la-refonte.md) et
[0014](decisions/0014-arc-search-dans-main.md), les preuves dans
`reports/`. Le détail des lots est dans le plan de mise en œuvre
([`refonte-plan.md`](refonte-plan.md)).

*Cadrée le 4 novembre 2026 avec le mainteneur ; méthode et expérience
revues le 9 novembre 2026 (fiche 0014).*

---

## La promesse

OpenContact accompagne un étudiant en informatique ou en cybersécurité
dans sa recherche de stage, d'alternance ou de premier emploi, **du choix
de sa cible jusqu'au contrat qui tient**. Sans compte, sans serveur, sur
son téléphone.

## Ce qui est décidé

| Question | Réponse du mainteneur |
|---|---|
| L'ampleur | tout redessiner : toute l'interface, à partir de la promesse ; le moteur et les données restent |
| Le parcours | les quatre parties dès la première version : le début, le milieu, la fin, le moral |
| L'échéance | pas de date : la qualité d'abord |
| Le style | « Utilitaire 98 », gardé |
| L'expérience | celle d'Arc Search : une barre qui comprend ce qu'on tape, l'app qui prépare la page, presque pas de navigation, le rangement automatique |
| Téléphone et ordinateur | deux dessins différents, pensés chacun pour sa main |
| La méthode | directement dans main, par lots, comme depuis le début ; chaque lot montré en captures avant la fusion |
| Les étudiants | pas d'entretiens : la recherche documentaire et l'usage du mainteneur pour sa propre recherche |
| Les règles | le socle seulement pour ce qui est refait ; des principes courts pour la nouvelle interface |
| L'IA | pas dans la première version (proposé, à confirmer) |

## Le socle : ce qui ne bouge pas

- **Les invariants** (`CLAUDE.md` §2) : le privé ne sort jamais d'un
  partage ; rien ne s'écrase sans aperçu ni « Annuler » ; un écran, un
  but ; tout marche hors ligne.
- **Les interdits** (§10) : aucun serveur, aucun compte, aucune
  télémétrie.
- **Le moteur et les données** (§3, `CONTRAT.md`) : `engine/` est repris,
  aucune clé de stockage ne bouge, aucune donnée ne se perd.
- **L'identité** (§4) : les jetons de `styles/tokens/`, les trois
  polices, les reliefs, les pixelarticons, les deux thèmes.
- **L'accessibilité** : WCAG 2.2 AA, cibles de 44 px au doigt, texte
  agrandi jusqu'à 200 %. *Proposée par l'assistant, à confirmer.*
- **Le public et la surface** : les étudiants IT et cyber ; le web
  d'abord.
- **Les fonctions du réseau** : qui est passé où, les demandes, les
  groupes qui reçoivent pistes et demandes, Donner et Recevoir. La
  conversation libre est masquée dans la première version, sans rien
  supprimer (proposé, à confirmer).
- **La règle des captures** (§0) : un changement qui se voit se montre au
  mainteneur, avant et après côte à côte, avant d'arriver dans main.

## Hors périmètre

- La candidature automatique, le simulateur d'entretien, le score
  « ATS », les séries, les badges, les classements : la recherche les
  déconseille.
- L'application ordinateur, l'application téléphone des stores, l'envoi
  direct par Gmail ou Outlook.
- Les métiers hors informatique et cybersécurité (seul le vocabulaire
  devient neutre).

## Le parcours : quatre parties

| Partie | Ce que l'étudiant doit obtenir | Ce que l'app fait pour lui |
|---|---|---|
| **Le début** | une cible, puis des entreprises qui emploient | il dit ce qu'il cherche en quelques taps ; l'app propose des entreprises autour de lui, et des métiers ou des zones voisins quand c'est trop étroit (Belot et al., 2019) |
| **Le milieu** | des candidatures relancées, et quelqu'un qui recommande | l'accueil dit quoi faire maintenant ; après un envoi, la suite se décide en « si… alors » (Gollwitzer et Sheeran, 2006 ; Abel et al., 2019) ; un silence a toujours une sortie ; qui est passé où se lit sur la page de l'entreprise |
| **La fin** | un contrat signé qui tient | après « Décroché », une courte liste privée jusqu'au contrat (convention ; ou promesse, CERFA, début, OPCO, 45ᵉ jour), et deux alertes contre les arnaques |
| **Le moral** | tenir face aux refus et au silence | revenir après trois semaines sans liste de retards ; un geste privé et facultatif après un refus (Kreemers et al., 2020) |

**Une première version mince mais complète** : les quatre parties
existent dès la première version, chacune à son minimum.

## Les étapes

| Étape | Ce qu'on fait | On passe à la suite quand |
|---|---|---|
| 1. Vérifier | une heure de test sur un vrai iPhone ; les chiffres du README corrigés | le tableau du test est rempli |
| 2. Dessiner | tous les écrans en maquettes, téléphone et ordinateur, clair et sombre | le mainteneur a validé l'ensemble en captures |
| 3. Construire | dans main, lot par lot, vers ce dessin ; la navigation ne change qu'une fois | les quatre parties se jouent de bout en bout, `?test` vert |
| 4. Montrer | quand le mainteneur le décide | — |

**Ce qui juge la refonte** : les étudiants qui décrochent. Jamais le
nombre d'ouvertures : un étudiant qui trouve et n'ouvre plus l'app est
une réussite.

## Questions ouvertes

- **Le clavier à l'ouverture** sur téléphone : prêt tout de suite comme
  dans Arc Search, ou d'un tap pour laisser voir ce qu'il y a à faire ?
  À trancher en maquette.
- **La page d'une entreprise à l'ordinateur** : à côté de la liste, ou
  en fenêtre comme aujourd'hui ? Le mainteneur avait refusé « à côté »
  le 3 novembre (fiche 0011). À trancher en maquette.
- **Les chiffres du projet** que la recherche n'a pas confirmés
  (« 40 pour 1 », « 34 fois », « 66 % contre 32 % ») : à corriger dans
  le `README.md` et `CLAUDE.md`.

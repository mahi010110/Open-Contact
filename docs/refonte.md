# La refonte

**Ce document dit ce que couvre la refonte, ce qui n'en fait pas partie,
et dans quel ordre elle avance.** Le pourquoi est dans la fiche
[0013](decisions/0013-la-refonte.md) et dans la synthèse de recherche
(`reports/Accompagner la recherche de stage.md`). Les principes
d'interface de la nouvelle version s'écriront à l'étape « Dessiner ».

*Cadrée le 4 novembre 2026, avec le mainteneur.*

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
| Les règles | le socle seulement ; des principes courts pour la nouvelle interface |
| L'IA | pas encore tranchée : décidée à l'étape « Dessiner », après les entretiens |
| Les étudiants | quelques contacts, à élargir |

## Le socle : ce qui ne bouge pas

- **Les invariants** (`CLAUDE.md` §2) : le privé ne sort jamais d'un
  partage ; rien ne s'écrase sans aperçu ni « Annuler » ; un écran, un
  but ; tout marche hors ligne.
- **Les interdits** (§10) : aucun serveur, aucun compte, aucune
  télémétrie.
- **Le moteur et les données** (§3, `CONTRAT.md`) : `engine/` est repris
  tel quel, aucune clé de stockage ne bouge, aucune donnée ne se perd. La
  nouvelle interface lit et écrit les mêmes données que l'actuelle.
- **L'identité** (§4) : les jetons de `styles/tokens/`, les trois
  polices, les reliefs, les pixelarticons, les deux thèmes.
- **L'accessibilité** : WCAG 2.2 AA, cibles de 44 px au doigt, texte
  agrandi jusqu'à 200 %. *Ajoutée au socle par l'assistant, à confirmer.*
- **Le public et la surface** : les étudiants IT et cyber ; le web
  d'abord, le téléphone avant le poste.
- **Les fonctions du réseau** : amis, groupes, messages, demandes, telles
  qu'en 8.1.0. Leur place dans la nouvelle interface se redessine comme
  le reste.
- **La règle des captures** (§0) : un changement qui se voit se montre au
  mainteneur, avant et après côte à côte, avant d'arriver dans main.

## Hors périmètre

- La candidature automatique, le simulateur d'entretien, le score
  « ATS », les séries, les badges, les classements : la recherche les
  déconseille (synthèse, « Ce qu'il ne faut pas faire »).
- L'application ordinateur, l'application téléphone des stores, l'envoi
  direct par Gmail ou Outlook.
- Les métiers hors informatique et cybersécurité.

## Le parcours : quatre parties, des hypothèses de départ

Ce qui suit n'est pas un dessin. Ce sont les hypothèses que les
entretiens confirmeront ou déferont, chacune tirée de la synthèse.

| Partie | Ce que l'étudiant doit obtenir | Hypothèse de départ |
|---|---|---|
| **Le début** | une cible (métier, type de contrat, zone, date butoir), puis une liste d'entreprises qui emploient | passer de la cible à la liste sans rien ressaisir ; proposer des métiers ou des zones voisins quand la recherche est trop étroite (Belot et al., 2019) |
| **Le milieu** | des candidatures adaptées et relancées, et quelqu'un qui recommande | la prochaine action au format « si… alors » plutôt que des rappels (Gollwitzer et Sheeran, 2006 ; Abel et al., 2019) ; le réseau entre camarades, et ses ponts vers les anciens et les enseignants |
| **La fin** | se préparer à cette entreprise, choisir entre deux offres, puis un contrat signé qui tient | une courte liste privée après le « oui » : la convention de stage, ou la promesse, le CERFA, le début du contrat, le dépôt à l'OPCO, les 45 premiers jours ; deux alertes contre les arnaques au moment du geste |
| **Le moral** | tenir face aux refus et au silence | revenir après trois semaines sans tomber sur une dette ; un geste privé et facultatif après un refus (Kreemers et al., 2020) |

**Une première version mince mais complète.** Les quatre parties existent
dès la première version, chacune réduite à son minimum. On approfondit
ensuite selon ce que disent les étudiants : jamais une partie parfaite à
côté de trois absentes.

## Les étapes

Pas de date : chaque étape a une **condition de sortie**, et on ne passe
à la suivante que lorsqu'elle est remplie.

| Étape | Ce qu'on fait | On passe à la suite quand |
|---|---|---|
| 0. Cadrer | ce document et la fiche 0013 | le mainteneur a validé le périmètre |
| 1. Comprendre | des entretiens de 45 minutes avec les contacts du mainteneur, chacun invité à en amener un autre ; la carte du parcours vécu, avec ses émotions et ses risques ; comment ils se servent déjà d'une IA | au moins cinq entretiens, et une carte du parcours que le mainteneur reconnaît |
| 2. Dessiner | la structure de l'app (navigation, écrans), puis les écrans clés en maquettes, au pouce et au poste, clair et sombre, testés à voix haute ; les principes de la nouvelle interface ; la décision sur l'IA | des maquettes validées en captures par le mainteneur, et chaque partie du parcours comprise sans aide par les étudiants testés |
| 3. Construire | la nouvelle interface à côté de l'actuelle, sur le même moteur et les mêmes données ; le moteur d'abord, testé | les quatre parties jouables de bout en bout, `?test` vert, le socle vérifié |
| 4. Essayer | une bêta pendant une vraie période de recherche ; un résumé calculé sur l'appareil, que l'étudiant lit en entier puis envoie s'il le veut | les parcours réussis seuls, aucun signe de préjudice (culpabilité, anxiété), les retours traités |
| 5. Basculer | une décision du mainteneur, consignée dans une fiche ; l'ancienne interface part ensuite, avec son style | — |

**Ce qui juge la refonte** : les étudiants qui décrochent, l'adéquation
qu'ils ressentent, et l'absence de préjudice. Jamais le nombre
d'ouvertures : un étudiant qui trouve et n'ouvre plus l'app est une
réussite.

## Questions ouvertes

- **L'IA** : tranchée à l'étape 2, sur ce que les entretiens auront
  montré. Quelle que soit la réponse, la nouvelle interface marche
  entièrement sans IA.
- **La bêta de l'interface actuelle** (`feuille-de-route.md`, §2) :
  a-t-elle encore lieu pendant la refonte, ou attend-elle la nouvelle
  interface ?
- **Comment construire à côté** : une entrée séparée sur la même origine,
  ou un interrupteur dans l'app. À choisir au début de l'étape 3.
- **Les chiffres du projet** que la recherche n'a pas confirmés
  (« 40 pour 1 », « 34 fois », « 66 % contre 32 % ») : à corriger dans
  le `README.md` et `CLAUDE.md`, indépendamment de la refonte.

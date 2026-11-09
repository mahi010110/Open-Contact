# 0014 — L'expérience d'Arc Search, construite dans main, sans entretiens

**Statut** : **acceptée**, 9 novembre 2026, par le mainteneur. Complète la
fiche 0013 et remplace sa méthode (entretiens, construction à côté).

## Contexte

Le plan de mise en œuvre proposé le 9 novembre 2026 prévoyait des
entretiens avec des étudiants, des essais à voix haute, une seconde
entrée (`nouveau.html`) construite à côté de l'app actuelle, et quatre
onglets stables. Le mainteneur, le même jour : « je veux pas demander à
des étudiants », « je veux pas faire la refonte de côté mais directement
dans main comme je fais depuis le début », « je veux faire comme Arc
Search au niveau de l'UX (pas du design 98) ». Sur les quatre idées
d'Arc Search proposées, il les a toutes retenues, avec une réserve :
« le PC et le tel sont deux choses différentes ».

## Décision

- **L'expérience d'Arc Search** : une barre qui comprend ce qu'on tape,
  l'app qui prépare la page, presque pas de navigation, le rangement
  automatique. **Le style reste « Utilitaire 98 ».**
- **Deux dessins** : le téléphone et l'ordinateur, chacun pensé pour sa
  main.
- **Directement dans main**, lot par lot, chaque lot montré en captures
  avant la fusion (§0).
- **Pas d'entretiens** : la recherche documentaire et l'usage du
  mainteneur pour sa propre recherche.

## Options écartées

- **Quatre onglets stables**, recommandés par la recherche (Apple,
  Material, Microsoft) : écartés au profit de l'expérience d'Arc Search.
- **Une seconde entrée à côté de l'app actuelle** : écartée.
- **Des entretiens et des essais avec des étudiants** : écartés.

## Conséquences

- **Le risque de la 7.x revient** — des lots justes un à un dont la somme
  ne se reconnaît plus. D'où deux règles du plan : tous les écrans sont
  dessinés avant le premier lot, et la navigation ne change qu'une fois.
- **Le prix de la nouveauté** : The Browser Company a arrêté Arc en
  mai 2025, jugé trop nouveau à apprendre. Chaque geste neuf garde un
  chemin visible, et la barre vide propose ce qu'on peut y taper.
- **Concevoir pour une seule personne** : les rapports de recherche et
  les gardes d'accessibilité servent de contrepoids, avec le carnet
  d'usage du mainteneur.
- **Le rangement automatique** respecte l'invariant ② : il s'annonce, se
  rattrape, et ne supprime rien.
- **`CLAUDE.md`** : un écran refait suit le socle ; un écran pas encore
  refait garde ses règles actuelles.

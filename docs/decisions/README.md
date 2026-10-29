# Les fiches de décision

Une fiche par décision qui engage le produit ou son architecture. Elle dit
le **contexte**, la **décision**, et **toutes ses conséquences** — les
bonnes et les mauvaises. C'est le format de Michael Nygard (2011,
*Documenting Architecture Decisions*), en français.

Trois règles :

- **Une fiche ne s'efface jamais.** Une décision dépassée est marquée
  *remplacée par* la fiche qui la remplace. Le raisonnement d'avant reste
  lisible : c'est lui qu'on relit quand le même débat revient.
- **Le statut dit qui a tranché.** *Proposée* : l'assistant la recommande,
  le mainteneur n'a pas encore répondu, et rien ne change en attendant.
  *Acceptée* : le mainteneur l'a validée, avec la date. *Acceptée par
  délégation* : le mainteneur a laissé le choix à l'assistant, qui a
  tranché ; la fiche dit pourquoi, et le mainteneur peut la rouvrir.
- **Une fiche ne remplace pas `CLAUDE.md`.** La règle d'interface qui
  sort d'une décision vit dans `CLAUDE.md`. La fiche garde le pourquoi
  et les options écartées.

| # | Décision | Statut |
|---|---|---|
| [0001](0001-recadrage.md) | Recadrer par lots, sans réécrire | acceptée, 19 octobre 2026 |
| [0002](0002-navigation.md) | Un onglet, une question : Aujourd'hui · Pistes · + · Réseau · Moi | acceptée, 19 octobre 2026 ; le + et le partage remplacés par 0008 |
| [0003](0003-poste.md) | Au poste : barre latérale, fiche à côté de la liste | acceptée, 19 octobre 2026 |
| [0004](0004-drapeaux-et-preversion.md) | Les lots derrière des drapeaux datés, et la préversion | acceptée, 19 octobre 2026 |
| [0005](0005-public.md) | L'informatique d'abord, tous les métiers ensuite | acceptée par délégation, 20 octobre 2026 |
| [0006](0006-notifications.md) | Sans serveur au début, mesuré pendant la bêta | acceptée par délégation, 20 octobre 2026 |
| [0007](0007-envoi-direct.md) | L'envoi direct sur le web passe par la vérification Google | close sans être faite, 27 octobre 2026 (« garder le lien mail ») |
| [0008](0008-le-plus-et-le-partage.md) | Le + crée, le partage vit dans « Réseau » | acceptée par délégation, 29 octobre 2026 |
| [0009](0009-tous-les-reglages.md) | Tout ce qui se règle vit dans « Réglages » | acceptée par délégation, 29 octobre 2026 |

Le plan qui découle de ces fiches est dans [`../recadrage.md`](../recadrage.md).

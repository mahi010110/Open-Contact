# 0003 — Au poste : barre latérale, fiche à côté de la liste

**Statut** : acceptée par le mainteneur, 19 octobre 2026.

## Contexte

Au poste (≥ 901 px, `CLAUDE.md` §5), la navigation est une rangée
d'onglets en haut, et la fiche d'une piste s'ouvre en fenêtre centrée
par-dessus la liste. Préparer au calme — écrire, trier, planifier —
demande d'ouvrir et fermer une fenêtre par piste. La liste-détail existe
déjà dans l'app : « À découvrir », les amis et les conversations la
portent au poste.

## Décision

- **Une barre latérale** remplace les onglets du haut. Les mêmes
  destinations, dans le même ordre. « Rechercher » y devient une
  destination (Ctrl K, lot R8), pas un second champ face à celui des
  pistes.
- **La fiche se pose à droite de la liste** de « Pistes » : ↑ ↓ passent
  d'une piste à l'autre, E écrit. Liste ou tableau, d'un clic.
- **Le composeur suit le même motif** quand la série « Prêts à partir »
  arrive (R3) : la file, le mail, et à droite ce qui aide à l'écrire.

## Conséquences

- Le motif du volet (`openSheet({dans})`, déjà employé par les
  conversations) s'étend à la fiche. Pas de troisième manière d'ouvrir
  un objet.
- Au pouce, rien ne change : la fiche reste une feuille (`CLAUDE.md` §5,
  deux dessins seulement quand l'usage diffère).
- Les gardes du poste (focus, colonnes, clavier) se rejouent sur le
  volet, comme ils l'ont été pour les conversations.

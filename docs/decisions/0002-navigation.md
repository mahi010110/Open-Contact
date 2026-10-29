# 0002 — Un onglet, une question

**Statut** : acceptée par le mainteneur, 19 octobre 2026. Les lignes « Le +
fait tout entrer » et « Un seul Partager » sont **remplacées par la
fiche [0008](0008-le-plus-et-le-partage.md)** (29 octobre 2026).

## Contexte

La barre du bas dit aujourd'hui Aujourd'hui · Mes pistes · + · Échanger ·
Moi. Deux onglets répondent à plusieurs questions à la fois :

- « Mes pistes » porte le suivi, mais aussi « Amis », qui parle de gens ;
- « Échanger » porte les conversations, mais aussi « Donner » et
  « Recevoir », qui parlent de pistes et de fichiers.

Une même chose se fait à plusieurs endroits : on reçoit dans
« Échanger », mais on scanne un ami depuis « Mon QR » ; on demande
quelqu'un depuis la fiche, depuis « Amis » ou depuis un groupe.

## Décision

Chaque onglet répond à une seule question, et chaque geste a une seule
place :

| onglet | la question |
|---|---|
| **Aujourd'hui** | je fais quoi maintenant ? |
| **Pistes** | où j'en suis ? |
| **+** | qu'est-ce que j'ajoute ? |
| **Réseau** | qui peut m'aider ? |
| **Moi** | moi |

- **Réseau remplace Échanger.** Les demandes en tête, puis les
  conversations (groupes et amis), puis « Mes amis » en ligne de la
  liste, et « Historique » en bas.
- **Les amis quittent « Pistes »**, qui ne porte plus que des
  entreprises (et « À découvrir »).
- **Le + fait tout entrer** : une piste, quelqu'un rencontré, puis ce
  qu'on te tend (scanner, coller, fichier), sous le mot que l'app
  emploie déjà, « Recevoir ».
- **Un seul Partager**, depuis « Pistes » (choisir, puis Partager) et
  depuis la fiche. Il ne demande que « à qui ? ». À l'écran, le geste
  garde le mot de l'app, **Donner** (§7 : un objet, un mot) — c'est
  celui que l'autre lit de son côté, en face de « Recevoir ».
- **Un seul Trouver quelqu'un**, sur la fiche. L'app choisit le chemin :
  amis, groupes, et plus tard ceux qui aident.
- **La fiche commence par les gens** : qui peut t'ouvrir la porte, puis
  les contacts, puis le suivi.
- **Les anciennes adresses mènent toujours quelque part** : `#/echanger`
  ouvre « Réseau » (registre des destinations, `engine/destinations.js`).

Le + reste au milieu de la barre. Apple demande qu'une barre d'onglets
serve à naviguer, pas à agir ; mais le + central est une convention que
les étudiants connaissent (YouTube, TikTok), et l'app l'a déjà.

## Conséquences

- Les gardes d'« Échanger », des amis, de la fenêtre et de l'audit UX
  changent avec R1. Ils changent dans le même lot, jamais après.
- Un utilisateur actuel cherchera « Donner » là où il était. La
  préversion d'abord, puis une ligne « Nouveau » une seule fois là où
  une fonction a déménagé.
- La table « Ce qui bouge » de `docs/recadrage.md` devient un scénario
  automatique : chaque fonction doit être atteinte depuis son onglet.
- Les données ne bougent pas : aucune clé ne change (`CONTRAT.md`).

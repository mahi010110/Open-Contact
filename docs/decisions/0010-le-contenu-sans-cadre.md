# 0010 — Le contenu sans cadre

**Statut** : **jamais appliquée.** Proposée par délégation le 29 octobre
2026 (la 7.5.0, PR #92), elle n'est pas arrivée dans main : la fiche
[0011](0011-retour-a-la-6-70.md) l'a remplacée le 3 novembre 2026, avant
sa fusion. Elle reste ici pour son raisonnement — c'est lui qu'on relit si
le débat des cadres revient.

*Ce qu'elle disait, tel quel :* acceptée par délégation, 29 octobre 2026. Le mainteneur
a posé le problème — « les cadres dans certaines pages restreignent et
empêchent d'utiliser l'espace vide », « faire un gros travail de
minimalisme », « utiliser l'espace disponible, ne pas se brider », « sur
téléphone, ajouter des gestes et des choses cliquables, enlever des
boutons inutiles » — et laissé le dessin à l'assistant. Remplace, dans
`CLAUDE.md` §6, « UN cadre, des rangées » (le choix parmi 2-5 options) et
« Une page = un objet et ses réglages : des cadres `.fset` ».

## Contexte

Relevé sur la 7.4.0, au pouce et au poste :

- **Chaque chose avait son cadre, et chaque cadre son relief.** Une piste
  de « Mes pistes » était une carte (trait, fond, ombre dure), une ligne
  d'« Aujourd'hui » aussi, chaque conversation de « Réseau » vivait dans
  un cadre de boîte, chaque groupe de « Moi » dans un cadre de groupe 98,
  chaque compte de tranche dans une pastille encadrée, chaque bulle d'un
  fil dans un trait. Au poste, « Aujourd'hui » empilait trois niveaux :
  le bureau beige, la colonne encadrée, la carte encadrée dedans.
- **Un cadre coûte de la place sans rien dire** : son trait, puis l'écart
  avec le cadre voisin — 7 px entre deux pistes ou deux lignes du jour,
  8 entre deux cartes d'une colonne du poste. Toutes les cartes étant
  pareilles, le cadre ne distinguait rien.
- **Une liste se balaie, une carte se lit.** Les cartes conviennent à un
  contenu hétérogène qu'on parcourt ; une liste d'objets de même forme
  qu'on cherche et qu'on compare se lit mieux en lignes (NN/g, Laubheimer
  2016, repris par les systèmes de design du Queensland et de la
  Commission européenne).
- **« Modifier » était un bouton à côté du nom qu'il modifie**, sur la
  fiche et dans « Moi » : deux objets pour un geste.

## Décision

- **L'écran d'un onglet EST la fenêtre de l'app** : il prend la face
  claire des feuilles (`--surface-window`). Ce qui s'y range n'a plus de
  cadre à soi.
- **Le contenu se pose en lignes, séparées d'un pointillé** : les
  tranches d'« Aujourd'hui », la liste des pistes, la boîte de « Réseau »
  et ses demandes, les groupes de « Moi » et des Réglages, les modèles
  d'emails, les réglages d'un groupe, les listes à cocher (Donner,
  Choisir, partage en groupe), « Premiers pas », « À trier », les états
  vides. Un groupe se dit par son NOM en petites capitales (`.rg-sec`,
  la légende de `.fset`), jamais par un cadre.
- **Le châssis garde ses cadres** : barres de titre, fenêtres et
  feuilles, champs, boutons, segments, la barre d'onglets. Et un OBJET
  qui tient entièrement dans son cadre le garde : une puce, un segment,
  la carte d'une demande, la carte « À savoir », un QR, une carte du
  tableau de « Mes pistes » — qu'on prend et qu'on dépose (§4 : un aplat
  ne se pose que sur un objet qui tient entièrement dedans).
- **Un compte est un chiffre**, en mono, sans pastille ; « En retard »
  garde l'ambre de son titre.
- **Une bulle est un aplat sans trait** : le gris du châssis pour les
  autres, le lavis d'accent pour les miennes — la couleur dit qui parle.
- **Au poste, le tableau du jour pose trois colonnes de lignes**, plus
  trois cadres : rien ne s'y dépose, ce sont des tranches côte à côte.
  Le tableau de « Mes pistes » garde ses colonnes encadrées : on y dépose
  une carte, et le bas d'une colonne courte reste une cible.
- **Ce qui se modifie se touche** : sur la fiche et dans « Moi », le bloc
  du nom ouvre « Modifier », son crayon le dit. « Donner », sur la fiche,
  n'est plus qu'une icône de partage.
- **L'appui long sur une piste (le clic droit au poste) ouvre « Choisir »,
  elle cochée.** C'est un raccourci : le bouton « Choisir » reste visible,
  parce que sur un iPhone choisir dans une liste passe par un
  « Sélectionner » visible et qu'un geste seul ne se devine pas.
- **Les filtres de la boîte sont des onglets de texte**, ceux de « Mes
  pistes · À découvrir », plus quatre puces encadrées.

## Options écartées

- **Garder les cartes et seulement réduire leurs marges** : la place
  revient à moitié, et le papier peint reste — chaque ligne pareille,
  encadrée pareil.
- **Des groupes arrondis sur fond gris, à la manière des réglages
  d'iOS** : un cadre sous un autre nom, et un arrondi que l'identité
  « nette, sans flou » refuse (§4).
- **Retirer « Choisir » au pouce au profit de l'appui long seul** :
  essayé, retiré le jour même — un geste caché ne peut être qu'un
  raccourci (NN/g), et l'idiome d'iOS est un bouton visible.
- **Aplatir aussi le tableau de « Mes pistes »** : ses colonnes sont des
  cibles de dépôt ; sans cadre, on ne voit plus où lâcher une carte.
- **Au pouce, une feuille longue qui prend tout l'écran** : essayé,
  retiré le jour même. Les 8 % du haut ne sont pas de la place perdue :
  c'est là que se posent le toast et la barre « Annuler » quand une
  feuille est ouverte — sans eux, la barre couvrait le corps de la
  feuille (`e2e-finitions.mjs` ①, rouge) —, et c'est ce qui dit
  « feuille » : iOS laisse lui aussi voir l'écran d'en dessous.

## Conséquences

- Aucune donnée ne bouge, aucune clé ne change, aucun écran n'apparaît
  ni ne disparaît.
- Les gardes qui lisaient les puces de la boîte (`e2e-boite.mjs`) ou le
  bouton « Modifier » de « Moi » (`e2e-profil.mjs`) lisent les onglets et
  l'en-tête qui se touche.
- `CLAUDE.md` §4, §5 et §6 disent la règle ; l'annexe garde la trace des
  deux formes remplacées.

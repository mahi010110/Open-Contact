# 0008 — Le + crée, le partage vit dans « Réseau »

**Statut** : **acceptée par délégation**, 29 octobre 2026. Le mainteneur
a posé le problème (« le + a perdu son sens, le partage a été dispersé
entre plusieurs endroits ») et laissé le dessin à l'assistant (« je te
conseille de faire tes propres avis et tes propres observations »).
Remplace, dans la fiche 0002, la ligne « Le + fait tout entrer » et la
ligne « Un seul Partager, depuis Pistes (choisir, puis Partager) et
depuis la fiche ».

## Contexte

La 7.0.0 (décision 0002) avait réparti l'échange de pistes ainsi :

- le **+** ouvrait une feuille « Ajouter » dont le corps disait
  « Recevoir » (QR · Fichier · Texte) et dont le pied portait « Un
  contact » et « Une piste » ;
- **Donner** partait de « Mes pistes › Choisir », de la fiche et d'un
  groupe ;
- **Mon QR** et son scanner vivaient dans « Réseau › Mes amis ».

Relevé au téléphone le 29 octobre 2026 :

- le geste le plus fréquent de l'app — ajouter une piste — demandait deux
  taps, le second au pied d'une feuille titrée autrement ;
- le bouton du poste disait « Ajouter N », mais N ouvrait la capture
  pendant que le clic ouvrait « Ajouter » : la touche et le bouton qui la
  porte ne faisaient pas la même chose ;
- les deux moitiés d'un même échange — ce que je donne, ce que je
  reçois — étaient aux deux bouts de l'app, et aucune des deux là où sont
  les gens à qui l'on donne.

## Décision

- **Le + crée, et une seule chose : une piste.** Un tap ouvre « Nouvelle
  piste », le curseur dans l'entreprise. La touche N fait la même chose
  que le bouton qui la porte, et le bouton du poste dit « Nouvelle
  piste ». Quelqu'un rencontré sans entreprise se note dans la même
  feuille : sans entreprise, la personne part dans le bac « à
  rattacher » — c'était déjà le cas ; « Un contact » ne faisait que
  changer l'ordre des mêmes champs.
- **Donner et Recevoir vivent côte à côte dans « Réseau »**, l'onglet des
  gens : sous la boîte, juste au-dessus de la barre au téléphone (la
  place du pouce) ; à droite du titre au poste. « Donner » n'existe que
  s'il y a une piste à donner.
- **La fiche garde « Donner » pour SA piste**, et un groupe garde « Donner
  au groupe » dans son pied : un geste sur l'objet qu'on regarde n'est
  pas un second chemin, c'est le même geste porté par l'objet.
- **« Choisir » ne fait plus qu'écrire** : il choisit des pistes à qui
  écrire en série. Donner y faisait doublon avec « Réseau › Donner », qui
  ouvre la même liste.

## Options écartées

- **Un + qui garde un menu** (piste, contact, recevoir) : c'est la feuille
  qu'on retire. Un menu derrière le + fait payer un tap de plus au geste
  le plus fréquent pour en servir de rares.
- **Un onglet « Partager »** : une cinquième destination pour deux gestes
  qu'on fait de temps en temps ; la barre ne s'allonge pas pour ça.
- **Donner dans « Pistes » et Recevoir dans « Réseau »** : c'est la
  dispersion qu'on corrige.

## Conséquences

- La feuille « Ajouter » (`ui/ajouter.js`) disparaît, avec son style.
- `openRecevoir()` s'ouvre sur ses trois mots ; l'option `mode` qui
  servait la feuille « Ajouter » part avec elle.
- Les chemins des scénarios passent par « Réseau »
  (`ouvrirRecevoir`, `ouvrirDonner`, `tests/e2e/outils.mjs`), et la table
  « Ce qui bouge » de `docs/recadrage.md` est mise à jour : elle reste
  jouée par `e2e-ce-qui-bouge.mjs`.
- `e2e-reseau.mjs` garde le + qui crée, les deux verbes sous le pouce et
  à droite du titre, et rougit si le partage quitte « Réseau ».
- Aucune donnée ne bouge, aucune clé ne change.

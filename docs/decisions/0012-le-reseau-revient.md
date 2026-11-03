# 0012 — Le réseau revient

**Statut** : **acceptée**, 3 novembre 2026, pour ce qui revient — le
mainteneur l'a choisi sur un catalogue de quatorze captures de la 7.4.0 :
« tout sauf 12, 13, 14 ». **Acceptée par délégation** pour la mise en
page de « Réseau » au poste (deux colonnes, la conversation en
fenêtre), qui remplace ce qu'il a écarté ; elle se montre en captures
avant la fusion et se rouvre sur un mot. Complète la fiche 0011 :
l'interface reste celle de la 6.70, le réseau de la 7.4 y revient.

## Contexte

La 8.0.0 est revenue à l'interface de la 6.70 (fiche 0011). Le même
jour, le mainteneur : « la présentation du réseau et les amis, et tout
ce que j'aime dans tes updates, remets-le — le problème, c'est que je ne
me rappelle plus exactement ce qu'il y avait ». Un catalogue de la 7.4.0
lui a été montré, une capture et une légende par élément. Sa réponse :
« tout sauf 12, 13, 14 — mais attention, je veux que ce soit cohérent,
donc il faut un audit. Mon but est que l'app soit simple, facile et
fluide, sans charge mentale, et un design minimaliste. » Puis : « remets
aussi les boutons comme avant ».

## Décision

**Ce qui revient** (les éléments 1 à 11 du catalogue) :

1. l'onglet « Réseau », à la place d'« Échanger » : mes demandes en
   tête, toutes les conversations (groupes et amis) dans une boîte avec
   ses filtres Tout · Non lus · Groupes · Amis, « Mes amis », et les deux
   verbes Donner · Recevoir ; `#/echanger` y mène ;
2. une conversation avec un ami en plein écran au pouce ;
3. un groupe comme une messagerie : les visages, le jour une fois, la
   ligne « N nouveaux », les liens, les mentions, qui veut entrer ;
4. « Groupe » rangé comme les infos de WhatsApp : inviter, les réglages,
   les membres ;
5. « Mes amis », dans « Réseau » — plus dans « Mes pistes » ;
6. la fiche d'un ami : « Écrire à Clara » ;
7. la demande suivie comme un colis — Envoyée · Trouvée · Reçu —, qui
   dit ce qu'on cherche, et « Karim m'a conseillé de vous écrire » dans
   le mail ;
8. « Présenter » : « Yanis est d'accord » ;
9. « Aujourd'hui » dit « Clara et Sarah t'ont écrit », aucun chiffre
   sur les onglets, et « Réseau » change de couleur quand quelqu'un
   attend ;
10. « Je peux aider », dans Moi — et ce qu'un ami offre devient un choix
    dans « Demander à Karim » ;
11. « Décroché » propose d'aider à son tour.

Et **les boutons du « 98 » d'origine** (le choix du mainteneur du 28
octobre) : chaque secondaire dans sa boîte, le primaire rempli d'accent
dans le même relief, le neutre en mot sourd.

**Ce qui ne revient pas** :

- 12, « Mon visage » : les visages restent tirés de l'identifiant ; un
  visage dessiné en 7.x reste dans le profil, mais ne s'affiche pas et
  ne part plus dans le profil donné ;
- 13 et 14, au poste, la conversation et le groupe posés à droite de la
  liste ;
- ce que le catalogue ne montrait pas, et qui reste parti avec la 8.0 :
  la barre latérale, la fiche à côté de la liste, « Premiers pas »,
  « Ma semaine », Ctrl K et les touches d'une lettre, « Le dire à
  Karim » (le merci proposé sur la fiche), la place des gestes du 19
  octobre (la case « Fait », « Clôturer » à « Où j'en suis »).

**Au poste**, puisque la conversation ne se pose plus à côté de la
liste : elle s'ouvre en fenêtre, comme toutes les feuilles du poste, et
« Réseau » tient deux colonnes — les gens à gauche, la plus large (mes
demandes, les conversations, « Mes amis »), les échanges de pistes à
droite (« Reçues, jamais reprises », l'historique), sous Donner ·
Recevoir. Sans rien à droite, une seule colonne.

## Options écartées

- **Revenir à la 7.4.0 entière** : la navigation du recadrage, la barre
  latérale et les retouches que le mainteneur a refusées le même jour
  revenaient avec le réseau.
- **Garder la conversation à droite de la liste au poste** : écartée par
  le mainteneur (13 et 14).
- **Garder les boutons texte de la 6.70** : « remets les boutons comme
  avant » — et la boîte 98 est celle qu'il avait choisie, côte à côte,
  le 28 octobre.
- **Une seule colonne au poste** : 36 rem de liste dans une page de
  1 280 px, le reste vide — l'écran non conçu de `CLAUDE.md` §6.

## Conséquences

- **La barre** : Aujourd'hui · Pistes · + · Réseau · Moi au pouce,
  Aujourd'hui · Mes pistes · Réseau · Moi au poste. « Échanger »
  disparaît ; ce qu'il portait (Donner, Recevoir, les groupes) vit dans
  « Réseau ».
- **« Mes pistes » ne porte plus que des entreprises** : « Mes pistes ·
  À découvrir ». La liste des amis vit dans « Réseau › Mes amis ».
- **Le profil donné (OCA1) porte de nouveau `aide`**, écrit sous le QR
  tel qu'il part ; **jamais `visage`** (`profilDonneIci`, `ui/reseau.js`).
- **Les boutons** : la fiche reprend ses boîtes (« Compléter »,
  « Modifier », « Ajouter »), « Prospecter » et « Affiner » aussi.
- **Aucune donnée ne bouge** : les clés `oc_fils_v1` (épingles, son
  coupé) sont de nouveau écrites ; rien d'autre ne change au stockage.
- **`CLAUDE.md`** dit le réseau (§0, « Le réseau revient » ; §6, les
  motifs) et les boutons (§4, §6) ; les règles remplacées sont dans
  son annexe.

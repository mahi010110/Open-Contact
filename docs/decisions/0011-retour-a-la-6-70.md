# 0011 — Retour à l'interface de la 6.70

**Statut** : **acceptée**, 3 novembre 2026. Le mainteneur : « depuis que
tu as commencé, tout ce que tu as fait niveau UX et design est
désastreux. J'aimerais revenir à ce qu'était l'app avant, en laissant
certaines choses. » Il a choisi le point de retour (la 6.70, 14 octobre
2026) et ce qui reste : les amis, les groupes et les messages, la phrase
de secours, les corrections de bugs. Remplace les fiches 0001 à 0004,
0008 et 0009, la seconde moitié de 0005 (« tous les métiers »), et la
proposition 0010, qui n'était pas encore fusionnée.

## Contexte

Du 14 au 29 octobre 2026, l'app est passée de la 6.70 à la 7.4.0 : la
boîte des conversations (6.71), puis le recadrage (R0 à R10, ouvert à
tous en 7.0.0), puis quatre versions de retouches (7.1 à 7.4) — les
boutons, les réglages rangés, « Premiers pas », « Mon visage », le +, le
partage dans « Réseau ». Une 7.5.0 attendait encore (le contenu sans
cadre, le composeur refait, le poste aligné).

Chaque lot était vert sur ses gardes. Leur somme, vue sur le téléphone du
mainteneur, ne l'était pas : une navigation changée deux fois en dix
jours, des écrans qui ne se reconnaissaient plus d'une version à
l'autre, et des retouches qui en appelaient d'autres.

## Décision

- **L'interface revient à la 6.70** : `ui/`, `styles/`, `index.html`,
  `app.js`, `aide.html`, les scénarios `tests/e2e/` et `CLAUDE.md`
  reprennent leur état du 14 octobre (f2d84eb). La navigation est celle
  d'alors : Aujourd'hui · Mes pistes · + · Échanger · Moi.
- **Les amis, les groupes et les messages restent**, tels qu'ils étaient
  en 6.70 : le profil donné et sa liste, la demande à ses amis et ses
  sauts, les groupes (ouverts ou sur demande, leurs réglages), la
  conversation privée avec un ami.
- **La phrase de secours reste** (R5, 7.1.0) : « Moi › Ma copie ›
  Phrase de secours », « J'ai déjà OpenContact » sur l'accueil vide, la
  copie scellée déposée sur les relais. Elle ne change rien à l'écran
  tant qu'on ne la crée pas.
- **Les corrections de bugs restent**, reportées sur l'interface de la
  6.70 sans les changements d'apparence qui les accompagnaient : le
  focus d'ouverture qui volait le champ, « Où j'en suis » et sept textes
  qui débordaient à 200 %, « Tout est à jour » qui mentait, les barres
  qui portaient une phrase, le toast plié dans la moitié de l'écran, le
  bas d'une conversation qui passait sous le champ, et d'autres
  (`CHANGELOG.md`, 8.0.0).
- **Le moteur reste celui de la 7.4.0.** Il n'a fait qu'ajouter depuis la
  6.70 ; il lit tout ce qu'une 7.x a écrit, les formats et les clés ne
  bougent pas (`CONTRAT.md`). Les modules qui ne servent plus aucun
  écran dorment, testés par `?test`.
- **La 7.5.0 n'est pas fusionnée.**

## Options écartées

- **Revenir à la 7.1.0** : la navigation du recadrage restait (onglet
  « Réseau », barre latérale au poste), seules les retouches suivantes
  partaient. C'est la navigation elle-même que le mainteneur ne
  reconnaissait plus.
- **Revenir à la 6.39** (avant l'arrivée de l'assistant) : les amis, les
  groupes et les conversations n'existaient pas, et le mainteneur les
  garde.
- **Revenir aussi le moteur à la 6.70** : une donnée écrite par une 7.x
  (un profil, un groupe, une copie scellée) aurait pu se perdre à la
  lecture. Le moteur garde ce qu'il sait lire.
- **Retoucher la 7.4.0 jusqu'à ce qu'elle plaise** : c'est la pente qui a
  mené ici, une retouche à la fois.

## Conséquences

- **Ce qui disparaît de l'écran** : l'onglet « Réseau » et sa boîte des
  conversations, la barre latérale et la fiche à côté de la liste au
  poste, « Premiers pas », tes chiffres en tête de « Mes pistes », « Ma
  semaine » et « Reprendre », « Écrire les N mails », « Je peux aider »,
  les touches d'une lettre et Ctrl K, l'export du parcours, tous les
  métiers dans la barre, les mentions et les liens dans les messages, le
  suivi d'une demande comme un colis, « Présenter », « Mon visage », le
  calme des onglets, les boutons teintés.
- **Aucune donnée ne se perd** : ce que ces écrans ont écrit reste dans
  le stockage, intact (une semaine choisie, un visage dessiné, une
  conversation épinglée, un brouillon). Une 7.x et une 8.0 se
  synchronisent comme avant.
- **Les fiches 0001 à 0004, 0008 et 0009 sont remplacées**, 0005 pour
  « tous les métiers », et 0010 n'a jamais été appliquée ; 0006 (sans
  serveur au début) et 0007 (le lien mail reste) tiennent toujours.
  `docs/recadrage.md` est clos.
- **La leçon, écrite dans `CLAUDE.md` §0** : un changement qui se voit
  — un écran, un parcours, l'apparence d'un contrôle — se montre au
  mainteneur, capture de l'avant à côté de celle de l'après, AVANT
  d'arriver dans main. Une suite verte dit que le changement est
  conforme ; elle ne dit pas qu'il est voulu.

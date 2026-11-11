# 0015 — La refonte en 9.0 : la barre, la file, la barre latérale

**Statut** : **acceptée par délégation**, 10 novembre 2026. Le
mainteneur, ce jour-là : « mets-toi au travail, pousse le concept au
max et surprends-moi, tu as la main sur tout, fais toi-même les choix
sur base de connaissances » ; puis : « ne te fie pas uniquement à la
maquette validée », et « la version PC aussi est à refaire ». L'assistant
a tranché ce qui suit ; **rien n'est dans main** : la branche se montre
en captures, avant et après, au téléphone et à l'ordinateur (§0), et le
mainteneur peut rouvrir chaque point. Complète les fiches 0013 et 0014.

## Contexte

La fiche 0014 fixe la direction : l'expérience d'Arc Search, le style
98, deux dessins, directement dans main. Les maquettes du téléphone
avaient été validées le 9 novembre. Restait à construire, et à décider
tout ce qu'une maquette ne dit pas : ce que la barre comprend, ce que
l'app fait seule, et à quoi ressemble l'ordinateur.

Trois sources ont servi : les trois rapports de recherche (`reports/`),
les règles de `CLAUDE.md`, et ce que font les produits cités en exemple
(Arc et Arc Search, ChatGPT, Linear, Todoist, Fantastical, Things).

## Décision

Les dix principes sont dans [`../principes.md`](../principes.md). Ce
qu'ils donnent à l'écran :

1. **La barre** (`engine/commande.js`, `ui/barre.js`) : une entrée pour
   chercher, ouvrir, ajouter et agir. Elle comprend un geste (« relancer
   Advens », « entretien Aztek jeudi 14h », « refus Capgemini », « note
   Thales : … »), une recherche, un lieu de l'app, un ami, un lien
   collé. Une table, pas une IA. Rien ne change sans un tap ; ce qui
   change s'annule.
2. **La file** (`engine/etape.js`, `ui/today.js`) : « Aujourd'hui » n'a
   plus de tranches. Une piste, sa prochaine étape, un bouton nommé ; le
   premier est le seul rempli. « Bientôt » dit aussi le plan d'une piste
   qui attend.
3. **Le rangement automatique** (`engine/rangement.js`) : 45 jours de
   silence, clôturée « Abandonné », annoncée sept jours, « Annuler ».
4. **La suite d'un « Décroché »** (`engine/contrat.js`) : la convention,
   le dépôt, les 45 premiers jours.
5. **Au téléphone**, la barre du bas à trois places : mes pistes (la
   pile), le +, moi. « Réseau » vit dans « Moi ».
6. **À l'ordinateur**, une barre latérale (la barre, les quatre lieux,
   « Nouvelle piste », la pile dépliée), la barre en palette, et
   « Aujourd'hui » en deux zones.

Données : deux champs privés de plus à la piste (`suite`, `rangeAuto`)
et une clé de cet appareil (`oc_recents_v1`) — `CONTRAT.md`. Aucune clé
renommée, aucune donnée perdue.

## Options écartées

- **Surligner dans le champ ce que la barre a compris** (Todoist,
  Fantastical). C'est une couche posée sur un champ de saisie, fragile
  sous WebKit, que l'on ne mesure pas ici (`CLAUDE.md` §9). La première
  ligne dit ce qui est compris, en clair, juste sous le champ.
- **Un bouton unique au pied d'« Aujourd'hui »** qui jouerait la
  première ligne (la zone du pouce, §5). Écarté pour l'accueil : deux
  barres remplies l'une sur l'autre (le bouton et le +), et un cinquième
  de l'écran pris sur un petit téléphone. Le bouton rempli du **pied
  d'une fiche**, lui, joue l'étape.
- **Une bande « où en est la recherche »** (des comptes par état). Le
  rapport demande de montrer le progrès qui dépend de l'étudiant « sans
  série ni compteur » : la bande comptait surtout ce qui dépend des
  employeurs.
- **La fiche posée à côté de la liste, à l'ordinateur.** Le mainteneur
  avait écarté ce dessin pour les conversations le 3 novembre : la fiche
  reste une fenêtre 98, qu'on déplace.
- **Garder la barre du haut à l'ordinateur.** Elle tient quatre lieux
  aussi bien qu'une barre latérale (Microsoft, Apple), mais elle ne
  porte pas la pile des pistes ouvertes ; c'est la pile qui justifie la
  gauche.
- **Interroger l'annuaire pendant la frappe**, dans la barre. Un mot
  tapé là peut être un nom, une note, un prénom : la question ne part
  que sur « Prépare la page ».

## Conséquences

- **« Réseau » est à deux taps au téléphone.** L'accueil dit toujours
  qui a écrit, et « Moi » change de couleur quand quelqu'un attend. À
  surveiller à l'usage.
- **Le + n'ouvre plus « Nouvelle piste » directement** : elle est au
  pied de la barre, à un tap de plus. C'était le seul métier du +.
- **Le rangement est le premier geste que l'app fait sans tap.** Ses
  trois gardes (rien n'est supprimé, ça s'annonce, ça ne recommence pas)
  sont testées ; le seuil de 45 jours est celui de `engine/assist.js`,
  ni confirmé ni contredit par les sources.
- **La barre latérale rappelle celle de la 7.x**, retirée le 3 novembre
  avec tout le reste (fiche 0011). Elle n'a pas le même contenu — elle
  porte la pile —, mais c'est au mainteneur de le dire devant les
  captures.
- **Des écrans ne sont pas refaits** : « Mes pistes », « Réseau »,
  « Moi », le composeur. Ils gardent leurs règles (`CLAUDE.md` §4 à §9)
  jusqu'à leur lot.
- **Reste à faire** (`docs/refonte-plan.md`) : la première ouverture
  complète (les entreprises proposées dès la cible), le geste après un
  refus, masquer la conversation libre, fondre la recherche de « Mes
  pistes » dans la barre, et le test sur un vrai iPhone.

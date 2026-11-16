# 0015 — La refonte en 9.0 : la barre, la file, la barre latérale

**Statut** : **acceptée par délégation**, 10 novembre 2026, **reprise le
12**. Le mainteneur, le 10 : « mets-toi au travail, pousse le concept au
max et surprends-moi, tu as la main sur tout » ; puis « la version PC
aussi est à refaire ». Le 11, devant la première version : « je ne veux
pas un affichage comme avant ; que TOUT soit repensé et critiqué avec
les yeux d'un designer UX, sur base de connaissance et de psychologie ;
un PC et un tel n'ont pas les mêmes contraintes ». L'assistant a tranché
ce qui suit ; **rien n'est dans main** : la branche se montre en
captures, avant et après, au téléphone et à l'ordinateur (§0), et le
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
2. **Le lecteur** (`engine/etape.js`, `ui/today.js`) : « Aujourd'hui »
   est une file — À faire, Bientôt, Fait aujourd'hui — et la fenêtre
   « Maintenant », une boîte de dialogue 98 qui porte la ligne choisie :
   le geste nommé, seul bouton rempli, et « Plus tard » (choisir quand).
   La fenêtre porte aussi les étapes de la recherche : la cible, trouver
   des entreprises, rien à faire, la suite d'un contrat.
3. **Le rangement automatique** (`engine/rangement.js`) : 45 jours de
   silence, clôturée « Abandonné », annoncée sept jours, « Annuler ».
4. **La suite d'un « Décroché »** (`engine/contrat.js`) : la convention,
   le dépôt, les 45 premiers jours.
5. **La fiche** se lit dans l'ordre où l'on s'en sert : où en est la
   piste (trois états, ce qui est derrière soi marqué), la prochaine
   étape, les gens — qu'on joint d'un tap, sans déplier —, mes notes, ce
   qu'on sait d'elle, l'historique ouvert. Une réponse fait tomber la
   relance prévue.
6. **Les listes** sont dans un seul cadre, sans carte par ligne ; « Mes
   pistes », au téléphone, est groupée par état.
7. **Au téléphone** : la fenêtre « Maintenant » ancrée sous le pouce ;
   en bas, mes pistes (la pile), la barre — **un champ**, qui reste en
   bas quand on le touche —, moi. « Réseau » vit dans « Moi ».
8. **À l'ordinateur** : une barre latérale (la barre, les quatre lieux,
   « Nouvelle piste », la pile dépliée) ; la file en colonnes au centre,
   « Maintenant » à droite avec les contacts et les notes ; le clavier
   (↑ ↓, Entrée, Ctrl K, « / ») ; la barre en palette.

Données : deux champs privés de plus à la piste (`suite`, `rangeAuto`)
et une clé de cet appareil (`oc_recents_v1`) — `CONTRAT.md`. Aucune clé
renommée, aucune donnée perdue.

## Options écartées

- **Un bouton nommé sur chaque ligne de la file** (la première version,
  du 10 novembre). Trois boîtes de même poids ne disent pas « fais ça » :
  seul le remplissage du premier les départageait, et l'écran restait
  celui d'avant, habillé autrement. Le geste vit dans la fenêtre
  « Maintenant », un seul à la fois.
- **Le + rempli au centre de la barre du bas** (la maquette du 9
  novembre). Un + dit « ajouter » ; la barre cherche, ouvre, ajoute et
  agit — et c'était un second aplat d'accent sous le geste du jour. Le
  centre est un champ, avec son invite ; le + reste, en accent, dedans.
- **Le champ de la barre en haut de la feuille, au téléphone.** On le
  touche en bas, il réapparaissait en haut : il reste en bas, au-dessus
  du clavier.
- **Surligner dans le champ ce que la barre a compris** (Todoist,
  Fantastical). C'est une couche posée sur un champ de saisie, fragile
  sous WebKit, que l'on ne mesure pas ici (`CLAUDE.md` §9). La première
  ligne dit ce qui est compris, en clair, contre le champ.
- **Une bande « où en est la recherche »** (des comptes par état). Le
  rapport demande de montrer le progrès qui dépend de l'étudiant « sans
  série ni compteur » : la bande comptait surtout ce qui dépend des
  employeurs. « Fait aujourd'hui » montre les gestes, sans les compter.
- **La fiche posée à côté de la liste, à l'ordinateur.** Le mainteneur
  avait écarté ce dessin pour les conversations le 3 novembre, et la
  fenêtre 98 qu'on déplace est un acquis testé (`e2e-fenetre.mjs`).
  C'est la fenêtre « Maintenant », à droite de la file, qui évite
  d'ouvrir la fiche pour agir.
- **Garder la barre du haut à l'ordinateur.** Elle tient quatre lieux
  aussi bien qu'une barre latérale (Microsoft, Apple), mais elle ne
  porte pas la pile des pistes ouvertes ; c'est la pile qui justifie la
  gauche.
- **Interroger l'annuaire pendant la frappe**, dans la barre. Un mot
  tapé là peut être un nom, une note, un prénom : la question ne part
  que sur « Prépare la page ».
- **Redessiner « Réseau ».** C'est l'écran que le mainteneur a redemandé
  tel quel le 3 novembre (8.1.0) : il garde son dessin ; seules ses
  listes prennent le cadre commun.

## Conséquences

- **« Réseau » est à deux taps au téléphone.** L'accueil dit toujours
  qui a écrit, et « Moi » change de couleur quand quelqu'un attend. À
  surveiller à l'usage.
- **« Nouvelle piste » est à deux taps au téléphone** : le champ, puis
  la dernière ligne de la barre, contre le champ. À l'ordinateur, le
  bouton de la barre latérale et la touche « n » restent directs.
- **Le rangement est le premier geste que l'app fait sans tap.** Ses
  trois gardes (rien n'est supprimé, ça s'annonce, ça ne recommence pas)
  sont testées ; le seuil de 45 jours est celui de `engine/assist.js`,
  ni confirmé ni contredit par les sources.
- **La barre latérale rappelle celle de la 7.x**, retirée le 3 novembre
  avec tout le reste (fiche 0011). Elle n'a pas le même contenu — elle
  porte la pile —, mais c'est au mainteneur de le dire devant les
  captures.
- **La fenêtre ancrée prend de la place sur un petit téléphone** (un
  tiers de l'écran en 360 × 640) : elle s'y resserre, et la file défile
  au-dessus. À regarder sur un vrai appareil.
- **Des écrans gardent leur dessin** : « Réseau », « Moi » (à une ligne
  près), le composeur, la capture, le tableau de « Mes pistes » au
  poste. Ils gardent leurs règles (`CLAUDE.md` §4 à §9).
- **Reste à faire** (`docs/refonte-plan.md`) : la première ouverture
  complète (les entreprises proposées dès la cible), le geste après un
  refus, masquer la conversation libre, fondre la recherche de « Mes
  pistes » dans la barre, et le test sur un vrai iPhone.

# Brief : concevoir la nouvelle interface d'OpenContact

*Écrit le 16 novembre 2026, à la fin d'un cadrage en six étapes mené avec
le mainteneur (critique, recherche, questions, trois directions, choix,
brief). Il s'adresse à l'assistant qui va dessiner puis construire
l'interface. Tout ce qui est marqué « décidé » vient du mainteneur ;
le reste est à toi.*

---

## 1. La mission

Dessiner, puis construire, **toute** l'interface d'OpenContact à partir
d'un concept déjà choisi : **l'app simple**. Le moteur, les données et le
matériel « Utilitaire 98 » restent. La navigation, les écrans et les
parcours sont à refaire.

Le mainteneur attend deux choses à la fois, et elles ne s'opposent pas :
**que ce soit évident** (on comprend sans réfléchir) et **que ça le
surprenne** (§5).

La maquette qui a emporté sa décision est dans
`design/maquettes/directions/index.html` (direction « Simple »). Elle se
navigue : ouvre-la avant de lire la suite. Sa réaction : « C'est super.
Le concept est meilleur que ce que je pensais. Je te fais confiance pour
le reste. Continue de me surprendre. »

## 2. Ce qui est décidé

Ne rouvre pas ces points sans une raison que tu peux montrer en image.

| Question | Décision du mainteneur |
|---|---|
| Ce qui reste | le moteur (`engine/`), les données et leurs clés (`CONTRAT.md`), le matériel 98 : barres de titre, couleurs, esprit utilitaire |
| Ce qui peut changer | tout le reste : onglets, noms d'écrans, parcours. « Tout peut changer. » Rien de l'interface actuelle n'est à sauver à tout prix |
| Le concept | l'app simple : quatre onglets fixes, des listes, une page par entreprise. « Je veux pas réinventer la roue » |
| Pour qui d'abord | un camarade qui découvre l'app : zéro piste, zéro explication |
| Ce qui vient en premier | trouver des entreprises, des contacts, des pistes |
| Le suivi | trois niveaux d'effort, et il veut aider les trois : l'app déduit seule, un tap quand ça bouge, tenu à la main pour qui le veut |
| Le réseau | gardé en entier, discussion comprise, tant que ça sert. « Je veux pas juste ajouter pour ajouter » |
| Les écrans | téléphone et ordinateur comptent tous les deux. L'ordinateur est un vrai poste de travail |
| Le ton | elle guide, avec un peu de chaleur, « sans trop en faire » |
| La méthode | des maquettes d'abord, le code ensuite. Rien dans `main` sans son accord |
| La refonte `claude/refonte-arc` | elle ne lui plaît pas : « encore l'ancienne app », et « trop chargé ». Ne pars pas de son dessin |

## 3. Pour qui

**Le public.** Des étudiants de BTS SIO et de BUT, en informatique et en
cybersécurité, qui cherchent un stage, une alternance ou un premier
emploi. Un public plus modeste que la moyenne (53 % de boursiers en BTS)
et qui a peu de réseau familial. La majorité envoie plus de vingt
candidatures, cherche plus de trois mois, et reçoit surtout du silence.

**Le mainteneur est le seul usager régulier.** Aucune bêta n'a eu lieu.
Lui-même se sert de « trouver » et du réseau, pas du suivi (« trop lourd
à tenir ») ni du composeur de mails. Il cherche un stage, puis une
alternance. Il trouve ses entreprises sur LinkedIn, par des gens et dans
l'app, et contacte par mail, LinkedIn, appel et formulaire en ligne.

**Leurs écrans.**

- Un sur deux a un iPhone, donc WebKit, que cet environnement ne sait pas
  mesurer. Le mainteneur ouvre l'app sur iPhone, dans Safari et installée.
- Les téléphones font de 360 à 414 px de large. Dessine à 390, contrains
  à 360.
- Le portable courant offre environ 1536 × 730 px utiles : large et bas.
- Un cinquième à un tiers des gens changent la taille du texte.
- Une visite sur téléphone dure une minute. Le travail long (chercher,
  écrire) se fait plutôt à l'ordinateur.
- La classe du mainteneur vit sur **Discord**, pas sur WhatsApp.

**Comment il découvre l'app.** Par un lien posté sur Discord, par
quelqu'un qui lui montre un QR, par un prof, ou seul. Le premier contact
se fait souvent dans Safari, pas dans l'app installée.

Ces chiffres ont été lus dans des extraits de recherche, pas tous à la
source, et aucun n'est propre au BTS SIO. Les sources et le détail du
parcours sont dans les rapports de la branche `claude/refonte-arc`
(`reports/*.md`), qui restent valables même si son dessin ne l'est pas.

## 4. Le concept : l'app simple

La forme des apps que tout le monde connaît : **chercher, garder,
contacter, suivre**. Quatre onglets fixes, toujours au même endroit.

| Onglet | Son travail | Ce que montre la maquette |
|---|---|---|
| **Trouver** | ouvrir l'app, et donner des entreprises dès la première minute | le premier jour, trois questions (ce que tu cherches, ce que tu étudies, où) ; ensuite une liste d'entreprises, chacune avec « Garder » |
| **Pistes** | dire quoi faire, puis ranger | « À faire » en tête, trois lignes au plus ; puis les pistes par étape : à contacter, en attente, réponse, terminées |
| **Réseau** | les gens : la classe, les amis, les demandes, donner et recevoir | la liste des conversations, « Mes amis » avec ce qu'ils ouvrent, les deux gestes de l'échange |
| **Moi** | le profil, ce que j'envoie, ma copie, les réglages | une liste courte |

**Une piste est une page**, poussée depuis la liste, avec un retour. Plus
de fenêtre empilée sur une autre. Elle se lit dans cet ordre : la suite
(une phrase, un seul bouton rempli), « Il s'est passé quelque chose ? »
(J'ai écrit · On m'a répondu · C'est non), les gens, l'entreprise,
l'historique, mes notes.

**Trois comportements viennent des explorations**, pas leur forme :

- une entreprise se décide d'un geste, « Garder », et l'app ne montre
  jamais de retard ;
- trois questions le premier jour, et les pistes rangées par étape ;
- un événement se dit en un tap, l'app en tire la suite, et l'historique
  s'écrit seul.

**Aucune donnée ne bouge.** « Garder » crée une piste `todo`. « J'ai
écrit » la passe `active` et écrit l'historique avec les mots que le
moteur compte déjà. « On m'a répondu » donne `reply`. « C'est non »,
« Signé » et l'abandon sont les trois `closedReason`. Si un besoin exige
une clé nouvelle, elle suit `CONTRAT.md` : clé neuve, migration en
lecture, document et tests dans le même geste.

**Le fil conducteur : quatre frictions, une par étape de la recherche.**
Le mainteneur les a toutes nommées : trouver à qui écrire, écrire le
message, tenir sans réponse, s'y mettre. Chaque écran doit en soulager
une. Ajoute les deux bouts que personne n'outille : le départ à zéro
piste, et la suite d'un « oui » (convention, contrat, premier jour).

**Trois visites à servir**, à garder en tête sur chaque écran :

- le passage : il s'est passé quelque chose ailleurs, on vient le dire
  en moins d'une minute, au téléphone ;
- la séance : vingt minutes pour chercher et écrire, plutôt au poste ;
- le retour : deux ou trois semaines sans ouvrir. L'écran propose une
  chose pour reprendre, jamais la liste de ce qui a glissé.

Et un cas qui décide de tout : **le pire jour**. Au troisième mois, avec
vingt-cinq pistes muettes, l'app doit encore donner envie de l'ouvrir.

## 5. Le surprendre

Il a dit ce que « surprendre » veut dire pour lui, et il a coché les
quatre : une façon de s'en servir qu'il n'attendait pas, un visuel fort,
une idée nouvelle, et que ce soit évident.

La forme est classique exprès. La surprise vient donc d'ailleurs : du
soin de chaque écran, d'un moment qu'on a envie de montrer, d'une idée
juste au bon endroit. **Deux règles** :

1. Une surprise soulage une des quatre frictions, ou elle ne passe pas.
2. Elle ne coûte jamais une explication. L'évidence passe avant.

Des pistes, à juger et à dépasser. Aucune n'est une commande :

- **Arriver par quelqu'un.** Un lien ou un QR d'un camarade ouvre une
  app déjà remplie : « Karim te donne 3 pistes ». On n'arrive jamais
  devant un écran vide quand on vient de la part de quelqu'un.
- **Du zéro au premier message en trois minutes.** Trois questions, une
  entreprise gardée, un message prêt à relire.
- **Un message, quatre formes.** Le mail, le mot LinkedIn, ce qu'on dit
  au téléphone en trois lignes, le texte d'un formulaire. Le composeur
  actuel ne connaît que le mail.
- **Le pire jour, et la fin de séance.** Ce que l'app montre quand tout
  se tait, et le moment où elle dit « c'est tout pour aujourd'hui ».
- **La classe est sur Discord.** Une demande ou des pistes qui partent
  vers le salon de la classe, et la réponse qui revient dans l'app. À
  peser contre §10 de `CLAUDE.md` et contre « pas ajouter pour ajouter ».
- **Le poste, un établi.** La liste, la piste et le message côte à côte,
  le clavier d'abord, et coller un lien ou une annonce pour en faire une
  piste.
- **Le matériel 98 comme plaisir.** Un écran signature, par exemple
  celui du « oui », que l'on reconnaît et que l'on a envie de montrer.

Montre-lui deux ou trois surprises en maquette, chacune avec la friction
qu'elle soulage. Laisse-le choisir.

## 6. Le socle, et ce qui est ouvert

`CLAUDE.md` fait autorité, et son §0 dit maintenant la règle de cette
refonte. En bref :

**Ce qui oblige.**

- Les deux questions et les trois surfaces (§0). Une capacité d'une
  surface absente n'apparaît pas.
- Les invariants (§2) : le privé ne sort jamais dans un partage ; rien ne
  s'écrase sans aperçu ni « Annuler » ; un écran, un but ; tout marche
  hors ligne.
- L'architecture (§3) : la logique dans `engine/`, pure et testée ;
  l'interface l'appelle, jamais l'inverse.
- Le matériel (§4) : les jetons de `styles/tokens/`, les trois polices,
  les pixelarticons, le relief net, le bleu marine au châssis et le teal
  au contenu, les deux thèmes.
- Les mots (§7) : un objet, un mot ; le tutoiement ; des mots de tous les
  jours ; ce qui se voit ne se lit pas.
- Les interdits (§10) : aucun serveur, aucun compte, aucune télémétrie.
- La règle des captures (§0) : ce qui se voit se montre avant `main`.

**Ce qui est ouvert.** La navigation, le nom et le contenu des écrans,
le catalogue des motifs (§6), les dessins par appareil (§5), et les
arrangements d'écran des fiches de décision 0011 et 0012.

**Ce qui reste comme leçon, pas comme plan.** `CLAUDE.md` contient des
pièges payés cher, qui tiennent au navigateur et non au dessin : le
clavier d'iOS et la zone visible, le survol qui colle au doigt, le geste
annulé, `min-width:0`, le bouton retour, l'anneau de focus, les cibles de
44 px, le texte à 200 %, le précache atomique. Relis-les avant de coder
un écran. Ne les prends pas pour une mise en page.

**WebKit.** Tu ne peux pas le mesurer ici. Tiens-toi au CSS que tout
moteur rend depuis des années (flex, pas d'empilement de fonctions
récentes), et fais regarder chaque lot au mainteneur sur son iPhone.

## 7. Ce que le moteur sait déjà

Relis `engine/` avant d'inventer. La plupart des écrans ont déjà leur
moteur, testé par `?test`.

| Pour | Le moteur |
|---|---|
| Trouver | `annuaire.js`, `carte.js`, `requete.js`, `lieux.js`, `metiers.js`, `critere.js` |
| « À faire » et le silence | `assist.js` (`dueFollowups`, `silentPistes`, les seuils de 7, 21 et 45 jours, `aDemarrer`) |
| Le retour après une pause | `suivi.js` (`enPause`, `reprendre`) |
| Écrire | `model.js` (modèles, `TROUS`), `prets.js` (brouillons gardés, série), `mailer.js` |
| Le rappel | `agenda.js` |
| Les amis, qui est passé où | `amis.js`, `parcours.js`, `aide.js` |
| Les demandes | `boite.js` |
| Les groupes, les messages | `groupe.js`, `messages.js`, `conversations.js`, `liens.js`, `visage.js` |
| Donner, recevoir, fusionner | `exchange.js`, `merge.js`, `portage.js`, `transport.js` |
| Mes appareils, ma copie | `sync.js`, `moi.js`, `vault.js`, `ring.js`, `storage.js` |

**Ce qui manque, à écrire dans le moteur d'abord.**

- **La suite d'une piste** : une phrase et un geste nommé, les mêmes
  partout. La branche `claude/refonte-arc` porte un `engine/etape.js`
  testé. Tu peux le reprendre s'il sert : c'est du moteur, pas son dessin.
- **La suite d'un « oui »** : même branche, `engine/contrat.js`.
- **Le canal d'un contact** : mail, LinkedIn, appel, site. Aujourd'hui
  seul le mail a son composeur.
- **Le lot du jour dans « Trouver »** si tu gardes l'idée d'une liste
  courte renouvelée.

Des modules dorment depuis le retour à la 6.70 (`CONTRAT.md` §1 dit
lesquels). Réveille ceux qui servent le concept, laisse dormir les autres.

## 8. Les erreurs à ne pas refaire

Chacune a coûté une version entière.

1. **Partir d'une référence au lieu du besoin.** La 9.0 a copié Arc
   Search, un navigateur, pour un outil de suivi.
2. **Coder avant d'avoir comparé.** Une seule direction, construite en
   six jours, refusée à l'arrivée.
3. **Changer la coque sans toucher aux pièces.** Une navigation neuve sur
   les mêmes écrans donne « encore l'ancienne app ».
4. **Ajouter sans retirer.** La 7.x était juste lot par lot et illisible
   en somme. La 9.0 a ajouté 9 800 lignes. Ici, chaque lot dit aussi ce
   qu'il retire.
5. **Une navigation qui bouge.** Quatre onglets, toujours à leur place.
6. **Une règle par cicatrice.** Ne rallonge pas `CLAUDE.md` à chaque
   retouche. À la fin, il se réécrit plus court pour la nouvelle interface.
7. **Croire une suite verte.** Elle dit que c'est conforme, pas que c'est
   voulu. Seul le regard du mainteneur le dit.

## 9. La méthode

**Phase 1 : les maquettes.** Un prototype qui se navigue, au téléphone
et au poste, en clair et en sombre, construit avec les vrais jetons.
Prolonge `design/maquettes/`. Avance par lots, un à la fois :

1. Trouver, et la page d'une entreprise ;
2. Pistes, la page d'une piste, contacter par les quatre canaux ;
3. Réseau : conversations, groupes, amis, demandes, donner et recevoir ;
4. Moi : profil, documents, copie et phrase de secours, appareils,
   protection, réglages ;
5. le premier jour, les états vides, les erreurs, le hors ligne, l'écran
   verrouillé ;
6. le poste, pensé comme un établi, pas comme un téléphone étalé.

Avant le premier lot, dresse **la table de passage** : chaque capacité
marquée `WEB` dans `CLAUDE.md` §0 et dans `docs/surfaces.md`, et l'endroit
où elle vit dans la nouvelle app. Ce qui quitte l'écran se dit, avec sa
raison. Rien ne disparaît en silence.

**Phase 2 : le code.** Seulement quand le mainteneur a validé l'ensemble
des maquettes.

- Sur une branche. La navigation change **une fois**, pour tout le monde,
  le jour où il le décide.
- Le moteur d'abord, avec ses tests. `?test` reste entièrement vert.
- Les scénarios `tests/e2e/` : porte d'abord ceux qui gardent les
  invariants (la fuite du privé, l'aperçu et « Annuler », la durabilité,
  le hors ligne, le verrou, la récupération). Ceux qui gardent un écran
  disparu se réécrivent pour le nouvel écran ou se retirent, dans une
  liste nommée. Aucun ne reste rouge, aucun n'est sauté en silence.
- `sw.js` : `CACHE` et `PRECACHE` à chaque fichier précaché touché.
- Propose au mainteneur un moyen d'essayer la branche sur son iPhone
  avant toute fusion : GitHub Pages ne sert que `main`.

**Travailler avec le mainteneur.**

- Il ne lit pas les longs textes. Huit lignes au plus par message, les
  images d'abord.
- À chaque lot : une page à ouvrir sur son iPhone, et des images côte à
  côte, avant et après.
- Pose tes questions à cocher. Quand il répond « je sais pas », montre
  deux options en image.
- Une étape à la fois. Attends son avis avant la suivante.
- Dis ce que tu as vérifié et ce que tu n'as pas pu vérifier, WebKit en
  premier.

## 10. C'est fini quand

- **Phase 1** : tous les écrans et tous leurs états sont dessinés et se
  naviguent ; la table de passage est complète ; le mainteneur a validé
  chaque lot sur son iPhone.
- **Phase 2** : un camarade qui découvre l'app garde une entreprise et
  prépare son premier message en moins de trois minutes, sans aide ; les
  quatre frictions ont chacune leur écran ; `?test` est vert et les
  invariants sont gardés de bout en bout ; `CLAUDE.md` est réécrit pour
  la nouvelle interface ; le mainteneur a dit oui.

Ce qui juge le tout : des étudiants qui trouvent. Jamais le nombre
d'ouvertures.

## 11. Où regarder

- `design/maquettes/directions/index.html` : la proposition retenue et
  les trois explorations écartées (le paquet, l'assistant, le carnet).
- `design/maquettes/app/index.html` : la maquette de l'app, qui grandit
  lot par lot. `docs/table-de-passage.md` : où va chaque capacité.
- `CLAUDE.md` : le socle, et les leçons.
- `CONTRAT.md` : les clés, les formats, les invariants de fusion.
- `docs/surfaces.md`, `docs/frictions.md` : ce qui est livré, et ce qui
  gêne encore.
- Branche `claude/refonte-arc` : `reports/*.md` (la recherche),
  `engine/etape.js` et `engine/contrat.js` (du moteur à reprendre s'il
  sert). Pas son interface.

## 12. Le journal des lots

Une entrée par lot : ce qui a été montré, ce que le mainteneur en a dit.
Une place reste « proposée » tant qu'il ne l'a pas validée.

### Lot 1 : Trouver, et la page d'une entreprise (16 novembre 2026)

Montré, en attente de son avis. Ce que la maquette propose :

- **Une phrase à trois trous** à la place du formulaire du premier jour :
  « Je suis en … Je cherche … autour de … ». Remplie, elle reste en tête
  de la liste et se rouvre d'un tap. C'est la même phrase qui ira dans Moi.
- **Une ligne = le nom, ce qu'elle fait, où elle est.** « Colle à ta
  formation » ne s'écrit pas sur chaque ligne : la liste commence par
  celles qui collent, et un intertitre dit où ça s'arrête. Seule la raison
  rare s'écrit sur la ligne : un ami qui y est passé.
- **« Garder » sur chaque ligne**, « Pas pour moi » au glissé et au pied
  de la page, avec « Annuler ». Dès qu'on a gardé, le pied propose
  « Continuer avec mes N pistes ».
- **La barre fait tout** : un nom, un métier (« cyber »), un lien collé
  (LinkedIn, une annonce). Rien trouvé : « Garder tel quel ».
- **La carte**, à côté de la liste : toi au centre, des anneaux à 5, 10 et
  15 km, les villes voisines. Sans fond de carte, donc hors ligne.
- **Au poste** : la liste, l'entreprise et la carte côte à côte ; ↑ ↓, G
  pour garder, X pour écarter, « / » pour chercher.

À trancher avec lui : la carte et « coller un lien » sont deux surprises
proposées, il peut n'en garder aucune. Non vérifié : WebKit (iPhone).
Dans le vrai moteur, il restera à écrire la lecture d'un lien collé et le
plan (les coordonnées viennent déjà de l'annuaire).

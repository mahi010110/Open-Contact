# OpenContact — référence produit & UI/UX

**Ce fichier fait autorité.** Il dit ce qu'il faut savoir pour concevoir et
développer n'importe quelle fonctionnalité, quel que soit le compte ou
l'assistant qui travaille. Si une idée n'entre pas dans ces règles : on adapte
l'idée, ou on discute la règle avec le mainteneur. Jamais d'exception
silencieuse.

À lire avec : `CONTRAT.md` (le contrat de données, vérifié par `?test`),
`docs/roadmap.md` (la feuille de route de la surface web), `compagnon/roadmap.md`
(celle de la surface ordinateur, en sommeil), `design/` (le kit « Utilitaire 98 »).
Le « pourquoi » de l'interface actuelle vit dans `docs/refonte-calibrage.md`
(23 décisions) et `docs/finition-calibrage.md`.

---

## 0. Un produit, trois surfaces

OpenContact est **un seul produit**. Il vit — ou vivra — sur trois surfaces
qui partagent les mêmes données et le même vocabulaire.

| Surface | État | Ce qu'elle apporte de plus |
|---|---|---|
| **Le web** (PWA, installable) | **livrée** | tout le quotidien : capturer, agir, écrire, partager avec son groupe, synchroniser ses appareils |
| **L'ordinateur** | **en sommeil** | ce qu'un navigateur ne peut pas garantir : travailler application fermée, parler IMAP/SMTP, faire tourner une IA locale |
| **Le téléphone** (store) | non commencée | la même chose que le web, mieux intégrée à l'appareil (caméra, partage, notifications) |

*(Le dossier `compagnon/` garde son nom technique — c'est la coquille qui
deviendra la surface ordinateur. « Le Compagnon » ne se dit plus à l'écran :
c'est **OpenContact pour ordinateur**.)*

### Les deux questions, avant d'ajouter quoi que ce soit

> **① Est-ce que ça marche pour quelqu'un qui ouvre l'app dans son
> navigateur, sur son téléphone, sans compte et sans rien installer ?**
> Oui → c'est du web, donc de partout.
> Non → c'est une capacité de la **surface ordinateur**, aujourd'hui en
> sommeil. **L'installation est ce qui fait une autre surface** — pas la
> complexité, pas le niveau d'expertise.
>
> **② Est-ce que ça engage le mainteneur dans une démarche permanente**
> (déclaration chez un fournisseur, examen, certificat à renouveler) **?**
> Oui → **reporté**, quelle que soit la surface.

Pas « est-ce que c'est avancé », pas « est-ce que c'est pour les experts » :
est-ce que ça marche **tout de suite, pour tout le monde**.

**La règle qui ne bouge pas : les surfaces partagent des données, jamais des
dépendances.** Le web reste entier si l'ordinateur n'existe pas.

**Corollaire.** Une capacité d'une surface absente **n'apparaît pas** sur les
autres. Ni grisée, ni « bientôt » : absente.

### La répartition

`WEB` = partout, dès aujourd'hui · `PC` = surface ordinateur, en sommeil ·
`⏸` = reporté par choix (voir l'état plus bas).

| | Où |
|---|---|
| Pistes, fiches, suivi, prochaine action, clôture | WEB |
| Capture, anti-doublon, bac « à rattacher » | WEB |
| Partage au groupe (QR, fichier `.oc`, coller, en direct) | WEB |
| Sync entre MES appareils | WEB |
| Écrire un mail (`mailto:`, copier, « Envoyée ✓ ») | WEB |
| Postuler à plusieurs d'affilée, une par une | WEB |
| CV & lettres rangés, modèles d'emails | WEB |
| Sauvegarde / restauration, verrouillage facultatif | WEB |
| « Depuis mes e-mails » : copier la consigne, coller la réponse | WEB |
| Campagnes (séquence, relances, plafond, fenêtre d'envoi) | PC |
| Envoi app fermée, détection des réponses (SMTP/IMAP) | PC |
| Analyse automatique de la boîte mail | PC |
| IA locale (Ollama) ou par abonnement installé | PC |
| Serveur MCP pour un assistant extérieur | PC |
| Brouillon IA par clé navigateur (Claude, Gemini, OpenRouter) | ⏸ |
| Envoi direct OAuth (Gmail, Outlook) | ⏸ |

**« Depuis mes e-mails » n'est pas de l'IA côté OpenContact.** L'app ne rédige
rien et n'appelle personne : elle te donne une consigne à copier, tu la portes
à l'assistant de ton choix — celui de ton téléphone, un onglet ouvert, ce que
tu veux — et tu recolles la réponse. Aucune clé, aucun compte, aucun réseau au
démarrage : c'est du texte qui fait l'aller-retour dans le presse-papier. Elle
passe la question ① sans réserve et **reste de partout**.

**Le brouillon IA par clé navigateur est reporté** *(décision du 2 août 2026,
après un aller-retour)*. Il passait la question ① — aucune installation, c'est
la clé de l'utilisateur qui porte le coût — mais il demande à l'utilisateur de
comprendre ce qu'est une clé d'API avant d'en tirer quoi que ce soit. Reporté
par **choix de périmètre**, donc : le jour où il revient, il revient **ici**,
jamais sur la surface ordinateur.

**L'envoi direct reste reporté** au titre de la question ② : il engage le
mainteneur dans une déclaration chez Google et Microsoft. L'option « je colle
mon propre identifiant » le rendrait pourtant disponible sans aucune démarche
— à rouvrir quand tu voudras.

### État au 2 août 2026

La surface web se recentre sur ses bases avant sa première mise à
disposition. Tout ce qui est marqué `PC` ou `⏸` est **présent dans le code
mais masqué à l'écran**, piloté par les quatre drapeaux de `ui/perimetre.js` :
rien n'est supprimé, aucune clé de stockage ne bouge, aucune donnée existante
n'est perdue (une clé d'IA ou un jeton de messagerie déjà en place reste
lisible, simplement plus affiché). La suppression franche se décidera après la
première bêta.

**Le déclencheur de la surface ordinateur** *(à remplir par le mainteneur)* :
elle ne se rouvre pas sur une envie, mais sur une preuve d'usage — par
exemple « dix étudiants l'utilisent encore un mois après l'avoir installée ».
Tant que le seuil n'est pas atteint, elle dort.

## 1. Le produit en une phrase

OpenContact aide un étudiant IT/cyber à répondre à **« je fais quoi
maintenant ? »** dans sa recherche de stage, d'alternance ou d'emploi, et fait
circuler les bonnes pistes dans son groupe.

C'est un outil de **motivation et d'action**, pas une base de données : chaque
écran doit pousser vers le prochain geste concret — écrire, relancer,
planifier.

- **Utilisateur type** : étudiant BTS SIO / BUT, sur son téléphone, entre deux
  cours. Le mobile est le contexte premier ; l'ordinateur est le poste de
  commandement (tableau, saisie longue).
- **Local-first** : les données vivent sur les appareils et circulent en P2P
  ou par fichier `.oc`. Le fichier `.oc` est LE repli universel — il marche
  hors ligne, réseau bloqué, de la main à la main.

---

## 2. Les invariants (à ne jamais casser)

**① Le privé ne sort jamais dans un partage.**
Statuts, notes, actions, historique, journal = suivi privé. Seule exception :
la sync entre les appareils **de la même personne** (`CONTRAT.md` §5). C'est
le seul invariant qui engage les données **d'autres personnes** que
l'utilisateur — les contacts qu'un camarade lui a partagés, et **mon groupe**
(`oc_group_v1`), qui est plus strict encore : ces coordonnées-là ne sont même
pas celles de l'utilisateur, il ne peut donc pas décider de les faire
circuler. Elles ne sortent dans aucun partage, jamais, sans exception
d'interface. Deux choses seulement traversent en nommant quelqu'un, et
toujours **sur déclaration explicite au moment du geste** : `vecuQui` (un
prénom, §8) et `card` (MON profil, celui de personne d'autre).

**② On n'écrase jamais silencieusement.**
Fusionner = compléter les vides. Une divergence est comptée et montrée,
l'existant est gardé. Toujours un **aperçu avant** (fusion à blanc sur copie)
et un **Annuler ~30 s** (`showUndo`) après tout geste lourd — fusion,
restauration, suppression, sync. C'est l'invariant que les tests vérifient.

**③ Un écran, un but.**
Un écran peut demander plusieurs choses si elles servent le même but (une
piste = l'entreprise *et* le contact). Il n'enchaîne jamais des questions sans
rapport. **Le test : si tu ne peux pas dire le but en un mot, fais-en deux
écrans.**

**④ Ça marche hors ligne.**
Toute fonctionnalité a un chemin sans réseau, ou dégrade proprement (le
géocodage et le P2P échouent en silence utile : message court + repli
proposé). Corollaire technique : **rien ne se charge depuis le réseau au
démarrage** — les bibliothèques sont vendorisées dans `assets/vendor/`, avec
leur licence.

---

## 3. Architecture — la règle de sens unique

- **`engine/`** = le moteur : modèle, stockage, fusions, chiffrement, score,
  filtres. **Fonctions pures, aucun accès au DOM ni à l'écran.** Toute logique
  métier testable vit ici, couverte par `tests.js` (`?test` doit rester
  100 % vert).
- **`ui/`** = les écrans, un fichier par écran ou feuille. L'UI appelle le
  moteur, jamais l'inverse.
- **`CONTRAT.md`** = clés de stockage, formats `.oc`/OCQ, schémas, invariants
  de fusion. **On ne renomme jamais une clé** ; un format qui évolue = une clé
  nouvelle + migration en lecture. Toute évolution se fait dans le document
  ET dans `tests.js` dans le même geste.
- **`sw.js`** : chaque livraison qui touche un fichier précaché incrémente
  `CACHE` (`oc-vN`) et met à jour `PRECACHE`.

C'est cette séparation qui permet à la surface ordinateur d'exécuter le même
moteur que le web, sans le réécrire. Elle reste, quoi qu'il arrive aux
surfaces.

> **Outillage.** Aujourd'hui : JavaScript pur, modules ES, aucune étape de
> build. C'est **l'état actuel, plus une règle** — l'interdiction de framework
> et de bundler a été levée le 31 juillet 2026.

---

## 4. Le design « Utilitaire 98 »

Un utilitaire de bureau des années 98 remis au goût du jour : honnête, dense,
net. Sources uniques : `styles/tokens/` et le kit `design/`.

- **Couleurs** : encre sur papier, accent teal `#0B7268`, sélection navy.
  Toujours par les tokens (`var(--…)`), jamais de couleur en dur.
- **Reliefs** : bevels francs, ombres dures, coins droits (`--bevel-*`,
  `--shadow-*`). L'identité est **nette, sans flou** — un dégradé, une ombre
  floue, un arrondi marqué la cassent. Ça se discute avec le mainteneur, ça ne
  se glisse pas dans un écran.
- **Trame dither** : `--dither` porte la position ET la taille, il n'est donc
  valable que derrière la propriété raccourcie `background`. Posé sur
  `background-image`, il est **rejeté en silence** — la trame ne s'affiche pas
  et rien ne le signale. Quand un fond de couleur doit rester dessous, prendre
  `--dither-img` + `--dither-size`. (Quatre endroits de l'app ont vécu
  longtemps sans leur trame à cause de ça.)
- **Typo** : Silkscreen (titres pixel), IBM Plex Mono (données, dates,
  compteurs), Public Sans (texte courant). Pas d'autre police.
  **L'échelle (`--text-*`) est en `rem`**, donc relative à la police par
  défaut du navigateur : quelqu'un qui l'a agrandie pour y voir est
  suivi. Les noms gardent leur chiffre — `--text-14` rend 14 px quand la
  racine vaut 16, le cas de presque tout le monde. Une taille en px en
  dur ignore ce réglage : toute l'app le faisait, et une racine à 24 px
  ne changeait rien. **Exception : `--pixel-*` reste en px** — une police
  pixel n'existe qu'à ses tailles natives, l'étirer la rend floue et
  casse l'identité « nette, sans flou » plus qu'un titre qui ne grandit
  pas. Corollaire à vérifier sur tout écran neuf : ce qui rentre à taille
  normale doit tenir à taille agrandie, et **un libellé trop long s'élide
  — il ne se coupe jamais aux deux bouts** (centré dans un
  `overflow:hidden`, « Aujourd'hui » rendait « ujourd'hu »).
- **Icônes** : pixelarticons via `ic('nom', 'ic-14')`. Pas d'emoji dans
  l'interface, pas d'autre pack.
- **Motion** : les **objets** restent « 98 » — nets, instantanés, `steps()`
  pour le feedback. Seul le **déplacement entre états** est doux (feuille qui
  monte, fenêtre qui se pose, liste qui se réorganise) : court, `ease-out`,
  senti sans être vu. `transform`/`opacity` par défaut, transitions CSS,
  `prefers-reduced-motion` coupe tout. **Une exception, nommée** : un contrôle
  qui *change de forme pour faire de la place* à un autre (le cadenas du mot
  de passe, §6) s'anime sur `flex-grow` — une largeur en `auto` ne se
  transitionne pas, et `scaleX` écraserait le texte. Elle reste bornée à ça :
  deux enfants d'une même ligne qui échangent leur place, jamais une page.

  **Le mouvement répond à une question, jamais à un manque de vie.** Il est
  *pré-attentif* : l'œil y va avant la conscience. C'est donc le signal le
  plus fort de l'interface et le plus cher — le même piège que la pastille
  sur chaque ligne (§6, règle 1), un cran plus haut. « Plus d'animation »
  n'est pas un objectif ; **trois questions** le sont, et rien d'autre ne
  bouge :

  ① **D'où ça vient ?** — l'entrée. ② **Où est-ce parti ?** — la sortie.
  ③ **Qu'est-ce qui a changé pendant que je ne regardais pas ?**

  La ③ est celle qu'on oublie, et c'est la plus utile ici : un changement
  instantané n'est pas « moins joli », il n'est **pas vu** (cécité au
  changement). Pour un outil dont le métier est de pousser à l'action, une
  action qu'on ne voit pas aboutir ne récompense rien — d'où le lavis
  `vu-change` (§6), une fois, sur la seule ligne concernée, et seulement si
  elle est à l'écran.

  **On n'entre pas comme on sort.** À l'entrée il y a quelque chose à lire :
  on décélère (`--ease-out`, `--dur-3`). À la sortie la décision est déjà
  prise : on accélère et on écourte (`--ease-in`, `--dur-out` = 70 % de
  l'entrée). Et une sortie part **dans le sens du geste qui la cause** — une
  feuille poussée au pouce s'en va vers le bas : un mouvement n'est perçu
  comme *causé* que s'il part sans délai et dans la même direction.

  Ça se vérifie : `e2e-mouvement.mjs` fige le verdict attendu de chaque
  geste — `glisse` **ou `net`**. Le second sens est le vrai garde-fou : il
  échoue si le thème, un bouton enfoncé ou tout autre objet se met à fondre.
  C'est ce qui empêche l'animation de proliférer un « juste un petit
  fondu » à la fois.
- **Thème sombre obligatoire** : tout élément neuf se vérifie dans les deux
  thèmes.

---

## 5. Adaptatif, PAS responsive

Ce ne sont pas des pages qui se redimensionnent : ce sont **deux interfaces
pensées par contexte**, qui partagent les données et le style.

**Deux questions, pas une.** La **largeur** dit le *dessin* — combien de
colonnes tiennent, où va la navigation. Le **pointeur** dit la *main* —
quelle taille doit faire une cible. Ce sont deux choses différentes, et
les confondre coûte cher : une tablette tactile en paysage fait 1024 à
1366 px, elle recevait donc l'ergonomie souris. Mesuré : 10 cibles sur
11 sous 44 px, la plus petite à 30 px, pour un doigt.

- **Le dessin — breakpoint unique : 901 px** (`matchMedia('(min-width:901px)')`,
  avec re-rendu au franchissement — voir `ui/pistes.js`).
- **La main — `(pointer:fine)`** : une souris, un trackpad ou un stylet la
  valident (iPad + trackpad compris), un doigt non. `--ctl` et
  `--input-fs` ne descendent à l'ergonomie souris **qu'avec les deux**
  (`@media (min-width:901px) and (pointer:fine)`). Un `--input-fs` sous
  16 px rouvre le zoom automatique d'iOS à la mise au point d'un champ.
- **Mobile (< 901 px)** : navigation en bas, feuilles en bas d'écran,
  gestes tactiles. Une main, un pouce.
- **Desktop (≥ 901 px)** : navigation en haut + barre de statut, fenêtres
  centrées, layouts en colonnes, raccourcis clavier (« / » = recherche,
  « n » = nouvelle piste — et une touche s'annonce DANS ce qu'elle
  commande, jamais dans un écran d'aide).
- **Au doigt, 44 px** (`--control-h-touch`, plancher d'Apple et de WCAG
  2.5.5 AAA) ; **à la souris, 32 px** (`--control-h`, bien au-dessus du
  plancher WCAG 2.5.8 AA de 24 px). Toute cible neuve part de `--ctl` :
  une hauteur en dur se retrouve à 30 px sous un doigt, ce qui est
  exactement ce qui était arrivé à la navigation haute.
- **La règle, et son seuil** : par défaut, **un seul dessin** qui s'adapte.
  On n'en fait deux que si l'**usage** diffère vraiment — pas la taille.
  Aujourd'hui c'est le cas sur trois choses : Mes pistes (liste au pouce /
  tableau à l'écran), la capture (trois champs / formulaire complet), les
  feuilles (bas d'écran / fenêtre centrée). Partout ailleurs, un dessin
  suffit. Quand le comportement doit différer, brancher sur `matchMedia`, pas
  sur du CSS seul.

**La zone du pouce** (mobile, mesurée : « facile » = les 40 % du bas de
l'écran) — l'ordre de lecture descend, la main monte, et c'est le bas qui
gagne pour ce qui se TAPE :

1. **Ce qui compte se tape en bas.** L'action principale d'un écran vit
   au-dessus de la barre de navigation, pas en tête : les feuilles le font
   déjà (`setFoot` place le bouton à ~96 % de la hauteur), les pages
   doivent le faire aussi. Un verbe posé en tête d'écran vit à ~17 % de la
   hauteur — le point le plus dur à atteindre d'une main.
2. **Une action se pose TOUJOURS au même endroit**, quel que soit le
   remplissage : c'est ce qui fait la mémoire du geste. Le motif est le
   **panneau** — le contenu variable prend un cadre qui tient sa région
   (`flex:1` + `overflow:auto`, la vue en `height:100%`), les lignes s'y
   remplissent par le haut, la place restante lui appartient. Sans lui, une
   liste courte ouvre un trou et une liste longue chasse l'action hors de
   l'écran. Le cadre est aussi ce qui rend le vide présentable : une place
   qui a un propriétaire n'est plus un manque.
3. **Deux gestes aux conséquences différentes ne partagent pas une arête.**
   ≥ 8 px entre eux — la visée d'un pouce dérape de plusieurs pixels, et
   ouvrir une fiche n'est pas la clore. Ce qui compte est la
   **conséquence d'un rata­ge**, pas la proximité : là où se tromper coûte
   un tap pour revenir, les cibles ont le droit de se toucher. C'est le
   cas des **lignes de liste** (réglages, documents — le trait pointillé
   dit la frontière) et de la **barre de navigation** (onglets jointifs à
   2-4 px : tout tab bar du monde fait ça, et les écarter volerait de la
   largeur à des cibles qu'on tape cent fois par jour). Appliquer la règle
   à la lettre sur ces deux cas DÉGRADE l'interface.

Ça se mesure : position du bouton primaire en % de la hauteur, et
`elementFromPoint` à ±6 px du bord de chaque cible pour vérifier qu'elle ne
touche qu'elle-même. Vérifier en 360×640 (le petit téléphone décide) autant
qu'en 390×844. L'instrument signale toute adjacence : c'est à la lecture de
trancher si le voisinage coûte quelque chose.

---

## 6. Catalogue des motifs — à réutiliser AVANT d'inventer

Tout vit dans `ui/dom.js` sauf mention. Un besoin nouveau se résout d'abord
avec un motif existant.

| Besoin | Motif |
|---|---|
| Poser une question, éditer | `openSheet` (empilable, focus-trap, Échap, glisser-fermer au doigt, barre de titre qui se glisse à la souris, `setFoot` REMPLACE les boutons, `guard` = garde-fou avant fermeture) |
| Trier une liste | `ui/sort.js` — critère + bascule ↑↓ ; re-tap du critère actif = retour au défaut de l'écran |
| Filtrer + trier ensemble | `ui/affiner.js` — une feuille, un compte dans le bouton (`Affiner ③`) |
| Supprimer au geste | `bindDeleteGesture(node, onDelete)` — glisser (mobile) / poubelle au survol (desktop), doublé d'un `showUndo` |
| Choisir parmi 2-5 options | `pick-list` / `.pick` |
| Choisir une date | chips « Demain / +3 j / +7 j / Lundi » + date précise validée par OK (jamais de fermeture sur `change` seul — roue iOS) |
| Confirmer un geste risqué | `confirmSheet` (danger = `btn-danger`). **Une porte se décide** : elle ne se justifie que si elle montre ce qu'on ne peut PAS deviner (« ce fichier contient 12 pistes, tu en as 3 »). Une question dont le message dit qu'il n'y a rien à perdre ne protège personne |
| Geste lourd réversible | `showUndo(msg, onUndo)` — barre Annuler ~30 s. **Il remplace la confirmation**, il ne s'y ajoute pas : demander ET offrir d'annuler, c'est payer deux fois |
| Demander un mot de passe **facultatif** | `lockRowHTML` + `bindLockRow` — au repos un bouton compact « Chiffrer » au bout de la ligne d'action ; tapé, il **s'étire en champ sur place** et l'action voisine se serre. **La ligne ne change pas de hauteur** : rien ne pousse ce qui est dessous. `value()` rend `''` serrure fermée, donc l'appelant n'a jamais à connaître l'état ; refermer **oublie** ce qui était tapé |
| Retour discret | `toast()` — court, ponctuel, jamais deux phrases. Un tiret cadratin au maximum, et ce qui le suit doit être un **geste** (« — passe par le fichier »), jamais un rassurement (« — tout est revenu comme avant ») |
| Marquer partagé vs privé | `tag-share` / `tag-priv` |
| Montrer qu'une ligne **vient de changer** | `montrerChange(id)` — un lavis d'accent, une fois, ~900 ms, sur la seule ligne concernée et seulement si elle est à l'écran. Ce n'est **pas** le langage d'urgence : `mark-*` reste à ce qui réclame une action |
| Dire qu'un état **réclame quelque chose** | `.mark` + un cran : `mark-late` · `mark-now` · `mark-soon` · `mark-far`. **Un seul langage d'urgence dans toute l'app**, échelle monotone, et **ce qui ne réclame rien n'affiche rien** — c'est le vide en face qui fait ressortir le reste. Un cadre entier peut prendre le bord ambre (`.fset.fs-alert`) quand son état peut tout coûter |
| Chercher | `filterCompanies({q})` / `filterOrphans` — les accents se plient dans les deux sens et **chaque mot se cherche pour lui-même** (tous présents, ordre libre). « / » ouvre le champ, Échap le vide |
| Expliquer un résultat | `searchHint(c, q, {skip})` → `.ri-hit` + `<mark>`. Le moteur rend l'extrait ET les positions, jamais du HTML. La ligne ne parle **que** si ce qu'elle affiche déjà ne répond pas — l'appelant dit ce qu'il montre (`skip`), et rien ne se dit deux fois |
| Proposer un filtre | `.fl-chip` + son **compte**. Ne jamais offrir une valeur absente des données. Liste fermée (statuts) : la puce reste, éteinte. Liste ouverte (domaines) : elle disparaît, sauf si le filtre est actif |
| Note contextuelle | `<p class="hint">` (+ `warn` si alerte) |
| Multi-sélection | `.pk` avec icônes checkbox — **jamais pour supprimer**. L'emphase suit le DÉFAUT : parti de rien coché, l'aplat marque le choix ; parti de tout coché, `pk-inverse` marque l'**écart**. **Le défaut se juge feuille par feuille** — « → qui » s'ouvre tout coché pour *donner*, avec une seule personne pour *écrire* |
| Choisir qui part / qui est visé | `ui/qui.js` — la ligne « → qui » et sa sous-feuille à cocher |
| Supprimer un élément | glisser (mobile) / poubelle au survol (desktop) + `showUndo`, sans confirmation |
| Fermer une barre transitoire | balayer (mobile) / `✕` (desktop) |
| Contenu secondaire | `<details class="pcard pcard-details">` replié |
| Une page = un objet et ses réglages | en-tête `.obj` (icône en haut à gauche + nom) puis des cadres `.fset`. **Le cadre est lourd : deux par écran au maximum, jamais s'il contiendrait tout l'écran.** Ailleurs, `pcard` reste la règle |
| Recevoir des données | TOUJOURS l'aperçu avant fusion (`mergePreviewInto`) — mêmes règles quel que soit le canal |

**Le silence n'est pas une dette, c'est une décision.** Une piste engagée
puis laissée sans suite disparaissait : rien sur « Aujourd'hui », et dans
« Mes pistes » le même « à planifier » qu'elle dorme depuis cinq jours ou
depuis quatre-vingt-dix. L'app tenait la date et la jetait. Elle la montre
maintenant, avec **le langage d'urgence de l'app** (`mark-*`), et trois
règles qui l'empêchent de devenir une pile de reproches — le défaut qui
fait abandonner les outils de suivi :

- **Seules les pistes ENGAGÉES comptent.** Une piste jamais contactée
  (`todo`) n'est pas en train de filer entre les doigts ; « Par où
  commencer » s'en occupe. Les mélanger noierait le signal.
- **Rien avant sept jours.** Les seuils viennent des données de relance —
  5 à 7 jours ouvrés avant la première, une à deux semaines avant la
  seconde — pas du goût : `SILENCE_RELANCE` 7 · `SILENCE_DERNIERE` 21 ·
  `SILENCE_TROP_TARD` 45 (`engine/assist.js`).
- **Chaque ligne a une SORTIE.** Passé le dernier seuil, la littérature ne
  dit plus « relance encore », elle dit « passe à autre chose » : le geste
  proposé devient **Clore**. Une pile dont chaque ligne peut sortir ne
  grandit pas sans fin.

**Une seule tranche de suggestion à la fois**, et le silence prime sur le
démarrage : ranimer une piste déjà engagée vaut mieux qu'en démarrer une
froide. Elle **suit** le travail planifié, jamais l'inverse — ce qui est
engagé passe avant ce qui est suggéré. Et « Tout est à jour » ne s'affiche
plus quand des pistes se taisent : c'était un mensonge.

**Choisir à la place de l'utilisateur est le service rendu.** Vingt-quatre
pistes non planifiées, c'est vingt-quatre décisions avant le premier geste —
et le premier geste n'arrive jamais. En proposer **trois** en fait un choix.
Le tri doit avoir une raison, et cette raison doit se **voir sur la ligne** :
un coup de pouce dont on ne comprend pas l'origine ne pousse personne. Ici,
d'abord ce à quoi on peut écrire tout de suite (une adresse), puis les fiches
les mieux remplies — et la sous-ligne affiche ville, nombre de contacts,
secteur, dans cet ordre : au pouce elle s'élide par la fin, et c'est le
secteur qu'on peut perdre, jamais le nombre de personnes joignables.

**Règles d'écran :** un bouton primaire max par vue ; une suppression unitaire
réversible se fait au geste + `showUndo`, sans confirmation ; seules les
actions lourdes ou irréversibles gardent `confirmSheet` ; l'état vide de
chaque écran enseigne le produit, jamais un simple « aucune donnée ».

**Une feuille ne s'étire pas — elle se déplace.** Mesuré sur les seize
feuilles de l'app, en 390 × 844 et en 1280 × 800 : chacune est soit au
plafond (92 dvh, plus rien à gagner), soit assez courte pour tout montrer
(l'étirer n'ajouterait que du vide). **Aucune n'est les deux** — le
dimensionnement automatique fait déjà le travail, et un cran « pleine
hauteur » serait un geste sans effet. Élargir au poste ne sauve rien non
plus : la fiche passe de 1273 px cachés à 903 px en doublant la largeur.
Ce qui manquait vraiment, c'est de voir **derrière** : au poste, la barre
de titre se prend à la souris — l'idiome « 98 » au complet — bornée pour
que la fenêtre reste toujours rattrapable (80 px visibles sur les côtés,
44 px de barre en bas, jamais au-dessus du bord haut). La place vaut pour
toutes les feuilles et dure la session : c'est un réglage de bureau, rien
n'est écrit. Une **confirmation** en est exclue — une question n'est pas
une fenêtre qu'on range. Au doigt, la même barre sert déjà à refermer
d'un glissement : rien n'y change.

**Trois règles de guidage du regard**, tirées d'un audit mesuré (test du flou
+ saillance calculée sur les pixels rendus) :

1. **L'encre va à ce qui change, jamais à ce qui est permanent.** Une pastille
   sur *chaque* ligne n'est pas un signal, c'est un papier peint. Ce qui ne
   réclame rien n'affiche rien.
2. **Un écran montre les affaires de l'utilisateur, pas des portes.** Un écran
   incapable d'afficher une donnée réelle est un menu : il appartient à la
   navigation, pas à un onglet. Aucune mise en forme ne sauve un écran qui n'a
   rien à dire. **Corollaire, mesuré** : un écran qui PEUT montrer une donnée
   et ne le fait pas tombe sous la même règle. « Aujourd'hui » répondait
   « Rien de planifié » avec zéro ligne et deux portes alors que vingt-quatre
   pistes venaient d'arriver — l'état exact au sortir du geste phare du
   produit, recevoir le fichier d'un camarade. Il montre désormais **trois**
   pistes et leurs gestes (`e2e-commencer.mjs`).
3. **`page-inner` seul (640 px) sur desktop = écran non conçu.** Flouter la
   capture : si la structure disparaît, ou si la zone la plus contrastée est
   du vide, c'est raté. **Une exception, nommée** : un ÉTAT transitoire d'un
   écran par ailleurs dessiné pour le poste. « Par où commencer » est une
   colonne de trois lignes ; l'étirer sur 1660 px envoie ses boutons à
   l'autre bout de l'écran (mesuré) alors que la pleine largeur appartient
   au tableau à trois colonnes, qui revient dès qu'il y a du travail
   planifié. La règle vise un écran qui ignore la largeur ; pas un écran
   qui la rend le temps d'un démarrage à froid.

> **Ce que les instruments ne savent pas faire.** Ils tranchent la mise en
> page (vide, dominance, largeur) ; ils sont **aveugles à l'emphase** — les
> moyennes sont pondérées par la surface, la luminance ignore la teinte. Un
> chiffre peut donc récompenser la suppression de la seule couleur qui devait
> rester. La mesure propose, l'œil tranche.

**Trois règles de sobriété**, à vérifier sur tout écran neuf ou retouché :

1. **Un bouton ne répète jamais le titre de sa carte.** Le titre dit de quoi
   il s'agit, le bouton dit le geste — un verbe (« Mon profil » → « Remplir »).
2. **Un `<span>` sous un bouton reste** s'il porte un **état ou une donnée**
   (date, compte, nom de fichier), ou s'il est le **seul** départage entre
   deux frères. Il **part** s'il explique, encourage ou répète.
3. **Une explication ne se déguise jamais en bouton.** Bordure et fond
   surélevé appartiennent à ce qui se tape ; une phrase se pose en texte.

Sur un écran qui décrit **un objet** : le nom et son icône en haut à gauche ;
les groupes rangés par **usage**, pas par type ; le bouton qui ne sert qu'à un
groupe reste dans ce groupe ; les réglages avancés ferment la page.

---

## 7. Les textes

Français, tutoiement, phrases courtes, concret. On dit « pistes », « groupe »,
« fiche », « suivi » — jamais « CRM », « lead », ni autre jargon à l'écran.

**Un objet, UN mot** — dans toute l'app, y compris les dialogues qu'un écran
ouvre et le nom des fichiers qu'il produit. Deux noms pour la même chose
obligent à apprendre deux fois, et le glissement se fait toujours dans les
feuilles secondaires, jamais dans le titre.

| l'objet | le mot | jamais |
|---|---|---|
| une entreprise suivie | **piste** (« entreprise » = le champ, pas l'objet) | boîte, société |
| une personne chez elle | **contact** (« destinataire » reste dans le composeur : c'est le mot du courrier) | personne — sauf le pronom (« personne pour l'instant ») |
| l'écran d'une piste | **fiche** | détail |
| le fichier de tout mon suivi | **copie** (`opencontact-copie-*.oc`) | sauvegarde, export, archive |
| les camarades avec qui on partage | **groupe** | promo, camarades, amis |
| ce que je donne de moi à mon groupe | **mon profil** (partiel, comme la fiche d'une piste) | carte, carte de visite |

Ça se vérifie mécaniquement — extraire les chaînes de `ui/*.js` **et de
`index.html`** (la coque compte aussi, c'est là que « sauvegarde » avait
survécu), puis regrouper les synonymes. Un compte ne tranche pas seul : il
faut relire la phrase. « Copie impossible ici » parle du presse-papier.

**Le plus court qui reste compris.** L'ordre est bien : rien, une icône, un
mot, une phrase — mais **la compréhension passe avant la brièveté**. Si un mot
est nécessaire pour comprendre, le mot gagne sur l'icône : une icône qu'on ne
devine pas coûte plus cher qu'un mot. Une phrase entière seulement quand la
sécurité l'exige, et au moment du geste.

Là où une feuille a sa croix, pas de bouton « Annuler » : la croix annule.
Seule exception, « Retour ». La barre « Annuler » ~30 s reste — là, annuler
n'est pas un renoncement, c'est l'action.

**Un tiret cadratin par phrase au maximum, et jamais pour remplacer un point.**
Deux phrases courtes se lisent mieux qu'une phrase à charnière.

---

## 8. Partage & sync — deux mondes à ne pas mélanger

**Communautaire (le groupe)** : `sharePayload` → vue communautaire, jamais le
privé, fusion `merge.js` qui n'écrase rien, aperçu avant. Canaux : partage en
groupe (P2P), QR, fichier `.oc`, coller.

**Mes appareils (la même personne)** : `engine/sync.js`, tout circule (privé
inclus), le plus récent gagne (`updatedAt`), suppressions par tombstones.
Canal : P2P avec phrase de liaison personnelle, hashée pour nommer la salle,
données chiffrées de pair à pair. Le lien est **persistant** (`ui/synclive.js`).

Transport : Trystero (vendorisé) via relais Nostr publics, personnalisables
(`oc_relays_v1`).

**Ce qui vaut d'être partagé n'est pas l'adresse, c'est le lien humain.**
Mesuré : une candidature à froid décroche un entretien dans ~3 % des cas,
une candidature portée par quelqu'un qui est dedans dans ~40 % — un rapport
de 40 pour 1. Une promo entière a déjà fait des stages : ce réseau existe,
et le partage, anonyme par construction, n'en transportait rien. D'où
`vecu` / `vecuQui` (`CONTRAT.md` §3) : le **seul** endroit où un partage
cesse d'être anonyme, et seulement **sur déclaration explicite** — pas de
déclaration, pas de prénom, exactement comme avant. La règle qui en sort et
qui vaut pour la suite : **une information qui ne mène à personne ne mène à
rien.** « Quelqu'un y a fait son stage » ne se joue pas ; « Léa y a fait son
stage » se joue. Le prénom n'est pas un détail d'affichage, c'est ce qui
transforme la donnée en geste. Corollaire de garde : tout champ neuf qui
voyage se teste d'abord sur l'invariant ① — `e2e-vecu.mjs` vérifie la fuite
AVANT la fonctionnalité, et ses cinq mutations le prouvent.

**Et un prénom ne mène quelque part que s'il désigne quelqu'un.** D'où
**mon groupe** (`oc_group_v1`, `ui/groupe.js`) : on échange son profil par QR
ou par fichier, et `vecuQui` se résout alors en une personne — le bandeau de
la fiche devient tapable et donne le message tout prêt. Trois règles en
sortent, et elles valent au-delà de cet écran :

1. **Une liste de gens n'est pas un carnet d'adresses.** Chaque ligne porte
   ce qui a RÉELLEMENT circulé avec la personne (`bilanMembre`) et mène à un
   geste. Une liste triée par ordre alphabétique aurait répondu « qui je
   connais » ; triée par ce qu'on a reçu, elle répond **« qui m'aide »**.
2. **On ne devine jamais entre deux homonymes.** Deux « Léa » dans le groupe
   et `trouverMembre` rend `null` : le bandeau redevient du texte. Écrire au
   mauvais camarade en croyant l'app coûte plus cher qu'une porte fermée.
   Règle générale : **une résolution ambiguë n'en est pas une.**
3. **Quand un canal est mesurablement meilleur, l'app le dit — au lieu de
   pousser vers le sien.** Une demande de vive voix aboutit **34 fois** plus
   souvent que par e-mail (Roghanizad & Bohns, 2017), et celui qui écrit ne
   sent aucune différence. « Demander à Léa » propose donc d'aller la voir, et
   garde le message pour ceux qui ne sont pas dans la même pièce. C'est aussi
   la seule phrase d'explication qui ait fait monter le plafond de
   `e2e-sobriete.mjs` (116 → 126) : le critère y passe de « prévient d'une
   perte » à « prévient d'une perte **ou d'une erreur qu'on ne peut pas voir
   venir** ».

**Ce que ce lot a appris sur les gardes.** Une première version de
`e2e-groupe.mjs` vérifiait l'invariant en appelant les fonctions du moteur
avec un groupe fabriqué sur place — elle prouvait seulement qu'elles
n'inventent pas ce qu'on ne leur donne pas. Une mutation posée dans un
ÉCRAN (là où `S.groupe` est réellement à portée) est passée sans la faire
broncher. **Un contrôle de fuite doit partir de l'état RÉEL de l'app et lire
les octets qui sortent par le vrai bouton**, jamais du moteur appelé à la
main. Depuis, `e2e-groupe.mjs` remplit `S.groupe`, tape « Donner → Copier »,
et grep le presse-papier.

---

## 9. Livrer — la checklist

1. Le moteur d'abord (fonctions pures + tests), l'UI ensuite.
2. **Vérifier en lançant réellement** : serveur statique + Playwright,
   390×844 ET 1280×800, thème clair ET sombre, zéro erreur console. On ne
   livre pas sur la foi d'une relecture.
3. `?test` : tous les auto-tests verts, y compris les nouveaux.
4. `CONTRAT.md` à jour si une clé, un format ou un invariant a bougé.
5. `sw.js` : bump `oc-vN` + `PRECACHE` si un fichier précaché a changé.
6. Textes relus, thème sombre vérifié, cibles tactiles ≥ 44 px sur mobile.
7. **Sobriété** : `e2e-sobriete.mjs` vert. Une couche de plus (toast long,
   confirmation, phrase d'explication) ne passe qu'en montant un plafond
   **dans ce fichier**, exprès — c'est ce qui empêche une passe de
   nettoyage de se défaire toute seule, un « juste un toast » à la fois.
8. Commits en français, descriptifs, focalisés.

---

## 10. Les interdits

- **Aucun serveur OpenContact, aucun compte OpenContact, aucune télémétrie.**
  Les services tiers que l'utilisateur branche lui-même (sa messagerie, son
  IA) sont les siens, pas les nôtres.
- Renommer ou supprimer une clé de stockage, casser un format `.oc` existant.
- Faire sortir du privé dans un partage communautaire.
- Écraser des données sans aperçu et sans annulation.

---

## Annexe — les règles abandonnées, et pourquoi

Une règle supprimée laisse une trace de trois lignes. Sans ça, le même débat
se rouvre — c'est ce qui est arrivé au panneau latéral, retiré puis remis puis
retiré.

| Règle | Sort | Pourquoi |
|---|---|---|
| « Une décision à la fois » | **remplacée** par « un écran, un but » | Elle interdisait tout formulaire, et le code la contredisait déjà (la capture sur ordinateur affiche un formulaire complet) |
| « Toute donnée saisie est précieuse » | **supprimée** | Recouvrait l'invariant ② sans rien ajouter. Le bac « contacts à rattacher » reste, comme fonctionnalité |
| « Pas de framework, pas de bundler, pas d'étape de build » | **supprimée** | Choix technique du mainteneur, qui bridait sans protéger personne. La partie utile — rien ne se charge du réseau au démarrage — est descendue dans l'invariant ④ |
| « Aucun serveur, aucun compte » (formulation absolue) | **reformulée** | La version absolue obligeait la spec à plaider que Gmail et OpenAI « ne sont pas un backend ». La nouvelle dit ce qu'on veut vraiment : rien **d'OpenContact** ne tourne ailleurs |
| « Ne jamais dégrader l'existant pour caser une nouveauté » | **supprimée** | Une humeur, pas une règle : aucun test ne la vérifie, on peut l'invoquer contre n'importe quoi. Les tests et `CONTRAT.md` protègent réellement |
| « Rien de smooth » (motion) | **remplacée** (juillet 2026) | Le mouvement doux est autorisé sur le **déplacement entre états**, pas sur les objets — voir §4 |
| « Interdits : dégradés, ombres floues, arrondis, glassmorphism » | **assouplie** | Une liste d'interdits absolus légifère contre un futur qu'on ne connaît pas. L'identité « nette, sans flou » est dite positivement : un effet qui l'adoucit se **discute**, il ne se glisse pas |
| « Concevoir deux réponses » (adaptatif) | **précisée** | Se lisait comme « deux dessins par écran », soit le double de travail. Le défaut est **un seul dessin** ; deux seulement quand l'usage diffère — trois écrans aujourd'hui |
| « rien > icône > mot > phrase » | **précisée** | La brièveté poussée à bout rend cryptique. La compréhension passe devant : une icône qu'on ne devine pas coûte plus cher qu'un mot |

*Tranché par l'assistant, à valider :* la reformulation de l'interdit serveur,
la suppression de « ne pas dégrader l'existant », et le contenu détaillé des
§4 à §9 (design, adaptatif, motifs, textes, checklist), gardés depuis la
version précédente et resserrés.

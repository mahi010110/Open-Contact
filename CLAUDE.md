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
| **Le web** (PWA, installable) | **livrée** | tout le quotidien : capturer, agir, écrire, partager avec la promo, synchroniser ses appareils |
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
| Partage promo (QR, fichier `.oc`, coller, groupe) | WEB |
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
circuler les bonnes pistes dans sa promo.

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
l'utilisateur — les contacts qu'un camarade lui a partagés.

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
- **Icônes** : pixelarticons via `ic('nom', 'ic-14')`. Pas d'emoji dans
  l'interface, pas d'autre pack.
- **Motion** : les **objets** restent « 98 » — nets, instantanés, `steps()`
  pour le feedback. Seul le **déplacement entre états** est doux (feuille qui
  monte, fenêtre qui se pose, liste qui se réorganise) : court, `ease-out`,
  senti sans être vu. `transform`/`opacity` uniquement, transitions CSS,
  `prefers-reduced-motion` coupe tout.
- **Thème sombre obligatoire** : tout élément neuf se vérifie dans les deux
  thèmes.

---

## 5. Adaptatif, PAS responsive

Ce ne sont pas des pages qui se redimensionnent : ce sont **deux interfaces
pensées par contexte**, qui partagent les données et le style.

- **Breakpoint unique : 901 px** (`matchMedia('(min-width:901px)')`, avec
  re-rendu au franchissement — voir `ui/pistes.js`).
- **Mobile (< 901 px)** : navigation en bas, contrôles 44 px (`--ctl`),
  feuilles en bas d'écran, gestes tactiles. Une main, un pouce.
- **Desktop (≥ 901 px)** : navigation en haut + barre de statut, contrôles
  32 px, fenêtres centrées, layouts en colonnes, raccourcis clavier
  (« / » = recherche).
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
| Poser une question, éditer | `openSheet` (empilable, focus-trap, Échap, glisser-fermer, `setFoot` REMPLACE les boutons, `guard` = garde-fou avant fermeture) |
| Trier une liste | `ui/sort.js` — critère + bascule ↑↓ ; re-tap du critère actif = retour au défaut de l'écran |
| Filtrer + trier ensemble | `ui/affiner.js` — une feuille, un compte dans le bouton (`Affiner ③`) |
| Supprimer au geste | `bindDeleteGesture(node, onDelete)` — glisser (mobile) / poubelle au survol (desktop), doublé d'un `showUndo` |
| Choisir parmi 2-5 options | `pick-list` / `.pick` |
| Choisir une date | chips « Demain / +3 j / +7 j / Lundi » + date précise validée par OK (jamais de fermeture sur `change` seul — roue iOS) |
| Confirmer un geste risqué | `confirmSheet` (danger = `btn-danger`) |
| Geste lourd réversible | `showUndo(msg, onUndo)` — barre Annuler ~30 s |
| Retour discret | `toast()` — court, ponctuel, jamais deux phrases |
| Marquer partagé vs privé | `tag-share` / `tag-priv` |
| Dire qu'un état **réclame quelque chose** | `.mark` + un cran : `mark-late` · `mark-now` · `mark-soon` · `mark-far`. **Un seul langage d'urgence dans toute l'app**, échelle monotone, et **ce qui ne réclame rien n'affiche rien** — c'est le vide en face qui fait ressortir le reste. Un cadre entier peut prendre le bord ambre (`.fset.fs-alert`) quand son état peut tout coûter |
| Proposer un filtre | `.fl-chip` + son **compte**. Ne jamais offrir une valeur absente des données. Liste fermée (statuts) : la puce reste, éteinte. Liste ouverte (domaines) : elle disparaît, sauf si le filtre est actif |
| Note contextuelle | `<p class="hint">` (+ `warn` si alerte) |
| Multi-sélection | `.pk` avec icônes checkbox — **jamais pour supprimer**. L'emphase suit le DÉFAUT : parti de rien coché, l'aplat marque le choix ; parti de tout coché, `pk-inverse` marque l'**écart**. **Le défaut se juge feuille par feuille** — « → qui » s'ouvre tout coché pour *donner*, avec une seule personne pour *écrire* |
| Choisir qui part / qui est visé | `ui/qui.js` — la ligne « → qui » et sa sous-feuille à cocher |
| Supprimer un élément | glisser (mobile) / poubelle au survol (desktop) + `showUndo`, sans confirmation |
| Fermer une barre transitoire | balayer (mobile) / `✕` (desktop) |
| Contenu secondaire | `<details class="pcard pcard-details">` replié |
| Une page = un objet et ses réglages | en-tête `.obj` (icône en haut à gauche + nom) puis des cadres `.fset`. **Le cadre est lourd : deux par écran au maximum, jamais s'il contiendrait tout l'écran.** Ailleurs, `pcard` reste la règle |
| Recevoir des données | TOUJOURS l'aperçu avant fusion (`mergePreviewInto`) — mêmes règles quel que soit le canal |

**Règles d'écran :** un bouton primaire max par vue ; une suppression unitaire
réversible se fait au geste + `showUndo`, sans confirmation ; seules les
actions lourdes ou irréversibles gardent `confirmSheet` ; l'état vide de
chaque écran enseigne le produit, jamais un simple « aucune donnée ».

**Trois règles de guidage du regard**, tirées d'un audit mesuré (test du flou
+ saillance calculée sur les pixels rendus) :

1. **L'encre va à ce qui change, jamais à ce qui est permanent.** Une pastille
   sur *chaque* ligne n'est pas un signal, c'est un papier peint. Ce qui ne
   réclame rien n'affiche rien.
2. **Un écran montre les affaires de l'utilisateur, pas des portes.** Un écran
   incapable d'afficher une donnée réelle est un menu : il appartient à la
   navigation, pas à un onglet. Aucune mise en forme ne sauve un écran qui n'a
   rien à dire.
3. **`page-inner` seul (640 px) sur desktop = écran non conçu.** Flouter la
   capture : si la structure disparaît, ou si la zone la plus contrastée est
   du vide, c'est raté.

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

Français, tutoiement, phrases courtes, concret. On dit « pistes », « promo »,
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
| le groupe | **promo** | camarades |

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

**Communautaire (la promo)** : `sharePayload` → vue communautaire, jamais le
privé, fusion `merge.js` qui n'écrase rien, aperçu avant. Canaux : partage en
groupe (P2P), QR, fichier `.oc`, coller.

**Mes appareils (la même personne)** : `engine/sync.js`, tout circule (privé
inclus), le plus récent gagne (`updatedAt`), suppressions par tombstones.
Canal : P2P avec phrase de liaison personnelle, hashée pour nommer la salle,
données chiffrées de pair à pair. Le lien est **persistant** (`ui/synclive.js`).

Transport : Trystero (vendorisé) via relais Nostr publics, personnalisables
(`oc_relays_v1`).

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
7. Commits en français, descriptifs, focalisés.

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

# OpenContact — référence produit & UI/UX

**Ce fichier fait autorité.** Il dit ce qu'il faut savoir pour concevoir et
développer n'importe quelle fonctionnalité, quel que soit le compte ou
l'assistant qui travaille. Si une idée n'entre pas dans ces règles : on adapte
l'idée, ou on discute la règle avec le mainteneur. Jamais d'exception
silencieuse.

À lire avec : `CONTRAT.md` (le contrat de données, vérifié par `?test`),
`docs/surfaces.md` (ce qui est livré, ce qui dort, ce qui n'existe pas),
`docs/feuille-de-route.md` (quoi faire et dans quel ordre), `docs/recadrage.md`
et `docs/decisions/` (le recadrage en cours, et pourquoi), `design/` (le kit
« Utilitaire 98 »).

**Le « pourquoi » de l'interface vit ICI, dans les §4 à §8.** Les journaux de
calibrage qui l'ont produit ont été supprimés en août 2026, une fois leurs
règles distillées dans ce fichier : un raisonnement qui compte finit dans la
règle, jamais dans une archive que personne ne relit.

---

## 0. Un produit, trois surfaces

OpenContact est **un seul produit**. Il vit — ou vivra — sur trois surfaces
qui partagent les mêmes données et le même vocabulaire.

| Surface | État | Ce qu'elle apporte de plus |
|---|---|---|
| **Le web** (PWA, installable) | **livrée** | tout le quotidien : capturer, agir, écrire, partager avec son groupe, synchroniser ses appareils |
| **L’ordinateur** | **la prochaine** | ce qu'un navigateur ne peut pas garantir : travailler application fermée, parler IMAP/SMTP, faire tourner une IA locale |
| **Le téléphone** (store) | non commencée | la même chose que le web, mieux intégrée à l'appareil (caméra, partage, notifications) |

*(Décision du mainteneur, 17 août 2026, appliquée au code le 25 août :
**trois applications d'un seul produit**, jamais un produit et son
satellite. La coquille native de `natif/` (Rust/Tauri) est la fondation
commune des applications **ordinateur ET téléphone** : elle exécute le
même moteur `engine/` que le web, sans le réécrire. Les noms suivent :
`natif/` est le dossier, la surface s'appelle **OpenContact pour
ordinateur** ou **pour téléphone**, à l'écran comme dans la doc. Une
seule chose garde son ancien nom et ne bougera jamais — la clé de
stockage `oc_companion_v1` : §10 interdit de renommer une clé, et une
association d'appareil déjà en place se perdrait.)*

### Les deux questions, avant d'ajouter quoi que ce soit

> **① Est-ce que ça marche pour quelqu'un qui ouvre l'app dans son
> navigateur, sur son téléphone, sans compte et sans rien installer ?**
> Oui → c'est du web, donc de partout.
> Non → c'est une capacité de la **surface ordinateur**, la prochaine à
> s'ouvrir. **L'installation est ce qui fait une autre surface** — pas la
> complexité, pas le niveau d'expertise.
>
> **② Est-ce que ça engage le mainteneur dans une démarche permanente**
> (déclaration chez un fournisseur, examen, certificat à renouveler) **?**
> Oui → **reporté**, quelle que soit la surface.

Pas « est-ce que c'est avancé », pas « est-ce que c'est pour les experts » :
est-ce que ça marche **tout de suite, pour tout le monde**.

**La règle qui ne bouge pas : les surfaces partagent des données, jamais des
dépendances.** Le web reste entier si l’ordinateur n'existe pas.

**Corollaire.** Une capacité d'une surface absente **n'apparaît pas** sur les
autres. Ni grisée, ni « bientôt » : absente.

### La répartition

`WEB` = partout, dès aujourd'hui · `PC` = surface ordinateur, pas encore livrée ·
`⏸` = reporté par choix (voir l'état plus bas).

| | Où |
|---|---|
| Pistes, fiches, suivi, prochaine action, clôture | WEB |
| Rappel d'une prochaine action par l'agenda du téléphone | WEB |
| « À découvrir » : l'annuaire public des entreprises depuis la barre | WEB |
| La carte de l'entreprise : l'annuaire, le BODACC, Wikidata, Wikipédia, mêlés et lisibles sans un lien à toucher | WEB |
| « À qui écrire », « Offres d'alternance autour de … » (La bonne alternance, par un lien), « Offres de stage autour de … » (HelloWork, par un lien) | WEB |
| « Autour de » dans le profil (ta ville, ton rayon), « Pas pour moi », « Nouveau », l'aide à l'embauche d'un apprenti | WEB |
| « Mon parcours » dans le profil, et la ligne « Expérience » du mail | WEB |
| Capture, anti-doublon, bac « à rattacher » | WEB |
| Donner et recevoir des pistes (QR, fichier `.oc`, coller) | WEB |
| Les groupes : créer, rejoindre (QR ou code), s'écrire (sept jours), se donner des pistes sans être là en même temps ; ouverts, ou sur demande (un chef et ses adjoints acceptent les entrées, retirent un message ou un membre) | WEB |
| Amis : donner son profil (QR, texte), lire sur ses pistes où ils sont passés, les retrouver triés dans « Mes pistes », s'écrire en privé | WEB |
| Demander à ses amis — et à ses groupes — quelqu'un chez une entreprise ou dans un métier et une ville, la demande qui passe d'elle-même à leurs amis (trois cercles), donner un contact — ou soi-même — en réponse | WEB |
| La boîte « Échanger » : toutes les conversations (groupes, amis) dans une liste, le chiffre sur l'onglet, épingler, couper le son | WEB |
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

### Ce qui est masqué à l'écran (2 août 2026)

La surface web se recentre sur ses bases avant sa première mise à
disposition. Tout ce qui est marqué `PC` ou `⏸` est **présent dans le code
mais masqué à l'écran**, piloté par les quatre drapeaux de `ui/perimetre.js` :
rien n'est supprimé, aucune clé de stockage ne bouge, aucune donnée existante
n'est perdue (une clé d'IA ou un jeton de messagerie déjà en place reste
lisible, simplement plus affiché). La suppression franche se décidera après la
première bêta.

**L'ordre des chantiers** *(décision du mainteneur, 17 août 2026)* : la
direction est arrêtée — trois applications sur une même base, et une file.
Le web se présente d'abord et récolte ses retours ; l’ordinateur s'ouvre
ensuite, sur la coquille native déjà écrite ; le téléphone suit, sur cette
même coquille. Ce n'est plus un seuil à deviner, c'est une file à suivre —
et les retours du web passent toujours devant.

### Le recadrage : des lots en préversion (19 octobre 2026)

L'app se remet en ordre par lots (`docs/recadrage.md`, décisions 0001 à
0004). **Un lot arrive dans main derrière un drapeau de LIVRAISON**
(`engine/drapeaux.js`), pas un drapeau du périmètre : il porte son lot, sa
raison et sa **date de retrait**, six mois au plus après sa naissance, et
`?test` refuse un drapeau qui l'a dépassée. On ouvre alors le lot et on
retire l'ancien chemin, ou on repousse la date exprès, dans un commit qui
dit pourquoi. Un drapeau de livraison qu'on oublie devient deux chemins à
tenir pour toujours.

La ligne **« Préversion »** de Réglages allume les lots en test sur CET
appareil, chez le mainteneur et ses testeurs ; elle n'existe que s'il y a
un lot en test. **Un écran demande le lot (`lot('reseau')`, `ui/state.js`),
jamais la préversion elle-même** : le jour où le lot s'ouvre, rien d'autre
ne change. Et pendant la préversion, les gardes jouent les DEUX chemins.
`ui/perimetre.js` n'importe rien : `tests/e2e/tous.mjs` le lit sous Node.

## 1. Le produit en une phrase

OpenContact aide un étudiant IT/cyber à répondre à **« je fais quoi
maintenant ? »** dans sa recherche de stage, d'alternance ou d'emploi, et fait
circuler les bonnes pistes dans son groupe.

C'est un outil de **motivation et d'action**, pas une base de données : chaque
écran doit pousser vers le prochain geste concret — écrire, relancer,
planifier.

- **Utilisateur type** : étudiant BTS SIO / BUT, sur son téléphone, entre deux
  cours. Le mobile est le contexte premier ; l’ordinateur est le poste de
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
l'utilisateur — les contacts qu'un camarade lui a partagés. **Quatre choses
seulement traversent en nommant quelqu'un** : `vecuQui`, le prénom de qui
déclare « j'y suis passé » (§8), et seulement sur déclaration explicite ;
le **profil donné** à un ami (OCA1 : un identifiant, le nom, le parcours,
la clé de sa boîte), par son propriétaire lui-même, d'un QR ou d'un texte —
ou parce qu'il vient d'ajouter cet ami : **l'amitié est réciproque**
(décision du mainteneur, 7 octobre 2026), et l'aperçu le dit avant le
geste (« Karim aura aussi ton profil. ») — et ce même profil, quand il
change, part tout seul à qui l'a déjà (lot 4a) ;
et la **demande à ses amis** (OCB1 : le prénom de qui demande et
l'entreprise — ou un métier et une ville de la table —, et ce qu'il
cherche, UN mot du profil — stage, alternance, emploi —, scellés pour
chaque ami, d'un tap) — elle passe d'elle-même aux amis de ses amis, deux
fois au plus, avec le prénom de l'ami qui l'a passée (lot 4b) ; le
contact qu'un ami donne en réponse ne part que de SON tap, et ne porte
que de quoi le joindre — et, s'il l'a coché, qu'il est d'accord —, jamais
sa note ni le suivi. Qui demande
n'apprend que le prénom de SON ami, jamais celui des maillons d'après ;
et dans un **groupe** (lot 5), le prénom de chaque membre et ce qu'il y
écrit, scellés par le code du groupe — le prénom, et rien d'autre qui le
désigne (décision 26 ; sa clé de boîte, une clé publique, n'y sert qu'à lui
faire arriver un nouveau code, 6.67) ; une demande y est la même lettre, que tout le groupe voit (lot 5b),
mais **la réponse ne passe jamais par le groupe** : elle va à la boîte de
qui demande (décision 29) ; et pour entrer dans un groupe **sur demande**
(lot 5c), le prénom et la clé de boîte, à ceux qui ouvrent sa porte —
la porte ne porte jamais le code ; et un **message à un ami** (6.68),
scellé pour lui seul : le prénom de qui écrit, sa clé de boîte et ce
qu'il a tapé, de SON geste — la conversation ne vit que sur les deux
téléphones. Un profil reçu **ne
se redonne jamais** : le mien ne porte que moi. L'app ne tient toujours
aucun carnet de camarades — la mesure avait montré qu'un tel carnet ne
contient que des gens déjà joignables. Les amis sont autre chose : un
profil que la personne t'a DONNÉ, et qui sert de chemin vers ses
entreprises, jamais d'annuaire (§8).

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
  **Le navy appartient au CHÂSSIS, le teal au contenu.** `--select-bg`
  habille l'onglet allumé, les barres de titre, `::selection`, le
  surlignage d'un résultat de recherche : ce qui dit *où tu es* ou *ce
  que tu as demandé*. Rien d'autre.
  **Et une ligne qu'on coche ne se peint pas.** Trois versions ont été
  nécessaires : navy (la couleur du châssis), puis lavis teal + liseré
  (la bonne famille, mais toujours un aplat), puis rien. Deux raisons
  ont tranché — mises côte à côte, « Prospecter » et « Donner » ne se
  ressemblaient pas pour le MÊME geste ; et sur une carte à deux étages
  l'aplat ne couvre que le haut, ce qui coupe l'objet en deux. L'état
  vit donc dans la **case**, cochée en accent, et la carte reste
  entière. Ce qui se verrouille n'est pas une teinte, c'est la
  **séparation** — châssis d'un côté, contenu de l'autre.

  **Trois langages de sélection, et ce qui les sépare est la TAILLE de
  l'objet.** L'app les employait tous les trois, cohérents, sans qu'ils
  soient écrits nulle part — c'est la seule chose qui manquait :

  | l'objet | ce qu'il fait quand il est retenu |
  |---|---|
  | une **ligne de liste** (`.pk`) | rien du tout — l'état vit dans sa case |
  | une **puce** (`.dchip`) | elle se remplit d'accent |
  | un **segment** (`.seg3 .seg`) | il se remplit d'accent, et s'enfonce |

  La règle qui les unit : **un aplat ne se pose que sur un objet qui
  tient entièrement dedans.** Une puce et un segment font la taille de
  leur mot — l'aplat les couvre en entier, il DIT l'objet. Une ligne de
  liste a deux étages ; l'aplat n'en couvre qu'un et coupe l'objet en
  deux. C'est la même raison, appliquée à trois tailles, et c'est ce qui
  évite d'avoir à choisir au cas par cas.
- **Reliefs** : bevels francs, ombres dures, coins droits (`--bevel-*`,
  `--shadow-*`). L'identité est **nette, sans flou** — un dégradé, une ombre
  floue, un arrondi marqué la cassent. Ça se discute avec le mainteneur, ça ne
  se glisse pas dans un écran. **Le relief se mérite** *(13 octobre 2026)* :
  il appartient au châssis (fenêtres, barres de titre), au primaire, et à
  l'APPUI — un bouton teinté fonce et s'enfonce quand on le tape. Posé sur
  chaque bouton, il faisait douze gros boutons d'une fiche (voir §6, « La
  taille dit le rang »). Le primaire, lui, est posé sur un **rebord** net
  de 2 px, l'accent assombri *(19 octobre 2026)* : une touche, pas une
  brique — le trait noir, le biseau et l'ombre en biais sont partis.
- **Trame dither** : `--dither` porte la position ET la taille, il n'est donc
  valable que derrière la propriété raccourcie `background`. Posé sur
  `background-image`, il est **rejeté en silence** — la trame ne s'affiche pas
  et rien ne le signale. Quand un fond de couleur doit rester dessous, prendre
  `--dither-img` + `--dither-size`. (Quatre endroits de l'app ont vécu
  longtemps sans leur trame à cause de ça.)
- **Typo** : Silkscreen (titres pixel), IBM Plex Mono (données, dates,
  compteurs), Public Sans (texte courant). Pas d'autre police.
  **Le titre d'une feuille est en Silkscreen 16 px**, la taille du logo
  *(audit, octobre 2026)* : à 8 px il faisait 6 px de haut, et c'est le
  seul titre de la plupart des feuilles. La barre dit ce qu'EST la
  fenêtre (« Fiche », « Donner »), l'en-tête dit laquelle — jamais deux
  fois le même nom. Apple le dit d'une barre de navigation : un mot ou
  une courte expression, une quinzaine de caractères. **Appliqué partout
  le 12 octobre 2026** : la règle n'avait touché que la fiche, et treize
  barres portaient encore une phrase, un nom recopié ou une donnée —
  « Modifier — Société Générale Global Solution Cen… », « Inès cherche
  quelqu'un », « Karim t'a donné », « Écrire — Orange Cyb… », « QR — 4
  pistes ». Elles disent maintenant « Modifier », « Demande »,
  « Contact », « Ami », « Membre », « Rattacher », « Prospecter »,
  « Écrire », « QR », « Fichier » ; la phrase, le nom ou le compte ouvre
  le contenu, en entier, et il plie. Le composeur y gagne le plus : à
  qui l'on écrit (« Orange Cyberdefense · 2/5 » dans une série de
  Prospecter) se lit en tête au lieu de se couper dans la barre.
  Un nom SEUL reste permis pour une conversation — de groupe ou avec un
  ami : la barre d'une messagerie porte le nom du fil, et c'est le seul
  endroit où il est écrit. Gardé par `e2e-sobriete.mjs` (⑥, plafond zéro) : ni tiret
  cadratin, ni phrase montée autour d'un prénom dans une barre.
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

  **Le seuil est 200 %, pas 125 %** (WCAG 1.4.4 : doubler le texte sans
  perdre contenu ni fonction). L'outillage s'arrêtait à 125 %, où tout
  tient encore — d'où sa cécité à un défaut photographié sur un vrai
  téléphone. Et ce qui doit tenir se départage : **ce qui porte une
  IDENTITÉ ne se coupe jamais** — le nom d'une piste, le libellé d'un
  bouton : ils plient (`-webkit-line-clamp` généreux, `white-space:
  normal`), et à taille normale rien ne bouge, mesuré. **Ce qui porte
  une DONNÉE garde le droit de s'élider** : la sous-ligne dit la ville,
  le statut, l'échéance — la ligne reste compréhensible sans sa fin.

  **Une feuille ne défile jamais latéralement**, et la cause type est
  toujours la même : un enfant de grille ou de flex garde son
  `min-width:auto`, donc refuse de descendre sous sa largeur MINIMALE
  de contenu. Pour un `<select>`, WebKit calcule cette largeur sur son
  **option la plus longue** — Chromium non. Signalé sur photo, jamais
  reproductible ici : « Écrire » glissait de droite à gauche, libellés
  coupés au bord. `max-width:100%` n'y peut rien, c'est `min-width` qui
  l'emporte. Donc `min-width:0` sur les enfants (`.grid2>*`), et
  `overflow-x:hidden` sur `.modal-b` en **ceinture** — un contenu qu'on
  n'avait pas prévu ne doit jamais faire glisser la feuille sous le
  doigt, c'est le symptôme le plus déroutant qui soit.
  Corollaire de garde, appris ici : **une ceinture rend le symptôme
  inmesurable.** Le contrôle doit viser la CAUSE (un enfant plus large
  que la boîte) et se vérifier lui-même en plantant une sonde — sinon
  il reste vert quand on le retire.
  **Et la cause se mesure au BORD, pas à la largeur** *(octobre 2026)*.
  Trois segments étroits dont le troisième commence dans la feuille et
  finit dehors : aucun n'était plus large que la boîte, « Réponse »
  perdait pourtant 10 px à 200 % en 320 px, et la garde restait verte —
  le défaut a été vu sur une capture, pas par elle. Elle mesure donc ce
  qui dépasse un bord, hors de ce qui défile ou coupe exprès (une
  rangée de puces, la ligne d'un geste), et ses deux sondes plantent
  l'un et l'autre cas. Le remède du statut de la fiche est la bascule
  de la carte de suivi : rangée, ou pile d'un coup quand le plus long
  mot ne tient plus (`--bascule`, MESURÉ par contrôle — 13 rem pour
  trois segments ; « Ouvert · Sur demande » tient toujours et n'en
  déclare pas).

  **Et la même faute existe VERTICALEMENT, en pire.** Dans une colonne
  flex de hauteur bornée, un enfant garde `flex-shrink:1` : il rétrécit
  **sous sa propre hauteur de contenu**, et `overflow:auto` sur le
  parent n'y change rien — le débordement n'existe plus, donc rien ne
  défile. Si l'enfant coupe (une ligne du motif de suppression au geste
  porte `overflow:hidden`), son texte se fait **raboter net**. Mesuré
  sur le fil d'« Échanger », à 200 % en 360×640 : une rangée de 88 px
  logée dans une ligne de 35 px, 44 px d'encre coupés — le trait
  pointillé passait à travers les lettres. C'est la photo du mainteneur,
  et c'est aussi ce que le remède prématuré reproduisait : un
  `-webkit-line-clamp` posé là ENFERME la rangée au lieu de la libérer.
  **On ne contraint pas une boîte qu'un parent coupe déjà** — on rend
  aux enfants leur hauteur (`flex:none`) et c'est le CONTENEUR qui
  défile, ce que WCAG 1.4.10 demande d'ailleurs à texte agrandi.

  Deux corollaires de garde, tous deux payés ici :
  ① Le balayage d'élision ne regarde que les éléments qui portent
  eux-mêmes du texte ; **un conteneur qui rabote des enfants entiers lui
  est invisible.** C'est une mesure de plus, pas la même.
  ② **Un contrôle ne serre que ce qu'il remplit.** Trois lignes de
  journal TIENNENT dans la région à 393×852 même à 200 %, donc rien
  n'avait besoin de rétrécir et la mutation passait au vert. Il en faut
  six. Le même piège que le profil vide du composeur, une surface plus
  loin.

  **La barre d'onglets : une limite qui reste, et un remède qui a échoué**
  *(19 août 2026)*. Mesuré : à 320 px « Aujourd'hui » est élidé à taille
  normale (57 px rendus pour 59 voulus), et davantage à texte agrandi.
  Les deux sources interdisent pourtant la coupe — Material 3 (« ne
  jamais tronquer un libellé de destination ») et Apple HIG (« un onglet
  porte toujours un libellé »).

  La sortie de M3 pour quatre destinations — l'onglet ACTIF garde son
  mot, les autres tombent à l'icône — a été implémentée, puis **retirée
  après une photo du téléphone du mainteneur**. Elle se déclenchait dès
  qu'un seul libellé manquait d'un pixel, donc en permanence sur un vrai
  appareil, et rendait trois onglets sur quatre muets. **Un repli qui
  coûte trois noms pour en sauver deux pixels coûte plus que le défaut
  qu'il corrige** — et aucune mesure en émulation ne pouvait le dire :
  la police réelle d'un iPhone est plus grande que le 16 px du bac à
  sable.

  Ce qui est gardé : chaque onglet porte son nom en `aria-label`. Un mot
  élidé s'annonçait tronqué à un lecteur d'écran ; il s'annonce entier.

  **Tranché : le mot reste** *(décision du mainteneur, 21 août 2026)*.
  M3 dit bien *use short text labels*, et la vraie réponse aurait été de
  raccourcir le mot plutôt que de le cacher — mais raccourcir touche §7
  (un objet, UN mot) : l'onglet, le titre de l'écran et `document.title`
  changeraient ensemble, pour deux pixels sur la seule largeur de
  320 px. Le mot dit ce que l'écran est ; l'abréger coûterait plus que
  l'élision. La limite est donc **assumée, pas ouverte** — elle ne se
  rediscute que si un retour de bêta la signale sur un vrai appareil.

- **Le survol NE SE LÈVE PAS au doigt.** iOS applique `:hover` au tap et
  le LAISSE jusqu'au tap suivant : chaque règle non gardée devient une
  trace qui reste — une ligne blanche au milieu d'une liste, un fond
  gris sous un bouton. Signalé sur photo et décrit comme « général, sur
  tout le site » : c'était 30 règles sur 34. **Toute règle de survol vit
  sous `@media (hover:hover)`**, dans les tokens comme dans `app.css` —
  les deux dernières nues vivaient dans les tokens, et une première
  passe les a manquées pour cette seule raison.
  **Et `:active` ne part JAMAIS avec elle.** Les deux voyagent souvent
  dans la même liste de sélecteurs ; envelopper l'ensemble supprime le
  seul retour d'appui qui reste sur un téléphone — on tape, rien ne
  bouge. Les règles se scindent.
  Corollaire d'outillage : un contrôle qui lit du CSS doit ignorer les
  COMMENTAIRES. Ce fichier en contient qui citent des sélecteurs de
  survol, et les compter faisait rendre 32 fautes là où il n'y en avait
  aucune.
- **L'anneau de focus se VOIT, et ça se mesure en pixels.** Le jeton
  disait « pointillé 98, lisible partout » : une intention, jamais un
  relevé. Photographié sur les 150 contrôles de l'app, non focalisés
  puis focalisés, le trait de 1 px en rendait 49 sous le plancher de
  WCAG 2.2 SC 2.4.11. **On ne lit pas le CSS** — c'est le seul relevé
  qui survive à un anneau rogné par un ancêtre ou peint sous un enfant
  opaque, et aucun des deux ne se voit dans une feuille de style.

  Le critère offre **deux** aires minimales et retient la plus facile :
  un périmètre de 2 px autour du contrôle, ou un trait de 4 px le long
  de son plus petit côté. Ne mesurer que la première sur-accuse — une
  rangée de 523×36 exigerait 2 252 px² au lieu de 144, le relevé rend
  « tout est faux », et un rapport pareil ne se corrige pas. C'est
  exactement la faute de la sonde des relais, neuf relais sains accusés
  d'un coup ; elle s'est rejouée ici mot pour mot.

  Trois choses en sont sorties, et la troisième est la plus chère :

  ① **Un pointillé n'encre que la moitié de sa bande**, donc 1 px en
  rend le quart. 2 px n'est pas moins « 98 » : la case de focus de
  l'époque faisait un pixel d'un écran à 96 ppp, soit deux à trois sur
  un téléphone d'aujourd'hui. C'est le trait qui rattrape la densité,
  pas le dessin qui change.

  ② **`outline-offset` pose l'anneau DEHORS, et `overflow:hidden` le
  coupe là.** Le rognage est celui du motif de suppression au geste
  (§6), et le contrôle qui ouvre une ligne la remplit bord à bord : la
  ligne du fil ne rendait **rien** au doigt, la ligne d'une piste un
  quart — deux traits verticaux au lieu d'un cadre —, la rangée
  d'« Aujourd'hui » un huitième. Les trois listes principales du
  produit. La **rangée** porte donc l'anneau à la place du contrôle qui
  la remplit : `overflow` rogne les descendants d'un élément, jamais son
  propre contour. Le contrôle se nomme (`sw-cible`) ; la rangée, elle,
  se **déduit** — le motif est toujours `rangée > enveloppe > contrôle`,
  donc `:has(> * > …)`, et aucune des deux enveloppes n'est nommée. Une
  première version disait `.sw:has(…)` et ratait « Aujourd'hui », dont
  la rangée porte son propre geste : deux rangées sur trois passaient de
  « rogné » à « rien du tout ».

  ③ **Un anneau intérieur se pose sur la boîte qui PEINT.** Le fil n'a
  aucun dehors — trois boîtes de même largeur s'emboîtent, et la plus
  extérieure défile —, l'anneau va donc dedans. Posé sur la rangée, il
  rendait **103 %, au vert**, pendant que l'œil ne voyait qu'un liseré
  d'un pixel : l'enveloppe est positionnée et opaque, elle le recouvrait.
  D'où le troisième critère du garde, qui ne vient pas de WCAG mais du
  produit — **l'anneau touche au moins trois bords sur quatre, coins
  exclus.** WCAG se satisfait d'un trait ; §4 dit un rectangle. Sans ce
  critère le pire défaut du lot repassait au vert, et c'est l'instance
  la plus nette de « la mesure propose, l'œil tranche » (§6).

  Corollaire de garde, appris deux fois dans ce lot : **un bord se
  compte sans ses coins.** Mesurés par simple proximité, les deux
  extrémités d'un trait horizontal tombent aussi dans les bandes gauche
  et droite — le liseré rendait trois côtés sur quatre et la sonde
  restait verte. Chaque bord ne compte que le milieu de sa longueur.
  `e2e-focus.mjs` balaie 4 écrans et une feuille (« Historique ») × 2
  ergonomies × 2 thèmes et remet les trois défauts d'origine en sondes.

  Corollaire, payé le 13 octobre 2026 en y ajoutant cette feuille :
  **une barre de titre porte son propre anneau.** La croix des feuilles
  y posait l'encre de l'app sur le navy du châssis — 1,4:1, invisible, et
  dans TOUTES les feuilles depuis toujours, parce que le balayage n'en
  ouvrait aucune. Elle prend l'encre de la barre (`--on-navy`). Et un
  piège d'outillage : on ouvre la feuille SANS pointeur — après un clic,
  Chromium cesse d'afficher `:focus-visible` à un focus posé par script,
  et tout ce qui suit mesure 0 %.
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
- **La fenêtre MOYENNE (600-900 px) garde le dessin du pouce, pas son
  étirement** *(audit adaptatif, octobre 2026)*. Une tablette en
  portrait, un pliant ouvert : Material 3 nomme cette classe « medium »
  et n'y étire plus la barre du téléphone, l'iPad resserre la sienne au
  centre. Étirée sur 768 px, chaque onglet faisait 150 px et l'onglet
  allumé un bloc navy de 170. Les onglets y gardent une largeur de
  téléphone (`7.5rem`) et la barre se centre.
- **La main — `(pointer:fine)`** : une souris, un trackpad ou un stylet la
  valident (iPad + trackpad compris), un doigt non. `--ctl` et
  `--input-fs` ne descendent à l'ergonomie souris **qu'avec les deux**
  (`@media (min-width:901px) and (pointer:fine)`). Un `--input-fs` sous
  16 px rouvre le zoom automatique d'iOS à la mise au point d'un champ.
- **Au pouce, pas d'en-tête** *(décision du mainteneur, 12 octobre 2026)*.
  Le bandeau du logo ne portait que le logo et la bascule du thème :
  46 px en tête de CHAQUE écran pour rien qu'on y fasse, pendant que la
  barre du bas porte la navigation et que le titre de l'écran dit où
  l'on est. Il n'existe plus sous 901 px ; le thème passe dans
  Réglages. La marge du haut suit l'encoche (`safe-area-inset-top`).
- **Le thème : une rangée de Réglages, trois choix, sur les deux
  appareils** *(13 octobre 2026 : « améliorer le bouton clair et
  sombre »)*. Il y avait deux segments « Clair · Sombre » plantés dans
  la liste au pouce — la seule rangée qui ne menait nulle part — et une
  icône muette dans l'en-tête au poste ; et une fois « Clair » tapé, plus
  moyen de revenir à ce que fait le téléphone. « Thème » dit maintenant
  son état comme ses voisines et ouvre les trois choix de tout réglage
  système (iOS, Android, WhatsApp) : **Automatique** (le défaut, qui
  suit l'appareil EN DIRECT), Clair, Sombre. Une seule place, la même au
  pouce et au poste : l'icône de l'en-tête est partie. Le choix
  (`S.themeChoix`) n'est pas ce qui est appliqué (`S.theme`) ; le miroir
  synchrone de `theme.js` porte le choix, pour qu'« Automatique »
  redemande l'appareil avant le premier pixel.
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
- **Au doigt, ce qu'on voit est ce qu'on touche : 44 px dessinés**
  *(décision du mainteneur, 30 septembre 2026 : « c'était beaucoup
  mieux avant »)*. Un bouton, une puce, un segment, une croix se
  dessinent à la hauteur de leur cible. La séparation entre dessin et
  cible (40 et 32 px dessinés, marge invisible autour) a vécu une
  journée — voir l'annexe. `e2e-boutons.mjs` (⑥) refuse tout contrôle
  dessiné sous 44 px au doigt ; redescendre demande de venir le
  changer là, exprès. **Le teinté la tient** *(19 octobre 2026)* : son
  aplat fait la hauteur de sa cible, `--ctl`, 44 px au doigt. Ce que le
  mainteneur avait refusé le 30 septembre — un cadre de 32 px dans une
  cible de 44, deux bords pour un seul geste — ne revient pas.
- **Une hauteur par main, jamais par largeur ni par bouton**
  *(« la taille doit être adaptée sur téléphone et PC », le mainteneur,
  30 septembre 2026)*. Relevé sur trois ergonomies le même jour : au
  poste, le bouton compact faisait 36 px — écrit en dur, donc PLUS haut
  que le bouton normal, le champ et la rangée voisins (32) ; sur une
  tablette tactile, la croix des feuilles faisait 28 px et « Donner »
  36, sous un doigt, parce que ces tailles suivaient la LARGEUR. Tout
  contrôle prend désormais `--ctl` : 44 au doigt (tablette comprise),
  32 à la souris. La hiérarchie se dit par l'emphase (§6), jamais par
  la hauteur. **Une exception, nommée** : à la souris, la croix d'une
  feuille appartient au châssis et prend la hauteur de sa barre de titre
  (`--titlebar-h`), comme les boutons de légende d'une fenêtre de
  bureau. `e2e-boutons.mjs` (⑥) exige l'égalité dans les deux sens, sur
  téléphone, poste ET tablette — la tablette est l'ergonomie où ces
  défauts vivaient, et aucune garde ne la mesurait.
- **On mesure aussi dans la BANDE INTERMÉDIAIRE, pas seulement à 100 %
  et à 200 %.** Les contrôles balayaient les deux extrêmes ; les trois
  défauts photographiés sur un vrai téléphone en août 2026 vivaient tous
  entre. 113 % et 125 % sont le réglage que les gens mettent vraiment
  pour y voir, et **la police réelle d'un iPhone est déjà plus grande
  que le 16 px du bac à sable** : un repli calculé au pixel près se
  déclenche donc en permanence sur un appareil réel, jamais en
  émulation. `e2e-ux-audit.mjs` balaie maintenant les cibles à 125 %
  aussi.
  Corollaire, appris en éprouvant ce passage à la mutation et plus
  précieux que lui : **un contrôle ne garde que les ÉTATS qu'il met en
  place.** Le premier défaut trouvé — une action de 17 px dans le
  composeur — n'était pas caché par la taille du texte mais par une
  surface absente : le balayage sème un profil rempli, donc le bouton
  « Compléter mon profil » n'existait jamais. Ajouter une taille de
  texte ne rattrape jamais un état qu'on n'ouvre pas.
  Deux corollaires d'outillage viennent du même endroit, et tous deux
  ont produit un FAUX VERT — le sens qui rassure, donc le pire.
  ① **Un état FUGACE se lit après l'avoir effacé.** Le toast dure
  3,4 s et une boucle de mesure va plus vite : en lisant `#toast` sans
  le vider d'abord, on relit celui du geste PRÉCÉDENT. Trois refus
  muets sont ainsi passés pour trois refus expliqués.
  ② **Semer des données sans RECHARGER mesure l'état d'avant.** L'app
  a chargé son état à l'ouverture ; écrire dans le stockage ne le lui
  dit pas. Une première mesure de charge rendait « 0 ligne rendue »
  avec des temps flatteurs : elle chronométrait une liste vide.
  Dans les deux cas le remède est le même — **un contrôle vérifie
  qu'il a mesuré quelque chose avant de conclure** (des lignes rendues,
  un toast à lui), sinon il rend zéro et zéro se lit comme une
  réussite.

  Second corollaire, du même ordre : **on mesure au plus ÉTROIT.** Le
  balayage à 200 % vivait en 393 px ; à cette largeur aucun nom
  d'entreprise réel ne se coupe, si bien qu'on pouvait remettre le
  défaut d'origine sans que rien ne rougisse. Passé en 320 px — la
  largeur la plus étroite qu'on prétende servir — cinq pertes de
  contenu sont sorties d'un coup. **Mesurer au plus large, c'est ne pas
  mesurer.**
  Troisième corollaire, et le plus coûteux des trois : **une garde qui
  ne mesure qu'une ergonomie ne mesure pas l'app.** Le balayage à 200 %
  ne connaissait que le pouce, alors que le poste porte des objets que
  le pouce n'a pas du tout — la carte du tableau à trois colonnes, les
  titres de colonne collants, la barre d'état. C'est en relevant le
  poste à la main qu'un nom de piste amputé est sorti, dans les listes
  à cocher, **dès 100 % sur un 320 px** : l'état quotidien d'un petit
  téléphone, que le balayage au pouce ne voyait pas non plus parce que
  les deux feuilles concernées n'étaient pas dans sa liste. Deux
  angles morts qui se recouvraient.

- **Une exception qui ne peut pas se NOMMER force à ouvrir la garde
  pour tout le monde.** Les exceptions d'élision se désignent par
  classe ; la sous-ligne des six listes à cocher vivait en `<span>` nu.
  Impossible de dire « celle-là est une donnée » sans dire « tous les
  `span` sont des données ». Elle porte son nom (`.pk-s`), comme ses
  cinq sœurs. **Tout ce qui a le droit de s'élider doit être
  nommable** — sinon l'exception se prend au niveau du type de balise,
  et la garde ne garde plus rien.

- **Une icône ne grandit pas avec le texte, et c'est elle qui vole la
  place.** Le piège est contre-intuitif : à texte agrandi on cherche la
  faute dans la typographie, alors qu'elle est dans le MOBILIER. Mesuré
  sur « Aujourd'hui » en 320 px : la rangée fait 290 px dont **148 pour
  trois icônes** — figées par `--ctl` — et le nom de la piste, qui est
  l'attribut distinctif de la ligne (§6), n'en garde que 134 quelle que
  soit la taille du texte. À 150 % il lui faut quatre rangs pour trois
  disponibles.
  La réponse est celle de WCAG 1.4.10 : **le contenu se réorganise, il
  ne se perd pas** — les gestes passent dessous, le nom prend toute la
  largeur. Deux points qui font que ça tient :
  ① **le seuil est un plancher en `rem` sur la colonne du texte**, pas
  une média query : il suit la police du navigateur tout seul, et l'app
  n'a pas un réglage de plus ;
  ② **la valeur se mesure, elle ne se choisit pas.** 6,5 rem est la
  seule qui laisse 100 % ET 125 % strictement identiques au pixel près
  (134 px en 320, 170 en 360, 200 en 390) et qui replie exactement aux
  tailles où le nom se coupait. Un demi-rem de plus repliait à 125 % ;
  un demi-rem de moins laissait un défaut en 360 px.

- **Une cible se mesure sur ce qui RÉPOND au doigt, jamais sur ce qui se
  voit.** Les deux erreurs sont symétriques et coûtent toutes les deux.
  D'un côté, la case à cocher de « Contact » paraissait fautive à
  18 × 18 : sa cible réelle est son `<label>` entier, 352 × 44, et taper
  le bord droit du libellé la bascule. De l'autre, la rangée du bac
  « à rattacher » paraissait bonne à 44 px : seuls 32 répondaient, parce
  qu'`align-items:center` donnait au `role="button"` la hauteur de son
  texte et laissait 26 px sans propriétaire. On mesure donc le **plus
  haut ancêtre interactif**, et `[role="button"]`, `[tabindex="0"]` et
  `summary` comptent autant qu'un `<button>`. Un élément replié
  (largeur ou hauteur nulle — la serrure au repos) n'est pas une cible ;
  un lien **en ligne** dans une phrase est exempté par 2.5.8 elle-même.
  `e2e-ux-audit.mjs` balaie ainsi 13 surfaces dans les deux ergonomies,
  et ses exceptions se **nomment** — il n'y en a aucune.
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
   qui a un propriétaire n'est plus un manque. **Le pied compte aussi** :
   « Moi » rempli ne fait que 456 px sur 745, et sa ligne de version
   tombait à 60 % de la hauteur — au milieu d'un vide que personne ne
   possédait. Un pied posé là ne se lit pas comme du calme, il se lit
   comme un oubli. Et ce qu'une autre surface dit déjà en permanence —
   la barre d'état au poste — ne se répète pas dans la page.
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

**Taper au pouce, c'est taper derrière un clavier.** Mesuré : pendant la
saisie, le premier résultat de « Mes pistes » commençait à 286 px du
haut, et un 360 × 640 n'en montrait AUCUN au-dessus du clavier. La
réponse est celle d'iOS (`UISearchController`) : pendant la saisie, au
doigt, la barre de recherche prend le haut, le grand titre et l'en-tête
de l'app s'effacent, et tout revient clavier rangé (`amenerBarre`,
`ui/pistes.js`). Le chiffre qui se garde est le nombre de résultats
ENTIERS au-dessus de la ligne du clavier — 4 en 390 × 844, 2 en 360 ×
640 (`e2e-clavier.mjs`). Tout écran neuf où l'on tape pour filtrer se
mesure ainsi.

**Et une feuille où l'on tape se loge AU-DESSUS du clavier** *(13
octobre 2026 — « quand on écrit, c'est horrible »)*. Sur un iPhone, le
clavier ne rétrécit pas la page : seule la zone visible
(`visualViewport`) diminue, et une feuille posée en bas de l'écran reste
dessous. Relevé avec un clavier simulé en 390 × 844 : de « Nouvelle
piste » il ne restait que la barre de titre ; dans « Écrire », le message
et « Ouvrir dans Mail » étaient sous les touches, et Safari faisait
glisser toute la page d'un champ à l'autre. `interactive-widget=
resizes-content` règle Android ; Safari l'ignore (WebKit, bug 259770).
`ui/zone-visible.js` lit donc la zone visible et pose `clavier-ouvert` sur
la racine tant qu'un clavier couvre le bas : la feuille prend la hauteur
de la zone — sa barre en haut, son pied juste au-dessus des touches — et
c'est ELLE qui défile ; le champ qui a le curseur est amené dans la
feuille, jamais en faisant défiler la page. Trois gardes, chacune payée
ailleurs : un zoom à deux doigts n'est pas un clavier, une barre
d'outils qui se replie (moins de 120 px) non plus, et clavier rangé on
ne lit plus rien d'autre que « rangé » (iOS 26 laisse parfois
`offsetTop` décalé). Aucun émulateur ne joue ce clavier :
`e2e-ecrire.mjs` joue ce que l'app en REÇOIT — une zone visible qui perd
336 px — sur cinq feuilles où l'on tape, au pouce et sur un petit
téléphone, sept mutations à l'appui.

**Un geste tactile ne se termine pas toujours par `touchend`.** Le
système reprend un toucher quand il veut — le défilement prend la main,
une notification tombe, l'application passe en arrière-plan — et il
envoie `touchcancel` à la place. **`touchend` n'arrive alors jamais.**
Un geste qui DÉPLACE quelque chose et n'écoute que la fin laisse donc
son objet décalé et sa classe posée, indéfiniment : une ligne coincée
de travers qui découvre une bande de fond, une feuille arrêtée à
mi-hauteur. Les quatre gestes de l'app étaient dans ce cas, et c'est la
moitié du « petit bug qui persiste » signalé sur photo — l'autre moitié
étant le survol collé (§4). Deux règles :

- **Tout geste qui bouge rend son `touchcancel`**, et il ramène au même
  repos que `touchend` — un seul `auRepos()` partagé, jamais deux
  chemins de rangement qui divergeront.
- **`touchstart` remet au repos AVANT de commencer.** Ceinture, pour le
  cas où même l'annulation manque : sans elle, un état coincé survit à
  tous les gestes suivants, ce qui est exactement ce qu'on a vu.

Corollaire d'outillage, appris ici : **on mesure le style EN LIGNE, pas
le calculé.** Une transition CSS rend encore l'ancienne valeur à
l'instant où on la lit ; la première version du contrôle a conclu
« rien n'a bougé » d'un geste qui suivait pourtant le doigt.

**Naviguer, c'est tenir cinq promesses.** Une barre d'onglets, un
bouton retour et un lien promettent des choses très précises ; les tenir à moitié
coûte plus cher que ne pas les faire. Les cinq sont mesurées et
gardées (`e2e-fenetre.mjs`, `e2e-ux-audit.mjs`, `e2e-commencer.mjs`) :

1. **Le bouton retour ferme la feuille, pas l'écran.** Chaque feuille
   pousse une entrée d'historique à la MÊME adresse et la consomme en se
   fermant ; le glissé depuis le bord d'iOS et le bouton système
   d'Android tombent dessus. Avant, le retour changeait d'onglet ET
   laissait la feuille par-dessus. Les chemins tordus sont ceux qui
   cassent : fermeture par la croix (entrée fantôme), feuilles empilées
   (on dépile par le HAUT — compter ne suffit pas, il faut vérifier
   *laquelle* reste), garde-fou qui refuse (l'entrée se rend).
   **Et surtout : `pushState` est immédiat, `history.back()` ne l'est
   pas.** L'app referme sans arrêt une feuille pour en ouvrir une autre
   dans le même geste ; en rendant l'entrée tout de suite, on empilait
   par-dessus un retour en vol, le compte se décalait d'un cran par
   tour, et au troisième le retour suivant **sortait de l'application**
   — `about:blank`, mesuré, et invisible pour toutes les gardes d'alors.
   Le retour est donc **différé d'une micro-tâche**, ce qui permet à
   l'ouverture suivante de l'annuler et de reprendre l'entrée : rien ne
   bouge. Corollaire du même ordre : le drapeau qui distingue « notre »
   retour de celui de l'utilisateur doit être un **compteur** — deux
   fermetures dans le même tick lancent deux retours, et un booléen n'en
   absorbe qu'un ; le second passe pour un geste et emporte une feuille
   que personne n'a quittée.
   **Et quand le retour est DÉJÀ parti** — une fermeture, un `await`,
   puis une ouverture —, l'annuler n'est plus possible : l'ouverture
   attend qu'il ait ATTERRI (son `popstate`) pour poser son entrée.
   Sinon la traversée vise l'entrée d'avant le `pushState`, le compte
   garde une feuille de trop, et deux retours plus tard on quitte
   l'écran. Invisible au calme ; 5 fois sur 8 sous charge — c'est-à-dire
   sur un téléphone lent. Trouvé par un scénario qui échouait « parfois »,
   et dont le commentaire affirmait qu'une fermeture forcée ne touchait
   pas l'historique : faux, et c'est ce qui aurait fait classer la
   panne en aléa. Gardé par `e2e-fenetre.mjs` (④ quater), sans charge :
   une micro-tâche entre fermer et rouvrir suffit à le rendre certain.
2. **Un onglet garde sa place, et le re-taper remonte.** C'est ce qui
   distingue un onglet d'un lien. La place vaut pour la session, pas au
   travers d'un rechargement. Attention au piège : `auSommet` et
   `applyRoute` se marchent dessus si la seconde relit le défilement en
   cours — même route, on force zéro, on ne sauvegarde rien.
3. **Changer d'écran s'annonce.** `document.title` suit la route, et le
   focus se pose sur le `h2` de l'écran (`preventScroll`). Sans ça, un
   lecteur d'écran n'entend rien et le curseur reste sur l'onglet.
   Corollaire : un lien d'évitement vise un élément **focalisable**
   (`tabindex="-1"`) — sinon il déplace le défilement et rien d'autre.
4. **Ce qui COMMANDE une liste reste avec la liste** — mais seulement
   quand la liste est longue. Une barre collante fait gagner ~22 % de
   temps sur une longue page (NN/g) et ne vaut rien en deçà de trois
   écrans ; au-delà de 20-30 % de la hauteur elle gêne. D'où la règle :
   le comportement est gratuit (sans débordement, `sticky` ne s'accroche
   jamais) mais **l'encre ne l'est pas** — fond, trait et relief
   n'apparaissent que pendant que la barre est vraiment décrochée
   (`collerEnHaut`, une sentinelle de 1 px). Trois pièges mesurés : un
   trait qui apparaît **pousse** le contenu et l'ancrage du défilement
   compense (dérive d'un pixel par décrochage — passer par l'ombre) ; un
   élément collant s'arrête sur la boîte de **contenu** du défileur,
   donc sous son `padding`, et ce qui défile dans cette bande se voit ;
   et deux surfaces différentes appellent deux réponses — au pouce c'est
   la barre de recherche qui colle, au poste le titre de colonne, parce
   que « / » y ramène déjà le champ en une touche. **Le motif vaut aussi
   dans les feuilles** : « Donner » et « Prospecter » ouvrent ~3,5 écrans
   de liste, et « Tout / Affiner » — les deux gestes qu'on cherche une
   fois descendu — partaient avec la première ligne.
5. **Un lien qui COMPTE mène à ce qu'il compte, et n'existe que s'il
   ajoute à l'écran** *(13 octobre 2026)*. Joué sur la toute première
   piste : « Advens » sous « Par où commencer », et au pied « 1 piste
   sans prochaine action → » — la même piste, redite ; tapé, le lien
   ouvrait « Mes pistes » ENTIÈRE, où ce qu'il comptait se perdait parmi
   le reste. Un nombre est une promesse : l'arrivée montre ce nombre-là
   (`ouvrirSur`, §6), avec le mot de l'écran d'arrivée (« à planifier »,
   l'étiquette de la barre), et le lien se tait quand tout ce qu'il
   compte est déjà sous les yeux. Gardé par `e2e-commencer.mjs`, un
   filtre d'« Affiner » posé exprès pour qu'il ait de quoi mentir.

---

## 6. Catalogue des motifs — à réutiliser AVANT d'inventer

Tout vit dans `ui/dom.js` sauf mention. Un besoin nouveau se résout d'abord
avec un motif existant.

| Besoin | Motif |
|---|---|
| Poser une question, éditer | `openSheet` (empilable, focus-trap, Échap, **bouton retour / glissé depuis le bord**, glisser-fermer au doigt, barre de titre qui se glisse à la souris, `setFoot` REMPLACE les boutons, `guard` = garde-fou avant fermeture) |
| Le champ où s'ouvre une feuille | `focus` d'`openSheet`. **Ouvrir pour modifier n'est pas ouvrir pour écrire** : au doigt, un champ focalisé fait monter le clavier sur la moitié de la feuille. Une feuille qui ne sert qu'à taper (renommer, un mot de passe, une recherche, une fiche neuve, un profil vide) garde son champ ; une feuille qu'on vient relire passe par `champAOuvrir(sel)` — le curseur au poste, rien au doigt (audit d'octobre 2026, `e2e-finitions.mjs`) |
| Garder une barre d'outils sous la main | `collerEnHaut(sentinelle, cible)` — la cible ne prend son décor que **décrochée**. Sur une liste courte, rien ne s'ajoute jamais |
| Poser un champ de saisie | `clavier('nom' \| 'coord' \| 'email' \| 'tel' \| 'lien' \| 'cherche' \| 'secret')` — le genre dit ce que le champ EST, jamais sa balise. **La prose n'a pas de genre** : son correcteur doit rester allumé |
| Un champ dont la VALEUR doit se lire en entier | `champGrandit(ta)` (`ui/dom.js`) — il grandit avec son texte, et **se re-mesure quand sa LARGEUR change** (`suivreLargeur` : un téléphone qu'on tourne replie le texte autrement). Dans une colonne flex, un champ qui grandit prend `flex:1 0 auto`, **jamais `flex:1`** : ce dernier pose une base de zéro et ignore la hauteur que le champ se donne — au poste et sur tablette, la note d'une piste neuve restait coincée sur une ligne, le reste caché (30 septembre 2026). Il grandit **sans plafond** : quand tout ne tient pas, c'est la FEUILLE qui défile, jamais l'endroit où l'on travaille (§6, « Écrire »). **Le message d'« Écrire » en est** *(13 octobre 2026)* : il défilait dans son cadre au milieu d'une feuille qui défile — deux défilements sous le même pouce, et le début du brouillon caché au-dessus du curseur. Il grandit maintenant, plancher gardé, et son cadre ne rétrécit jamais sous lui (`flex:1 0 auto`) : sinon la ligne qui le suit se pose sur la fin du message (`e2e-ecrire.mjs`). Un plafond ne se pose que pour borner un objet qui a une cible — l'objet d'un mail vise 40-60 caractères et garde le sien (`.fld-subj` + `auTexte`, `ui/mail.js`), avec un compteur qui dit la fenêtre visée (`.fld-n`) : une **donnée**, mono et discrète, qui ne change jamais de couleur — un compteur qui alerte est un avertissement, et un objet trop long ne coûte rien qu'on ne puisse défaire |
| Une valeur d'UNE ligne qui n'y tient pas | elle se replie, elle ne défile pas — `.fld-1l` + `champGrandit`. **Un `<input>` ne sait pas se replier** : mesuré avec une adresse ordinaire, 33 à 194 px de texte caché à TOUTES les largeurs de téléphone, 390 px à 100 % compris. Ce n'est donc pas un cas extrême, c'est le cas courant, et ce qui se cache est ce que l'utilisateur a écrit lui-même. Le champ devient un `<textarea rows="1">` mais **reste une valeur d'un seul rang** : Entrée passe au champ suivant, un collage multiligne se recolle sur place. C'est le cas des **technos** — une énumération séparée par des virgules, où rien n'attend de retour à la ligne. Réservé à ce qui est ENREGISTRÉ et relu : une recherche défile légitimement, sa requête est transitoire |
| Une valeur qui est multi-ligne PAR NATURE | **c'est un champ libre, pas un champ d'un rang qu'on plie** — `.fld-adr` + `champGrandit`, Entrée fait un retour à la ligne, le collage garde sa forme. L'adresse postale est le cas : le GOV.UK Design System et le DWP disent pourquoi — un champ libre « gère n'importe quel format, permet le copier-coller, et évite à l'utilisateur de deviner quelle partie va dans quelle case ». Son seul défaut déclaré, **on ne peut pas en extraire les sous-parties**, est ce qui décide : ici `address` est une chaîne unique que l'app ne découpe jamais, donc il ne coûte rien. Découper en rue / code postal / ville — l'autre réponse standard — ajouterait trois champs, une clé nouvelle et une migration, pour des morceaux dont personne ne se sert. **Trois conséquences, toutes dans le moteur** : la ville se lit sur la DERNIÈRE ligne (`extractCity`), ce qui sort vers un service tiers se replie par une virgule (`surUnRang` — un `%0A` ne se géocode pas), et l'affichage garde les lignes (`.fk-lignes`, `white-space:pre-line`) sans quoi le HTML les replie et le champ libre ne sert à rien. **La hauteur de départ enseigne le format** : deux lignes au repos disent « tu peux aller à la ligne » sans une phrase de plus |
| Montrer une valeur qu'on ne peut pas changer | `.fld-ro` — le libellé du champ, la valeur en texte. **Ni bordure ni relief** : ce qui se tape a un cadre (§6, sobriété 3). Et **un choix à une seule option n'est pas un choix** — le menu devient cette ligne, on lit à qui on écrit, le contrôle part |
| Trier une liste | `ui/sort.js` — critère + bascule ↑↓ ; re-tap du critère actif = retour au défaut de l'écran |
| Filtrer + trier ensemble | `ui/affiner.js` — une feuille, un compte dans le bouton (`Affiner ③`) **sur une page** ; dans la barre d'une liste à cocher, l'entonnoir prend l'accent et se passe du chiffre — deux compteurs dans une rangée de trois segments, c'est du bruit qui change de largeur à chaque tap. **Un tap ajoute, un re-tap retire** : plusieurs valeurs d'une même famille cohabitent. Dans UNE famille elles s'additionnent (« cyber ou cloud »), d'une famille à l'autre elles se croisent (« … et en cours ») — c'est ce que dit la phrase à voix haute, donc rien à expliquer à l'écran. Chaque valeur retenue porte SON étiquette sous la recherche : n'en montrer qu'une ferait croire que l'app a perdu des pistes |
| Commander une liste à cocher | `barreListeHTML` + `bindBarreListe` (`ui/affiner.js`) — **UNE rangée, et le CHAMP y domine** : `[tout cocher] [recherche] [Affiner]`, sans un seul chiffre — la case pleine ou vide dit « tout ou pas tout », l'entonnoir en accent dit « ça filtre », et **ce qui se compte se compte là où l'on décide** : dans le pied, à côté de l'action. Un compteur dans la barre change de largeur à chaque tap, donc la rangée bouge sous le doigt. Le champ prend ~70 % de la barre, jamais moins : sous ~24 caractères il ne se lit plus comme une recherche mais comme un champ coincé entre des boutons (NN/g en demande ~27). **C'est de l'arithmétique, pas du goût** — à 360 px on a 324 px utiles et toute cible fait 44 px, donc la barre tient le champ plus DEUX commandes, jamais trois. La case se passe du mot « Tout » parce qu'elle tient l'axe des cases de la liste, et son compte n'apparaît que lorsqu'on a écarté quelque chose — l'encre va à ce qui change. À texte doublé la barre se replie (WCAG 1.4.10). Employée par les trois feuilles qui choisissent des pistes : Donner, Prospecter, partage en groupe |
| Une liste qui remplit une feuille | **l'action va dans le PIED, jamais au-dessus de la liste** (`setFoot`). C'est §5 appliqué à la lettre, et ça se paie deux fois si on l'oublie : « Donner » posait ses deux canaux dans le corps, à ~17 % de la hauteur, et avait dû inventer un **pli** pour les dégager — un pli qui coûtait ensuite 50 px au champ de recherche. Descendue dans le pied, l'action n'est plus jamais enterrée, le pli n'a plus d'objet, et l'état qui l'accompagnait disparaît. **Un contrôle qui existe pour réparer un mauvais placement se supprime en corrigeant le placement** |
| Un geste qui CHANGE des données (restaurer, effacer, rompre, retirer, réinitialiser) | **un bouton, jamais un lien** — une rangée `.pick` s'il vit dans une liste, un `.btn-sm` taillé à son mot s'il est seul. Un lien EMMÈNE, un bouton AGIT (NN/g) : « Restaurer une copie », « Effacer cet appareil », « Rompre le lien » vivaient en mots soulignés, c'est-à-dire sous la forme qui promet d'aller ailleurs, pour les gestes les plus lourds de leur écran — le mainteneur l'a vu sur son téléphone. **Le destructif** est un `.pick-danger` en liste, un `.btn-danger` seul : pictogramme ET mot (une icône destructive ne se devine pas, elle se lit), rouge, dans **son propre groupe** (`.pick-sortie`, 16 px au-dessus), en dernier, jamais comme action principale (Apple ; GOV.UK réserve son bouton d'alerte à l'irréversible). Le `.linklike` reste à ce qui emmène ailleurs ou déplie : « Code oublié ? », « Compléter mon profil », « Voir les N autres ». Et un geste lourd sur une LIGNE (un appareil) ne s'y pose pas en icône nue : la ligne s'ouvre (chevron), et ses gestes vivent nommés dans sa feuille. Gardé par `e2e-appareils.mjs` |
| Livrer un écran en test | `lot('id')` (`ui/state.js`) sur un drapeau du registre `engine/drapeaux.js`, avec sa date de retrait — jamais `S.preversion` lu dans un écran (§0, « Le recadrage ») |
| Déplacer un écran | le registre `engine/destinations.js` : la nouvelle destination, et l'ANCIENNE adresse en alias — une adresse donnée (favori, lien collé, écran d'accueil) mène toujours quelque part, et la barre d'adresse est réécrite sur place |
| Supprimer au geste | `bindDeleteGesture(node, onDelete)` — glisser (mobile) / poubelle au survol (desktop), doublé d'un `showUndo` |
| Un journal, un historique | il RACONTE ce qui est fait : poids de texte courant, jamais le gras d'un titre — deux ou trois niveaux au maximum sur un écran (NN/g, poids visuel), et le journal vient toujours après les gestes qu'il surplombe |
| Choisir parmi 2-5 options | `pick-list` / `.pick` — **UN cadre, des rangées sans relief**, séparées d'un pointillé : la forme de « Réglages » et de « Modèles d'emails ». Plus de pile de briques pleine largeur (voir « La taille dit le rang », sous la table). Une option ne porte pas de sous-titre qui l'explique ; à droite, au plus un état d'un mot ou un chiffre |
| Choisir UNE valeur parmi deux ou trois (un réglage) | `choixHTML(options, actuel)` (`ui/dom.js`) — les rangées d'une liste d'actions dans un cadre, une coche d'accent au bout de la retenue (`role="radio"`), le choix appliqué au tap sous les yeux. La forme des réglages d'iOS et d'Android. Pas la liste à cocher (`.pk`) : une seule valeur à la fois, et ses fiches encadrées faisaient trois briques pour trois mots (13 octobre 2026). Employé par « Thème » et « Demandes de mes amis » |
| Choisir un attribut court | `.datechips` + `.dchip` — **à plat** : un trait, pas de relief (Material dessine la puce de filtre à plat ; l'élévation est pour une puce posée sur une image), et le relief revient à l'appui. La puce fait la taille de son MOT (`flex:0 1 auto`) et le groupe se replie par rangs. Jamais une liste déroulante : on ne cache pas un petit jeu d'options |
| Choisir une date | chips « Demain / +3 j / +7 j / Lundi » + date précise validée par OK (jamais de fermeture sur `change` seul — roue iOS). **Quand une réponse est conseillée, elle tient le pied** : après un envoi, « Dans 7 jours » (`SILENCE_RELANCE`) sous le pouce, les puces pour un autre jour, la croix pour ne rien prévoir |
| Rappeler une prochaine action | la case « Me le rappeler dans mon agenda » des feuilles de date (`ouvrirAgenda`, `ui/actions.js`). Une app web ne sonne pas sans serveur (§10) ; l'agenda du téléphone, si. **La forme suit l'appareil, elle ne se demande pas** (`formeAgenda`, `engine/agenda.js`) : un `.ics` pour l'agenda d'Apple, un lien Google Agenda ailleurs — Android n'ouvre pas un `.ics` sans app tierce. Appelé DANS le geste qui choisit la date, sinon le navigateur bloque. La case se souvient (`flags.rappelAgenda`) |
| Confirmer un geste risqué | `confirmSheet` (danger = `btn-danger`). **Une porte se décide** : elle ne se justifie que si elle montre ce qu'on ne peut PAS deviner (« ce fichier contient 12 pistes, tu en as 3 »). Une question dont le message dit qu'il n'y a rien à perdre ne protège personne |
| Geste lourd réversible | `showUndo(msg, onUndo)` — barre Annuler ~30 s. **Il remplace la confirmation**, il ne s'y ajoute pas : demander ET offrir d'annuler, c'est payer deux fois. Feuille ouverte, la barre se pose **en haut**, comme le toast : en bas, elle couvrait le pied de la feuille, là où le pouce cherche « Enregistrer » |
| Demander un mot de passe **facultatif** | `lockRowHTML` + `bindLockRow` — au repos un bouton compact « Chiffrer » au bout de la ligne d'action ; tapé, il **s'étire en champ sur place** et l'action voisine se serre. **La ligne ne change pas de hauteur** : rien ne pousse ce qui est dessous. `value()` rend `''` serrure fermée, donc l'appelant n'a jamais à connaître l'état ; refermer **oublie** ce qui était tapé |
| Dire ce qui a changé sans qu'on regarde | `annoncer(msg)` — une phrase dans la région vivante de la coque. Les appels se regroupent sur 60 ms et **la dernière gagne** : un geste produit souvent deux annonces (le décor qui suit, puis la conséquence), et c'est la conséquence qu'on garde. Deux fois la même phrase repasse par le vide, sinon elle n'est pas relue |
| Envoyer un texte à quelqu'un d'autre (une invitation, son profil) | `boutonEnvoyer(texte, {classe, id})` (`ui/fichier.js`) — au doigt, là où le téléphone sait partager, « Envoyer » ouvre SA feuille de partage : on choisit la conversation, et c'est parti, là où « Copier » laissait trois gestes (ouvrir l'autre app, coller, envoyer). Ailleurs, « Copier », qui devient « Copié » sur place. Renoncer ne fait rien ; un refus retombe sur la copie. **Le mot dit ce qui va se passer** : pas d'« Envoyer » là où rien ne s'envoie. C'est le geste du diagnostic (`ui/diagnostic.js`) rendu à tous les textes qu'on tend |
| Retour discret | `toast()` — **seulement si son message n'est PAS déjà à l'écran** (voir la règle sous la table). Court, ponctuel, jamais deux phrases. Un tiret cadratin au maximum, et ce qui le suit doit être un **geste** (« — passe par le fichier »), jamais un rassurement (« — tout est revenu comme avant ») |
| Marquer partagé vs privé | `tag-share` / `tag-priv` |
| Montrer qu'une ligne **vient de changer** | `montrerChange(id)` — un lavis d'accent, une fois, ~900 ms, sur la seule ligne concernée et seulement si elle est à l'écran. Pour des CHAMPS que l'app vient de remplir, `montrerRemplis(champs)` : le même lavis sur chaque `.field` rempli, et sur lui seul. Ce n'est **pas** le langage d'urgence : `mark-*` reste à ce qui réclame une action |
| Dire qu'un état **réclame quelque chose** | `.mark` + un cran : `mark-late` · `mark-now` · `mark-soon` · `mark-far`. **Un seul langage d'urgence dans toute l'app**, échelle monotone, et **ce qui ne réclame rien n'affiche rien** — c'est le vide en face qui fait ressortir le reste. Un cadre entier peut prendre le bord ambre (`.fset.fs-alert`) quand son état peut tout coûter |
| Mener à un ensemble de pistes | `ouvrirSur(texte)` (`ui/pistes.js`) — « Mes pistes » s'ouvre sur une recherche toute faite, comme si on l'avait tapée : ses étiquettes disent ce qu'on regarde, et leur croix revient à tout. Le filtre d'« Affiner » tombe (il retirerait des pistes que le lien a comptées) et la liste part du haut. Jamais `location.hash = '#/pistes'` derrière un lien qui nomme un ensemble |
| Chercher | `filterCompanies({q})` / `filterOrphans` — les accents se plient dans les deux sens et **chaque mot se cherche pour lui-même** (tous présents, ordre libre). « / » ouvre le champ, Échap le vide |
| Comprendre ce qu'on tape | `chercherPistes` (`engine/requete.js`) — la requête devient des **étiquettes** : poste, métier, lieu, état, groupe ; le reste reste du texte. **Une table, pas une IA** (`engine/lieux.js` pour les villes, départements, régions). Quatre règles, tenues par cent phrases dans `tests.js` : ① mieux vaut ne pas comprendre que mal comprendre — « Orange » reste du texte, et le PRÉCIS aussi (« pentest », « SOC » sont des technos, pas tout le secteur) ; ② aucun mot perdu — ce qui ne cherche rien est un mot de liaison (« à », « chez », et ce qui décrit l'étudiant : « BTS SIO ») ; ③ une étiquette ne perd jamais ce que le texte trouvait, sauf un **numéro** (« 59 » n'est plus un bout de téléphone) et un **état** (« réponse » n'est pas un mot de note) ; ④ ce qui correspond pleinement passe devant, et **la raison se lit sur la ligne** (« Léa y a été en alternance », « prend des alternants »). **Tout mot que l'écran affiche se cherche** (« sans nouvelles », « à planifier », « Relancer »). Une étiquette se tape pour se retirer, avec son mot de liaison : la barre et les étiquettes ne se contredisent jamais. **Les étiquettes sont des boutons texte, sans boîte** *(13 octobre 2026 : « les paramètres qui se rajoutent quand on entre un mot prennent trop de place »)* : leur icône, leur mot, leur croix, en police de texte — trois boîtes mono de 44 px débordaient l'écran dès la troisième ; en texte, trois tiennent sur 390 px. Elles ACCOMPAGNENT la barre — ce sont des filtres posés, pas des gestes : elles restent du texte, leur cible reste de 44 px. **Une faute de frappe se PROPOSE** (« Lile » → « Lille ? » en pointillé, Damerau-Levenshtein : une faute dès quatre lettres, deux dès huit), jamais appliquée, et pas pour un mot qui trouve déjà une piste (`correction`). **Proposé en pointillé, posé en plein** : la barre vide propose des recherches qui ont une réponse (jamais zéro), une ville propose son département, le vide propose ce qu'on retrouverait (« Sans « Lille » · 4 »). Au poste, le clavier suffit — ↓ ← → suivent le tableau, Échap remonte, Entrée ouvre la carte qui porte ↵. Gardé par `e2e-recherche.mjs` |
| Découvrir dans l'annuaire | `ui/decouvrir.js` + `engine/annuaire.js` — **un onglet de texte sous la barre** (« Mes pistes · À découvrir N »), ce que l'annuaire public des entreprises (data.gouv.fr, sans clé ni compte) connaît et que tu n'as pas. L'onglet est là avant d'avoir servi, son compte se remplit pendant la frappe, et rien ne part au démarrage : sans recherche, c'est le tap qui pose la question par défaut. **La question part seule après une pause, mais n'emporte que ce qui décrit une entreprise** : métier en codes d'activité, lieu, taille, mots qui peuvent nommer une entreprise. **Jamais** un mot d'un contact, de tes notes ou de ton historique, un prénom du groupe, ton profil, l'état de tes pistes — et une question vidée par ce tri ne part pas (`e2e-decouvrir.mjs` lit chaque requête). **Les employeurs d'abord, jamais une personne** : les entrepreneurs individuels ne se demandent pas, une question jumelle va chercher les 10-499 salariés, un métier tapé en texte (« cyber ») ne demande que des employeurs de dix salariés et plus, et ta zone (le département où tu as au moins deux pistes) se pose d'office, **en étiquette avec sa croix** — retirée, elle revient en pointillé (`e2e-classement.mjs`). **Une ville, c'est autour d'elle** : son centre vit dans `engine/lieux.js` (hors ligne), la question part autour du point (15 km) et ce qui tombe à plus de 30 km est écarté — « Lille » rendait Maubeuge (`docs/utile.md`). **Qui recrute** : pour une alternance, un lien « Offres d'alternance autour de … » vers La bonne alternance SUIT la liste — on regarde d'abord les entreprises ; son API refuse toute page, son site s'ouvre d'un lien. Une entreprise = une ligne : ce qui est déjà dans tes pistes ne se redit pas (SIREN, nom, sigle). **Aucun bouton dans la liste** : la ligne ouvre l'aperçu, dont le pied porte « Ajouter à mes pistes » + Annuler ; la ligne ajoutée reste à sa place et le dit (`✓ dans tes pistes`) — aucune personne importée d'office. L'aperçu dit qui, quoi et où, puis comment y entrer, en **liens** ; le reste en gris. Au pouce l'aperçu est une feuille, au poste il vit à côté de la liste (liste-détail, ↓ ↑ depuis la barre). Chaque état se dit et se répare : hors ligne, panne (« Réessayer »), limite de débit (429, relevée en vrai : une seconde tentative, puis « très demandé »). Ce que l'API rend a été **relevé** (`sonde-annuaire.mjs`, `sonde-classement.mjs`, en CI), jamais supposé. **Le profil ajoute ce que la barre ne dit pas** (`ajoutsProfil`, `docs/recherche-profil.md`) : ta ville et ton rayon (« Autour de »), le métier de ta formation — chacun en ÉTIQUETTE avec sa croix, retirée elle revient en pointillé ; ta ville passe devant ta zone, un nom tapé n'est jamais bridé par un métier, et seul le CENTRE part. **« Pas pour moi »** (dans l'aperçu, ou au glissé — le motif de la suppression avec SON mot) écarte pour de bon, dans le profil ; **« nouveau »** ne marque rien la première fois (`oc_vus_v1`, cet appareil) ; **« ta formation »** ne s'écrit que si elle départage. La ligne de marché (BMO 2026) est partie le 7 octobre : elle n'aidait à choisir aucune entreprise ; la table reste dans `engine/marche.js`. **Sous une barre vide, rien** : ni « Tape un métier et une ville », ni source, ni propositions de tes pistes (`e2e-mesure.mjs`) |
| Enrichir une fiche depuis une source publique | `ui/fiche-annuaire.js` + `ui/nom-annuaire.js` — **la carte, et rien autour** (minimalisme, 7 octobre 2026). Ce que les sources savent se LIT dans la carte en tête de « À savoir » ; plus un lien ni un bouton autour — « Trouver dans l'annuaire », « C'est laquelle ? », « Compléter ma fiche », « Anciens de mon école », « Offres d'emploi », « Fiche officielle », « Réessayer » sont partis. **L'entreprise se reconnaît pendant qu'on tape son nom** (capture et « Modifier ») : après une pause, à partir de trois lettres, la question ne porte que le nom tapé et le département de la ville ; la liste dit la ville et la taille en mots, jamais un code, ni personne ni association ; choisir remplit les VIDES sous les yeux — chacun s'éclaire un instant (`montrerRemplis`) et se dit à un lecteur d'écran, comme le compte des entreprises proposées (le composant de GOV.UK) — et « Enregistrer » attache le SIREN. **Trouver quelqu'un à qui écrire se fait dans « Ajouter un contact »** : le dirigeant y est proposé en pointillé (un tap remplit nom et rôle, rien sans « Enregistrer »), « Trouver sur LinkedIn » à côté du nom. **« À savoir » n'existe que s'il a quelque chose à dire** (ce que tu as écrit, ou la carte) : avec un SIREN il est posé caché et se montre sur la réponse, **sans redessiner la fiche** — sinon il vole le curseur à qui écrit ses notes. Une piste qui porte un SIREN se relit par ce SIREN seul, à l'ouverture, une fois par session ; une panne ou l'absence de réseau ne se disent pas, la carte revient avec lui (`e2e-enrichir.mjs`) |
| Montrer une entreprise | `carteHTML` + `suivreCarte` (`ui/carte.js`) sur `carte()` (`engine/carte.js`) — **la même carte** dans l'aperçu de « À découvrir » et dans « À savoir ». **Une valeur par fait, la meilleure source** : ta phrase, puis Wikipédia, Wikidata ; l'annuaire pour l'entité ; le BODACC pour la seule chose qui réclame quelque chose (une procédure collective, posée EN LIGNE à côté du lieu ou du nom). **Trois lignes qui aident à CHOISIR**, toujours dans cet ordre (retour du mainteneur, 6 octobre : « la carte ne m'aide pas à choisir ») : les **missions** en mots simples, traduites du code d'activité (`TRAVAIL`), et « colle à ta formation » en accent quand elles rejoignent le métier que dit ta formation ; la **taille** en mots ; **à qui écrire** — le dirigeant d'une PME par son nom, le recrutement d'une grande, et la recherche LinkedIn qui trouve la personne (aucune adresse devinée). La création et le nombre de sites sont partis : ils ne départagent rien. **Puis trois lignes qui disent sa SANTÉ et ce qui BOUGE** *(13 octobre 2026 — « À découvrir est encore trop gadget, plus d'infos sur elle »)*, chacune muette quand elle n'a rien de sûr : **Comptes** (le chiffre d'affaires en mots et ce qu'il dit — *bénéficiaire* ou *en perte* —, l'année la plus récente, jamais plus de trois ans), **Récemment** (deux événements du BODACC sur deux ans : établissement ouvert, activité rachetée, fusion, direction qui change, siège déménagé — règles prudentes, une vente n'est un rachat que si elle n'est pas l'ancien propriétaire), **Égalité** (la note de l'index femmes-hommes, Egapro, demandée seulement quand l'annuaire la dit déclarée). Dans la fiche, « à qui écrire » n'est plus dans la carte : le dirigeant se propose dans « Ajouter un contact ». **Aucun bouton** : on la lit ; le seul lien mène à la personne. La ligne de source ne cite que celles qui ont parlé. Wikidata, le BODACC et Egapro reçoivent le SIREN, Wikipédia le titre, le logo vient sans référent, seulement pour l'entreprise qu'on regarde ; au poste, l'aperçu attend que la ligne soit posée. Ce qui ne départage rien pour un étudiant (convention, labels, capital) est laissé de côté exprès (`docs/carte.md`, `docs/utile.md`, `e2e-carte.mjs`). **La taille est celle du SITE qu'on rejoindrait** quand l'INSEE la sait (« 6 à 9 salariés ici · 500 à 999 en tout ») ; pour une alternance, **l'aide à l'embauche** que l'État verse à cette entreprise (décret 2026-168) — rien plutôt qu'un montant faux ; le site vient de Clearbit quand Wikidata n'en a pas, par le NOM exact et une extension générique ou française (`lireClearbit` : 12 bons sur 20, aucun faux) |
| Expliquer un résultat | `searchHint(c, q, {skip})` → `.ri-hit` + `<mark>`. Le moteur rend l'extrait ET les positions, jamais du HTML. La ligne ne parle **que** si ce qu'elle affiche déjà ne répond pas — l'appelant dit ce qu'il montre (`skip`), et rien ne se dit deux fois |
| Apprendre en faisant (un nouveau venu) | « Premiers pas » (`premiersPas`, `engine/assist.js` ; `ui/today.js`) — **trois cases qui se cochent SEULES**, dans l'ordre où elles se font : « Remplir mon profil » (le nom, la formation, ce que tu cherches — ce dont le premier mail a besoin), « Ajouter une piste », « Écrire mon premier mail ». Une liste ordonnée dans UN cadre : ce qui reste se tape (chevron) et mène là où il se fait, ce qui est fait se coche en accent et se tait (« : fait » pour un lecteur d'écran), le mail attend qu'il y ait une piste. Sans piste, la liste **prend la place des gestes de l'accueil** (« Voir un exemple » reste) ; ensuite elle est la première tranche (« Premiers pas 2/3 »), jusqu'au **premier mail parti** (`appliedAt`, ou une piste qui a quitté « À contacter » — qui écrit depuis sa propre messagerie a écrit ; une piste abandonnée sans un mot ne compte pas) — le composeur refuse un mail à trous, donc ce mail-là suppose le profil rempli, et la tranche ne revient jamais. Rien n'est stocké, tout se déduit ; les pistes d'exemple la font taire. Idée 6 de la page de concept (13 octobre 2026). Gardé par `e2e-premiers-pas.mjs` |
| Proposer un filtre | `.fl-chip` + son **compte**. Ne jamais offrir une valeur absente des données. Liste fermée (statuts) : la puce reste, éteinte. Liste ouverte (domaines) : elle disparaît, sauf si le filtre est actif |
| Note contextuelle | `<p class="hint">` (+ `warn` si alerte) |
| Aligner les valeurs d'une LISTE | **le critère d'abord** : une valeur répétée doit garder un bord STABLE — le gauche si elle est calée à gauche, le droit sinon (NN/g, *The Anatomy of a List Entry* : une liste se balaie, l'œil descend une colonne). Exiger « tout est aligné » serait faux — une sous-ligne qui s'élide a un bord droit qui varie. **Un `min-width` n'est PAS une colonne** : c'est un plancher, la rangée se dimensionne toujours seule, et la colonne souple n'absorbe l'écart que jusqu'à toucher SON plancher — passé là, tout ce qui suit dérive. La cause est presque toujours qu'une valeur partage sa boîte avec un voisin de longueur variable : le remède est de raccourcir le voisin (`canalCourt`), pas de choisir une largeur. **`subgrid` a été essayé et RETIRÉ** — voir l'annexe : il alignait tout et il a cassé l'app sur un vrai téléphone. Une largeur fixe marche aussi, mais elle ne RENTRE pas toujours : au fil, réserver 6,25 rem au compte chasse le chevron sur un second étage sous 390 px, mesuré sur toutes les combinaisons de colonne, de date et de gouttière. Quand l'arithmétique refuse, la limite s'ASSUME et se nomme dans `e2e-colonnes.mjs` avec sa raison |
| Décrire une piste dans un TABLEAU | trois lignes au maximum — nom, sous-ligne, action. Material 3 plafonne un élément de liste à trois lignes de texte ; au-delà c'est une carte à média. La carte du poste en empilait quatre, la quatrième étant le compte de personnes SEUL sur son rang, pendant que la ligne au pouce disait la même piste en une sous-ligne — on réapprenait à lire une piste en changeant d'appareil. **Et l'ordre décide de ce qu'on perd** : la sous-ligne s'élide par la fin, donc le compte de personnes passe avant le domaine — c'est le secteur qu'on peut perdre, jamais le nombre de gens joignables |
| Décrire une piste dans une liste à cocher | **le nom plie, la sous-ligne s'élide** — dans une liste où l'on COCHE, un nom amputé n'est pas un défaut d'esthétique mais une erreur de décision : « Société Générale G… » ne se distingue plus de son homonyme. Trois rangs, la même valeur et la même raison que `.row-item h3`. Et **une seule sous-ligne pour les trois** (Donner, Prospecter, partage en groupe) : `statut · ville · qui est visé`. Elles en donnaient trois versions ; on réapprenait à lire une piste en passant d'une feuille à sa voisine. La ville n'est pas décorative — deux pistes du même statut ne se distinguent souvent que par elle |
| Multi-sélection | `.pk` avec icônes checkbox — **jamais pour supprimer**. **Le coché ne porte aucun aplat** : la carte reste entière, l'état vit dans la case (voir §4). Un seul état de plus, `pk-inverse`, et seulement là où la liste part de « tout coché » (Donner, partage en groupe, « → qui » en mode *donner*) : la ligne **écartée** se dithère, parce que là une ligne non cochée n'est pas « pas encore choisie », elle est SORTIE. Ailleurs cet état n'existe pas — c'est un état en moins, pas une inégalité. **Généraliser la trame a été demandé, mesuré, refusé** : sur une liste qui part de rien coché, elle s'applique à TOUTES les lignes à l'ouverture et l'écran se lit « rien n'est disponible » au moment précis où il doit inviter à choisir. Deux sources le disent — le grisé est la convention universelle de l'INDISPONIBLE (NN/g), et Material 3 demande que la distinction vienne de ce qui est **retenu**, jamais de l'affaiblissement du reste |
| Choisir qui part / qui est visé | `ui/qui.js` — la ligne « → qui » et sa sous-feuille à cocher |
| Supprimer un élément | glisser (mobile) / poubelle au survol (desktop) + `showUndo`, sans confirmation |
| Fermer une barre transitoire | balayer (mobile) / `✕` (desktop) |
| Contenu secondaire | `<details class="pcard pcard-details">` replié |
| Une page = un objet et ses réglages | en-tête `.obj` (icône en haut à gauche + nom) puis des cadres `.fset`. **Le cadre est lourd : deux par écran au maximum, jamais s'il contiendrait tout l'écran.** Ailleurs, `pcard` reste la règle |
| Recevoir des données | TOUJOURS l'aperçu avant fusion (`mergePreviewInto`) — mêmes règles quel que soit le canal |
| Demander à ses amis | `ui/reseau.js` + `engine/boite.js` — **là où l'on est déjà, et seulement quand ça sert** (docs/reseau.md, lot 3). **Sur la fiche, dans « Contacts »** *(12 octobre 2026 : le geste flottait sous le nom de la piste, loin de la section où se voit le manque qu'il comble)* : « Demander à mes amis », une ligne en pointillé sous la liste — là où la personne trouvée prendra sa place (un état vide pose son action dans l'élément qui recevra le contenu : Carbon, Ripple) —, seulement pour une piste ouverte où personne ne peut te porter, sans personne à qui écrire, avec au moins un ami qui a une boîte ou un groupe, et moins de trois demandes ouvertes. Sous le nom ne reste que l'atout : qui peut te porter. La feuille montre la phrase EXACTE et à qui (`.gr-mot`, `.dm-qui`) ; partie, la demande devient une CARTE dans « Contacts » *(lot F3a, 14 octobre 2026)* — sa phrase, à qui, et trois étapes suivies comme un colis : Envoyée, Trouvée, Reçu, en barres de progression 98 (faite pleine et datée, en cours à moitié, à venir vide ; trois colonnes ou une pile, jamais deux puis une) ; un fait, rien ne s'y tape. La même carte dans « Amis » pour une demande par métier et ville (`carteDemandeHTML`, `suiviDemande`). La phrase dit ce qu'on cherche (« … pour une alternance », le mot du profil) : l'ami sait qui présenter. Chez l'ami, « Tes amis » passe en TÊTE d'« Aujourd'hui » (quelqu'un attend, 14 jours) — et n'existe que si son téléphone a trouvé quelqu'un (règle 6 : rien chez qui ne trouve rien). Il voit ce qu'il donnerait avant de le donner : un seul contact se LIT, « Donner » tient le pied ; plusieurs, le premier est choisi d'office. Le contact donné arrive PROPOSÉ dans « Contacts » — en pointillé d'accent, comme le dirigeant de « Ajouter un contact » : proposé en pointillé, posé en plein — et dans « Tes amis » ; un tap ouvre son aperçu (« Contact », qui te l'a donné en tête), « Ajouter à la piste », `showUndo` ; le merci part tout seul, un par demande. Un ami sans boîte (QR d'avant 6.55) n'est jamais destinataire ; sa fiche dit « Rescanne son QR ». Le transport : une boîte aux lettres sur les relais, scellée pour un seul destinataire (ECDH P-256 + AES-GCM, clé jetable par lettre), relevée à l'ouverture si l'on a donné son QR. **Les sauts (lot 4b)** : qui ne trouve rien ne voit rien, et son téléphone fait SUIVRE la demande à ses amis — d'abord, et seulement, à ceux dont le parcours touche l'entreprise (Watts, Dodds et Newman ; Adamic et Adar), sinon à tous, vingt au plus —, jusqu'au troisième cercle. Chaque maillon ajoute un jeton scellé pour le maillon d'avant : qui demande lit « par Léa », jamais le nom d'après ; chez qui trouve, « Tom, par Karim, cherche quelqu'un ». **Prévenu tout de suite** : dès qu'un téléphone trouve, l'étape « Trouvée » se remplit (« chez un ami de Léa », la ligne PLIE pour garder le prénom) et « Reçu » passe en attente — le contact suit le OUI de qui l'a, et se propose juste sous la carte. Ajouté, il garde qui l'a donné (`via`, privé) : le premier mail s'ouvre sur « Karim m'a conseillé de vous écrire. ». **Présenter au lieu de donner** *(lot F3b)* : chez l'ami, sous le contact, « Julie est d'accord » (une case) et « Lui demander » (un lien vers son mail ou ses SMS, le message prêt, sans un pronom) ; cochée, le geste devient « Présenter Julie », et chez qui demande l'aperçu dit « Julie est d'accord » et le mail « Karim vous a parlé de moi. ». Qui Y EST répond « Tom peut m'écrire » (son nom et son e-mail, rien d'autre). Le merci remonte toute la chaîne, sans le nom de qui était au bout. **Un métier et une ville** (« cyber Lille ») se demandent depuis l'onglet Amis quand la barre les a compris — seuls les mots de la table partent ; la piste naît chez qui demande quand le contact arrive. Réglages : « Demandes de mes amis », pour ne plus servir de chemin. Gardé par `e2e-demande.mjs` (joué à trois), `e2e-sauts.mjs` (joué à quatre) et `e2e-suivi.mjs` (la carte), la fuite d'abord |
| Les conversations | `ui/conversations.js` + `engine/conversations.js` — **une boîte, comme toutes les messageries** *(retour du mainteneur, 13 octobre 2026 : « faire exactement comme les messageries traditionnelles, mais attention à la sécurité »)*. Les groupes et les amis s'écrivaient à trois endroits — une porte par groupe dans « Échanger », « Écrire à Karim » derrière sa fiche dans « Amis », « t'a écrit » dans « Aujourd'hui » ; ils s'écrivent dans UNE liste, en tête d'« Échanger » (docs/reseau.md, décision 37). Chaque rangée : un visage (`ui/visage.js` — des pixels tirés de l'identifiant d'un ami, le même partout ; les initiales d'un groupe sur le gris du châssis, jamais le navy), le nom (il plie), le dernier message (une donnée : il s'élide), l'heure, et ce qui n'est pas lu — le gras et un chiffre en accent, rien quand il n'y a rien. La plus récente en haut, les épinglées avant tout (cinq au plus). **L'onglet porte le nombre de CONVERSATIONS qui attendent**, pas de messages, et le dit à voix haute (« Échanger, 2 conversations non lues ») ; une conversation dont on a coupé le son n'y entre pas — c'est à ça que sert de le couper — mais garde son chiffre sur sa ligne. « Aujourd'hui » porte de même ses actions du jour. Appui long, clic droit : « Épingler », « Couper le son », « Marquer comme lu » (`appuiLong`, `oc_fils_v1`). Les filtres de WhatsApp — Tout · Non lus · Groupes · Amis — à partir de quatre conversations, en liste fermée : un filtre vide reste, éteint. **Une conversation s'ouvre là où l'on s'était arrêté** (`ui/fil.js`, Slack, Discord) : la ligne « 3 nouveaux » avant le premier message neuf, l'ouverture posée sur elle, et « ↓ N nouveaux » tant qu'il en reste sous le bord. Au pouce une rangée ouvre sa feuille ; **au poste, la conversation se pose à droite de la liste** (`openSheet({dans})` : ni voile, ni historique, ni piège à focus), ↑ ↓ passent de l'une à l'autre, le changement s'annonce, et un nouveau rendu de la liste ne la sort jamais du document — elle perdrait son champ, son focus et son défilement. En dernier, en encre sourde : « Écrire à un ami », « Nouveau groupe ». Vide, le cadre dit ce qu'il recevra (« Tes groupes et tes amis apparaissent ici. »). Le fil des échanges de pistes devient une ligne, « Historique », qui ouvre sa feuille. **Dans une conversation (lot F2)** : le jour se dit UNE fois, sur sa ligne (« Hier », « Aujourd'hui », « Lundi »), chaque message ne porte que son heure (`ligneJour`, `ui/fil.js`) ; qui écrit dans un groupe a son visage devant son prénom, et « Membres » aussi. **Un lien se tape, et seulement sur un tap** (`engine/liens.js`) : http et https seulement, `noopener noreferrer`, la ponctuation reste à la phrase, une adresse qui cache un nom avant « @ » reste du texte, un domaine en lettres non latines se lit en punycode — l'usurpation se voit. **« @Karim » nomme Karim** : la mention se DÉDUIT du texte à l'envoi (`citesDe` — un mot entier qui commence par l'arobase, deux homonymes sont prévenus tous les deux) et part avec le mot, en identifiants ; « @ » ouvre les prénoms au-dessus du champ, un tap l'écrit. Chez Karim, la bulle porte un liseré d'accent, et **la mention perce le silence** : un groupe dont il a coupé le son compte quand même dans l'onglet, l'arobase le dit sur sa ligne (Slack, Discord, WhatsApp). Au poste, « Écrire à Karim » mène à SA conversation dans la boîte quand elle existe — un seul endroit pour une conversation. Copier un message : la sélection du système le fait déjà, rien ne s'y ajoute. **Ce que la boîte ne fait pas, exprès** : ni « vu », ni « en train d'écrire », ni aperçu de lien — les deux premiers disent à l'autre quand tu regardes, le troisième ferait partir une requête vers une adresse qu'un autre a choisie (Mysk, 2020). Gardé par `e2e-boite.mjs` et `e2e-conversations.mjs` (la sécurité des liens d'abord : aucune requête vers eux au moment de lire) |
| Les amis | `ui/amis.js` + `engine/amis.js` — **une liste comme celle des pistes, et ce qu'elle rapporte se lit aussi ailleurs** (docs/reseau.md, lots 2 et 4a). **La liste est la troisième portée de « Mes pistes »** — « Mes pistes · À découvrir · Amis » — parce que des onglets voisins montrent des choses de même nature (NN/g, *Tabs Used Right*) : une ligne par ami, son nom en tête, ce qu'il T'OUVRE en sous-ligne (tes pistes d'abord, en accent ; une piste close ne compte pas). La barre y cherche un nom ou une entreprise (« Thales » trouve Karim), et l'onglet compte pendant la frappe. Le bouton de la barre y devient « Trier » : **« Pour toi »** par défaut (qui porte le plus de tes pistes ouvertes, puis qui y est maintenant), « Récents », « A → Z » (ceux de LinkedIn). Retirer au geste, comme une piste (le glissé avec SON mot, la croix au survol, `showUndo`). Au poste, liste-détail ; la fiche suit le clavier. Le titre de l'écran compte toujours les pistes : ce qui vit au-dessus des onglets ne change pas avec eux. Sans ami, l'état vide enseigne par son titre et ses deux gestes. **On ajoute un ami là où vit la liste** *(12 octobre 2026)* : « Ajouter un ami » la ferme, en pointillé, et ouvre « Mon QR » (son QR, « Envoyer » ou « Copier », « Scanner ») ; pendant une recherche il se tait. « Échanger » ne porte aucun geste d'AJOUT — le QR d'un ami se scanne par « Recevoir », comme tout ce qu'on te tend ; il porte ses conversations, dans la boîte. **Le nom d'un ami ne part jamais vers l'annuaire** (`motsInterdits`), même tapé dans la barre pour le retrouver. **« À découvrir » réchauffé** : une entreprise où un ami est passé remonte en tête et dit qui (« Léa y a fait son stage »), dans la ligne et dans l'aperçu. **Le profil se met à jour tout seul** chez ceux qui l'ont (lettre `maj`, à la relève) — jamais chez un ami qui t'a retiré. **« Mon QR » porte le profil dans l'image** (OCA1, hors ligne) et écrit dessous EXACTEMENT ce qu'il contient — le nom, les entreprises — ; le même profil part en texte par `boutonEnvoyer` (« Envoyer » au doigt, « Copier » au poste) ; sans nom, il ouvre le profil sur le nom au lieu de s'expliquer. **« Scanner » est le scanner de « Recevoir »** : un seul, qui reconnaît pistes, rendez-vous et profil ; ouvert depuis « Mon QR » ou « Rejoindre un groupe », il n'a ni code de rendez-vous ni « Retour », et « Texte » est son chemin sans caméra. **L'aperçu passe avant** (invariant ②) et montre d'abord ce que l'ami rapporte (« dans tes pistes », en accent) ; « Ajouter Karim », puis « Annuler ». **L'amitié est réciproque, obligatoirement** (décision du 7 octobre 2026) : ajouter Karim lui donne ton profil par la boîte aux lettres, sans un geste de sa part — un seul scan suffit. L'aperçu le dit (« Karim aura aussi ton profil. »), la lettre attend la fin de « Annuler » (qui la retient), et chez Karim, Inès entre dans ses amis avec un toast, une fois. Déjà là sans rien de neuf, ou son propre QR : un ÉTAT, pas de bouton. **Ce que ça rapporte se lit là où l'on travaille** : « Karim y est en alternance » dans le bandeau de la fiche (deux personnes au plus, la plus forte d'abord — quelqu'un qui y est MAINTENANT), qui ouvre « Demander à Karim » ; « Karim » dans la barre (`porteurs`, `contexteRecherche`) ; la même ligne dans « Par où commencer ». La fiche d'un ami : ses entreprises, qui mènent à ta piste ou s'y ajoutent d'un tap (« + Piste »), et « Retirer de mes amis » nommé, rouge, en dernier, rattrapable. **Le retrait est réciproque, comme l'ajout** *(13 octobre 2026)* : une lettre `adieu` part par la boîte après « Annuler », et l'ami disparaît aussi de SA liste, sans un message — personne n'annonce qu'on l'a retiré (LinkedIn, Instagram) ; son journal le garde. La lettre porte une PREUVE d'auteur (HMAC sur un ECDH entre la clé privée de qui retire et la clé publique de qui reçoit) : une lettre scellée ne dit pas qui écrit, et la seule qui retire quelque chose chez l'autre ne doit pas pouvoir s'écrire à sa place. **S'écrire** *(6.68, retour du mainteneur du 13 octobre 2026)* : sur une fiche de personne, écrire est LE geste — « Écrire à Karim » tient le pied de sa fiche (au poste, sous son nom, contourné) et ouvre la conversation (`ui/messages.js`, `engine/messages.js`). Sa barre porte son nom, et lui seul ; le fil a le dessin de celui d'un groupe (les miens à droite, en lavis d'accent), sans prénom sur chaque bulle — on n'y est que deux ; au doigt, Entrée va à la ligne et la flèche envoie (Messages, WhatsApp : sur un téléphone on n'a pas de Maj+Entrée sous le pouce), au poste Entrée envoie et Maj+Entrée va à la ligne — jamais pendant qu'un clavier à composition choisit son caractère ; l'heure se dit une fois par salve (elle revient quand l'autre répond, ou après cinq minutes) ; vide, elle dit « Aucun message pour l'instant. ». Ce qui n'est pas lu se compte dans la boîte d'« Échanger » et sur son onglet, comme un groupe (13 octobre 2026 — plus dans « Amis » ni dans « Aujourd'hui » : deux endroits de plus pour la même conversation) ; ouverte, plus rien ne se compte. Le message part par SA boîte, scellé pour lui seul et prouvé de ma clé, comme `adieu` ; sans réseau il reste dans la conversation, « pas encore parti », et repart à la relève suivante. En direct tant que la conversation est ouverte. Ni accusé de lecture, ni « en train d'écrire » : rien ne dit à l'autre quand tu ouvres l'app. Un ami retiré emporte la conversation. Gardé par `e2e-amis.mjs`, `e2e-amis-onglet.mjs`, `e2e-demande.mjs` (retrait joué à trois, lettre forgée à l'appui) et `e2e-messages.mjs` (la conversation, joué à deux, faussaire compris), la fuite d'abord |
| Les groupes | `ui/groupes.js` + `engine/groupe.js` — **une classe, une promo, un club : on s'y écrit et on s'y donne des pistes, sans être là en même temps** (docs/reseau.md, lot 5, décisions 22 à 27). **Un groupe est un CODE**, comme un groupe Signal : un seul PBKDF2 en tire l'étiquette que voient les relais et la clé qui scelle chaque message — ni nom de groupe, ni prénom, ni mot n'y passent en clair. **Il vit dans la boîte d'« Échanger »** *(13 octobre 2026 — « Les conversations », plus haut ; avant, une porte par groupe)* : une conversation parmi les autres, ses initiales, son nom, son dernier message et ce qui est arrivé depuis la dernière fois ; « Nouveau groupe » ferme la boîte, en encre sourde (la ligne « Ajouter un compte » d'iOS), et ouvre « Créer un groupe » ou « Rejoindre un groupe ». Le direct reste dans le code, masqué. **Cinq groupes au plus** (décision 25) : à cinq, « Nouveau groupe » est absent, et une invitation dit « Tu es déjà dans 5 groupes. ». **Entrer** : « Créer » demande un nom, puis le groupe s'ouvre sur son invitation, nommée d'un mot — « Inviter », le libellé d'une section, pas une phrase — : le QR, le code, et `boutonEnvoyer` (au doigt, la feuille de partage du téléphone, donc la conversation de la classe en un geste) ; « Rejoindre » prend le code tapé (tirets et majuscules ignorés) ou le scanner de « Recevoir », qui reconnaît l'invitation (OCG1) — et « Recevoir › Texte » reconnaît le message copié comme le code SEUL (`estCodeTape` : trois blocs de cinq, jamais une phrase) ; AVANT le geste, « Le groupe verra ton prénom : Karim. » ; sans prénom, le profil s'ouvre sur le nom. **La feuille d'un groupe** se donne sa hauteur : les prénoms (« Inès · Karim · toi », qui ouvrent « Groupe » : les prénoms, les réglages chez un responsable, l'invitation, « Quitter le groupe » rouge en dernier, rattrapable, le départ ne se dit qu'après la barre), « Les messages s'effacent au bout de 7 jours. » — la seule phrase, parce qu'elle prévient d'une perte —, le fil (les miens à droite, en lavis d'accent), et le pied : « Donner », le champ, Envoyer. **Une phrase, pas d'image, sept jours par défaut** (décision 27 ; WhatsApp a lancé ses messages éphémères avec cette seule durée), 24 heures ou 30 jours au choix d'un responsable (décision 33). **Donner au groupe** ouvre la liste de « Donner » avec un seul geste au pied ; chez les autres, « 2 pistes » et « Voir » → l'aperçu (« De Inès, dans BTS SIO Lille »), la fusion, « Annuler », puis « dans tes pistes ». Celui qui arrive après trouve les sept derniers jours. En direct tant que la feuille est ouverte, relevé à l'ouverture et toutes les cinq minutes sinon — et seulement si l'on est dans un groupe. **La demande au groupe (lot 5b, décisions 20, 28, 29)** : « Demander à mes amis » la pose AUSSI dans chaque groupe (sans ami, le geste dit « Demander à mon groupe ») ; c'est la même lettre, que chaque téléphone passe au même moteur — sans jamais la faire suivre tout seul : dans un groupe, chacun relaie à son tour. Celui dont le téléphone a trouvé la voit **EN TÊTE**, à son nom (« tu as Julie Marchand », en accent — dans un groupe chacun croit qu'un autre répondra, Darley et Latané ; s'adresser à quelqu'un par son nom, c'est ce qui marche, Fatkin et Lansdown), et « Aujourd'hui » la redit (« Inès, dans BTS SIO Lille, cherche quelqu'un ») ; les autres la lisent dans le fil. « Répondre » ouvre QUATRE rangées, sans celles qui ne servent pas : « Donner Julie Marchand », « Je connais quelqu'un » (un nom et de quoi le joindre, l'erreur sous le champ), « Faire suivre » (à ses amis — le saut du lot 4b — ou à un autre de ses groupes, deux au plus, « relayée par Karim ») et « Masquer ». **La réponse ne passe jamais par le groupe** : elle va à la boîte de qui demande, prévenu dès qu'un téléphone trouve (« Trouvé dans un groupe », sans dire qui). **Le groupe « sur demande » (lot 5c, décision 24)** : « Créer » pose la seule question, une fois — « Entrée : Ouvert · Sur demande » (deux segments), et ce qu'elle change se lit dessous et change avec eux (« Qui a le QR entre. » / « Tu acceptes chaque entrée. »). Son invitation est une **porte** (OCP1) : un QR sans code, que tout membre peut montrer — il ne mène qu'à une demande. Qui la scanne ou la colle lit « Le groupe verra ton prénom : Karim. », puis « Demander à entrer » ; après, « BTS SIO Lille · en attente » dans la boîte, une rangée qui ne s'ouvre pas encore. Chez qui ouvre (le chef et ses adjoints, mêmes pouvoirs) : le chiffre de la rangée compte qui attend, et « Karim veut entrer » passe **EN TÊTE** du groupe, avant l'invitation, avec « Refuser » et « Accepter » ; accepté, Karim entre seul à sa prochaine ouverture (« Tu es dans BTS SIO Lille. ») ; un refus n'écrit rien. « Groupe » dit qui ouvre la porte à côté du prénom (`chef`, `adjoint`, en mono) et, chez un responsable, « Nommer adjoint » sur les autres — rattrapable, la nomination ne part qu'après la barre, signée. **Retirer (lot 5c2)** : chez un responsable, un message se retire au geste — le motif de la suppression, avec SON mot, « Retirer » — et garde sa place : « Retiré par Inès », en gris, sans un mot de ce qu'il disait (WhatsApp montre de même quel admin a supprimé). La ligne d'un autre membre s'ouvre sur ses gestes (§6 : un geste lourd sur une ligne vit dans sa feuille) : « Nommer adjoint », et « Retirer du groupe », rouge, en dernier — jamais le chef, l'ancre des signatures. Les deux se rattrapent et ne partent qu'après la barre. **Retirer un membre change le code du groupe** : le nouveau part par la boîte à chacun des autres, signé, jamais par le groupe que l'exclu lit encore ; lui lit « Tu n'es plus dans BTS SIO Lille. », et le groupe quitte son téléphone. **Les réglages (13 octobre 2026, décisions 31 à 35)** : la ligne des prénoms, toujours en tête du groupe — seul aussi — ouvre « Groupe » (le nom en tête, les prénoms, les réglages, l'invitation, la sortie : les « Infos du groupe » de WhatsApp). Tout groupe neuf a un chef, qui l'a créé ; sa clé de signature part dans l'invitation. Chez un responsable, les rangées des Réglages — **Nom**, **Entrée** (ouvert · sur demande), **Messages** (24 heures · 7 jours · 30 jours), **Qui écrit** (tout le monde · les responsables) — et « Nouvelle invitation » ; les autres membres ne voient pas de réglage, ils lisent leurs effets là où ils servent (la durée dans le fil, « Seuls les responsables écrivent ici. » à la place du champ, « Donner » restant). Chaque réglage part d'un bloc, signé AVEC le code. Changer l'entrée vers « sur demande » ou faire une nouvelle invitation change le code, qui part par la boîte de chacun. « Supprimer le groupe », rouge, en dernier, au chef seul : rattrapable, puis le groupe quitte chaque téléphone (« BTS SIO Lille a été supprimé par Inès. »). Gardé par `e2e-groupes.mjs` et `e2e-groupe-demande.mjs` (joués à trois) `e2e-groupe-sur-demande.mjs` (joué à quatre), `e2e-groupe-retirer.mjs` et `e2e-groupe-reglages.mjs` (joués à trois), la fuite d'abord |

**Le minimum, au bon moment** *(règle du mainteneur, 7 octobre 2026 :
« les mises à jour sont très bien, le problème c'est qu'elles sont très
mal intégrées — au final c'est juste un bouton en plus ou un lien en
plus. Je veux la facilité, la compréhension instinctive rien qu'en
regardant, et surtout du minimalisme »)*. Photographié sur son téléphone :
une fiche dont « À savoir » ne portait que quatre liens et une ligne de
source, une liste « C'est laquelle ? » dont chaque ligne disait
« 70.10Z », trois puces de rayon sous un champ de ville vide, « Tape un
métier et une ville » sous le clavier. Trois questions, à poser à TOUT
élément avant de l'ajouter, et à rejouer sur ce qui existe :

1. **Sert-il MAINTENANT, à ce moment du parcours ?** Sinon il n'est pas
   là, il apparaît quand il sert : le rayon quand la ville est écrite,
   « Trouver sur LinkedIn » quand on ajoute un contact, l'entreprise de
   l'annuaire quand on tape son nom. **Une information importante qui
   peut ne pas être là n'est pas là.**
2. **Est-ce une information, ou une porte vers ailleurs ?** Un lien
   n'est pas une information : il demande de quitter l'écran pour
   apprendre quelque chose. L'app montre ce qu'elle sait, ou se tait.
   Un lien n'existe que là où l'on va justement quitter l'app (écrire à
   quelqu'un sur LinkedIn, voir des offres après avoir lu la liste).
3. **Peut-il être implicite ?** Un bouton qui « complète », « cherche »,
   « réessaie » est un geste que l'app aurait pu faire au bon moment —
   au choix d'une entreprise, à l'ouverture, au retour du réseau. Ce qui
   ne marche pas ne se dit pas : une carte absente n'est pas une erreur.

Et deux interdits qui en sortent : **jamais un code** à l'écran (NAF,
SIREN, identifiant — ils ne disent rien à un étudiant), **jamais un
cadre vide** (« À savoir » sans rien à dire n'existe pas). Gardé par
`e2e-enrichir.mjs`, `e2e-carte.mjs`, `e2e-decouvrir.mjs` et
`e2e-mesure.mjs`, qui refusent le retour de chaque geste retiré.

**Une fonctionnalité neuve prend une place qui existe — elle ne se pose
pas à côté** *(retour du mainteneur, 12 octobre 2026 : « la page
Échanger est devenue horrible, tout est balancé comme ça sans chercher à
comprendre le parcours user ; ce qui était avant était parfait »)*. Les
groupes et les amis y avaient été posés en deux cadres de deux boutons
chacun — « Créer », « Rejoindre », « Scanner », « Mon QR » : quatre gestes
qu'on fait UNE fois, en permanence sous les yeux, à côté des deux qu'on
fait tous les jours. Chaque lot était juste pris seul ; leur somme rendait
l'écran illisible. L'écran d'avant tenait en trois — Donner, Recevoir, une
porte — et c'est lui qui est revenu : les groupes ont repris la place de
la porte, « Créer » et « Rejoindre » vivent derrière elle (NN/g,
divulgation progressive), les amis sont partis là où vit leur liste.
Le lendemain, la porte est devenue la boîte — les groupes ET les amis
dans une seule liste, comme toutes les messageries — et la règle a tenu :
les deux verbes restent sous le pouce, « Nouveau groupe » ferme la liste.
Trois questions avant de poser un geste sur un écran qui existe :

1. **Le fait-on tous les jours, ou une fois ?** Une fois → derrière une
   porte, jamais à côté de ce qu'on fait tous les jours.
2. **Une entrée existante le couvre-t-elle déjà ?** « Recevoir » reconnaît
   tout ce qu'on te tend — pistes, profil d'ami, invitation, porte, code
   seul. Un « Scanner » de plus n'ajoutait qu'un mot à apprendre.
3. **L'écran d'avant se reconnaît-il ?** Mettre les deux captures côte à
   côte : si le nouveau n'est plus l'ancien plus une chose, on a ajouté au
   lieu d'intégrer. C'est une capture qu'on REGARDE (§9), pas une mesure —
   tous les gardes étaient verts sur l'écran que le mainteneur a refusé.

Gardé par `e2e-ux-audit.mjs` (« Nouveau groupe » en dernier dans la
boîte, en encre sourde, et aucun des quatre gestes jetés en vrac),
`e2e-groupes.mjs` et `e2e-amis-onglet.mjs`.

**Une puce fait la taille de son mot, et son mot ne répète pas le titre.**
Deux sources se rejoignent : GOV.UK dit de **ne jamais cacher** un petit
jeu d'options dans une liste déroulante — elles restent visibles ;
Material 3 dit qu'au-delà de trois options, ou dès qu'un libellé
s'allonge, le bouton segmenté ne tient plus et c'est une **grappe de
puces qui se replient** qui devient lisible. L'app avait les puces, mais
en `flex:1 1 auto` : seule sur son rang, une puce s'étirait sur toute la
largeur. Mesuré à police agrandie — celle que règle quelqu'un qui veut y
voir — « J'y suis passé » rendait **quatre blocs pleine largeur empilés,
197 px pour quatre mots**, et « CDI » devenait un bouton de 352 px. Un
bouton large annonce une action lourde ; ce sont des étiquettes qu'on
effleure. Deux corollaires :

- **Le libellé de la puce ne répète pas le titre du groupe** (§6, règle
  de sobriété 1). Sous « J'y suis passé », « J'y ai fait mon stage »
  disait deux fois la même chose et triplait la largeur : c'est
  **Stage**. D'où `VECU[].quoi`, à côté des trois personnes
  grammaticales que la table portait déjà.
- **Ça se vérifie à police AGRANDIE**, seule taille où le défaut sort.

*Reste ouvert, à trancher avec le mainteneur* : le WAI-ARIA APG dit
qu'un groupe de bascules **mutuellement exclusives** doit se déclarer
`radiogroup`, pas `aria-pressed`. « J'y suis passé » est exclusif — mais
un bouton radio ne se dé-coche pas, et le re-tap qui efface est
justement ce qui évite d'ajouter un sixième choix « Aucun ». Les deux
règles s'opposent ; celle du produit tient tant qu'elle n'est pas
rediscutée.

**Au pouce, un champ ne coûte pas des pixels : il coûte un CLAVIER.**
Lequel s'ouvre, et ce qu'il fait au texte pendant qu'on tape. Relevé sur
tous les champs de l'app, trois défauts en sont sortis — tous invisibles
à la relecture, tous payés à chaque saisie :

- **« Son email ou son téléphone »**, le champ le plus tapé du produit,
  ouvrait un clavier alphabétique. L'arobase est à une page de distance,
  et surtout **iOS met une majuscule au premier caractère** : `s@b.test`
  devient `S@b.test`, une adresse fausse que personne ne relit. Le type
  reste `text` — `type="email"` invaliderait un numéro de téléphone.
- **La correction automatique réécrit les noms propres.** « Barbaste »
  devient autre chose, une fois, pour toujours. Elle se coupe partout où
  la donnée est un nom : entreprise, personne, ville, techno.
- **La phrase de secours** se tape en clair, mot à mot. Un mot substitué
  et la phrase ne rouvre plus rien, sans que rien ne l'explique.
  `type="password"` couperait les trois attributs tout seul ; là, le
  texte est visible, donc rien ne les coupe. C'est le champ le plus
  dangereux de l'app, et il est gardé dans `e2e-recuperation.mjs`.

La contrepartie tient en une ligne : **la prose garde son correcteur.**
Un mail part chez un recruteur, une faute y coûte plus qu'une majuscule.
Il n'y a donc **pas** d'entrée « prose » dans la table — une entrée vide
serait du code mort, une mutation l'a montré. La règle se garde là où
elle se voit, pas là où elle se déclare.

**Le silence n'est pas une dette, c'est une décision.** Une piste engagée
puis laissée sans suite disparaissait : rien sur « Aujourd'hui », et dans
« Mes pistes » le même « à planifier » qu'elle dorme depuis cinq jours ou
depuis quatre-vingt-dix. L'app tenait la date et la jetait. Elle la montre
maintenant, avec **le langage d'urgence de l'app** (`mark-*`), et trois
règles qui l'empêchent de devenir une pile de reproches — le défaut qui
fait abandonner les outils de suivi :

- **Seules les pistes ENGAGÉES comptent.** Une piste jamais contactée
  (`todo`) n'est pas en train de filer entre les doigts ; « Par où
  commencer » s'en occupe. Les mélanger noierait le signal. **Et
  l'inverse vaut aussi** *(1er octobre 2026)* : « Par où commencer » ne
  propose QUE ce qui n'a jamais démarré (`aDemarrer`). Une piste écrite
  le matin, sans relance prévue, y revenait le soir avec l'icône mail,
  comme si on ne lui avait jamais écrit.
- **Rien avant sept jours.** Les seuils viennent des données de relance —
  5 à 7 jours ouvrés avant la première, une à deux semaines avant la
  seconde — pas du goût : `SILENCE_RELANCE` 7 · `SILENCE_DERNIERE` 21 ·
  `SILENCE_TROP_TARD` 45 (`engine/assist.js`).
- **Chaque ligne a une SORTIE.** Passé le dernier seuil, la littérature ne
  dit plus « relance encore », elle dit « passe à autre chose » : le geste
  proposé devient **Clore**. Une pile dont chaque ligne peut sortir ne
  grandit pas sans fin.

**Un écran qui raconte le passé ne fait agir personne.** « Échanger » a
vécu comme un classeur : deux verbes, une porte, et le relevé de ce qui
avait circulé. Il répondait à « qu'est-ce qui s'est passé », jamais à
« je fais quoi maintenant » — la seule question que ce produit existe
pour résoudre (§1). Pire, le panneau du poste montrait les pistes **déjà
données** : la donnée la moins actionnable de l'app, celle qui ne
réclame rien et ne mène nulle part.

Or l'onglet existe à cause d'un chiffre : ~3 % d'entretiens à froid
contre ~40 % portée par quelqu'un (§8). Quand un camarade tend douze
pistes et qu'elles dorment, **c'est ce 40:1 qui dort** — et l'app le
savait déjà : le journal note depuis toujours quelles pistes sont
entrées, de qui, et lesquelles sont sorties. Personne ne le relisait.

La place forte revient donc à **ce qui ne circule pas encore** :
`recuesDormantes` (reçues, jamais reprises) et, en second seulement,
`jamaisDonnees`. Le fil reste — une trace a sa valeur — mais au rang de
trace. Trois règles en sortent, toutes apprises en jouant le parcours à
deux personnes, aucune visible à la mesure :

- **Le seuil est celui du silence** (`SILENCE_RELANCE`, 7 jours), pas un
  second chiffre à défendre. Sous une semaine, ce n'est pas de la
  négligence, c'est le délai normal entre recevoir et s'y mettre.
- **Trois lignes, jamais douze.** Douze pistes reçues le même jour de la
  même personne donnaient douze sous-lignes identiques — « de Léa ·
  Lille · 19 j » répété, un papier peint. C'est l'inventaire que « Par
  où commencer » a appris à ne pas être.
- **Le tri a une raison, et elle se voit.** Le critère du 40:1 est déjà
  satisfait par toutes (elles ont été données) : ce qui les départage
  ensuite est ce à quoi on peut écrire tout de suite, puis les mieux
  remplies. L'ancienneté ne trie rien quand tout est arrivé le même jour.

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
d'abord **celles que quelqu'un de mon groupe peut porter** (~40 % d'entretiens
contre ~3 %, aucun autre critère de la ligne n'en approche), puis ce à quoi on
peut écrire tout de suite (une adresse), puis les fiches les mieux remplies —
et la sous-ligne affiche la recommandation, puis ville, nombre de contacts,
secteur : au pouce elle s'élide par la fin, donc ce qui décide se met devant,
et c'est le secteur qu'on peut perdre, jamais le nombre de personnes
joignables. La recommandation prend l'accent, **jamais un `mark-*`** : le
langage d'urgence reste à ce qui réclame quelque chose, et là rien ne presse
— c'est un atout.

**Un toast ne se justifie que si son message n'est PAS déjà à l'écran.**
C'est la seule question à se poser, et elle se répond en regardant
l'écran juste après le geste. L'app en comptait 130 sans qu'aucun garde
ne bronche — le contrôle de sobriété mesurait leur longueur, jamais leur
nombre. Trois familles seulement le passent :

① une **erreur** ou un **refus** — rien ne s'est produit, il faut dire
pourquoi ; ② un résultat **hors de l'écran** — le presse-papier, un
fichier téléchargé, un autre appareil ; ③ un geste dont la **feuille
reste ouverte** et où rien d'autre ne bouge (la capture au pouce vide
ses champs et n'a que ça pour dire que la piste est partie).

Tout le reste part. « Fiche enregistrée ✓ » pendant qu'on regarde la
fiche enregistrée, le statut redit alors que la carte glisse vers sa
nouvelle colonne, « … annulée » qui confirme qu'il ne s'est rien passé :
c'est du bruit, et deux sources le disent — Material 3 (« pas de
snackbar pour une information déjà affichée ») et NN/g (un message
transitoire est fugace et interrompt, donc réservé à ce qui n'est pas
perceptible autrement). **Et depuis que le toast passe par
`role="status"`, il est LU à voix haute** : chaque toast de trop est une
interruption de plus pour qui n'a pas l'écran. Le nombre est plafonné
dans `e2e-sobriete.mjs`.

**Et le toast n'a qu'UN ancrage à la fois** : le bas, ou le haut quand une
feuille est ouverte. Chaque règle qui le déplace dit de quel côté elle
joue. Haut et bas posés ensemble l'étirent entre les deux : juste après
la toute première piste, « ✓ … ajoutée » devenait une colonne de 641 px
posée sur les champs de la capture (30 septembre 2026). La règle du pied
d'« Aujourd'hui », qui porte un id, l'emportait sur `bottom:auto`.
`e2e-parcours-neuf.mjs` vise la cause : une boîte plus haute que son
texte, dans chaque état et chaque combinaison, sonde à l'appui.

**Ce qui change sans prendre le focus doit pouvoir se DIRE, et ce qui se
tape doit avoir un NOM.** Trois règles, toutes tirées d'un relevé sur
l'app réelle — le socle était bon, ce sont les trois trous qui restaient :

- **Un message d'état s'annonce** (WCAG 4.1.3). Le toast et
  l'avertissement de sauvegarde le faisaient déjà ; les deux qui
  comptent le plus, non — la **barre Annuler**, c'est-à-dire le filet de
  sécurité de tout le produit (invariant ②), et le **compte qui reste
  après un filtre**. Quelqu'un qui n'a pas l'écran supprimait une piste
  et n'apprenait jamais qu'il pouvait la reprendre. La région vit dans
  `index.html`, pas dans le message : **elle doit exister avant qu'on
  écrive dedans**, sinon la plupart des lecteurs d'écran ne la lisent
  pas — et elle se cache par `clip-path`, jamais par `display:none` ni
  `visibility:hidden`, qui la sortiraient de l'arbre d'accessibilité.
  *(Sources : WAI-ARIA APG et MDN sur les régions vivantes — la région
  doit préexister à sa mise à jour ; la technique « visuellement cachée,
  lue quand même » est celle du WAI et de GOV.UK.)*
- **Le focus ne tombe pas par terre** (WCAG 2.4.3). Quand l'élément qui
  le porte quitte le document, le navigateur le rend au `<body>` :
  mesuré, supprimer la deuxième ligne d'une liste renvoyait tout en haut
  de la page. Le motif vise la **place**, pas l'identité — la ligne
  suivante, sinon la précédente, sinon le titre de l'écran. Et il ne
  déplace le focus **que s'il était dans ce qui part** : une suppression
  au doigt ou à la souris ne doit rien voler. *(C'est la règle du
  WAI-ARIA APG sur le retrait d'un élément focalisé — rendre la main au
  voisin le plus proche, jamais au document.)*
- **Le `placeholder` n'est pas un nom.** Il disparaît dès qu'on tape, et
  il ne compte pas pour tous les lecteurs d'écran. Le champ le plus tapé
  du produit vivait dessus, au pouce seulement — au poste il avait son
  libellé. `e2e-annonce.mjs` balaie les 13 surfaces dans les deux
  ergonomies et **ne compte jamais le `placeholder`**.

**Un chemin d'échec est un écran comme les autres** *(29 septembre 2026)*.
Les écrans qu'on voit peu — restaurer, recevoir un fichier, un mot de
passe faux, la caméra refusée, un code oublié — n'avaient été joués par
aucun scénario, et c'est là qu'on perd ses données ou qu'on abandonne.
Relevé en les provoquant un par un (heuristiques NN/g, règles des
messages d'erreur NN/g, ISO 24495-1, WCAG 3.3.1 et 3.3.3), quatre règles
en sont sorties :

- **Une erreur ne remonte jamais telle quelle.** Un PDF choisi par
  erreur affichait « Unexpected token '%' … not valid JSON » : l'erreur
  du navigateur, en anglais. Le moteur rend un CODE (`format`, `vide`…),
  l'écran rend une phrase qui dit ce qui ne va pas puis quoi faire, et
  un code inconnu rend une phrase générique — jamais `e.message`.
- **Toute impasse a une sortie.** Code ET phrase de secours perdus,
  l'écran verrouillé restait fermé pour toujours. C'est la réponse de
  tous ceux qui chiffrent pour de vrai (Apple pour un iPhone, Bitwarden
  pour un mot de passe principal) : ce qui est chiffré ne se rouvre pas,
  on efface et on repart, et on récupère ailleurs ce qui existe ailleurs.
- **Le bon fichier au mauvais endroit s'ouvre là où il est.** « Ouvre-le
  dans Échanger », « va dans Moi » : l'app savait quoi faire et
  demandait à la personne de refaire le chemin. Elle le fait elle-même.
- **L'erreur d'un champ se dit sous le champ, et la saisie reste.** Un
  toast en haut de l'écran pendant que le champ se vide, c'est une
  erreur loin de sa cause et une saisie à refaire.

Et la copie que la protection EXIGE suit la même route que celle de
« Moi » (`ui/fichier.js`) : deux copies qui ne sortaient pas du
téléphone de la même façon, c'est la plus importante qui y restait.
`e2e-replis.mjs` joue ces chemins, trois mutations à l'appui.

**Règles d'écran :** un bouton primaire max par vue ; une suppression unitaire
réversible se fait au geste + `showUndo`, sans confirmation ; seules les
actions lourdes ou irréversibles gardent `confirmSheet` ; l'état vide de
chaque écran enseigne le produit, jamais un simple « aucune donnée ».

**Une feuille ne s'étire pas — elle se déplace.** Mesuré sur les seize
feuilles de l'app, en 390 × 844 et en 1280 × 800 : chacune est soit au
plafond (92 dvh, plus rien à gagner), soit assez courte pour tout montrer
(l'étirer n'ajouterait que du vide) — le dimensionnement automatique fait
déjà le travail, et un cran « pleine hauteur » serait un geste sans effet.

> **Une seule feuille a fait mentir ce relevé, et c'est la plus chère :
> « Écrire ».** Elle s'arrêtait à 612 px sur 776 disponibles *pendant*
> qu'elle cachait 42 % du brouillon. Le dimensionnement automatique ne
> travaille que si quelque chose RÉCLAME la place ; ici, la zone
> d'écriture avait une hauteur fixe, donc personne ne la réclamait. La
> règle se précise donc : **une feuille dont un champ doit grandir se
> donne sa hauteur** (`height:92dvh`) et pose un **plancher en `dvh` sur
> ce champ** — sans quoi sa taille se met à dépendre de ce qui est écrit
> au-dessus, et une fiche bien renseignée rétrécit l'endroit où l'on
> travaille. Deux constructions sont mortes avant celle-là : un panneau
> défilant au-dessus du champ (il tranchait la carte « À savoir » au
> milieu d'une ligne, ce qui se lit comme un bug), et le même avec
> `min-height:0` (le champ Message se posait **par-dessus** l'objet en
> 360 × 640, invisible à la relecture). Quand tout ne tient pas, c'est
> la **feuille** qui défile — comme tout composeur de messagerie.
> Corollaire vérifié deux fois dans ce lot : **une mécanique qui ne
> s'enclenche jamais est du code mort.** La carte « À savoir » ne s'est
> comprimée à aucune des trois tailles, son chevron « il y en a plus »
> non plus — supprimés.

Élargir au poste ne sauve rien non
plus : la fiche passe de 1273 px cachés à 903 px en doublant la largeur.
Ce qui manquait vraiment, c'est de voir **derrière** : au poste, la barre
de titre se prend à la souris — l'idiome « 98 » au complet — bornée pour
que la fenêtre reste toujours rattrapable (80 px visibles sur les côtés,
44 px de barre en bas, jamais au-dessus du bord haut). La place vaut pour
toutes les feuilles et dure la session : c'est un réglage de bureau, rien
n'est écrit. Une **confirmation** en est exclue — une question n'est pas
une fenêtre qu'on range. Au doigt, la même barre sert déjà à refermer
d'un glissement : rien n'y change.

**Quatre règles de guidage du regard**, tirées d'un audit mesuré (test du flou
+ saillance calculée sur les pixels rendus) :

1. **L'encre va à ce qui change, jamais à ce qui est permanent.** Une pastille
   sur *chaque* ligne n'est pas un signal, c'est un papier peint. Ce qui ne
   réclame rien n'affiche rien.

   **Dans une liste, ça se dit plus précisément : la tête de ligne porte
   l'attribut DISTINCTIF.** NN/g, *The Anatomy of a List Entry* — mettre
   en avant ce qui distingue une entrée de sa voisine, et garder chaque
   information à la même place d'une ligne à l'autre. « Aujourd'hui »
   faisait l'inverse : sur huit lignes d'action, le verbe portait
   l'encre — 14 px, gras, en tête — pour **une seule valeur distincte**,
   pendant que l'entreprise tenait 11 px de gris en seconde position.
   Le contrôle qui tranche est **la comparaison de deux lignes
   voisines** : si leurs têtes se ressemblent, la mauvaise chose est
   mise en avant. Et il y avait pire que la règle : sur ce même écran,
   « Par où commencer » et « Sans nouvelles » mettaient DÉJÀ le nom en
   tête. Une même place portait tantôt une action, tantôt une
   entreprise — la promesse rompue à l'intérieur d'un seul écran.
2. **Un écran montre les affaires de l'utilisateur, pas des portes.** Un écran
   incapable d'afficher une donnée réelle est un menu : il appartient à la
   navigation, pas à un onglet. Aucune mise en forme ne sauve un écran qui n'a
   rien à dire. **Corollaire, mesuré** : un écran qui PEUT montrer une donnée
   et ne le fait pas tombe sous la même règle. « Aujourd'hui » répondait
   « Rien de planifié » avec zéro ligne et deux portes alors que vingt-quatre
   pistes venaient d'arriver — l'état exact au sortir du geste phare du
   produit, recevoir le fichier d'un camarade. Il montre désormais **trois**
   pistes et leurs gestes (`e2e-commencer.mjs`).
3. **Au poste, un cadre prend la hauteur de son CONTENU, jamais celle
   de l'écran** *(audit adaptatif, octobre 2026)*. Le tableau
   d'« Aujourd'hui » s'étirait jusqu'au bas de la vue pour y poser son
   pied : trois cadres de 600 px pour une carte chacun, 85 % de vide
   encadré — et c'est le vide qui portait l'encre. La zone du pouce
   (§5) n'existe pas sous une souris ; une colonne de Trello ou de
   Notion s'arrête sous sa dernière carte. Le pied suit le travail, et
   ce qui suit le tableau se range sur SES colonnes — en pleine
   largeur, un geste tombait à 900 px du nom qu'il concerne.
4. **`page-inner` seul (640 px) sur desktop = écran non conçu.** Flouter la
   capture : si la structure disparaît, ou si la zone la plus contrastée est
   du vide, c'est raté. **Une exception, nommée** : un ÉTAT transitoire d'un
   écran par ailleurs dessiné pour le poste. « Par où commencer » est une
   colonne de trois lignes ; l'étirer sur 1660 px envoie ses boutons à
   l'autre bout de l'écran (mesuré) alors que la pleine largeur appartient
   au tableau à trois colonnes, qui revient dès qu'il y a du travail
   planifié. La règle vise un écran qui ignore la largeur ; pas un écran
   qui la rend le temps d'un démarrage à froid.

**Dans une liste, une valeur a UN BORD — ou elle ne se balaie pas.**
C'est la généralisation du défaut signalé sur photo (le compte du fil
occupait quatre abscisses), et elle vaut pour toute liste, pas pour
celle-là. NN/g, *The Anatomy of a List Entry* : une liste se BALAIE —
l'œil descend une colonne et compare des entrées entre elles — donc
chaque information garde la même place d'une ligne à l'autre. Une
valeur qui se déplace oblige à LIRE chaque ligne.

Le critère est mécanique, et c'est ce qui le rend utile : **une valeur
répétée doit avoir un bord STABLE** — le gauche si elle est calée à
gauche, le droit si elle est calée à droite. Exiger « tout est aligné »
serait faux : une sous-ligne qui s'élide a un bord droit qui varie, et
c'est correct. Mais une valeur dont les DEUX bords bougent n'est ancrée
à rien. `e2e-colonnes.mjs` balaie ainsi 13 surfaces × 6 tailles sans
qu'aucune liste ait à se déclarer, et ses exceptions se **nomment** —
il n'y en a aucune.

Deux corollaires, tous deux payés :
① **La cause est presque toujours qu'une valeur partage sa boîte avec
un voisin de longueur variable**, et le remède se prend EN AMONT, dans
le texte : c'est `canalCourt` — « groupe » au lieu de « partage en
groupe » — qui a réglé le défaut photographié, pas une largeur. Choisir
une largeur ne fait que déplacer le problème : un plancher calé sur
« 24 pistes » ne dit rien de « 148 complétées », et une colonne fixe
assez large pour tout le vocabulaire ne rentre plus sur un petit
téléphone. Quand l'arithmétique refuse, la limite s'assume et se nomme.
② **Ce qu'on perçoit d'une liste est son PAS, pas la hauteur de son
contrôle.** Les deux gardes du fil mesuraient `.ec-row` ; l'enveloppe a
gonflé à 256 px pendant qu'elle restait à 44, et les deux sont restés
verts. On mesure donc l'écart entre une rangée et ce qu'elle contient.
Et **une rangée plus haute que ses sœurs n'est un défaut que si rien
n'a grandi dedans** : sous colonnes partagées, celle dont le nom se
replie grandit, et c'est le comportement normal d'un tableau.

> **Ce que les instruments ne savent pas faire.** Ils tranchent la mise en
> page (vide, dominance, largeur) ; ils sont **aveugles à l'emphase** — les
> moyennes sont pondérées par la surface, la luminance ignore la teinte. Un
> chiffre peut donc récompenser la suppression de la seule couleur qui devait
> rester. La mesure propose, l'œil tranche.

**La hiérarchie se dit par l'EMPHASE, jamais par la taille ni par la
place.** Trois essais ratés sur un seul objet — la porte « Partage en
groupe » d'« Échanger » — avant d'arriver à ce que Material 3 écrit
noir sur blanc : rempli > contourné > discret, **une seule action
remplie par écran**. Les trois erreurs valent d'être nommées, parce
qu'elles sont symétriques : ① trois cellules identiques (la nature de
la porte effacée) ; ② une porte dépouillée de sa boîte et rejetée au
bord (invisible — « se distinguer n'est pas s'effacer ») ; ③ une bande
pleine largeur (elle écrase la rangée qu'elle devait rejoindre). La
sortie tient en une ligne : **trois contrôles de même hauteur, taillés
à leur mot, d'emphase décroissante.**

**Et un dessin fait pour un écran ne descend pas tout seul sur
l'autre.** Une tranche ajoutée au poste s'est invitée sur le téléphone
au détour d'une retouche, sans que personne ne l'ait demandé. Ce n'est
pas une faute d'ergonomie, c'est une faute de PÉRIMÈTRE — et la seule
défense est de figer les deux ergonomies dans le contrôle : au pouce la
porte est une ligne pleine largeur avec son chevron (une grande cible,
une colonne), au poste un contrôle dans une rangée. Descendre l'une
chez l'autre demande de venir le changer là, exprès.

**Les proportions disent l'importance, et le pas se partage.** Deux
mesures à faire sur tout écran à deux colonnes : la colonne qui porte
le TRAVAIL À FAIRE est la plus large (elle valait 0,68 de celle qui
portait un reçu — l'écran disait l'inverse de ce qu'il veut dire), et
deux listes de même nature posées côte à côte ont le MÊME pas. À 49 px
contre 54, elles se décalent d'une demi-ligne au bout de quatre rangs :
ça ne se nomme pas, ça se ressent comme un défaut de finition. Les
hauteurs de ligne se FIXENT — laissées à l'héritage, elles dépendent du
conteneur, qui n'est pas le même pour un bouton et pour une ligne de
tranche.

**La taille dit le rang, le mot dit le geste** *(règle du mainteneur,
30 septembre 2026 : « les boutons beaucoup trop gros, ou avec trop
d'écriture et d'explication — c'est tout ce que je déteste »)*. Mesuré
le jour même : « Donner » et « Recevoir » faisaient 95 px de haut, et
chaque feuille d'options empilait des briques pleine largeur avec un
sous-titre qui expliquait chacune. La
taille d'un contrôle annonce son poids (Material 3 : l'emphase se dose,
une seule action remplie par vue) — cinq briques égales disent cinq
actions lourdes, et donc aucune. L'app n'a plus que **trois formes** :

1. **Le primaire** — rempli, un seul par vue, posé sur son rebord (§4).
   Dans une feuille il tient le pied, à la place du pouce. C'est le
   **seul** qui a le droit de s'étirer.
2. **Le teinté** — `.btn` (et `.btn-sm`) : **un aplat léger de la
   couleur du geste**, ni trait ni ombre au repos ; il fonce et s'enfonce
   à l'appui (le relief 98, là où il dit quelque chose). Tout geste qui
   n'est pas le primaire le porte. Le **neutre** (`.btn-ghost`, le même
   aplat en encre) pour ce qu'on fait peu ou qui ne fait pas avancer
   (« Clôturer », « Ignorer », « Reporter ») ; le rouge (`.btn-danger`)
   pour ce qui détruit. *(19 octobre 2026 — « je trouve qu'ils sont
   horribles esthétiquement, d'un point de vue UX horribles, et en plus
   mal placés ». Relevé mesuré sur dix écrans, au pouce et au poste :
   26 actions au doigt n'étaient qu'un mot en couleur, sans contenant ;
   la fiche alignait SEPT formes de contrôle, et trois « Modifier » au
   poste ; « Aujourd'hui » portait douze icônes nues.)* Le 13 octobre,
   la boîte des secondaires était partie parce qu'elle était LOURDE —
   fond, trait noir, biseau, ombre en biais : « gros boutons
   disgracieux ». On avait jeté le signe avec le poids : un mot teal sans
   contenant ne se distingue plus d'un lien, et un lien emmène quand un
   bouton agit. NN/g l'a mesuré (2017, oculométrie) : des signes faibles
   coûtent ~22 % de temps et ~25 % de fixations en plus — on cherche ce
   qui se tape. Le teinté est le cran que Material nomme *filled tonal*,
   l'emphase moyenne entre le rempli et le texte ; Apple dit la même
   chose (« un style moins marqué pour les autres choix », et un état
   appuyé, toujours). Deux mesures l'ont réglé : l'aplat est **opaque**,
   mélangé à la face des fenêtres — translucide, il tournait au kaki sur
   le beige du bureau, vu sur « Moi » ; et son encre est l'accent APPUYÉ
   (`--accent-hover`) — l'accent seul y rendait 4,47:1, sous le seuil de
   WCAG 1.4.3, la nuance d'appui rend 6,2:1 (5,3 appuyé, 7,3 en sombre).
   La forme contournée (`.btn-contour`, `.hero`) n'existe plus à part :
   c'est un teinté. Gardé par `e2e-boutons.mjs` (⑦) dans les deux sens
   — ni mot nu, ni boîte —, sondes et mutation à l'appui.
   **Taillé à son mot** : jamais plus de 60 % de sa boîte. Un geste SEUL est toujours celui-là,
   même destructif (`.btn-danger`, dans son groupe) : une liste d'un seul
   geste n'est que la brique d'avant sous un autre nom. **Une exception,
   nommée** : l'action de la ligne du mot de passe (`lockRowHTML`) tient
   la ligne, parce que c'est la place que le champ prendra en s'ouvrant
   — les deux échangent leur place (§4). Taillée à son mot, la ligne
   avait un trou à droite et le geste ne se lisait plus ; le mainteneur
   l'a redemandée le jour même (« j'aimais bien comment c'était »).
3. **La rangée** — dans une liste d'au moins deux gestes : un cadre, des
   rangées de hauteur de contrôle, un pointillé entre elles, aucun
   relief. La cible reste de 44 px ; seul l'habit part.

Et le mot : **un verbe et son objet, ou le nom seul quand le titre de la
feuille porte déjà le verbe** — « Recevoir » : QR · Fichier · Texte, les
mêmes mots que « Donner » de l'autre côté (§7). Au-delà de quatre mots,
un libellé se compte. Jamais de sous-titre qui dit QUAND ou OÙ s'en
servir (« sur le premier appareil », « à sa prochaine connexion ») : si
les verbes ne départagent pas deux boutons, ce sont les verbes qui sont
faux. Un repli avancé est discret (`.srt-adv`) — il ne pèse jamais plus
que les gestes qu'il suit. `e2e-boutons.mjs` garde les trois formes et
les deux règles de mots, sondes et mutations à l'appui ; son exception
d'étirement se nomme par sa construction et échoue si elle n'exempte
plus rien.

**Un geste par ligne, et le geste là où l'on pense à lui** *(19 octobre
2026 — « et en plus mal placés »)*. Le relevé des boutons a trouvé les
mêmes fautes de PLACE partout, et une même réponse les règle :

- **Une ligne de liste porte UN geste, avec son mot.** Les lignes
  d'« Aujourd'hui » alignaient trois icônes nues (enveloppe, calendrier,
  coche). Une action prévue se COCHE, comme dans toute liste de tâches :
  la case « Fait » est EN TÊTE de la ligne (Rappels, Things, Todoist —
  personne n'a à apprendre ce qu'elle fait), et le geste le plus
  probable garde son mot au bout (« Écrire », « Relancer », « Clôturer »
  passé le dernier seuil). Le second geste n'a qu'une icône à côté du
  mot : deux mots ne tiennent pas à côté du nom (la colonne du tableau,
  au poste, ne fait que 321 px). Sur une action prévue, au pouce, il
  vit au glissé (« Reporter », vers la gauche) et l'icône ne se montre
  qu'au poste, qui n'a pas de glissé ; les lignes sans glissé la
  gardent partout.
- **La case prend l'arête gauche, le geste suit le nom.** La case
  « Fait » ouvre la ligne, la fiche s'ouvre sur le nom, et l'anneau de
  focus du nom se pose DEDANS : la ligne est rognée par le motif de
  suppression au geste, un anneau dehors n'y laissait que deux bords
  (e2e-focus). Quand le geste se replie sous le nom (texte agrandi), il
  revient au bord gauche, jamais seul au bord droit (e2e-decroche).
- **Les fiches à cocher sont à plat.** « Prospecter » et « Donner »
  empilaient vingt-quatre briques biseautées ; l'état vit dans la case,
  la fiche n'a qu'un cadre, dans le trait des cadres de groupe.
- **Un geste vit avec ce qu'il change.** « Clôturer » a quitté le pied
  de la fiche, où il disputait la place de « Écrire », la seule action
  du pouce : il décide du STATUT, il vit à côté de « Où j'en suis ». Le
  pied porte un geste.
- **Une carte qui montre ce qu'on change se touche.** La prochaine
  action portait son propre « Modifier » — trois sur une fiche au poste,
  que rien ne départageait à l'œil. C'est une rangée : on la touche, son
  chevron le dit (la cellule d'iOS).
- **Les gestes d'une personne sont des tuiles** : « Écrire · Appeler ·
  SMS · WhatsApp », l'icône au-dessus du mot, à parts égales (la fiche
  contact d'iOS). En ligne, quatre mots teal se lisaient comme une phrase
  de liens. Une seule adresse donne une seule tuile, à sa largeur de
  tuile.
- **Un titre de section n'est pas en couleur.** « À savoir » et
  « Historique » se dépliaient en teal, comme deux liens au bas de la
  fiche : ils prennent le dessin des autres titres (« Contacts »,
  « Mes notes »), leur triangle dit qu'ils s'ouvrent.

**Trois règles de sobriété**, à vérifier sur tout écran neuf ou retouché :

1. **Un bouton ne répète jamais le titre de sa carte.** Le titre dit de quoi
   il s'agit, le bouton dit le geste — un verbe (« Mon profil » → « Remplir »).
2. **Un `<span>` sous un bouton reste** s'il porte un **état ou une donnée**
   utile à la décision (date, compte, « non protégé »). Il **part** s'il
   explique, encourage, répète — ou s'il départage deux frères que leurs
   verbes devraient départager seuls (retiré le 30 septembre 2026 : c'est
   cette clause qui avait laissé passer « sur le premier appareil »).
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
| les camarades avec qui on partage | **groupe** (une classe, une promo, un club : un code commun — l'app n'en garde que le code et les prénoms qui s'y disent) | promo, camarades |
| une personne dont tu as le profil | **ami** (décision du 7 octobre 2026 : un objet à part, pas un synonyme de groupe) | copain, pote, relation |

Ça se vérifie mécaniquement — extraire les chaînes de `ui/*.js` **et de
`index.html`** (la coque compte aussi, c'est là que « sauvegarde » avait
survécu), puis regrouper les synonymes. Un compte ne tranche pas seul : il
faut relire la phrase. « Copie impossible ici » parle du presse-papier.
C'est le cinquième compte de `e2e-sobriete.mjs`, plafond zéro, et il rend
la PHRASE et sa ligne — jamais le seul chiffre.

**Et le relevé doit lire la PROSE, pas seulement les chaînes.** Deux
versions du même angle mort se sont succédé, et la seconde est la plus
instructive : le collecteur ne lisait que le texte situé entre `>` et
`<` **sur une même ligne**. Or une page écrit ses paragraphes sur
quatre ou cinq lignes — donc toutes. Il ne rendait pas zéro, ce qui se
serait vu : il rendait « presque tout », et une page entière de
présentation y est passée sans qu'une seule phrase soit lue. On efface
donc les balises **en gardant les sauts de ligne**, pour que la faute
garde son numéro.

**Une exemption est une CONSTRUCTION, pas une liste de phrases.** §7
exempte le pronom « personne » et en cite une occurrence ; nommer les
phrases une à une revient à ré-autoriser le mot un titre à la fois. La
règle tient en une ligne de grammaire — en français, « personne » n'est
un nom que précédé d'un déterminant — et elle tranche les six cas
relevés dans le bon sens, dont deux qui dormaient depuis la veille dans
une page livrée. Corollaire, et c'est la sonde qui l'a dit contre la
relecture : **une exemption se sonde dans les DEUX sens.** Trop large,
elle ne casse rien — elle rend zéro, et zéro se lit comme une réussite.
La page fabriquée porte donc le pronom, qui doit passer, *et* le nom
déterminé, qui doit être pris.

**Le premier relevé a donné raison à la règle, mot pour mot.** Trois
dérives, toutes dans des textes qu'on ne relit jamais : l'`aria-label`
de la ligne « → qui » — c'est-à-dire **le seul nom qu'entend un lecteur
d'écran** — et deux infobulles de jeton. Aucune dans un titre, aucune
dans un bouton. Corollaire à tenir : **ce qui n'est lu que par une
machine dérive en premier**, parce que personne ne le relit en
regardant l'écran.

Deux pièges d'outillage, payés tous les deux : ce dépôt écrit beaucoup
de commentaires, dont certains **citent les mots interdits** pour dire
pourquoi ils le sont — les compter rendait des fautes là où il n'y en
avait aucune. Et un commentaire retiré doit laisser ses **sauts de
ligne** : sans ça le contrôle désigne la mauvaise ligne, on cherche là
où il n'y a rien, et on finit par ne plus le croire.

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

**Des mots de tous les jours, jamais des images** *(règle du mainteneur,
29 septembre 2026)*. « À l'abri », « Mettre à l'abri », « filet » ont été
retirés le jour même, après essai sur un téléphone : ils sonnaient comme
une app écrite par une machine, et il fallait les traduire pour les
comprendre. Un libellé dit ce que fait le geste avec les mots qu'on
emploierait à voix haute — « Enregistrer », « Télécharger », « Effacer
cet appareil », « À compléter », « Coordonnées ». Si un mot demande une
seconde de réflexion, ce n'est pas le bon. Ça vaut aussi pour les
messages d'erreur : ils disent quoi corriger (« Adresse incomplète
(exemple : prenom.nom@gmail.com) »), pas une notion technique. Les deux
images retirées sont refusées par le relevé du vocabulaire
(`e2e-sobriete.mjs`, compte ⑤) : elles ne reviennent pas par une
feuille secondaire.

**Ce qui se voit ne se lit pas** *(règle du mainteneur, 30 septembre
2026)* : on comprend en regardant ce qu'il faut faire, sans avoir à lire
ni à chercher. Krug le dit plus sèchement — personne ne lit les
instructions, l'objectif est de les supprimer en rendant tout évident —
et Norman l'a dit d'une porte : si elle a besoin d'un mode d'emploi,
c'est la porte qui est ratée. Une phrase d'explication se trie par
**trois questions, dans l'ordre**, et c'est ce tri qui rend le choix
certain au lieu d'une affaire de goût :

1. **L'écran le dit-il déjà ?** Un bouton, un état, un lien juste à côté.
   → la phrase part. « Aucune — planifie la suite » à côté d'un bouton
   « Planifier » ; « la suite est plus bas, repliée exprès » au-dessus de
   « Bientôt ».
2. **Raconte-t-elle une suite de gestes ?** → les gestes deviennent les
   étapes, numérotées dans l'ordre où elles se font, et chaque étape se
   fait là où elle est écrite. « Depuis mes e-mails » disait « Copie le
   prompt, colle-le… » en haut, pendant que le bouton qui copie vivait en
   bas à gauche : on lisait, puis on CHERCHAIT. L'étape 1 est maintenant
   le bouton. Ne reste écrite que l'étape qui se passe hors de l'app.
   Corollaire : **ce que l'écran suivant montre, celui-ci n'a pas à le
   dire** — « Voir un exemple » vaut mieux qu'une phrase sur ce que
   l'écran fera.
3. **Prévient-elle d'une perte ou d'une erreur qu'on ne peut pas voir
   venir ?** → elle reste, au plus court. La phrase de secours sur
   papier, le CV que `mailto:` ne joint pas, les pistes qui ne vivent que
   sur cet appareil. Les erreurs dites sous leur champ et les états
   (« Aucune piste. ») ne sont pas des explications.

Deux corollaires payés en l'appliquant. **Un choix à une seule option
n'est pas un choix, même sur une feuille entière** : sans les campagnes,
Prospecter passait par « Une par une · maintenant », seul ; le bouton dit
maintenant « Écrire (n) » et ouvre le composeur. Et **le relevé ne voyait
pas les états vides** : il ne lisait que les `hint`, et les trois plus
longues phrases de l'app (16, 15 et 12 mots) vivaient sous un titre
d'accueil, trouvées à l'œil sur les captures. `e2e-sobriete.mjs` lit
maintenant quatre familles — `hint`, états vides, accueils, pas
numérotés —, chacune avec sa sonde, et `e2e-montrer.mjs` vérifie que ce
qui remplace chaque phrase partie existe bel et bien.

**Écrire est le geste le plus cher de l'app, et le seul que personne ne
peut faire à la place de l'étudiant.** Deux mesures le cadrent, et elles
disent la même chose : un corps personnalisé obtient ~33 % de réponses en
plus, une accroche nourrie de recherche sur l'entreprise fait passer les
réponses de ~7 % à ~17 % ; côté français, l'APEC et JobTeaser disent que
**si les deux premières phrases ne captent pas, le reste n'est pas lu**.

D'où deux règles, tirées d'un modèle qui violait les deux :

1. **L'accroche personnalisée est le PREMIER bloc.** L'ancien gabarit la
   mettait en 3ᵉ position sur 5, derrière « l'activité de X a retenu
   toute mon attention » — l'accroche générique que ces mêmes sources
   citent comme à éviter. On a inversé, et le corps est passé de 69 à
   ~40 mots. L'objet vise 40-60 caractères : au-delà, il se coupe sur un
   téléphone.
2. **La matière se pose là où l'on écrit.** Le gabarit demande une
   phrase précise sur l'entreprise ; ce qu'on sait d'elle vivait sur la
   fiche, DERRIÈRE la feuille de rédaction. Il fallait fermer, lire,
   retenir, rouvrir. « À savoir » (`.ml-know`) remonte donc dans le
   composeur, **au-dessus** du champ — mêmes lignes et même mot que sur
   la fiche. Seulement ce qui nourrit une accroche (en bref, technos,
   conseils) ; sans notes, le site, qui mène quelque part ; rien du tout
   s'il n'y a rien, parce qu'un cadre vide ne dit que notre impuissance.

**Le crochet du gabarit est le seul endroit de l'app où l'on enseigne au
moment exact du geste**, et il ne coûte rien : il part avec le brouillon.
Il dit donc aussi ce qu'il ne faut PAS écrire.

**Et un crochet ne part jamais chez le recruteur** *(30 septembre 2026)*.
Joué sur un profil vide, le tout premier mail d'un étudiant partait d'un
tap avec la consigne entre crochets, « Je suis en et je cherche un
stage », et sans signature. Aucun scénario ne l'avait vu : tous
remplissaient le profil d'abord. Deux règles en sortent :

1. **Un manque qui rend le mail FAUX se montre, il ne s'efface pas.** La
   formation et le nom deviennent « [ta formation] » et « [ton nom] »
   (`TROUS`, `engine/model.js`), du même dessin que l'accroche. Un manque
   qui retire seulement une ligne (école, téléphone, CV) continue de
   l'effacer : son absence ne rend rien faux.
2. **Tant qu'un crochet reste, rien ne sort.** « Ouvrir dans Mail »,
   « Copier » et l'envoi s'arrêtent, l'erreur se dit sous le message (§6)
   et le crochet se sélectionne : il suffit de taper pour le remplacer.
   Pas de porte à franchir : un crochet qu'on voudrait vraiment envoyer
   n'existe pas dans une candidature.

Corollaire, payé en le construisant : **compléter son profil depuis le
composeur ne recalcule plus le brouillon.** Il effaçait sans un mot
l'accroche qu'on venait d'écrire (invariant ②) ; seuls les trous se
remplissent désormais (`remplirTrous`). Gardé par `e2e-parcours-neuf.mjs`,
cinq mutations à l'appui.

---

## 8. Partage & sync — deux mondes à ne pas mélanger

**Communautaire (le groupe)** : `sharePayload` → vue communautaire, jamais le
privé, fusion `merge.js` qui n'écrase rien, aperçu avant. Canaux : les
groupes (par les relais, en différé, depuis la 6.58), QR, fichier `.oc`,
coller. Le partage en groupe EN DIRECT (P2P) reste dans le code, masqué
(`ui/perimetre.js`, `PARTAGE_DIRECT`).

**Mes appareils (la même personne)** : `engine/sync.js`, tout circule (privé
inclus), le plus récent gagne (`updatedAt`), suppressions par tombstones.
Canal : P2P avec phrase de liaison personnelle, hashée pour nommer la salle,
données chiffrées de pair à pair. Le lien est **persistant** (`ui/synclive.js`).

**Pas de principal sans code** *(tranché le 30 septembre 2026)*. Le
principal peut verrouiller, retirer et effacer les autres appareils : un
téléphone qui porte ce pouvoir sans code le donne à quiconque le ramasse.
Apple et Google demandent un secret pour effacer un appareil à distance ;
ici, c'est la protection qui fait le principal. Ce qu'un appareil non
protégé demandait vraiment — distinguer deux « iPhone · Safari », la
photo du mainteneur — ne demande aucun pouvoir sur les autres : **sans
anneau, chaque appareil renomme LUI-MÊME** (`renommerSoi`) et l'annonce.
Dès qu'un anneau existe, seul le principal nomme : deux autorités sur un
même nom finiraient par se contredire d'un écran à l'autre.

Transport : Trystero (vendorisé) via relais Nostr publics, personnalisables
(`oc_relays_v1`).

**Un relais qui RÉPOND n'est pas un relais qui RELAIE**, et cette erreur
s'est faite trois fois, un étage plus bas chaque fois : « à jour » déduit
de la création de la salle (#14), « relais joint » déduit de
`readyState === 1`, puis « relais utilisable » déduit d'un EOSE. À chaque
fois le même dégât — c'est le **pair absent** qu'on accusait, et l'écran
faisait patienter devant quelque chose qui ne pouvait pas arriver.

La règle qui en sort vaut au-delà des relais : **une sonde doit mesurer
la CAPACITÉ dont la fonctionnalité dépend, pas celle qui est commode à
mesurer.** Ici la découverte a besoin d'une ÉCRITURE (publier un
événement éphémère signé) ; on ne sondait qu'une LECTURE (REQ → EOSE),
et les relais publics ont massivement ajouté des restrictions d'écriture
en continuant de servir les lectures. Mesuré le 18/09 : sept relais
« sains », **quatre** qui portaient la découverte. Les deux moitiés sont
sondées depuis (`sonde-relais-publics.mjs` et
`sonde-decouverte-relais.mjs`), et un relais n'entre dans
`RELAIS_DEFAUT` que **mesuré porteur**.

Corollaire dans l'app : elle ne se fie plus à la liste seule. Un relais
qui répond `OK false` à nos publications est écarté **en direct, sur cet
appareil-là** — parce que « muet depuis la forge » n'est pas « muet
depuis le téléphone d'un étudiant », et que l'inverse est vrai aussi.

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

**Et un prénom ne mène quelque part que s'il désigne quelqu'un** — mais
« désigner » ne veut pas dire « avoir sa fiche ». Le bandeau d'une piste
reçue est tapable dès qu'il porte un prénom, et il donne le message tout
prêt à coller là où la promo se parle vraiment.

**Ce lot a été livré trois fois, et les deux premières sont la leçon.**

*① Quatre feuilles neuves et une porte de plus* — une liste de camarades,
une fiche par personne, « échanger nos profils » avec son QR et son
fichier. Un second produit greffé au premier. Tout était vert : un garde
vert sur un écran qui n'aurait pas dû exister ne prouve rien. La loi de
Tesler nomme la faute — la complexité irréductible est payée par le
concepteur ou par l'utilisateur, et j'avais choisi l'utilisateur.

*② Le carnet réduit à une case et un écran de réglages* — mieux, mais
toujours faux. Ce qui l'a tranché est une **mesure**, pas un goût : jouer
le parcours à trois personnes. Maheydine → Léa → Awa. Chez Awa, la piste
recommande Maheydine ; son carnet contient Léa. Et il contiendra
toujours Léa, parce qu'un carnet ne se repartage jamais (invariant ①).
**Un carnet de camarades ne connaît que les gens qu'on peut déjà
joindre** — il est vide exactement quand il servirait. Supprimé : la clé
`oc_group_v1` (effacée au chargement, ce sont les coordonnées de gens
qui n'ont jamais vu cet écran), le champ `card`, la case dans
« Donner », l'écran de réglages, 365 lignes de moteur et d'interface.

**Les règles qui restent, et qui valent au-delà de ce lot :**

1. **Un lot se mesure AUSSI en surface ajoutée.** Compter les écrans est
   un contrôle au même titre qu'un invariant.
2. **Une donnée qui peut se déduire ne se saisit pas** — les gens ne
   rangent pas leurs contacts, leurs interactions le font pour eux
   (graphe social implicite, Google, KDD 2010).
3. **Chaque option configurable est une décision que le concepteur n'a
   pas prise.** Un sélecteur de cinq champs est parti pour ça.
4. **Le parcours se joue à plusieurs, ou il n'est pas joué.** Les deux
   défauts qui ont tout décidé — « Tu y es passé » affiché à qui n'y
   est jamais allé, et le carnet vide de seconde main — ne se voyaient
   qu'en faisant tourner deux puis trois personnes bout en bout.
   Aucun test unitaire ne les aurait montrés.
5. **Quand un canal est mesurablement meilleur, l'app le dit** — au lieu
   de pousser vers le sien. Une demande de vive voix aboutit **34 fois**
   plus souvent que par e-mail (Roghanizad & Bohns, 2017), et celui qui
   écrit ne sent aucune différence. C'est la seule phrase d'explication
   qui ait fait monter le plafond de `e2e-sobriete.mjs` (116 → 126) : le
   critère y passe de « prévient d'une perte » à « prévient d'une perte
   **ou d'une erreur qu'on ne peut pas voir venir** ».

**Ce que le levier coûte, au total** : quatre puces dans « Modifier », un
bandeau sur la fiche, une ligne colorée sur « Aujourd'hui », et UNE
feuille — « Demander à … », un message et un bouton. Aucun écran à
visiter, aucune donnée d'autrui stockée.

**Les amis (lot 2 du réseau, 6.54) ne contredisent pas ce qui précède —
ils en sont la suite, et la différence tient en un mot : DONNÉ.** Le carnet
mort recopiait les coordonnées de gens qui n'avaient rien demandé ; un ami
est quelqu'un qui t'a lui-même donné son profil, et ce profil ne contient
PAS de quoi le joindre (tu le peux déjà) : il contient où il est passé.
C'est ce que tu ne savais pas, et c'est ce qui transforme une piste froide
en piste portée — « Karim y est en alternance ». Trois règles, tenues par
`e2e-amis.mjs` :

1. **Le profil donné ne porte que l'identifiant, le nom, le parcours et la clé de sa boîte**
   (OCA1, `CONTRAT.md` §2), et il se lit sous le QR avant de partir.
2. **Il ne se redonne jamais** : mon profil ne contient pas mes amis, un
   partage de pistes non plus. Joué à trois — Karim → Inès → Sofia —
   Sofia n'apprend rien de Karim.
3. **Ce qu'un ami rapporte se lit sur les pistes, et la liste le dit
   en ENTREPRISES.** Ce qui compte vient au bandeau de la fiche, dans la
   barre et dans « Aujourd'hui », avec le même mot et le même geste que
   « J'y suis passé ». La liste des amis (lot 4a) n'est pas un écran à
   visiter mais une **portée de la recherche**, à côté de « À
   découvrir » : chaque ligne dit ce que l'ami T'OUVRE, jamais qui il
   est. Elle sert de CHEMIN, jamais d'annuaire — un nom sans entreprise
   se lit « aucune entreprise », et c'est tout ce qu'il y a à en dire.

**La demande à ses amis (lot 3, 6.55) passe là où le portage ne pouvait
pas : elle ATTEND.** Tout le reste du transport n'atteint que qui écoute
au même instant ; une demande doit trouver le téléphone d'un ami qui
s'ouvrira demain. D'où une **boîte aux lettres** sur les relais publics,
et une règle de plus pour la sonde de §8 : la capacité mesurée est la
GARDE — un relais qui accepte et ne rend rien à une autre connexion ne
porte pas une lettre (`sonde-boite-relais.mjs`, six relais sur sept au
premier relevé). Trois règles la tiennent :

1. **Le relais ne voit qu'une étiquette, une expiration et du bruit.**
   La lettre est scellée pour UN destinataire, d'une clé jetable : rien
   ne relie deux lettres du même auteur, et seul le destinataire l'ouvre.
2. **Ce qui ne s'ouvre pas se tait.** Une lettre abîmée, pas pour moi, un
   don pour une demande que je n'ai pas faite : ignorés, jamais devinés.
3. **On ne relève sa boîte que si l'on a donné son QR.** Sans clé
   publiée, personne ne peut écrire : rien ne part au démarrage.

**Un rappel qui jette son argument perd ce que rien ne retrouve.**
`onJoinError` était câblé `() => watch.fail()` aux quatre appels : la
bibliothèque y fait passer **trois** pannes, et l'app les recevait
toutes pour n'en afficher qu'une phrase. Or elles appellent des gestes
opposés — un **code différent des deux côtés** se retape en dix
secondes, un **manque de TURN** ne se répare pas du tout par le même
bout, et un **TURN qui ne répond pas** est encore autre chose. Envoyer
chercher le QR à quelqu'un qui s'est trompé d'une lettre, c'est le
faire renoncer au canal qui vaut 40 pour 1.

Trois choses en sortent, et la première est la plus générale :

- **Le commentaire du dépôt disait la mélecture.** Il affirmait
  « pair annoncé mais liaison DIRECTE en échec », donc tout le monde
  — moi compris, deux fois dans la même journée — a diagnostiqué du
  NAT devant un écran qui pouvait dire « mauvais mot de passe ». Une
  phrase qui interprète une bibliothèque **se vérifie dans la
  bibliothèque**, sinon elle devient la source de vérité de tout le
  monde et personne ne rouvre le bundle.
- **On lit le texte, et on se tait quand on ne sait pas.** Il n'y a
  pas de code d'erreur : `causeLiaison` reconnaît trois formulations et
  rend `inconnu` pour tout le reste. Une quatrième panne, ou un texte
  qui change à la prochaine version, ne doit **jamais** produire une
  cause fausse — se tromper de cause coûte plus cher que ne pas savoir.
- **Ça se garde à deux niveaux, parce que ça se perd à deux endroits.**
  Le câblage interne (la cause arrive-t-elle à l'écran ?) et les
  APPELANTS (un rappel qui ignore son argument reperd tout, et ça ne se
  voit dans aucun rendu). Le second est un contrôle de source, et c'est
  le seul qui attrape la forme exacte du défaut d'origine.

**Et ce qui n'est pas réparable ne se dit pas : il se CONTOURNE.**
Deux téléphones en données mobiles sont chacun derrière le NAT de leur
opérateur, et sans TURN aucun chemin direct n'existe. Un TURN **tiers**
serait pourtant admissible — il relaie des octets déjà chiffrés par
WebRTC, il ne peut rien lire, et c'est exactement le statut des relais
Nostr que l'app compose déjà ; ce que §10 interdit, c'est que le
mainteneur en TIENNE un. Mesuré le 18 septembre 2026 : sur dix adresses
publiques sans inscription, **zéro** alloue, les deux contrôles de la
sonde verts. Un TURN ouvert à tous se fait vider ; ceux qui tiennent
demandent un compte, que la question ② refuse. La place reste ouverte
(`TURN_DEFAUT`, `tests/e2e/sonde-turn.mjs`) et vide par mesure.

**Donc la garantie ne passe plus par le tuyau.** Elle passe par le seul
canal qui n'a besoin de rien : le QR **porte les fiches dans l'image**
(OCQ1, animé en plusieurs parties au-delà d'une taille) — ni relais, ni
NAT, ni réseau. La version précédente de cette règle disait que l'app
ne pouvait faire mieux que **nommer la panne et proposer le repli** ;
c'était encore trop cher. Devant un camarade qui attend, une phrase à
lire demande de comprendre un problème de transport pour donner trois
contacts, et un bouton à trouver demande de deviner où. **Les deux
moitiés basculent donc toutes seules** : « Donner » quitte le
rendez-vous et affiche le QR de données, « Recevoir » rouvre son
scanner. Trois points qui tiennent la règle :

- **Les deux côtés, ou aucun.** Un donneur qui bascule seul affiche un
  QR que personne ne scanne — l'échange s'arrête au même endroit, avec
  un écran de plus. C'est le corollaire de « le parcours se joue à
  plusieurs », appliqué à un repli.
- **Une seule panne ne bascule pas : le code retapé de travers**
  (`motdepasse`). Retaper coûte dix secondes ; envoyer scanner une
  suite de QR pour ça, c'est la faute que ce même §8 nomme déjà.
- **Le toast dit la panne, pas la nuance.** « Liaison impossible »
  couvre le relais qui lâche et le chemin direct qui manque : les
  distinguer n'ouvre aucun geste différent une fois l'écran déjà
  changé. C'est §6 — ce qui suit le tiret est le geste, et le geste
  est le même.

Corollaire de garde, et il coûte : un contrôle de basculement doit
prouver qu'il a **joué la bonne panne**. `e2e-liaison.mjs` lit
`echecLiaison()` après coup et exige `sansturn` — sans ça, un relais
local qui tombe ferait passer le scénario au vert en reproduisant une
panne qui n'est pas celle du NAT.

**Ce que ce lot a appris sur les gardes.** Une première version de
`e2e-vecu.mjs` vérifiait l'invariant en appelant le moteur avec des
données fabriquées sur place — elle prouvait seulement qu'il n'invente
pas ce qu'on ne lui donne pas. Une mutation posée dans un ÉCRAN est
passée sans la faire broncher. **Un contrôle de fuite part de l'état
RÉEL de l'app et lit les octets qui sortent par le vrai bouton.**

---

## 9. Livrer — la checklist

1. Le moteur d'abord (fonctions pures + tests), l'UI ensuite.
2. **Vérifier en lançant réellement** : serveur statique + Playwright,
   390×844 ET 1280×800, thème clair ET sombre, zéro erreur console. On ne
   livre pas sur la foi d'une relecture.

   **Et « réellement » veut dire SUR LE MOTEUR DE L'UTILISATEUR, ou au
   socle le plus commun.** L'environnement de développement n'a que
   Chromium ; l'utilisateur type de §1 est sur un iPhone, donc sur
   WebKit, qui n'est mesuré ici par rien. Une mise en page bâtie sur des
   fonctionnalités récentes — `subgrid`, `container-type`, `@container`,
   et pire, les trois empilées — est alors un **pari**, pas une
   livraison : elle a rendu le fil illisible sur le téléphone du
   mainteneur, rangées rabotées à quelques pixels d'encre, pendant que
   les onze scénarios restaient verts.
   La règle : **ce qui ne peut pas être mesuré sur le moteur de
   l'utilisateur se tient au socle que tout moteur rend depuis des
   années.** Flex plutôt que grid de dernière génération, une propriété
   plutôt que trois qui se combinent. Moins élégant, vérifiable partout.
   Et le corollaire qui coûte le plus cher : **un vert n'est pas une
   preuve, c'est une preuve SUR CE QUI A ÉTÉ MESURÉ.** Ici la suite
   entière était verte, la capture d'écran de l'émulateur était belle,
   et l'app était cassée.

   **ET TOUTE RETOUCHE VISIBLE SE TERMINE PAR UNE CAPTURE QU'ON REGARDE**
   *(règle du mainteneur, septembre 2026)*. Pas un chiffre vert : une
   image, ouverte et lue. Les deux ergonomies et les deux thèmes, sur
   l'écran touché. C'est une étape de la livraison, pas un réflexe
   facultatif — et le dépôt en a la preuve trois fois plutôt qu'une :
   · l'enveloppe gonflée à 256 px pour 44 px de contrôle, que les DEUX
     gardes du fil ont laissée passer parce qu'ils mesuraient la
     rangée ;
   · le chevron chassé seul sur un second étage sous chaque ligne,
     qu'aucun critère de colonne ne pouvait voir ;
   · et l'inverse, qui compte autant : une largeur fixe mesurée bonne
     partout, retirée après l'avoir REGARDÉE.
   La mesure dit si c'est conforme ; seule l'image dit si c'est
   regardable. §6 le disait déjà pour l'emphase — « la mesure propose,
   l'œil tranche » — et ce n'était pas assez fort : l'œil ne tranche que
   si on lui montre quelque chose.
3. `?test` : tous les auto-tests verts, y compris les nouveaux.
4. `CONTRAT.md` à jour si une clé, un format ou un invariant a bougé.
5. `sw.js` : bump `oc-vN` + `PRECACHE` si un fichier précaché a changé.
   **Et `PRECACHE` est ATOMIQUE** : `cache.addAll` échoue en entier si un
   seul fichier manque, donc le service worker ne s'installe pas du tout.
   Corollaire payé le 25 août : deux scénarios servaient une copie du
   dépôt à partir d'une liste tenue À LA MAIN ; trois fichiers précachés
   de plus ont suffi à la faire diverger, et l'échec ne disait pas
   pourquoi. La liste se DÉDUIT de `PRECACHE` (`copierDeploiement`,
   `tests/e2e/outils.mjs`) — une liste qu'on tient à la main finit
   toujours par mentir.

   **Et une page qui n'est PAS l'app se prouve sous le service worker.**
   Le SW ressert `index.html` à toute navigation — c'est ce qui fait
   qu'un rechargement sur `#/pistes` ne rend pas un 404. Une page qui
   se lit seule (le retour OAuth, l'aide, la confidentialité) doit donc
   être exemptée, et cette exemption était une liste écrite à la main
   qui ne nommait qu'`oauth.html`. Les deux pages livrées ensuite se
   sont fait avaler **en silence** : taper « Aide et confidentialité »
   rouvrait l'app. Le piège tient en une phrase : **le défaut n'existe
   que service worker installé, donc jamais chez celui qui vient
   d'écrire la page.** L'exemption se déduit maintenant de `PRECACHE`
   `sw.js` et `e2e-pages-sw.mjs` garde CHAQUE page trouvée sur le
   DISQUE, titre du fichier à l'appui — plus rien à déclarer. La règle
   finale ne tient d'ailleurs aucune liste : **une navigation qui nomme
   un fichier `.html` sert ce fichier.** La version intermédiaire, qui
   dérivait l'exemption de `PRECACHE`, liait deux questions sans
   rapport — « est-ce une page ? » et « la promet-on hors ligne ? » —
   et une page livrée sans être promise hors ligne serait retombée dans
   le trou.

   **Et un garde SAUTÉ ne garde rien.** Celui-ci s'appelait
   `e2e-oauth-sw.mjs` et ne couvrait qu'`oauth.html` : il était donc
   rangé avec l'envoi direct, c'est-à-dire **sauté tant que cette
   capacité reste masquée** (§0). En lui confiant les pages livrées
   et visibles, on lui confiait un travail que la suite ne faisait
   jamais — le défaut pouvait revenir sur un vert. Un scénario qui
   garde du visible ne se conditionne à aucun drapeau, et son nom doit
   dire ce qu'il garde : le fichier s'appelle `e2e-pages-sw.mjs`.
6. Textes relus, thème sombre vérifié, cibles tactiles ≥ 44 px sur mobile.
7. **Sobriété** : `e2e-sobriete.mjs` vert. Une couche de plus (toast long,
   confirmation, phrase d'explication) ne passe qu'en montant un plafond
   **dans ce fichier**, exprès — c'est ce qui empêche une passe de
   nettoyage de se défaire toute seule, un « juste un toast » à la fois.
   **Le quatrième compte est la SURFACE MORTE**, et son plafond vaut
   zéro : un style que plus personne ne pose n'a aucune contrepartie à
   peser, il attend seulement d'être lu par erreur. Ce qui reste au kit
   exprès — un motif que §6 nomme mais qu'aucun écran ne porte
   aujourd'hui — se déclare dans `KIT_GARDE`, avec sa raison.
8. **Un lot qui RETIRE un contrôle emporte son style avec lui.** C'est la
   faute la plus discrète du dépôt, et c'est la mienne autant qu'une
   autre : le premier relevé a trouvé 21 sélecteurs orphelins, dont le
   pli de « Donner » et celui de la barre de liste — dissous quelques
   jours plus tôt en descendant l'action dans le pied, et dont le CSS
   était resté. Deux dessins abandonnés dormaient à côté, l'un dupliqué
   mot pour mot sous un autre parent. 69 lignes.
   La leçon d'outillage vaut autant : **un contrôle qui peut se tromper
   dans le sens de la SUPPRESSION se conçoit à l'envers.** Le collecteur
   ratait `class="… ${x ? '' : ' ec-vide'}"` — l'espace en tête — et
   déclarait mortes sept classes bien vivantes. Il ne suffit pas qu'il
   échoue : il doit échouer **bruyamment et en les nommant**, pour qu'un
   humain voie tout de suite que l'instrument a tort, pas le code.
9. Commits en français, descriptifs, focalisés.

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
| « La date du fil vit DANS la phrase » | **remplacée** (août 2026) | La proximité (NN/g) disait de la coller au texte, et c'était juste contre une date jetée à 400 px. Appliquée, elle a produit pire : la ligne s'élidant d'un bloc, c'est la DATE qui se coupait — « sam. 08/… » — dès que le canal s'allongeait. La même source tranche l'inverse pour une LISTE (*The Anatomy of a List Entry* : chaque information à la même place d'une ligne à l'autre, sinon on lit au lieu de balayer). La date tient donc sa colonne et ne rétrécit jamais ; c'est la phrase qui s'élide. Ce qui restait vrai est gardé autrement : la proximité ne casse pas à 24 px, elle casse quand la LIGNE dépasse la longueur lisible — plafond 640 px |
| « L'emphase suit le défaut : aplat si l'on part de rien coché, dither si l'on part de tout coché » | **supprimée** (août 2026) | Le raisonnement se tenait — l'encre va à ce qui varie — mais il produisait deux écrans qui ne se ressemblaient pas pour le même geste, et le mainteneur l'a vu avant tout le reste. La ligne cochée ne porte plus rien du tout, partout ; seul l'ÉCART garde sa trame, là où il existe |
| « La liste déclare ses colonnes, la rangée les emprunte (`subgrid`) » | **supprimée** (septembre 2026), trois jours après avoir été écrite | Elle était juste sur le fond — les pistes déclarées une fois, la colonne dimensionnée sur la colonne entière, aucune constante à voir dériver — et elle a **cassé l'app sur le téléphone du mainteneur** : les rangées rendaient une tranche d'encre de quelques pixels, le trait pointillé passant à travers les lettres. La cause de la cause est la seule qui compte : `subgrid` sur trois niveaux, `container-type` et `@container` n'avaient été vérifiés que sur **Chromium, le seul moteur installé dans l'environnement de développement**. Safari n'a jamais été mesuré une seule fois, et c'est le moteur de l'utilisateur. Trois fonctionnalités récentes empilées sur le moteur qu'on ne peut pas tester, ce n'est pas de l'audace, c'est un pari |

| « Le chiffre d'affaires ne départage rien : il part de la carte » (6 octobre 2026) | **précisée** (13 octobre 2026), par le mainteneur : « "À découvrir" est encore trop gadget — plus d'infos sur elle », « sa santé et sa taille » | Seul, un montant ne disait rien à un étudiant. À côté de son résultat — *bénéficiaire* ou *en perte* — il dit la santé de l'entreprise, ce que le mainteneur a choisi en premier. Il revient donc en ligne « Comptes », en mots, l'année la plus récente, et se tait au-delà de trois ans |
| « Moi » sur un seul écran, sans porte « Réglages », avec un cadre « À l'abri » | **retirée** (29 septembre 2026, le jour même), par le mainteneur après essai sur son téléphone | L'idée partait d'une mesure juste — 306 px vides sous la porte en 390 × 844, et des lignes utiles cachées derrière le mot « Réglages ». Sur le vrai téléphone, l'écran unique s'est lu plus chargé que l'ancien, la ligne de copie serrait son bouton sur deux lignes, et le mot inventé « À l'abri » sonnait comme une app écrite par une machine (voir §7). **La porte #20 et le cadre « Ma copie » restent.** Ce qui a été gardé du lot vit à l'intérieur de ce dessin : l'état « sans copie » dans « Ma copie », « Installer l'app » et « Effacer cet appareil » dans Réglages |
| « Aucun état de copie sur Moi » (décision #4, 4 août 2026) | **précisée** (29 septembre 2026) | L'état retiré parlait à CHAQUE passage (« N pistes depuis ta copie ») : c'était un papier peint, et le retirer était juste. Mais le silence complet laissait ignorer la perte la plus lourde de l'app — tout vit dans un seul navigateur, et Safari efface un site non ouvert depuis sept jours. L'état revient dans le cadre « Ma copie », sous une condition qui le rend rare (`sansFilet`, engine/assist.js) : au moins 5 pistes, ni copie ni autre appareil vus depuis 30 jours. Il se tait dès qu'une copie ou un appareil existe. Il dit le fait en mots simples (« Tes 24 pistes sont enregistrées seulement sur cet appareil »), et le bouton qui le règle est juste dessous |
| « Le visuel n'est pas la cible » : au doigt, boutons dessinés à 40 px, compacts, puces et croix à 32, segments à 36, la cible de 44 px gardée par une marge invisible (6.37.0) | **retirée** (30 septembre 2026, le jour même), par le mainteneur sur son téléphone : « remets l'ancienne taille, c'était beaucoup mieux avant » | Elle s'appuyait sur deux sources justes — Material 3 dessine un bouton de 40 dp pour une cible de 48, Apple un bouton d'environ 34 pt pour 44. Mais sur un vrai iPhone la police est plus grande que les 16 px du bac à sable (§5), et le texte remplissait des boîtes de 32 px : à l'étroit, pas plus léger. Et la marge invisible était une mécanique de plus, qui se fait rogner par un conteneur ou recouvrir par un voisin sans que rien ne se voie — l'audit avait dû apprendre à la prouver en touchant ses bords. Ce que le mainteneur trouvait « trop gros » avant elle était l'ÉCRITURE et les briques, déjà réglées en 6.36.0 ; la hauteur, elle, était bonne |
| « Au poste, le tableau du jour prend la région, le pied se pose en bas » (garde de `e2e-ux-audit.mjs` : pied à 85 % de la hauteur) | **remplacée** (12 octobre 2026, audit adaptatif) | Elle étendait au poste la règle du pouce (§5 : l'action se pose en bas, là où la main arrive). Sous une souris il n'y a pas de zone facile, et la place prise l'était par du vide encadré : trois cadres de 600 px pour une carte chacun. Le tableau prend la hauteur de son contenu, le pied le suit ; le garde vérifie maintenant l'inverse, mutation à l'appui |
| « Échanger » : Donner · Recevoir · une porte par groupe (12 octobre 2026) | **remplacée** (13 octobre 2026), par le mainteneur : « une boîte de réception… afficher les conversations et les groupes comme Discord » | La porte par groupe tenait l'écran en trois objets, mais un ami s'écrivait ailleurs — dans « Amis », redit dans « Aujourd'hui » : trois endroits pour une même chose, une conversation. La boîte reprend la place des portes et y range aussi les amis ; Donner et Recevoir restent sous le pouce, « Nouveau groupe » ferme la liste. Le fil des échanges de pistes, qui tenait le panneau, passe derrière une ligne « Historique » : c'est une trace, pas du travail à faire |
| « Échanger » porte les gestes des groupes et des amis : un cadre « Groupes » (le mot, « Créer », « Rejoindre », les rangées) et un cadre « Amis » (« Scanner », « Mon QR ») — lots 4a et 5 | **retirée** (12 octobre 2026), par le mainteneur : « ce qui était avant était parfait, en rajoutant tu as juste rendu moche et mal fait » | Chaque cadre se défendait seul (le « My code / Scan » de WhatsApp, un cadre par objet). Ensemble ils posaient quatre gestes rares à côté des deux quotidiens et l'écran ne se lisait plus. Les groupes reprennent la place de la porte d'avant, « Créer » et « Rejoindre » passent derrière elle, les amis s'ajoutent dans leur liste et se scannent par « Recevoir » — §6, « Une fonctionnalité neuve prend une place qui existe » |
| « Le bouton secondaire est un bouton texte, sans boîte » (13 octobre 2026) | **remplacée** (19 octobre 2026), par le mainteneur : « je trouve qu'ils sont horribles esthétiquement, d'un point de vue UX horribles, et en plus mal placés » | Elle avait réglé le POIDS (douze boîtes biseautées sur une fiche) en retirant le SIGNE : 26 actions au doigt n'étaient plus qu'un mot teal, qu'on ne distinguait plus d'un lien (NN/g 2017 : ~22 % de temps en plus quand les signes sont faibles). Le cran manquant était le teinté (Material *filled tonal*, Apple « un style moins marqué ») : un aplat léger, ni trait ni ombre. La forme contournée (`.btn-contour`, `.hero`) disparaît dans le même geste — tout secondaire est teinté. Et la PLACE a suivi : un geste par ligne avec son mot, la case « Fait » en tête des lignes d'« Aujourd'hui », « Clôturer » à « Où j'en suis » (§6) |
| « Le bouton secondaire — contouré, `.btn-sm`, taillé à son mot » (6.36.0) | **remplacée** (13 octobre 2026), par le mainteneur : « j'en ai marre des gros boutons disgracieux, il y en a plein partout » | Elle avait réglé la TAILLE (des briques pleine largeur devenues des boutons à leur mot) et laissé le POIDS : chaque secondaire gardait fond, trait et ombre dure, si bien qu'une fiche alignait douze boîtes biseautées et que rien ne départageait « Modifier » d'« Écrire » sinon la couleur. Apple et Material réservent la boîte à l'action la plus probable ; le secondaire qui ACCOMPAGNE est devenu un bouton texte (§6). Celui qui EST l'action de son bloc garde sa boîte (`.btn-contour`) : la ligne de « Ma copie », les gestes de « Mon QR », l'envoi d'un message ou d'une invitation — « certains boutons sont utiles et beaux à leur place », le mainteneur, le même jour |
| « Télécharger » taillé à son mot, dans « Ma copie » (6.36.0) | **retirée** (30 septembre 2026, le jour même), par le mainteneur : « j'aimais bien comment c'était » | La règle générale était juste — un bouton de 235 px pour un mot annonce une action lourde. Mais cette ligne n'est pas un bouton étiré : c'est un échange de place, où l'action tient la largeur que le champ du mot de passe prendra en s'ouvrant. Taillée à son mot, la ligne gardait un trou à droite et l'ouverture ne se lisait plus comme un échange. L'exception se nomme dans `e2e-boutons.mjs` par sa construction (`.lockrow:not(.on) > .lr-do`), pas par un bouton |

*Tranché par l'assistant, à valider :* la reformulation de l'interdit serveur,
la suppression de « ne pas dégrader l'existant », et le contenu détaillé des
§4 à §9 (design, adaptatif, motifs, textes, checklist), gardés depuis la
version précédente et resserrés. Et, le 29 septembre 2026, le retour de
l'état de copie sous condition — la ligne juste au-dessus.

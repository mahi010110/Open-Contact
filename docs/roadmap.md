# OpenContact — feuille de route

**Document de référence pour la suite d'OpenContact.** Les règles produit et
UI/UX restent dans `CLAUDE.md`, le contrat de données dans `CONTRAT.md` :
cette feuille de route dit **quoi faire et dans quel ordre**, jamais
**comment concevoir**.

OpenContact est **un seul produit sur trois surfaces** (`CLAUDE.md` §0) : le
web — livré, c'est cette feuille de route —, l'ordinateur et le téléphone.
La surface ordinateur a la sienne : `compagnon/roadmap.md`. On ne re-discute
pas la répartition ici, on l'applique.

Dernière mise à jour : 15 août 2026 — cache `oc-v156`, 119 auto-tests verts
(`node tests/e2e/unitaires.mjs`), 27 fichiers E2E.

---

## 0. Déjà terminé

- PWA locale, hors-ligne, sans compte ni serveur.
- Capture, fiches, suivi, prochaine action, clôture, bac « à rattacher ».
- Partage promo (QR, fichier `.oc`, coller, groupe) et sync P2P entre mes
  appareils (Trystero/Nostr vendorisé).
- Écrire un mail par `mailto:`, modèles à variables, « Envoyée ✓ ».
- Coffre facultatif (code, phrase de récupération, chiffrement).
- Refonte UX complète (23 décisions, phases 0 à 4) — fusionnée dans `main`.
- **Les 12 défauts de l'audit post-refonte** (§1.1) — tous traités.
- **Le levier de la recommandation** (août 2026). « J'y suis passé »
  (`vecu` / `vecuQui`) fait voyager le lien humain avec la piste : la
  déclaration part avec un prénom, la piste portée passe en tête de
  « Par où commencer » avec sa raison lisible, et le bandeau de la fiche
  donne le message tout prêt. Motif : ~3 % d'entretiens à froid contre
  ~40 % quand quelqu'un est dedans.
  **Livré trois fois, et les deux premières sont la leçon** : quatre
  feuilles et une porte, puis un carnet réduit à une case. Le parcours
  joué à trois personnes a tranché — un carnet de camarades ne contient
  que des gens déjà joignables. Tout supprimé ; le levier tient
  désormais en quatre puces, un bandeau, une ligne colorée et UNE
  feuille. Garde `e2e-vecu.mjs`.
- **Écrire : l'accroche d'abord, la matière sous les yeux** (août 2026).
  Le gabarit mettait l'accroche personnalisée en 3ᵉ position derrière
  l'accroche générique que l'APEC cite comme à éviter, et la matière pour
  l'écrire vivait sur un autre écran. Inversé (69 → ~40 mots), et « À
  savoir » remonte dans le composeur au-dessus du champ. Motifs : +33 %
  de réponses pour un corps personnalisé, ~7 % → ~17 % avec une accroche
  nourrie de recherche.
- **Naviguer sans se perdre** (août 2026). Quatre promesses que la barre
  d'onglets et le bouton retour faisaient sans les tenir : le retour
  ferme la feuille au lieu de quitter l'écran (glissé depuis le bord
  d'iOS compris) ; chaque onglet garde sa place et le re-taper remonte ;
  changer d'écran s'annonce (titre du document, focus sur le titre
  d'écran, lien d'évitement enfin focalisable) ; et ce qui commande une
  liste reste avec la liste — barre de recherche au pouce, titre de
  colonne au poste, « Tout / Affiner » dans « Donner » et
  « Prospecter », **sans une once d'encre tant qu'elle n'a pas
  décroché**. Motifs : ~22 % de temps gagné sur une longue page (NN/g),
  qui ne vaut rien en deçà de trois écrans. Au passage, une ligne cochée
  ne porte plus la couleur de la navigation.
  **Un défaut sérieux au passage** : `pushState` est immédiat,
  `history.back()` non — l'app refermant sans arrêt une feuille pour en
  ouvrir une autre dans le même geste, le compte d'entrées se décalait
  d'un cran par tour et, au troisième, le retour suivant sortait de
  l'application (`about:blank`). Le retour est désormais différé et
  l'ouverture suivante le reprend. Gardes `e2e-fenetre.mjs` et
  `e2e-ux-audit.mjs` ; 23 mutations, toutes attrapées.
- **Une puce fait la taille de son mot** (août 2026). Signalé sur photo :
  « J'y suis passé » rendait quatre blocs pleine largeur empilés. Deux
  causes, toutes deux mesurées à police agrandie — celle que règle
  quelqu'un qui veut y voir : les puces étaient en `flex:1 1 auto`
  (seule sur son rang, une puce s'étirait à 352 px, « CDI » compris), et
  leur libellé répétait le titre du groupe (« J'y suis passé » →
  « J'y ai fait mon stage »). Résultat 197 px → 95 px, et la fiche ne
  dit plus « Tu y es passé — j'y ai été en alternance », qui mélangeait
  deux personnes grammaticales. Sources : GOV.UK (ne jamais cacher un
  petit jeu d'options), Material 3 (au-delà de trois options ou avec un
  libellé long, une grappe de puces qui se replient plutôt qu'un bouton
  segmenté). 3 mutations. *Reste ouvert : le WAI-ARIA APG veut un
  `radiogroup` pour des bascules exclusives, ce qui interdirait le
  re-tap qui efface — arbitrage à rendre.*
- **Une ligne cochée ne se peint pas** (août 2026). Troisième et
  dernière version : la ligne retenue a porté le navy du châssis, puis
  un lavis teal + liseré, avant de ne plus rien porter du tout. Deux
  raisons, toutes deux vues sur photo par le mainteneur — mises côte à
  côte, « Prospecter » et « Donner » ne se ressemblaient pas pour le
  même geste ; et sur une carte à deux étages l'aplat ne couvrait que le
  haut, coupant l'objet en deux. L'état vit dans la **case**, la carte
  reste entière, et les cinq listes à cocher de l'app parlent enfin le
  même langage. Seul l'ÉCART garde sa trame, là où il existe (les listes
  qui partent de « tout coché »). 4 mutations.
- **Le clavier qui s'ouvre** (août 2026). Premier relevé de tous les
  champs de l'app, et trois défauts invisibles à la relecture, payés à
  chaque saisie : « Son email ou son téléphone » — le champ le plus tapé
  du produit — ouvrait un clavier alphabétique, donc iOS majusculait le
  premier caractère et fabriquait des adresses fausses ; la correction
  automatique réécrivait les noms d'entreprises ; et **la phrase de
  secours**, tapée en clair mot à mot, restait corrigeable — un mot
  substitué et l'accès aux données part sans un message. Un genre par
  ce que le champ EST (`clavier()` dans `ui/dom.js`), la prose gardant
  son correcteur. Entrée range aussi le clavier dans la recherche.
  Gardes `e2e-ux-audit.mjs` et `e2e-recuperation.mjs` ; 8 mutations.
- **« Moi » possède sa région** (août 2026). L'écran rempli n'occupait
  que 456 px sur 745 et sa ligne de version flottait à 60 % de la
  hauteur au pouce, 50 % au poste — au milieu d'un vide sans
  propriétaire, ce qui se lit comme un oubli, pas comme du calme. La
  page prend sa région, le pied se pose en bas, et au poste la ligne
  disparaît : la barre d'état porte déjà la version, en permanence.
  3 mutations. *(Contrôlé au passage : « Donner » et « Prospecter »
  sont bien alignées — les deux sorties de « Donner » tombent à 87 % et
  93 % en bas de liste, il ne lui manque pas de pied.)*
- **Le composeur respire** (août 2026, lot 1 de `docs/audit-2026-08.md`).
  Deux défauts mesurés sur l'écran le plus cher du produit. ① L'objet se
  coupait au pouce : 41 caractères visibles sur 350 px quand le gabarit
  de relance en produit 71 — la seule phrase qui décide si le reste est
  lu. Il grandit maintenant avec son texte (plafond 4 lignes) et porte
  son compteur `71/60`, une donnée, jamais une alerte. ② La zone
  d'écriture avait 170 px fixes pendant que la feuille laissait 164 px
  inutilisés : 289 px de brouillon dont 168 visibles (58 %), 43 % pour
  la relance — et sa taille dépendait de ce qu'on savait de
  l'entreprise. La feuille prend sa hauteur, le champ reçoit un
  plancher en `dvh` : **58 % → 80 %** et **43 % → 60 %** en 390 × 844,
  100 % au poste, rien perdu en 360 × 640. Au passage, un menu
  « Destinataire » à une seule option — un contrôle sans pouvoir qui
  coûtait 80 px — redevient une ligne de texte. 7 mutations, dont deux
  qui ont fait supprimer du code mort : la carte « À savoir » ne se
  comprime à aucune taille, son chevron non plus.
- **Une cible se mesure sur ce qui répond au doigt** (août 2026, lot 2 de
  `docs/audit-2026-08.md`). Le bac « à rattacher » : la rangée faisait
  bien 44 px, la partie tapable 32 — `align-items:center` lui donnait la
  hauteur de son texte et 26 px n'appartenaient à personne. Elle prend
  maintenant toute la rangée. Le second défaut annoncé, lui, **n'en était
  pas un** : j'avais mesuré la case à cocher (18 × 18) au lieu de son
  étiquette (352 × 44, et taper son bord droit la bascule bien). Restait
  un vrai reproche — la case était figée en pixels pendant que son
  libellé grandissait : elle suit maintenant sa police (18 px par défaut,
  27 à police doublée). D'où le balayage promis, qui remplace les
  contrôles ponctuels : **13 surfaces, 271 cibles au doigt et 319 à la
  souris**, aucune sous son seuil, aucune exception — et il plante une
  sonde de 10 px pour prouver qu'il regarde encore. 6 mutations.
- **L'encre va à l'entreprise** (août 2026, lot 3 de
  `docs/audit-2026-08.md`). Sur « Aujourd'hui », le verbe portait
  l'encre — 14 px, gras, en tête — pour une seule valeur distincte sur
  huit lignes (« Relancer le service RH »), pendant que l'entreprise,
  seule chose qui varie toujours, tenait 11 px de gris en seconde
  position. Le reproche décisif n'était pas celui du rapport : sur le
  MÊME écran, « Par où commencer » et « Sans nouvelles » mettaient déjà
  le nom en tête, si bien qu'une même place portait tantôt une action,
  tantôt une entreprise. Les trois formes de ligne parlent maintenant le
  même langage — le nom d'abord, l'échéance puis le verbe en sous-ligne,
  les trois gestes inchangés à droite. Au passage, le nom hérite de la
  place à deux lignes et le contournement qui l'empêchait de se lire
  « Orange Cy… » disparaît. Source : NN/g, *The Anatomy of a List
  Entry*. Garde `e2e-commencer.mjs` (le contrôle qui tranche : deux
  lignes voisines n'ont jamais la même tête) ; 5 mutations.
- **Le plan du document, et son contraste** (août 2026, lot 4 de
  `docs/audit-2026-08.md`). Aucun `h1` nulle part : chaque écran
  démarrait en `h2`, et « Mes pistes » émettait `h2 → h4 → h3` — un
  rang sauté, parce que le bac « à rattacher » n'avait pour titre qu'un
  `<summary>`, qui n'en est pas un. Le titre visible de l'écran devient
  son `h1` (la route fait la page), les sections passent en `h2`, les
  items restent en `h3`. En corrigeant, un second saut est apparu que
  l'audit n'avait pas vu — `h1 → h3` sur les quatre écrans. Et la ligne
  de version monte de 2,43:1 à 5,4:1 en clair (3,54 → 7,0 en sombre) :
  c'était le seul nœud de texte de l'app sous le plancher AA. Deux
  balayages de plus dans `e2e-ux-audit.mjs` — un pour le plan, un pour
  le contraste, tous deux sur les quatre écrans et les deux thèmes.
  Les trois langages de sélection sont enfin écrits (`CLAUDE.md` §4).
  6 mutations. Rien ne change à l'écran.
- **Plusieurs filtres à la fois** (août 2026, demandé sur photo). Un
  seul domaine et un seul statut : taper « cloud » éteignait « cyber »
  sans prévenir, alors qu'on cherche souvent les deux. Un tap ajoute
  désormais, un re-tap retire. **Aucun contrôle de plus à l'écran** —
  les puces étaient déjà là, c'est ce qui se passe au deuxième tap qui
  change ; le seul ajout visible est une étiquette par valeur retenue
  sous la recherche, sans quoi on croirait l'app en train de perdre des
  pistes. Le moteur accepte une valeur ou plusieurs, la forme
  historique (une chaîne) continue de marcher. Gardes `tests.js` et
  `e2e-pistes.mjs` ; 6 mutations.
  *Écarté en cours de route, à la demande du mainteneur : « Tout
  effacer », le recalcul des compteurs à travers les autres filtres, et
  le passage des puces à la taille de leur mot — la mesure donnait
  −51 px sur « Trier » mais +51 px sur « Domaine », et côte à côte la
  grille se balaie mieux pour une taxinomie.*
- **Le texte doublé** (août 2026). WCAG 1.4.4 donne le droit d'agrandir
  le texte de 200 % sans rien perdre ; l'outillage s'arrêtait à 125 %,
  où tout tient encore — d'où sa **cécité à un défaut photographié sur
  un vrai téléphone**, le libellé d'onglet coupé. Trois pertes réelles
  trouvées et réparées, sans un pixel de changement à taille normale
  (mesuré : la ligne fait 72 px avant comme après) : le nom d'une piste
  se coupait dans « Mes pistes » et sur « Aujourd'hui » — il plie
  maintenant —, et « Ajouter ma première piste » sortait de son cadre de
  30 px. La règle qui en sort : **ce qui porte une identité ne se coupe
  jamais, ce qui porte une donnée garde le droit de s'élider.**
  Garde `e2e-ux-audit.mjs`, auto-vérifiée deux fois (elle échoue si elle
  cesse de doubler la police, et si sa sonde devient aveugle) ;
  5 mutations.
  *Une limite reste, nommée avec sa mesure : la barre d'onglets ne peut
  pas garder ses mots à 200 % — « Aujourd'hui » demande 120 px pour 77,
  et à 320 px de large elle est déjà coupée aujourd'hui. Cinq objets de
  trop dans une barre : décision de dessin à rendre.*
- **Une piste se décrit pareil partout** (août 2026, demandé sur photo).
  Les trois listes qui choisissent des pistes en donnaient trois
  versions : « statut · ville » dans Donner, le statut seul dans
  Prospecter, la ville seule dans le partage en groupe. Une seule
  sous-ligne désormais. *Le dessin, lui, était déjà commun — c'est ce
  que la demande visait, et il n'y avait rien à y faire.*
  **La trame sur les lignes non cochées a été demandée, mesurée et
  refusée** : sur une liste qui part de rien coché elle s'applique à
  toutes les lignes à l'ouverture, et l'écran se lit « rien n'est
  disponible » au moment où il doit inviter à choisir. Sources : le
  grisé est la convention de l'indisponible (NN/g), et Material 3
  demande que la distinction vienne de ce qui est retenu, pas de
  l'affaiblissement du reste. Elle reste là où elle veut dire « sortie
  du paquet ».
  Au passage, `e2e-liaison.mjs` couvre enfin « Choisir ce qui part » —
  la seule des trois listes que rien n'atteignait, parce qu'elle vit
  derrière une salle réellement connectée. 4 mutations.
- **La feuille qui glissait de côté** (août 2026, signalé sur photo).
  Sur « Écrire », toute la feuille pouvait se déplacer de droite à
  gauche, libellés coupés au bord. Cause : un enfant de grille garde
  par défaut `min-width:auto` et refuse de descendre sous sa largeur
  minimale de contenu — et pour un `<select>`, **WebKit calcule cette
  largeur sur son option la plus longue**, Chromium non. D'où un défaut
  invisible dans tout mon outillage et bien réel sur iPhone :
  « Sophie Fontaine — Directeur des systèmes d'information » élargissait
  la colonne au-delà de la feuille. `min-width:0` sur les enfants, plus
  `overflow-x:hidden` en ceinture.
  La garde des 200 % ne regardait que les quatre écrans : elle couvre
  maintenant **neuf surfaces, feuilles comprises**, mesure la CAUSE (un
  enfant plus large que sa feuille) et non le symptôme — la ceinture le
  rendait inmesurable —, et plante une sonde de 9999 px pour prouver
  qu'elle voit encore. 4 mutations.
- **Le fil des échanges s'allège, et se retire** (août 2026, signalé sur
  photo). « Tes échanges » portait le même gras qu'un nom de piste : un
  journal, qui raconte ce qui est DÉJÀ fait, pesait autant que les deux
  gestes qu'il surplombe. Passé en poids de texte courant — trois
  niveaux nets : les gestes, le fil, la date (NN/g, poids visuel :
  deux ou trois niveaux au maximum). Et chaque ligne se retire au
  geste de l'app — glisser au pouce, poubelle au survol, « Annuler »
  à la place d'une confirmation ; « Annuler » remet l'entrée à SA
  place dans le journal. Le moteur rend l'indice de l'entrée d'origine
  (`exchangeLog`), sans quoi une ligne dérivée ne sait pas désigner ce
  qui l'a produite. 4 mutations, dont une qui a fait renforcer la
  garde : elle vérifiait le compte mais pas QUELLE ligne disparaît —
  on pouvait en supprimer une et en voir partir une autre.
  *Au passage, une deuxième bombe à retardement désamorcée :
  `e2e-mouvement.mjs` semait des dates en dur (2026-08-1x) et sa
  tranche « Bientôt » a cessé d'exister le jour où le calendrier les a
  dépassées. Une date qui doit être FUTURE se sème en relatif ; une
  date passée peut rester en dur.*
- Auto-tests verts, parcours principaux rejoués en E2E.

> **Nuance conservée.** « Refonte terminée » veut dire : les 23 décisions sont
> livrées. Pas : l'application est sans défaut. L'audit du §1.1 en avait
> trouvé 12, capture d'écran à l'appui. C'est normal — c'était exactement son
> rôle.

Le chantier connecté (campagnes, envoi app fermée, analyse de la boîte mail,
IA locale, MCP) est livré lui aussi, mais **il appartient à la surface
ordinateur** : voir `compagnon/roadmap.md`.

---

## 1. Stabilisation — maintenant

### 1.1 Corrections d'UX issues de l'audit — **terminé**

Audit fonctionnel post-refonte réalisé app lancée (serveur statique +
Playwright), 1280×900 et 390×844, données de test réalistes. 12 défauts
confirmés, tous traités :

- **Lot 1 — « Moi / Réglages »** : la copie propose le mot de passe d'emblée
  (E) ; plus aucune poubelle permanente, suppression au geste + `showUndo`
  (D) ; boutons à la taille de contrôle standard (#7) ; plus de texte
  descriptif à côté d'un bouton, seulement un état court (A) ; CV et lettres
  classés en deux groupes, une ligne dense par document (C).
- **Lot 2** : le code de groupe se copie au geste (#6). **#4 — icône du
  Compagnon : sans objet, deux fois.** Les pictogrammes des Réglages ont été
  retirés (ils repoussaient les mots qui servent à scanner, jusqu'à faire
  plier « Mes appareils » sur deux lignes — détail dans
  `docs/finition-calibrage.md` §I), et la ligne « Le Compagnon » quitte de
  toute façon OpenContact (§1.2).
- **Lot 3** : `openPanel` supprimé, la fiche s'ouvre en fenêtre centrée (#5).
- **Lot 4** : la sauvegarde imposée à la première protection (B) —
  **abandonnée sur décision du mainteneur**, le comportement actuel est
  conservé (`docs/finition-calibrage.md`).
- **Lot 5** : formulaire complet à la capture sur ordinateur (#3) ; choisir
  qui part dans un partage (#2) ; viser plusieurs personnes dans la même
  entreprise (#1).

**Écarté après vérification.** L'écran « Donner » avec seulement des pistes
d'exemple : signalé comme muet, il ne l'est pas — un toast dit « Rien à
donner pour l'instant ». Ce n'était pas un défaut.

### 1.2 Le recentrage — **livré**

Application de `CLAUDE.md` §0. Tout ce qui appartient à la surface ordinateur
ou qui est reporté **disparaît de l'écran du web** — sans rien supprimer, sans toucher une clé
de stockage, sans perdre la moindre donnée déjà enregistrée.

**Un seul point de contrôle : `ui/perimetre.js`.** Quatre drapeaux
(`COMPAGNON`, `CAMPAGNES`, `IA`, `ENVOI_DIRECT`), tous à `false`. Remettre une
capacité à l'écran = repasser son drapeau à `true`, rien d'autre — y compris
ses scénarios de bout en bout, que `tests/e2e/tous.mjs` saute en lisant ces
mêmes drapeaux et rejoue dès qu'ils changent.

Disparaissent de l'interface :

- la connexion à une messagerie et l'envoi direct ;
- le branchement à une IA par clé — la ligne « Mon assistant IA » des réglages
  et le bouton « Proposer un brouillon » du composeur ;
- l'assistant de campagne, la liste du jour, les lignes de campagne
  d'« Aujourd'hui », la maison « Campagnes (N) » ;
- l'analyse automatique de la boîte mail et les propositions de l'assistant ;
- tout ce qui nomme ou propose une capacité de la surface ordinateur.

Restent visibles : écrire un mail par `mailto:` (copier / ouvrir dans Mail /
« Envoyée ✓ »), **postuler à plusieurs boîtes d'affilée, une par une**, et
**« Depuis mes e-mails »** — la source de capture qui donne une consigne à
copier et lit ce qu'on lui recolle. Elle ne dépend d'aucun drapeau : OpenContact
n'y appelle aucune IA, il fait circuler du texte par le presse-papier.

Deux points d'attention :

- **Personne ne perd rien.** Une clé d'IA ou un jeton de messagerie déjà
  enregistré reste lisible et scellé, simplement plus affiché.
- **Le verrouillage reste**, mais cesse d'être un péage : plus rien ne
  l'exige, il redevient une protection facultative pour qui prête son
  téléphone.

La **suppression franche** du code mis en sommeil se décidera après la
première bêta — pas avant, et jamais dans le même geste que le masquage.

### 1.3 Tests sur vrai matériel

Vrais téléphones et vrais ordinateurs, pas seulement l'émulation. Fermer
l'**issue P2P n°14** seulement après preuve multi-réseaux, jamais sur un
succès isolé.

**Le protocole :**

1. Deux téléphones, même Wi-Fi : liaison appareils en moins de 30 s ? sync
   complète ?
2. Deux téléphones, 4G d'opérateurs différents : idem (traversée NAT).
3. **Wi-Fi d'établissement.** En cas d'échec, tester `oc_relays_v1` avec un
   relais auto-hébergé ; sinon confirmer que le repli QR / fichier `.oc` est
   réellement fluide, et documenter les relais personnalisables.
4. Partage en groupe à 5+ : débit, files d'aperçus, doublons après fusions
   croisées (l'idempotence doit tenir).
5. Après chaque passe : `?test` → tous les auto-tests verts.

### 1.4 Durabilité des données

C'est ce qui détruirait la confiance le plus vite.

- À chaque livraison : rejouer une montée de version depuis les données d'une
  version **publiée précédente**, pas depuis un état neuf.
- Scénario nommé et rejoué : *« j'ai perdu mon téléphone »* — restauration
  complète depuis un `.oc` sur un appareil qui n'a jamais vu ces données, avec
  et sans mot de passe, avec et sans coffre actif.
- Aucune clé de stockage renommée, aucun format `.oc` cassé (`CONTRAT.md`).

---

## 2. Préparation à la publication

**Plus aucun blocage externe.** Depuis le recentrage, tout ce qui dépendait
d'un tiers (déclaration OAuth chez Google et Microsoft, signature et
notarisation des installateurs) appartient à la surface ordinateur. Ce qui
suit ne dépend que du projet.

- Domaine et hébergement officiel.
- Pages confidentialité, sécurité, aide, CGU.
- Vérifier les installations vierges et les montées de version sans perte.

---

## 3. Bêta publique

Dépôt déjà public. Conditions d'entrée :

- Aucun problème critique ouvert.
- Sauvegardes et restaurations prouvées (§1.4).
- Tests réels mobile + ordinateur terminés (§1.3).
- Domaine et documents prêts (§2).
- **Un chemin de retour d'expérience sans serveur** — **livré** (4 août 2026).
  Réglages → « Signaler un problème » montre un rapport de cinq lignes
  (navigateur, système, écran, langue, affichage, thème, rang de stockage,
  poids des données, protection, appareils reliés, comptes du suivi) et le
  copie. Un seul geste, un seul bouton.

  **Aucun numéro de version, et aucune destination nommée** — décision du
  mainteneur, 4 août : en ligne, OpenContact est une seule app à une seule
  adresse, un numéro n'y distingue rien ; et l'écran ne renvoie vers aucun
  hébergeur, parce que le dépôt déménagera un jour et que l'écran, lui,
  doit survivre. Le presse-papier va où l'étudiant veut — message, mail,
  formulaire. `e2e-diagnostic.mjs` monte la garde sur les deux : il rougit
  le jour où un numéro ou une adresse en dur y revient.

  Ce qui tient la promesse : `engine/diagnostic.js` ne reçoit le suivi que
  pour le **compter** — il n'émet que des nombres, des booléens et des
  étiquettes fixes. Deux auto-tests et `e2e-diagnostic.mjs` le vérifient en
  lui passant un suivi plein de noms, d'adresses et d'e-mails, et en
  relisant le bloc affiché. L'écran le MONTRE en entier avant de le copier
  (il se replie plutôt que de défiler, pour être lisible en 390 px) : la
  promesse « rien de personnel » est prouvée par la lecture — et c'est
  pour ça que la phrase qui la promettait a pu partir.

  *Reste hors périmètre, et volontairement :* le rapport ne part pas tout
  seul. Ce serait de la télémétrie (`CLAUDE.md` §10), et c'est l'étudiant
  qui colle.

Démarrer par un petit groupe d'étudiants, puis ouvrir.

---

## 4. Version publique stable

- Retours de bêta corrigés.
- CI et scénarios E2E verts.
- Décision prise sur le sort du code mis en sommeil au §1.2 : suppression
  franche, ou retour dans OpenContact pour ce qui passe la règle de
  `CLAUDE.md` §0.

---

## 5. Ce qui revient en premier, après la bêta

Par ordre de valeur, et **seulement** ce qui passe la frontière :

1. **L'IA par clé de navigateur** — ramenée le 2 août 2026, puis **remise en
   sommeil le jour même** : le branchement demande de comprendre ce qu'est une
   clé d'API avant de rendre quoi que ce soit, et ce n'est pas la première
   chose qu'un étudiant doit apprendre. Le code reste entier derrière `IA`
   dans `ui/perimetre.js`, brouillon du composeur compris. Ce qui vaut le
   retour, quand il aura lieu : « améliorer mon texte », et remplir une fiche
   depuis une annonce collée.

   *À ne pas confondre avec « Depuis mes e-mails », qui est à l'écran et y
   reste* : là, OpenContact n'appelle aucune IA — il donne une consigne à
   copier et lit ce qu'on lui recolle.
2. **L'envoi direct, en option assumée** : l'identifiant d'application créé
   par l'utilisateur lui-même (le mécanisme existe déjà), avec un écran guidé
   qui donne les étapes et l'adresse de retour à copier. Zéro démarche pour le
   mainteneur. La déclaration officielle (question ② de `CLAUDE.md` §0) reste
   un choix séparé, jamais un pré-requis.

---

## 6. Import de données publiques

« Importer depuis une page » : coller une URL ou du texte, en extraire
entreprise / personne / poste / coordonnées **publiques**, conserver la source
et la date, aperçu avant création (jamais d'écriture directe — invariant
`CLAUDE.md` §2).

**LinkedIn** : pas de scraping de compte, pas de contournement de protection.
Uniquement du texte copié par l'utilisateur, une page fournie volontairement,
ou une API autorisée. Cette limite est un choix, pas une contrainte technique :
elle protège le projet autant que ses utilisateurs.

> Se recoupe avec le §5.1 : une fois l'IA revenue, « coller une annonce →
> fiche remplie » couvre l'essentiel du besoin sans aucun scraping.

---

## 7. Extensions produit *(après la V1)*

1. Plusieurs profils.
2. Biométrie / passkeys sur vrai matériel.

*(Les campagnes avancées, le SMTP/IMAP générique et les autres fournisseurs de
messagerie sont partis dans `compagnon/roadmap.md`.)*

---

## 8. Application mobile native

Capacitor : adapter stockage, partage, caméra QR. Android d'abord, iOS
ensuite. Stores après validation.

> **Déclencheur honnête** : la PWA couvre déjà bien Android. Ce qui justifie
> le natif, c'est iOS (installation, éviction du stockage, caméra). Partir
> quand un étudiant est réellement bloqué là-dessus — pas à une date.

---

## 9. Fonctions communautaires

- Confirmations signées : « vérifié par N camarades » (WebCrypto, clés
  locales, attestations rétrocompatibles).
- Boîte de réception asynchrone chiffrée.
- Annuaire de promo **seulement** s'il est réellement demandé.

---

## 10. Expérimentales et faibles priorités — à trancher

- **Soutien financier direct.** Sans réserve — un lien de don ne coûte rien à
  la crédibilité du projet.
- **Étude d'un soutien par calcul Monero** (module séparé, volontaire,
  visible, jamais par défaut). Réserve forte : c'est la seule ligne du
  document qu'un professeur, un administrateur réseau d'établissement ou un
  validateur de store retiendra, et elle contredit frontalement l'argument
  « rien ne tourne derrière ton dos ». Rapport coût / bénéfice défavorable :
  revenu quasi nul, dommage réel sur ce qui fait la crédibilité. Le don direct
  rend le même service sans le risque.

*(Le suivi des ouvertures d'e-mails est parti dans `compagnon/roadmap.md`,
avec sa réserve.)*

---

## 11. Nettoyage de la documentation

**Première passe faite (31 juillet 2026).** Six spécifications et diagnostics
entièrement livrés ont été retirés — `plan-v7.md`, `degraissage-v6.3.md`,
`inspection-ux.md`, `audit-ux-2026.md`, `audit-ux-2026-nouveautes.md`,
`refonte-chantier.md`. Ce qu'ils portaient encore a été déplacé avant
suppression (le protocole de test en classe est au §1.3, les règles durables
étaient déjà dans `CLAUDE.md`). `docs/fable5/` a rejoint le Compagnon.

**Ce qui reste dans `docs/`, et pourquoi :**

| Fichier | Ce qu'il porte encore |
|---|---|
| `roadmap.md` | ce document |
| `refonte-calibrage.md` | les 23 décisions de conception — le « pourquoi » de toute l'interface actuelle |
| `finition-calibrage.md` | les règles R1 (« rien > icône > mot > phrase ») et R2 (« la croix suffit »), et le raisonnement des 12 corrections |
| `audit-securite.md` | des arbitrages **encore ouverts** (géocodage pendant la frappe, chiffrement au repos) |
| `revue-2026-07.md` | les compromis constatés et **volontairement** non touchés |
| `refonte-brief.md` | la vision d'origine — historique, à lire comme tel : certains passages ne décrivent plus l'app (il annonce des appareils autonomes, la sync existe depuis) |

**Reste à faire :**

- Mettre à jour README, installation, sécurité, architecture, contribution.
- **Règles abandonnées : garder une trace courte de ce qui a changé et
  pourquoi.** Trois lignes suffisent. Sans ça, le même débat se rouvre — c'est
  exactement ce qui s'est passé avec le panneau latéral, retiré puis remis
  puis retiré.
- Ne garder que deux feuilles de route maintenues : celle-ci et celle du
  Compagnon.

---

## Ce qu'OpenContact ne fera jamais *(à publier)*

Cette liste existe dans `CLAUDE.md` §10 à usage interne. La rendre publique
est une fonctionnalité : c'est ce qui permet à un établissement de faire
confiance à l'outil.

- Aucun serveur, aucun compte, aucune analytique, aucun traçage.
- Aucune publicité, aucune revente ou exploitation des données.
- Le suivi privé ne sort jamais dans un partage communautaire.
- Aucune donnée écrasée sans aperçu préalable et sans possibilité d'annuler.

---

## Ordre général

Recentrer (§1.2) → vrai matériel → durabilité → préparer la publication →
bêta → version stable → ramener l'IA et l'envoi direct → import public →
mobile → communauté → documentation finale.

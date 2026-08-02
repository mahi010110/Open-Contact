# OpenContact — référence produit & UI/UX

**Ce fichier fait autorité.** Il dit ce qu'il faut savoir pour concevoir et
développer n'importe quelle fonctionnalité, quel que soit le compte ou
l'assistant qui travaille. Si une idée n'entre pas dans ces règles : on adapte
l'idée, ou on discute la règle avec le mainteneur. Jamais d'exception
silencieuse.

À lire avec : `CONTRAT.md` (le contrat de données, vérifié par `?test`),
`docs/roadmap.md` (la feuille de route d'OpenContact), `compagnon/roadmap.md`
(celle du second produit), `design/` (le kit « Utilitaire 98 »).
Le « pourquoi » de l'interface actuelle vit dans `docs/refonte-calibrage.md`
(23 décisions) et `docs/finition-calibrage.md`.

---

## 0. Deux produits, une frontière

OpenContact et le Compagnon sont **deux produits distincts**. Ils se relient ;
ils ne se mélangent pas. Avant d'ajouter quoi que ce soit, deux questions :

> **① Est-ce que ça marche pour quelqu'un qui ouvre l'app pour la première
> fois, sur son téléphone, sans compte et sans rien installer ?**
> Non → c'est le Compagnon. **L'installation est ce qui fait un second
> produit** — pas la complexité, pas le niveau d'expertise.
>
> **② Est-ce que ça engage le mainteneur dans une démarche permanente**
> (déclaration chez un fournisseur, examen, certificat à renouveler) **?**
> Oui → **reporté**, quel que soit le produit qui l'héberge.

Pas « est-ce que c'est avancé », pas « est-ce que c'est pour les experts » :
est-ce que ça marche **tout de suite, pour tout le monde**.

Ce qui traverse la frontière est **une donnée, jamais une dépendance** :
OpenContact reste entier si le Compagnon n'existe pas.

**Corollaire.** Ce qui appartient au Compagnon **n'apparaît pas** dans
OpenContact tant que le Compagnon n'est pas là. Ni grisé, ni « bientôt » :
absent.

### La répartition

`OC` = OpenContact · `CP` = Compagnon · `⏸` = reporté (voir l'état plus bas).

| | Où |
|---|---|
| Pistes, fiches, suivi, prochaine action, clôture | OC |
| Capture, anti-doublon, bac « à rattacher » | OC |
| Partage promo (QR, fichier `.oc`, coller, groupe) | OC |
| Sync entre MES appareils | OC |
| Écrire un mail (`mailto:`, copier, « Envoyée ✓ ») | OC |
| Postuler à plusieurs d'affilée, une par une | OC |
| CV & lettres rangés, modèles d'emails | OC |
| Sauvegarde / restauration, verrouillage facultatif | OC |
| Campagnes (séquence, relances, plafond, fenêtre d'envoi) | CP |
| Envoi app fermée, détection des réponses (SMTP/IMAP) | CP |
| Analyse automatique de la boîte mail | CP |
| IA « via l'ordinateur » (Ollama, OpenAI, abonnement) | CP |
| Serveur MCP pour un assistant extérieur | CP |
| IA par clé navigateur (Claude, Gemini, OpenRouter) | ⏸ |
| Envoi direct OAuth (Gmail, Outlook) | ⏸ |

Les deux dernières lignes **passent la question ①** : elles n'exigent aucune
installation et ont donc leur place dans OpenContact. Elles sont mises de côté
par **choix de périmètre**, pas par la règle. Le jour où elles reviennent,
elles reviennent **ici**, pas dans le Compagnon.

**État au 31 juillet 2026.** OpenContact se recentre sur ses bases avant sa
première mise à disposition. Tout ce qui est marqué `CP` ou `⏸` est **présent
dans le code mais masqué à l'écran** : rien n'est supprimé, aucune clé de
stockage ne bouge, aucune donnée existante n'est perdue. La suppression
franche se décidera après la première bêta.

---

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

C'est cette séparation qui a permis au Compagnon de réutiliser le moteur sans
le réécrire. Elle reste, même si les deux produits divergent.

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
| Note contextuelle | `<p class="hint">` (+ `warn` si alerte) |
| Multi-sélection | `.pk` avec icônes checkbox — **jamais pour supprimer** |
| Choisir qui part / qui est visé | `ui/qui.js` — la ligne « → qui » et sa sous-feuille à cocher |
| Fermer une barre transitoire | balayer (mobile) / `✕` (desktop) |
| Contenu secondaire | `<details class="pcard pcard-details">` replié |
| Une page = un objet et ses réglages | en-tête `.obj` (icône en haut à gauche + nom) puis des cadres `.fset`. **Le cadre est lourd : deux par écran au maximum, jamais s'il contiendrait tout l'écran.** Ailleurs, `pcard` reste la règle |
| Recevoir des données | TOUJOURS l'aperçu avant fusion (`mergePreviewInto`) — mêmes règles quel que soit le canal |

**Règles d'écran :** un bouton primaire max par vue ; une suppression unitaire
réversible se fait au geste + `showUndo`, sans confirmation ; seules les
actions lourdes ou irréversibles gardent `confirmSheet` ; l'état vide de
chaque écran enseigne le produit, jamais un simple « aucune donnée ».

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

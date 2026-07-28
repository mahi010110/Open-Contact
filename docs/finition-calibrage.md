# Finition — journal de calibrage

> Décisions prises **ensemble** (mainteneur + assistant) avant d'écrire la
> moindre ligne, chacune vue en maquette ou dans l'app lancée. Elles
> complètent `refonte-calibrage.md` et, sur les points où elles s'y
> opposent, **elles gagnent** (c'est dit explicitement à chaque fois).
>
> Méthode : on calibre tout, une correction à la fois ; on code ensuite.

---

## Règles transverses ajoutées

**R1 — rien > une icône > un mot > une phrase.**
Mot du mainteneur : *« un simple mot, une icône, ou même rien peuvent les
remplacer »*. C'est l'ordre à appliquer à chaque hésitation sur un texte.
Une phrase entière seulement quand la sécurité l'exige, et au moment du
geste. Précise et remplace la Décision 3.

**R2 — la croix suffit.**
Là où une feuille a sa croix ❌, **pas de bouton « Annuler »**. Seule
exception : « Retour ». Conséquences :
- `confirmSheet` perd son bouton d'annulation (15 appels) — la croix
  annule ;
- « Recevoir » perd son « Annuler » écrit en dur ;
- les libellés qui n'étaient des annulations que par leur place partent
  aussi : `Rester` (quitter la fiche), `Plus tard` (biométrie) ;
- **la barre « Annuler » ~30 s reste** : là, « Annuler » n'est pas un
  renoncement, c'est l'action — elle défait la suppression ;
- assumé : sur une feuille dangereuse, le seul bouton visible est le
  bouton rouge, la sortie étant la croix. Cohérent avec « un bouton
  primaire max par vue ».

---

## #7 — Réglages : des portes, plus des boutons

Cinq boutons de cinq largeurs, dont deux à rallonge (« Protéger pour
connecter »), faisaient un bord droit en dents de scie.

Chaque réglage devient **une ligne entière cliquable** : pictogramme +
nom + état + chevron. Aucun bouton. Le réglage s'ouvre dans sa feuille —
c'est la Décision 21 (« le nom d'abord, l'écran ensuite ») appliquée à la
lettre, et la même grammaire que les tiroirs CV / Lettres.

L'avertissement que portait le bouton descend dans l'état :
« Ma messagerie — *à protéger d'abord* ». Taper mène quand même à la
protection (N9 reste réglé).

## #4 — l'icône du Compagnon *(non finie)*

« Mes appareils » et « Le Compagnon » portent le même signe (`switch`).
Le pack vendorisé n'a **aucune** icône d'ordinateur, et trois dessins
proposés ont été refusés. **`zap` à titre provisoire**, en sachant qu'il
sert aussi à « Aujourd'hui » dans la barre du bas. À rouvrir : soit
récupérer `device-laptop` du pack pixelarticons, soit un autre dessin.

## A — plus de texte descriptif à côté d'un bouton

Sept phrases coupées, remplacées par l'état seul (typo machine, comme les
Réglages) :

| Où | Devient |
|---|---|
| Mon profil rempli | `Maheydine Oun · BTS SIO — SISR` (la promesse « tes emails se signent tout seuls » part) |
| Mon profil vide | `à remplir` |
| Copie — appareils reliés | `en double` |
| Copie — jamais faite | `aucune copie` · à jour → `à jour` · N pistes → inchangé (chiffre qui pousse à agir, Décision 11) |
| Espace local | `9 Ko sur 1013 Mo` |
| Porte Réglages (mobile) | plus de sommaire |
| En-tête « Moi » | **le cadenas seul**, sans mot (survol et lecteurs d'écran gardent « privé — jamais partagé ») |
| Pied de page | `OpenContact 6.3.0` |
| Échanger — partage en groupe | « la promo en direct » part |

Restent : les avertissements de sécurité au moment du geste (flux de
protection, Connexions) — `CLAUDE.md §7` les autorise.

**Deuxième passe (captures du mainteneur).** La première n'avait traité
que « Moi / Réglages ». Le même défaut vivait dans cinq autres écrans —
16 boutons, vus en maquette avant / après :

| Écran | Bouton | Devient |
|---|---|---|
| Prospecter → bifurcation | Une par une | `maintenant` |
| Prospecter → bifurcation | En campagne | `sur 2 semaines` |
| Assistant campagne | Je valide chaque jour | rien |
| Mes appareils | Retirer de mes appareils | rien |
| Mes appareils | Verrouiller cet appareil | `à sa prochaine connexion` |
| Mes appareils | En faire l'appareil principal | rien |
| Mes appareils | Effacer ses données | `à sa prochaine connexion` |
| Mes appareils → lier | Créer une phrase · Entrer une phrase | rien |
| Le Compagnon | Rompre l'association | rien |
| Protection | Activer l'empreinte / le visage | rien |
| Recevoir | Analyse en cours · La dernière analyse s'est arrêtée | rien |
| Recevoir | Ton ordinateur lit tes 7 derniers jours | rien |
| Recevoir | Les 30 derniers jours | `plus complet` |
| Donner → fichier | Copier | rien |

**Gardés, et pourquoi** : `en personne` / `à distance` (QR vs fichier),
`.oc`, `WhatsApp, mail…`, `appareil perdu ou douteux` — ce ne sont pas
des descriptions, c'est le seul mot qui distingue deux choix, ou qui dit
*quand* s'en servir. Idem pour les données : nom du fichier, compteurs,
villes, statuts, dates.

## B — sauvegarde imposée à la 1re protection

**Abandonnée.** Le mainteneur garde le comportement actuel et s'en
occupera lui-même si ça le gêne un jour.

## #5 — la fiche recouvre le tableau

Mesuré à 1280 px : la colonne « Réponse » entièrement derrière le
panneau, « En cours » rognée.

**Décision : la fiche s'ouvre toujours en fenêtre centrée**, sur « Mes
pistes » **et** sur « Aujourd'hui ». Plus de panneau latéral.

⚠️ **Remplace la Décision 10**, qui avait choisi le panneau latéral (« le
standard prouvé Huntr/Lemlist, pas une fenêtre qui recouvre »). Écrit ici
pour qu'une prochaine session ne le refasse pas en croyant bien faire.

Écartées en route, avec leurs mesures :
- resserrer le tableau — le plancher lisible est **240 px par colonne**
  (en dessous, le bas de carte « 1 · complète à 43 % » se coupe), soit
  1252 px de fenêtre minimum ;
- empiler les colonnes — jusqu'à **120 cartes** à faire défiler ;
- le vide de 254 px sous le pied du panneau disparaît de lui-même, une
  fenêtre centrée se dimensionnant sur son contenu.

**Fait.** `openPanel`/`closePanel` et `.spanel` sont supprimés : ils ne
servaient plus que trois écrans, tous passés à `openSheet` — la fiche
(`ui/fiche.js`), « Écrire » (`ui/mail.js`) et « Campagnes »
(`ui/campagnes.js`). Sur l'ordinateur, une feuille ouverte par-dessus une
autre efface la précédente (`.ov-behind`, N8) puis la rend à la fermeture :
« Écrire » revient donc sur la fiche, et le jour d'une campagne revient sur
la liste des campagnes — ce que le panneau savait déjà faire, sans le
double-modal.

## #3 — ajouter une piste : deux formulaires, un par appareil

La Décision 7 (« le reste vit dans la fiche ») décrit le **téléphone** ;
la Décision 1 (« saisie longue confortable ») décrit l'**ordinateur**.
Elles ne se contredisent pas — elles parlent de deux appareils.

| | Téléphone | Ordinateur |
|---|---|---|
| Champs | 3 : entreprise, contact, coordonnée | le formulaire complet, deux colonnes |
| Rafale | oui | **non** |
| Boutons | `Suivant` (enregistre et enchaîne) · `Compléter` | `Terminer` — un seul |

Sur ordinateur « Compléter » n'a plus de sens : le formulaire *est*
complet.

**Fait.** Le formulaire des champs partagés est sorti de « Modifier »
vers `sharedFieldsHTML` / `bindSharedFields` (`ui/edit.js`) : les deux
écrans lisent le même, il n'y a rien à tenir en double. Sur ordinateur la
capture l'affiche en entier, y suit sa grammaire (un libellé par champ,
contact compris) et valide au **Ctrl/Cmd + Entrée** du composeur — une
Entrée distraite au milieu d'un long formulaire ne crée pas la piste. Au
pouce, rien ne bouge : trois champs, `Compléter` + `Suivant`, la rafale.

## #2 et #1 — un seul mécanisme pour les deux

Ce sont le même écran. Prospecter a déjà : piste cochée + une ligne
`→ Léa Fontaine ▾` qui ouvre une sous-feuille. Il suffit de la passer en
**choix multiple** et de la porter partout.

**La sous-feuille** : cases à cocher, chaque tap bascule, la croix
referme, aucune validation ajoutée (invariant « une décision à la fois »
+ R2). Titre selon le verbe : « Qui, chez X ? » / « Qui part, chez X ? ».

**Le libellé de la ligne** — une règle, trois cas :

| Situation | Affiché |
|---|---|
| Une seule personne | `→ Nadia K.` (ligne inerte) |
| Plusieurs, toutes retenues | `→ Léa Fontaine +2` |
| Quelqu'un est écarté | `→ 2 sur 3` |
| Aucune personne | rien (Donner) · `＋ ajoute quelqu'un` (Prospecter) |

Le compte n'apparaît **que** quand il y a quelque chose à signaler —
Décision 11 : un chiffre a sa place s'il mène à une action.

**Le filtre diffère selon le verbe** : email obligatoire pour prospecter
(on ne peut pas écrire sans), rien d'obligatoire pour donner (un numéro
se partage très bien).

### Tous les endroits concernés

Points de sortie des fiches — **les trois** reçoivent le composant :

| Endroit | Verdict |
|---|---|
| Donner → QR (`encodeOCQ`) | ✅ |
| Donner → fichier / rendez-vous (`sharePayload`) | ✅ |
| **Partage en groupe** (`direct.js`, `share.send`) | ✅ — le plus exposé : envoi live à toute une salle |
| Sauvegarde `.oc` | ❌ c'est ta copie, tout doit y être |
| Sync entre mes appareils | ❌ c'est moi des deux côtés |

Un **seul composant partagé** aux trois endroits, pas trois copies.

Points de visée d'une personne :

| Endroit | Verdict |
|---|---|
| Prospecter → une par une | ✅ multi |
| Prospecter → campagne | ✅ multi |
| Écrire depuis la fiche | ❌ un email s'adresse à quelqu'un |

**Recevoir** (aperçu avant fusion) garde son choix par piste seulement :
filtrer un contact à la réception ne protège personne, la donnée a déjà
quitté l'appareil de l'émetteur. C'est du rangement, pas de la
confidentialité.

### Les relances (moitié moteur de #1)

Aujourd'hui `markReplied(c, cid)` vise l'**entreprise** : toutes ses
cibles passent en « a répondu ». Invisible tant qu'il n'y a qu'une cible
par entreprise ; dès qu'on en vise trois, Léa répond et Marc et Sofia
cessent d'être relancés sans avoir rien dit.

- une réponse arrête les relances **de cette personne seulement** ;
- les autres continuent ;
- notification : « Léa a répondu chez Capgemini » ;
- bouton **« arrêter toute l'entreprise »** dans la carte de campagne ;
- plafond de **15 envois/jour inchangé** (global, toutes campagnes).

Le moteur sait déjà faire : chaque cible a son `tid` et son état
(`engine/campaign.js`). Seul l'assistant de montage écrase à une
personne par piste. `CONTRAT.md` ne bouge pas.

**Fait**, en trois temps — moteur, partage, prospection.

`ui/qui.js` porte le mécanisme unique : la ligne « → qui » et la
sous-feuille à cocher, aux quatre endroits (Prospecter, Donner → QR,
Donner → fichier, partage en groupe).

Deux défauts opposés, et c'est voulu : **donner part avec tout le
monde** (c'était déjà le cas), **écrire vise UNE personne** — celle de la
prochaine action. Un tap qui enverrait trois candidatures à la même boîte
n'est pas un défaut acceptable ; en ajouter reste un geste.

Une précision au libellé : le tableau ci-dessus ne disait rien du cas
« une seule retenue sur plusieurs ». C'est **le nom**, pas « 1 sur 3 » —
sinon Prospecter perdrait le destinataire de vue, ce qu'interdit la
Décision 17 (« jamais un premier email deviné »). Les trois lignes
calibrées restent vraies telles quelles.

**Le signal de réponse.** Le point aveugle découvert en codant : ni la
fiche (un statut, pas un nom) ni le rapport du Compagnon (un `cid`) ne
savent QUI a répondu. Marquer la fiche « réponse » arrête donc toujours
toute l'entreprise — c'est le sens du geste, et on ne devine pas. La
granularité par personne vit là où l'information existe : la feuille du
jour, tiroir « Les personnes visées », un « a répondu » par ligne et
« arrêter toute l'entreprise » par entreprise. Les deux gestes sont
réversibles ~30 s (`showUndo`), donc sans confirmation.

Le Compagnon, lui, raisonne par piste (`arreter-cible` porte un `cid`) :
on ne lui demande d'arrêter une entreprise que lorsque plus personne n'y
attend d'envoi — sinon il couperait tout le monde.

## #6 — copier le code du groupe au geste

*Cru bloqué à tort* : l'écran a été supposé derrière une salle rejointe.
Les captures du mainteneur montrent le contraire — « copier le code »
apparaît dans la feuille d'ENTRÉE, dès qu'on génère un code, sans aucun
réseau. Leçon : vérifier où vit un écran avant de le déclarer inatteignable.

**Fait.** Le bouton part. Deux chemins le remplacent :
- **générer copie déjà** — un code inventé par l'app est le seul qu'on ne
  connaisse pas par cœur, et c'est le geste que fait celui qui ouvre le
  groupe. Le toast le dit : « Code généré et copié ».
- **appui long** (pouce) / clic maintenu (souris) **sur le code lui-même**,
  550 ms, pour le recopier plus tard. Un appui bref ne copie pas : il pose
  le curseur, le champ reste saisissable.

⚠️ Le champ est un `input` : sur iOS, l'appui long ouvre aussi le menu
natif « Sélectionner / Coller ». Invérifiable ici (Chromium). Si ça gêne
sur un vrai iPhone, le chemin « générer copie » suffit à lui seul et le
geste peut sauter.

## F — « Compléter mon profil » dans Écrire *(hors des 12, vu au passage)*

Un bouton encadré, posé juste sous un lien souligné de même importance.
Le mainteneur n'en veut pas sous cette forme.

Ce qu'il réparait est réel : profil vide, le message généré sortait
troué — « en formation , », « au  ou par retour de mail », une signature
réduite à « — ». Le supprimer sans rien faire d'autre aurait laissé
partir ce message-là à un recruteur.

**Décision : les deux à la fois.**

1. **Le gabarit se referme tout seul** (`fillTpl`, `engine/model.js`) —
   un jeton sans valeur emporte ce qui le tenait :
   - le séparateur collé au jeton part avec lui (`Candidature spontanée —
     {{formation}}` → `Candidature spontanée`) ;
   - une ligne `Étiquette : {{jeton}}` saute en entier (`Vous trouverez
     mon CV ici : {{cv}}`) ;
   - une ligne qui ne pesait que des jetons vides disparaît
     (`{{moi}} — {{tel}} — {{email}}`) ;
   - l'espace parasite avant `,` ou `.` part.

   **Une ligne sans jeton vide n'est jamais retouchée** : la prose de
   l'utilisateur reste la sienne, y compris l'espace avant `; : ! ?`
   qu'exige la typographie française.

   Deux gabarits par défaut sont réécrits pour tomber sur ces formes :
   le téléphone quitte le milieu de phrase pour rejoindre la signature,
   et « Relance — candidature {{formation}} » devient « Relance de ma
   candidature — {{formation}} ».

2. **Le rappel reste, en lien** : « Compléter mon profil » en `linklike`
   à la suite de « Envoyer directement depuis l'app ? », même poids que
   son voisin. Il n'apparaît que sans nom au profil et s'efface dès
   qu'un nom est saisi.

⚠️ Ce lien hérite de la cible tactile de son voisin — **14 px de haut sur
mobile**, sous les 44 px de la règle. C'est le choix déjà fait pour
« Envoyer directement depuis l'app ? » : les deux liens tiennent sur la
ligne d'info, ou aucun. À revoir pour les deux ensemble, jamais pour un
seul.


## G — « Affiner » partout, et les filtres posés sur une ligne *(hors des 12)*

Parti des captures du mainteneur. Deux constats, réglés dans cet ordre —
rendre le filtre bon marché d'abord, le répandre ensuite.

**Les filtres posés.** Trois étiquettes s'empilaient sur trois lignes et
repoussaient la première piste à 258 px sur un écran de 844. Elles
tiennent maintenant sur **une ligne qui glisse**, et le ✕ disparaît :
taper l'étiquette la retire, il faisait déjà exactement ça. Même geste
pour le tri, qui perd du coup son inversion au tap — inverser se fait là
où on l'a choisi, en re-tapant le critère dans « Affiner ». Les
étiquettes passent à `--ctl` : un tap qui supprime ne peut pas viser
32 px.

⚠️ **Écarté sur décision du mainteneur** : replier « Domaine » dans la
feuille « Affiner ». Elle lui plaît telle quelle ; sa remarque sur la
place ne visait que les étiquettes.

**« Affiner » manquait ailleurs.** Trois écrans montrent la MÊME liste de
pistes : Prospecter, Donner → Choisir…, et le partage en groupe. Les deux
premiers n'avaient qu'un bouton « Trier » ; le troisième n'avait rien —
il est arrivé après les autres. Tous trois reçoivent maintenant le même
« Affiner » (filtre + tri), sorti de `ui/pistes.js` vers `ui/affiner.js`.

**Deux façons de montrer l'état actif, et c'est voulu** (choix du
mainteneur, capture à l'appui) :

| Où | Comment | Pourquoi |
|---|---|---|
| Page « Mes pistes » | des étiquettes sous la recherche | on y vit, un regard doit suffire |
| Les trois feuilles | un compte dans le bouton (`Affiner ③`) | on y vient faire une chose, la place va à la liste |

C'est « adaptatif, pas responsive » appliqué à un contrôle : deux
contextes, deux réponses.

**L'état est propre à chaque écran.** Filtrer « cyber » dans Prospecter
ne touche pas ce que montre « Mes pistes » derrière — comme le tri, déjà.

Laissés de côté : **Recevoir** (ce ne sont pas encore tes pistes —
filtrer là serait du rangement, pas de l'action) et **Campagnes** (ce sont
des campagnes, pas des pistes).


## H — les phrases longues, et celles qui sonnaient machine *(hors des 12)*

Relevé : 15 `hint` de plus de 70 caractères. **En contexte, seules 8
méritaient d'être touchées** — les autres sont soit des avertissements de
sécurité au moment du geste (`CLAUDE.md §7` les autorise), soit des états
vides qui enseignent (§6 les exige), soit des faits chiffrés.

**Une seule disparaît** : « Rien ne part tout seul : chaque jour, tes
envois prêts t'attendent dans "Aujourd'hui". » Le bouton juste au-dessus
dit déjà « Je valide chaque jour ».

**Sept raccourcies**, jamais vidées : la mention d'opposition (légale)
garde son « Obligatoire », la fenêtre d'envoi garde ses horaires,
« Optionnel — l'app reste la même sans. Obligatoire pour connecter… »
devient « Optionnel, sauf pour connecter une messagerie ou une IA. »

⚠️ **Une consigne devenue à moitié fausse** est partie avec : « Marque les
réponses sur les fiches quand elles arrivent. » Depuis #1, il y a deux
endroits pour marquer une réponse (la fiche pour toute l'entreprise, le
tiroir des personnes visées pour quelqu'un) — en désigner un seul
tromperait.

**Puis une seconde passe, demandée par le mainteneur** : *« change-les si
elles font trop IA »*. Les tells relevés et corrigés :

| Tell | Avant | Après |
|---|---|---|
| tiret cadratin à tout faire | `Tes anciennes sauvegardes… — détruis celles que tu ne veux plus.` | deux phrases |
| tournure littéraire | `la suite viendra d'elle-même` | `Reviens demain.` |
| adjectif télégraphique | `annulable juste après` · `rouvrable` | `Tu peux annuler juste après.` · `tu peux la rouvrir` |
| emphase dramatique | `C'est la seule issue si tu oublies ton code.` | `Sans elle, un code oublié ne se récupère pas.` |
| jargon administratif | `15/jour, toutes campagnes confondues` | `15 envois par jour en tout` |
| voix passive | `Confiée à ton ordinateur — les envois partent tout seuls` | `Ton ordinateur s'en occupe.` |

Règle qui en sort : **un tiret cadratin par phrase au maximum, et jamais
pour remplacer un point.** Deux phrases courtes se lisent mieux qu'une
phrase à charnière.

## I — simplifier l'esthétique *(hors des 12, captures du mainteneur)*

Cinq points relevés sur son iPhone. **Première série de propositions
refusée** : *« ça ne corrige pas réellement les problèmes, ça change de
forme »*. Les boutons devenaient des lignes, le titre devenait un bouton —
des transformations, pas des réparations. Leçon à garder : *chercher la
cause, pas une autre apparence.*

Le mainteneur a alors demandé de **se documenter avant de reproposer**.
Ce que la recherche a changé :

| Ce qui a été trouvé | Ce que ça a corrigé dans mes propositions |
|---|---|
| NN/g : on scanne une liste par ses **deux premiers mots à gauche** ; une icône n'aide que sur un libellé obscur | l'intuition du mainteneur sur les pictogrammes est confirmée — ils repoussent les mots qui servent à scanner |
| Apple HIG : un **geste complète** un bouton visible, il ne le remplace **jamais** | ma « ligne de titre cliquable » remplaçait l'attendu → abandonnée |
| Coin haut-gauche = zone la plus dure au pouce (Hoober) | le retour reste en place mais gagne **deux chemins de secours** |
| Mailchimp, Brevo, Unlayer : insertion **à la frappe**, jamais une rangée de boutons | mon bouton `＋ Insérer` n'était qu'un dixième bouton → remplacé par `@` |

**Ce qui est livré**

1. **Moi** — cadenas centré (`.td-lock` : une icône se centre, une date se
   pose sur la ligne de base) ; les deux boutons en `flex:1 1 0`, donc de
   même largeur par construction, en `btn-sm` ; « à remplir » supprimé, le
   libellé du bouton le disait déjà.
2. **Réglages** — plus de pictogrammes (le nom récupère 22 px, plus aucune
   ligne à deux étages) ; les états raccourcissent (`relié — en attente`
   → `en attente`, `à protéger d'abord` → `à protéger`) ; le retour perd
   sa boîte pour un chevron nu (`.abtn`), et gagne **retaper « Moi » dans
   la barre du bas** (racine de l'onglet, à la façon d'iOS) plus le
   **glissé depuis le bord gauche**.
3. **Prospecter** — `Tout cocher` ⇄ `Tout décocher`, le même lien que
   Donner et le partage en groupe, et il porte sur ce qui est **affiché**.
   Le raccourci « Cocher les N à contacter » part : depuis qu'« Affiner »
   est là, filtrer puis tout cocher fait mieux.
4. **Les plis** — la flèche entre dans la ligne (`summary` en flex) au lieu
   d'être posée devant : elle ne reste plus seule quand le titre plie.
   Corrigé pour **tous** les `pcard-details`.
5. **Modèles** — la liste prend la ligne des Réglages ; les neuf boutons
   d'insertion disparaissent au profit du **`@`** (`bindAtMenu`,
   `ui/tplfield.js`), qui ne se déclenche **qu'en début de mot** — le `@`
   d'une adresse e-mail ne l'ouvre pas.

**Les jetons se taisent.** Plus de fond teal ni de pointillé : un trait
sous le mot, à 28 % de l'accent. Le message se lit comme un message. Le
repère ne se réveille qu'au survol du jeton — pas quand on écrit à côté.

⚠️ **#4 se referme sans décision.** Sans pictogrammes dans les Réglages,
« Le Compagnon » ne porte plus l'éclair d'« Aujourd'hui » : le conflit
d'icône n'existe plus. Aucune icône à choisir.

⚠️ **Écarté sur décision du mainteneur** : replier « Domaine » dans la
feuille « Affiner ». Elle lui plaît telle quelle.

## J — le balayage du motif *(la moitié manquante du §I)*

Le mainteneur a rappelé la règle qu'il avait posée et que je n'avais
appliquée qu'aux cinq captures : **« lorsque je signale une chose, cherche
les occurrences à d'autres endroits pour les corriger SI c'est pertinent »**.
Deux points de sa liste restaient ouverts, et le motif vivait ailleurs.

### Ce qui restait de sa liste

- **« aligner ET réduire les boutons »** — je n'avais fait qu'aligner.
  La cause du surdimensionnement : **le bouton répétait le titre de sa
  carte**. « Mon profil » + « Remplir mon profil », « Garder une copie » +
  « Garder une copie ». Le titre dit de quoi il s'agit, le bouton dit le
  geste : **« Remplir »**, **« Télécharger »**. Les libellés rétrécissent,
  donc les boutons aussi — sans rien perdre.
- **« surtout pas ce `{{ }}` »** — il en restait un vrai à l'écran, que la
  refonte de l'éditeur ne touchait pas : `Lien CV — pour {{cv}} dans les
  emails`, dans « Mon profil ». Supprimé. Un test de la passe de
  vérification échoue désormais si un `{{` réapparaît dans cette feuille.

### Le motif, partout où il vivait

| Ce qui a été trouvé | Où | Corrigé en |
|---|---|---|
| **Du texte déguisé en bouton** : `.lk-why` portait bordure + fond surélevé, l'habit exact d'un `.pick`, et trois d'entre eux étaient même posés dans un `pick-list` | Protection (×2), Compagnon (×2), Recevoir — **15 lignes, 5 écrans** | une ligne de CSS : plus de boîte. Seuls les boutons ont désormais l'air de se taper |
| **L'icône collée au mot** : `.linklike` était en `inline-flex` sans `gap` | 7 liens (Réglages, fiche, écrire, capture, appareils ×2) | `gap:6px`, une fois pour toutes |
| **Une carte-titre + un bouton** qui fait le travail d'une porte, avec « Entrer » qui ne dit rien de plus | Échanger — « Partage en groupe » | la porte de « Moi » à l'identique (`pcard moi-door`) |
| **Une explication au lieu d'un état** | « Mes appareils » : « Le Compagnon · s'installe et s'associe depuis ton ordinateur » (×2) | « pas installé · voir › » — la même règle que la liste des Réglages : l'état ici, le chemin sur l'écran d'après |
| **Un libellé de lien qui porte sa notice** | « Ajouter le Compagnon — cet ordinateur enverra même app fermée » (×2) | « Ajouter le Compagnon » |
| **Un commentaire sous chaque bouton** | Clôturer : « bravo ! », « la suivante sera la bonne », « on passe à autre chose » | rien — « Décroché / Refusé / Abandonné » se suffisent, et l'encouragement vit déjà dans le toast qui suit |
| **Deux frères écrits différemment** | Recevoir : « Ton ordinateur lit tes 7 derniers jours » vs « Les 30 derniers jours · plus complet » | un libellé au-dessus (`ton ordinateur lit`), deux boutons parallèles où seul le nombre change |
| **Une explication sur l'étiquette d'un champ** que le texte d'exemple disait déjà | Technos, Profil, Entreprise, Contact (×2), « Quand ? » | l'étiquette seule ; l'exemple reste dans le champ |
| **Une phrase entière en descriptif** | Campagne : « il prendra la campagne dès qu'il te rejoint » | « dès qu'il te rejoint » |
| Divers | « et y ranger le contact », « WhatsApp, mail… » | retirés |

**La règle qui a servi de tri** — un `<span>` sous un bouton **reste** s'il
porte un état ou une donnée (une date, un compte, un nom de fichier, un
statut) ou s'il est le **seul** départage entre deux frères (« en personne »
/ « à distance », « maintenant » / « sur 2 semaines »). Il **part** s'il
explique, encourage, ou répète.

**Un plafond, aussi** : `.pc-actions>.btn` gagne `max-width:240px`. Aligner
deux boutons évitait qu'ils soient inégaux ; sur l'ordinateur ça étirait
« Télécharger » sur 700 px de carte. Les deux travers sont refermés.

⚠️ **Un test a dû changer d'endroit, pas de promesse.** `e2e-ux-audit`
exigeait l'explication « depuis ton ordinateur » sur la LIGNE du Compagnon.
Elle vit maintenant sur la feuille d'après — que le même test vérifiait
déjà. L'assertion contrôle désormais que la ligne dit son **état** et,
symétriquement, qu'elle ne réexplique **pas**.

## K — « Moi » repensée en feuille de propriétés *(à la demande du mainteneur)*

*« J'ai l'impression d'avoir dénaturé la page Moi. J'aimerais qu'on la
repense à deux »* — puis *« renseigne-toi sur ce genre d'interface, étant
donné que le style est 98 utilitaire »*.

**Le diagnostic.** Chaque correction du §I et du §J était juste prise
seule, mais l'ensemble avait perdu son centre : quatre cartes, quatre
grammaires ; aucun nom d'objet en tête (la page s'appelle « Moi » et ne
disait jamais qui) ; une hiérarchie inversée (la sauvegarde criait, le
profil chuchotait) ; et deux cartes sur quatre déjà devenues des listes —
un mouvement commencé, pas fini.

**Ce que la recherche a tranché.** Une page « Moi » est très exactement
l'objet que décrivent les guidelines d'origine : une *property page*.

| Règle, mot pour mot | Ce qu'elle a décidé |
|---|---|
| « Put the object's name on the first page » + « display the appropriate icon in the **upper-left corner** » | l'en-tête d'objet (`.obj`) remplace la carte « Mon profil » |
| « Group boxes… are visually heavy and should be used **sparingly** » | 4 cartes → 2 cadres |
| « Use group boxes only when the group **doesn't contain all controls on the surface** » | trois des quatre cartes n'avaient pas le droit d'être des cadres |
| « Make pages coherent by relating all properties to a **single, task-based purpose** » | on range par usage (« Ce que j'envoie ») et non par objet |
| « Buttons that apply only to individual pages go **directly on the property page** » | « Télécharger » reste DANS son groupe |
| « **Don't repeat the group box label** in control labels within the box » | la règle du §J, retrouvée à l'identique dans la source d'origine |
| « General page first, **Advanced page last** » | « Réglages » ferme la page |

**Ce qui est livré** — le mainteneur a choisi le **vrai group box** (le
composant `Fieldset` du kit `design/`, jusque-là jamais utilisé dans
l'app) plutôt que les simples séparateurs :

1. **`.obj`** — icône en haut à gauche, nom, formation, email, et
   « Modifier » à droite. À vide : la phrase (débarrassée de ses
   deux-points, qui la faisaient sonner machine) et « Remplir mon profil ».
2. **`.fset` « Ce que j'envoie »** — Modèles d'emails · CV · Lettres. Les
   trois font le même travail ; ils étaient séparés par hasard.
3. **`.fset` « Ma copie »** — l'état, l'étiquette « privé inclus »,
   « Télécharger » et le cadenas du mot de passe.
4. **« Réglages »** — une ligne au pouce (qui ouvre le sous-écran), la 2ᵉ
   colonne à la souris. Le sous-écran prend `fset-plain` : un cadre sans
   légende, puisque le titre de l'écran nomme déjà.
5. `.doc-door` **supprimé** : c'était le sosie de `.rg-row`, avec sa propre
   CSS. Une seule ligne dans toute l'app.
6. La ligne « 5 Ko sur 988,1 Mo » **part**.

⚠️ **Un token neuf : `--border-frame`.** Le cadre était en `--border-soft`
— exactement la valeur des pointillés qu'il contient. En thème clair le
plein contre le pointillé sauvait la lecture ; **en sombre les deux se
confondaient** et le cadre cessait d'être un cadre. Impossible de
réutiliser `--border-field` (il vaut l'encre en clair, le cadre serait
devenu noir). D'où un ton propre, entre le séparateur et le contour :
clair `#A8A395`, sombre `#4E5A68`. Vérifié dans les deux thèmes.

⚠️ **`e2e-liaison` est intermittent** — et ce n'est pas cette refonte : sur
l'arbre d'AVANT, lancé au même moment, il échoue à la même ligne. C'est le
seul scénario qui passe par de vrais relais Nostr publics ; il tombe à un
endroit différent à chaque échec (« liaison sync prouvée », « piste B→A »,
ligne 110). Seul, il passe. À relancer, pas à corriger.

## L — Donner et Recevoir en onglets *(l'idée du mainteneur : « un système de slide »)*

Son intuition tombait sur un motif d'origine. Les guidelines la valident
mot pour mot, et condamnent au passage ce qui existait :

| La règle | Ce qu'elle décide |
|---|---|
| « Tabs work best when information is **related and independent** across pages » | QR · Fichier · Texte sont trois façons indépendantes de faire la même chose → des onglets |
| « Consider alternatives if **tabs represent task steps — use wizards** » | l'inverse est vrai aussi : nos canaux n'étaient PAS des étapes, or Donner les enchaînait comme un assistant (3 écrans) |
| « If users are likely to start with the **last tab displayed**, make the tab persist » | l'onglet retenu d'une ouverture à l'autre (en mémoire, pas une clé de stockage) |
| « If a tab **doesn't apply to the current context, remove it** » | sans caméra, plus d'onglet « Scanner » |
| « Use **vertical tabs for eight or more** » | la variante en colonne (3 onglets) était hors-règle : écartée |

**Le glissé est un champ de mines** — trois gestes se disputent le doigt,
et chacun est traité à la source :
1. la feuille se ferme déjà en glissant **vers le bas** → l'axe se
   verrouille au premier mouvement (>8 px), seul l'horizontal compte ;
2. iOS **revient en arrière** depuis le bord gauche → les 24 premiers
   pixels sont ignorés, et c'est précisément pour ce cas que le chevron
   existe ;
3. glisser dans un champ, c'est **sélectionner** → aucun glissé n'y démarre.

**Le chevron ne ment pas.** Dans la maquette il était en
`pointer-events:none` : il ressemblait à un bouton sans en être un.
Il est devenu une commande de 26 px sur toute la hauteur, et il n'existe
que du côté où il reste un onglet.

**L'état quitte le contenu.** Cinq lignes s'étaient empilées sous le code
(état, consigne, repli, points, notice de geste). Les points répétaient
les onglets, la notice ne sert qu'une fois, la consigne redisait le QR.
Reste l'état — et il va dans `setStatus`, la barre d'état de la fenêtre.
Elle **disparaît** quand il n'y a rien à dire : sur un téléphone, une
bande permanente coûterait 26 px pour rien.

**Le réseau ne se réveille plus tout seul.** Le rendez-vous P2P n'est
ouvert que si l'onglet QR est réellement affiché, et rendu (`onHide`) dès
qu'on le quitte. À la souris, où le QR n'est qu'une colonne parmi
d'autres, on s'en tient au QR hors ligne — un rendez-vous se demande d'un
bouton. Trois pistes tiennent dans l'image : la barre d'état dit
« ✓ hors ligne — un scan suffit », et **rien ne part sur le réseau**.

**La caméra se compte sans rien demander.** `hasCamera()` lit
`enumerateDevices` : 0 entrée vidéo = pas de caméra, et l'état de
permission reste « prompt » — le test le prouve. Elle s'éteint aussi
quand l'app passe en arrière-plan.

⚠️ **Un vrai bug de conception, trouvé par le test.** Retirer l'onglet
« Scanner » sans caméra emportait **le champ de code avec lui** : sur une
tour de bureau, plus aucun moyen de taper le code qu'on te dicte. Ce qui
n'existe pas sans caméra, c'est la caméra — pas le rendez-vous. L'onglet
reste donc, sous son vrai nom : **« Code »**.

⚠️ **Un second bug, trouvé à l'écran.** « Chiffrer » vivait dans chaque
panneau. Au pouce on n'en voit qu'un ; à la souris les deux cadres sont
visibles **en même temps** → deux cases et un `id` dupliqué. C'est UN
réglage : il est posé une fois, sous les deux. Un test le verrouille.

**Ce que ça enlève** : Donner passe de **3 écrans à 1** (les pistes se
choisissent au-dessus des onglets, plus dans une étape à part), et
« Coller » cesse d'être un écran pour devenir l'onglet « Texte ».

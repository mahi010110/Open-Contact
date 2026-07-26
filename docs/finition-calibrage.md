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

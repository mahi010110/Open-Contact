# Proposition R5 — Un seul « moi »

**Statut** : proposée le 20 octobre 2026, en attente du mainteneur.
C'est l'étape 1 du cycle d'un lot (`docs/recadrage.md`) : rien ne se
code avant ta validation. C'est le lot le plus délicat : l'analyse des
menaces est écrite ici, avant le code (OWASP ASVS 5.0, niveau 1).

## Le problème

Aujourd'hui, ce qui fait « moi » dans l'app est éparpillé en trois
secrets, et aucun ne ramène tout :

| ce qui existe | ce qu'il ramène | sa faiblesse |
|---|---|---|
| la **phrase de liaison** (`oc_sync_v1`) | mes pistes, sur mes autres appareils | choisie par l'étudiant, donc parfois courte ; inutile s'il n'a qu'un téléphone |
| le **code et la phrase de secours** du verrou (`oc_vault_v1`) | l'accès à CET appareil | ne ramène rien sur un autre |
| le **fichier de copie** (`.oc`) | tout : pistes, profil, amis, clé de boîte, groupes | il faut y avoir pensé, et l'avoir rangé ailleurs |

Un téléphone perdu, sans autre appareil ni copie récente, et tout part :
les pistes, mais aussi les amis (leurs lettres arrivent à une boîte dont
on n'a plus la clé) et les groupes (leurs codes vivaient dans le profil).

## Ce qui existe déjà, et ne doit pas casser

- La sync de mes appareils (`engine/sync.js`, l'anneau signé
  `oc_devring_v1`), la copie `.oc` et sa restauration, le verrou et sa
  rotation (`engine/vault.js`).
- Les clés stockées : `amiId`, `boite` ({pub, priv}), les `sign` des
  groupes. Les amis m'écrivent à `boite.pub` : la changer, c'est ne plus
  rien recevoir d'eux tant qu'ils n'ont pas rescanné mon QR.

## Le temps accordé

Trois semaines au plus, comme le plan. Derrière un drapeau daté (`moi`),
en préversion d'abord. Les anciennes clés restent lues au moins une
version entière.

## La solution esquissée

**① Une phrase de secours, donnée par l'app.** Douze mots d'une liste
française, tirés au hasard par l'appareil (128 bits), montrés une fois
à écrire sur papier, puis vérifiés (deux mots à retaper). L'étudiant ne
la choisit pas : une phrase choisie se devine.

**② Elle ramène, sur un téléphone neuf, ce qui est rangé.** Tout ce qui
voyage déjà dans la copie `.oc` (pistes, profil, amis, clé de boîte,
groupes) est scellé sous une clé tirée de la phrase, et déposé sur les
relais, en morceaux, redéposé à chaque ouverture de l'app (un relais ne
garde pas pour toujours). Sur le téléphone neuf : « J'ai déjà
OpenContact », les douze mots, et tout revient — aperçu d'abord,
« Annuler » ensuite (invariant ②).

**③ Elle relie mes appareils.** La salle de la sync se tire de la même
phrase : plus de phrase de liaison à inventer. L'ancienne reste lue
une version entière.

**④ Elle rouvre le verrou.** Elle devient la phrase de secours du coffre,
à la place de celle d'aujourd'hui, pour qu'il n'y en ait qu'une.

Le fichier de copie reste : c'est le chemin qui ne dépend de rien, et
le seul garanti.

## L'analyse des menaces

| menace | ce qu'elle coûte | la parade |
|---|---|---|
| **Quelqu'un lit la phrase** (papier photographié, épaule, capture d'écran) | tout : pistes, amis, groupes, lire mes lettres, écrire en mon nom, effacer mes appareils | elle ne s'affiche qu'une fois, jamais dans une capture partagée (pas dans le diagnostic), jamais dans un partage ; « Changer de phrase » refait tout et rend l'ancienne inutile |
| **Hameçonnage** (« donne-moi tes 12 mots pour t'aider ») | le même | une phrase sur l'écran, au moment où on la montre : « Personne n'a besoin de ces mots, pas même OpenContact. » — la seule phrase d'explication, elle prévient d'une perte |
| **Un relais garde la copie scellée et la force hors ligne** | tout, si la phrase est faible | 128 bits tirés par l'appareil (pas choisis), dérivation PBKDF2-SHA256 à 600 000 tours comme le coffre ; ni nom, ni pseudo : une étiquette tirée de la phrase |
| **Un relais relie mes dépôts dans le temps** (la même étiquette chaque jour, et une adresse IP) | qu'une personne utilise OpenContact, et quand | une étiquette qui change chaque semaine (dérivée de la phrase et du numéro de semaine) ; rien de lisible dans l'événement |
| **Les relais perdent la copie** | rien ne revient sur le téléphone neuf | elle est redéposée à chaque ouverture, sur plusieurs relais, et la rétention est **mesurée avant le code** (une sonde, comme pour la boîte aux lettres) ; la copie `.oc` reste le chemin garanti, et l'app le dit |
| **Une copie ancienne écrase une plus récente** | des pistes perdues | jamais d'écrasement : la fusion de la sync (le plus récent gagne, tombstones), aperçu avant, « Annuler » après |
| **Une clé de boîte qui change** | mes amis m'écrivent dans le vide | la clé de boîte n'est **pas** recréée : elle est ramenée telle quelle par la copie ; un compte d'avant garde la sienne |
| **Phrase perdue et téléphone perdu** | tout | c'est le contrat du local-first, dit au moment de la noter ; la copie `.oc` reste |
| **Migration ratée** | un appareil qui ne s'ouvre plus | les anciennes clés (`oc_sync_v1`, enveloppes du coffre) restent lues une version entière ; le passage est un geste, jamais forcé au démarrage |

## Hors champ

- Tout serveur à nous : la copie scellée vit sur les relais publics, au
  même titre que la boîte aux lettres et les groupes (§10).
- Récupérer une phrase perdue : impossible par construction.

## Les questions au mainteneur

1. **Où la phrase ramène-t-elle les choses ?** Je recommande les relais,
   comme la boîte aux lettres, **après** une mesure de leur rétention :
   c'est le seul moyen de tout ramener sur un téléphone neuf sans
   serveur. L'autre choix : rien sur les relais — la phrase relie
   seulement mes appareils et rouvre le verrou, la copie `.oc` reste le
   seul retour.
2. **La phrase est-elle tirée par l'app ?** Je recommande douze mots
   tirés par l'appareil. L'autre choix : une phrase choisie par
   l'étudiant, plus facile à retenir, mais qui se devine.
3. **Remplace-t-elle les phrases d'aujourd'hui ?** Je recommande qu'elle
   remplace la phrase de liaison et la phrase de secours du verrou (les
   anciennes restent lues une version entière). L'autre choix : elle
   s'ajoute, et les trois coexistent.

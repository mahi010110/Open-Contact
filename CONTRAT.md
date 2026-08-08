# Le contrat de données d'OpenContact

Ce document fige ce qui ne doit **jamais** casser, quelle que soit la refonte
de l'interface. Tant que les quatre sections ci-dessous sont respectées, un
utilisateur peut changer de version sans perdre une donnée, et un fichier
`.oc` circule entre versions différentes sans accroc.

Ce contrat est **exécutable** : ouvrir l'app avec `?test` dans l'URL fait
tourner les auto-tests (`tests.js`), qui vérifient chaque point ci-dessous.
Une modification qui fait passer un test au rouge casse le contrat — elle
doit être repensée, pas forcée.

---

## 1. Les clés de stockage (navigateur) — intouchables

| Clé | Contenu | Format |
|---|---|---|
| `oc_data_v3` | Les pistes (partagé + suivi privé) | JSON : tableau de pistes |
| `oc_profile_v1` | Profil, modèles d'emails, prompts IA (8 × 4 000 car. max), fiches confirmées, flags, `updatedAt` (LWW appareils). Deux drapeaux décident de ce qui sort de MOI : `flags.carte` (les champs du profil qui voyagent — défaut `['formation','email']`) et `flags.joindreProfil` (joindre mon profil à un partage de pistes — défaut **faux**, un partage est anonyme tant qu'on n'a pas dit le contraire). Retenus d'une fois sur l'autre, mais jamais silencieux : l'écran affiche le contenu exact avant chaque départ | JSON : objet profil |
| `oc_journal_v1` | Journal privé des actions (200 max). **Deux phrases de `txt` sont relues, pas seulement écrites** : `Donné (canal) : N piste(s)` et `Reçu de <qui\|la promo> : +N piste(s)…` alimentent le fil de l'écran « Échanger » (`engine/assist.js` → `exchangeLog`). Les relire plutôt qu'ajouter un champ garde l'historique DÉJÀ écrit visible ; en échange, ces deux formes sont figées et verrouillées par `tests.js`. Toute autre entrée reste du texte libre, et `Reçu (analyse IA triée)` est exclu par construction (ce n'est pas un échange avec la promo). **`ids` est un champ AJOUTÉ, jamais un renommage** : les entrées d'échange écrites depuis la v6.4 portent les identifiants des pistes concernées (données pour un `Donné`, ajoutées ou complétées pour un `Reçu` — c'est `mergeIncoming().ids` qui fait foi), plafonnés à 200 par entrée. C'est ce qui permet d'ouvrir une ligne de « Tes échanges » sur ce qui a circulé. Une entrée sans `ids` (écrite avant, ou revenue d'une sauvegarde) reste lisible : elle s'affiche, elle ne s'ouvre pas | JSON : tableau `{t, txt, cid, ids?}` |
| `oc_orphans_v1` | Contacts « à rattacher » (sans entreprise) — l'indice d'entreprise saisi par l'utilisateur voyage dans `extra.company` (D3), consommé au rattachement | JSON : tableau de contacts |
| `oc_tombs_v1` | Suppressions (tombstones, 500 max) — font voyager les suppressions entre MES appareils | JSON : tableau `{id, t}` |
| `oc_group_v1` | **Mon groupe** : les camarades avec qui j'échange (200 max) — `{id, prenom, nom, formation, email, phone, link, note}`. **La donnée la plus sensible de l'app, et la seule qui n'est pas celle de l'utilisateur** : c'est la vie privée de ses camarades. Elle ne sort donc dans AUCUN partage communautaire — ni `kind:"share"`, ni OCQ, ni le partage en groupe. Elle voyage vers MES appareils (§5) et dans MA copie (`kind:"full"`, champ `groupe`, ignoré sans casse par un lecteur ancien). Scellée (SEALABLE), emportée par le `wipe`. Seul `prenom` est obligatoire — sans lui l'entrée est refusée, parce qu'elle ne relierait aucune déclaration « j'y suis passé » à personne | JSON : tableau de membres |
| `oc_sync_v1` | Phrase de liaison de mes appareils | chaîne |
| `oc_relays_v1` | Relais P2P personnalisés (optionnel — vide = relais publics) | JSON : tableau d'URLs |
| `oc_turn_v1` | Serveurs TURN personnalisés (optionnel — pour les réseaux qui bloquent le pair-à-pair ; identifiants obligatoires — RTCPeerConnection refuse `turn:` sans eux — et scellés comme les relais) | JSON : tableau `{urls, username, credential}` |
| `oc_device_v1` | Cet appareil — identité annoncée à la sync | JSON : `{id, name}` |
| `oc_devices_v1` | Appareils reliés déjà vus (12 max, consultables et élagables) | JSON : tableau `{id, name, seen}` |
| `oc_promo_v1` | Dernier mot de passe de partage en groupe (confort de saisie) | chaîne |
| `oc_vault_v1` | Métadonnée du coffre (profil protégé) : enveloppes de la clé maîtresse par code / phrase de secours / PRF — **jamais la clé en clair**. Pendant une rotation, `prev` porte l'ANCIENNE clé maîtresse scellée sous la nouvelle (`OCV1.`) : la métadonnée s'écrit avant le re-scellement, une interruption se reprend au déverrouillage suivant sans perte, puis `prev` est retiré | JSON : `{v, gen, at, wraps, prev?}` |
| `oc_devring_v1` | Anneau d'appareils : registre signé (appareil principal, membres, commandes) + clés Ed25519 de CET appareil + commandes déjà appliquées | JSON : `{ring, keys, applied}` |
| `oc_campaigns_v1` | Campagnes de prospection (privé — messages figés au montage, journal des envois faits ; chaque envoi porte un identifiant stable `id.cible.étape` : rejouer ne double jamais). Plafond de 15 envois/jour **global, toutes campagnes confondues** (`dueSendsAll` fait foi dès qu'il en existe plusieurs) et fenêtre d'envoi imposée : jours ouvrés, 8 h – 19 h locales | JSON : tableau de campagnes |
| `oc_mail_v1` | Connexions messagerie : jetons OAuth et adresse d'envoi — **exige le profil protégé** (valeur toujours scellée) | JSON : `{gmail, outlook, clients}` |
| `oc_ai_v1` | Connexions IA : fournisseur actif + clé API — **exige le profil protégé** (valeur toujours scellée) ; la clé ne sort jamais dans un log ni un export. `provider` ∈ {`anthropic`, `gemini`, `openrouter`} (appel navigateur direct) ∪ {`ollama`, `openai`, `chatgpt`} (l'appel part de l'ordinateur : la demande voyage sur le canal chiffré du Compagnon, la clé y sert l'appel puis s'oublie — jamais écrite là-bas, ni disque ni journal). `model` : choisi par l'utilisateur **dans la liste vivante du fournisseur** (aucun modèle implicite ni codé en dur — un appel sans modèle est refusé `modele`) ; seule exception : `chatgpt` avec `model` vide = le modèle réglé dans Codex par l'utilisateur, affiché comme tel | JSON : `{provider, key, model}` |
| `oc_missions_v1` | Bons de mission du Compagnon : idempotents (repliés sur le journal de campagne), bornés (expiration), révocables ; un résultat d'analyse = enveloppe `share` qui repasse par l'aperçu. Sur le fil, une mission voyage **signée** : `{m, sig, dev}` — `m` est la chaîne JSON exacte signée Ed25519 par l'appareil émetteur, vérifiée octet à octet (PWA `openMissionWire` ET cœur Rust du Compagnon, à CHAQUE lecture). `dev` peut être l'ordinateur appairé ou un autre membre (téléphone) : le Compagnon résout sa clé dans l'anneau signé. Côté PWA la clé garde les remises : `[{mid, cpId, wire, state: a_confier·confiee·revoquee, stops[], revOk?}]` | JSON : tableau de missions |
| `oc_companion_v1` | Association au Compagnon : clé de canal née de l'appairage par code court + identité du Compagnon (`{k, id, nom, pub, at}`) — **exige le profil protégé** (valeur toujours scellée). Le canal local (127.0.0.1) ne transporte que des enveloppes `OCV1.` : l'appairage sous PBKDF2(code, 120 000 itér.), la suite sous `k` — rien d'utile en clair | JSON |
| `oc_proposals_v1` | Propositions de l'assistant IA (serveur MCP local du Compagnon, coupé par défaut) en attente de tri : `{v, actif, list: [{pid, at, n, share}], done: [{pid, a}]}` — `actif` mémorise l'autorisation donnée dans la feuille du Compagnon (sans lui, la PWA ne sonde jamais) ; `share` est une enveloppe `share` ordinaire qui repasse par `parseInput` → aperçu multi-sélection → fusion §4, JAMAIS une écriture directe ; `pid` (hash du contenu) rend le rejeu idempotent, `done` (50 max) garde les propositions déjà fusionnées/écartées pour qu'elles ne réapparaissent jamais ; 5 en attente max ; scellée (SEALABLE), emportée par le `wipe` | JSON |
| `oc_theme` | `light` ou `dark` | chaîne |
| `oc_view` | `map`, `list` ou `grid` (héritée, plus écrite) | chaîne |
| `oc_data_v2`, `ais_stage_targets_v1` | Anciennes clés (v1/v2), lues une seule fois pour migration | lecture seule |

Depuis la v6.1, ces clés vivent dans **IndexedDB** (base `oc_kv_v1`, magasin
`kv`) avec les **mêmes noms** ; `localStorage` reste lu en repli, ce qui migre
automatiquement les données existantes sans les toucher. L'ordre des backends :
`window.storage` → IndexedDB → localStorage → **Cache API** → mémoire.

Le rang **Cache API** (cache nommé `oc-kv-v1`, une entrée par clé sous
`oc-kv/<clé>`) est le dernier coffre **persistant** : il sert quand les deux
premiers refusent, c'est-à-dire en navigation privée verrouillée. Sans lui on
tombait en mémoire — l'application marchait et tout disparaissait au
rechargement. **`sw.js` doit l'exclure de sa purge d'activation** (il ne
supprime que les vieilles caches d'application) : sinon chaque mise à jour
effacerait les pistes, exactement ce que ce rang existe pour éviter.
Le rang `mémoire` reste le dernier recours, et lui seul lève l'avertissement
« rien ne s'enregistre ici » (`rawSet` y rend `false`).

Les PDF (CV, lettres) vivent dans **IndexedDB** : base `oc_docs_v1`,
magasin `docs` — séparés exprès des pistes pour qu'un document lourd ne
puisse jamais les bloquer ni les faire perdre. Depuis la v7 (décision #4),
le magasin range **des variantes nommées** sous les clés `cv_<id>` et
`lm_<id>` ; les clés héritées `cv` et `lettre` restent lues comme des
variantes ordinaires (rien à migrer, rien ne se renomme). La commande
`wipe` (§5.7) vide tout le magasin.

Renommer une clé = perte de données pour tous les utilisateurs existants.
On ne renomme jamais ; si le format d'une clé doit évoluer, on crée une
**nouvelle** clé versionnée et on migre à la lecture (comme v1 → v2 → v3).

**Profil protégé (coffre)** : quand `oc_vault_v1` existe, les valeurs des
clés de données et de secrets sont écrites **scellées** sous la forme
`OCV1.<iv base64>.<contenu chiffré base64>` (AES-GCM 256 sous la clé
maîtresse, AAD = nom de la clé — une enveloppe ne se rejoue pas sous un
autre nom). Les **noms** de clés ne changent pas. Une valeur claire héritée
reste lisible telle quelle (migration à l'écriture) ; une valeur scellée lue
sans coffre déverrouillé est une **erreur** (`verrou`), jamais un `null`
silencieux. La clé maîtresse est enveloppée (wrap AES-GCM) sous des clés
dérivées : code PIN et phrase de secours par PBKDF2-SHA256 (600 000
itérations à l'écriture, 10 000 à 2 000 000 acceptées à la lecture), secret
PRF (WebAuthn) par HKDF-SHA256. Code perdu **et** phrase perdue = contenu
irrécupérable — c'est le contrat du local-first.

## 2. Le format `.oc` — intouchable

### L'enveloppe (JSON)

```json
{ "v": 4, "app": "5.0.0", "kind": "share", "companies": [] }
{ "v": 4, "app": "5.0.0", "kind": "full",  "profile": {}, "companies": [] }
{ "v": 4, "app": "5.0.0", "kind": "card",  "card": {}, "companies": [] }
```

- `v` : version du **format** (4). `app` : version de l'application émettrice
  (informatif).
- `kind: "share"` : pistes en **vue communautaire** (voir §3) — jamais de
  champ privé, jamais **mon groupe**. Champ optionnel `card` : MON profil,
  et seulement s'il a été **joint explicitement** au moment du geste. Sans
  ce geste, un partage reste anonyme exactement comme avant.
- `kind: "full"` : sauvegarde personnelle complète — pistes avec suivi privé,
  plus le profil, plus les champs **optionnels** `orphans` (contacts « à
  rattacher »), `tombs` (suppressions) et `groupe` (mes camarades, §1) s'il y
  en a. Un lecteur qui les ignore charge quand même le reste sans erreur.
- `kind: "card"` : **mon profil seul** — « on échange nos profils », sans
  aucune piste. `card` porte `{prenom, nom?, formation?, email?, phone?,
  link?}` : `prenom` obligatoire, le reste selon ce que l'utilisateur a coché
  (décoché = **absent** du fichier, pas vide dedans). `companies: []` n'est
  **pas un oubli et ne doit jamais disparaître** : c'est lui qui permet à une
  version antérieure de lire le fichier, d'y voir zéro piste et de le dire —
  sans lui, `parseInput` rejetterait un format qu'elle ne connaît pas.
- Tolérance à la lecture : un simple tableau JSON de pistes est aussi accepté.

### Compact — OCQ1 (échange par QR)

```
OCQ1.<payload share compressé deflate-raw, en base64url>
```

Une enveloppe `kind:"share"` **ou `kind:"card"`** (jamais de privé, jamais
mon groupe), compressée par l'API native
`CompressionStream` puis encodée base64url. Lu par `parseInput` comme les
autres formats. Si l'API manque (très vieux navigateur), l'émetteur replie
vers le fichier `.oc` — le format ne change pas.

### Rendez-vous — OCR1 (QR appairé, P2P)

```
OCR1.<code court>
```

Le QR ne porte pas les données : un petit **code de rendez-vous**,
typable sans caméra (alphabet sans ambiguïté — ni i, l, o, 0, 1 —,
8 à 24 caractères une fois normalisé en minuscules sans séparateurs).
Les deux appareils dérivent la même salle P2P éphémère du code
(préfixe de salle `give-`, mêmes règles de transport que §5 : la
salle porte un hash, les données sont chiffrées de pair à pair) et
les fiches passent par la connexion — exclusivement en `sharePayload`
(vue communautaire, §3) avec l'aperçu avant fusion (§4). Un lecteur
ancien ignore ce préfixe sans casse ; le repli hors ligne reste
OCQ1/OCQP et le fichier `.oc`.

### Phrase de liaison de MES appareils — OCL1 (QR, jamais communautaire)

```
OCL1.<phrase de liaison>
```

Le QR affiché par « Mes appareils » pour éviter de **retaper** la phrase
sur le second appareil. Il porte la phrase telle quelle, en minuscules —
`linkWrap` / `linkParse` (`engine/exchange.js`), 4 à 40 caractères
`[a-z0-9-]`, jamais un tiret en tête.

**Le préfixe est distinct de OCR1, et ça n'est pas cosmétique.** Un
rendez-vous ouvre une salle de partage *communautaire* (vue partageable
seulement) ; une phrase de liaison donne accès à **tout le privé** de
son propriétaire (§5). Les confondre serait la pire erreur du format :
`linkParse` refuse un OCR1 et `rdvParse` refuse un OCL1, et `tests.js`
verrouille les deux sens.

Ce QR porte donc un secret : l'interface ne l'affiche **que** lorsque la
phrase elle-même est à l'écran, et il disparaît avec elle.

### Compact multi-parties — OCQP (QR animé)

```
OCQP.<i>.<n>.<tranche>
```

Quand l'OCQ1 dépasse ce qu'un seul QR lisible peut porter, la chaîne
complète est découpée en `n` tranches (`i` de 1 à `n`, 512 max) que
l'émetteur fait défiler à l'écran ; le lecteur réassemble dans n'importe
quel ordre puis relit l'OCQ1 obtenu. Un lecteur ancien ignore ce préfixe
sans casse — et le fichier `.oc` reste toujours possible.

### Chiffré — OC2 (format actuel)

```
OC2.1.<itérations>.<sel base64>.<iv base64>.<contenu chiffré base64>
```

AES-GCM 256 bits, clé dérivée du mot de passe par PBKDF2-SHA256
(600 000 itérations à l'écriture ; de 10 000 à 2 000 000 acceptées à la
lecture). L'ancienne forme `OC2.<sel>.<iv>.<contenu>` (150 000 itérations
implicites) reste lisible. Aucune clé n'existe dans le code : mot de passe
perdu = contenu irrécupérable.

### Scellé — OC1 (hérité)

`OC1.<somme fnv en hexa>.<contenu>` : **lecture seule**, pour compatibilité
avec les anciens fichiers. Un contenu altéré est refusé (`altéré`).

### Garde-fous à la lecture

Entrée de plus de 4 Mo refusée (`troplourd`) ; un OCQ1 dont le contenu
**décompressé** dépasse 4 Mo est refusé aussi (`troplourd` — bombe de
décompression) ; plus de 2 000 pistes refusées (`tropdepistes`) ; entrées
sans `name` ignorées silencieusement.

## 3. Le schéma d'une piste — intouchable

Une piste normalisée a exactement ces champs :

**Partagé** — part dans un fichier `kind:"share"` :
`name`, `city`, `domain`, `desc`, `address`, `website`, `techs`,
`positions[]`, `process`, `tips`, `contacts[]`, `lat`, `lng`, `verifiedAt`,
`confirmations`, `updatedAt`, `vecu`, `vecuQui` (+ `extra` si présent).

**Privé** — ne part **jamais** dans un partage :
`status`, `notes`, `appliedAt`, `nextAction`, `nextActionText`, `closedAt`,
`closedReason`, `nextActionCt`, `history[]` (40 entrées max).
Ni `id`, ni `demo`, ni `createdAt` ne circulent non plus.

**Un contact** : `id`, `name`, `role`, `email`, `phone`, `link`, `note`,
`conf` (`""` | `"ok"` | `"doubt"`) (+ `extra` si présent).

**Champs d'action (v7, décision #14) — optionnels, absents quand vides,
privés.** Au contact : `activatedAt` (jour `AAAA-MM-JJ` — le contact est
« activé » : on lui a écrit ou posé une action ; absent = simple nom
connu) et `src` (`"promo"` = arrivé par un partage). À la piste :
`nextActionCt` (id — jeton `[A-Za-z0-9._-]{1,64}` — du contact que vise
la prochaine action). Un lecteur ancien les range dans `extra` sans
casse ; une version récente les en remonte (migration en lecture, doublon
purgé). Ils ne sortent **jamais** dans un partage : `communityView` ne les
émet pas et les purge aussi d'`extra` ; la fusion communautaire vide
`activatedAt`/`nextActionCt` entrants et pose `src:"promo"` sur tout
contact ajouté par partage.
`link` est toujours en `http(s)` après normalisation : tout autre schéma
(`javascript:` et consorts) est neutralisé — un lien piégé dans un fichier
reçu ne doit jamais devenir cliquable.

**Normalisation défensive** (piste et contact) : un `id` n'est accepté
que sous forme de jeton `[A-Za-z0-9._-]{1,64}` (sinon régénéré — il finit
en attribut DOM) ; les dates `nextAction`, `appliedAt`, `closedAt`,
`verifiedAt` n'acceptent que la forme `AAAA-MM-JJ` (un horodatage complet
est tronqué au jour, le reste est vidé) ; les clés `__proto__`,
`constructor` et `prototype` d'un objet reçu sont ignorées.

**Vocabulaires fermés** :
- `domain` : `esn`, `cyber`, `cloud`, `dsi`, `public`, `startup`,
  `industrie`, `commerce`, `sante`, `autre` — valeur inconnue → `autre` ;
- `status` : `todo`, `active`, `reply` — valeur inconnue → `todo`.
  **Migration v5** (lecture seule, jamais réécrite en sortie) : `sent` et
  `followup` → `active` ; `interview` → `reply` ; `won` / `rejected` →
  piste **clôturée** (`closedReason` correspondant, `closedAt` déduit de
  `updatedAt`) avec `status: reply` ;
- `closedReason` : `""` (piste vivante), `won`, `rejected`, `dropped` ;
- `positions` : `stage`, `alternance`, `cdi`, `cdd`, `freelance` ;
- `vecu` : `alternance`, `stage`, `entretien`, `connait` — valeur inconnue
  → champ **absent** (pas de repli : une déclaration fausse vaut moins que
  pas de déclaration).

**« J'y suis passé » (`vecu`, `vecuQui`) — partagés, et c'est le point.**
`vecu` dit le lien qu'une personne a déjà avec la structure ; `vecuQui`
porte le **prénom** de qui le déclare (40 caractères max, coupé au-delà).
C'est le seul endroit où un partage cesse d'être anonyme, et il ne le
devient que sur déclaration : `communityView` n'émet `vecuQui` **que** si
`vecu` est présent — une piste sans déclaration part exactement aussi
anonyme qu'avant. Chez soi, `vecuQui` reste vide (« c'est moi ») ; le
prénom vient du profil au moment du partage, jamais du stockage.
Fusion : contrairement à la règle générale (§4.1, compléter les vides),
`vecu` **remplace** quand l'entrant est plus fort — l'ordre est
`alternance` > `stage` > `entretien` > `connait`. Un entrant plus faible
ou égal-mais-différent est compté en divergence, jamais importé. Rien
n'est perdu : c'est un renforcement, pas un écrasement.

**La prochaine action** (privée) : `nextAction` porte la **date** (ISO,
champ historique inchangé — les anciennes données restent valides),
`nextActionText` porte le **verbe** (« Relancer le RH »). Les deux sont
optionnels et indépendants.

**Champs inconnus** (venus d'une version future) : conservés dans `extra`,
jamais perdus silencieusement.

## 4. Les invariants de la fusion — intouchables

1. La fusion **n'écrase jamais** une valeur existante ; elle ne complète que
   les champs vides.
2. Deux valeurs non vides différentes = divergence **comptée et signalée**,
   pas importée.
3. Le privé ne s'importe jamais : statut remis à `todo`, notes/dates vidées,
   prochaine action (verbe et date) et clôture vidées, historique remplacé
   par « Reçue via partage ».
4. Un contact reçu avec `conf:"ok"` redevient `"doubt"` : la confiance ne se
   transmet pas, elle se re-vérifie.
5. Déduplication des pistes : même nom **et** même ville (ou positions à
   moins de 30 km) = même piste ; homonymes ambigus = nouvelle piste plutôt
   qu'une mauvaise fusion. Contacts dédupliqués par email, sinon téléphone,
   sinon nom+rôle.
6. Re-fusionner le même fichier n'ajoute rien (idempotence).

## 5. La sync entre MES appareils — invariants

À ne pas confondre avec la fusion communautaire (§4) : ici les deux côtés
appartiennent à la même personne (`engine/sync.js`, transport P2P chiffré).

1. **Tout circule**, privé inclus — ce sont mes appareils.
2. **Le plus récent gagne**, piste par piste (`updatedAt`) ; le profil
   voyage en bloc (son `updatedAt` à lui).
3. **Les suppressions voyagent** par tombstones `{id, t}` : une pierre plus
   récente que la fiche la supprime partout ; une fiche modifiée **après**
   la suppression ressuscite (le geste le plus récent gagne).
4. La sync est **idempotente et convergente** : rejouer le même échange ne
   change rien, et deux appareils arrivent au même état quel que soit l'ordre.
5. La phrase de liaison ne transite jamais en clair : la salle P2P porte un
   hash, les données sont chiffrées de bout en bout.
6. **Mon groupe fait exception au « plus récent gagne »** : il fusionne par
   union qui complète les vides (mêmes règles que §4), jamais en bloc.
   Rencontrer Léa sur le téléphone et Marco sur l'ordinateur doit donner Léa
   ET Marco — un LWW en aurait perdu un. Deux entrées sont la même personne
   si elles partagent un e-mail **ou** un prénom+nom complet ; deux prénoms
   nus identiques restent deux personnes.
5 bis. **L'état affiché est prouvé** (incident #14) : créer la salle ne vaut
   pas connexion. L'interface distingue relais joints (`getRelaySockets`),
   pair annoncé mais liaison directe en échec (`onJoinError`), pair
   connecté, et n'annonce « à jour » qu'après un échange réellement reçu
   (`engine/transport.js::liaisonStage`, vérifié par `?test`).
6. Le **partage en groupe** (ex-« salle de promo » — le préfixe technique
   `promo-` et la clé `oc_promo_v1` ne changent pas), lui, passe exclusivement par `sharePayload`
   (vue communautaire, §3) et l'aperçu avant fusion (§4) — mêmes règles que
   par fichier, quel que soit le canal.
7. **L'anneau d'appareils** (`engine/ring.js`, quand le profil est protégé) :
   le registre voyage avec la sync, signé **en bloc** (Ed25519) par
   l'appareil principal ; une commande (verrouiller, retirer, effacer,
   transférer) n'est appliquée que si la signature vérifie contre la clé
   publique du principal déjà connue. La **génération** ne descend jamais
   (bannir = génération +1 — l'anneau d'un banni est ignoré). La
   **récupération d'urgence** est signée par la clé de secours, dérivée
   de la phrase de secours (déterministe) : elle prouve la phrase,
   exige une génération strictement supérieure, et se vérifie hors ligne.
   La commande **effacer** (`wipe`) emporte TOUT ce qui est à
   l'utilisateur sur l'appareil visé : données, profil, journal, bac,
   tombstones, phrase de liaison, relais, serveurs TURN, identité d'appareil, appareils
   vus, anneau, coffre, campagnes, jetons de messagerie, clés d'IA,
   missions, propositions de l'assistant (`oc_proposals_v1`), et les
   documents (`cv`, `lettre`) de `oc_docs_v1`.
8. **Campagnes C8** : les instantanés privés du canal `full` peuvent porter
   `campaigns` (`oc_campaigns_v1`) et `missions` (`oc_missions_v1`). Ce sont
   des champs optionnels : un ancien appareil les ignore sans casser le
   format. Une campagne prend la forme la plus récente (`updatedAt`), mais
   les `sid` déjà au journal et les états terminaux des cibles ne régressent
   jamais. Les missions sont dédupliquées par `mid` ; leur état est monotone
   (`a_confier` → `confiee` → `revoquee`), les arrêts sont réunis, et le
   triplet signé `{m,sig,dev}` est transporté **sans recomposition**.
   `oc_companion_v1`, clé du canal 127.0.0.1, reste exclusivement sur
   l'ordinateur associé et ne voyage jamais. Les formats `.oc`, `OCQ1.` et
   `OCQP1.` ne changent pas.

---

## Ce qui peut changer librement

Tout le reste : `index.html` et `app.js` — écrans, composants, styles,
textes, navigation, gestes. C'est précisément le but de la séparation
moteur / interface : refaire l'interface sans jamais toucher aux quatre
sections ci-dessus. Le moteur (`engine/`) peut lui aussi évoluer à
l'intérieur, tant que les tests de contrat restent verts.

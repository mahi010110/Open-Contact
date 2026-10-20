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
| `oc_profile_v1` | Profil, modèles d'emails, prompts IA (8 × 4 000 car. max), fiches confirmées, flags, `updatedAt` (LWW appareils). Le **prénom** (premier mot de `name`) est ce qui accompagne une déclaration « j'y suis passé » quand on partage : sans lui, la déclaration ne part pas du tout (§3). **Depuis la 6.31, champs AJOUTÉS** (aucun renommé, un profil d'avant les reçoit vides à la lecture) : `ecole` et `rythme` (texte, 120 car. max), `recherche` ∈ {`stage`, `alternance`, `emploi`} ou vide, `debut` / `fin` (date `AAAA-MM-JJ` qui existe au calendrier, sinon vide). La durée n'est **jamais stockée** : elle se déduit des deux dates (`dureeRecherche`). Ces champs nourrissent les jetons `{{ecole}}`, `{{type}}`, `{{recherche}}`, `{{rythme}}` des modèles ; rien choisi = « un stage », le texte d'avant. Ils restent privés comme tout le profil : aucun ne voyage dans un partage (§3). **Mise à jour des modèles de départ** : un modèle dont l'objet ET le corps sont identiques au caractère près à ceux de la 6.30 prend la version du jour, même `id`, même nom, même place (`majModelesDefaut`, appliqué par `normalizeProfile`) ; un modèle retouché, même d'une virgule, n'est jamais touché. **Depuis la 6.47, champ AJOUTÉ** `parcours` (docs/reseau.md, lot 1) : une liste d'au plus 20 expériences `{id, entreprise (120 car.), quoi ∈ {stage, alternance, emploi}, debut, fin (mois AAAA-MM ou vide ; une fin avant le début est retirée), pisteId?}` — un profil d'avant la reçoit vide. **Seul ce qui est SAISI est stocké** : une piste où l'on a déclaré soi-même « J'y suis passé » (stage ou alternance, sans `vecuQui`) fait partie du parcours sans y être recopiée (`parcoursDe`), et une ligne saisie qui porte son `pisteId` prend sa place. Le parcours nourrit le jeton `{{parcours}}` (« stage chez X (2025) », les deux plus récents) ; il reste privé comme tout le profil. Le modèle de candidature de départ gagne la ligne « Expérience : {{parcours}} », qui s'efface quand le parcours est vide ; un modèle identique à celui des 6.31 à 6.46 prend cette version, un modèle retouché n'est jamais touché. **Depuis la 6.51, champs AJOUTÉS** (« Où je cherche », docs/recherche-profil.md) : `ville` (texte, 80 car. max, telle qu'on l'écrit) et `rayon` ∈ {5, 15, 30} km (15 par défaut ; une autre valeur prend le rayon le plus proche) — un profil d'avant les reçoit vides. Ils orientent « À découvrir » ; seul le **centre** de la ville, lu dans la table de l'app, part vers l'annuaire, jamais le texte du champ. **Depuis la 6.51 aussi, champ AJOUTÉ** `ecartees` : les entreprises de « À découvrir » qu'on a dites « Pas pour moi », `[{siren (9 chiffres), nom (120 car.), at}]`, sans doublon de SIREN, les 300 plus récentes — elles ne reviennent plus dans la liste, et suivent le profil (sync de MES appareils, copie), jamais un partage. **Depuis la 6.54, champs AJOUTÉS** (les amis, docs/reseau.md lot 2) : `amiId` — l'identifiant sous lequel mes amis me connaissent (128 bits en base64url, tiré au premier « Mon QR », absent avant ; une valeur invalide est retirée) — et `amis` — les profils que d'autres m'ont DONNÉS, `[{id, nom (80 car.), parcours: [{entreprise, quoi, debut, fin, siren?}] (20 au plus), recu}]`, un par `id` (le plus récent gagne), 200 au plus ; un profil d'avant les reçoit vides. Ce sont des données d'autrui, données par lui-même : elles suivent le profil (sync de MES appareils, copie), **ne sortent dans aucun partage** et **ne se redonnent jamais** — mon profil donné (OCA1) ne porte que moi. **Le nom d'un ami ne part jamais vers l'annuaire** (`motsInterdits`, depuis la 6.56) : tapé dans la barre pour le retrouver, il cherche dans mes amis et nulle part ailleurs ; les entreprises de son parcours, elles, sont des noms d'entreprise et se cherchent comme tels. Un ami donné **depuis la 6.55** porte aussi `cle`, la clé publique de sa boîte aux lettres (point P-256 non compressé, base64url, 86-88 car.) ; un ami d'avant n'en a pas, et on ne peut rien lui demander tant qu'il n'a pas redonné son QR. **Depuis la 6.55, champ AJOUTÉ** `boite` (docs/reseau.md lot 3) : `{pub, priv}` — la clé ECDH P-256 de MA boîte aux lettres, née au premier « Mon QR » (`pub` en base64url brut, `priv` en PKCS#8 base64url), absente avant ; abîmée, elle est retirée (un QR redonné en refait une). La partie publique part dans le QR (OCA1 `cle`) ; la privée **ne sort jamais** que vers MES appareils (sync, copie) — et une sync ne la perd pas (§5). **Depuis la 6.57, drapeau AJOUTÉ** `flags.sansRelais` (booléen, absent = faux) : je ne sers plus de chemin — une demande que je ne peux pas servir s'arrête chez moi (docs/reseau.md, décision 7) ; il suit mes appareils comme tout le profil. **Depuis la 6.58, champ AJOUTÉ** `groupes` (docs/reseau.md lot 5) : mes groupes, `[{code (15 lettres de l'alphabet du rendez-vous), nom (40 car., vide si je ne le connais pas encore), at}]`, cinq au plus, sans doublon de code — un profil d'avant le reçoit vide. Le code EST la clé du groupe : il suit le profil (sync de MES appareils, copie) pour que chacun de mes appareils y soit, et **ne sort dans aucun partage ni dans le profil donné** (OCA1). **Depuis la 6.60** (lot 5c), un groupe « sur demande » porte aussi `type: "demande"`, `porte` (l'identifiant de sa porte, OCP1), `chef` (la clé publique de signature du chef, ECDSA P-256 brute en base64url) et `sign` (`{pub, priv}` — MA clé de signature pour ce groupe, `priv` en PKCS#8 base64url) ; sans `porte` ou sans `chef` valides, le groupe redevient ouvert à la lecture. La partie privée de `sign` ne sort, comme `boite.priv`, que vers MES appareils. **Depuis la 6.67** (décision 31), un groupe OUVERT peut porter lui aussi `chef` (et, chez qui l'a créé, `sign`) : tout groupe neuf a un chef, qui règle et supprime ; un groupe d'avant n'en a pas, et tout le monde y reste égal. **Depuis la 6.85, champ AJOUTÉ** `semaine` (lot R4, en préversion, `engine/semaine.js`) : `{lundi (AAAA-MM-JJ, un lundi), objectif (entier de 3 à 30)}` — le nombre de mails qu'on s'est promis pour la semaine de ce lundi ; absent, ou d'une autre semaine, l'app propose le sien (la semaine d'avant plus un). Une valeur abîmée est retirée. Il suit le profil (sync de MES appareils, copie), **ne sort dans aucun partage ni dans le profil donné** (OCA1) ; la revue du vendredi, quand on la donne à un groupe, est un mot de nombres seulement (`phraseRevue`). **Depuis la 6.86, champ AJOUTÉ** `aide` (lot R7, en préversion, `engine/aide.js`) : ce que je peux offrir à mes amis, une liste de mots de la table `AIDES` — `parler` (parler de mon entreprise), `relire` (relire un CV), `presenter` (présenter quelqu'un) —, sans doublon, dans l'ordre de la table ; vide, la clé n'existe pas, et tout autre mot est retiré. C'est le seul champ du profil que R7 fait partir dans le profil donné (OCA1 `aide`) ; il suit aussi mes appareils et ma copie, jamais un partage de pistes. Un ami reçu **depuis la 6.86** peut porter le même `aide`, remis aux mêmes invariants | JSON : objet profil |
| `oc_journal_v1` | Journal privé des actions (200 max). **Deux phrases de `txt` sont relues, pas seulement écrites** : `Donné (canal) : N piste(s)` et `Reçu de <qui\|la promo> : +N piste(s)…` alimentent le fil de l'écran « Échanger » (`engine/assist.js` → `exchangeLog`). Les relire plutôt qu'ajouter un champ garde l'historique DÉJÀ écrit visible ; en échange, ces deux formes sont figées et verrouillées par `tests.js`. Toute autre entrée reste du texte libre, et `Reçu (analyse IA triée)` est exclu par construction (ce n'est pas un échange avec la promo). **`ids` est un champ AJOUTÉ, jamais un renommage** : les entrées d'échange écrites depuis la v6.4 portent les identifiants des pistes concernées (données pour un `Donné`, ajoutées ou complétées pour un `Reçu` — c'est `mergeIncoming().ids` qui fait foi), plafonnés à 200 par entrée. C'est ce qui permet d'ouvrir une ligne de « Tes échanges » sur ce qui a circulé. Une entrée sans `ids` (écrite avant, ou revenue d'une sauvegarde) reste lisible : elle s'affiche, elle ne s'ouvre pas | JSON : tableau `{t, txt, cid, ids?}` |
| `oc_orphans_v1` | Contacts « à rattacher » (sans entreprise) — l'indice d'entreprise saisi par l'utilisateur voyage dans `extra.company` (D3), consommé au rattachement | JSON : tableau de contacts |
| `oc_tombs_v1` | Suppressions (tombstones, 500 max) — font voyager les suppressions entre MES appareils | JSON : tableau `{id, t}` |
| `oc_group_v1` | **Retirée le 8 août 2026, le jour de son introduction.** Elle a porté un carnet de camarades ; la mesure a montré qu'un tel carnet ne contient que des gens déjà joignables (une piste recommandée de seconde main désigne quelqu'un qui n'y sera jamais). La clé n'est plus ni lue ni écrite, et une valeur restée d'avant est **effacée au chargement** — ce sont les coordonnées de personnes qui n'ont jamais vu cet écran. Le nom reste réservé : il ne sera jamais réutilisé pour autre chose | — |
| `oc_sync_v1` | Phrase de liaison de mes appareils | chaîne |
| `oc_relays_v1` | Relais P2P personnalisés (optionnel — vide = relais publics) | JSON : tableau d'URLs |
| `oc_turn_v1` | Serveurs TURN personnalisés (optionnel — pour les réseaux qui bloquent le pair-à-pair ; identifiants obligatoires — RTCPeerConnection refuse `turn:` sans eux — et scellés comme les relais) | JSON : tableau `{urls, username, credential}` |
| `oc_device_v1` | Cet appareil — identité annoncée à la sync | JSON : `{id, name}` |
| `oc_devices_v1` | Appareils reliés déjà vus (12 max, consultables et élagables) | JSON : tableau `{id, name, seen}` |
| `oc_promo_v1` | Dernier mot de passe de partage en groupe (confort de saisie). **Depuis la 6.58**, le partage en direct est masqué à l'écran (les groupes le remplacent, `ui/perimetre.js`) : la clé reste, lue seulement par le code masqué | chaîne |
| `oc_vault_v1` | Métadonnée du coffre (profil protégé) : enveloppes de la clé maîtresse par code / phrase de secours / PRF — **jamais la clé en clair**. Pendant une rotation, `prev` porte l'ANCIENNE clé maîtresse scellée sous la nouvelle (`OCV1.`) : la métadonnée s'écrit avant le re-scellement, une interruption se reprend au déverrouillage suivant sans perte, puis `prev` est retiré | JSON : `{v, gen, at, wraps, prev?}` |
| `oc_devring_v1` | Anneau d'appareils : registre signé (appareil principal, membres, commandes) + clés Ed25519 de CET appareil + commandes déjà appliquées + (6.30) sa moitié d'échange ECDH P-256 pour le portage de la sync | JSON : `{ring, keys, applied, xkeys?}` — `xkeys = {pub, priv}` (brut / PKCS#8, base64), créé au premier besoin ; absent = rien à migrer |
| `oc_campaigns_v1` | Campagnes de prospection (privé — messages figés au montage, journal des envois faits ; chaque envoi porte un identifiant stable `id.cible.étape` : rejouer ne double jamais). Plafond de 15 envois/jour **global, toutes campagnes confondues** (`dueSendsAll` fait foi dès qu'il en existe plusieurs) et fenêtre d'envoi imposée : jours ouvrés, 8 h – 19 h locales | JSON : tableau de campagnes |
| `oc_mail_v1` | Connexions messagerie : jetons OAuth et adresse d'envoi — **exige le profil protégé** (valeur toujours scellée) | JSON : `{gmail, outlook, clients}` |
| `oc_ai_v1` | Connexions IA : fournisseur actif + clé API — **exige le profil protégé** (valeur toujours scellée) ; la clé ne sort jamais dans un log ni un export. `provider` ∈ {`anthropic`, `gemini`, `openrouter`} (appel navigateur direct) ∪ {`ollama`, `openai`, `chatgpt`} (l'appel part de l’ordinateur : la demande voyage sur le canal chiffré de l’ordinateur, la clé y sert l'appel puis s'oublie — jamais écrite là-bas, ni disque ni journal). `model` : choisi par l'utilisateur **dans la liste vivante du fournisseur** (aucun modèle implicite ni codé en dur — un appel sans modèle est refusé `modele`) ; seule exception : `chatgpt` avec `model` vide = le modèle réglé dans Codex par l'utilisateur, affiché comme tel | JSON : `{provider, key, model}` |
| `oc_missions_v1` | Bons de mission de l’ordinateur : idempotents (repliés sur le journal de campagne), bornés (expiration), révocables ; un résultat d'analyse = enveloppe `share` qui repasse par l'aperçu. Sur le fil, une mission voyage **signée** : `{m, sig, dev}` — `m` est la chaîne JSON exacte signée Ed25519 par l'appareil émetteur, vérifiée octet à octet (PWA `openMissionWire` ET cœur Rust de l’ordinateur, à CHAQUE lecture). `dev` peut être l’ordinateur appairé ou un autre membre (téléphone) : l’ordinateur résout sa clé dans l'anneau signé. Côté PWA la clé garde les remises : `[{mid, cpId, wire, state: a_confier·confiee·revoquee, stops[], revOk?}]` | JSON : tableau de missions |
| `oc_companion_v1` | Association à l’ordinateur : clé de canal née de l'appairage par code court + identité de l’ordinateur (`{k, id, nom, pub, at}`) — **exige le profil protégé** (valeur toujours scellée). Le canal local (127.0.0.1) ne transporte que des enveloppes `OCV1.` : l'appairage sous PBKDF2(code, 120 000 itér.), la suite sous `k` — rien d'utile en clair | JSON |
| `oc_proposals_v1` | Propositions de l'assistant IA (serveur MCP local de l’ordinateur, coupé par défaut) en attente de tri : `{v, actif, list: [{pid, at, n, share}], done: [{pid, a}]}` — `actif` mémorise l'autorisation donnée dans la feuille de l’ordinateur (sans lui, la PWA ne sonde jamais) ; `share` est une enveloppe `share` ordinaire qui repasse par `parseInput` → aperçu multi-sélection → fusion §4, JAMAIS une écriture directe ; `pid` (hash du contenu) rend le rejeu idempotent, `done` (50 max) garde les propositions déjà fusionnées/écartées pour qu'elles ne réapparaissent jamais ; 5 en attente max ; scellée (SEALABLE), emportée par le `wipe` | JSON |
| `oc_reseau_v1` | La boîte aux lettres de mes amis, vue de CET appareil (docs/reseau.md lot 3, `engine/boite.js`) — `{v:1, depuis, demandes, recues, dons, mercis}` : `depuis` = l'instant de la dernière relève (ms) ; `demandes` = mes demandes `{id, pisteId, entreprise:{nom, siren?}, at, exp, vers}` (trois ouvertes au plus, 14 jours) ; `recues` = ce qu'on m'a demandé `{id, de:{prenom, cle}, entreprise, exp, at, statut ∈ {a-voir, rien, donnee, ecartee}, trouve:[{pisteId, ctId}]}` — `rien` quand mon téléphone n'a trouvé personne : la demande est gardée pour ne pas la retraiter, et RIEN ne s'affiche ; `dons` = les contacts qu'on m'a donnés `{id, demande, de, entreprise, contact:{name, role?, email?, phone?, link?}, at, statut ∈ {nouveau, ajoute, ecarte}}` ; `mercis` = `{id, demande, de, entreprise, contact:{name}, at}`, un par demande ; `lus` = les profils d'amis reçus par la boîte `{id (de la lettre), at}`, pour qu'une lettre relue ne rajoute pas un ami qu'on a retiré ; `envois` = mon profil en partance vers qui je viens d'ajouter `{id, cle, lettre, quand, exp}` — il ne part qu'après `quand` (la fin de « Annuler », ~30 s), et repart à la relève suivante s'il n'a pas pu partir (50 au plus) — depuis la 6.57, il porte aussi les demandes que je fais suivre ; **depuis la 6.57** (les sauts), une demande reçue garde `cercle`, `par`, `chaine`, `soi` et `critere`, et prend le statut `transmise` (avec `vers`) quand mon téléphone l'a fait suivre ; une demande faite porte `critere` au lieu de `entreprise` (sans `pisteId`) quand elle vise un métier et une ville, et `trouve` (`{at, cercle, chaine, par, groupe?}`) dès qu'on m'a prévenu ; **depuis la 6.59** (lot 5b), une demande faite porte `groupes` (les noms des groupes où elle a été posée), une demande reçue d'un groupe `groupe` (son code) et `groupeNom`, et `envois` garde aussi une lettre « trouvé » jusqu'à ce qu'elle soit partie ; **depuis la 6.60** (lot 5c), `entrees` = qui demande à entrer dans un groupe dont j'ouvre la porte `{id, porte, de:{prenom, cle}, ami, at, statut ∈ {attente, admis, refuse}}` (une par personne et par porte), et `attentes` = les portes où j'ai demandé à entrer `{porte, nom, at}` (cinq au plus) — toutes deux oubliées au bout de 14 jours ; **depuis la 6.73** (lot F3a), une demande faite et une demande reçue portent `cherche` (le mot de la lettre) quand elle en a un ; **depuis la 6.56**, `profilEnvoye` = l'empreinte (SHA-256, 32 car. hex) du dernier profil donné (OCA1) — la première relève la note seulement ; quand elle change, mon profil part en `maj` vers chacun de mes amis qui a une boîte, et une mise à jour en attente remplace la précédente. 200 entrées par liste au plus, oubliées au-delà de 30 jours. Un repère d'appareil : ni sync, ni copie, ni partage ; scellée (SEALABLE), emportée par « Effacer cet appareil » | JSON |
| `oc_groupes_v1` | Ce qui s'est dit dans mes groupes, vu de CET appareil (docs/reseau.md lot 5, `engine/groupe.js`) — `{ <code>: {nom, fil, membres, depuis, vu, presence, pris} }` : `nom` = le nom appris des autres membres quand on est entré par le code seul ; `fil` = les mots `{t:'mot', id, de, prenom, texte, at}` et les dons de pistes `{t:'pistes', id, de, prenom, nb, n, d:[parts], at}` (montrés seulement complets) ; `membres` = `{ <amiId>: {prenom, at, parti?} }` ; `depuis` = la dernière relève (ms) ; `vu` = la dernière fois que j'ai ouvert le groupe (ce qui est arrivé après se compte dans la boîte d'« Échanger » et sur son onglet) ; `presence` = la dernière fois que j'ai dit « je suis là » ; `pris` = les dons déjà fusionnés ; `masques` = les demandes masquées (lot 5b) ; **depuis la 6.60** (lot 5c), dans un groupe « sur demande », un membre porte aussi `cle` et `sign` (prouvées, voir OCP1) et `adjoints` = `{ <amiId>: {sign, cle, sig, at, aDire?} }` — les nominations vérifiées ; `aDire` marque une nomination que je viens de faire et qui n'est pas encore partie (elle part après « Annuler », ou à la relève suivante) ; **depuis la 6.61** (lot 5c2), `retires` = les messages retirés `[{id, par, de, at, aDire?}]` (14 jours), `aRetirer` = `{membre, quand}` — un retrait de membre qui attend la fin de « Annuler » (exécuté à la relève s'il n'a pas pu partir), et un membre peut porter `exclu: true` ; **depuis la 6.67** (décisions 31 à 35), `reglages` = les réglages en vigueur `{nom, j ∈ {1, 7, 30}, ecrire ∈ {tous, resp}, entree ∈ {ouvert, demande}, porte?, at, par}` (les plus récents vérifiés), `fin` = `{at, par}` quand le chef l'a supprimé, et un mot peut porter `j` (sa durée, si ce n'est pas 7) ; **depuis la 6.72** (lot F2), un mot peut porter `cite` = les identifiants des membres qu'il nomme (« @Karim »), dix au plus, déduits du texte à l'envoi — un téléphone d'avant les ignore. Un mot et un don s'oublient au bout de 7 jours, un membre au bout de 30 sans présence. Un repère d'appareil : ni sync, ni copie, ni partage ; scellée (SEALABLE), emportée par « Effacer cet appareil ». Sans rapport avec l'ancien `oc_group_v1` (le carnet de camarades supprimé), toujours effacé au chargement | JSON |
| `oc_messages_v1` | **Depuis la 6.68** — mes conversations privées avec mes amis, vues de CET appareil (`engine/messages.js`) — `{v:1, fils: { <amiId>: {m:[{id, moi, texte, at}], vu} }}` : `m` = ses messages et les miens, dans l'ordre du temps, 300 au plus par ami (les plus anciens partent) ; `moi` dit qui l'a écrit ; `texte` ≤ 1 000 car., retours à la ligne gardés (deux au plus d'affilée) ; `vu` = la dernière fois que j'ai ouvert la conversation — ce qui est arrivé après se compte dans la boîte d'« Échanger » et sur son onglet. Un ami retiré emporte sa conversation au chargement suivant. Un repère d'appareil : ni sync, ni copie, ni partage ; scellée (SEALABLE), emportée par « Effacer cet appareil » | JSON |
| `oc_fils_v1` | **Depuis la 6.71** — ce que j'ai réglé sur mes conversations, vu de CET appareil (`engine/conversations.js`, docs/reseau.md décision 37) — `{v:1, epingles:[cle], muets:[cle]}` ; une `cle` désigne une conversation : `g:<code du groupe>` ou `a:<identifiant de l'ami>`. `epingles` = dans l'ordre où on les a épinglées, la plus récente d'abord, cinq au plus ; `muets` = les conversations dont on a coupé le son (cinquante au plus) — elles gardent leur chiffre mais n'entrent plus dans celui de l'onglet. Un groupe qui change de code garde son épingle et son silence ; un groupe quitté, un ami retiré emportent les leurs. Porte des codes de groupe, donc scellée (SEALABLE) ; ni sync, ni copie, ni partage ; emportée par « Effacer cet appareil » | JSON |
| `oc_brouillons_v1` | **Depuis la 6.84** (lot R3, en préversion) — les mails commencés, une entrée par piste (`engine/prets.js`) — `{v:1, b: {<id de piste>: {objet, corps, ctId?, statut?, at}}}` ; `objet` 300 caractères au plus, `corps` 20 000, `at` = la dernière frappe (ms) ; `statut` = celui de la piste quand on écrivait : s'il a changé depuis, le brouillon se propose sans s'imposer. Un brouillon part à « Envoyée ✓ » ou au bout de 30 jours sans y toucher ; deux cents au plus, les plus vieux partent. Un identifiant qui n'a pas la forme d'un `id` de piste, ou un nom de prototype, ne se lit pas. Du privé de CET appareil : ni sync, ni copie, ni partage ; scellée (SEALABLE), emportée par « Effacer cet appareil » | JSON |
| `oc_vus_v1` | « À découvrir » : ce que chaque recherche a déjà montré, pour marquer « nouveau » ce qui n'y était pas la fois d'avant (docs/recherche-profil.md) — `{v:1, r: {<recherche>: {at, s: [siren…]}}}`, la recherche = ses questions à l'annuaire sans la page, 30 recherches de 300 SIREN au plus. Un repère de CET appareil : ni sync, ni copie, ni partage ; scellée (SEALABLE), emportée par « Effacer cet appareil » | JSON |
| `oc_theme` | le CHOIX de thème : `auto` (suit l'appareil), `light` ou `dark` — **depuis la 6.66**, `auto` ; une valeur absente ou inconnue vaut `auto`. Le miroir synchrone de `localStorage` (même clé) porte la même valeur | chaîne |
| `oc_preversion_v1` | **Depuis la 6.78** (R0 du recadrage, `docs/decisions/0004-drapeaux-et-preversion.md`) — la préversion de CET appareil : `'1'` quand elle est allumée, ABSENTE sinon (éteindre efface la clé) ; toute autre valeur vaut éteinte. Allumée, les lots en test du registre `engine/drapeaux.js` s'allument sur cet appareil. Ni scellée (elle ne dit rien de toi), ni sync, ni copie, ni partage ; emportée par « Effacer cet appareil » — un téléphone prêté ne doit pas montrer des écrans pas encore vérifiés | chaîne |
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
```

- `v` : version du **format** (4). `app` : version de l'application émettrice
  (informatif).
- `kind: "share"` : pistes en **vue communautaire** (voir §3) — jamais de
  champ privé. **Rien de moi ne part en plus des pistes** : ce qui me nomme
  tient dans `vecuQui`, sur les seules pistes où j'ai déclaré quelque chose.
  Un champ `card` a existé une journée ; un fichier qui en porterait un est
  lu sans erreur, son contenu est simplement ignoré.
- `kind: "full"` : sauvegarde personnelle complète — pistes avec suivi privé,
  plus le profil, plus les champs **optionnels** `orphans` (contacts « à
  rattacher »), `tombs` (suppressions) et `groupe` (mes camarades, §1) s'il y
  en a. Un lecteur qui les ignore charge quand même le reste sans erreur.
- **Pas de profil accroché aux pistes**, ni dans `share` ni dans un champ
  `card` : ils ont existé une journée. Un partage de pistes reste des
  pistes, et un prénom sur celles qu'on recommande. Le profil qu'on DONNE
  à un ami a son propre format, à part et volontaire : **OCA1** (plus bas).
- Tolérance à la lecture : un simple tableau JSON de pistes est aussi accepté.

### Compact — OCQ1 (échange par QR)

```
OCQ1.<payload share compressé deflate-raw, en base64url>
```

Une enveloppe `kind:"share"` (jamais de privé, jamais mon groupe),
compressée par l'API native
`CompressionStream` puis encodée base64url. Lu par `parseInput` comme les
autres formats. Si l'API manque (très vieux navigateur), l'émetteur replie
vers le fichier `.oc` — le format ne change pas.

### Profil donné à un ami — OCA1 (QR ou texte, docs/reseau.md lot 2)

```
OCA1.<profil donné compressé deflate-raw, en base64url>
```

L'objet compressé, et RIEN d'autre :

```json
{ "v": 1, "kind": "ami", "id": "<22+ car. base64url>", "nom": "Karim Benali",
  "parcours": [ { "entreprise": "Aztek", "quoi": "alternance", "debut": "2025-09", "fin": "", "siren": "123456789" } ] }
```

- `id` : 128 bits tirés au hasard UNE fois (`amiId` du profil, §1), au
  premier « Mon QR ». Il ne dit rien de la personne ; il sert à reconnaître
  son profil quand elle le redonne à jour (la ligne est remplacée, jamais
  doublée).
- `nom` : 80 car. au plus. `parcours` : 20 expériences au plus, celles du
  profil ET celles déduites des « J'y suis passé » (`parcoursDe`) ;
  `quoi` ∈ {`stage`, `alternance`, `emploi`}, `debut`/`fin` en `AAAA-MM`
  ou vides, `siren` (9 chiffres) seulement si la piste d'origine en a un.
- `cle` (depuis la 6.55, facultative) : la clé PUBLIQUE de ma boîte aux
  lettres (`boite.pub` du profil, §1) — de quoi me sceller une demande
  que moi seul pourrai ouvrir. Un QR d'avant n'en a pas ; il se lit
  toujours. La clé privée n'y est jamais (`e2e-amis.mjs` ①).
- `aide` (depuis la 6.86, facultative, lot R7) : ce que je peux offrir,
  des mots de la table `AIDES` seulement (`parler`, `relire`,
  `presenter`) — jamais un texte libre. Absente si rien n'est coché ; à
  la lecture, un mot hors de la table tombe (`normaliserAide`). Une offre
  qui change est une mise à jour du profil (`maj`), comme le parcours
  (`e2e-aide.mjs` ①).
- **Jamais** : adresse, téléphone, formation, école, ville, pistes,
  contacts, suivi, l'identifiant d'une piste — ni le profil d'un AMI. Un
  profil ne se repartage pas (`profilDonne`, `e2e-amis.mjs` ①).
- Lecture BORNÉE (`gonflerBorne`), 20 000 caractères au plus, `kind`
  obligatoirement `ami`, puis remise aux invariants (`normalizeAmi`) — ce
  qui ne passe pas est refusé, jamais deviné. `parseInput` ne le lit PAS :
  un profil ne se fusionne pas dans le suivi, il passe par son propre
  aperçu. Dans un texte collé, seul le jeton `OCA1.…` compte
  (`extraireOCA`) : la phrase qui l'accompagne (« colle ce message dans… »)
  et un retour à la ligne glissé par une messagerie ne le cassent pas.

### Lettre à un ami — OCB1 (boîte aux lettres sur les relais, docs/reseau.md lot 3)

Une demande (« Inès cherche quelqu'un chez Aztek »), un contact donné en
réponse, un merci — et le profil de qui vient de t'ajouter (l'amitié est
réciproque). Ce que voit un relais — un événement Nostr ordinaire,
signé d'une clé jetable :

```
kind 8571 · tags [["x", "oc-boite-<32 hex>"], ["expiration", "<s>"]] · content "OCB1.<…>"
```

- `x` = `oc-boite-` + les 16 premiers octets (hex) de
  SHA-256(`opencontact·boite·v1·` + clé publique du destinataire) : une
  étiquette qui ne dit rien de lui à qui n'a pas sa clé. `expiration`
  (NIP-40) = celle de la demande. Kind 8571 : un kind ordinaire, gardé
  et rendu à une autre connexion par 6 relais sur 7 (mesuré,
  `sonde-boite-relais.mjs`), qu'aucun client n'affiche.
- `content` = `OCB1.` + base64url(clé publique éphémère P-256 brute, 65
  octets ‖ IV 12 octets ‖ AES-256-GCM). La clé AES vient d'un ECDH entre
  la clé éphémère et la clé de la boîte du destinataire, passé dans
  HKDF-SHA256 (sel `opencontact·boite·v1`, info `lettre`). Une clé
  jetable PAR LETTRE : rien ne relie deux lettres du même auteur.
- La lettre ouverte, et RIEN d'autre (`normaliserLettre`) :
  ```json
  { "v": 1, "t": "demande", "id": "…", "de": { "prenom": "Inès", "cle": "<où répondre>" },
    "entreprise": { "nom": "Aztek", "siren": "123456789" }, "cercle": 1, "exp": 1760000000000,
    "cherche": "alternance" }
  { "v": 1, "t": "don", "id": "…", "demande": "<id>", "de": {…}, "entreprise": {…},
    "contact": { "name": "Julie Marchand", "role": "RH", "email": "…", "phone": "…", "link": "…" } }
  { "v": 1, "t": "merci", "id": "…", "demande": "<id>", "de": {…}, "entreprise": {…},
    "contact": { "name": "Julie Marchand" } }
  { "v": 1, "t": "ami", "id": "…", "motif": "ajout" | "maj", "de": {…}, "profil": { <exactement l'objet d'OCA1> } }
  { "v": 1, "t": "adieu", "id": "…", "de": {…}, "ami": "<mon amiId>", "preuve": "<43 car. base64url>" }
  { "v": 1, "t": "message", "id": "…", "de": {…}, "texte": "≤ 1 000 car.", "at": 0, "preuve": "<43 car. base64url>" }
  { "v": 1, "t": "entree", "id": "…", "porte": "<id>", "de": {…}, "ami": "<amiId>" }
  { "v": 1, "t": "admis", "id": "…", "porte": "<id>", "de": {…}, "code": "<15 lettres>", "nom": "BTS SIO Lille", "chef": "<clé de signature>" }
  ```
  **Depuis la 6.74** (lot F3b) : un don peut porter `accord: true` —
  celui qui donne a demandé au contact s'il était d'accord. Seule la
  valeur `true` compte, et jamais quand le contact est l'auteur lui-même
  (`soi`) ; le don reçu le garde (`dons[].accord`).
  **Depuis la 6.73** (lot F3a) : une demande peut porter `cherche` — UN
  mot de la liste fermée `stage` · `alternance` · `emploi`, celui du
  profil (`recherche`). Toute autre valeur est ignorée à la lecture (la
  lettre reste valide, sans le mot) ; il passe les sauts tel quel, et
  une demande relayée dans un groupe le garde.
  **Depuis la 6.60** (lot 5c) : `entree` demande à entrer dans un groupe
  « sur demande » — elle ne porte que le prénom, la clé de la boîte et
  l'identifiant d'ami, et n'est acceptée que pour une porte dont JE suis
  responsable, une fois par personne et par porte ; `admis` y répond en
  donnant le code, scellé pour le seul nouveau, et n'est accepté que là
  où J'AI demandé à entrer. Un refus n'écrit rien.
  ```json
  { "v": 1, "t": "recode", "id": "…", "de": {…}, "ancien": "<15 lettres>", "code": "<15 lettres>", "exclu": "<amiId>", "signe": "<clé de signature>", "sig": "…" }
  ```
  **Depuis la 6.61** (lot 5c2) : `recode` donne le nouveau code d'un
  groupe d'où un membre vient d'être retiré. `sig` signe
  `{t:"recode", ancien, code, exclu}` ; la lettre n'est acceptée que pour
  un groupe où je suis (`ancien`), signée d'un responsable que CE groupe
  connaît. Le groupe passe alors au nouveau code : le fil reste, l'exclu
  n'y est plus, chacun redit sa présence.
  Une demande vit 14 jours au plus (`exp` au-delà est refusée), son
  cercle vaut 1. Un don ne porte que de quoi JOINDRE le contact (nom et
  au moins un moyen) — **jamais** sa note, la piste, ses notes, son
  statut, son historique (`contactDonne`, `e2e-demande.mjs` ①). Un don
  ne compte que pour une demande que J'AI faite ; un merci, que pour une
  demande à laquelle j'ai donné — un par demande. Un profil (`ami`) se
  remet aux mêmes invariants qu'un QR scanné (`normalizeAmi`), et sa
  `cle` doit être celle qui écrit (`de.cle`) : on n'ajoute personne au
  nom d'un autre. Il entre dans les amis du destinataire sans aperçu —
  c'est la règle de réciprocité, pas une proposition — une seule fois
  par lettre. **Depuis la 6.56, `motif`** (lot 4a) : `ajout` (le défaut,
  et ce que vaut une lettre d'avant qui n'en a pas) quand on vient de
  m'ajouter ; `maj` quand un ami qui m'a déjà donné son profil l'a
  changé. Une lettre `maj` **ne fait que remplacer** un ami déjà là —
  elle ne rajoute jamais quelqu'un que j'ai retiré ni quelqu'un que je
  n'ai pas. **Depuis la 6.66, `adieu`** : le retrait est réciproque.
  `ami` est l'identifiant d'ami de qui retire ; `preuve` = HMAC-SHA-256
  de `adieu·<id>·<ami>`, sous une clé HKDF (sel `opencontact·boite·v1`,
  info `preuve`) tirée d'un ECDH P-256 entre la clé PRIVÉE de la boîte de
  l'auteur et la clé publique du destinataire. Le destinataire la
  recalcule avec sa clé privée et `de.cle` : sans la clé privée de
  l'auteur, personne ne la fabrique. Elle ne retire qu'un ami rangé sous
  CET identifiant ET cette clé, une fois (`lus`) ; sinon elle se tait.
  **Depuis la 6.68, `message`** : la conversation privée avec un ami.
  Elle ne porte que le prénom et la clé de boîte de qui écrit, le texte
  (≤ 1 000 car., déjà normalisé — un texte qui change à la
  normalisation rend la lettre invalide), l'heure et la `preuve` —
  HMAC de `message·<id>·<at>·<texte>`, sous la même clé que `adieu`.
  Elle n'est acceptée que d'un ami que j'ai (`de.cle`), une fois
  (`lus`), et seulement si la preuve tient : personne n'écrit au nom
  d'un ami. Datée de plus de dix minutes dans l'avenir ou de plus de
  30 jours, elle est ignorée ; elle vit 30 jours sur les relais
  (NIP-40). Elle part par la file `envois` : sans réseau, elle repart à
  la relève suivante.
- **Depuis la 6.57, les sauts** (lot 4b, décisions 17 à 19). Une demande
  vise une `entreprise` **ou** un `critere` — `{ "metier": "cyber",
  "ville": "Lille" }`, l'un des deux au moins, le métier d'une table
  fermée (`CRITERE_METIER`, `engine/critere.js`) et le NOM exact d'une
  ville de la table de l'app (jamais un mot tapé, jamais une ville lue
  dans des pistes) ; tout autre champ est retiré, un critère hors table
  rend la lettre invalide. Son `cercle` vaut 1, 2 ou 3. À partir du
  cercle 2 elle porte aussi `par` (`{ prenom, cle }` : l'ami qui me l'a
  passée) et `chaine`, autant de JETONS que de cercles franchis : chacun
  est un `OCB1.` scellé pour le maillon d'avant (l'auteur au premier
  saut) et ne contient que `{ "t": "jeton", "p": <prénom>, "c": <clé> }`.
  Même `id`, même auteur, même expiration d'un cercle à l'autre. Une
  demande d'un cercle 2 ou 3 n'est acceptée que si `par.cle` est celle
  d'un de MES amis ; chaque téléphone refuse une quatrième demande
  ouverte du même auteur. Qui ne trouve rien la fait suivre (sauf
  `flags.sansRelais`), au plus à 20 amis, d'abord — et seulement — à
  ceux dont le parcours touche l'entreprise ; jamais à l'auteur ni à qui
  la lui a passée.
  ```json
  { "v": 1, "t": "trouve", "id": "…", "demande": "<id>", "cercle": 3, "chaine": ["OCB1.…", "OCB1.…"] }
  ```
  `trouve` est la SEULE lettre sans `de` : elle prévient qui demande
  qu'on a trouvé, sans dire qui (décision 18). Un `don` peut porter la
  `chaine` de la demande reçue (qui demande n'ouvre que le premier
  jeton : son ami), `soi` (`{ "quoi": "stage" | "alternance" | "emploi",
  "maintenant": bool }` — c'est le donneur lui-même qui y est) et, pour
  une demande par critère, la `ville` de l'entreprise. Un `merci` qui
  remonte la chaîne porte `relais: true`, `suite` (les jetons qui
  restent après le destinataire) et un contact sans nom : le maillon
  apprend qu'il a aidé, pas qui était au bout ; il ne compte que pour
  une demande que j'ai fait suivre.
- Lecture BORNÉE (16 000 octets), et ce qui ne s'ouvre pas avec MA clé
  ou ne passe pas `normaliserLettre` est ignoré, jamais deviné.

### Groupe — OCG1 (invitation) et messages du groupe (docs/reseau.md lot 5)

```
OCG1.<code>.<nom du groupe en UTF-8, base64url>[.<clé de signature du chef>]
```
- **Depuis la 6.67** (décision 31), l'invitation porte la clé publique
  de signature du chef (ECDSA P-256 brute, base64url, 86-88 car.) : c'est
  elle qui rend vérifiables, chez chacun, les réglages et la fin. Une
  invitation d'avant n'en a pas ; une invitation neuve se lit par une
  version d'avant comme avant (le troisième morceau est ignoré).
- Le **code** (15 lettres de `abcdefghjkmnpqrstuvwxyz23456789`, affiché
  par groupes de cinq) EST le secret du groupe : un seul PBKDF2-SHA-256
  (100 000 tours, sel `opencontact·groupe·v1`) en tire 16 octets pour
  l'**étiquette** (`oc-groupe-<hex>`) et 32 pour la **clé** AES-GCM.
  Tapé à la main, le code seul suffit (tirets, espaces, majuscules
  ignorés) ; le nom s'apprend alors des présences du groupe.
- Les messages sont des événements Nostr (kind 8571, comme la boîte
  aux lettres) portant `x` = l'étiquette et `expiration` (NIP-40), et
  pour contenu `iv.chiffré` (base64). Quatre sortes, rien d'autre :
  ```json
  { "t": "membre", "de": "<amiId>", "prenom": "Karim", "nom": "BTS SIO Lille", "at": 0 }
  { "t": "depart", "de": "<amiId>", "at": 0 }
  { "t": "mot", "id": "…", "de": "<amiId>", "prenom": "Karim", "texte": "≤ 280 car., une ligne", "at": 0 }
  { "t": "part", "id": "…", "de": "<amiId>", "prenom": "Inès", "nb": 2, "n": 1, "i": 0, "d": "<base64>", "at": 0 }
  ```
  Depuis la 6.59 (lot 5b), une cinquième sorte, la **demande au groupe** :
  ```json
  { "t": "demande", "de": "<amiId>", "lettre": { <une lettre OCB1 « demande », cercle 1> }, "relais": { "prenom": "Karim", "n": 1 }, "at": 0 }
  ```
  La `lettre` est EXACTEMENT celle qu'un ami aurait reçue (prénom, clé
  de la boîte, entreprise ou critère, expiration à 14 jours) ; chaque
  membre la passe au même moteur (`traiterLettre`), sans jamais la
  faire suivre tout seul. `relais` n'existe que si un membre l'a
  relayée depuis un autre groupe (`n` ≤ 2). La réponse ne passe jamais
  par le groupe : `trouve`, `don`, `merci` vont à la boîte de qui
  demande. Une `trouve` venue d'un groupe porte `groupe: true` — qui
  demande lit « Trouvé dans un groupe », sans savoir qui ni lequel.
  Un membre ne porte que son **prénom** (décision 26) — et, depuis la
  6.67, sa clé de boîte, publique (voir plus bas) ; un don de
  pistes est un `sharePayload` (vue communautaire, §3) compressé et
  découpé comme le portage (`decouper`), recollé et lu BORNÉ, puis
  l'aperçu avant fusion (§4). Durées : `mot` et `part` 7 jours, `membre`
  et `depart` 30 jours (une présence se redit tous les 7 jours). Un
  message daté de plus de dix minutes dans l'avenir, ou passé son âge,
  est ignoré.
  Depuis la 6.60 (lot 5c), le groupe **« sur demande »** (décision 24) :
  son invitation n'est pas OCG1 mais une **porte**, qui ne porte JAMAIS
  le code :
  ```
  OCP1.<base64url de { "v": 1, "n": "BTS SIO Lille", "p": "<id de la porte>", "r": ["<clé de boîte>", …] }>
  ```
  `r` = les clés de boîte de ceux qui ouvrent (le chef et ses adjoints,
  dix au plus) ; sans aucune, la porte est refusée. Qui la scanne écrit à
  chacun une lettre `entree` ; l'un d'eux répond par `admis`, qui porte
  le code, scellé pour lui seul ; un refus n'écrit rien. Les membres
  d'un tel groupe signent (ECDSA P-256, une clé de signature à part de
  la boîte) : leur présence porte `cle` (leur boîte), `sign` (leur clé
  publique de signature) et `sig`, la signature de
  `{t:"membre", de, cle, sign}` — une présence qui annonce une clé sans
  la prouver la perd, avec sa clé de boîte. Le chef est la clé `chef`
  reçue dans `admis` ; un adjoint est nommé par un responsable :
  ```json
  { "t": "adjoint", "de": "<amiId de qui nomme ou de l'adjoint>", "membre": "<amiId>", "sign": "<sa clé de signature>", "cle": "<sa boîte>", "sig": "<signature>", "at": 0 }
  ```
  `sig` signe `{t:"adjoint", membre, sign, cle}` — sans date : l'adjoint
  redit sa nomination avec sa présence, et elle ne compte que signée par
  le chef ou un adjoint déjà reconnu. Elle vit 30 jours, comme une
  présence.
  Depuis la 6.61 (lot 5c2), deux sortes de plus, signées d'un
  responsable comme une nomination, et qui ne comptent que vérifiées :
  ```json
  { "t": "retrait", "de": "<amiId>", "id": "<id du message>", "signe": "<clé de signature>", "sig": "…", "at": 0 }
  { "t": "exclu", "de": "<amiId>", "membre": "<amiId>", "signe": "<clé de signature>", "sig": "…", "at": 0 }
  ```
  `sig` signe `{t:"retrait", id}` ou `{t:"exclu", membre}` ; `signe` doit
  être la clé du chef ou d'un adjoint reconnu. Un message retiré garde sa
  place dans le fil, sans rien de ce qu'il disait (« Retiré par Inès ») ;
  un retrait vit 14 jours. Un membre exclu sort, et sa présence ne le
  fait pas revenir ; une exclusion vit 30 jours. Le chef ne s'exclut pas.
  Retirer un membre CHANGE LE CODE du groupe : le nouveau ne passe jamais
  par l'ancien groupe (que l'exclu lit encore), il part par la boîte à
  chacun des autres membres (lettre `recode`).
  **Depuis la 6.67** (décisions 31 à 35), deux sortes de plus, signées
  AVEC le code du groupe — un membre de deux groupes ne rejoue pas chez
  l'un ce qui a été signé chez l'autre :
  ```json
  { "t": "reglages", "de": "<amiId>", "nom": "BTS SIO Lille", "j": 7, "ecrire": "tous" | "resp", "entree": "ouvert" | "demande", "porte": "<id>", "signe": "<clé>", "sig": "…", "at": 0 }
  { "t": "fin", "de": "<amiId>", "signe": "<clé du chef>", "sig": "…", "at": 0 }
  ```
  `reglages` porte TOUT ce qui se règle, d'un bloc ; `sig` signe
  `{t:"reglages", code, nom, j, ecrire, entree, porte, at}` et `signe`
  doit être le chef ou un adjoint reconnu — les plus récents vérifiés
  gagnent. Dans un groupe SANS chef (d'avant la 6.67), un réglage non
  signé de n'importe quel membre vaut. `fin` signe `{t:"fin", code}`, du
  chef SEUL : le groupe quitte le téléphone de chacun. Les deux vivent
  30 jours. `j` (1, 7 ou 30) est la durée des messages ÉCRITS ENSUITE :
  un `mot` porte sa propre durée en `j` (absent = 7), et son expiration
  NIP-40 suit ; rien n'est raccourci ni rallongé après coup. Avec
  `ecrire: "resp"`, un `mot` daté d'après le réglage et écrit par un
  autre qu'un responsable est ignoré. La présence d'un membre porte
  désormais `cle` (sa boîte) dans TOUT groupe : c'est par elle qu'arrive
  un nouveau code. Une lettre `recode` sans `exclu` (vide) est une
  **nouvelle invitation** : personne n'est retiré, l'ancienne invitation
  ne mène plus qu'à un groupe vide. Passer « sur demande » change aussi
  le code — l'ancienne invitation le portait.

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

**Portage par relais (6.30).** Quand aucun chemin direct ne s'ouvre
(NAT d'opérateur, pas de TURN), les fiches du rendez-vous passent par
les relais Nostr qui ont trouvé l'autre appareil (`engine/portage.js`).
Même contenu (`sharePayload`, jamais le privé), même aperçu avant
fusion, autre tuyau :

- **clé et sujet** : PBKDF2-SHA-256(code normalisé, sel
  `opencontact·portage·v1`, 100 000 itérations, 48 octets) — les 16
  premiers nomment le sujet `oc-portage-<32 hex>`, les 32 suivants
  sont la clé AES-GCM. Le code n'est jamais publié ;
- **message** : `<iv base64>.<chiffré base64>`, le clair étant un
  objet JSON `{ t, de, … }` publié en événement **éphémère** (rien
  n'est stocké par le relais). `de` = identifiant de pair de
  l'expéditeur ;
- `demande { r, manque }` — le receveur ; `manque` = indices absents,
  ou `null` pour tout ;
- `part { x, i, n, d }` — le donneur, en réponse seulement ; `d` =
  base64 d'un morceau (≤ 9 000 octets) du `sharePayload` compressé en
  deflate-raw ; `n` ≤ 64 ; `x` nomme l'envoi ;
- `recu { r }` — tout est arrivé ; `repli { r }` — le receveur passe
  au QR hors ligne, le donneur bascule avec lui.

**Dans un partage en groupe**, même mécanique avec le mot de passe du
groupe et le sel `opencontact·portage·groupe·v1` (un code et un mot de
passe égaux ne tombent jamais sur le même sujet). Chacun publie
`present {}` toutes les 5 s : un camarade entendu sans liaison directe
compte dans le groupe. Les parts partent à l'envoi, à tous ceux qui
écoutent ; `demande { r, x, manque }` redemande ce qui manque de
l'envoi `x`.

**« Mes appareils » (données PRIVÉES)** passe aussi par les relais,
mais la phrase de liaison n'y protège que l'enveloppe (sel
`opencontact·portage·appareils·v1`). Les données sont chiffrées pour
CHAQUE appareil sous une clé née d'un échange : ECDH P-256 entre ma
moitié secrète et sa moitié publique → HKDF-SHA-256 (sel
`opencontact·appareils·v1`, info = les deux identifiants d'appareil
triés, joints par `|`) → AES-GCM. Deviner la phrase n'ouvre donc
aucune donnée.

- `hello { id, nom, pub, xpub, sig }` toutes les 5 s — `xpub` = moitié
  publique d'échange, `sig` = signature Ed25519 de
  `oc-xpub:<id>:<xpub>` par `pub`. Un appareil que l'anneau connaît
  doit présenter SA clé `pub` et une signature valide, sinon il est
  ignoré ;
- `ring { ring }` — l'anneau signé, comme sur le canal direct ;
- `part { pour, x, i, n, d }` — `d` = morceau de
  `iv(12) ‖ AES-GCM(deflate-raw(fullPayload + privé))`, pour
  l'appareil `pour` seul ; `demande { r, x, manque, pour }` redemande.

Tout message qui ne s'ouvre pas avec la clé, ou mal formé, est ignoré.
Le rassemblage suit la même borne de décompression que OCQ1 (4 Mo).

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
`confirmations`, `updatedAt`, `vecu`, `vecuQui`, `siren` (+ `extra` si
présent).

**Privé** — ne part **jamais** dans un partage :
`status`, `notes`, `appliedAt`, `nextAction`, `nextActionText`, `closedAt`,
`closedReason`, `nextActionCt`, `history[]` (40 entrées max).
Ni `id`, ni `demo`, ni `createdAt` ne circulent non plus.

**Un contact** : `id`, `name`, `role`, `email`, `phone`, `link`, `note`,
`conf` (`""` | `"ok"` | `"doubt"`) (+ `extra` si présent).

**`address` peut contenir des SAUTS DE LIGNE.** C'est un champ libre au
sens du GOV.UK Design System : l'utilisateur y écrit son adresse dans la
forme qu'il veut, et elle voyage telle quelle. Aucune clé ne bouge et le
format `.oc` ne change pas — c'est toujours une chaîne JSON — mais trois
lectures doivent le savoir, et les trois sont dans le moteur :

- `extractCity(address)` prend la **dernière ligne non vide**, puis ce qui
  suit la dernière virgule, puis retire le code postal. Sur une adresse
  d'un seul rang le résultat est identique au caractère près.
- `surUnRang(address)` recolle les lignes par une virgule pour tout ce qui
  **sort vers un service tiers** — l'itinéraire, la recherche d'adresse.
  Un `%0A` au milieu d'une destination ne se géocode pas.
- l'affichage garde les lignes (`white-space:pre-line`) : sans ça le HTML
  les replierait et le champ libre ne servirait à rien.

Une adresse reçue d'un camarade peut donc arriver multi-ligne. Rien à
migrer : une valeur d'un seul rang reste valide et se lit pareil.

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
**Depuis la 6.73** (lot F3a), `via` au contact : le prénom (40 car. au
plus) de l'ami qui me l'a donné par la boîte, posé à « Ajouter à la
piste » — jamais quand le contact est l'ami lui-même (« j'y suis »). Il
nourrit le jeton `{{via}}` (« Karim m'a conseillé de vous écrire. »),
première ligne du modèle de candidature, qui s'efface sans lui ; un
modèle de départ identique à celui des 6.47 à 6.72 prend cette ligne, un
modèle retouché n'est jamais touché. **Depuis la 6.74** (lot F3b), `accord: true` à côté de `via` (jamais
sans lui) : l'ami avait prévenu le contact, et `{{via}}` devient « Karim
vous a parlé de moi. ». Privés comme les champs d'action :
`communityView` ne les émet pas et les purge d'`extra`, et la fusion
communautaire vide un `via` et un `accord` entrants — qui a donné un contact à un autre
n'est pas mon ami, et un appareil resté en 6.72 l'aurait laissé dans
`extra`.
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
devient que sur déclaration : `communityView` n'émet `vecu` **que** si un
prénom l'accompagne — une piste sans déclaration part exactement aussi
anonyme qu'avant. Chez soi, `vecuQui` reste vide (« c'est moi ») ; le
prénom vient du profil au moment du partage, jamais du stockage.
**Les deux vont ensemble, ou aucun ne part.** Un `vecu` orphelin serait
indiscernable, chez le receveur, de sa propre déclaration : sa fiche lui
affichait « Tu y es passé » sur une entreprise où il n'a jamais mis les
pieds (mesuré en jouant le parcours à deux). Et une recommandation
anonyme ne mène nulle part de toute façon.
Fusion : contrairement à la règle générale (§4.1, compléter les vides),
`vecu` **remplace** quand l'entrant est plus fort — l'ordre est
`alternance` > `stage` > `entretien` > `connait`. Un entrant plus faible
ou égal-mais-différent est compté en divergence, jamais importé. Rien
n'est perdu : c'est un renforcement, pas un écrasement.

**Le SIREN (`siren`, v6.45) — partagé, optionnel, absent quand vide.**
Neuf chiffres, le numéro que le registre des entreprises publie : les
espaces sont retirés à la normalisation, toute autre forme rend le champ
**absent** (un faux numéro ferait fusionner deux entreprises
différentes). Il arrive quand on ajoute une piste depuis « À découvrir »
(`engine/annuaire.js`) et il **voyage** : c'est une information publique,
et c'est lui qui reconnaît chez le receveur l'entreprise qu'il a déjà
sous un autre nom. Fusion (§4) : `findMatch` le consulte **avant** le
nom — même numéro, même piste, quel que soit son nom ; deux numéros
différents, deux pistes, même homonymes — et un SIREN entrant complète
une piste qui n'en avait pas (la règle générale, compléter les vides).
Un lecteur ancien le range dans `extra` sans casse.

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
   voyage en bloc (son `updatedAt` à lui). **Sauf ce qui dit où me
   joindre** (6.55) : si le profil qui gagne n'a pas encore de `boite` ni
   d'`amiId`, il prend ceux de l'autre — mes amis ont scanné ce QR-là, et
   une boîte perdue est une lettre qui n'arrive jamais.
3. **Les suppressions voyagent** par tombstones `{id, t}` : une pierre plus
   récente que la fiche la supprime partout ; une fiche modifiée **après**
   la suppression ressuscite (le geste le plus récent gagne).
4. La sync est **idempotente et convergente** : rejouer le même échange ne
   change rien, et deux appareils arrivent au même état quel que soit l'ordre.
5. La phrase de liaison ne transite jamais en clair : la salle P2P porte un
   hash, les données sont chiffrées de bout en bout.
6. **Mon groupe fait exception au « plus récent gagne »** : il fusionne par
   union qui complète les vides (mêmes règles que §4), jamais en bloc.
   Rencontrer Léa sur le téléphone et Marco sur l’ordinateur doit donner Léa
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
   par fichier, quel que soit le canal. **Les groupes** (6.58, OCG1) tiennent
   la même règle : un don au groupe est un `sharePayload`, il s'ouvre par
   l'aperçu, et rien de mes appareils (le code d'un groupe compris) n'y part.
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
   missions, propositions de l'assistant (`oc_proposals_v1`), l'état de
   la boîte aux lettres (`oc_reseau_v1`), ce qui s'est dit dans mes
   groupes (`oc_groupes_v1`), mes conversations avec mes amis
   (`oc_messages_v1`), et les documents (`cv`,
   `lettre`) de `oc_docs_v1`.
8. **Campagnes C8** : les instantanés privés du canal `full` peuvent porter
   `campaigns` (`oc_campaigns_v1`) et `missions` (`oc_missions_v1`). Ce sont
   des champs optionnels : un ancien appareil les ignore sans casser le
   format. Une campagne prend la forme la plus récente (`updatedAt`), mais
   les `sid` déjà au journal et les états terminaux des cibles ne régressent
   jamais. Les missions sont dédupliquées par `mid` ; leur état est monotone
   (`a_confier` → `confiee` → `revoquee`), les arrêts sont réunis, et le
   triplet signé `{m,sig,dev}` est transporté **sans recomposition**.
   `oc_companion_v1`, clé du canal 127.0.0.1, reste exclusivement sur
   l’ordinateur associé et ne voyage jamais. Les formats `.oc`, `OCQ1.` et
   `OCQP1.` ne changent pas.

---

## Ce qui peut changer librement

Tout le reste : `index.html` et `app.js` — écrans, composants, styles,
textes, navigation, gestes. C'est précisément le but de la séparation
moteur / interface : refaire l'interface sans jamais toucher aux quatre
sections ci-dessus. Le moteur (`engine/`) peut lui aussi évoluer à
l'intérieur, tant que les tests de contrat restent verts.

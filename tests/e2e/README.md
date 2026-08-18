# Tests de bout en bout (Playwright)

Outillage de développement — rien ici n'est chargé par l'application.

```
node tests/e2e/tous.mjs          # tout : unitaires (?test) + scénarios
node tests/e2e/e2e-verrou.mjs    # un seul scénario
```

Prérequis : Node ≥ 20 et Playwright avec un Chromium. La résolution est
automatique (`/opt/pw-browsers`, `PLAYWRIGHT_BROWSERS_PATH`) et se force
par `OC_PLAYWRIGHT=<chemin de index.mjs>` / `OC_CHROMIUM=<chemin du
binaire>`. Les captures vont dans `captures/` (non versionné).

**29 scénarios, et tous ne se jouent pas ici.** Le résumé de `tous.mjs`
distingue **joués**, **sautés** et **échoués** — un scénario sauté n'est pas
un scénario vert. Deux raisons de sauter, et elles sont dites dans chaque
ligne ci-dessous : le scénario appartient à une capacité **masquée à
l'écran** (les quatre drapeaux de `ui/perimetre.js` — repasser l'un à `true`
le remet dans la suite sans toucher à `tous.mjs`), ou il pilote le **vrai
binaire natif**, qui demande `cargo` et `xvfb-run`.

---

## Le socle — ce qui ne doit jamais casser

| Scénario | Ce qu'il prouve |
|---|---|
| `unitaires.mjs` | Les auto-tests `?test` du moteur — tous verts, zéro erreur console |
| `e2e-parcours-neuf.mjs` | La toute première ouverture, mobile **et** bureau : chaque écran vide **enseigne** au lieu d'afficher « aucune donnée », la première capture se fait à la main, et elle survit au rechargement |
| `e2e-stockage.mjs` | **Le dernier rang persistant.** En navigation privée verrouillée, IndexedDB **et** localStorage refusent — le rang « cache » prend le relais et les pistes survivent, et `sw.js` ne purge jamais `oc-kv-v1` à son activation. Quand même le cache est impossible, l'app le **dit** : bandeau lisible, bouton de secours réellement tapable |
| `e2e-durabilite.mjs` | **La panne qu'on ne peut pas réparer.** Un suivi complet — les 20 clés persistantes, coffre scellé et anneau d'appareils compris, **plus les CV et lettres** de la base séparée `oc_docs_v1` — puis un déploiement réel dont on attend que le **service worker neuf prenne la main** (sans ça on ne prouve qu'un rechargement). Tout survit octet pour octet, le thème aussi, et l'app **relit** vraiment ses pistes et ses documents. Sans serveur, ce qui est perdu ici est perdu pour de bon. Le contrôle plante deux sondes — une clé, un PDF — pour prouver qu'il sait encore échouer |
| `e2e-maj.mjs` | Une app **déjà installée**, service worker actif, et une nouvelle version publiée **en cours de route** comme un déploiement réel : la voit-elle à la première ouverture ? Il ne regarde aucune donnée — c'est `e2e-durabilite` qui s'en charge |

## Protéger, et savoir revenir

| Scénario | Ce qu'il prouve |
|---|---|
| `e2e-verrou.mjs` | Création du profil protégé (code, phrase, sauvegarde bloquante), scellement `OCV1.` vérifié en IndexedDB, mauvais code + délai, clavier, thèmes |
| `e2e-recuperation.mjs` | « Code oublié ? » : phrase prouvée → rotation complète (gén. +1), ancien code refusé, sauvegarde obligatoire |

## Faire circuler — l'invariant ① avant la fonctionnalité

| Scénario | Ce qu'il prouve |
|---|---|
| `e2e-liaison.mjs` | **La liaison réelle**, pas simulée : deux vrais navigateurs et un relais Nostr local, la chaîne entière jouée — bibliothèque → WebSocket → découverte → WebRTC → échange. Sync « Mes appareils » dans les deux sens, partage en groupe avec aperçu avant fusion, rendez-vous QR. Et les pannes **dites** : aucun relais joignable → l'écran le dit, plus jamais « en liaison » dans le vide |
| `e2e-partage-qui.mjs` | « → qui » : choisir les personnes qui partent, piste par piste, et vérifier ce qui sort **vraiment du fichier `.oc`** — pas ce que l'écran affiche. Le défaut reste « tout part », le libellé suit la règle calibrée, et le suivi privé ne sort jamais. Au pouce, thème sombre |
| `e2e-vecu.mjs` | « J'y suis passé » — le seul endroit où un partage cesse d'être anonyme. Le contrôle n°1 n'est pas la fonctionnalité, c'est **l'invariant ①** : on ajoute un champ qui voyage **et** un prénom, exactement le genre de changement qui fait fuir le reste. Vérifié en premier, sur toutes les sorties possibles, et il échoue bruyamment |

## Les écrans du quotidien

| Scénario | Ce qu'il prouve |
|---|---|
| `e2e-commencer.mjs` | **« Je fais quoi maintenant ? »** — la promesse du produit, que rien ne vérifiait. Les trois états réels d'« Aujourd'hui », et un contrôle qui tient en une ligne : quand des pistes existent, l'écran en **montre**. Le trou mesuré : vingt-quatre pistes reçues d'un camarade, et « Rien de planifié » |
| `e2e-pistes.mjs` | « Affiner » : une seule feuille pour filtrer **et** trier, même grammaire, l'état actif en puces retirables sous la recherche. Et au poste, déposer une carte dans une autre colonne change le statut avec une trace propre |
| `e2e-fenetre.mjs` | La fenêtre se prend par sa barre de titre au poste, et sa place tient pour la feuille suivante. Surtout les **bornes** — une fenêtre poussée hors de l'écran ne se rattrape plus. Et ce qui ne doit **pas** bouger : au doigt (la barre y sert à refermer) et sur une confirmation (une question n'est pas une fenêtre qu'on range) |
| `e2e-mouvement.mjs` | Le mouvement geste par geste, **dans les deux sens** : il échoue si un geste qui doit glisser saute — **et** si un geste qui doit rester net se met à glisser. C'est ce second sens qui empêche l'animation de proliférer un « juste un petit fondu » à la fois |
| `e2e-annonce.mjs` | **Ce qui change se dit, ce qui se tape a un nom.** Chaque cible porte un nom accessible — le `placeholder` ne compte jamais —, les messages d'état s'annoncent (la barre Annuler, filet de sécurité de tout le produit, et le compte qui reste après un filtre), et le focus **ne tombe pas par terre** quand la ligne qui le porte disparaît. 13 surfaces, deux ergonomies |

## Écrire & la messagerie *(capacités masquées — sautés selon `ui/perimetre.js`)*

| Scénario | Ce qu'il prouve |
|---|---|
| `e2e-envoi.mjs` | Envoi direct Gmail intercepté, « Depuis {adresse} », expiration → reconnexion sans perdre le brouillon, `mailto:` intact — sauté sans `ENVOI_DIRECT` |
| `e2e-campagne.mjs` | Bifurcation → assistant → contrôle → envois du jour interceptés, plafond, **fenêtre d'envoi (samedi = retenu)**, réponse → relances annulées — sauté sans `CAMPAGNES` |
| `e2e-ia.mjs` | « Proposer un brouillon » intercepté, quota (429) proprement, rien de perdu — sauté sans `IA` |
| `e2e-analyse.mjs` | « Depuis mes e-mails » : prompt copié, aperçu multi-sélection, lien piégé neutralisé, confiance non transmise — sauté sans `COMPAGNON` |
| `e2e-oauth-sw.mjs` | Le service worker ne détourne jamais `oauth.html` ; le jeton revient par postMessage — sauté sans `ENVOI_DIRECT` |

## La surface ordinateur *(sautés sans le binaire natif, ou hors périmètre)*

| Scénario | Ce qu'il prouve |
|---|---|
| `e2e-compagnon.mjs` | Appairage du Compagnon contre un faux au protocole exact : mauvais code refusé, clé de canal scellée, anneau (rôle companion), présence, rupture propre |
| `e2e-compagnon-envoi.mjs` | Le VRAI binaire (xvfb) : campagne confiée par l'assistant, envois SMTP réels vers un puits local, kill −9 + relance = zéro doublon, rapport replié, reprise en main — sauté si `compagnon/target` n'est pas construit |
| `e2e-compagnon-reponses.mjs` | Le VRAI binaire + faux IMAP : réponse détectée en boîte → relances arrêtées seules, fiche marquée « réponse » au repli — sauté sans binaire |
| `e2e-compagnon-scan.mjs` | Le VRAI binaire + corpus piégé + faux Ollama : « ton ordinateur lit tes e-mails » → aperçu multi-sélection, injection neutralisée, tri respecté — sauté sans binaire |
| `e2e-compagnon-ia.mjs` | Le VRAI binaire, rédaction « via ton ordinateur » sur trois runtimes (Ollama local, OpenAI par clé, abonnement ChatGPT). La règle d'or : **aucun modèle implicite** — on choisit dans la liste que le runtime sert vraiment. Le prompt porte la piste, **jamais le suivi privé** ; la clé ne touche jamais le disque du Compagnon — sauté sans binaire |
| `e2e-c8-telephone.mjs` | Le VRAI binaire : une campagne préparée sur un **téléphone** qui ne connaît le Compagnon que par l'anneau. Son bon signé emprunte le rail privé de « Mes appareils », et l'envoi n'a lieu **qu'une fois** malgré plusieurs rejeux de sync — sauté sans binaire |
| `e2e-mcp.mjs` | Le serveur MCP local du VRAI Compagnon, au protocole réel : découverte d'outils (aucune suppression ni écriture directe), lecture bornée **sans champ privé**, dépôt d'une proposition normale puis hostile, aperçu multi-sélection, aucune écriture avant validation, révocation immédiate. Survit à un verrouillage et à un kill −9 — sauté sans binaire |

## Les gardes transverses — celles qui empêchent de revenir en arrière

| Scénario | Ce qu'il prouve |
|---|---|
| `e2e-ux-audit.mjs` | Le balayage large : cibles ≥ 44 px au doigt et ≥ 24 px à la souris sur 13 surfaces, survol inerte au doigt, `touchcancel` rendu par chaque geste, texte doublé à 200 % sans rien perdre, hiérarchie des titres, adjacence des cibles, actions impossibles désactivées |
| `e2e-diagnostic.mjs` | « Signaler un problème » : le rapport tient cinq lignes stables, **aucune donnée personnelle d'un vrai suivi n'y entre**, le presse-papier rend exactement le bloc affiché, tout se lit sans défiler en 390 px — et **ni numéro de version ni adresse d'hébergeur** nulle part, sur l'écran comme dans la source |
| `e2e-sobriete.mjs` | **Les couches ne repoussent pas.** Trois plafonds tenus à la main, sur les écrans visibles : longueur d'un toast (une phrase, un tiret cadratin), nombre de confirmations bloquantes, mots d'explication dans les feuilles. Aucun navigateur — il lit `ui/*.js`. Ajouter une porte ou une phrase oblige à monter le plafond **ici**, exprès |

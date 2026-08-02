# OpenContact — feuille de route

**Document de référence pour la suite d'OpenContact.** Les règles produit et
UI/UX restent dans `CLAUDE.md`, le contrat de données dans `CONTRAT.md` :
cette feuille de route dit **quoi faire et dans quel ordre**, jamais
**comment concevoir**.

Le Compagnon a **sa propre feuille de route** : `compagnon/roadmap.md`. La
frontière entre les deux est posée dans `CLAUDE.md` §0 — on ne la re-discute
pas ici, on l'applique.

Dernière mise à jour : 31 juillet 2026 — version applicative 6.3.0, cache
`oc-v74`, 100 auto-tests verts (`node tests/e2e/unitaires.mjs`).

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
- Auto-tests verts, parcours principaux rejoués en E2E.

> **Nuance conservée.** « Refonte terminée » veut dire : les 23 décisions sont
> livrées. Pas : l'application est sans défaut. L'audit du §1.1 en avait
> trouvé 12, capture d'écran à l'appui. C'est normal — c'était exactement son
> rôle.

Le chantier connecté (coffre pour secrets, messagerie, IA, campagnes,
Compagnon, MCP) est livré lui aussi, mais **il n'appartient plus à
OpenContact** : voir `compagnon/roadmap.md`.

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

Application de `CLAUDE.md` §0. Tout ce qui appartient au Compagnon ou qui est
reporté **disparaît de l'écran** — sans rien supprimer, sans toucher une clé
de stockage, sans perdre la moindre donnée déjà enregistrée.

**Un seul point de contrôle : `ui/perimetre.js`.** Quatre drapeaux
(`COMPAGNON`, `CAMPAGNES`, `IA`, `ENVOI_DIRECT`), tous à `false`. Remettre une
capacité à l'écran = repasser son drapeau à `true`, rien d'autre — y compris
ses scénarios de bout en bout, que `tests/e2e/tous.mjs` saute en lisant ces
mêmes drapeaux et rejoue dès qu'ils changent.

Disparaissent de l'interface :

- le branchement d'un assistant IA et le bouton « Proposer un brouillon » ;
- la connexion à une messagerie et l'envoi direct ;
- l'assistant de campagne, la liste du jour, les lignes de campagne
  d'« Aujourd'hui », la maison « Campagnes (N) » ;
- l'analyse automatique de la boîte mail et les propositions de l'assistant ;
- tout ce qui nomme ou propose le Compagnon.

Restent visibles : écrire un mail par `mailto:` (copier / ouvrir dans Mail /
« Envoyée ✓ ») et **postuler à plusieurs boîtes d'affilée, une par une**.

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
notarisation des installateurs) est parti dans `compagnon/roadmap.md`. Ce qui
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
- **Un chemin de retour d'expérience sans serveur** : sans compte ni
  analytics, une bêta ne renvoie rien par défaut. Prévoir un « Signaler un
  problème » qui produit un texte de diagnostic copiable (version, backend de
  stockage, navigateur, taille des données — **aucune donnée personnelle**) à
  coller dans une issue. Sans ça, la bêta revient silencieuse ou coûte un
  entretien par étudiant.

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

1. **L'IA par clé de navigateur** (Claude, Gemini, OpenRouter). Elle passe la
   règle — aucune installation, elle marche sur un téléphone — et elle ne
   demande aucune démarche au mainteneur. C'est la moins chère à ramener et
   la plus utile : brouillon qui tient compte du modèle choisi et de
   l'historique, « améliorer mon texte », import d'e-mails collés, remplir une
   fiche depuis une annonce collée.
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

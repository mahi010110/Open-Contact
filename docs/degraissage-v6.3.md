# OpenContact — v6.3 « dégraissage » (spec pour Fable 5)

Tu pars de l'app actuelle (v6.2). Elle est bonne et bien construite : **on ne coupe aucune fonctionnalité.** Ce passage a un seul but — retrouver la sensation de simplicité de la v6.0 : **moins de texte, moins de clics, une hiérarchie claire.** Chaque écran est déjà *rangé* ; le défaut, c'est qu'il présente trop de choses de même poids. On corrige la **présentation** et les **gestes**, pas le périmètre.

Avant de coder : lis ce doc + `docs/refonte-brief.md` (la vision d'origine), explore le code, et **propose ton plan avant de te lancer**. Mobile d'abord ; vérifie en lançant réellement l'app (390 px + desktop, thème clair + sombre) ; garde les auto-tests verts (`?test`, 42/42).

## Règles transverses (à appliquer partout)

- **Diète de texte.** Un **mot ou une icône** par défaut. Une phrase complète *uniquement* quand la sécurité l'exige (ex : « jamais le privé » au moment de partager). Coupe les sous-titres, les hints, les descriptions.
- **Un héros par écran.** Une seule action dominante ; le secondaire s'efface (plus discret ou replié). Le teal réservé à *la* principale.
- **Garder le « 98 », baisser la densité.** Moins de bordures dans des bordures, texte secondaire effacé, plus d'air. Même identité visuelle.
- **Supprimer = un geste, partout pareil.** **Glisser** sur mobile, **poubelle au survol** sur desktop. Toujours doublé d'un **Annuler ~30 s**, jamais de pop-up de confirmation. Bon seuil de geste (ne pas se déclencher au défilement).
- **Barres transitoires balayables.** Toast, « Annuler », bandeaux : **balayer** pour fermer sur mobile, **✕** sur desktop. Les minuteurs auto restent en secours.
- **Adaptatif.** Tout geste tactile a son équivalent souris/clavier sur desktop.
- **Moteur.** Invariants intouchables (jamais d'écrasement, chiffrement, sens unique moteur→écran). Tu peux l'étendre *additivement* et *rétrocompatible* ; `CONTRAT.md` et les tests suivent et restent verts.

## Échanger — présentation v6, épurée

- En haut, **deux verbes : Donner · Recevoir.**
  - **Donner** → choisir **QR** (en personne) ou **Fichier** (à distance ; case « chiffrer » *optionnelle*). Le QR affiche toujours un **code court à taper** (repli sans caméra).
  - **Recevoir** → **Scanner** / **Ouvrir un fichier** / **Coller**. « Scanner » reconnaît tout seul le type de QR (rendez-vous ou données).
- En dessous, **une entrée « Salle de groupe »** distincte et soignée — présente, ni cachée ni imposante (elle évoque un *lieu vivant*, car le groupe est live et à plusieurs).
- Tout en bas, discret : rappel « données locales — jamais le privé ».
- **La sync appareils quitte Échanger** (→ « Moi »).

## L'échange — le modèle QR

- **Base 🅑 : le QR est un code de rendez-vous.** Le QR porte un petit code ; scanner → les deux appareils s'appairent en **P2P** (infra Trystero déjà présente) → les fiches passent par la connexion. Rapide, **sans limite de nombre**. Requiert le réseau (relais).
- **Repli 🅐 : le QR contient les données.** Hors-ligne. Petit = QR statique ; gros = **QR animé** (OCQP, déjà en place) ; + fichier `.oc`.
- **Automatique :** l'app tente 🅑 ; si pas de réseau ou P2P qui échoue → bascule sur 🅐 toute seule. **Un seul « Partager », un seul « Scanner »** ; l'utilisateur ne choisit jamais « online/offline ». Sans caméra, le receveur **tape le code** (🅑) ou passe par fichier/coller.
- **Fichier `.oc` chiffré (AES) conservé**, chiffrement **opt-in** (une case), jamais imposé. Copier-coller conservé. Pas de NFC ni Bluetooth (cross-platform trop faible).

## Salle de groupe — comportement à préserver

Mot de passe commun → salle live P2P. Envoi = toutes tes pistes (élaguables d'un tap) vers les présents ; réception = **aperçu avant fusion**, jamais d'écrasement, **jamais le privé**. C'est **synchrone** (tout le monde en ligne en même temps ; un arrivant tardif ne reçoit pas le passé). Garder ce fonctionnement ; seulement le présenter élégamment (voir Échanger).

## Sync appareils → dans « Moi », simplifiée

- Déplacer la sync entre MES appareils d'Échanger vers « Moi ».
- **Simplifier :** une seule ligne « Mes appareils » avec un état clair (**Relié / Non relié**) + un bouton. Rien de plus.

## Tri / ordre (Mes pistes, + Prospecter + Donner)

- Séparer **critère** (par quoi : récence, A→Z, complétude, proximité, à faire) et **ordre** (**↑ / ↓**). Un « Trier par… » + une bascule ↑↓.
- **Bug à corriger :** re-tap sur le tri actif = **retour à l'ordre par défaut** (aujourd'hui ça ne se réinitialise pas).
- **Même contrôle réutilisé** dans **Mes pistes, Prospecter et Donner** — comportement identique partout, appris une seule fois.

## Suppression — un geste, dans « Mes pistes » uniquement

- **Retirer** le bouton de sélection/suppression (à côté du tri) **et** le bouton supprimer dans les fiches.
- Supprimer = **glisser** (mobile) / **poubelle au survol** (desktop), **seulement dans « Mes pistes »**.
- **Annuler ~30 s** au lieu d'une confirmation. La **suppression multiple disparaît** (une piste à la fois — assumé).

## Fiche — historique seulement au « Confirmer »

- La fiche devient un **formulaire** : les changements ne sont enregistrés/journalisés **qu'au bouton « Confirmer »** (à créer — il n'existe pas aujourd'hui).
- Ouvrir ou consulter une piste **ne crée aucune entrée d'historique**.
- L'historique note un **résumé propre** de ce qui a réellement changé, pas chaque micro-geste.
- Quitter avec des modifs en attente → léger garde-fou « quitter sans enregistrer ? ». Non confirmé = jeté.

## « Coup de pouce IA » (prompts) — refaire la présentation

- Défaut actuel : boutons « Copier » non alignés (ils flottent après le nom), noms qui passent à la ligne, crayon perdu à droite, trop de texte → désordonné.
- **Refaire en liste propre :** chaque prompt = une **ligne identique** — nom à gauche (une seule ligne, tronquée si besoin), actions **alignées à droite** sur toutes les lignes. **Taper la ligne = Copier** (toast « copié ») ; petit **✎** = éditer. Supprimer = glisser / poubelle au survol (comme partout).
- Couper le paragraphe d'explication (le renvoyer dans « Comment ça marche »). « Nouveau prompt » et « Revenir au prompt d'origine » restent, discrets.

## Finitions

- **Fin de la troncature** des lignes (« Écrire au m… ») : le verbe d'action doit rester lisible.
- **Jamais deux surfaces modales à la fois** (bug repéré : la barre de sélection restait visible sous la feuille de tri — de toute façon la sélection disparaît).

## Bornes

Ne coupe **aucune** fonctionnalité. Ne casse pas les invariants du moteur ni les auto-tests. Pas de framework, pas de build, pas de carte, mono-domaine. Garde : Prospecter, la fusion sans écrasement + Annuler, le privé jamais partagé, la complétude, les modèles d'emails, le chiffrement.

## Méthode

Mobile d'abord, écran par écran. Présente ton plan de découpage avant de coder. Vérifie en lançant réellement (390 px + 1280 px, clair + sombre, `?test` vert). Règle d'or : **moins tu ajoutes de texte et de clics, mieux c'est.**

# OpenContact — plan UX validé du chantier connecté

> **Statut : validé par le mainteneur le 16 juillet 2026** (plan livré en
> discussion, arbitrages n°1–4 rendus — voir `CONTEXT.md` D13–D16).
> Ce document concrétise `SPECIFICATIONS.md` §12 ; en cas de divergence,
> `CLAUDE.md` et `CONTRAT.md` restent prioritaires.

## 1. Le principe directeur

**Rien ne déménage, tout s'amplifie.** Aucun nouvel onglet, aucun écran de
navigation nouveau. Chaque nouveauté est un **nouvel état d'un lieu
existant** :

- **« Moi »** gagne deux lignes compactes — *Verrouillage*, *Connexions* — à
  côté de *Mes appareils* qui s'enrichit (bloc « sécurité » de trois lignes
  `ec-row` consécutives, visibles pour tous dès la V1 — D14).
- **« Écrire »** (la feuille existante) gagne un bouton *Envoyer* quand une
  messagerie est connectée, et un brouillon IA quand une IA l'est.
- **« Prospecter »** gagne une bifurcation : *une par une* (l'existant) ou
  *en campagne*.
- **« Aujourd'hui »** reste le seul endroit qui dit quoi faire : les envois
  de campagne prêts y apparaissent comme des actions du jour.
- **« Échanger → Recevoir »** reste l'unique porte d'entrée des données :
  « Analyser mes e-mails » y est une source de plus, même aperçu avant fusion.
- Le **seul écran réellement nouveau** est l'écran de verrouillage — et il
  n'existe que si l'utilisateur a choisi de protéger ses données.

Un utilisateur qui n'active rien ne voit aucune différence, hors les lignes
sobres du bloc sécurité de « Moi ».

## 2. Le verrouillage (profil protégé)

- **Nom visible : « Verrouillage »** ; le geste : « Protéger » ; l'état :
  « protégé / non protégé » (D16). Ni « coffre » ni « profil protégé » à
  l'écran.
- **Emplacement** : ligne compacte dans « Moi », premier élément du bloc
  sécurité (*Verrouillage* / *Mes appareils* / *Connexions*).
- **Création** (feuilles empilées, une décision par feuille) :
  1. « Protéger tes données » — trois lignes de valeur + *Choisir mon code* ;
  2. code **6 chiffres** sur pavé 44 px, puis confirmation ; refus des codes
     triviaux (« Trop facile à deviner. ») ;
  3. **phrase de secours** 12 mots (Plex Mono, numérotés), consigne « Écris-la
     sur papier. C'est la seule issue si tu oublies ton code. », validation
     par re-saisie de 2 mots tirés au sort ; distinction explicite d'avec la
     phrase de liaison (D11) ;
  4. **sauvegarde chiffrée bloquante** avant la fin du parcours (D15) ;
  5. fin : « Protégé ✓. Cet appareil devient ton appareil principal. » +
     proposition biométrie si PRF disponible (accélérateur optionnel).
- **Écran verrouillé** : plein écran (pas une feuille), identité Utilitaire 98,
  pavé numérique au pouce (mobile) / saisie clavier + Entrée (ordinateur),
  biométrie tentée d'office si activée, « Code oublié ? » en linklike.
  Erreur : secousse `steps()` + « Ce n'est pas ça. » ; dès 5 échecs, délai
  progressif affiché sobrement. **Jamais d'effacement des données.**
- **Verrouillage auto** : 5 min mobile / 15 min ordinateur, aucun réglage V1
  (D6) ; n'interrompt pas une campagne validée.
- **Re-saisie du code** avant les gestes sensibles : voir/modifier une
  connexion, lancer une campagne, révoquer un appareil, transférer le rôle,
  rompre le lien, restaurer une sauvegarde, changer la phrase de liaison.
  Jamais pour les gestes quotidiens.

## 3. Appareil principal & récupération

- Tout vit dans la feuille **« Mes appareils »** existante, enrichie :
  1. badge `principal` (tag plein) sur l'appareil qui détient l'autorité,
     badge `compagnon` pour le Compagnon ;
  2. tap sur une ligne → feuille d'appareil : *Verrouiller cet appareil* /
     *Retirer de mes appareils* / *Retirer et changer les clés* / *Effacer ses
     données* (danger) ; depuis le principal seulement : *En faire l'appareil
     principal*. Copies honnêtes (« Il se verrouillera dès qu'il se
     reconnectera. » ; « Si quelqu'un l'en empêche, change aussi les clés. ») ;
  3. hors principal : lecture seule + « Seul ton appareil principal peut
     faire ça. »
- Ordinateur : même feuille en fenêtre centrée, liste en tableau (nom · vu ·
  rôle · actions au survol).
- **Récupération d'urgence** (« Code oublié ? » depuis l'écran verrouillé) :
  saisie de la phrase de secours (tolérante casse/espaces) → annonce claire
  (« Cet appareil devient ton appareil principal. L'ancien est écarté. Ton
  code et ta phrase sont renouvelés. ») → nouveau code → nouvelle phrase →
  **nouvelle sauvegarde chiffrée obligatoire** (D7) avec honnêteté sur les
  anciennes copies → « Récupéré ✓ ». Phrase erronée : « Ce n'est pas la bonne
  phrase. Vérifie l'ordre des mots. », sans délai punitif.

## 4. Connexions (messagerie & IA)

- **Une seule ligne « Connexions » dans Moi** → feuille unique à deux
  groupes : MESSAGERIE (Gmail, Outlook — V1) et IA (Ollama, abonnement via
  l'ordinateur, clés API).
- États messagerie par ligne : *connecté* (adresse d'envoi toujours visible),
  *expiré* (« Reconnecter », warn), *non connecté*. Copie de connexion :
  « Google va te demander d'autoriser l'envoi. OpenContact ne lira jamais ta
  boîte. »
- Les entrées IA qui exigent le Compagnon affichent l'état sans jargon :
  « via ton ordinateur » / « ton ordinateur est éteint ».
- **Découverte contextuelle d'abord** : la feuille Écrire propose une fois,
  discrètement, « Envoyer directement depuis l'app ? » (linklike) → enchaîne
  création du verrou si besoin puis connexion. Moi = gestion, le contexte =
  découverte.
- Rappel sobre en pied de feuille : « Tes accès restent chiffrés sur tes
  appareils. Rien ne passe par un serveur OpenContact. »

## 5. Envoyer directement (feuille Écrire)

- Structure de la feuille inchangée (destinataire, modèle, objet, message).
- **Sans connexion** : pied actuel `[Copier] [Ouvrir dans Mail (primaire)]
  [Envoyée ✓]` — intact, repli permanent.
- **Connecté** : pied `[Copier] [Envoyer (primaire)]` + ligne discrète sous le
  message : « Depuis {adresse} · *ou ouvrir dans Mail* » (linklike). Un seul
  primaire par vue. Le passage par Mail re-propose « Envoyée ✓ ».
- **Envoi réussi** → boucle existante : historique, `todo→active`,
  `askNextAction` « Envoyé ✓ — et ensuite ? » préréglé « Relancer ».
- **Jeton expiré** : le brouillon ne bouge pas ; feuille empilée « Gmail
  demande de te reconnecter. » `[Reconnecter] [Ouvrir dans Mail]`.
- **Échec réseau** : « Pas parti — réessaie, ou ouvre dans Mail. » Envoi
  marqué uniquement à la confirmation du fournisseur ; jamais de relance
  aveugle (état « à vérifier » si résultat incertain).
- **Brouillon IA** (si IA connectée) : bouton discret `✨ Proposer un
  brouillon` près du sélecteur de modèle ; le texte arrive dans les champs
  éditables — relecture par construction. Erreur : « L'IA ne répond pas — le
  modèle reste là. »

## 6. Campagnes

- **Départ : Prospecter** (D2). Après la sélection multi-pistes, une feuille,
  une question : `Une par une` (existant) / `En campagne` (« Un message +
  2 relances, préparés pour les jours qui viennent. Tu gardes la main. »).
- **Préparation** (une décision par feuille) :
  1. *Le message* — nom auto, choix du modèle, brouillon IA si connectée ;
     relances J+7/J+14 montrées avec textes modifiables mais dates et nombre
     figés (D3) ; mention d'opposition visible, « obligatoire — ne se retire
     pas » ;
  2. *Le contrôle* — récapitulatif : N pistes, rythme (15/jour max), « S'arrête
     seule si on te répond », dépliant « Voir les N emails remplis », pistes
     sans email écartées et montrées, hint « Rien ne part tout seul : chaque
     jour, tes envois prêts t'attendent dans Aujourd'hui. » ;
  3. code demandé (geste sensible) → « Campagne prête ✓. Rendez-vous demain
     dans Aujourd'hui. »
- **Vécu quotidien (D13 — validé)** : pas d'écran « campagnes ». Chaque jour,
  **une ligne groupée** dans la tranche « Aujourd'hui » (« ⚑ {nom} — 7 envois
  prêts · 1 réponse reçue »). Tap → feuille du jour : liste des destinataires,
  chaque ligne dépliable en aperçu du message exact, `[Envoyer]` par ligne +
  `[Tout envoyer (n)]` en pied. **Rien ne part automatiquement sans
  Compagnon**, même app ouverte. Les envois non faits glissent au lendemain.
- **Réponse** : sans Compagnon, marquée à la main (statut « réponse » sur la
  fiche) → la campagne s'arrête pour cette piste (« Campagne arrêtée — réponse
  reçue. ») ; avec Compagnon, détection automatique. Arrêt sur réponse non
  débrayable (D3).
- **Pause / arrêt** : dans la feuille du jour ; l'arrêt définitif =
  `confirmSheet` danger. Une campagne en pause n'écrit plus dans Aujourd'hui.
- **Sur la fiche** : tag discret `en campagne` + historique. **Board
  desktop** : même tag sur les cartes — pas de colonne nouvelle.
- **Terminée** : dernière ligne dans Aujourd'hui (« Campagne terminée :
  12 envoyés, 3 réponses. ») → bilan simple + « Voir les pistes sans
  réponse ».

## 7. Le Compagnon

- Jamais « localhost », « P2P », « daemon » à l'écran (D4). Le Compagnon =
  « ton ordinateur qui travaille pour toi ».
- **Découverte au moment utile** : sur l'écran de contrôle de campagne, sans
  Compagnon appairé : « Ton ordinateur peut envoyer même app fermée — *voir
  comment* » → feuille d'explication de 3 lignes. Sur mobile, c'est le seul
  point de découverte. Sur ordinateur, la même feuille donne le geste
  d'installation directement.
- **Appairage** : le Compagnon affiche un code court (alphabet sans
  ambiguïté) ; PWA : Mes appareils → « Ajouter le Compagnon » → saisie du
  code. Canal local ou P2P choisi automatiquement, invisible.
- **Présence** : une ligne dans Mes appareils — `{nom} · compagnon · prêt /
  éteint` — avec les mêmes gestes de gestion.
- **Ce qu'il change à l'écran, et rien d'autre** :
  1. contrôle de campagne : option `( ) Je valide chaque jour dans Aujourd'hui
     (•) Mon ordinateur envoie tout seul` — automatisation **par campagne** ;
     en mode auto, Aujourd'hui montre le fait accompli ; ordinateur éteint =
     « en attente de ton ordinateur », rattrapage à son réveil ;
  2. détection des réponses (lecture de boîte D8 : mot de passe d'application
     saisi dans le Compagnon, trousseau OS ; OAuth en avancé) — les relances
     s'annulent seules ;
  3. lignes « via ton ordinateur » dans Connexions (Ollama, abonnement).

## 8. Analyser mes e-mails (import contrôlé)

- **Foyer : Échanger → Recevoir**, quatrième source à côté de Fichier /
  Coller / QR. Si les prérequis manquent, la source affiche son état au lieu
  de se cacher : « Il faut ton ordinateur pour ça — *voir comment* ».
- Parcours : périmètre borné (« Chercher des pistes dans tes e-mails
  depuis… » chips `7 jours / 30 jours / la dernière analyse` + rappel « L'IA
  lit chez toi, propose ici. Rien ne s'enregistre sans ton accord. ») →
  travail en cours visible et annulable → **aperçu avant fusion** habituel,
  enrichi d'une **multi-sélection** (motif `.pk`, tout coché par défaut — une
  proposition d'IA se trie) → fusion + `showUndo` ~30 s. Non-rattachables →
  « Contacts à rattacher ».
- Propositions en attente (analyse finie, app fermée entre-temps) : chip
  d'Aujourd'hui (même motif que les contacts à rattacher) — « 6 pistes
  proposées à trier ».
- L'IA ne produit qu'un `share` normalisé (`parseInput`, vocabulaires fermés,
  liens neutralisés) — jamais une action.

## 9. Mobile / ordinateur — différences réelles

| Contexte | Mobile (< 901 px) | Ordinateur (≥ 901 px) |
|---|---|---|
| Verrou | Plein écran, pavé au pouce, biométrie d'office | Même écran centré, saisie clavier, Entrée valide |
| Mes appareils | Bottom sheet, tap ligne → feuille d'appareil | Fenêtre centrée, tableau, actions au survol |
| Campagne — contrôle | Feuilles empilées, une décision par écran | Fenêtre : contrôle + liste des emails côte à côte |
| Campagne — le jour | Ligne groupée dans Aujourd'hui, envois au tap | Idem + tag `en campagne` sur les cartes du board |
| Écrire | Pied 2 boutons max + linklike | Idem + Ctrl/Cmd+Entrée = Envoyer |
| Compagnon | Découverte via la feuille campagne seulement | Explication donne le geste d'installation |
| Analyse e-mails | Chip Aujourd'hui + Recevoir | Aperçu multi-sélection en table large |

Breakpoint unique 901 px ; comportements divergents via `matchMedia`.

## 10. États clés et formulations principales

États : voir la matrice de `SPECIFICATIONS.md` §13 (obligatoire). Microcopie
de référence (ton `CLAUDE.md` — court, concret, tutoiement) :

- Verrou : « Protéger tes données » · « Ce n'est pas ça. » · « Écris-la sur
  papier. C'est la seule issue si tu oublies ton code. »
- Appareils : « Seul ton appareil principal peut faire ça. » · « Il connaît
  encore la phrase — change-la pour l'écarter vraiment. »
- Connexions : « OpenContact ne lira jamais ta boîte. » · « Tes accès restent
  chiffrés sur tes appareils. »
- Envoi : « Depuis {adresse} » · « Pas parti — réessaie, ou ouvre dans Mail. »
- Campagne : « Rien ne part tout seul : tes envois prêts t'attendent dans
  Aujourd'hui. » · « S'arrête seule si on te répond. »
- IA : « L'IA propose, tu décides. » · « Rien ne s'enregistre sans ton
  accord. »

## 11. Arbitrages rendus (rappel)

| # | Décision validée |
|---|---|
| D13 | Envois de campagne sans Compagnon : ligne groupée quotidienne dans Aujourd'hui, déclenchement par l'utilisateur (par ligne ou « Tout envoyer ») — aucun envoi automatique app ouverte |
| D14 | « Verrouillage » et « Connexions » visibles dans Moi pour tous dès la V1 (deux lignes sobres, découverte du produit) |
| D15 | Sauvegarde chiffrée **bloquante** à la création du verrou |
| D16 | Nom visible : « Verrouillage » (geste « Protéger ») |

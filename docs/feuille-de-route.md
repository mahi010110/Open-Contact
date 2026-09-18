# Feuille de route

**Ce document dit quoi faire et dans quel ordre.** Il ne dit jamais comment
concevoir — ça, c'est `CLAUDE.md`. Et il ne redit pas l'état des surfaces —
ça, c'est [`surfaces.md`](surfaces.md).

*Dernière mise à jour : 18 septembre 2026.*

---

## Là où on en est

La surface web est **fonctionnellement complète** et n'attend plus de
fonctionnalité pour être montrée. 132 auto-tests verts, et 26 scénarios de
bout en bout joués dans un vrai navigateur, en deux tailles d'écran et deux
thèmes.

La suite en compte 38 : les 12 autres sont **sautés, pas verts** — ils
appartiennent aux capacités masquées (`ui/perimetre.js`), à la surface
ordinateur, dont le binaire n'est pas construit ici, et depuis septembre
au laboratoire à deux réseaux, qui demande root et `iproute2`
(`OC_LABO_RESEAUX=1`). Compter un scénario sauté comme réussi est
exactement ce que `developpement.md` interdit ; ce chiffre-là est celui
qu'on relit pour décider qu'on est prêt.

Ce qui reste avant de la mettre entre les mains d'étudiants tient en peu de
choses, et aucune ne dépend de quelqu'un d'extérieur.

---

## 1. Avant la première bêta

- [x] **Licence et propriété** — le dépôt dit à qui appartient le produit,
      et les composants tiers sont attribués. *(août 2026)*
- [x] **Documentation publique** — un dépôt lisible par quelqu'un qui
      découvre le projet. *(août 2026)*
- [ ] **Site de présentation** — une page qui explique le produit à
      quelqu'un qui n'ouvrira pas l'app tout de suite. Une première
      version a existé dans un dépôt à part ; elle est reprise depuis le
      début, sur une base neuve. Deux choses à décider en la refaisant :
      **le nom du dépôt fait l'adresse** — c'est ce lien qu'un étudiant
      colle dans une conversation, donc il doit se dicter à voix haute —
      et **l'outillage du site dépend de celui-ci** (ses scripts
      importaient `tests/e2e/outils.mjs`), ce qui est une dépendance à
      assumer ou à couper franchement.

- [ ] **Deux relais épinglés sont muets** — et **la sonde qui le dit sait
      maintenant se taire quand elle n'a rien mesuré**. Elle ne le savait pas :
      sans réseau sortant, les neuf échouaient de la même façon et le rapport
      rendait « ÉPINGLÉS MUETS — à remplacer dans RELAIS_DEFAUT » suivi des
      NEUF. Qui suit ce conseil remplace neuf relais en bonne santé. Mesuré le
      4 septembre 2026 depuis un bac à sable dont le mandataire rend 403 sur
      les WebSockets : TCP **et** TLS ouvraient jusqu'à `relay.damus.io` — zéro
      relais en cause, neuf accusés. Deux contrôles l'ont réparée, sans une
      dépendance de plus : un **relais local** sondé par la même fonction (« ma
      sonde sait-elle encore reconnaître un relais sain ? ») et une **connexion
      TCP nue** vers chaque relais qui échoue (« le chemin est-il coupé au
      socket, ou plus haut ? »). Elle sépare donc le *muet* — il ouvre la
      WebSocket puis se tait, c'est sa faute, il se nomme — du *coupé plus
      haut*, qu'elle refuse d'accuser. `e2e-sonde-relais.mjs` prouve les trois
      rangements en local, sans réseau. *(septembre 2026)*
      **LE RELEVÉ « 7 SUR 9 RÉPONDENT » EST PÉRIMÉ — il mesurait la
      mauvaise chose** *(18 septembre 2026)*. Il déclarait un relais sain
      sur un **EOSE**, c'est-à-dire sur « il a lu mon abonnement ». Or ce
      que le produit a besoin de savoir est tout autre : « mon annonce
      atteindra-t-elle l'autre ? » Un relais peut répondre EOSE toute la
      journée en **refusant** chaque événement qu'on lui confie (relais
      payant, liste blanche d'auteurs, types d'événements restreints —
      la norme sur Nostr public aujourd'hui) ou en les **jetant** sans
      rien dire. Les deux passaient pour sains.
      C'est la panne rapportée à l'usage, et elle explique ce qu'aucune
      autre hypothèse n'expliquait : les **trois** canaux P2P bloqués
      ensemble sur « En attente », sur des réseaux qui marchent, avec un
      code scanné donc sans faute de frappe possible.
      La sonde mesure désormais le vrai : **deux connexions** sur le même
      relais, l'une s'abonne, l'autre publie, et l'événement doit
      traverser — avec le **type dérivé du nom de la salle**, comme la
      bibliothèque (`20000 + hash mod 10000`), parce qu'un type fixe
      passait à côté des relais qui filtrent par type. Elle distingue
      `relaie` / `refus` (avec sa raison) / `sourd` / `muet` / `coupé`.
      **Il n'y a donc plus aucun relevé valable sur les neuf, et il ne
      peut pas s'en faire d'ici** : le bac à sable rend 403 sur toute
      WebSocket sortante. À rejouer depuis un réseau ouvert :
      `OC_SONDE_RELAIS=1 node tests/e2e/sonde-relais-publics.mjs`.
      C'est ce relevé, et lui seul, qui dira quelles adresses garder.

- [x] **L'anneau de focus, mesuré** — il ne l'avait jamais été : le jeton
      portait le commentaire « pointillé 98, lisible partout », c'est-à-dire
      une intention. Relevé en photographiant les 150 contrôles de l'app non
      focalisés puis focalisés, **49 étaient sous le plancher de WCAG 2.2
      SC 2.4.11**, dont les trois listes principales du produit — la ligne du
      fil ne rendait *rien* au doigt, la ligne d'une piste un quart, la rangée
      d'« Aujourd'hui » un huitième. Cause : `outline-offset` pose l'anneau
      dehors, et c'est exactement là que le `overflow:hidden` du motif de
      suppression au geste le coupe. La rangée porte donc l'anneau à la place
      du contrôle qui la remplit, le trait passe à 2 px, et le fil — seul cas
      sans dehors — le pose dedans, sur la boîte qui peint. `e2e-focus.mjs`
      garde les trois critères (aire, contraste, forme) sur 4 écrans × 2
      ergonomies × 2 thèmes, avec trois sondes. *(septembre 2026)*
      Le détail du raisonnement est descendu dans `CLAUDE.md` §4 ; ce qu'il
      faut en retenir ici tient en une ligne : **un commentaire qui affirme
      une qualité sans l'avoir mesurée est une dette, pas une garantie.**

- [x] **La liaison P2P dit enfin POURQUOI elle échoue** — signalé à l'usage,
      captures de deux téléphones à l'appui : l'un « En attente de ton groupe »,
      l'autre « Quelqu'un est là, mais rien ne passe ». Le second innocente les
      relais (pour qu'un pair s'annonce, la salle et le relais ont fonctionné),
      et ce n'était donc pas la piste des relais muets qu'on suivait depuis
      deux jours. La cause réelle : `onJoinError` était câblé `() => fail()`
      aux quatre appels, et Trystero y fait passer **trois** pannes — code de
      salle différent, aucun TURN configuré, TURN injoignable. L'app les
      confondait en une phrase, alors que la première se répare en dix
      secondes. `causeLiaison` les nomme, l'écran le dit, et le rapport
      « Signaler un problème » le porte. Gardé à deux niveaux dans
      `e2e-liaison.mjs` (le câblage ET les appelants), 5 mutations attrapées.
      *(septembre 2026)*
      **Ce qui reste hors de portée, et le restera** : sans TURN, deux
      appareils en données mobiles ne peuvent pas se joindre directement, et
      un TURN est un serveur — §10 et la question ② l'interdisent. Le repli
      (`.oc`, QR) est la réponse du produit, pas un pis-aller.

- [x] **Une majuscule séparait deux camarades, en silence** — et **deux
      vrais réseaux le disent maintenant**. Cherché du côté du transport,
      trouvé du côté du texte : la salle du partage en groupe est un hash
      du code, et le code partait **tel quel**. « SIO-Lille-2026 » d'un
      côté, « sio-lille-2026 » de l'autre, deux salles — et les deux
      écrans affichant « En attente de ton groupe » pour toujours, sans
      un mot. C'était le seul code de l'app que **deux personnes** tapent
      chacune de son côté, et le seul qui n'était pas mis en forme : le
      rendez-vous QR (`rdvNorm`) et la phrase de liaison passaient déjà
      en minuscules. La majuscule n'est même pas une faute d'attention —
      un clavier de téléphone la met tout seul en tête de champ.
      `promoNorm` la range, le champ montre la forme retenue, et les
      trois champs par lesquels passe une liaison coupent enfin
      `autocorrect` (ils avaient tous `autocapitalize`, aucun n'avait
      celui **qui substitue un mot** — sur Safari, le moteur de
      l'utilisateur type). *(septembre 2026)*

      **Ce que l'instrument a coûté, et ce qu'il rapporte.** Jusqu'ici les
      deux navigateurs vivaient sur la même machine et se reliaient par la
      boucle locale : « ça ne marche pas quand on n'est pas sur le même
      wifi » n'était ni reproductible ni réfutable.
      `e2e-reseaux-separes.mjs` monte donc deux réseaux réels (espaces de
      noms Linux, un NAT par côté, un STUN local) et joue le partage en
      groupe de l'un à l'autre. Trois mondes, trois verdicts figés : deux
      box **passent** (3 s), une box et un mobile **passent**, deux
      mobiles **ne passent pas** et l'écran nomme la panne et le repli.
      Deux leçons en sont sorties, toutes deux dans le sens qui accuse
      l'app à tort :
      · un `MASQUERADE` nu **n'est pas une box** — le paquet entrant
        arrive avant la sortie, s'inscrit dans le suivi de connexions
        pour le compte du routeur et vole le port, si bien que même un
        **WebRTC nu** échouait ;
      · d'où la règle que le scénario s'impose : **le témoin d'abord.**
        Un WebRTC nu traverse le laboratoire avant qu'OpenContact n'y
        touche, et son rouge accuse l'instrument, jamais l'application.
        C'est la faute de la sonde des relais, rejouée un étage plus bas
        — et elle a bien failli faire écrire « le P2P est cassé ».

      **Ce qui n'a pas pu être mesuré, et qui reste donc ouvert** : les
      relais publics (le bac à sable rend 403 sur toute WebSocket
      sortante — voir l'entrée des relais muets) et **Safari**, dont le
      navigateur ne se télécharge pas ici. L'utilisateur type est sur un
      iPhone : c'est toujours le moteur que personne ne mesure.

- [x] **Les trois canaux P2P bloqués ensemble : un relais qui PARLE
      n'est pas un relais qui RELAIE** *(septembre 2026)*. Signalé à
      l'usage, et le seul signalement dont aucune hypothèse de transport
      ne rendait compte : groupe, rendez-vous QR **et** sync bloqués
      ensemble sur « En attente », sur des réseaux mobiles qui
      fonctionnent, avec un code **scanné** — donc sans la faute de
      frappe corrigée juste au-dessus. Trois canaux qui tombent ensemble
      ne partagent qu'une chose : la découverte du pair par les relais.

      **La faute était la même que l'incident #14, un étage plus haut
      encore.** On y avait appris qu'un socket ouvert ne fait pas un
      relais joint ; on déduisait ensuite « vivant » de « il nous a
      envoyé un message » — et un EOSE est un message. Mesuré, trois
      relais côte à côte, **un seul appareil dans la salle** : le relais
      sain renvoie notre propre annonce (5 trames `EVENT` en 16 s), le
      relais **sourd** (il dit oui et ne transmet rien) et celui qui
      **refuse** (`OK … false`) n'en renvoient aucune — et l'app comptait
      les trois vivants, donc affichait « En attente de ton groupe » à
      l'infini. Elle accusait le camarade absent d'une panne qui était
      celle du transport.

      Ce qui est corrigé, et ce qui est délibérément laissé de côté :
      · le **refus** est lu (`classerTrame` : `OK … false`, `CLOSED`,
        `AUTH`, et un `NOTICE` seulement s'il porte un mot de refus
        connu — on ne devine pas). Un relais qui dit non n'est plus
        compté vivant, et l'écran nomme la panne **avec le geste
        inverse** de « pas de connexion » : le réseau va bien, c'est la
        liste qu'il faut changer. Dire « pas de connexion » à quelqu'un
        dont la connexion est parfaite l'envoie réparer ce qui marche.
      · le relais **sourd** n'est PAS accusé par l'app. Elle n'a qu'une
        connexion : elle ne peut pas prouver qu'un relais ne relaie pas,
        et un relais sain qui ne renverrait pas notre propre annonce
        serait innocent. Cette hypothèse n'est mesurée que sur le relais
        local, donc elle ne sort pas de l'app — se tromper de cause
        coûte plus cher que ne pas savoir (§8). C'est la **sonde**, qui
        ouvre deux connexions, qui tranche.
      · le compte `relaient` part dans le **diagnostic**, là où il sert
        à réparer : « 9 relais · 9 joints · 9 qui répondent · **0 qui
        relaient** » est le rapport qui nomme la panne des trois canaux
        d'un coup d'œil, et aucun des deux nombres d'avant ne pouvait la
        montrer.

- [ ] **Essais sur vrai matériel** — un vrai téléphone d'entrée de gamme, un
      vrai réseau d'établissement. Les scénarios automatiques passent à côté
      de tout ce qui relève du doigt, de la lenteur et du wifi filtré.
      **Les relais, eux, sont mesurés** — pas par un téléphone, par la
      forge : `sonde-relais-publics.mjs` ouvre une vraie WebSocket sur
      chacun des neuf de `RELAIS_DEFAUT`, envoie un REQ NIP-01 et attend
      l'EOSE, à chaque exécution. Elle ne sondait que cinq d'entre eux
      jusqu'au 1ᵉʳ septembre : elle laissait le bundle vendorisé faire sa
      propre sélection, si bien que les quatre relais ajoutés parce qu'ils
      sont les plus fréquentés n'avaient jamais été vérifiés. Elle lit
      maintenant la liste à sa source, et nomme les muets.
      Reste donc ce qu'aucune forge ne peut jouer : **le doigt, la lenteur
      et le wifi filtré d'un établissement**, sur un vrai téléphone
      d'entrée de gamme. La découverte de pair en WebRTC, elle, n'est plus
      de ce lot : `e2e-reseaux-separes.mjs` monte deux réseaux réels et
      deux NAT (`OC_LABO_RESEAUX=1`, root et `iproute2` exigés). Ce qu'il
      ne remplace pas : **Safari**, qui ne se télécharge pas dans cet
      environnement, et les relais publics, injoignables d'ici.
- [x] **Durabilité des données** — prouver qu'une installation neuve, puis
      une montée de version, ne perdent rien. C'est l'invariant qui coûte le
      plus cher s'il casse : sans serveur, ce qui disparaît ici a disparu
      pour de bon. `e2e-durabilite.mjs` écrit un suivi complet — les 20 clés
      persistantes **et les CV et lettres**, qui vivent dans une base à part
      (`oc_docs_v1`) — déploie une version neuve, attend que le service
      worker neuf prenne réellement la main, et vérifie que tout survit
      octet pour octet, puis que l'app le **relit** vraiment.
      *(août 2026)*
- [x] **`tests/e2e/README.md` décrit les 29 scénarios** — il en décrivait 15,
      alors que `developpement.md` promet « le détail de **chaque** scénario ».
      Manquaient les gardes les plus récentes, celles qu'on relit justement
      pour savoir ce qui est déjà couvert. Le tableau est désormais rangé par
      intention (le socle, protéger, faire circuler, les écrans, la surface
      ordinateur, les gardes transverses) et chaque ligne dit **pourquoi** un
      scénario peut être sauté. `tous.mjs` refuse maintenant de démarrer si un
      fichier n'y figure pas : la promesse ne peut plus se défaire seule.
      *(août 2026)*
- [x] **Pages confidentialité et aide** — `confidentialite.html` et
      `aide.html`, servies avec l'app et précachées : elles répondent hors
      ligne, parce que quelqu'un qui vérifie ce que l'app fait de ses données
      ne doit pas dépendre du réseau pour l'apprendre. La page de
      confidentialité dit ce qui est enregistré, ce qui sort et à quel geste,
      **ce que voient les relais** (ils ne peuvent pas lire, mais ils voient
      qu'une connexion a lieu), et le seul appel tiers que l'app fait pour
      l'utilisateur — Nominatim, quand il tape une adresse. Un paragraphe est
      écrit pour un établissement. *(août 2026)*
- [x] **Les pages de lecture, mesurées** — elles étaient livrées, visibles et
      liées depuis les réglages, mais **aucun garde ne les regardait** : les
      surfaces d'`e2e-ux-audit.mjs` sont des routes, et une page qui n'est pas
      l'app n'en est pas une. `e2e-pages-lecture.mjs` les balaie désormais
      comme des écrans — 320 à 1280 px, 100 / 125 / 200 % de texte, les deux
      thèmes — et trois sondes prouvent que la mesure sait rougir. La même
      passe a corrigé ce que personne ne voyait : une règle de survol nue dans
      `doc.css` (le garde du survol lisait quatre feuilles de style sur huit,
      liste écrite à la main — elle a fini par mentir, comme les autres), une
      cible de 31 px, un pied posé dans `<main>` qui n'était donc pas un
      repère `contentinfo`, et cinq inexactitudes de texte — dont un chemin de
      réglages qui n'existe pas et un canal nommé « En direct » là où l'app dit
      « Partage en groupe » (§7). Les deux pages se nomment maintenant l'une
      l'autre **dans la barre de titre** : la ligne des réglages en ouvre une
      seule, et l'autre était à 2 900 px de défilement. *(septembre 2026)*

**Le chemin de retour existe déjà.** Réglages → « Signaler un problème »
produit un rapport de cinq lignes (navigateur, système, écran, poids des
données…) et le copie. Aucun envoi automatique : ce serait de la télémétrie,
et c'est interdit. L'étudiant colle où il veut. Le rapport ne contient aucune
donnée personnelle, et il s'affiche en entier avant d'être copié — la
promesse se vérifie en lisant, pas en croyant.

---

## 2. La bêta

Conditions d'entrée : rien de critique ouvert, durabilité prouvée, essais
matériels faits, site en ligne.

Démarrer par **un petit groupe d'étudiants**, puis ouvrir. Le produit vit ou
meurt sur un point : est-ce qu'ils l'utilisent encore un mois après. Tout le
reste en découle.

---

## 3. Après les premiers retours

Dans cet ordre, et seulement si les retours le justifient :

1. **Corriger ce que la bêta remonte.** Rien d'autre ne passe avant.
2. **Rouvrir le chantier de l'application ordinateur** — le sort du code
   n'est plus en question : il devient la fondation des applications
   installées (§4). Ce qui reste à trancher après la bêta, c'est le
   périmètre exact de la première version, et le sort des capacités
   reportées par choix (brouillon IA, envoi direct).

3. **Ramener le brouillon par IA** avec ta propre clé, si les retours
   montrent que la rédaction est bien le point de blocage.
4. **Import de données publiques** pour amorcer une liste de pistes sans
   partir de zéro.

---

## 4. Les surfaces suivantes

**La direction est arrêtée** *(17 août 2026)* : OpenContact sera **trois
applications** — web, ordinateur, téléphone — construites sur la même base.
Le concept du « Ordinateur », application d'appoint à côté du produit, est
abandonné ; son code n'est pas perdu, il devient la fondation des
applications installées. La coquille native exécute le même moteur que le
web, et elle sait produire l’ordinateur **et** le téléphone.

La file ne change pas : le web d'abord, ses retours ensuite, puis
**l’ordinateur** (le code en est le plus proche — corriger d'abord ses
défauts connus, listés dans [`surfaces.md`](surfaces.md)), puis **le
téléphone** sur la même base. En attendant, l'app web installée depuis le
navigateur reste le chemin du téléphone.

---

## Ce qui n'est pas au programme

Pas par manque de temps — par choix, et le choix ne se rediscute pas sans
raison nouvelle :

- **Aucun serveur, aucun compte, aucune analytique, aucun traçage.**
- **Aucune publicité**, aucune revente ou exploitation des données.
- **Le suivi privé ne sort jamais** dans un partage avec le groupe.
- **Aucune donnée écrasée** sans aperçu préalable et sans possibilité
  d'annuler.
- **Aucun suivi d'ouverture des e-mails.** Un pixel de suivi est exactement
  la surveillance que le projet refuse partout ailleurs. « Pas de réponse
  depuis N jours » rend le même service sans espionner personne.

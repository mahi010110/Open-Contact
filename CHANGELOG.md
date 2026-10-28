# Journal des modifications

Ce qui change pour toi, version par version, en mots simples. Le format
suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et les
numéros la [gestion sémantique de version](https://semver.org/lang/fr/) :
le dernier chiffre pour un correctif, celui du milieu pour une nouveauté,
le premier pour une rupture. La bascule du recadrage est la 7.0.0
(`docs/recadrage.md`).

Les versions d'avant la 6.76 se lisent dans l'historique du dépôt.

## [7.1.1] — 28 octobre 2026

L'audit de l'interface, joué comme un nouveau venu sur un téléphone.

### Corrigé

- Sur un iPhone, l'en-tête de « Mes pistes » tenait sur trois lignes :
  tes chiffres passent sous le titre, sur une ligne, et « Choisir »
  reste en haut à droite.
- Juste après ton premier mail, « Aujourd'hui » disait « Tout est à
  jour » au-dessus de « 1 piste à planifier » : il dit maintenant « Rien
  de prévu aujourd'hui » tant qu'une piste attend sa suite.
- Après un mail, la feuille de la suite ne propose plus deux fois le
  même jour (« Dans 7 jours » en bas, « +7 jours » au-dessus).
- Les barres de feuilles disent ce qu'est la fenêtre, en un mot : « Et
  ensuite ? », « Demande », « Contacts », « Destinataires » ; le nom de
  la piste ouvre le contenu, en entier.
- Une fiche qui n'a qu'un contact le montre ouvert : « Écrire » et
  « Appeler » ne se cachent plus derrière un triangle.

## [7.1.0] — 27 octobre 2026

Un seul « moi » : une phrase de douze mots, et un téléphone perdu ne
fait plus tout perdre.

### Ajouté

- **Ta phrase de secours ramène tout sur un autre téléphone.** Crée-la
  dans « Moi › Ma copie › Phrase de secours » : douze mots à écrire
  sur papier. Ensuite, ta copie se dépose toute seule sur les relais,
  chiffrée, à chaque fois qu'elle change — personne d'autre ne peut la
  lire.
- **Sur un téléphone neuf**, « J'ai déjà OpenContact » : tes douze
  mots, ce qui revient (tes pistes, ton profil, tes amis, tes groupes,
  le lien avec tes appareils), « Ramener », puis « Annuler » si ce
  n'était pas le bon moment. Rien ne s'écrase : ce qui est plus récent
  sur le téléphone reste.

### Modifié

- **Une seule phrase.** Celle qui protège tes données est la même :
  protéger, ou changer sa phrase dans « Verrouillage », la donne aussi
  pour ramener tes données. Si tu avais déjà protégé tes données, ta
  phrase d'avant marche : « Phrase de secours › Entrer ma phrase ».

### Corrigé

- « Voir les 1 autres » sous une liste : c'est « Voir l'autre ».
- Une piste venue d'un très vieux fichier ne dit plus « 20 753 j sans
  nouvelles ».
- « 0 / 1 pistes » dans « Donner » : « 0 / 1 piste ».
- Au poste, en parcourant « Mes pistes » au clavier, le curseur ne
  saute plus hors de la liste quand l'app finit de lire sa table des
  métiers.
- Texte agrandi sur un petit téléphone : dans Réglages, le nom d'une
  ligne ne passe plus sous son état ; « Affiner » n'a plus de puces
  coupées au bord ; « Rattacher » ne sort plus de l'écran ; le champ
  d'un groupe ou d'une conversation grandit avec le texte (et ne fait
  plus zoomer l'iPhone) ; ton nom dans « Moi » plie au lieu de passer
  sous « Modifier ».

## [7.0.0] — 27 octobre 2026

La bascule du recadrage : tout ce qui était en préversion est ouvert à
tout le monde. L'app que tu ouvres est celle que les testeurs voyaient.
Aucune donnée ne bouge, et tes anciens liens mènent toujours au bon
endroit.

### Modifié

- **« Échanger » s'appelle « Réseau ».** Tes demandes en tête, puis
  toutes tes conversations (groupes et amis), « Mes amis » et
  l'historique. Un lien vers `#/echanger` ouvre « Réseau ».
- **Le + ajoute tout** : une piste, quelqu'un rencontré, ou ce qu'on te
  tend (Recevoir : QR, fichier, texte).
- **Tes amis ont quitté « Mes pistes »** : ils sont dans « Réseau › Mes
  amis ». « Mes pistes » garde « À découvrir ».
- **Donner des pistes** se fait depuis « Mes pistes › Choisir », ou
  depuis la fiche d'une piste.
- **La fiche commence par les gens** : qui contacter, puis le suivi.
- **Plus aucun chiffre sur les onglets ni sur les conversations.** Une
  conversation pas lue s'écrit en gras avec un point ; « Aujourd'hui »
  dit qui t'a écrit.
- **Au poste**, la navigation passe dans une barre à gauche, la fiche
  s'ouvre à côté de la liste, et Ctrl K cherche et fait tout.

### Ajouté

- **Tes chiffres en tête de « Mes pistes »** : écrites, réponses,
  décrochées. Après une semaine sans venir, « Reprendre » te propose
  trois choses à faire.
- **« Écrire les N mails »** au pied d'« Aujourd'hui » : les relances
  et les premiers mails du jour, préparés et envoyés l'un après l'autre.
- **« Ma semaine »** : un objectif de gestes, et la revue du vendredi,
  que tu peux partager à ton groupe.
- **« Je peux aider »** dans Moi : ce que tu offres à tes amis. Une piste
  close « Décroché » te propose d'aider à ton tour.
- **Au poste, une lettre par geste fréquent** (N, /, E, P, F), écrite
  dans le bouton qu'elle commande. Elles se coupent dans Réglages.
- **Tous les métiers** dans la barre et dans « À découvrir », pas
  seulement l'informatique.
- **Exporter ton parcours** en un fichier, montré avant de partir.

### Corrigé

- Au poste, « Écrire à Karim » depuis « Mes amis » referme les feuilles
  et pose la conversation à droite de la boîte, au lieu de la cacher
  derrière elles.
- Au poste, une fiche ouverte depuis la recherche (Ctrl K) pendant
  qu'on est dans « Mes pistes » se pose à droite de la liste au lieu
  d'ouvrir une seconde fiche par-dessus. Hors de « Mes pistes », la
  fiche de droite se referme ; ce que tu y tapais sans l'enregistrer
  reste.
- Un profil « BTS SIO » cherche de nouveau les entreprises du numérique
  dans « À découvrir », et non tout le secteur de l'information.
- La table des métiers ne se lit plus à l'ouverture de « Mes pistes » :
  seulement quand tu tapes, ou au calme quelques secondes après.
- Les messages d'invitation (groupe, profil d'ami) disent où les
  coller : Ajouter → Recevoir → Texte.
- À texte agrandi, « Donner » ne se retrouve plus seul au bord droit
  de la fiche, et la flèche de « Ma semaine » reste au bout de sa ligne.
- L'anneau de focus se voit sur la croix d'une piste choisie et sur le
  lien « à planifier » d'« Aujourd'hui ».

### Retiré

- La ligne « Préversion » de Réglages : il n'y a plus rien en test.
- Le tri « Pour toi · Récents · A → Z » de l'ancienne liste d'amis.

L'envoi direct par Gmail ou Outlook n'arrivera pas : le lien mail reste
le chemin de tout le monde.

## [6.90.1] — 27 octobre 2026

Un correctif : les feuilles qu'on ouvre tous les jours répondent plus
vite, surtout quand l'app est bien remplie. Mesuré du tap à l'image sur
un téléphone moyen simulé, l'ancienne version et la nouvelle jouées tour
à tour.

### Corrigé

- **Un groupe s'ouvre deux fois plus vite** quand il est gros : 380 ms
  au lieu de 790 avec 640 messages. Une conversation de 300 messages :
  145 ms au lieu de 400. Une fiche : 160 ms au lieu de 240.
- La liste derrière une conversation qu'on ouvre se met à jour juste
  après, au lieu de retarder ton tap.
- « Modifier » et « Écrire » posent la hauteur de leurs champs d'un
  seul coup.

### Modifié

- **« Donner » et « Prospecter » s'ouvrent sur tes 60 premières
  pistes**, et « Voir les N autres » montre la suite, comme dans « Mes
  pistes ». Rien ne change sous 60 pistes. Ce qui n'est pas affiché
  reste coché dans « Donner », et la recherche porte sur toutes. Avec
  400 pistes, « Donner » s'ouvre en 240 ms au lieu de 530.

## [6.90.0] — 21 octobre 2026

Le recadrage, lot R10 : à grande échelle, et sans notifications. L'app a
été remplie jusqu'à ses plafonds — 400 pistes, 200 amis, 5 groupes et
1 480 messages, 120 conversations, 60 demandes reçues — et mesurée écran
par écran. Ce qui cassait est réparé pour tout le monde ; le calme est
en **préversion**, derrière son propre drapeau (`calme`).

### Corrigé

- **Un gros groupe ne fige plus le téléphone.** 640 messages le
  bloquaient quatorze secondes : un groupe ou une conversation s'ouvre
  maintenant sur ses derniers messages (ou là où tu t'étais arrêté), et
  « Voir les N messages d'avant » ouvre la suite sans rien déplacer sous
  tes yeux.
- **« Tes amis » ne prend plus tout l'écran.** Trois lignes, et « Voir
  les N autres » : d'abord les contacts qu'on t'a donnés, puis ce qu'on
  te demande.
- « Échanger » s'affiche plus vite, même avec des centaines de
  conversations.

### Ajouté, en préversion

- **Plus aucun chiffre sur les onglets ni sur les conversations.** Une
  conversation pas lue est en gras, avec un petit point.
- **« Aujourd'hui » te dit qui t'a écrit** : « Karim et Léa t'ont
  écrit ». Un tap ouvre ce qui n'est pas lu.
- **Rien ne surgit quand quelque chose arrive** : un ami qui t'ajoute,
  un contact trouvé, un groupe qui t'accepte se voient là où ils vivent.
  Le merci d'un ami reste deux jours dans « Tes amis ».
- **Plusieurs demandes tiennent une ligne chacune** dans « Réseau », avec
  leur suivi en trois cases ; la carte s'ouvre d'un tap.

## [6.89.0] — 21 octobre 2026

Le recadrage, lot R9, seconde moitié : tous les métiers. En
**préversion**, derrière son propre drapeau (`metiers`). Rien ne change
pour l'informatique : la barre la comprend comme avant.

### Ajouté, en préversion

- **La barre comprend tous les métiers.** « Aide-soignante alternance
  Lyon », « coiffeur », « agent immobilier » : le métier devient une
  étiquette, comme « cyber » l'était déjà. Dix mille appellations du
  ROME de France Travail, au masculin et au féminin, embarquées dans
  l'app : rien ne part sur le réseau pour les reconnaître.
- **« À découvrir » cherche dans le bon secteur.** Une aide-soignante
  voit des cliniques et des maisons de retraite, pas des entreprises de
  logiciel. Seul le secteur part vers l'annuaire, jamais un mot de ton
  profil.
- **« Offres d'alternance autour de … » part avec ton métier**, pour que
  La bonne alternance montre les offres qui te concernent.
- **Ta formation compte, quelle qu'elle soit.** « BTS MCO », « CAP
  AEPE », « BUT GEA » : la formation de ton profil devient une
  étiquette dans « À découvrir », avec les secteurs de ses métiers, lus
  dans le répertoire des certifications (RNCP).

### Corrigé

- Agrandir ou rétrécir la fenêtre pendant que l'app est verrouillée ne
  provoque plus d'erreur : rien ne se redessine tant que tes données ne
  sont pas ouvertes.

## [6.88.0] — 20 octobre 2026

Le recadrage, lot R9, première moitié : ton parcours, en un fichier. En
**préversion**, derrière son propre drapeau (`export`). Et deux
décisions prises par délégation du mainteneur : tous les métiers se
codent maintenant mais ne s'ouvrent qu'après un testeur d'une autre
formation (0005), et l'app reste sans serveur pendant la bêta (0006).

### Ajouté, en préversion

- **« Exporter », dans « Mon parcours ».** Ton profil et ton parcours
  partent en un fichier JSON Resume, le format ouvert de CV que des
  éditeurs de CV libres importent tels quels. La feuille montre chaque
  ligne du fichier avant qu'il parte. Au téléphone, il part par la
  feuille de partage ; à l'ordinateur, il se télécharge.

## [6.87.0] — 20 octobre 2026

Le recadrage, lot R8 : le clavier au poste. En **préversion**, derrière
son propre drapeau (`clavier`). Rien ne change au téléphone.

### Ajouté, en préversion

- **Ctrl K (⌘K sur Mac) : chercher et faire.** On tape « aztek » : la
  piste, « Écrire à Aztek », « Planifier Aztek ». On tape « karim » :
  « Écrire à Karim ». ↑ ↓ choisissent, Entrée fait. Le bouton
  « Chercher » de l'en-tête l'ouvre aussi.
- **Les lettres se voient**, écrites dans le bouton qu'elles commandent :
  N dans « Ajouter », E dans « Écrire », P dans « Planifier ». Sur une
  action du jour, F (fait) et E (écrire) apparaissent quand la ligne a
  le curseur.
- **« Touches d'une lettre »**, dans Réglages : allumées par défaut,
  éteintes d'un tap, pour qui dicte à la voix. Ctrl K reste.

## [6.86.0] — 20 octobre 2026

Le recadrage, lot R7 : ceux qui aident. En **préversion**, derrière son
propre drapeau (`aide`). Et deux décisions du mainteneur : l'envoi
direct depuis le web (R6) est reporté, le lien mail reste le chemin de
tout le monde.

### Ajouté, en préversion

- **« Je peux aider »**, dans Moi : trois cases — parler de mon
  entreprise, relire un CV, présenter quelqu'un. Ce qui est coché part
  dans ton profil chez tes amis, et seulement ces mots-là.
- **« Décroché » propose d'aider à ton tour** : l'entreprise entre dans
  ton parcours (tes amis liront « Karim y est en alternance »), et tu
  coches ce que tu peux offrir. Rien ne s'enregistre sans toi.
- **« Demander à Karim »** dit ce que Karim peut faire : à qui écrire,
  20 minutes pour parler de son entreprise, relire ton CV, te présenter.
  La phrase se pose dans votre conversation ; elle part quand tu
  l'envoies.
- **Le merci** : quand une piste qu'un ami a portée te répond, la fiche
  propose « Le dire à Karim », le message prêt. Il se tait dès que tu
  lui as écrit.

### Changé

- La ligne d'un ami dans « Amis » dit aussi ce qu'il peut offrir.
- Le toast de « Décroché » n'a plus d'emoji.

## [6.85.0] — 20 octobre 2026

Le recadrage, lot R4 : ma semaine. En **préversion**, derrière son
propre drapeau (`semaine`).

### Ajouté, en préversion

- **« Cette semaine : 2 sur 5 mails »**, en tête d'« Aujourd'hui ». Le
  compte se remplit seul, des mails partis depuis lundi. L'objectif, l'app
  le propose (la semaine d'avant plus un, trois au moins) ; la ligne
  ouvre « Ma semaine », où « − » et « + » le font varier. Rien ne rougit
  si tu restes en dessous, et la semaine d'après repart de zéro.
- **Le vendredi, la revue** : tes mails partis, tes réponses, tes pistes
  ajoutées, et « Partager au groupe ». Ce qui part ne porte que ces
  trois nombres — « Ma semaine : 5 mails, 1 réponse, 3 pistes. » —,
  jamais le nom d'une entreprise ni d'une personne.

## [6.84.0] — 20 octobre 2026

Le recadrage, lot R3 : prêts à partir. En **préversion**, derrière son
propre drapeau (`prets`) — R3 est complet.

### Ajouté, en préversion

- **« Écrire les 3 mails »** sur « Aujourd'hui », quand au moins deux
  mails peuvent partir : les relances dues, puis les premiers mails,
  cinq au plus, chacun vers sa personne. Au téléphone, le bouton tient
  le pied, au-dessus de la barre ; au poste, il suit le titre. Un
  entretien ou un appel prévus n'en font pas partie : ce ne sont pas
  des mails.
- **Le composeur garde ce que tu écris**, piste par piste, sur cet
  appareil : fermé puis rouvert, il reprend où tu t'étais arrêté.
  « Envoyée ✓ » l'efface, et il part tout seul au bout de 30 jours. Si
  la piste a changé de statut entre-temps, le modèle du jour revient,
  et « Reprendre mon brouillon » te rend ton texte. Un brouillon ne
  sort jamais de l'appareil : ni partage, ni copie, ni synchronisation.
- **Au poste, la série s'écrit dans une seule fenêtre** : à gauche la
  file (où tu en es, ce qui est parti ou passé ; un clic ou ↑ ↓ y
  mènent), au milieu le mail, à droite ce qui aide à l'écrire —
  « À savoir », tes notes, l'historique de la piste. « Pistes ›
  Choisir › Écrire » ouvre la même.

## [6.83.0] — 20 octobre 2026

Le recadrage, lot R2 : un suivi qui se remplit seul. En **préversion**,
derrière son propre drapeau (`suivi`) : la ligne « Préversion » de
Réglages allume R1 et R2 ensemble.

### Ajouté, en préversion

- **Tes chiffres en tête de « Mes pistes »**, à la place du compte :
  « 5 écrites · 2 réponses · 1 décrochée ». Ils se déduisent de tes
  pistes, sans rien à remplir. Tant qu'aucune piste n'est écrite, le
  compte de pistes reste ; pendant une recherche, « 3 sur 40 » aussi.
- **Le retour après une pause.** Sept jours sans un geste sur tes
  pistes, et « Aujourd'hui » s'ouvre sur « Reprendre » : trois choses,
  choisies pour toi — d'abord ce qui a une date dépassée, puis ce qui
  se tait, puis par où commencer. Ni le compte des jours manqués ni
  celui de ce qui a glissé ; le reste est replié dessous, « Tout le
  reste ». Le premier geste fait referme la tranche.

## [6.82.0] — 20 octobre 2026

Le recadrage, lot R1-d : au poste, la fiche à côté de la liste. Toujours
en **préversion** — R1 est complet.

### Ajouté, en préversion

- **« Liste · Tableau »** en tête de « Mes pistes », au poste. En
  « Liste », la fiche de la piste choisie se pose à droite : un clic ou
  ↑ ↓ en change, et E écrit à la piste choisie. « Tableau » garde les
  trois colonnes d'avant.
- Une fiche qui a un changement en cours demande avant de laisser la
  place, et ce que tu écris reste où il est quand la liste se met à jour.

## [6.81.0] — 20 octobre 2026

Le recadrage, lot R1-c : au poste. Toujours en **préversion**.

### Ajouté, en préversion

- **Au poste, une barre latérale** à la place des onglets du haut : le
  logo, « Ajouter », puis Aujourd'hui, Mes pistes, Réseau et Moi, chacun
  avec son icône. L'écran prend toute la hauteur à côté.

## [6.80.0] — 20 octobre 2026

Le recadrage, lot R1-b : la fiche. Toujours en **préversion**.

### Ajouté, en préversion

- **La fiche commence par les gens** : qui peut t'ouvrir la porte, puis
  tes contacts, puis où tu en es. Au poste, les gens prennent la colonne
  de gauche.
- **« Donner » depuis la fiche**, à côté de « Modifier » : la feuille
  ne montre que cette piste.
- **« Un contact » depuis le +** : quelqu'un que tu viens de
  rencontrer, son nom d'abord, son entreprise ensuite. Sans entreprise,
  il t'attend dans « Contacts à rattacher » ; une entreprise que tu
  suis déjà le reçoit dans sa fiche.

## [6.79.0] — 20 octobre 2026

Le recadrage, lot R1-a : l'onglet « Réseau ». Tout est en
**préversion** : rien ne change tant que tu ne l'allumes pas dans
Réglages.

### Ajouté, en préversion

- **« Réseau »** prend la place d'« Échanger » et répond à une seule
  question, *qui peut m'aider ?* Tes demandes en cours en tête, avec le
  contact qu'un ami t'a donné juste dessous, puis tes conversations, puis
  « Mes amis ».
- **« Mes amis »** quitte « Mes pistes » pour vivre avec ses
  conversations. Sa recherche trouve un ami par une entreprise (« Thales »),
  et « cyber Lille » propose de demander à tes amis.
- **Le + fait tout entrer** : « Une piste » sous le pouce, et ce qu'on
  te tend (QR, fichier, texte) sous « Recevoir ».
- **Donner part de tes pistes** : « Choisir », coche, puis « Donner » ;
  la feuille ne montre que ce que tu as coché.
- L'ancienne adresse `#/echanger` mène à « Réseau », et l'inverse quand
  la préversion est éteinte.

## [6.78.0] — 19 octobre 2026

Le premier lot du recadrage, R0 : les fondations. Rien ne change à
l'écran, sauf une ligne.

### Ajouté

- **« Préversion »**, dans Réglages : elle allume sur ton appareil les
  écrans encore en test. Elle n'existe que lorsqu'un écran est en test,
  et ne vaut que pour l'appareil où tu l'allumes.
- Les anciennes adresses de l'app mèneront toujours quelque part, même
  quand un écran déménage.

### Pour qui développe

- `engine/drapeaux.js` : les drapeaux de livraison, chacun avec sa date
  de retrait ; `?test` refuse un drapeau périmé.
- `engine/destinations.js` : le registre des écrans et des anciennes
  adresses.
- Les fiches de décision (`docs/decisions/`), le plan du recadrage
  (`docs/recadrage.md`), le protocole des tests avec de vraies personnes
  (`docs/mesure/protocole.md`) et son jeu de données
  (`tests/mesure/jeu-de-test.mjs`).
- Une clé nouvelle, propre à l'appareil : `oc_preversion_v1`
  (`CONTRAT.md`).

## [6.77.0] — 19 octobre 2026

### Modifié

- **Les boutons** ont un contenant, léger : un aplat de leur couleur, qui
  fonce et s'enfonce quand on le touche. On ne les confond plus avec des
  liens. Le bouton principal est posé sur un rebord.
- **« Aujourd'hui »** : une case « Fait » en tête de chaque action, et un
  seul geste au bout, avec son mot.
- **La fiche** : « Clôturer » est à côté de « Où j'en suis », la prochaine
  action se touche pour la changer, et les gestes d'un contact sont des
  tuiles.
- Les listes à cocher de « Prospecter » et « Donner » sont à plat.

### Corrigé

- La flèche de retour de Réglages est assez large pour le doigt.
- L'icône d'« Historique » ne flotte plus au milieu de sa ligne.

## [6.76.0] — 19 octobre 2026

### Ajouté

- **« Premiers pas »** sur « Aujourd'hui » : remplir ton profil, ajouter
  une piste, écrire ton premier mail. Chaque case se coche toute seule,
  et la liste disparaît après le premier mail.

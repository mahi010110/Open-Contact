# Le réseau — trouver quelqu'un chez une entreprise

*Version de travail, 30 septembre 2026. Rien n'est encore construit : ce
document dit ce qu'on construit, dans quel ordre, et comment on saura que
c'est juste. Il se lit avec `CLAUDE.md` (§2 invariant ①, §7 un objet un
mot, §8 le lien humain) et [`recherche.md`](recherche.md), la barre qui
mène aux pistes. Il devient une règle de `CLAUDE.md` au premier lot livré.*

---

## Le but, en une phrase

**Tu dis « je cherche quelqu'un chez Aztek », et l'app trouve toute seule
qui, parmi tes amis, tes groupes et leurs amis, peut t'y faire entrer.**
Ensuite, elle demande leur accord aux bonnes personnes, et à elles seules.

C'est l'idée du mainteneur (des profils, des amis, une recherche qui va
d'elle-même d'ami en ami) mêlée à celle de l'assistant (c'est la
**question** qui voyage, pas les carnets d'adresses).

## Pourquoi ça vaut la peine

- **Le rapport de 40 pour 1** (§8) : ~3 % d'entretiens pour une candidature
  à froid, ~40 % quand quelqu'un qui est dedans la porte.
- **Ceux qui aident ne sont pas les proches.** 56 % des gens trouvent leur
  emploi par un contact, et pour 84 % d'entre eux un contact vu de temps en
  temps ou rarement (Granovetter, 1974).
- **Le meilleur lien est l'ami d'un ami.** Sur 20 millions de personnes
  suivies cinq ans par LinkedIn, ce sont les liens « moyens », avec
  quelques amis en commun, qui mènent le plus à un emploi — et plus encore
  dans le numérique, le secteur de nos utilisateurs (Rajkumar et al., 2022).
- **Les chaînes meurent quand il faut les faire suivre à la main.** Dans
  l'expérience de Watts (60 000 personnes, 18 cibles), la plupart des
  chaînes se sont arrêtées parce que les gens ne transmettaient pas. D'où
  la transmission **automatique**.
- **On remercie toute la chaîne**, pas seulement le dernier : c'est ce qui
  a fait trouver dix ballons à travers les États-Unis en moins de neuf
  heures (MIT, 2009).

## Pourquoi trois cercles, et pas sept

- Sur Facebook, deux inconnus sont séparés de 4,7 liens en moyenne
  (Backstrom et al., 2012) : à sept, on touche toute l'app.
- Si chacun a 30 amis : 30 personnes au premier cercle, 900 au deuxième,
  27 000 au troisième. Au septième, le calcul dépasse la population de la
  Terre.
- L'influence d'une personne ne se sent plus au-delà de trois liens
  (Christakis et Fowler), et LinkedIn lui-même s'arrête au troisième degré.
- Une recommandation vaut par celui qui se porte garant. Au cinquième lien,
  plus personne ne connaît personne.

---

## Ce qu'il y a dans l'app

| | Ce que c'est | Aujourd'hui | Qui le voit |
|---|---|---|---|
| **Tes pistes** | les entreprises et leurs contacts, avec ton suivi | existe | toi seul (le suivi reste privé) |
| **Ton profil** | ton prénom, ta formation, ce que tu cherches, et **ton parcours** : ce que tu as fait avant ou maintenant (stages, alternances, emplois) | à moitié : « Mon profil » existe, sans parcours, et ne sort jamais | ceux à qui tu le donnes |
| **Tes amis** | les profils que d'autres t'ont donnés | n'existe pas | toi seul |
| **Tes groupes** | les groupes que tu as rejoints | le partage en groupe existe | les membres |

Le parcours se remplit **déjà à moitié tout seul** : chaque piste où tu as
déclaré « J'y suis passé » (stage, alternance) en fait partie. Une donnée
qui peut se déduire ne se saisit pas (§8, règle 2).

---

## Où l'app cherche

Chez **chaque personne des trois cercles**, à deux endroits :

1. **son parcours** — là où elle travaille ou a travaillé ;
2. **ses pistes et ses contacts** — dont « J'y connais quelqu'un », qui
   existe déjà.

Les trois cercles :

- **cercle 1** : tes amis, et les membres de tous tes groupes ;
- **cercle 2** : leurs amis ;
- **cercle 3** : les amis de ceux-là. Au-delà, rien.

Ce qui rend ça possible sans que rien ne fuie : **le parcours d'une personne
est lu par le téléphone de ses amis** (ils ont son profil), **ses pistes par
son propre téléphone** (elles n'en sortent jamais).

| | Le parcours est lu par | Les pistes sont lues par | Délai |
|---|---|---|---|
| Cercle 1 | **ton** téléphone | leur téléphone | parcours : **tout de suite, hors ligne** ; pistes : quelques heures |
| Cercle 2 | les téléphones du cercle 1 | leur téléphone | quelques heures |
| Cercle 3 | les téléphones du cercle 2 | leur téléphone | un à trois jours |

Les délais viennent d'une limite du web : un téléphone ne fait sa part que
quand l'app est ouverte. Les applications installées (§0) pourront répondre
en arrière-plan ; ce sera l'un de leurs premiers vrais apports.

---

## Ce qui se passe, pas à pas

*Exemple : Tom cherche quelqu'un chez Aztek. Tom et Léa sont amis, Léa et
Karim aussi, Karim et Sofia aussi.*

1. **La demande part d'une piste.** Tom ouvre sa piste Aztek (ou la trouve
   par la barre de recherche, y compris dans « À découvrir ») et demande
   « Quelqu'un chez Aztek ? ». Le résultat finira dans cette piste.
2. **Tout de suite, sur son téléphone** : ses pistes, les pistes reçues de
   ses groupes (« Léa y a fait son stage », qui existe déjà), le parcours
   de ses amis. S'il trouve, c'est fini.
3. **Sinon, la demande part toute seule** vers les téléphones du cercle 1.
   Chacun cherche dans ses pistes et dans le parcours de ses amis, sans
   rien montrer à son propriétaire, puis fait suivre au cercle suivant.
4. **Quand un téléphone trouve, il demande à son propriétaire, et à lui
   seul.** Deux cas :
   - **un parcours** : le téléphone de Karim sait que Sofia est en
     alternance chez Aztek. Il demande à Karim : « Tom, par Léa, cherche
     quelqu'un chez Aztek. Sofia y est en alternance. Tu veux les
     présenter ? » Karim dit oui, puis Sofia dit oui.
   - **une piste** : le téléphone de Léa a un contact chez Aztek. Il
     demande à Léa : « Tu veux aider ? ». Léa peut **donner** le contact
     (comme « Donner » aujourd'hui : le contact, jamais le suivi) ou le
     **présenter** si Léa le connaît vraiment, et le contact dit oui à
     son tour.
5. **Le contact arrive dans la piste Aztek de Tom**, marqué « par Karim »,
   par l'aperçu habituel puis Annuler ~30 s (invariant ②). « Écrire à
   Sofia » apparaît dans « Aujourd'hui » : le réseau nourrit la question de
   départ, « je fais quoi maintenant ? ».
6. **Toute la chaîne est remerciée** : Léa et Karim voient que Tom a trouvé
   grâce à leur aide.
7. **Si personne ne trouve**, la demande s'éteint au bout de 14 jours.
   L'app le dit et propose la voie directe (« À découvrir », l'adresse, le
   dirigeant).

Ce que Tom voit pendant ce temps :

```
Quelqu'un chez Aztek
  Tes pistes et tes amis ........ personne
  Les amis de tes amis .......... en attente
```

### Le classement, quand plusieurs réponses arrivent

1. **Quelqu'un qui y est, ou y a été** (un parcours) — il peut porter la
   candidature ;
2. **quelqu'un qui connaît vraiment un contact là-bas** (« J'y connais
   quelqu'un », une présentation) ;
3. **un contact noté dans une piste** — utile, mais c'est encore une
   candidature à froid.

À rang égal, le cercle le plus proche passe devant. La ligne dit la raison
(§6 : le tri a une raison, et elle se voit).

---

## Les règles qui ne bougent pas

1. **Un profil ne va que chez ceux à qui son propriétaire le donne.** Il ne
   se repartage jamais, ni à la main ni tout seul.
2. **Les pistes et les contacts ne quittent un téléphone que sur un oui de
   leur propriétaire**, et seulement le contact choisi. Le suivi (statuts,
   notes, historique) ne sort jamais (invariant ①).
3. **Ce qui voyage dans une demande** : le nom de l'entreprise (et son
   SIREN s'il est connu), le prénom de celui qui demande, le numéro du
   cercle, la date d'expiration. Rien d'autre.
4. **Chacun ne voit que des gens qu'il connaît déjà.** Karim lit « Tom, par
   Léa » parce que la demande lui vient du téléphone de Léa : son téléphone
   le sait sans que le prénom de Léa voyage plus loin. Sofia ne saura
   jamais que Léa existe.
5. **Deux oui, ceux qui donnent quelque chose** : la personne dont le
   téléphone a trouvé, et la personne présentée. Les maillons du milieu
   ne sont pas dérangés ; ils sont remerciés. Chaque oui de plus fait
   mourir des chaînes (Watts).
6. **Rien ne s'affiche chez ceux qui ne trouvent rien.** Honnêtement : la
   demande est bien arrivée sur leur téléphone, l'app ne la montre pas. Donc
   elle ne contient rien de plus que ce que tu dirais à ton groupe.
7. **Trois cercles au plus, 14 jours au plus, trois demandes ouvertes à la
   fois au plus.** Ce sont les limites qui empêchent une seule personne de
   solliciter toute l'app.
8. **Aucun serveur, aucun compte** (§10). L'identité de chacun est une clé
   née sur son téléphone, échangée avec le profil ; les demandes passent
   par les relais Nostr que l'app emploie déjà. Question ① : ça marche dans
   un navigateur, sans compte ni installation. Question ② : aucune démarche
   pour le mainteneur.

---

## Ce qui change dans `CLAUDE.md` (au premier lot, avec le mainteneur)

- **§2, invariant ①** : une chose de plus nomme quelqu'un en traversant —
  le profil, donné par son propriétaire lui-même. Et la règle 4 ci-dessus :
  un prénom ne va que chez des gens qui connaissent déjà la personne.
- **§8** : « l'app ne stocke aucun carnet de camarades » devient « la liste
  d'amis sert de **chemin**, jamais d'annuaire ». La leçon d'alors tient :
  un carnet seul ne contient que des gens qu'on peut déjà joindre. C'est
  justement pour ça que la question voyage.
- **§7, un objet un mot** : « amis » y est interdit comme synonyme de
  groupe. L'ami est un objet nouveau : une personne dont tu as le profil.
  Il lui faut son mot. Proposition : **ami** pour la personne,
  **groupe** reste le collectif.
- **Stockage** : des clés nouvelles. Jamais `oc_group_v1`, effacée au
  chargement (`CLES_A_EFFACER`) : on ne réemploie pas une clé.

---

## Les lots — la trajectoire

Chacun se livre dans main, se teste sur le téléphone, et **sert tout seul**
— aucun n'attend le suivant pour valoir quelque chose.

1. **Mon parcours.** Le profil apprend ce que tu as fait : entreprise,
   stage / alternance / emploi, dates. Il part rempli de tes « J'y suis
   passé ». Rien ne sort encore. *Sert seul* : ton profil est complet, et le
   composeur peut s'en servir. **Livré (6.47.0)** — voir « Ce que le lot 1
   a appris ».
2. **Les amis.** Donner et recevoir un profil — QR en face à face (le même
   geste que « Donner »), ou dans un groupe. La liste d'amis. La recherche
   **instantanée** dans leur parcours, hors ligne. *Sert seul* : « Karim y
   est en alternance » s'affiche sur ta piste Aztek et dans la barre.
   **Livré (6.54.0)** — voir « Ce que le lot 2 a appris ». « Dans un
   groupe » passe par le texte copié ; le code de groupe qu'on garde
   (décision 6) vient avec le lot 3.
3. **La demande, cercle 1.** La demande part vers tes amis et tes groupes ;
   leurs téléphones cherchent dans leurs pistes ; les deux oui ; le contact
   arrive dans ta piste (aperçu, Annuler) ; le merci. **Livré pour les amis
   (6.55.0)** — voir « Ce que le lot 3 a appris ». Les groupes (décision
   6) suivent : ils demandent un code qu'on garde, donc une clé de plus.
4. **Les cercles 2 et 3.** La transmission automatique, le numéro de
   cercle, les doublons (une demande arrivée par deux amis ne sonne qu'une
   fois), l'expiration, le merci à toute la chaîne.
5. **Plus tard, à décider : le fil du groupe.** Voir plus bas.

Place dans la feuille de route : après la barre de recherche, qui mène aux
pistes d'où partent les demandes.

---

## Ce que le lot 1 a appris

« Mon parcours » est un cadre de « Mon profil », entre « Nom et formation »
et « Ce que tu cherches » : une ligne par expérience (l'entreprise, puis
« Stage · 2025 »), et « Ajouter ». Trois décisions :

1. **Ce qui se déduit n'est pas recopié** (§8, règle 2). Une piste où tu
   as déclaré toi-même « J'y suis passé » — stage ou alternance, sans
   prénom — est DANS le parcours, lue à chaque fois depuis la piste. Une
   déclaration d'un camarade (avec son prénom) n'y entre jamais : c'est
   son parcours, pas le tien. Corriger une ligne déduite (lui donner des
   dates) la remplace par une ligne saisie liée à sa piste, jamais une
   seconde ligne. Elle ne se retire pas du parcours : c'est la piste qui
   la porte, et une ligne qui reviendrait seule serait un mensonge.
2. **Il sert dès aujourd'hui, et là où ça compte** : le mail de
   candidature gagne la ligne « Expérience : stage chez Sopra Steria
   (2025) » — les deux plus récentes. Une expérience en entreprise est ce
   qu'un recruteur cherche d'abord chez un étudiant, et elle n'était
   dans aucun mail. Sans parcours, la ligne s'efface en entier, comme
   « Rythme » hors alternance. L'aperçu du profil la montre pendant qu'on
   la règle.
3. **« En cours » ne s'explique pas, il se lit.** Une fin vide veut dire
   « en cours » : la période s'écrit à côté du champ pendant qu'on choisit
   les mois (« depuis 2025 »), sans une phrase de plus.

Rien ne sort : le parcours vit dans le profil, que seule la sync entre
TES appareils transporte. `e2e-parcours.mjs` le vérifie depuis l'état
réel de l'app.

**Les deux décisions qui retenaient le lot 2 sont prises** (7 octobre
2026, plus bas) : le mot est « ami », et un groupe est un code qu'on
garde. Le lot 2 peut commencer.

## Ce que le lot 2 a appris (6.54.0)

**Livré** : donner son profil, garder ceux qu'on reçoit, et lire sur ses
pistes où ses amis sont passés. Quatre décisions, chacune appuyée sur une
source :

1. **Le geste existe déjà ailleurs, on ne l'invente pas.** WhatsApp et
   LinkedIn rangent l'échange en personne sous deux mots, « Mon code » et
   « Scanner » ; c'est le pied de la feuille « Amis » (« Mon QR » ·
   « Scanner »). Et le scanner est celui de « Recevoir » : un seul, qui
   reconnaît seul un QR de pistes, un rendez-vous ou un profil.
2. **On voit ce qu'on donne avant de le donner.** NameDrop (Apple) laisse
   choisir ce qui part et demande un geste des deux côtés. Ici, rien à
   choisir — le profil donné ne porte que le nom et le parcours —, mais
   ce qu'il contient s'écrit sous le QR, mot pour mot. Le QR PORTE le
   profil (format OCA1) : il marche sans réseau, comme le QR de pistes.
   À distance, « Copier » donne le même profil en texte, à coller dans
   « Recevoir → Texte ».
3. **Ce qu'un ami rapporte se lit là où l'on travaille.** LinkedIn le
   montre sur l'offre (« ask for a referral » : les relations dans
   l'entreprise, un message pré-rempli ; une candidature recommandée y
   obtient quatre fois plus de réponses). Ici, sur la piste : le bandeau
   « Karim y est en alternance › » — le même que « Léa y a fait son
   stage », le même message tout prêt —, la barre (« Karim »), et
   « Par où commencer ». La liste d'amis, elle, ne sert qu'à donner,
   recevoir et retirer.
4. **Retirer ne prévient personne** — c'est la règle de LinkedIn, et la
   seule qui ne transforme pas un geste d'ordre en geste social. Nommé,
   rouge, en dernier, rattrapable 30 s.

Ce qui n'a PAS été fait, exprès : aucune clé de chiffrement n'est née dans
ce lot. L'identifiant donné (128 bits au hasard) suffit à reconnaître un
profil redonné à jour ; le lot 3 dira, mesure à l'appui, ce que la demande
doit porter de plus. Et un ami sans parcours ne rapporte rien aujourd'hui :
il servira de chemin au lot 3.

Côté droit : un carnet tenu par un particulier pour un usage personnel
relève de l'exemption domestique du RGPD (art. 2, considérant 18 — les
carnets d'adresses y sont cités). On n'en tire pas une licence : le profil
donné reste le plus petit possible, et il ne se redonne jamais.

Gardé par `e2e-amis.mjs` — la fuite d'abord, le parcours joué à trois —
et sept auto-tests (`?test`).

## Lot 3 — ce qu'il faut savoir avant de construire (7 octobre 2026)

**Le constat qui change tout** : tout ce que l'app fait passer par les
relais est aujourd'hui ÉPHÉMÈRE — la découverte, le portage, la sync de
mes appareils n'atteignent que qui écoute au même instant. Une demande
à un ami doit au contraire l'ATTENDRE : il ouvrira l'app dans une heure
ou demain. Il faut donc que les relais gardent une lettre chiffrée pour
quelqu'un qui n'est pas là. Personne ne l'a jamais mesuré ici.

Ce que disent les sources :

- **Les messages privés de Nostr** (NIP-17) passent par une enveloppe
  (NIP-59, kind 1059) chiffrée (NIP-44), postée par une clé jetable. La
  même norme conseille aux relais de ne la rendre qu'à son destinataire
  AUTHENTIFIÉ (NIP-42) : une lecture anonyme peut donc être refusée,
  et lire « comme le destinataire » demande une clé à lui.
- **La durée de garde n'est écrite nulle part** : chaque relais décide.
  Les messages privés sont souvent gardés un mois ou moins ; une
  demande vit 14 jours (règle 7).
- **La présentation se fait à double accord** (Fred Wilson, 2009 : *the
  double opt-in introduction*) : celui qui présente demande à chacun,
  séparément, avant de mettre en relation. C'est la règle 5 (« deux
  oui »), et c'est ce qui protège le temps de la personne présentée.

Ce qu'on mesure d'abord, en CI (`tests/e2e/sonde-boite-relais.mjs`) :
quels relais de l'app ACCEPTENT une lettre, la RENDENT à une autre
connexion qui ne connaît que son étiquette, et la GARDENT combien de
jours (chaque passage de la CI laisse un marqueur daté que les suivants
relisent). Quatre formes : l'enveloppe NIP-59, l'ancien message direct,
les données d'application (NIP-78), un kind ordinaire. Rien de lisible
n'est publié. La conception de la demande attend ce relevé.

**Premier relevé (CI, 7 octobre 2026)** : sur les sept relais de l'app,
**six gardent les quatre formes et les rendent** à une autre connexion,
anonyme, qui ne connaît que l'étiquette — l'enveloppe NIP-59 comprise,
qu'aucun n'a réservée à un destinataire authentifié. Le septième
(`relay.froth.zone`) était injoignable, comme dans la sonde du portage
le même jour. La boîte aux lettres est donc possible avec ce qu'on a :
pas un relais de plus, pas un compte. Reste la DURÉE : les marqueurs
datés se relisent aux passages planifiés (lundi et jeudi) et diront,
sur deux semaines, si une demande de 14 jours tient.

## Ce que le lot 3 a appris (6.55.0)

Inès n'a personne à qui écrire chez Aztek. Sur la fiche, à la place où
dirait « Karim y est en alternance » si quelqu'un pouvait la porter :
**« Demander à mes amis »**. La feuille montre la phrase EXACTE qui part
— « Inès cherche quelqu'un chez Aztek. » — et à qui. Un tap, et la fiche
dit « Demandé à 2 amis · aujourd'hui ». Chez Karim, qui connaît Julie
là-bas, « Tes amis » passe en tête d'« Aujourd'hui » ; il voit ce qu'il
donnerait AVANT de le donner, et « Donner » tient le pied. Chez Inès, le
contact arrive par un aperçu — « Ajouter à la piste », puis « Annuler »
—, et Karim est remercié sans un geste de plus. Chez Sofia, qui ne
connaît personne là-bas : rien.

**Le transport est une boîte aux lettres**, et c'est la seule pièce
neuve. Chacun a une clé (ECDH P-256) née au premier « Mon QR » ; la
partie publique part dans le QR. Une lettre est scellée pour UN
destinataire — une clé jetable par lettre, puis AES-GCM — et rangée sur
les relais sous une étiquette qui ne dit rien de lui à qui n'a pas sa
clé. Le relais voit une étiquette, une expiration et du bruit ; rien ne
relie deux lettres du même auteur. C'est le schéma de NIP-17/NIP-59 sans
leurs dépendances : WebCrypto suffit, et le relevé a montré que les
relais de l'app gardent un kind ordinaire aussi bien que l'enveloppe.
L'app relève sa boîte à l'ouverture, au retour sur l'app et toutes les
cinq minutes à l'écran — et seulement si elle a donné son QR : sans clé,
personne ne peut lui écrire, rien ne part.

Les choix, et ce qui les a fait :

- **Le bouton n'existe qu'au moment où il sert** (§6, « le minimum, au
  bon moment ») : une piste ouverte, personne à qui écrire dessus,
  personne qui la porte déjà, et au moins un ami à qui demander. Partie,
  la demande est un FAIT en gris, pas un bouton ; trois ouvertes, il
  s'efface.
- **Un seul contact n'est pas un choix** (§6) : chez Karim il se lit, et
  « Donner » tient le pied. Deux ou trois : le premier est choisi
  d'office, un tap en choisit un autre, le pied donne toujours.
- **La ligne « Tes amis » passe en tête**, avant le travail du jour :
  c'est la seule de l'écran où quelqu'un attend, et elle s'éteint en
  14 jours. Elle n'existe que si le téléphone a TROUVÉ (règle 6).
- **Un ami ajouté en 6.54 n'a pas de boîte.** Il n'est pas dans « à qui
  elle part », et sa fiche dit le geste : « Rescanne son QR pour lui
  demander quelqu'un. » Une fois.
- **Un merci par demande** : ajouté, annulé, rajouté, Karim n'est
  remercié qu'une fois.
- **La boîte ne se perd pas dans une sync** : le profil le plus récent
  gagne toujours en bloc, sauf ce qui dit où me joindre — un profil qui
  n'a pas encore de boîte prend celle de l'autre appareil. Sans ça, deux
  appareils dont un seul a donné son QR pouvaient en effacer la clé, et
  les lettres seraient tombées dans une boîte que personne ne relève.

Ce que le relais ne sait pas encore dire : **combien de jours** il garde.
Les marqueurs datés de la sonde se relisent le lundi et le jeudi ; si un
relais rend moins de 14 jours, la demande vivra moins longtemps que sa
promesse, sans rien casser d'autre.

Gardé par `e2e-demande.mjs` — joué à trois sur un relais local qui garde,
la fuite d'abord : le relais ne lit ni l'entreprise, ni un prénom, ni une
note ; la lettre ouverte avec la clé de son destinataire ne porte que ce
que la règle 3 permet ; le don, que de quoi joindre le contact. Et six
auto-tests (`?test`).

## Comment on saura que c'est juste

**Le moteur** (`tests.js`, `?test`) :

- « Aztek », « AZTEK SAS » et le même SIREN se reconnaissent ; les accents
  se plient (`fold`, déjà là) ;
- le classement rend sa raison avec son rang ;
- le numéro de cercle ne dépasse jamais 3, une demande expirée ne part plus ;
- une même demande reçue deux fois n'est traitée qu'une fois.

**Les scénarios** (e2e) :

- **la fuite d'abord**, comme `e2e-vecu.mjs` : depuis l'état réel de l'app,
  lire les octets qui sortent par le vrai bouton. La demande ne contient
  que ce que dit la règle 3 ; aucune piste, aucun contact, aucune note ne
  sort sans oui ; un profil reçu ne ressort jamais ;
- **le parcours se joue à quatre** — Tom → Léa → Karim → Sofia (§8, règle
  4) : aucun test à une personne ne montrera les vrais défauts ;
- au quatrième cercle, rien ; au quinzième jour, rien ;
- chaque garde se prouve par une mutation.

---

## Décisions du mainteneur (30 septembre 2026)

1. **Les deux idées ensemble** : l'app cherche partout où elle peut
   trouver — le parcours des amis **et** leurs pistes et contacts.
2. **Trois cercles** au maximum.
3. **Tous les amis et tous les groupes rejoints** forment le premier cercle.
4. **On fait la demande, l'app trouve, puis les demandes d'accord
   commencent.**

## Décisions du mainteneur (7 octobre 2026)

5. **Le mot est « ami »** : une personne dont tu as le profil. « Groupe »
   reste le collectif, « contact » la personne dans une entreprise (§7).
6. **Un groupe est un code qu'on garde.** On le rejoint une fois, par QR
   ou par code, et l'app s'en souvient : tes demandes passent par tous
   ses membres, sans avoir leurs profils un par un. C'est ce qui change
   la règle de §8 « l'app ne tient aucune liste » : elle garde le CODE du
   groupe, jamais la liste de ses membres.
7. **Les maillons du milieu sont remerciés, pas consultés.** La demande
   passe d'elle-même ; chacun peut couper le passage pour lui dans ses
   réglages (le droit de ne plus servir de chemin, sans quitter personne).

8. **La demande part de la fiche d'une piste** (lot 3). Elle vise
   toujours une entreprise. Pas depuis la barre sans entreprise : la plus
   indiscrète, la moins précise.
9. **Elle part vers tous ceux dont tu as le profil** — pas seulement ceux
   qui ont aussi le tien. Un ami t'a donné son QR, donc le moyen de lui
   écrire : c'est lui qui a ouvert la porte.
10. **Chez l'ami, un seul oui : « Donner le contact ».** Il voit ce qu'il
    donnerait avant de le donner ; la personne présentée, elle, est
    jointe par Inès comme n'importe quel contact.
11. **Les amis ajoutés en 6.54 redonnent leur QR une fois.** Leur ancien
    QR ne portait pas de boîte ; on ne leur écrit pas tant qu'ils ne
    l'ont pas redonné.

## Encore à trancher

- **Le fil du groupe** (ci-dessous).

## Gardé de côté : le fil du groupe

La seule partie de l'idée de l'assistant qui n'est pas dans ce concept :
**la question visible dans un fil du groupe**, comme un salon Discord, pour
que les gens répondent avec ce qu'aucune app ne sait — « mon cousin
travaille chez Aztek », « mon ancien maître de stage y est passé ». C'est un
écran entier de plus (§2 invariant ③ un écran un but, §8 un lot se
mesure en surface ajoutée) : il se décide après les lots 1 à 4, sur les
retours.

---

*Sources : M. Granovetter, *Getting a Job*, 1974 ; K. Rajkumar et al.,
« A causal test of the strength of weak ties », *Science* 377, 2022 ;
P. Dodds, R. Muhamad, D. Watts, « An experimental study of search in global
social networks », *Science* 301, 2003 ; G. Pickard et al.,
« Time-critical social mobilization », *Science* 334, 2011 ; L. Backstrom
et al., « Four degrees of separation », 2012 ; N. Christakis et J. Fowler,
*Connected*, 2009 ; S. Burks et al., « The Value of Hiring through Employee
Referrals », *QJE* 130, 2015 ; APEC, baromètre du sourcing des cadres,
2019.*

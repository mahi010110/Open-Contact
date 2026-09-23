/* ============================================================
   OpenContact — moteur · état honnête d'une liaison P2P
   Dire où en est réellement le transport à partir de faits bruts :
   sockets de relais (getRelaySockets), pair annoncé mais liaison en
   échec (onJoinError), pair connecté, échange reçu.
   ATTENTION à `onJoinError` : ce commentaire a longtemps dit « liaison
   DIRECTE en échec », et c'était une mélecture de la bibliothèque. Elle
   y fait passer trois pannes, dont un code de salle différent, qui n'a
   rien à voir avec le réseau — voir `causeLiaison` plus bas.
   « À jour » ne se déduit JAMAIS de la simple création de la
   salle — c'est la leçon de l'incident #14.
   Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */

/* ---------- LES RELAIS PAR DÉFAUT ----------
   Deux appareils ne se trouvent que s'ils écoutent le MÊME relais. Sans
   liste explicite, Trystero mélange ses 43 relais publics avec une
   graine tirée de l'`appId` et n'en garde que **cinq** — les mêmes cinq
   pour tous les utilisateurs d'OpenContact, à jamais, et jamais les 38
   autres. Le tirage nous avait donné cinq relais confidentiels
   (basspistol, libernet, hornetstorage, corb, sathoarder) pendant que
   les plus fréquentés de la liste — damus, nos.lol, mostr, purple —
   restaient inutilisés. Si ces cinq-là tombent, le partage en groupe et
   la sync meurent partout à la fois, sans que rien ne soit cassé chez
   nous : c'est exactement le symptôme rapporté.

   On épingle donc la liste, et trois règles la gouvernent :

   ① **Un relais n'entre et ne reste que MESURÉ.** Pas sur sa
     réputation, pas sur sa présence dans la liste d'origine : il faut
     qu'une sonde l'ait vu porter une découverte entre deux vrais pairs
     (`tests/e2e/sonde-decouverte-relais.mjs`). C'est la règle qui
     manquait — quatre des neuf épinglés répondaient parfaitement aux
     lectures et ne relayaient RIEN, ce qui laissait l'écran « En
     attente » à l'infini (voir `relayTally`).
   ② **On élargit, sans doublon d'opérateur.** Une liste explicite
     n'est PAS tronquée par Trystero (`relayConfig.urls` passe
     entière — vérifié dans le bundle, pas dans la documentation), donc
     la redondance est réelle. Mais deux adresses du même opérateur
     tombent ensemble : elles ne comptent que pour une. Et pas
     d'instance qui se déclare de test ou de pré-production.
   ③ **Le terrain commun entre versions se garde, mais seulement ce
     qui en est un.** Un appareil resté sur l'ancienne version n'écoute
     que les cinq du tirage par défaut ; trois d'entre eux
     (basspistol, libernet, hornetstorage) ne portent plus rien pour
     PERSONNE, donc les garder n'aurait relié aucun camarade — c'était
     de la redondance en peinture. `corb` et `sathoarder` restent, et
     ce sont eux qui font le pont.

   RELEVÉ DU 18 SEPTEMBRE 2026, deux passages à cinq heures d'écart,
   depuis la forge : 7 relais sur 9 répondaient en lecture, 4 puis 5
   seulement portaient la découverte, et les quatre muets étaient les
   MÊMES aux deux passages. Sur 38 candidats de la bibliothèque, 19
   portaient la découverte ; cinq sont retenus ci-dessous.
   Une réserve à garder : « muet depuis la forge » n'est pas « muet
   depuis le téléphone d'un étudiant » — des adresses partagées par
   beaucoup de monde se font limiter. C'est pourquoi l'app ne se fie
   plus à cette liste seule : elle écarte en direct, sur chaque
   appareil, tout relais qui refuse ses publications.

   La liste de l'utilisateur (`oc_relays_v1`) reste prioritaire : celui
   dont le réseau bloque tout garde la main. */
export const RELAIS_DEFAUT = [
  /* le pont entre versions : les seuls du tirage historique qui
     portent encore la découverte */
  'wss://nostr-relay.corb.net',
  'wss://nostr.sathoarder.com',
  /* déjà épinglés, mesurés porteurs */
  'wss://nos.lol',
  'wss://relay.mostr.pub',
  /* entrants du 18/09, mesurés porteurs */
  'wss://bucket.coracle.social',
  'wss://relay.froth.zone',
  'wss://nostr-01.yakihonne.com',
  'wss://nostr.data.haus'
  /* SORTIS LE 23/09, MESURÉS NUISIBLES entre deux vraies machines
     (tests/e2e/sonde-deux-machines.mjs) :
     · relay.damus.io — il porte la découverte, puis limite chaque
       client à quelques publications par minute (« rate-limited: you
       are noting too much ») et bannit. Le trafic NORMAL de l'app —
       une annonce toutes les 5,3 s, par salle et par relais — l'y
       mène en moins d'une minute. Or Trystero répond UNIQUEMENT par le
       relais qui a livré l'offre, et damus, rapide, gagne souvent la
       course : il a refusé une réponse, la liaison est tombée, l'écran
       a accusé « vos deux réseaux ». Sans lui, 4 paires sur 4 reliées
       du premier coup.
     · relay.mostro.network — socket ouverte, publications avalées sans
       un mot, à chacun des cinq relevés du 21 au 23/09. */
];

/* ---------- LE RELAIS DE SECOURS DU TUYAU DIRECT (TURN) ----------
   Les relais ci-dessus servent à SE TROUVER. Se PARLER est une autre
   affaire : deux appareils sur des réseaux différents — deux
   téléphones en données mobiles, chacun derrière le NAT de son
   opérateur — n'ont souvent aucun chemin direct. Ils se trouvent,
   échangent leur SDP, et la liaison échoue quand même. C'est la
   troisième panne de `causeLiaison` (`sansturn`), et l'app ne savait
   que la nommer.

   Un TURN est le relais standard de ce cas-là. Deux choses le rendent
   admissible ici, et elles doivent rester vraies :
   ① **Il ne peut rien lire.** Il relaie des paquets déjà chiffrés de
     bout en bout par WebRTC (DTLS) : il voit passer des octets
     opaques, jamais une piste ni un contact. Ce qu'il apprend, ce
     sont les adresses IP des deux pairs et le volume échangé — à
     dire honnêtement, et la raison pour laquelle il ne s'emploie
     QUE si le chemin direct a échoué.
   ② **Ce n'est pas un serveur d'OpenContact** (§10). C'est de
     l'infrastructure publique tierce, exactement le statut des
     relais Nostr que l'app compose déjà par défaut. Le mainteneur
     n'en tient aucun, ne déclare rien, ne renouvelle rien.

   La liste est VIDE tant qu'aucune adresse n'a été mesurée : un TURN
   n'entre ici qu'après avoir prouvé deux choses — qu'il alloue pour
   nous, et que deux pairs qui s'interdisent tout candidat local se
   joignent à travers lui (`tests/e2e/sonde-turn.mjs`). Allouer ne
   suffit pas : c'est la même leçon que « répondre n'est pas relayer »,
   un étage plus loin.
   Le TURN de l'utilisateur (`oc_turn_v1`) reste prioritaire.

   RELEVÉ DU 18 SEPTEMBRE 2026 : dix adresses publiques sans
   inscription éprouvées, **zéro** n'alloue. Les deux contrôles de la
   sonde étaient verts — en politique normale des candidats `srflx`
   sortent, donc le réseau d'ici fonctionne et personne n'est accusé à
   tort. Un TURN ouvert à tous se fait vider par le premier venu ; ceux
   qui survivent demandent un compte, ce que la question ② de §0
   interdit. La liste reste donc vide par MESURE, pas par oubli.

   CE QUE ÇA CHANGE, ET C'EST LÀ QUE ÇA SE JOUE : la garantie ne pouvait
   plus venir du tuyau. Elle vient du canal qui n'a besoin de rien — le
   QR hors ligne, qui porte les fiches DANS l'image. `ui/donner.js` et
   `ui/recevoir.js` y basculent tout seuls dès que la liaison est
   perdue : c'est la seule réponse qui tienne « sur n'importe quel
   réseau, n'importe quel appareil ». */
export const TURN_DEFAUT = [];

/* ---------- ON N'ATTEND PAS QUELQU'UN POUR TOUJOURS ----------
   Le pire défaut du rendez-vous n'était aucune des quatre pannes de
   relais : c'était l'ABSENCE DE SORTIE. Tant qu'un relais porte, l'état
   reste `wait` — honnêtement, il n'y a rien à signaler — et l'écran
   affiche « En attente » indéfiniment. Si les deux appareils n'ouvrent
   pas le même relais à temps, ils s'attendent sans jamais se croiser, et
   personne ne vient le leur dire. Mesuré sur la forge : le receveur
   n'avait qu'UN relais ouvert sur dix pendant que le donneur en avait
   neuf — ça a marché parce que cet unique relais était l'un des bons.
   Sur un téléphone en données mobiles, où ouvrir dix connexions est
   lent, ce coup de chance n'est pas garanti.

   Or l'app a une sortie qui marche TOUJOURS et ne la prenait jamais : le
   QR hors ligne porte les fiches dans l'image. Attendre plus longtemps
   ne coûte pas seulement du temps — ça coûte l'échange, parce que le
   camarade en face finit par ranger son téléphone.

   COMBIEN DE TEMPS ? La première version disait soixante secondes côté
   donneur, pour ne pas couper un échange normal — et c'était un
   raisonnement d'ingénieur, pas d'utilisateur. **Personne ne fixe un
   écran qui tourne pendant une minute** : on range son téléphone bien
   avant, et le basculement arrive après que l'échange a échoué. Un
   repli qui se déclenche trop tard n'existe pas.

   Le calcul se refait donc dans l'autre sens, et il est simple :
   BASCULER TÔT NE COÛTE RIEN. Le QR de données transfère exactement la
   même chose, se scanne avec le même scanner, et un receveur qui arrive
   APRÈS la bascule vise simplement l'écran qui est là — il reçoit tout.
   Ce qu'on perd est la vitesse du P2P ; ce qu'on gagne est que ça
   aboutisse. Entre les deux, pour deux personnes qui sont face à face,
   le choix ne se discute pas.

   MAIS IL Y A UN PLANCHER, ET IL EST MESURÉ. Descendu à vingt secondes,
   le donneur abandonnait AVANT que son camarade arrive : `e2e-liaison`
   tient trente secondes pour le temps qu'une vraie personne met à
   sortir son téléphone, ouvrir l'app et viser — et le scénario a rougi
   tout seul. Un receveur qui TAPE le code (pas de caméra) se retrouve
   alors devant une salle que plus personne n'habite.
   Quarante-cinq secondes : au-dessus du plancher humain, sous la minute
   qui paraît infinie.

   ET LE VRAI REMÈDE À L'IMPATIENCE N'EST PAS LE DÉLAI — c'est que la
   sortie soit LISIBLE dès la première seconde. Le bouton sous le QR dit
   désormais où il mène (« Passer au QR hors ligne ») au lieu de poser
   une question sur le réseau. Qui ne veut pas attendre n'attend pas ;
   le délai n'est plus qu'un filet pour qui ne tape rien.

   Le receveur va plus vite : il vient de scanner, l'autre est là avec
   son QR allumé. Si rien ne s'annonce, ce n'est déjà plus une question
   de patience. */
export const SANS_PAIR_DONNEUR_MS = 45000;
export const SANS_PAIR_RECEVEUR_MS = 15000;

/* compte les WebSockets de relais par état (readyState 0/1), et — c'est
   la moitié qui manquait — combien PORTENT réellement quelque chose.

   UN SOCKET OUVERT N'EST PAS UN RELAIS QUI MARCHE. C'est l'erreur de
   l'incident #14 refaite un étage plus bas : là on déduisait « à jour »
   de la simple création de la salle, ici on déduisait « relais joint »
   de `readyState === 1`. Un relais qui accepte la connexion puis ne
   relaie rien comptait donc comme joint, et l'écran affichait « En
   attente de ton autre appareil » indéfiniment — c'est-à-dire qu'il
   accusait le pair absent d'une panne qui n'était pas la sienne, et
   invitait à patienter devant quelque chose qui n'arriverait jamais.

   ET RÉPONDRE N'EST PAS RELAYER — c'est la même erreur, encore un
   étage plus bas, et elle a été mesurée. Pour que deux appareils se
   trouvent, la bibliothèque doit PUBLIER (un événement éphémère signé
   porte la présence puis le SDP) ; or un relais peut servir les
   lectures et refuser les écritures — NIP-42, allow-list, paiement,
   anti-spam, ce que les relais publics ont massivement ajouté. Il
   répond donc (son EOSE suffisait à le dire « vivant »), l'app rendait
   `wait`, et l'écran affichait « En attente de ton groupe » devant
   quelque chose qui n'arriverait jamais. Relevé du 18/09 sur les neuf
   relais épinglés : sept répondaient en lecture, QUATRE seulement
   portaient la découverte.
   ET LA MÊME FAUTE S'EST REFAITE UNE QUATRIÈME FOIS, la voici nommée.
   On comptait vivant tout relais ayant répondu QUOI QUE CE SOIT — son
   EOSE de lecture suffisait — en n'écartant que ceux qui refusent
   POLIMENT (`OK false`). Or un relais peut avaler une publication **en
   silence** : socket ouverte, lectures servies, et pas un mot sur ce
   qu'on lui a donné à relayer. Il n'est ni muet ni refusant au sens de
   la version précédente, donc il restait vivant — et l'écran rendait
   « En attente » indéfiniment, sur les trois surfaces à la fois.
   Signalé à l'usage par le mainteneur, deux appareils, trois
   fonctions, le même écran qui tourne.

   LA RÈGLE, ET SA LIMITE — APPRISE EN LA DÉPASSANT : la découverte
   dépend d'une publication ACCEPTÉE. La preuve en est `["OK", <id>, true]` — le relais dit
   lui-même qu'il a pris notre événement — ou un `EVENT` qu'il nous
   DÉLIVRE, ce qui prouve qu'il relaie. Tout le reste (EOSE, NOTICE,
   silence) ne dit rien de cette capacité-là. On ne mesure donc plus
   « a-t-il parlé » mais « a-t-il PORTÉ », et c'est enfin la capacité
   dont la fonctionnalité dépend (§8).

   `portent` absent, on ne conclut RIEN : `vivants` vaut `open`, et
   personne n'est accusé — un appelant qui ne sait pas ne doit pas
   faire dire à cette fonction ce qu'il ignore.
   `refus` reste compté à part, et `muets` le rejoint : ouverts, sans
   refus explicite, et qui n'ont jamais rien porté. Les deux servent le
   diagnostic — ils appellent des gestes différents, l'un se remplace,
   l'autre se re-mesure. */
export function relayTally(socks, repondu, refus, portent){
  const t = { total: 0, open: 0, pending: 0, vivants: 0, refus: 0, muets: 0 };
  for (const k in (socks || {})){
    const s = socks[k];
    if (!s) continue;
    t.total++;
    if (s.readyState === 1){
      t.open++;
      /* TROIS MESURES, ET CHACUNE A SA PLACE — les confondre a coûté
         deux régressions dans la même soirée :
         · `repondu` — a-t-il dit UN mot ? Un socket accepté par un
           serveur qui ne répond jamais rien est un trou noir, et ça,
           l'app le savait déjà : c'est une preuve, pas une supposition ;
         · `refus` — a-t-il répondu « OK false » à NOTRE publication ?
           Preuve directe, sans ambiguïté ;
         · `portent` — a-t-il prouvé qu'il relaie ? Cette dernière
           RENSEIGNE le diagnostic et ne condamne personne : son absence
           n'est pas une preuve, c'est un délai qui n'est pas écoulé. */
      const parle = !repondu || repondu.has(k);
      const porte = !!(portent && portent.has(k));
      const refuse = !!(refus && refus.has(k)) && !porte;
      if (refuse) t.refus++;
      /* ON NE CONDAMNE QUE SUR UNE PREUVE, JAMAIS SUR UN SILENCE.
         Une version de cette fonction exigeait la preuve INVERSE — un
         relais ne vivait qu'après avoir montré qu'il portait. C'était
         trop sévère, et ça s'est vu tout de suite sur un vrai téléphone :
         en données mobiles, dix WebSockets s'ouvrent lentement et les
         accusés arrivent en ordre dispersé. L'app criait « Pas de
         connexion » PENDANT que la liaison s'établissait, et le partage
         en groupe — qui marchait — s'est mis à paraître cassé.
         Un faux positif de panne coûte plus cher que l'attente qu'il
         prétend abréger : il fait RENONCER. La sortie de l'attente vaine
         n'a d'ailleurs jamais eu besoin de ce jugement — c'est un délai
         qui la donne (`SANS_PAIR_*`), et un délai ne se trompe sur
         personne. */
      if (parle && !refuse) t.vivants++;
      /* `muets` ne juge rien : il RENSEIGNE. Il parle, il ne refuse pas,
         et il n'a encore rien porté — c'est ce que le rapport doit
         pouvoir dire à qui cherche pourquoi rien ne passe. */
      if (parle && !refuse && portent && !porte) t.muets++;
    } else if (s.readyState === 0) t.pending++;
  }
  return t;
}

/* l'étape d'une liaison :
   · on         — pair connecté ET un échange a réellement été reçu
   · link       — pair connecté, premier échange pas encore arrivé
   · norelay    — aucun relais joignable passé le délai de grâce
   · rtcfail    — un pair s'est annoncé et la liaison a échoué ; la
                  CAUSE (`causeLiaison`) dit laquelle des trois, et
                  elles n'appellent pas le même geste
   · wait       — relais joints ET vivants, personne en face pour l'instant
   · connecting — tout le reste (démarrage, relais en cours) */
export function liaisonStage({ relays, peers, exchanged, rtcFail, graceOver }){
  if (peers > 0) return exchanged ? 'on' : 'link';
  const r = relays || { total: 0, open: 0 };
  if (r.total && !r.open) return graceOver ? 'norelay' : 'connecting';
  if (rtcFail) return 'rtcfail';
  if (!r.total || !r.open) return 'connecting';
  /* DES SOCKETS OUVERTS, MAIS PAS UN RELAIS QUI RÉPONDE. Ce n'est pas
     « personne en face » : c'est le transport qui est muet, et attendre
     n'y changera rien. On rend `norelay`, donc le même message et le
     même remède que « pas de connexion » — deux états qui appellent le
     MÊME geste se disent pareil (c'est la décision déjà écrite dans
     `ui/direct.js`), et ce qui les sépare vit dans le diagnostic, là où
     ça sert à réparer. */
  const vivants = r.vivants === undefined ? r.open : r.vivants;
  if (!vivants) return graceOver ? 'norelay' : 'connecting';
  return 'wait';
}

/* ---------- POURQUOI LA LIAISON DIRECTE A ÉCHOUÉ ----------
   Trystero rend TROIS pannes par le même rappel `onJoinError`, et
   l'app les jetait toutes les trois : `onJoinError: () => watch.fail()`
   ignorait son argument. Elles appellent pourtant des gestes OPPOSÉS,
   et deux d'entre elles se réparent en dix secondes :

   · « incorrect room password when decrypting offer / answer »
     → ce n'est pas le même code des deux côtés. Rien à voir avec le
       réseau : on retape le code. (Le cas est rare quand la salle est
       nommée par un hash du code, comme ici — mais une salle rejointe
       par une version de l'app qui dérivait autrement le produirait.)
   · « … configure TURN servers with turnConfig … »
     → les deux appareils se sont bien trouvés et ont échangé leur SDP,
       mais aucun chemin direct n'existe entre leurs réseaux, et AUCUN
       TURN n'est configuré. C'est le cas de deux téléphones en données
       mobiles, chacun derrière le NAT de son opérateur.
   · « … check that your TURN server URLs and credentials are reachable … »
     → un TURN est configuré et c'est LUI qui ne répond pas.

   La bibliothèque distingue les deux derniers en regardant si un TURN
   est déclaré (`turnConfig` ou `rtcConfig.iceServers`) : le texte n'est
   donc pas décoratif, il porte un fait qu'on ne peut pas retrouver
   autrement depuis l'application.

   On lit le TEXTE parce que c'est tout ce que la bibliothèque donne —
   il n'y a pas de code d'erreur. Un texte qui changerait à la prochaine
   version rendrait `inconnu`, jamais une cause fausse : on ne devine
   pas, on se tait. */
export function causeLiaison(err){
  const t = String((err && err.error) || err || '').toLowerCase();
  if (!t) return 'inconnu';
  if (t.includes('incorrect room password')) return 'motdepasse';
  if (t.includes('urls and credentials')) return 'turnmuet';
  if (t.includes('configure turn servers')) return 'sansturn';
  return 'inconnu';
}

/* serveurs TURN personnalisés — une ligne par serveur :
   « turns:hote:443 utilisateur motdepasse ». Les identifiants sont
   OBLIGATOIRES : RTCPeerConnection refuse une URL turn(s): sans
   username/credential (InvalidAccessError) — mieux vaut le dire à la
   saisie qu'échouer en silence à la connexion.
   Erreurs nommées comme parseRelays : 'quatre' (trop), 'adresse'. */
export const TURN_MAX = 4;
export function parseTurn(raw){
  const lines = String(raw || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
  if (lines.length > TURN_MAX) throw new Error('quatre');
  const out = [];
  for (const line of lines){
    const parts = line.split(/\s+/);
    if (parts.length !== 3) throw new Error('adresse');
    const [url, username, credential] = parts;
    if (!/^turns?:[^\s/@?]+/.test(url)) throw new Error('adresse');
    out.push({ urls: url, username, credential });
  }
  return out;
}
/* la forme texte (une ligne par serveur) depuis la forme rangée */
export const turnText = list => (list || [])
  .map(e => [e.urls, e.username, e.credential].filter(Boolean).join(' ')).join('\n');

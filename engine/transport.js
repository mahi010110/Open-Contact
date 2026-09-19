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
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.mostr.pub',
  /* entrants du 18/09, mesurés porteurs, cinq opérateurs distincts */
  'wss://bucket.coracle.social',
  'wss://relay.froth.zone',
  'wss://nostr-01.yakihonne.com',
  'wss://relay.mostro.network',
  'wss://nostr.data.haus'
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

/* compte les WebSockets de relais par état (readyState 0/1), et — c'est
   la moitié qui manquait — combien ont RÉELLEMENT répondu.

   UN SOCKET OUVERT N'EST PAS UN RELAIS QUI MARCHE. C'est l'erreur de
   l'incident #14 refaite un étage plus bas : là on déduisait « à jour »
   de la simple création de la salle, ici on déduisait « relais joint »
   de `readyState === 1`. Un relais qui accepte la connexion puis ne
   relaie rien comptait donc comme joint, et l'écran affichait « En
   attente de ton autre appareil » indéfiniment — c'est-à-dire qu'il
   accusait le pair absent d'une panne qui n'était pas la sienne, et
   invitait à patienter devant quelque chose qui n'arriverait jamais.

   `repondu` est l'ensemble des relais dont on a reçu au moins un
   message. Absent, on ne conclut RIEN : `vivants` vaut `open`, et
   personne n'est accusé — un appelant qui ne sait pas ne doit pas
   faire dire à cette fonction ce qu'il ignore.

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
   `refus` est l'ensemble des relais qui ont répondu `OK false` à une
   de nos publications — une réponse directe, sans ambiguïté, à ce
   qu'on leur a demandé de relayer. Ceux-là ne comptent plus comme
   vivants : leur socket est ouverte, ils sont polis, et ils ne
   porteront rien. */
export function relayTally(socks, repondu, refus){
  const t = { total: 0, open: 0, pending: 0, vivants: 0, refus: 0 };
  for (const k in (socks || {})){
    const s = socks[k];
    if (!s) continue;
    t.total++;
    if (s.readyState === 1){
      t.open++;
      const refuse = !!(refus && refus.has(k));
      if (refuse) t.refus++;
      if (!refuse && (!repondu || repondu.has(k))) t.vivants++;
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

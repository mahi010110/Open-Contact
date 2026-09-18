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

   On épingle donc la liste, et deux règles la gouvernent :

   ① **Les cinq historiques restent, en tête.** Un appareil resté sur
     l'ancienne version n'écoute qu'eux ; les garder, c'est garantir un
     terrain commun entre deux versions de l'app. Les retirer couperait
     le partage entre un téléphone à jour et celui d'un camarade qui ne
     l'est pas — le contraire du service rendu.
   ② **On élargit.** Cinq relais, c'est cinq pannes possibles pour un
     seul échec. Une liste explicite n'est PAS tronquée par Trystero
     (`relayConfig.urls` passe entière), donc la redondance est réelle.

   La liste de l'utilisateur (`oc_relays_v1`) reste prioritaire : celui
   dont le réseau bloque tout garde la main. */
export const RELAIS_DEFAUT = [
  /* les cinq du tirage historique — compatibilité entre versions */
  'wss://basspistol.org',
  'wss://relay.libernet.app',
  'wss://hornetstorage.net/relay',
  'wss://nostr-relay.corb.net',
  'wss://nostr.sathoarder.com',
  /* les plus fréquentés de la liste vendorisée, jamais tirés jusqu'ici */
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.mostr.pub',
  'wss://purplerelay.com'
];

/* ---------- CE QUE DIT UNE TRAME DE RELAIS ----------
   Un relais qui PARLE n'est pas un relais qui RELAIE, et c'est
   l'incident #14 refait un étage plus haut. Là on déduisait « joint »
   de `readyState === 1` ; ici on déduisait « vivant » de « il nous a
   envoyé un message » — et un EOSE est un message. Or un EOSE ne
   prouve qu'une chose : le relais a lu notre abonnement. Il ne dit
   RIEN de ce que le produit a besoin de savoir, qui est « mon annonce
   atteindra-t-elle l'autre ? ».

   Mesuré, trois relais côte à côte, un seul appareil dans la salle :
   le relais sain renvoie notre propre annonce (5 trames `EVENT` en
   16 s) ; le relais sourd et le relais qui refuse n'en renvoient
   aucune — et l'app comptait les trois « vivants », donc affichait
   « En attente de ton groupe » à l'infini. Elle accusait le camarade
   absent d'une panne qui était celle du transport, sur les TROIS
   canaux à la fois (groupe, rendez-vous QR, sync).

   On classe donc la trame, en trois valeurs et pas deux :

   · `relaie` — un `EVENT` est passé. C'est la seule preuve positive.
   · `refus`  — le relais dit NON, explicitement : `OK … false` (NIP-20
     « restricted: », « blocked: », « rate-limited: »…), `CLOSED` sur
     notre abonnement, ou `AUTH` — il réclame une authentification que
     la bibliothèque ne sait pas faire, donc rien ne passera jamais.
     C'est aujourd'hui la panne la plus courante d'un relais public.
   · `parle`  — tout le reste (EOSE, `OK … true`, inconnu).

   ON NE DEVINE PAS. Un `NOTICE` est du texte libre : il ne compte
   comme refus que s'il porte un des mots de refus connus. Un relais
   bavard qui dit bonjour ne doit pas être accusé — se tromper de
   cause coûte plus cher que ne pas savoir (§8), et c'est la même
   règle que `causeLiaison` plus bas. */
const MOTS_REFUS = /restricted|blocked|rate-?limit|auth[- ]?required|payment|paid|invalid|pow:|not accept|forbidden|unauthorized/i;
/* la trame la plus GROSSE est aussi la plus fréquente : un `EVENT`
   porte le SDP d'une liaison, plusieurs kilo-octets, et elles passent
   toutes par ici. On lit donc son type au PRÉFIXE, sans re-parser un
   message que la bibliothèque parse déjà juste après. Le plafond qui
   suit garde la même idée : un verdict (`OK`, `NOTICE`, `CLOSED`,
   `AUTH`) est toujours court, donc rien de long n'a besoin d'être
   analysé pour savoir qu'il n'en est pas un. */
const VERDICT_MAX = 2048;
export function classerTrame(data){
  const brut = String(data == null ? '' : data);
  if (/^\s*\[\s*"EVENT"/.test(brut)) return 'relaie';
  if (brut.length > VERDICT_MAX) return 'parle';
  let m;
  try { m = JSON.parse(brut); } catch (e) { return 'parle'; }
  if (!Array.isArray(m) || !m.length) return 'parle';
  const type = String(m[0]).toUpperCase();
  if (type === 'EVENT') return 'relaie';
  /* `OK` porte son verdict en troisième position : faux = refusé */
  if (type === 'OK') return m[2] === false ? 'refus' : 'parle';
  if (type === 'CLOSED') return 'refus';
  /* `AUTH` n'est pas un refus poli, c'est un mur : la bibliothèque ne
     signe aucun défi NIP-42, donc aucune annonce ne passera. */
  if (type === 'AUTH') return 'refus';
  if (type === 'NOTICE') return MOTS_REFUS.test(String(m[1] || '')) ? 'refus' : 'parle';
  return 'parle';
}

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

   `parlent` est l'ensemble des relais dont on a reçu au moins un
   message. Absent, on ne conclut RIEN : `vivants` vaut `open`, et
   personne n'est accusé — un appelant qui ne sait pas ne doit pas
   faire dire à cette fonction ce qu'il ignore.

   `relaient` (un `EVENT` est passé) et `refusent` (il a dit non) sont
   les deux ensembles que `classerTrame` alimente. Ils ne changent pas
   le sens de `vivants` — sauf pour un relais qui REFUSE, retiré des
   vivants parce qu'un relais qui répond « non » n'est pas un relais
   joignable, c'est un relais fermé qui répond poliment.
   `relaient` reste un COMPTE, jamais un verdict : un relais sain qui
   ne renverrait pas notre propre annonce ne doit pas se faire
   accuser, et cette hypothèse-là n'est mesurée que sur le relais
   local. Elle se mesure sur les vrais relais par la sonde
   (`sonde-relais-publics.mjs`), qui n'en a pas besoin — elle ouvre
   deux connexions. */
export function relayTally(socks, parlent, relaient, refusent){
  const t = { total: 0, open: 0, pending: 0, vivants: 0, relaient: 0, refus: 0 };
  for (const k in (socks || {})){
    const s = socks[k];
    if (!s) continue;
    t.total++;
    if (s.readyState === 1){
      t.open++;
      const refuse = !!(refusent && refusent.has(k));
      if (refuse) t.refus++;
      if (relaient && relaient.has(k)) t.relaient++;
      if (!refuse && (!parlent || parlent.has(k))) t.vivants++;
    } else if (s.readyState === 0) t.pending++;
  }
  return t;
}

/* l'étape d'une liaison :
   · on         — pair connecté ET un échange a réellement été reçu
   · link       — pair connecté, premier échange pas encore arrivé
   · norelay    — aucun relais joignable passé le délai de grâce
   · relaisrefus— les relais joints REFUSENT nos annonces (`OK … false`,
                  `CLOSED`, `AUTH`) : le réseau de l'utilisateur va
                  bien, c'est la LISTE qui ne va pas. Le geste est
                  donc l'inverse de « pas de connexion » — on ne
                  redémarre pas son wifi, on change de relais. Dire
                  « pas de connexion » à quelqu'un dont la connexion
                  est parfaite l'envoie réparer ce qui marche, et c'est
                  la faute déjà payée par `causeLiaison`
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
  /* UN RELAIS QUI DIT NON N'EST PAS UN RELAIS QUI SE TAIT. Le refus
     est explicite et sans ambiguïté : aucune annonce ne passera par
     celui-là, jamais, et attendre n'y changera rien. On ne le dit
     qu'une fois le délai de grâce passé et s'il ne reste AUCUN relais
     vivant — un seul relais sain suffit à faire circuler, donc un
     refus au milieu d'une liste saine ne regarde personne. */
  if (graceOver && r.refus && !r.vivants) return 'relaisrefus';
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

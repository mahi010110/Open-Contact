/* ============================================================
   OpenContact — moteur · état honnête d'une liaison P2P
   Dire où en est réellement le transport à partir de faits bruts :
   sockets de relais (getRelaySockets), pair annoncé mais liaison
   directe en échec (onJoinError), pair connecté, échange reçu.
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
   faire dire à cette fonction ce qu'il ignore. */
export function relayTally(socks, repondu){
  const t = { total: 0, open: 0, pending: 0, vivants: 0 };
  for (const k in (socks || {})){
    const s = socks[k];
    if (!s) continue;
    t.total++;
    if (s.readyState === 1){
      t.open++;
      if (!repondu || repondu.has(k)) t.vivants++;
    } else if (s.readyState === 0) t.pending++;
  }
  return t;
}

/* l'étape d'une liaison :
   · on         — pair connecté ET un échange a réellement été reçu
   · link       — pair connecté, premier échange pas encore arrivé
   · norelay    — aucun relais joignable passé le délai de grâce
   · rtcfail    — un pair s'est annoncé mais la liaison directe échoue
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

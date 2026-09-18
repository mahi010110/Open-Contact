/* ============================================================
   OpenContact — sonde du transport PUBLIC (incident #14)
   La CI ne doit pas rester verte quand les relais Nostr publics que
   l'application compose sont morts ou muets.

   ELLE SONDAIT LA LISTE D'AVANT L'ÉPINGLAGE. Cette sonde laissait le
   bundle vendorisé faire SA sélection (mélange déterministe par
   appId) — ce qui était juste tant que l'app s'en remettait à lui.
   Depuis, `RELAIS_DEFAUT` en épingle NEUF, et le tirage du bundle
   n'en rendait que cinq : les quatre ajoutés exprès parce qu'ils sont
   les plus fréquentés — damus.io, nos.lol, mostr.pub, purplerelay —
   n'ont jamais été sondés une seule fois. Le commentaire disait
   pourtant « ceux que l'application choisit RÉELLEMENT » : c'était
   vrai avant l'épinglage, l'épinglage l'a rendu faux.
   On lit donc la SOURCE : la liste que l'app compose vraiment. Que
   les neuf soient bien composés est prouvé ailleurs, par
   `e2e-liaison.mjs`, contre un vrai relais local.

   ELLE ACCUSAIT LES RELAIS DE SES PROPRES PANNES DE RÉSEAU. C'est le
   défaut le plus cher qu'une sonde puisse avoir, et il ne se voit que
   le jour où il se déclenche : sans réseau sortant, les neuf
   échouaient tous de la même façon, et le rapport rendait
   « ÉPINGLÉS MUETS — à remplacer dans RELAIS_DEFAUT » suivi des NEUF.
   Quelqu'un qui suit le conseil remplace neuf relais en bonne santé.
   Mesuré ici même : TCP et TLS ouvrent jusqu'à `relay.damus.io`, mais
   la WebSocket passe par un mandataire qui rend 403 — 0/9, et pas un
   seul relais en cause. La sonde tourne dans la CI à chaque poussée
   ET deux fois par semaine sans personne devant : elle doit savoir
   dire « je n'ai pas pu mesurer ».

   Elle sait maintenant, grâce à DEUX contrôles qui répondent chacun à
   une question différente, et sans une dépendance de plus :

   ① UN RELAIS LOCAL, sondé par la MÊME fonction (`relais-local.mjs`,
     un vrai NIP-01 écrit à la main). Il répond à : « ma sonde
     sait-elle encore reconnaître un relais sain ? » Si ce contrôle
     échoue, c'est l'instrument qui est cassé, pas le monde — et
     nommer un seul relais public serait un mensonge. C'est la règle
     du dépôt : la sonde passe par le même chemin que la mesure,
     sinon elle ne prouve rien.
   ② UNE CONNEXION TCP NUE vers chaque relais qui a échoué. Elle
     répond à : « le chemin est-il coupé au socket, ou plus haut ? »
     Les relais se servent ainsi de contrôle les uns aux autres —
     aucun tiers à ajouter, aucune adresse de plus à maintenir.

   Pour chaque relais choisi : connexion WebSocket réelle, REQ
   NIP-01, attente d'un EOSE. Moins de 2 relais sains = échec.
   Ne sonde pas le WebRTC (impossible sans deux réseaux réels) —
   la chaîne complète est couverte par e2e-liaison.mjs en local.
   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1
   (le poste de dev peut être derrière un proxy qui bloque wss).
   ============================================================ */
import net from 'node:net';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { startLocalRelay } from './relais-local.mjs';

const RealWebSocket = globalThis.WebSocket;

/* ============================================================
   2. LA SONDE — et ce qu'elle mesurait n'était PAS ce que le produit
   a besoin de savoir.

   Elle déclarait un relais « sain » sur un EOSE. Or un EOSE ne prouve
   qu'une chose : le relais a lu notre abonnement. Le produit, lui, a
   besoin de savoir « mon annonce atteindra-t-elle l'autre ? » — et un
   relais peut répondre EOSE toute la journée en refusant ou en jetant
   chaque événement qu'on lui confie. C'est la panne la plus courante
   d'un relais Nostr public aujourd'hui (relais payant, liste blanche
   d'auteurs, types d'événements restreints), c'est celle qu'un
   utilisateur a rapportée — les TROIS canaux P2P bloqués sur « En
   attente » — et le rapport disait « 7 sur 9 répondent ».

   Le seul relevé qui vaut est donc celui du produit : DEUX connexions
   sur le même relais, l'une s'abonne, l'autre publie, et on exige que
   l'événement traverse.

   TROIS choses en découlent, et chacune a coûté un faux vert :

   ① LE TYPE D'ÉVÉNEMENT EST DÉRIVÉ DU NOM DE LA SALLE. La
     bibliothèque publie sur `20000 + (somme des codes du sujet mod
     10000)`, jamais un type fixe : sonder `kinds:[21000]` sondait un
     type que l'app n'utilise presque jamais, et un relais qui filtre
     par type passait au vert. On calcule donc le type comme elle.
   ② PUBLIER ET ÉCOUTER SUR LA MÊME CONNEXION NE PROUVE RIEN DE SÛR.
     Un relais peut se contenter de renvoyer à l'auteur ce qu'il vient
     d'écrire sans le transmettre à personne. Deux connexions séparées
     ferment cette porte — et c'est aussi pour ça que l'app, qui n'en
     a qu'une, ne peut pas se prononcer toute seule (voir
     `relayTally`).
   ③ LE REFUS SE LIT, ET IL SE NOMME. `OK … false` porte sa raison
     (NIP-20), `CLOSED` et `AUTH` disent qu'il faut s'authentifier.
     Les confondre avec « muet » ferait chercher une panne de réseau
     là où il y a une porte fermée.
   ============================================================ */

/* le type d'événement, calculé comme la bibliothèque : 20000 + hash */
const kindDe = sujet => 20000 +
  (String(sujet).split('').reduce((t, c) => t + c.charCodeAt(0), 0) % 10000);

/* une connexion, et les trames qu'elle reçoit */
const brancher = (url, onTrame) => new Promise((res, rej) => {
  let ws;
  try { ws = new RealWebSocket(url); } catch (e) { return rej(e); }
  const t = setTimeout(() => { try { ws.close(); } catch (e) {} rej(new Error('timeout')); }, 10000);
  ws.onopen = () => { clearTimeout(t); res(ws); };
  ws.onerror = () => { clearTimeout(t); rej(new Error('socket')); };
  ws.onmessage = e => onTrame(String(e.data));
});

/* de quoi signer un événement Nostr sans une dépendance de plus :
   les relais que nous visons n'exigent pas de signature valide pour
   RELAYER un éphémère… et ceux qui l'exigent le disent (`OK false`
   « invalid: bad signature »), ce qui est exactement le verdict
   « refus » qu'on veut voir. On ne prétend donc pas signer : on
   envoie un événement bien formé, et on écoute la réponse. */
async function sha256hex(s){
  const h = await crypto.webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* LE RELEVÉ QUI COMPTE : l'événement traverse-t-il d'une connexion à
   l'autre ? Rendus possibles :
     · 'relaie'   — il est passé : c'est le seul « sain » qui vaille
     · 'refus'    — le relais dit non, avec sa raison
     · 'sourd'    — il accepte tout et ne transmet rien (EOSE, OK true,
                    et l'événement n'arrive jamais en face)
     · 'muet'     — la WebSocket s'ouvre et il ne dit jamais rien
     · 'connexion'— la WebSocket ne s'ouvre pas */
export const sonde = async url => {
  const sujet = 'oc-sonde-' + Math.random().toString(36).slice(2, 10);
  const kind = kindDe(sujet);
  let ouvert = false, aParle = false, refus = '', recu = false, eose = false;
  let ecoute = null, envoi = null;
  const lire = t => {
    aParle = true;
    let m;
    try { m = JSON.parse(t); } catch (e) { return; }
    if (!Array.isArray(m)) return;
    const type = String(m[0]).toUpperCase();
    if (type === 'EVENT') recu = true;
    else if (type === 'EOSE') eose = true;
    else if (type === 'OK' && m[2] === false) refus = refus || String(m[3] || 'refusé');
    else if (type === 'CLOSED') refus = refus || String(m[2] || 'abonnement refusé');
    else if (type === 'AUTH') refus = refus || 'authentification exigée (NIP-42)';
    else if (type === 'NOTICE') refus = refus || String(m[1] || '');
  };
  const fermer = () => { for (const w of [ecoute, envoi]) if (w){ w.onmessage = w.onerror = null; try { w.close(); } catch (e) {} } };
  const dors = ms => new Promise(r => setTimeout(r, ms));
  try {
    ecoute = await brancher(url, lire);
    ouvert = true;
    envoi = await brancher(url, lire);
    const subId = 'oc-s-' + Math.random().toString(36).slice(2, 10);
    ecoute.send(JSON.stringify(['REQ', subId,
      { kinds: [kind], since: Math.floor(Date.now() / 1000) - 60, '#x': [sujet] }]));
    await dors(1200);                       /* laisser l'abonnement se poser */
    const ev = { kind, tags: [['x', sujet]], created_at: Math.floor(Date.now() / 1000),
                 content: 'oc', pubkey: await sha256hex('oc-sonde-pub') };
    ev.id = await sha256hex(JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]));
    ev.sig = await sha256hex(ev.id) + await sha256hex(ev.id);   /* 64 octets */
    envoi.send(JSON.stringify(['EVENT', ev]));
    for (let i = 0; i < 24 && !recu && !refus; i++) await dors(250);
  } catch (e) {
    fermer();
    return { etat: ouvert ? (aParle ? 'muet' : 'muet') : 'connexion', ouvert, refus: '' };
  }
  fermer();
  /* L'ORDRE COMPTE : un relais qui a relayé est sain même s'il a
     grommelé au passage ; un refus explicite l'emporte ensuite ; et
     « sourd » ne se dit que s'il a vraiment parlé (EOSE), sinon il est
     muet et ce n'est pas la même panne. */
  if (recu) return { etat: 'relaie', ouvert, refus: '' };
  if (refus) return { etat: 'refus', ouvert, refus: refus.slice(0, 80) };
  if (eose || aParle) return { etat: 'sourd', ouvert, refus: '' };
  return { etat: 'muet', ouvert, refus: '' };
};

/* ---- contrôle ② : le socket nu, pour savoir OÙ le chemin est coupé ---- */
export const tcpOuvre = url => new Promise(res => {
  let u;
  try { u = new URL(url); } catch (e) { return res(false); }
  const port = u.port ? +u.port : (u.protocol === 'ws:' ? 80 : 443);
  const s = net.connect({ host: u.hostname, port });
  const fin = ok => { clearTimeout(t); s.removeAllListeners(); try { s.destroy(); } catch (e) {} res(ok); };
  const t = setTimeout(() => fin(false), 6000);
  s.on('connect', () => fin(true));
  s.on('error', () => fin(false));
});

/* ---- contrôle ① : la sonde sait-elle encore reconnaître un relais ? ----
   Il s'exerce maintenant DANS LES DEUX SENS, et c'est le seul contrôle
   qui prouve la correction : un relais local sain doit sortir
   « relaie », et un relais local SOURD — celui qui répond tout et ne
   transmet rien, `relais-local.mjs` en fait un exprès — doit sortir
   « sourd ». Sans ce second sens, une sonde trop généreuse rendrait
   « relaie » pour tout le monde et le rapport redeviendrait faux dans
   le seul sens qui rassure.
   Rendu : '' si la sonde sait mesurer, sinon la raison de son échec. */
export async function controleLocal(){
  const cas = [['sain', {}, 'relaie'], ['sourd', { sourd: true }, 'sourd']];
  for (const [nom, opts, attendu] of cas){
    let local = null;
    try {
      local = await startLocalRelay(opts);
      const r = await sonde(local.url);
      if (r.etat !== attendu)
        return 'le relais LOCAL ' + nom + ', qui doit sortir « ' + attendu
          + ' » par construction, est rendu « ' + r.etat + ' »';
    } catch (e) {
      return 'le relais local n’a pas démarré — ' + (e && e.message);
    } finally {
      if (local) local.close();
    }
  }
  return '';
}

/* ---- le relevé : chaque relais, et la COUCHE où le chemin casse ----
   `sains` = un événement a RÉELLEMENT traversé d'une connexion à
   l'autre. C'est la seule preuve qui intéresse le produit.
   `suspects` = la WebSocket s'est ouverte, donc le relais a répondu au
   moins une fois : ce qui suit est SA faute, et il se nomme — qu'il
   refuse (avec sa raison) ou qu'il soit sourd.
   `coupes` = elle ne s'est jamais ouverte, et c'est peut-être nous :
   on ne nomme personne à charge. */
const DITS = {
  refus: 'REFUSE nos annonces',
  sourd: 'SOURD — il répond, et ne transmet rien (le pire des trois : '
       + 'l’app le croyait sain)',
  muet: 'muet — il ouvre et ne dit jamais rien'
};
export async function relever(relais, dire = () => {}){
  const sains = [], suspects = [], coupes = [];
  for (const url of relais){
    const r = await sonde(url);
    if (r.etat === 'relaie'){ sains.push(url); dire('✓ ' + url + ' — relaie'); continue; }
    /* la WebSocket ne s'est pas ouverte : est-ce le relais, ou le chemin ? */
    const tcp = r.ouvert ? true : await tcpOuvre(url);
    const dit = !r.ouvert && !tcp ? 'injoignable — même le socket refuse'
              : !r.ouvert ? 'coupé plus haut — le socket ouvre, pas la WebSocket'
              : (DITS[r.etat] || r.etat) + (r.refus ? ' : « ' + r.refus + ' »' : '');
    (r.ouvert ? suspects : coupes).push(url + ' — ' + dit);
    dire('✗ ' + url + ' — ' + dit);
  }
  return { sains, suspects, coupes };
}

/* LE PLANCHER D'ÉCHEC EST 2, et c'est le minimum RÉEL de l'app : avec
   deux relais sains, deux pairs se trouvent. Il ne monte pas à neuf —
   un relais public tombe pour la nuit sans que le produit soit en
   cause, et une CI qui rougit pour ça finit par ne plus être lue.
   Mais un plancher bas laisse la liste POURRIR en silence : c'est ce
   qui est arrivé à hornetstorage, mort et vert pendant des semaines.
   Les morts sont donc nommés à part, en fin de rapport, là où on les
   voit — et le jour où la liste se dégrade vraiment, c'est ce bloc
   qu'on relit. */
export const PLANCHER = 2;

/* ---- LE VERDICT COLLECTIF, une fonction PURE ----
   Un relais isolé qui ne répond pas est un relais en panne ; NEUF qui
   ne s'ouvrent même pas, c'est la machine qui n'a pas de réseau. Tant
   qu'aucune WebSocket ne s'est ouverte, on n'a mesuré aucun relais —
   et on ne nomme personne.
   Elle est pure exprès : c'est la branche qui ne se déclenche QUE le
   jour où le réseau tombe, donc celle qui pourrirait sans qu'on le
   voie. `e2e-sonde-relais.mjs` l'exerce à chaque passage de la suite. */
export function verdict({ sains, suspects, coupes, total }){
  /* « répondent » était le mot du relevé d'avant, et c'était le mot de
     trop : il décrivait un EOSE. On dit ce qui est mesuré. */
  const lignes = [`\n${sains.length}/${total} relais épinglés RELAIENT vraiment un événement.`];
  if (!sains.length && !suspects.length)
    return { code: 1, mesure: false, lignes: [...lignes,
      '\nRIEN N’A PU ÊTRE MESURÉ : pas une seule WebSocket ne s’est ouverte, sur '
      + total + ' relais. Le contrôle local vient pourtant de passer, donc la sonde '
      + 'fonctionne : c’est le réseau sortant de cette machine qui manque — mandataire, '
      + 'pare-feu, ou wss filtré.'
      + '\n  CE RELEVÉ NE DIT RIEN SUR LES RELAIS. Ne remplace aucune adresse de '
      + 'RELAIS_DEFAUT sur la foi de ce rapport : rejoue-le depuis un réseau ouvert.'] };

  if (suspects.length)
    lignes.push('\nÉPINGLÉS QUI NE RELAIENT PAS — à remplacer dans RELAIS_DEFAUT '
      + '(engine/transport.js) :', ...suspects.map(m => '  · ' + m));
  if (coupes.length)
    lignes.push('\nNON MESURÉS depuis cette machine — le chemin est coupé avant le relais, '
      + 'ils ne sont accusés de rien :', ...coupes.map(m => '  · ' + m));
  if (sains.length < PLANCHER)
    return { code: 1, mesure: true, lignes: [...lignes,
      '\nTRANSPORT PUBLIC DÉGRADÉ : moins de ' + PLANCHER + ' relais sains — le partage '
      + 'en groupe et la sync ne peuvent pas trouver de pair en conditions réelles (#14).'] };
  return { code: 0, mesure: true, lignes };
}

/* ---- lancée en script : c'est la CI qui parle au monde réel ---- */
async function principal(){
  if (process.env.OC_SONDE_RELAIS !== '1'){
    console.log('↷ sonde sautée — OC_SONDE_RELAIS=1 pour sonder les relais publics (CI).');
    return 0;
  }
  /* la liste que l'app compose vraiment — lue à sa source */
  const { RELAIS_DEFAUT } = await import('../../engine/transport.js');
  const relais = [...new Set(RELAIS_DEFAUT)];
  if (!relais.length){ console.error('RELAIS_DEFAUT est vide — la sonde ne sonde rien.'); return 1; }
  console.log('relais épinglés par l’app : ' + relais.length);

  const casse = await controleLocal();
  if (casse){
    console.error('\nSONDE CASSÉE : ' + casse + '. L’instrument ne sait plus reconnaître un '
      + 'relais sain — ce qu’il dirait des relais publics ne vaudrait rien. Rien n’est prouvé '
      + 'sur eux, ne touche pas à RELAIS_DEFAUT.');
    return 1;
  }
  console.log('contrôle : un relais local sain sort « relaie », un relais sourd sort '
    + '« sourd » — la sonde sait mesurer, dans les deux sens ✓');

  const r = await relever(relais, m => console.log(m));
  const v = verdict({ ...r, total: relais.length });
  for (const l of v.lignes) (v.code ? console.error : console.log)(l);
  return v.code;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  process.exit(await principal());

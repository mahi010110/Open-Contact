/* ============================================================
   SONDE — LES CANDIDATS ICE ARRIVENT-ILS DE L'AUTRE CÔTÉ ?

   Les trois sondes de relais mesurent la DÉCOUVERTE : deux pairs
   se trouvent-ils ? Elles font tourner les deux pairs sur la MÊME
   machine, et c'est leur angle mort : là, la liaison directe
   s'établit avec les seules adresses locales, que l'offre porte
   déjà dans son SDP. Ce qui fait passer une liaison entre DEUX
   RÉSEAUX n'y est jamais mis à l'épreuve.

   Ce qui la fait passer, c'est le candidat « srflx » — l'adresse
   publique que chaque appareil apprend du STUN. Or Trystero 0.25
   est en « trickle ICE » : l'offre sort d'un réservoir préparé à
   l'avance, ses adresses déjà dans le SDP ; la RÉPONSE, elle, part
   SANS candidat, et chacun des siens part ENSUITE, un par un, comme
   un événement Nostr de plus — tous par le seul relais qui a livré
   l'offre en premier (`es(…, r)` dans le bundle). Si ce relais accepte l'offre et la
   réponse puis limite le débit, ce sont les candidats — les
   derniers de la rafale — qui tombent. La découverte passe, l'écran
   dit « Quelqu'un est là, mais rien ne passe », et même réseau ça
   marche quand même (les adresses locales suffisent) : exactement
   la panne rapportée.

   CE QUE FAIT CETTE SONDE. Deux vrais pairs, la bibliothèque
   vendorisée, et on ÉCOUTE LES TRAMES : chaque événement publié est
   classé (annonce, offre, réponse, candidat — les clés du contenu
   sont en clair, seules les valeurs sont chiffrées), chaque accusé
   `OK` est relevé avec sa raison, et chaque événement reçu est
   rapproché par son identifiant. On obtient, relais par relais :
   envoyés · acceptés · REFUSÉS (et pourquoi) · sans accusé ·
   LIVRÉS À L'AUTRE PAIR.

   RÉSERVE À LIRE AVEC LE CHIFFRE : ici les deux pairs partagent la
   même adresse IP. Un relais qui limite par IP voit donc deux fois
   plus de trafic que face à deux téléphones. Un refus « rate-limited »
   mesuré ici est une preuve que la limite existe et qu'elle frappe
   les candidats ; son seuil exact se lit dans la raison.

   Contrôle obligatoire : le relais LOCAL doit tout livrer, sinon la
   sonde ne sait pas mesurer et elle ne conclut rien.

   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1.
   `OC_SONDE_LOCAL_SEUL=1` ne joue que le contrôle (sans réseau).
   ============================================================ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, chromiumPath, ROOT } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { RELAIS_DEFAUT } from '../../engine/transport.js';

const ATTENTE_MS = 25000;   /* découverte + liaison */
const TRAINE_MS = 4000;     /* les candidats srflx arrivent APRÈS la liaison locale */

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body><script type="module" src="/sonde.js"></script></body></html>`;

/* L'instrumentation est posée AVANT d'importer la bibliothèque : elle
   ouvre ses WebSockets à l'import de joinRoom, pas avant. */
const SONDE_JS = `
const J = { envoyes: [], acks: [], recus: [], notices: [], cands: {}, pair: false, erreurs: [] };
window.__J = J;
const typeDe = c => {
  try {
    const o = JSON.parse(c);
    if (o && o.offer) return 'offre';
    if (o && o.answer) return 'réponse';
    if (o && o.candidate) return 'candidat';
    return 'annonce';
  } catch (e) { return '?'; }
};
const WS = window.WebSocket;
window.WebSocket = class extends WS {
  constructor(url, p){
    super(url, p);
    const u = String(url).replace(/\\/$/, '');
    this.__u = u;
    this.addEventListener('message', e => {
      let m;
      try { m = JSON.parse(e.data); } catch (x) { return; }
      if (!Array.isArray(m)) return;
      if (m[0] === 'OK') J.acks.push({ relais: u, id: m[1], ok: m[2] === true, raison: String(m[3] || '') });
      else if (m[0] === 'EVENT' && m[2]) J.recus.push({ relais: u, id: m[2].id, type: typeDe(m[2].content), t: Date.now() });
      else if (m[0] === 'NOTICE' || m[0] === 'CLOSED') J.notices.push({ relais: u, texte: String(m[m.length - 1] || '') });
    });
  }
  send(d){
    try {
      const m = JSON.parse(d);
      if (m[0] === 'EVENT' && m[1]) J.envoyes.push({ relais: this.__u, id: m[1].id, type: typeDe(m[1].content), t: Date.now() });
    } catch (e) {}
    return super.send(d);
  }
};
/* les candidats que CET appareil rassemble, par type (host, srflx…) */
const PC = window.RTCPeerConnection;
let sansChemin = false;
window.RTCPeerConnection = class extends PC {
  constructor(c){
    super(c);
    this.addEventListener('icecandidate', e => {
      const t = e.candidate && e.candidate.type;
      if (t) J.cands[t] = (J.cands[t] || 0) + 1;
    });
  }
  /* SANS CHEMIN DIRECT : aucune adresse de l'autre n'est retenue, ni
     celles du SDP ni celles qui suivent. La liaison ne peut donc pas se
     faire en trois millisecondes par la boucle locale, et la
     bibliothèque publie TOUTE sa rafale de candidats — host et srflx,
     tentative et nouvelle tentative — exactement comme entre deux
     vrais réseaux. Ce qui se publie reste intact : on mesure ce que le
     relais en fait. */
  setRemoteDescription(d){
    if (sansChemin && d && d.sdp)
      d = { type: d.type, sdp: d.sdp.split(/\\r\\n/).filter(l => !/^a=(candidate|end-of-candidates)/.test(l)).join('\\r\\n') };
    return super.setRemoteDescription(d);
  }
  addIceCandidate(c){ return sansChemin ? Promise.resolve() : super.addIceCandidate(c); }
};
const { joinRoom } = await import('/trystero.js');
window.__rejoindre = (relais, salle, phrase, sc) => {
  sansChemin = !!sc;
  const room = joinRoom({ appId: 'opencontact', password: phrase, relayConfig: { urls: relais } },
    salle, { onJoinError: e => J.erreurs.push(String((e && e.error) || e)) });
  room.onPeerJoin = () => { J.pair = true; };
  window.__room = room;
};
window.__quitter = async () => { try { await window.__room.leave(); } catch (e) {} };
window.__pret = true;
`;

async function serveur(){
  const bundle = await readFile(path.join(ROOT, 'assets/vendor/trystero-nostr.min.js'), 'utf8');
  const srv = http.createServer((req, res) => {
    if (req.url === '/trystero.js' || req.url === '/sonde.js'){
      res.setHeader('Content-Type', 'application/javascript');
      return res.end(req.url === '/trystero.js' ? bundle : SONDE_JS);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(PAGE);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { srv, base: 'http://127.0.0.1:' + srv.address().port };
}

/* deux pairs, une liste de relais : que devient chaque événement ?
   `sansChemin` : voir la page — la rafale entière part, rien ne relie. */
async function jouer(browser, base, relais, { sansChemin = false, attente = ATTENTE_MS } = {}){
  const phrase = 'sonde-' + Math.random().toString(36).slice(2, 10);
  const salle = 'sonde-' + Math.random().toString(36).slice(2, 10);
  const pages = [];
  try {
    for (let i = 0; i < 2; i++){
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
      const p = await ctx.newPage();
      await p.goto(base + '/', { waitUntil: 'load' });
      await p.waitForFunction(() => window.__pret === true, { timeout: 10000 });
      await p.evaluate(([r, s, f, sc]) => window.__rejoindre(r, s, f, sc), [relais, salle, phrase, sansChemin]);
      pages.push(p);
    }
    const t0 = Date.now();
    let pair = false;
    while (Date.now() - t0 < attente){
      await pages[0].waitForTimeout(500);
      const e = await Promise.all(pages.map(p => p.evaluate(() => window.__J.pair)));
      if (e.every(Boolean)){ pair = true; break; }
    }
    await pages[0].waitForTimeout(TRAINE_MS);
    const [A, B] = await Promise.all(pages.map(p => p.evaluate(() => window.__J)));
    return { pair, A, B };
  } finally {
    for (const p of pages){
      try { await p.evaluate(() => window.__quitter()); } catch (e) {}
      try { await p.context().close(); } catch (e) {}
    }
  }
}

/* le bilan d'une direction : ce que X a publié, ce que Y en a reçu */
function bilan(X, Y){
  const recu = new Set(Y.recus.map(r => r.id));
  const ack = new Map(X.acks.map(a => [a.id, a]));
  const parType = {};
  for (const e of X.envoyes){
    const b = parType[e.type] || (parType[e.type] = { envoyes: 0, acceptes: 0, refuses: 0, sansAccuse: 0, livres: 0, raisons: {}, parRelais: {} });
    const r = b.parRelais[e.relais] || (b.parRelais[e.relais] = { envoyes: 0, livres: 0, refuses: 0 });
    b.envoyes++; r.envoyes++;
    const a = ack.get(e.id);
    if (!a) b.sansAccuse++;
    else if (a.ok) b.acceptes++;
    else { b.refuses++; r.refuses++; b.raisons[a.raison] = (b.raisons[a.raison] || 0) + 1; }
    if (recu.has(e.id)){ b.livres++; r.livres++; }
  }
  return parType;
}

const court = u => u.replace(/^wss?:\/\//, '');
function dire(titre, res){
  const { pair, A, B } = res;
  console.log('\n— ' + titre + ' · liaison ' + (pair ? 'établie' : 'NON établie')
    + (A.erreurs.length || B.erreurs.length ? ' · erreurs : ' + [...A.erreurs, ...B.erreurs].join(' | ') : ''));
  console.log('  candidats rassemblés : A ' + JSON.stringify(A.cands) + ' · B ' + JSON.stringify(B.cands));
  for (const [nom, X, Y] of [['A→B', A, B], ['B→A', B, A]]){
    const b = bilan(X, Y);
    for (const type of ['annonce', 'offre', 'réponse', 'candidat']){
      const t = b[type];
      if (!t) continue;
      /* une annonce n'a pas de destinataire : on ne compte que ce qui
         s'adresse à l'autre pair, c'est-à-dire la négociation */
      const livre = type === 'annonce' ? '' : ' · livrés ' + t.livres + '/' + t.envoyes;
      console.log('  ' + nom + ' ' + type.padEnd(9) + ' envoyés ' + String(t.envoyes).padStart(3)
        + ' · OK ' + t.acceptes + ' · refusés ' + t.refuses + ' · sans accusé ' + t.sansAccuse + livre
        + (t.refuses ? ' · raisons ' + JSON.stringify(t.raisons) : ''));
      if (type === 'candidat' && Object.keys(t.parRelais).length > 1)
        for (const [u, r] of Object.entries(t.parRelais))
          console.log('      ' + court(u).padEnd(32) + ' envoyés ' + r.envoyes + ' · livrés ' + r.livres + ' · refusés ' + r.refuses);
    }
  }
  const notices = [...A.notices, ...B.notices].map(n => court(n.relais) + ' : ' + n.texte);
  if (notices.length) console.log('  NOTICE/CLOSED : ' + [...new Set(notices)].slice(0, 8).join(' | '));
}

/* la perte qui compte : des candidats adressés à l'autre pair qui ne
   lui arrivent pas, alors que l'offre ou la réponse, elles, arrivent */
function perdCandidats(res){
  for (const [X, Y] of [[res.A, res.B], [res.B, res.A]]){
    const c = bilan(X, Y)['candidat'];
    if (c && c.livres < c.envoyes) return true;
  }
  return false;
}

/* ---------------- le relevé ---------------- */
if (!process.env.OC_SONDE_RELAIS && !process.env.OC_SONDE_LOCAL_SEUL){
  console.log('sonde des candidats ignorée (OC_SONDE_RELAIS absent) — réseau sortant requis.');
  process.exit(0);
}

const { srv, base } = await serveur();
const browser = await chromium.launch({ executablePath: chromiumPath() });
let sortie = 0;
try {
  /* ① contrôle : le relais local livre tout, la sonde doit le voir */
  const local = await startLocalRelay({});
  let ctl;
  try { ctl = await jouer(browser, base, [local.url]); }
  finally { local.close(); }
  dire('CONTRÔLE — relais local', ctl);
  /* Au moins UNE direction doit avoir publié des candidats : l'offre
     sort du réservoir de la bibliothèque avec ses adresses déjà dans
     le SDP, c'est la RÉPONSE qui part vide et dont les candidats
     suivent un par un — mesuré ici, pas supposé. */
  const cA = bilan(ctl.A, ctl.B)['candidat'], cB = bilan(ctl.B, ctl.A)['candidat'];
  if (!ctl.pair || !(cA || cB) || perdCandidats(ctl)){
    console.log('\nAUCUNE CONCLUSION : le relais local ne livre pas tout — la sonde ne sait pas mesurer.');
    process.exit(1);
  }
  console.log('\ncontrôle : relais local, chaque candidat livré — la sonde sait mesurer ✓');

  /* ①bis LA SIMULATION JOUE-T-ELLE LA BONNE PANNE ? Dans les deux sens,
     sinon zéro perte se lirait comme une réussite : sans chemin direct,
     un relais sain doit tout livrer SANS relier (sinon la simulation
     laisse passer la boucle locale), et un relais qui perd les
     candidats doit être PRIS. */
  const sain = await startLocalRelay({});
  let sc;
  try { sc = await jouer(browser, base, [sain.url], { sansChemin: true, attente: 12000 }); }
  finally { sain.close(); }
  const burst = ['candidat'].map(t => (bilan(sc.A, sc.B)[t] || { envoyes: 0 }).envoyes
    + (bilan(sc.B, sc.A)[t] || { envoyes: 0 }).envoyes)[0];
  const perdant = await startLocalRelay({ perdCandidats: true });
  let pc;
  try { pc = await jouer(browser, base, [perdant.url], { sansChemin: true, attente: 12000 }); }
  finally { perdant.close(); }
  if (sc.pair || !burst || perdCandidats(sc) || !perdCandidats(pc)){
    dire('CONTRÔLE — sans chemin, relais sain', sc);
    dire('CONTRÔLE — sans chemin, relais qui perd les candidats', pc);
    console.log('\nAUCUNE CONCLUSION : la simulation « sans chemin direct » ne joue pas la bonne panne.');
    process.exit(1);
  }
  console.log('contrôle : sans chemin direct, ' + burst + ' candidats publiés, tous livrés, aucune liaison ;'
    + ' un relais qui les perd est pris ✓');
  if (process.env.OC_SONDE_LOCAL_SEUL) process.exit(0);

  /* ② la liste entière, comme l'app la compose — liaison normale */
  const tous = await jouer(browser, base, RELAIS_DEFAUT);
  dire('LA LISTE ENTIÈRE (' + RELAIS_DEFAUT.length + ' relais, comme l’app) · liaison normale', tous);

  /* ③ SANS CHEMIN DIRECT — le cas de deux réseaux : toute la rafale de
     candidats part, et c'est elle qu'on veut voir arriver. La liste
     entière deux fois (le relais qui porte la réponse change d'un tour
     à l'autre), puis chaque relais seul. */
  const pertes = [];
  for (const tour of [1, 2]){
    const r = await jouer(browser, base, RELAIS_DEFAUT, { sansChemin: true });
    dire('SANS CHEMIN DIRECT · liste entière, tour ' + tour, r);
    if (perdCandidats(r)) pertes.push('liste entière, tour ' + tour);
  }
  for (const url of RELAIS_DEFAUT){
    const r = await jouer(browser, base, [url], { sansChemin: true, attente: 15000 });
    dire('SANS CHEMIN DIRECT · ' + court(url), r);
    const neg = ['offre', 'réponse'].some(t => (bilan(r.A, r.B)[t] || bilan(r.B, r.A)[t] || {}).livres);
    if (neg && perdCandidats(r)) pertes.push(url);
  }

  console.log('\n' + (pertes.length
    ? 'OFFRE OU RÉPONSE LIVRÉE, MAIS DES CANDIDATS PERDUS — entre deux réseaux, la liaison y échoue '
      + 'alors que sur un même réseau elle passe :\n' + pertes.map(u => '  · ' + u).join('\n')
    : 'Aucune perte de candidat depuis cette machine, même en rafale complète.'));
} catch (e) {
  console.error('la sonde elle-même a échoué : ' + (e && e.message));
  sortie = 1;
} finally {
  await browser.close();
  srv.close();
}
process.exit(sortie);

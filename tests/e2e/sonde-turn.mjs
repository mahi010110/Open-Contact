/* ============================================================
   SONDE — UN TURN PUBLIC FAIT-IL PASSER LA LIAISON ?

   Le trou qui restait : deux appareils sur des réseaux différents
   se TROUVENT (les relais portent la découverte) puis n'arrivent
   pas à se PARLER. Chacun est derrière le NAT de son opérateur,
   aucun chemin direct n'existe, et sans TURN il n'y en aura jamais.
   L'app nommait la panne et proposait le repli ; elle ne la
   réparait pas.

   CE QUI SE MESURE ICI, EN DEUX TEMPS.

   ① ALLOCATION — chaque adresse candidate reçoit une
     `RTCPeerConnection` en `iceTransportPolicy:'relay'` : plus
     aucun candidat local n'est autorisé, donc le SEUL candidat qui
     peut sortir est un `typ relay` fourni par le TURN lui-même.
     S'il en sort un, le serveur alloue vraiment pour nous.

   ② TRAVERSÉE RÉELLE — deux vrais pairs Trystero, tous les deux en
     relay-only, se cherchent par un relais local et doivent se
     joindre. C'est la simulation exacte de « aucun chemin direct » :
     sur une seule machine, deux navigateurs qui s'interdisent leurs
     candidats locaux sont dans la même situation que deux téléphones
     en données mobiles. S'ils se connectent, ils passent par le
     TURN, et rien d'autre.

   DEUX CONTRÔLES, parce qu'une sonde qui ne sait pas échouer ne
   prouve rien — et parce que ce dépôt a déjà payé neuf relais sains
   accusés par un mandataire :
   · SANS aucun serveur, en relay-only, il ne doit sortir AUCUN
     candidat. Si la sonde en voit un, elle ne mesure pas ce qu'elle
     croit et elle se tait.
   · EN POLITIQUE NORMALE, il doit en sortir au moins un. Sinon le
     réseau d'ici est coupé, et les échecs qui suivent ne sont pas
     la faute des serveurs — on n'accuse personne.

   CE QU'ELLE A MESURÉ, LE 18 SEPTEMBRE 2026 : dix adresses publiques
   sans inscription (openrelay.metered.ca, freeturn.tel, freestun.net,
   en UDP et en TLS), **zéro allocation**. Les deux contrôles étaient
   verts — en politique normale des candidats `srflx` sortaient, donc le
   réseau de la forge fonctionne et l'échec appartient bien aux
   serveurs. Un TURN ouvert à tous se fait vider par le premier venu ;
   ceux qui survivent demandent un compte, ce que la question ② de §0
   interdit. `TURN_DEFAUT` reste donc vide PAR MESURE, et cette sonde
   attend, prête, le jour où une adresse tiendra — elle s'appelle avec
   `OC_TURN_CANDIDATS`, une adresse par ligne.

   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1.
   ============================================================ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, chromiumPath, ROOT } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { TURN_DEFAUT } from '../../engine/transport.js';

const GATHER_MS = 9000;    /* une allocation TURN passe largement dessous */
const LIAISON_MS = 25000;  /* deux pairs relay-only : négociation + relais */

/* Les adresses à éprouver. La liste vient du moteur — ce qui est
   livré est ce qui est mesuré, jamais deux listes qui divergent.
   OC_TURN_CANDIDATS permet d'en essayer d'autres sans toucher au
   code : c'est le mode exploration, comme pour les relais. */
function candidats(){
  const brut = process.env.OC_TURN_CANDIDATS;
  if (!brut) return TURN_DEFAUT;
  return brut.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [urls, username, credential] = l.split(/\s+/);
    return { urls, username, credential };
  });
}

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body><script type="module" src="/sonde.js"></script></body></html>`;

const SONDE_JS = `
import { joinRoom } from '/trystero.js';

/* ① combien de candidats, et de quel type, pour une configuration donnée */
window.__gather = async (iceServers, policy, ms) => {
  const out = { types: [], err: '' };
  let pc;
  try {
    pc = new RTCPeerConnection(policy ? { iceServers, iceTransportPolicy: policy } : { iceServers });
    pc.createDataChannel('x');
    pc.onicecandidate = e => { if (e.candidate && e.candidate.type) out.types.push(e.candidate.type); };
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(r => setTimeout(r, ms));
  } catch (e) { out.err = String(e); }
  try { if (pc) pc.close(); } catch (e) {}
  return out;
};

/* ② deux pairs qui s'interdisent leurs candidats locaux */
window.__etat = { pair: false, erreurs: [] };
window.__rejoindre = (relais, salle, phrase, turn) => {
  const room = joinRoom({
    appId: 'opencontact', password: phrase,
    relayConfig: { urls: [relais] },
    turnConfig: turn,
    rtcConfig: { iceTransportPolicy: 'relay' }
  }, salle, { onJoinError: e => window.__etat.erreurs.push(String((e && e.error) || e)) });
  room.onPeerJoin = () => { window.__etat.pair = true; };
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

if (!process.env.OC_SONDE_RELAIS){
  console.log('sonde TURN ignorée (OC_SONDE_RELAIS absent) — réseau sortant requis.');
  process.exit(0);
}

const { srv, base } = await serveur();
const browser = await chromium.launch({ executablePath: chromiumPath() });
let sortie = 0;

const ouvrir = async () => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto(base + '/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__pret === true, { timeout: 10000 });
  return p;
};

try {
  /* ---- contrôles ---- */
  const pc0 = await ouvrir();
  const vide = await pc0.evaluate(ms => window.__gather([], 'relay', ms), 2500);
  const normal = await pc0.evaluate(ms => window.__gather(
    [{ urls: 'stun:stun.cloudflare.com:3478' }], null, ms), 4000);
  await pc0.context().close();

  if (vide.types.length){
    console.log('contrôle : en relay-only SANS serveur, ' + vide.types.length +
      ' candidat(s) sont sortis (' + [...new Set(vide.types)].join(', ') + ').');
    console.log('La sonde ne mesure pas ce qu’elle croit — AUCUNE CONCLUSION.');
    process.exit(1);
  }
  console.log('contrôle : relay-only sans serveur → 0 candidat, la sonde sait échouer ✓');
  if (!normal.types.length){
    console.log('contrôle : en politique normale, aucun candidat non plus — le réseau d’ici est coupé.');
    console.log('AUCUNE CONCLUSION : on n’accuse aucun serveur.');
    process.exit(1);
  }
  console.log('contrôle : politique normale → ' + [...new Set(normal.types)].join(', ') +
    ', le réseau répond ✓\n');

  /* ---- ① allocation, adresse par adresse ---- */
  const liste = candidats();
  console.log((process.env.OC_TURN_CANDIDATS ? 'EXPLORATION — ' : '') +
    liste.length + ' adresse(s) TURN à éprouver\n');
  const bons = [];
  for (const t of liste){
    const p = await ouvrir();
    const r = await p.evaluate(([s, ms]) => window.__gather([s], 'relay', ms), [t, GATHER_MS]);
    await p.context().close();
    const relais = r.types.filter(x => x === 'relay').length;
    if (relais){ bons.push(t); console.log('✓ ' + t.urls + ' — alloue (' + relais + ' candidat(s) relay)'); }
    else console.log('✗ ' + t.urls + ' — aucune allocation' + (r.err ? ' — ' + r.err : ''));
  }
  console.log('\n' + bons.length + '/' + liste.length + ' adresse(s) allouent réellement.');

  /* ---- ② la traversée, avec ce qui a alloué ---- */
  if (!bons.length){
    console.log('\nÉCHEC : aucun TURN ne répond — la liaison entre deux réseaux reste impossible.');
    sortie = 1;
  } else {
    const relaisLocal = await startLocalRelay({ tls: true });
    const salle = 'turn-' + Math.random().toString(36).slice(2, 10);
    const phrase = 'turn-' + Math.random().toString(36).slice(2, 10);
    const pages = [];
    try {
      for (let i = 0; i < 2; i++){
        const p = await ouvrir();
        await p.evaluate(([r, s, f, t]) => window.__rejoindre(r, s, f, t),
          [relaisLocal.url, salle, phrase, bons]);
        pages.push(p);
      }
      const t0 = Date.now();
      let pair = false;
      while (Date.now() - t0 < LIAISON_MS && !pair){
        await pages[0].waitForTimeout(500);
        const etats = await Promise.all(pages.map(p => p.evaluate(() => window.__etat)));
        pair = etats.some(e => e.pair);
      }
      const etats = await Promise.all(pages.map(p => p.evaluate(() => window.__etat)));
      const erreurs = etats.flatMap(e => e.erreurs);
      if (pair){
        console.log('\n✓ TRAVERSÉE PROUVÉE : deux pairs qui s’interdisent tout candidat local se sont');
        console.log('  joints — donc par le TURN, et rien d’autre. C’est le cas « deux réseaux');
        console.log('  mobiles », reproduit sur une seule machine.');
      } else {
        console.log('\n✗ Les deux pairs ne se sont pas joints en relay-only' +
          (erreurs.length ? ' — ' + erreurs.join(' | ') : '') + '.');
        console.log('  Le TURN alloue mais ne porte pas la liaison : à ne pas livrer comme une garantie.');
        sortie = 1;
      }
    } finally {
      for (const p of pages){
        try { await p.evaluate(() => window.__quitter()); } catch (e) {}
        try { await p.context().close(); } catch (e) {}
      }
      relaisLocal.close();
    }
    if (process.env.OC_TURN_CANDIDATS){
      console.log('\nADRESSES RETENUES — à recopier dans TURN_DEFAUT :');
      bons.forEach(t => console.log("  { urls: '" + t.urls + "', username: '" + t.username +
        "', credential: '" + t.credential + "' },"));
    }
  }
} catch (e) {
  console.error('la sonde elle-même a échoué : ' + (e && e.message));
  sortie = 1;
} finally {
  await browser.close();
  srv.close();
}
process.exit(sortie);

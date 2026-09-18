/* ============================================================
   SONDE — LA DÉCOUVERTE PASSE-T-ELLE PAR CE RELAIS ?

   `sonde-relais-publics.mjs` mesure une LECTURE : elle ouvre la
   WebSocket, envoie un `REQ` et attend l'`EOSE`. C'est la moitié du
   chemin. Trystero, pour que deux appareils se trouvent, doit
   PUBLIER — un événement éphémère (kind 20000-29999 dérivé du topic,
   signé) qui porte sa présence puis son SDP.

   Un relais qui répond aux lectures et refuse les écritures est donc
   rendu « sain » par l'ancienne sonde, compté « vivant » par
   `relayTally`, et l'app affiche « En attente de ton groupe »
   indéfiniment — alors que rien n'arrivera jamais. C'est l'erreur de
   l'incident #14 refaite un étage plus bas, pour la troisième fois :
   on déduisait « à jour » de la création de la salle, puis « relais
   joint » de `readyState === 1`, et maintenant « relais utilisable »
   d'un EOSE. Chaque fois, c'est le PAIR ABSENT qu'on accusait d'une
   panne qui n'était pas la sienne.

   Les relais publics ont massivement ajouté des restrictions
   d'écriture (NIP-42 AUTH, allow-list, paiement, anti-spam) tout en
   continuant à servir les lectures : la moitié qu'on ne mesurait pas
   est précisément celle qui tombe.

   CE QUE FAIT CETTE SONDE. Pour chaque relais, DEUX vrais pairs
   Trystero (deux contextes de navigateur, donc deux `selfId`)
   rejoignent la même salle en ne composant QUE ce relais. On ne
   simule rien : c'est la bibliothèque vendorisée, sa signature, son
   protocole. Verdict par relais :
     · découverte — les deux pairs se sont trouvés : le relais porte
                    la présence, c'est tout ce qu'on lui demande ;
     · muet       — la WebSocket s'ouvre, personne ne se trouve :
                    l'écriture ne passe pas (ou n'est pas relayée) ;
     · injoignable— la WebSocket ne s'ouvre jamais : peut-être nous.

   CONTRÔLE OBLIGATOIRE, ET C'EST LA MOITIÉ DU SCÉNARIO. Le relais
   local doit d'abord rendre « découverte ». Sans réseau sortant les
   neuf échouent de la même façon, et un rapport qui accuse neuf
   relais sains coûte neuf adresses remplacées à la main — c'est
   arrivé, c'est écrit dans `e2e-sonde-relais.mjs`. Si le contrôle
   échoue, la sonde ne conclut RIEN.

   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1.
   ============================================================ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, chromiumPath, ROOT } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { RELAIS_DEFAUT } from '../../engine/transport.js';

const ATTENTE_MS = 20000;   /* un relais chargé met plusieurs secondes */

/* La page est servie par NOTRE serveur, avec une copie du bundle
   vendorisé : on sonde le relais, pas l'application — pas de service
   worker, pas de CSP, pas d'état persistant à démêler. La
   bibliothèque, elle, est exactement celle que l'app embarque. */
const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body><script type="module" src="/sonde.js"></script></body></html>`;

const SONDE_JS = `
import { joinRoom, getRelaySockets } from '/trystero.js';
window.__etat = { pair: false, erreurs: [] };
window.__rejoindre = (relais, salle, phrase) => {
  const room = joinRoom(
    { appId: 'opencontact', password: phrase, relayConfig: { urls: [relais] } },
    salle,
    { onJoinError: e => window.__etat.erreurs.push(String((e && e.error) || e)) });
  room.onPeerJoin = () => { window.__etat.pair = true; };
  window.__room = room;
};
window.__sockets = () => {
  const s = getRelaySockets() || {};
  return Object.keys(s).map(k => ({ url: k, etat: s[k] && s[k].readyState }));
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

/* deux pairs, un seul relais : se trouvent-ils ? */
async function decouverte(browser, base, relais){
  const phrase = 'sonde-' + Math.random().toString(36).slice(2, 10);
  const salle = 'sonde-' + Math.random().toString(36).slice(2, 10);
  const pages = [];
  try {
    for (let i = 0; i < 2; i++){
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
      const p = await ctx.newPage();
      await p.goto(base + '/', { waitUntil: 'load' });
      await p.waitForFunction(() => window.__pret === true, { timeout: 10000 });
      await p.evaluate(([r, s, f]) => window.__rejoindre(r, s, f), [relais, salle, phrase]);
      pages.push(p);
    }
    const t0 = Date.now();
    let pair = false;
    while (Date.now() - t0 < ATTENTE_MS && !pair){
      await pages[0].waitForTimeout(500);
      const etats = await Promise.all(pages.map(p => p.evaluate(() => window.__etat)));
      pair = etats.some(e => e.pair);
      if (pair) break;
    }
    const socks = await pages[0].evaluate(() => window.__sockets());
    const etats = await Promise.all(pages.map(p => p.evaluate(() => window.__etat)));
    const erreurs = etats.flatMap(e => e.erreurs);
    const ouvert = socks.some(s => s.etat === 1);
    if (pair) return { etat: 'découverte', erreurs };
    /* un pair annoncé PUIS en échec de liaison n'est pas la faute du
       relais : il a porté la présence, c'est le WebRTC qui a cédé.
       Ici les deux pairs sont sur la même machine, donc ça ne doit pas
       arriver — si ça arrive, on le dit au lieu d'accuser le relais. */
    if (erreurs.length) return { etat: 'rtc', erreurs };
    return { etat: ouvert ? 'muet' : 'injoignable', erreurs };
  } finally {
    for (const p of pages){
      try { await p.evaluate(() => window.__quitter()); } catch (e) {}
      try { await p.context().close(); } catch (e) {}
    }
  }
}

/* ---------------- le relevé ---------------- */
if (!process.env.OC_SONDE_RELAIS){
  console.log('sonde de découverte ignorée (OC_SONDE_RELAIS absent) — réseau sortant requis.');
  process.exit(0);
}

const { srv, base } = await serveur();
const browser = await chromium.launch({ executablePath: chromiumPath() });
let sortie = 0;
try {
  console.log('relais épinglés par l’app : ' + RELAIS_DEFAUT.length);

  /* ① contrôle : la sonde sait-elle voir une découverte qui marche ? */
  const local = await startLocalRelay({ tls: true });
  let controle;
  try { controle = await decouverte(browser, base, local.url); }
  finally { local.close(); }
  if (controle.etat !== 'découverte'){
    console.log('contrôle : le relais LOCAL rend « ' + controle.etat + ' » — la sonde ne sait pas mesurer.');
    console.log('AUCUNE CONCLUSION : ni relais accusé, ni relais absous.');
    if (controle.erreurs.length) console.log('  erreurs : ' + controle.erreurs.join(' | '));
    process.exit(1);
  }
  console.log('contrôle : deux pairs se trouvent par le relais local — la sonde sait mesurer ✓\n');

  /* ② les relais réellement composés par l'app */
  const porteurs = [], muets = [], coupes = [], bizarres = [];
  for (const url of RELAIS_DEFAUT){
    const r = await decouverte(browser, base, url);
    if (r.etat === 'découverte'){ porteurs.push(url); console.log('✓ ' + url + ' — la découverte passe'); }
    else if (r.etat === 'muet'){ muets.push(url); console.log('✗ ' + url + ' — MUET : socket ouverte, aucune découverte'); }
    else if (r.etat === 'injoignable'){ coupes.push(url); console.log('· ' + url + ' — injoignable (socket jamais ouverte)'); }
    else { bizarres.push([url, r.erreurs.join(' | ')]); console.log('? ' + url + ' — pair trouvé puis liaison en échec : ' + r.erreurs.join(' | ')); }
  }

  console.log('\n' + porteurs.length + '/' + RELAIS_DEFAUT.length + ' relais portent réellement la découverte.');
  if (muets.length){
    console.log('\nLECTURE OK, ÉCRITURE MUETTE — ces relais rendent « En attente » à l’infini :');
    muets.forEach(u => console.log('  · ' + u));
  }
  if (coupes.length){
    console.log('\nInjoignables depuis cette machine (peut-être le réseau d’ici, pas eux) :');
    coupes.forEach(u => console.log('  · ' + u));
  }
  bizarres.forEach(([u, e]) => console.log('\n? ' + u + ' — à regarder : ' + e));

  /* Le seuil vaut ce qu'il vaut : DEUX porteurs suffisent à ce que deux
     appareils se trouvent, en dessous le transport public est mort. */
  if (porteurs.length < 2){
    console.log('\nÉCHEC : moins de deux relais portent la découverte — le partage et la sync ne peuvent pas marcher.');
    sortie = 1;
  }
} catch (e) {
  console.error('la sonde elle-même a échoué : ' + (e && e.message));
  sortie = 1;
} finally {
  await browser.close();
  srv.close();
}
process.exit(sortie);

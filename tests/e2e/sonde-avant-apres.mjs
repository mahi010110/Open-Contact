/* ============================================================
   SONDE — AVANT / APRÈS : le transport d'origine contre l'actuel

   « Au début le P2P marchait très bien. » Pour savoir ce qui a changé,
   on ne relit pas l'historique : on fait jouer les DEUX transports,
   au même instant, entre deux vraies machines, par les vrais relais.

   · origine  — la bibliothèque livrée le 10 juillet (d89223f, avant
                toute retouche) et la configuration de l'époque :
                `{ appId, password }`, rien d'autre — donc les cinq
                relais que la bibliothèque tire par défaut (corb,
                libernet, hornetstorage, sathoarder, basspistol) ;
   · actuelle — le bundle livré aujourd'hui (corrections comprises) et
                `RELAIS_DEFAUT`.
   La salle et le mot de passe se dérivent comme l'app l'a toujours
   fait (`promo-` + sha256), identiques d'une version à l'autre.

   Chaque machine note : les relais ouverts, la première annonce VUE
   de l'autre (la découverte), la liaison (`onPeerJoin`), un message
   aller-retour (la liaison PORTE), les erreurs, les états ICE.
   OC_SANS_DIRECT=1 retire tout candidat ICE : le NAT d'opérateur.

   usage : OC_ROLE=A|B OC_VERSION=origine|actuelle OC_SALLE=<commun>
           OC_T0=<ms> node sonde-avant-apres.mjs
           node sonde-avant-apres.mjs --bilan journal-A.json journal-B.json
   ============================================================ */
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

if (process.argv[2] === '--bilan'){
  const [A, B] = process.argv.slice(3).map(f => JSON.parse(readFileSync(f, 'utf8')));
  for (const J of [A, B]){
    console.log(`\n=== ${J.role} · transport ${J.version}${J.sansDirect ? ' · SANS chemin direct' : ''}`);
    console.log(`  relais ouverts : ${J.relaisOuverts.length}/${J.relaisTentes.length} — ${J.relaisOuverts.join(', ')}`);
    console.log(`  l'autre VU (première annonce) : ${J.vu ?? 'jamais'} · relié : ${J.relie ?? 'jamais'} · message reçu : ${J.message ?? 'jamais'}`);
    console.log(`  candidats locaux : ${JSON.stringify(J.cands)} · ICE : ${J.ice.slice(0, 12).join(' · ') || 'aucun'}`);
    if (J.erreurs.length) console.log(`  erreurs : ${J.erreurs.slice(0, 3).join(' | ')}`);
  }
  const ok = A.message && B.message;
  console.log(`\n=== ${A.version} ↔ ${B.version}${A.sansDirect ? ' · sans direct' : ''} : `
    + (ok ? 'RELIÉS, le message passe dans les deux sens'
      : (A.vu || B.vu) ? 'ils se VOIENT, mais ne se relient pas' : 'ils ne se voient même pas'));
  process.exit(0);
}

const ROLE = process.env.OC_ROLE || 'A';
const VERSION = process.env.OC_VERSION || 'actuelle';
const SALLE = process.env.OC_SALLE || 'local';
const T0 = Number(process.env.OC_T0 || Date.now() + 3000);
const SANS_DIRECT = !!process.env.OC_SANS_DIRECT;
const ORIGINE = 'd89223f';

const { chromium, chromiumPath, serveRepo, ROOT } = await import('./outils.mjs');
const { RELAIS_DEFAUT } = await import('../../engine/transport.js');
const bundleOrigine = execFileSync('git', ['-C', ROOT, 'show', ORIGINE + ':assets/vendor/trystero-nostr.min.js']);
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
/* OC_RELAIS_LOCAL : contrôle de l'instrument — les deux versions sur un relais local */
const LOCAL = process.env.OC_RELAIS_LOCAL || '';
const ctx = await browser.newContext({ ignoreHTTPSErrors: !!LOCAL });
await ctx.route('**/__sonde.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>sonde</title>' }));
await ctx.route('**/__origine.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: bundleOrigine }));
await ctx.addInitScript(sansDirect => {
  const J = window.__J = { relaisTentes: [], relaisOuverts: [], cands: {}, ice: [], erreurs: [], annonceurs: [] };
  const W = window.WebSocket;
  window.WebSocket = class extends W {
    constructor(u, ...a){ super(u, ...a); const url = String(u).replace(/^wss:\/\//, '').replace(/\/$/, '');
      J.relaisTentes.push(url);
      this.addEventListener('open', () => J.relaisOuverts.push(url));
      this.addEventListener('message', e => { try { const m = JSON.parse(e.data);
        if (m[0] !== 'EVENT' || !m[2]) return;
        const c = JSON.parse(m[2].content);
        if (c && c.peerId && !J.annonceurs.includes(c.peerId)) J.annonceurs.push(c.peerId); } catch (x) {} }); }
  };
  const PC = window.RTCPeerConnection;
  if (sansDirect){
    PC.prototype.addIceCandidate = function(){ return Promise.resolve(); };
    const srd = PC.prototype.setRemoteDescription;
    PC.prototype.setRemoteDescription = function (d, ...r){
      if (d && d.sdp) d = { type: d.type, sdp: String(d.sdp).split('\n').filter(l => !/^a=candidate:/.test(l.trim())).join('\n') };
      return srd.call(this, d, ...r);
    };
  }
  window.RTCPeerConnection = class extends PC {
    constructor(c){ super(c);
      this.addEventListener('icecandidate', e => { const s = e.candidate && e.candidate.candidate;
        const m = s && s.match(/ ([^ ]+) \d+ typ (\w+)/);
        if (m){ const k = m[2] + (m[1].endsWith('.local') ? '/mdns' : m[1].includes(':') ? '/v6' : '/v4'); J.cands[k] = (J.cands[k] || 0) + 1; } });
      this.addEventListener('iceconnectionstatechange', () => { if (this.remoteDescription) J.ice.push(this.iceConnectionState); }); }
  };
}, SANS_DIRECT);
const p = await ctx.newPage();
await p.goto(base + '/__sonde.html');
const attendre = async t => { const d = t - Date.now(); if (d > 0) await p.waitForTimeout(d); };
await attendre(T0);
console.log(`machine ${ROLE} · transport ${VERSION}${SANS_DIRECT ? ' · SANS chemin direct' : ''} · salle ${SALLE}`);
await p.evaluate(async ({ VERSION, SALLE, RELAIS_DEFAUT, ROLE, LOCAL }) => {
  const J = window.__J;
  const t0 = Date.now();
  const t = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
  const m = await import(VERSION === 'origine' ? '/__origine.js' : '/assets/vendor/trystero-nostr.min.js');
  const mdp = 'avant-apres-' + SALLE;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('opencontact·promo·' + mdp));
  const id = 'promo-' + Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
  const cfg = { appId: 'opencontact', password: mdp };
  if (LOCAL) cfg.relayConfig = { urls: [LOCAL] };
  else if (VERSION !== 'origine') cfg.relayConfig = { urls: RELAIS_DEFAUT };
  const room = m.joinRoom(cfg, id, { onJoinError: e => J.erreurs.push(t() + ' ' + String(e && e.error || e).slice(0, 120)) });
  const salut = room.makeAction('salut');
  salut.onMessage = x => { if (!J.message) J.message = t() + ' (« ' + x + ' »)'; };
  room.onPeerJoin = pid => { if (!J.relie) J.relie = t(); salut.send('bonjour de ' + ROLE, pid); };
  const iv = setInterval(() => { if (!J.vu && J.annonceurs.some(x => x !== m.selfId)) J.vu = t(); }, 200);
  window.__fin = () => clearInterval(iv);
}, { VERSION, SALLE, RELAIS_DEFAUT, ROLE, LOCAL });
/* on reste dans la salle assez longtemps pour l'autre : les deux jobs ne
   démarrent pas toujours ensemble, et celui qui a reçu doit encore être
   là quand l'autre attend sa réponse */
for (let i = 0; i < 240; i++){
  await p.waitForTimeout(1000);
  const J = await p.evaluate(() => window.__J);
  if (J.message && Date.now() - T0 > 45000) break;
}
const J = await p.evaluate(() => { window.__fin && window.__fin(); const J = window.__J; delete J.annonceurs; return J; });
J.role = ROLE; J.version = VERSION; J.sansDirect = SANS_DIRECT;
J.relaisTentes = [...new Set(J.relaisTentes)]; J.relaisOuverts = [...new Set(J.relaisOuverts)];
console.log(JSON.stringify(J, null, 1));
writeFileSync('journal-' + ROLE + '.json', JSON.stringify(J));
await browser.close();
server.close();

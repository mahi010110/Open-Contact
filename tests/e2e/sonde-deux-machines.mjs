/* ============================================================
   SONDE — DEUX MACHINES, DEUX RÉSEAUX, LA VRAIE CHAÎNE

   Le labo NAT (labo-nat/) prouve ce qui casse une liaison entre deux
   box « propres », mais il remplace trois choses réelles : les STUN
   de Google et Cloudflare, les relais publics, et les NAT du monde.
   Il ne peut donc pas dire pourquoi deux vrais appareils sur deux
   vrais réseaux ne se relient pas.

   Ici rien n'est remplacé. Deux machines DISTINCTES (deux jobs de la
   CI : deux VM, deux adresses publiques, deux NAT), l'app telle
   qu'elle est livrée, `RELAIS_DEFAUT`, les STUN par défaut de
   Trystero. Chacune ouvre « Partage en groupe » avec le même mot de
   passe et JOURNALISE chaque étape :
     · ce que ses STUN lui répondent (et le type de son NAT) ;
     · chaque publication vers chaque relais, son accusé, sa raison ;
     · chaque événement reçu, rapproché par identifiant ;
     · les candidats ICE qu'elle rassemble, ceux qu'elle REÇOIT de
       l'autre (dans le SDP ou à part), les états ICE, la paire retenue.
   Un troisième temps (`--bilan`) croise les deux journaux et dit à
   quelle étape la liaison s'arrête.

   usage : OC_ROLE=A|B OC_SALLE=<commun> node sonde-deux-machines.mjs
           node sonde-deux-machines.mjs --bilan journal-A.json journal-B.json
   ============================================================ */
import { writeFileSync, readFileSync } from 'node:fs';

const court = u => String(u || '').replace(/^wss?:\/\//, '').replace(/\/$/, '');

/* ---------------- le bilan : deux journaux croisés ---------------- */
if (process.argv[2] === '--bilan'){
  const [A, B] = process.argv.slice(3).map(f => JSON.parse(readFileSync(f, 'utf8')));
  const dire = (...x) => console.log(...x);
  for (const J of [A, B]){
    dire(`\n=== machine ${J.role} · ${J.navigateur}`);
    dire(`  STUN : ${J.stun.map(s => s.url + ' → ' + (s.srflx.join(', ') || 'RIEN' + (s.erreurs.length ? ' (' + s.erreurs.join(' | ') + ')' : ''))).join('\n         ')}`);
    dire(`  NAT : ${J.nat}`);
    dire(`  écran final : « ${J.ecran} » · relié : ${J.relie ? 'OUI' : 'NON'}${J.echec ? ' · cause : ' + J.echec : ''}`);
    dire(`  relais (état de l'app) : ${JSON.stringify(J.relais)}`);
    dire(`  candidats rassemblés : ${JSON.stringify(J.candsLocaux)}`);
    dire(`  candidats REÇUS de l'autre : SDP ${JSON.stringify(J.candsSdp)} · à part ${JSON.stringify(J.candsTrickle)}`);
    dire(`  erreurs ICE (STUN/TURN) : ${J.erreursIce.slice(0, 6).join(' | ') || 'aucune'}`);
    dire(`  paires : ${J.paires.slice(0, 8).join(' | ') || 'aucune'}`);
    dire(`  chronologie ICE : ${J.trace.slice(0, 30).join(' · ')}`);
    dire(`  écrans successifs : ${(J.ecrans || []).join(' → ')}`);
    dire(`  relais composés : ${Array.isArray(J.relaisComposes) ? J.relaisComposes.map(court).join(', ') : J.relaisComposes}`);
  }
  const echecs = [A, B].map(J => J.trace.filter(x => / (failed|disconnected)$/.test(x)).length);
  const premiere = echecs.every(n => !n) ? 'RÉUSSIE' : 'ÉCHOUÉE (' + echecs.join('/') + ' échec(s) ICE avant la liaison)';
  dire(`\n=== première tentative : ${premiere} · reliés : ${A.relie && B.relie ? 'OUI' : 'NON'}`);
  for (const [X, Y] of [[A, B], [B, A]]){
    const recu = new Map(Y.recus.map(r => [r.id, r]));
    const ack = new Map(X.acks.map(a => [a.id, a]));
    const types = {};
    for (const e of X.envoyes){
      if (e.type === 'annonce') continue;
      const t = types[e.type] || (types[e.type] = { envoyes: 0, acceptes: 0, refuses: [], livres: 0, relais: {} });
      t.envoyes++;
      const a = ack.get(e.id);
      if (a && a.ok) t.acceptes++;
      if (a && !a.ok) t.refuses.push(court(e.relais) + ' : ' + a.raison);
      if (recu.has(e.id)) t.livres++;
      const r = t.relais[court(e.relais)] || (t.relais[court(e.relais)] = [0, 0]);
      r[0]++; if (recu.has(e.id)) r[1]++;
    }
    dire(`\n=== négociation ${X.role} → ${Y.role}`);
    for (const [type, t] of Object.entries(types))
      dire(`  ${type.padEnd(9)} envoyés ${t.envoyes} · OK ${t.acceptes} · livrés ${t.livres}`
        + (t.refuses.length ? ' · REFUSÉS ' + t.refuses.join(' ; ') : '')
        + ' · par relais ' + Object.entries(t.relais).map(([u, [e, l]]) => u + ' ' + l + '/' + e).join(', '));
    const annonces = X.envoyes.filter(e => e.type === 'annonce');
    const annRecues = annonces.filter(e => recu.has(e.id)).length;
    const annRef = annonces.filter(e => ack.get(e.id) && !ack.get(e.id).ok);
    dire(`  annonces   envoyées ${annonces.length} · reçues par ${Y.role} ${annRecues}`
      + (annRef.length ? ' · refusées ' + annRef.length + ' (' + [...new Set(annRef.map(e => court(e.relais) + ' : ' + ack.get(e.id).raison))].join(' ; ') + ')' : ''));
  }
  process.exit(0);
}

/* ---------------- une machine ---------------- */
const ROLE = process.env.OC_ROLE || 'A';
const SALLE = process.env.OC_SALLE || 'local';
const ATTENTE = Number(process.env.OC_ATTENTE || 240000);

/* posé AVANT tout script de la page : les WebSockets des relais et les
   RTCPeerConnection de Trystero passent par ces enveloppes */
const INSTRUMENT = () => {
  const J = window.__J = { envoyes: [], acks: [], recus: [], candsLocaux: {}, candsSdp: {}, candsTrickle: {},
    erreursIce: [], trace: [], pcs: [] };
  const T0 = Date.now();
  const t = () => ((Date.now() - T0) / 1000).toFixed(1) + 's';
  const typeDe = c => { try { const o = JSON.parse(c);
    return o.offer ? 'offre' : o.answer ? 'réponse' : o.candidate ? 'candidat' : 'annonce'; } catch (e) { return '?'; } };
  const WS = window.WebSocket;
  window.WebSocket = class extends WS {
    constructor(u, p){ super(u, p); const url = String(u);
      this.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (!Array.isArray(m)) return;
        if (m[0] === 'OK') J.acks.push({ id: m[1], ok: m[2] === true, raison: String(m[3] || '') });
        else if (m[0] === 'EVENT' && m[2]) J.recus.push({ id: m[2].id, type: typeDe(m[2].content), relais: url, t: t() }); });
      this.__u = url; }
    send(d){ try { const m = JSON.parse(d);
      if (m[0] === 'EVENT' && m[1]) J.envoyes.push({ id: m[1].id, type: typeDe(m[1].content), relais: this.__u, t: t() }); } catch (e) {}
      return super.send(d); }
  };
  /* un candidat « typ srflx » / « typ host » + sa famille d'adresse */
  const genre = s => { const m = String(s || '').match(/ ([^ ]+) \d+ typ (\w+)/);
    if (!m) return '?'; const a = m[1];
    return m[2] + (a.endsWith('.local') ? '/mdns' : a.includes(':') ? '/v6' : '/v4'); };
  const compter = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const PC = window.RTCPeerConnection;
  let n = 0;
  window.RTCPeerConnection = class extends PC {
    constructor(c){ super(c); const id = ++n; J.pcs.push(this);
      this.addEventListener('icecandidate', e => { if (e.candidate && e.candidate.candidate) compter(J.candsLocaux, genre(e.candidate.candidate)); });
      this.addEventListener('icecandidateerror', e => {
        const k = (e.url || '?') + ' ' + e.errorCode + ' ' + (e.errorText || '');
        if (!J.erreursIce.includes(k)) J.erreursIce.push(k); });
      this.addEventListener('iceconnectionstatechange', () => {
        if (this.remoteDescription) J.trace.push(t() + ' pc' + id + ' ' + this.iceConnectionState); });
      this.__id = id; }
    setRemoteDescription(d){
      if (d && d.sdp){
        J.trace.push(t() + ' pc' + this.__id + ' reçoit ' + d.type);
        (d.sdp.match(/a=candidate:[^\r\n]*/g) || []).forEach(l => compter(J.candsSdp, genre(l)));
      }
      return super.setRemoteDescription(d); }
    addIceCandidate(c){
      if (c && c.candidate) compter(J.candsTrickle, genre(c.candidate));
      return super.addIceCandidate(c); }
  };
};

/* les STUN par défaut de Trystero, un par un, et le type de NAT :
   deux STUN distincts, un port public = NAT ordinaire, deux = symétrique */
const SONDE_STUN = async () => {
  const urls = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302', 'stun:stun.cloudflare.com:3478'];
  const une = async iceServers => {
    const pc = new RTCPeerConnection({ iceServers });
    pc.createDataChannel('x');
    const srflx = new Set(), erreurs = [];
    pc.onicecandidate = e => { const c = e.candidate; if (c && c.type === 'srflx') srflx.add(c.address + ':' + c.port + '/' + c.protocol); };
    pc.onicecandidateerror = e => erreurs.push(e.errorCode + ' ' + (e.errorText || ''));
    await pc.setLocalDescription();
    await new Promise(r => setTimeout(r, 4000));
    pc.close();
    return { srflx: [...srflx], erreurs };
  };
  const stun = [];
  for (const u of urls) stun.push({ url: u, ...(await une([{ urls: u }])) });
  const mix = await une([{ urls: urls[0] }, { urls: urls[3] }]);
  const v4 = mix.srflx.filter(s => !s.split(':').slice(0, -1).join(':').includes(':') && s.endsWith('/udp'));
  const ips = new Set(v4.map(s => s.split(':')[0]));
  const nat = !v4.length ? 'INCONNU (aucun srflx IPv4)'
    : v4.length > ips.size ? 'SYMÉTRIQUE — un port public par destination : ' + v4.join(', ')
    : 'ordinaire — port public stable : ' + v4.join(', ');
  return { stun, nat };
};

/* Playwright n'est chargé que pour une machine : le bilan n'en a pas besoin */
const { chromium, chromiumPath, serveRepo } = await import('./outils.mjs');
const { server, base } = await serveRepo();
/* OC_NAVIGATEUR=webkit : le moteur de Safari, celui de l'iPhone — la
   même sonde, l'autre moteur (Playwright l'installe sur un runner) */
const WEBKIT = process.env.OC_NAVIGATEUR === 'webkit';
const browser = WEBKIT
  ? await (await import(process.env.OC_PLAYWRIGHT || 'playwright')).webkit.launch()
  : await chromium.launch({ executablePath: chromiumPath() });
const journal = { role: ROLE, navigateur: (WEBKIT ? 'WebKit ' : 'Chromium ') + browser.version() };
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true,
    ignoreHTTPSErrors: !!process.env.OC_RELAIS_LOCAL });
  await ctx.addInitScript(INSTRUMENT);
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('   [console]', m.text().slice(0, 200)); });
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  /* essai local : un relais du poste au lieu des vrais.
     OC_SANS_RELAIS=a,b : la liste livrée MOINS ces relais — l'épreuve
     d'un correctif, jouée dans les mêmes conditions que le constat */
  const liste = process.env.OC_RELAIS_LOCAL ? [process.env.OC_RELAIS_LOCAL]
    : process.env.OC_SANS_RELAIS ? (await import('../../engine/transport.js')).RELAIS_DEFAUT
      .filter(u => !process.env.OC_SANS_RELAIS.split(',').some(x => x && u.includes(x))) : null;
  if (liste){
    await p.evaluate(async l => { const st = await import('./engine/storage.js');
      await st.kvInit(); await st.kvSet(st.RELAYS_KEY, JSON.stringify(l)); }, liste);
    await p.reload({ waitUntil: 'load' });
    await p.waitForSelector('#view-aujourdhui:not([hidden])');
  }
  journal.relaisComposes = liste || 'RELAIS_DEFAUT';
  Object.assign(journal, await p.evaluate(SONDE_STUN));
  console.log(ROLE + ' · NAT : ' + journal.nat);
  for (const s of journal.stun) console.log('   ' + s.url + ' → ' + (s.srflx.join(', ') || 'RIEN ' + s.erreurs.join(' | ')));

  /* OC_DELAI_MS : on arrive APRÈS l'autre, comme un camarade qui sort son
     téléphone — celui qui attend a publié pendant tout ce temps */
  if (process.env.OC_DELAI_MS) await p.waitForTimeout(Number(process.env.OC_DELAI_MS));
  /* la vraie app : « Partage en groupe », même mot de passe des deux côtés */
  await p.click('.bottomnav a[data-r="echanger"]');
  await p.waitForSelector('#ecPromo'); await p.click('#ecPromo');
  await p.waitForSelector('#prPass'); await p.fill('#prPass', 'sonde-deux-machines-' + SALLE);
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('#prStatus');
  const t0 = Date.now();
  const vus = [];
  let relie = false;
  while (Date.now() - t0 < ATTENTE){
    await p.waitForTimeout(1000);
    const s = ((await p.textContent('#prStatus').catch(() => '')) || '').trim();
    const sec = ((Date.now() - t0) / 1000).toFixed(0);
    if (!vus.length || vus[vus.length - 1].split(' s · ')[1] !== s){ vus.push(sec + ' s · ' + s); console.log('   ' + sec + ' s · « ' + s + ' »'); }
    if (/camarade/.test(s)){ relie = true; break; }
  }
  /* on reste un moment : l'autre machine finit peut-être sa négociation */
  await p.waitForTimeout(20000);
  const fin = await p.evaluate(async () => {
    const sl = await import('./ui/synclive.js');
    const J = window.__J;
    const paires = [];
    for (const pc of J.pcs){
      if (pc.connectionState === 'closed' || !pc.remoteDescription) continue;
      try {
        const st = await pc.getStats(); const c = {};
        st.forEach(r => { if (r.type === 'local-candidate' || r.type === 'remote-candidate') c[r.id] = r; });
        st.forEach(r => { if (r.type === 'candidate-pair' && (r.nominated || r.state === 'failed' || r.state === 'succeeded'))
          paires.push(r.state + ' ' + (c[r.localCandidateId]?.candidateType || '?') + '→' + (c[r.remoteCandidateId]?.candidateType || '?')); });
      } catch (e) {}
    }
    return { relais: sl.relaySnapshot(), echec: sl.echecLiaison(), paires: [...new Set(paires)],
      envoyes: J.envoyes, acks: J.acks, recus: J.recus, candsLocaux: J.candsLocaux, candsSdp: J.candsSdp,
      candsTrickle: J.candsTrickle, erreursIce: J.erreursIce, trace: J.trace };
  });
  Object.assign(journal, fin, { relie, ecran: (vus[vus.length - 1] || '').split(' s · ')[1] || '', ecrans: vus });
  console.log(ROLE + ' · ' + (relie ? 'RELIÉ' : 'PAS RELIÉ') + ' · écran « ' + journal.ecran + ' »'
    + (journal.echec ? ' · cause ' + journal.echec : ''));
} catch (e) {
  journal.erreur = String(e && e.message);
  console.error('la sonde elle-même a échoué : ' + journal.erreur);
} finally {
  writeFileSync('journal-' + ROLE + '.json', JSON.stringify(journal));
  await browser.close();
  server.close();
}

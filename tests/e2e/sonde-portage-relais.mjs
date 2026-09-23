/* ============================================================
   OpenContact — sonde : ce que les relais PORTENT, en taille et en rafale

   Quand deux téléphones se trouvent par les relais mais qu'aucun chemin
   direct ne s'ouvre entre eux (NAT d'opérateur, pas de TURN), les
   fiches du rendez-vous passent PAR les relais eux-mêmes, chiffrées
   par le code (engine/portage.js). Cette voie ne vaut que ce que les
   relais acceptent de transporter : un événement éphémère trop gros est
   refusé ou avalé, une rafale trop serrée se fait limiter.

   On ne choisit donc pas la taille d'une part ni le rythme d'envoi :
   on les MESURE, relais par relais, sur la liste que l'app compose
   vraiment (`RELAIS_DEFAUT`), par le même chemin que l'app — le bundle
   vendorisé, sa signature, ses abonnements (`relayTopic`).

   Deux pages : A s'abonne, B publie. Pour chaque relais, B envoie des
   événements de taille croissante PAR CE SEUL RELAIS, puis une rafale
   de parts de la taille retenue. A compte ce qui arrive, relais par
   relais. Les refus explicites (`OK false`) sont relevés à part : un
   refus et un silence n'appellent pas le même remède.

   Contrôle : un relais local (relais-local.mjs) sondé par la MÊME
   fonction — s'il ne porte pas tout, c'est l'instrument qui a tort.

   Réseau sortant requis : OC_SONDE_RELAIS=1 (sinon, seul le contrôle).
   ============================================================ */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { RELAIS_DEFAUT } from '../../engine/transport.js';

const TAILLES = [2000, 8000, 16000, 32000, 48000, 64000, 100000];
const RAFALE = { n: 12, taille: 12000, pas: 150 };

const relay = await startLocalRelay({ tls: true });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });

async function page(){
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('   [page] ' + m.text().slice(0, 200)); });
  await p.goto(base + '/index.html', { waitUntil: 'load' });
  return p;
}

async function sonder(urls){
  const [A, B] = [await page(), await page()];
  const topic = 'oc-sonde-portage-' + Math.random().toString(36).slice(2);
  const ouvrir = (p, urls) => p.evaluate(async ({ urls }) => {
    const m = await import('./assets/vendor/trystero-nostr.min.js');
    window.__m = m;
    window.__room = m.joinRoom({ appId: 'opencontact-sonde', password: 'sonde', relayConfig: { urls } },
      'sonde-' + Math.random().toString(36).slice(2));
    const dort = ms => new Promise(r => setTimeout(r, ms));
    await Promise.all(m.relayTopic.clients().map(c => Promise.race([c.ready, dort(10000)])));
    /* les refus explicites, relais par relais */
    window.__refus = {};
    const socks = m.getRelaySockets();
    for (const k in socks) socks[k].addEventListener('message', e => {
      const d = String(e.data);
      if (d.indexOf('"OK"') < 0 || d.length > 4096) return;
      try {
        const x = JSON.parse(d);
        if (x[0] === 'OK' && x[2] === false) (window.__refus[k] = window.__refus[k] || []).push(String(x[3] || '').slice(0, 80));
      } catch (er) {}
    });
    return m.relayTopic.clients().map(c => [c.url, c.socket && c.socket.readyState]);
  }, { urls });
  const etatA = await ouvrir(A, urls);
  const etatB = await ouvrir(B, urls);
  await A.evaluate(topic => {
    window.__recu = [];
    for (const c of window.__m.relayTopic.clients())
      window.__m.relayTopic.subscribe(c, topic, (t, content) =>
        window.__recu.push({ par: c.url, tete: content.slice(0, content.indexOf('|', content.indexOf('|') + 1)), n: content.length }));
  }, topic);
  await A.waitForTimeout(2500);
  /* tailles croissantes, un relais à la fois pour chaque événement */
  await B.evaluate(async ({ topic, TAILLES, RAFALE }) => {
    const dort = ms => new Promise(r => setTimeout(r, ms));
    const alea = n => {
      const u = new Uint8Array(Math.ceil(n * 3 / 4));
      for (let i = 0; i < u.length; i += 65536) crypto.getRandomValues(u.subarray(i, i + 65536));
      let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      return btoa(s).slice(0, n);
    };
    const T = window.__m.relayTopic;
    for (const taille of TAILLES){
      for (const c of T.clients()) T.publish(c, topic, 'T' + taille + '|' + c.url + '|' + alea(taille)).catch(() => {});
      await dort(1200);
    }
    await dort(1500);
    /* la rafale : ce qu'un envoi de plusieurs parts demande réellement */
    for (let i = 0; i < RAFALE.n; i++){
      for (const c of T.clients()) T.publish(c, topic, 'R' + i + '|' + c.url + '|' + alea(RAFALE.taille)).catch(() => {});
      await dort(RAFALE.pas);
    }
  }, { topic, TAILLES, RAFALE });
  await A.waitForTimeout(5000);
  const recu = await A.evaluate(() => window.__recu);
  const refus = await B.evaluate(() => window.__refus);
  const bilan = {};
  for (const [url] of etatB) bilan[url] = { tailles: [], rafale: 0, refus: (refus[url] || refus[url + '/'] || []) };
  const cle = u => bilan[u] ? u : Object.keys(bilan).find(k => k.replace(/\/$/, '') === u.replace(/\/$/, ''));
  const vus = new Set();
  for (const r of recu){
    const [tete, url] = r.tete.split('|');
    const k = cle(url);
    if (!k || cle(r.par) !== k) continue;          /* on ne compte que ce qu'un relais porte POUR LUI-MÊME */
    const id = k + tete;
    if (vus.has(id)) continue;
    vus.add(id);
    if (tete[0] === 'T') bilan[k].tailles.push(+tete.slice(1));
    else bilan[k].rafale++;
  }
  await A.context().close(); await B.context().close();
  return { bilan, etatA, etatB };
}

const affiche = (titre, { bilan }) => {
  console.log('\n' + titre);
  for (const [url, b] of Object.entries(bilan)){
    const max = b.tailles.length ? Math.max(...b.tailles) : 0;
    const trous = TAILLES.filter(t => t <= max && !b.tailles.includes(t));
    console.log('  ' + url.padEnd(38) + ' plus gros porté : ' + String(max).padStart(6) + ' o'
      + (trous.length ? ' (manquent ' + trous.join(', ') + ')' : '')
      + ' · rafale ' + b.rafale + '/' + RAFALE.n
      + (b.refus.length ? ' · refus : ' + [...new Set(b.refus)].slice(0, 3).join(' / ') : ''));
  }
};

let fautes = 0;
try {
  const ctrl = await sonder([relay.url]);
  affiche('Contrôle — relais local', ctrl);
  const b = Object.values(ctrl.bilan)[0];
  if (!b || b.tailles.length !== TAILLES.length || b.rafale !== RAFALE.n){
    fautes++;
    console.error('✗ le relais local ne porte pas tout : c’est la SONDE qui est cassée, pas les relais publics');
  }
  if (process.env.OC_SONDE_RELAIS === '1' && !fautes){
    const vrai = await sonder(RELAIS_DEFAUT);
    affiche('Relais publics — RELAIS_DEFAUT', vrai);
    const porteurs = Object.values(vrai.bilan).filter(x => x.tailles.includes(16000) && x.rafale >= RAFALE.n - 1).length;
    console.log('\n' + porteurs + ' relais portent des parts de 16 Ko ET une rafale de ' + RAFALE.n + ' parts de ' + RAFALE.taille + ' o');
  }
} finally {
  await browser.close();
  server.close();
  relay.close();
}
if (fautes) process.exit(1);

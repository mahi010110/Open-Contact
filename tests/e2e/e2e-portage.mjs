/* ============================================================
   E2E — LE PORTAGE PAR RELAIS, quand il faut plusieurs parts

   `e2e-liaison.mjs` prouve le cas courant : aucun chemin direct, 26
   pistes, une seule part, et les fiches passent par les relais. Ici,
   ce qui ne se voit pas avec une part :

   ① UN GROS PARTAGE (300 pistes, six parts) DONT UNE PART SE PERD.
     Le relais en refuse une, une seule fois — ce que fait un relais
     public chargé. Le receveur doit la redemander, et elle seule ; le
     donneur doit la renvoyer ; l'aperçu doit compter les 300. Sans la
     redemande, l'échange resterait bloqué à 5/6 jusqu'au repli.
   ② LE RELAIS NE LIT RIEN. Tout ce qu'il a vu passer sur le sujet du
     portage est relevé : ni un nom de piste, ni une ville, ni le code
     du rendez-vous. Le portage change le tuyau, il ne doit rien
     changer à ce qu'un tiers peut lire.

   Le chemin direct est coupé des deux côtés, comme dans
   `e2e-liaison.mjs` — et le témoin des canaux de données le prouve.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

let fautes = 0;
const fail = m => { fautes++; console.error('✗ ' + m); };

/* ce que le relais voit passer sur le sujet du portage */
const vus = [];
let grosses = 0, perdue = false;
const relay = await startLocalRelay({ tls: true, filtre: ev => {
  const x = (ev.tags || []).find(t => t[0] === 'x');
  if (!x || !/^oc-portage-/.test(x[1])) return null;
  vus.push(String(ev.content || ''));
  /* la troisième part publiée se perd, une fois */
  if (String(ev.content || '').length > 1500 && ++grosses === 3 && !perdue){ perdue = true; return 'rate-limited: slow down'; }
  return null;
} });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });

const COUPE_ICE = () => {
  RTCPeerConnection.prototype.addIceCandidate = function(){ return Promise.resolve(); };
  const srd = RTCPeerConnection.prototype.setRemoteDescription;
  RTCPeerConnection.prototype.setRemoteDescription = function (d, ...r){
    if (d && d.sdp)
      d = { type: d.type, sdp: String(d.sdp).split('\n')
        .filter(l => !/^a=candidate:/.test(l.trim())).join('\n') };
    return srd.call(this, d, ...r);
  };
  window.__canauxOuverts = 0;
  const compter = ch => ch && ch.addEventListener('open', () => { window.__canauxOuverts++; });
  const cdc = RTCPeerConnection.prototype.createDataChannel;
  RTCPeerConnection.prototype.createDataChannel = function (...a){ const ch = cdc.apply(this, a); compter(ch); return ch; };
  const ael = RTCPeerConnection.prototype.addEventListener;
  const Orig = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends Orig {
    constructor(...a){ super(...a); ael.call(this, 'datachannel', e => compter(e.channel)); }
  };
};

const page = async n => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(COUPE_ICE);
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(async ([url, n]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
    if (!n) return;
    const rnd = len => Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
      id: 'gros-' + i, name: 'Piste portée ' + i, city: 'Roubaix',
      status: 'todo', desc: rnd(120), updatedAt: 1000 + i
    }))));
  }, [relay.url, n]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
};

try {
  const G = await page(300), P = await page(0);
  await G.click('.bottomnav a[data-r="echanger"]');
  await G.waitForSelector('#ecGive'); await G.click('#ecGive');
  await G.waitForSelector('#dnQR'); await G.click('#dnQR');
  await G.waitForSelector('.sy-phrase span', { timeout: 25000 });
  const code = (await G.textContent('.sy-phrase span')).trim();
  await P.click('.bottomnav a[data-r="echanger"]');
  await P.waitForSelector('#ecRecv'); await P.click('#ecRecv');
  await P.waitForSelector('#rcScan'); await P.click('#rcScan');
  await P.waitForSelector('#rcCode');
  await P.fill('#rcCode', code);
  await P.waitForSelector('#rcCodeGo:not([hidden])');
  await P.click('#rcCodeGo');
  /* ce que dit l'écran du receveur, au fil de l'eau */
  await P.waitForSelector('#rcRdvSt');
  await P.evaluate(() => {
    window.__etats = [];
    const el = document.getElementById('rcRdvSt');
    new MutationObserver(() => window.__etats.push(el.textContent.trim()))
      .observe(el, { childList: true, characterData: true, subtree: true });
  });

  const recu = await P.waitForSelector('.rc-big', { timeout: 60000 }).then(() => true).catch(() => false);
  const recap = recu ? (await P.textContent('.rc-big')).trim() : '';
  await attendre(G, () => /Envoyé/.test(document.querySelector('#dnRdvSt')?.textContent || ''),
    { timeout: 15000, pas: 500 }).catch(() => {});
  const stG = ((await G.textContent('#dnRdvSt').catch(() => '')) || '').trim();
  const etats = await P.evaluate(() => window.__etats || []);
  const canaux = [await G.evaluate(() => window.__canauxOuverts), await P.evaluate(() => window.__canauxOuverts)];
  const progres = etats.filter(e => /réception… \d+\/\d+/.test(e));

  if (canaux.some(Boolean))
    fail('un canal direct s’est ouvert (' + canaux.join(' / ') + ') — le chemin direct n’est plus coupé, '
      + 'et ce scénario ne prouve plus rien du portage');
  else if (!perdue)
    fail('le relais n’a perdu aucune part — la redemande n’a pas été éprouvée (' + grosses + ' part(s) vue(s))');
  else if (!recu)
    fail('PART PERDUE : le receveur n’a jamais rassemblé le partage. États vus : ' + JSON.stringify(etats.slice(-6)));
  else if (!/300 pistes/.test(recap))
    fail('l’aperçu ne compte pas les 300 pistes — « ' + recap + ' »');
  else if (!progres.length)
    fail('six parts, et l’écran n’a jamais dit que ça avançait — états : ' + JSON.stringify(etats));
  else if (!/Envoyé ✓ — 1 appareil/.test(stG))
    fail('les fiches sont arrivées, le donneur ne le sait pas — « ' + stG + ' »');
  else console.log('300 pistes : ' + grosses + ' publications de parts, dont une perdue puis redemandée : l’aperçu compte les 300, '
    + 'l’écran a dit « ' + progres[progres.length - 1] + ' », le donneur « ' + stG + ' » ✓');

  await G.context().close(); await P.context().close();

  /* ③ LE GROUPE, SANS CHEMIN DIRECT. Deux camarades entrent dans le
     même groupe ; aucun canal ne peut s'ouvrir entre eux. Ils doivent
     quand même se COMPTER (« 1 camarade dans le groupe ») — sinon le
     bouton d'envoi reste éteint et l'écran dit « En attente de ton
     groupe » pendant que le groupe est là — et l'envoi doit arriver. */
  {
    const C = await page(40), D = await page(0);
    const entrer = async p => {
      await p.click('.bottomnav a[data-r="echanger"]');
      await p.waitForSelector('#ecPromo'); await p.click('#ecPromo');
      await p.waitForSelector('#prPass'); await p.fill('#prPass', 'groupe-sans-direct');
      await p.click('.modal-f .btn-primary');
      await p.waitForSelector('#prStatus');
    };
    await entrer(C); await entrer(D);
    const compte = await Promise.all([C, D].map(p => attendre(p,
      () => /1<\/b> camarade|1 camarade/.test(document.querySelector('#prStatus')?.innerHTML || ''),
      { timeout: 30000, pas: 500 }).then(() => true, () => false)));
    const stC = ((await C.textContent('#prStatus').catch(() => '')) || '').trim();
    if (!compte.every(Boolean))
      fail('GROUPE SANS DIRECT : les deux camarades ne se comptent pas — « ' + stC + ' ». C’est la '
        + 'capture de la 5G : « En attente de ton groupe » pendant que le groupe est là');
    else {
      await C.waitForSelector('.modal-f .btn-primary:not([disabled])', { timeout: 10000 });
      await C.click('.modal-f .btn-primary');
      const recu = await D.waitForSelector('.rc-big', { timeout: 30000 }).then(() => true).catch(() => false);
      const recap = recu ? (await D.textContent('.rc-big')).trim() : '';
      const canauxG = [await C.evaluate(() => window.__canauxOuverts), await D.evaluate(() => window.__canauxOuverts)];
      if (canauxG.some(Boolean)) fail('groupe : un canal direct s’est ouvert — le scénario ne coupe plus rien');
      else if (!recu) fail('GROUPE SANS DIRECT : l’envoi n’arrive pas par les relais');
      else if (!/40 pistes/.test(recap)) fail('groupe : l’aperçu ne compte pas les 40 pistes — « ' + recap + ' »');
      else console.log('groupe sans chemin direct : les deux camarades se comptent (« ' + stC
        + ' »), et les 40 pistes arrivent par les relais ✓');
    }
    await C.context().close(); await D.context().close();
  }

  /* ② le relais n'a vu que du chiffré */
  const clair = vus.filter(c => /Piste|Roubaix|companies|share/.test(c) || c.includes(code.replace('-', '')));
  if (!vus.length) fail('aucun événement de portage relevé — le contrôle de lecture ne mesure rien');
  else if (clair.length) fail('le relais a lu du CLAIR sur le sujet du portage : ' + clair[0].slice(0, 80));
  else console.log(vus.length + ' événements de portage vus par le relais : aucun nom, aucune ville, aucun code ✓');
} finally {
  await browser.close();
  server.close();
  relay.close();
}
if (fautes){ console.error('\nE2E portage : ' + fautes + ' faute(s)'); process.exit(1); }
console.log('E2E portage : OK');

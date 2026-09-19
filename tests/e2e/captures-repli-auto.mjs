/* ============================================================
   CAPTURES — le repli hors ligne se prend TOUT SEUL

   §9 : toute retouche visible se termine par une capture QU'ON
   REGARDE, les deux ergonomies et les deux thèmes. Ce qui change
   ici n'est pas un pixel mais un ENCHAÎNEMENT : la liaison directe
   échoue, et les deux téléphones passent d'eux-mêmes au QR hors
   ligne — celui qui donne l'affiche, celui qui reçoit rouvre son
   scanner. Sans image, on ne vérifie que des chiffres.

   La panne est reproduite comme dans `e2e-liaison.mjs` : on retire
   au receveur tout candidat ICE, les « trickle » ET ceux embarqués
   dans le SDP. Sans le second, deux pages de la même machine se
   relient par la boucle locale et il ne se passe rien.

   Outil de développement : rien ici n'est chargé par l'app.
   ============================================================ */
import path from 'node:path';
import { chromium, chromiumPath, SHOTS, serveRepo, attendre } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

const { server, base } = await serveRepo();
const relais = await startLocalRelay({ tls: true });
/* une fausse caméra, sinon le scanner du receveur rend « Caméra
   indisponible » et la capture montrerait un cas de bord */
const browser = await chromium.launch({ executablePath: chromiumPath(),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

const COUPE_ICE = () => {
  RTCPeerConnection.prototype.addIceCandidate = function(){ return Promise.resolve(); };
  const srd = RTCPeerConnection.prototype.setRemoteDescription;
  RTCPeerConnection.prototype.setRemoteDescription = function (d, ...r){
    if (d && d.sdp)
      d = { type: d.type, sdp: String(d.sdp).split('\n')
        .filter(l => !/^a=candidate:/.test(l.trim())).join('\n') };
    return srd.call(this, d, ...r);
  };
};

const ERGOS = [
  ['telephone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ['poste', { viewport: { width: 1280, height: 800 } }]
];

for (const [nomErgo, opts] of ERGOS){
  for (const theme of ['clair', 'sombre']){
    const pages = [];
    const ctxs = [];
    for (const [role, n] of [['donneur', 26], ['receveur', 0]]){
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true, permissions: ['camera'], ...opts });
      const p = await ctx.newPage();
      if (theme === 'sombre') await p.emulateMedia({ colorScheme: 'dark' });
      await p.addInitScript(COUPE_ICE);
      await p.goto(base, { waitUntil: 'load' });
      /* le thème se pose dans le STOCKAGE puis on recharge : `app.js`
         réécrit l'attribut au démarrage, et une capture « sombre »
         posée sur le `dataset` sortait en clair sans rien signaler */
      await p.evaluate(async ([url, n, role, sombre]) => {
        const st = await import('./engine/storage.js');
        await st.kvInit();
        await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
        if (sombre){
          await st.kvSet(st.THEME_KEY, 'dark');
          try { localStorage.setItem('oc_theme', 'dark'); } catch (e) {}
        }
        if (!n) return;
        const rnd = len => Array.from(crypto.getRandomValues(new Uint8Array(len)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
          id: role + '-' + i, name: 'Piste ' + i, city: 'Lille',
          status: 'todo', desc: rnd(120), updatedAt: 1000 + i
        }))));
      }, [relais.url, n, role, theme === 'sombre']);
      await p.reload({ waitUntil: 'load' });
      const pose = await p.getAttribute('html', 'data-theme');
      const attendu = theme === 'sombre' ? 'dark' : 'light';
      if (pose !== attendu)
        throw new Error(`thème non appliqué : « ${pose} » au lieu de « ${attendu} » — la capture mentirait`);
      ctxs.push(ctx); pages.push(p);
    }
    const [G, P] = pages;
    const nav = nomErgo === 'telephone' ? '.bottomnav' : '.topnav';

    await G.click(nav + ' a[data-r="echanger"]');
    await G.waitForSelector('#ecGive'); await G.click('#ecGive');
    await G.waitForSelector('#dnQR'); await G.click('#dnQR');
    await G.waitForSelector('.sy-phrase span', { timeout: 25000 });
    const code = (await G.textContent('.sy-phrase span')).trim();

    await P.click(nav + ' a[data-r="echanger"]');
    await P.waitForSelector('#ecRecv'); await P.click('#ecRecv');
    await P.waitForSelector('#rcScan'); await P.click('#rcScan');
    await P.waitForSelector('#rcCode');
    await P.fill('#rcCode', code);
    await P.waitForSelector('#rcCodeGo:not([hidden])');
    await P.click('#rcCodeGo');

    /* AVANT : le rendez-vous, des deux côtés — c'est la moitié de
       l'image, sans quoi on ne voit pas d'où l'app est partie */
    await G.screenshot({ path: path.join(SHOTS, `repli-auto-avant-donneur-${nomErgo}-${theme}.png`) });

    /* APRÈS : on attend le basculement, jamais un délai */
    await attendre(G, () => !!document.querySelector('.qr-wrap[aria-label="QR à faire scanner"]'),
      { timeout: 120000, pas: 1000, message: 'le donneur n’a jamais basculé sur le QR hors ligne' });
    await attendre(P, () => !!document.querySelector('#rcCode'),
      { timeout: 60000, pas: 1000, message: 'le receveur n’a jamais rouvert son scanner' });
    await G.waitForTimeout(400);
    for (const [nom, p] of [['donneur', G], ['receveur', P]]){
      const f = path.join(SHOTS, `repli-auto-${nom}-${nomErgo}-${theme}.png`);
      await p.screenshot({ path: f });
      console.log('capture : ' + f);
    }
    for (const c of ctxs) await c.close();
  }
}

await browser.close();
relais.close();
server.close();

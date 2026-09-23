/* ============================================================
   CAPTURES — les fiches passent PAR LES RELAIS

   §9 : toute retouche visible se termine par une capture QU'ON
   REGARDE, les deux ergonomies et les deux thèmes. Le portage ajoute
   deux phrases à l'écran : « Relié — envoi… » chez celui qui donne,
   « Relié — réception… 2/5 » chez celui qui reçoit, pendant que les
   parts arrivent. On les photographie en train de se produire.

   Aucun chemin direct (candidats ICE retirés des deux côtés), 300
   pistes pour avoir plusieurs parts, et un relais qui en perd UNE
   une fois : c'est ce qui laisse l'état intermédiaire à l'écran assez
   longtemps pour qu'on le voie — et c'est aussi ce qui arrive sur un
   relais public chargé.

   Outil de développement : rien ici n'est chargé par l'app.
   ============================================================ */
import path from 'node:path';
import { chromium, chromiumPath, SHOTS, serveRepo, attendre } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

const { server, base } = await serveRepo();
let grosses = 0;
const relais = await startLocalRelay({ tls: true, filtre: ev => {
  const x = (ev.tags || []).find(t => t[0] === 'x');
  if (!x || !/^oc-portage-/.test(x[1]) || String(ev.content || '').length <= 1500) return null;
  return ++grosses % 1000 === 3 ? 'rate-limited: slow down' : null;
} });
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
};

const ERGOS = [
  ['telephone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ['poste', { viewport: { width: 1280, height: 800 } }]
];

for (const [nomErgo, opts] of ERGOS){
  for (const theme of ['clair', 'sombre']){
    grosses = 0;
    const pages = [];
    const ctxs = [];
    for (const [role, n] of [['donneur', 300], ['receveur', 0]]){
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...opts });
      const p = await ctx.newPage();
      await p.addInitScript(COUPE_ICE);
      await p.goto(base, { waitUntil: 'load' });
      /* le thème se pose dans le STOCKAGE puis on recharge (voir
         captures-repli-auto.mjs : un `dataset` posé à la main ment) */
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

    /* PENDANT : les deux phrases du portage, prises sur le fait */
    await attendre(P, () => /réception… \d+\/\d+/.test(document.querySelector('#rcRdvSt')?.textContent || ''),
      { timeout: 40000, pas: 100, message: 'le receveur n’a jamais dit que les parts arrivaient' });
    await P.screenshot({ path: path.join(SHOTS, `portage-receveur-pendant-${nomErgo}-${theme}.png`) });
    await attendre(G, () => /envoi…/.test(document.querySelector('#dnRdvSt')?.textContent || ''),
      { timeout: 10000, pas: 100, message: 'le donneur n’a jamais dit qu’il envoyait' }).catch(() => {});
    await G.screenshot({ path: path.join(SHOTS, `portage-donneur-pendant-${nomErgo}-${theme}.png`) });

    /* APRÈS : l'aperçu chez l'un, « Envoyé ✓ » chez l'autre */
    await P.waitForSelector('.rc-big', { timeout: 40000 });
    await attendre(G, () => /Envoyé/.test(document.querySelector('#dnRdvSt')?.textContent || ''),
      { timeout: 15000, pas: 200, message: 'le donneur n’a jamais su que c’était arrivé' });
    await G.waitForTimeout(300);
    for (const [nom, p] of [['donneur', G], ['receveur', P]]){
      const f = path.join(SHOTS, `portage-${nom}-apres-${nomErgo}-${theme}.png`);
      await p.screenshot({ path: f });
      console.log('capture : ' + f);
    }
    for (const c of ctxs) await c.close();
  }
}

await browser.close();
relais.close();
server.close();

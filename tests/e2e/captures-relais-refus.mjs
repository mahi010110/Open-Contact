/* ============================================================
   CAPTURES — l'écran quand les relais refusent de relayer
   §9 : toute retouche visible se termine par une capture QU'ON
   REGARDE, les deux ergonomies et les deux thèmes. Ici l'écran
   passe de « En attente de ton autre appareil » (une invitation à
   patienter devant l'impossible) à « Pas de connexion » avec ses
   replis — c'est la seule chose que l'utilisateur verra du
   correctif, donc elle se regarde.
   Outil de développement : rien ici n'est chargé par l'app.
   ============================================================ */
import path from 'node:path';
import { chromium, chromiumPath, SHOTS, serveRepo, attendre, ouvrirReglages } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

const { server, base } = await serveRepo();
const relais = await startLocalRelay({ tls: true, refus: true });
const port = new URL(relais.url).port;
const browser = await chromium.launch({ executablePath: chromiumPath() });

const ERGOS = [
  ['telephone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ['poste', { viewport: { width: 1280, height: 800 } }]
];

for (const [nomErgo, opts] of ERGOS){
  for (const theme of ['clair', 'sombre']){
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...opts });
    const p = await ctx.newPage();
    if (theme === 'sombre') await p.emulateMedia({ colorScheme: 'dark' });
    await p.goto(base, { waitUntil: 'load' });
    /* LE THÈME SE POSE DANS LE STOCKAGE, PAS SUR LE `dataset`. `app.js`
       est la source de vérité et réécrit l'attribut au démarrage : une
       première version posait `data-theme` après le chargement, et la
       capture « sombre » sortait en clair sans que rien ne le signale.
       On écrit donc la clé (IndexedDB ET son miroir localStorage, que
       `theme.js` lit avant le premier pixel) puis on RECHARGE. */
    await p.evaluate(async ([prt, sombre]) => {
      const st = await import('./engine/storage.js');
      await st.kvInit();
      await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:' + prt + '/']));
      if (sombre){
        await st.kvSet(st.THEME_KEY, 'dark');
        try { localStorage.setItem('oc_theme', 'dark'); } catch (e) {}
      }
    }, [port, theme === 'sombre']);
    await p.reload({ waitUntil: 'load' });
    const pose = await p.getAttribute('html', 'data-theme');
    const attendu = theme === 'sombre' ? 'dark' : 'light';
    if (pose !== attendu)
      throw new Error(`thème non appliqué : « ${pose} » au lieu de « ${attendu} » — la capture mentirait`);
    if (nomErgo === 'telephone') await p.click('.bottomnav a[data-r="moi"]');
    else await p.click('.topnav a[data-r="moi"]');
    await ouvrirReglages(p);
    await p.click('#moiSync');
    await p.waitForSelector('#syNew');
    await p.click('#syNew');
    /* on attend la phrase, pas un délai : une capture prise trop tôt
       montrerait « Connexion… » et ne prouverait rien */
    await attendre(p, () => /Pas de connexion/.test(
      document.querySelector('#syStatus')?.textContent || ''),
      { timeout: 45000, message: 'l’écran n’a jamais dit « Pas de connexion »' });
    const fichier = path.join(SHOTS, `relais-refus-${nomErgo}-${theme}.png`);
    await p.screenshot({ path: fichier });
    console.log('capture : ' + fichier);
    await ctx.close();
  }
}

await browser.close();
relais.close();
server.close();

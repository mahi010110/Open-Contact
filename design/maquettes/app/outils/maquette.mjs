/* ============================================================
   Ouvrir la maquette de la refonte dans Chromium, comme un
   téléphone ou comme un ordinateur.

   La maquette (../index.html) est un FRAGMENT : la page publiée
   l'enveloppe. Ici on l'enveloppe nous-mêmes, avec les polices du
   dépôt — rien ne vient du réseau, et les liens vers l'extérieur
   (LinkedIn, un site d'entreprise…) répondent par une page vide.

   const { ouvrir, fermer, etat } = await lancer();
   const { ctx, p } = await ouvrir(390, 844, false, true);   // téléphone clair
   const { ctx, p } = await ouvrir(1440, 900, true);         // ordinateur sombre
   option { calme: true } : mouvement réduit (la maquette saute alors
   ses attentes simulées, l'annuaire répond tout de suite).
   ============================================================ */
import { readFile } from 'fs/promises';
import path from 'path';
import { chromium, chromiumPath, serveRepo, ROOT } from '../../../../tests/e2e/outils.mjs';

export { ROOT, chromium, chromiumPath };

export async function lancer(){
  const contenu = await readFile(path.join(ROOT, 'design/maquettes/app/index.html'), 'utf8');
  const { server, base } = await serveRepo();
  const F = n => `${base}/assets/fonts/${n}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}
@font-face{font-family:'Public Sans';src:url('${F('PublicSans%5Bwght%5D.woff2')}') format('woff2');font-weight:100 900}
@font-face{font-family:'IBM Plex Mono';src:url('${F('IBMPlexMono-Regular.woff2')}') format('woff2');font-weight:400}
@font-face{font-family:'IBM Plex Mono';src:url('${F('IBMPlexMono-Medium.woff2')}') format('woff2');font-weight:500}
@font-face{font-family:'Silkscreen';src:url('${F('Silkscreen-Regular.woff2')}') format('woff2');font-weight:400}
</style></head><body>${contenu}</body></html>`;
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const etat = { erreurs: 0 };
  async function ouvrir(w, h, sombre, mobile, { calme = false } = {}){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: sombre ? 'dark' : 'light',
      hasTouch: !!mobile, isMobile: !!mobile, locale: 'fr-FR', ...(calme ? { reducedMotion: 'reduce' } : {}) });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(/linkedin\.com|duckduckgo\.com|advens\.fr|hellowork|labonnealternance/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>dehors</p>' }));
    await ctx.route(base + '/__maquette', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
    const p = await ctx.newPage();
    p.on('pageerror', e => { etat.erreurs++; console.log('ERREUR', String(e)); });
    p.on('console', m => { if (m.type() === 'error') { etat.erreurs++; console.log('CONSOLE', m.text()); } });
    await p.goto(base + '/__maquette', { waitUntil: 'load' });
    /* la régie se souvient du jour choisi : chaque scénario repart du jour 8 */
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await p.reload({ waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    return { ctx, p };
  }
  async function fermer(){ await browser.close(); server.close(); }
  return { browser, base, ouvrir, fermer, etat };
}

/* ce qui dépasse à droite de la page : 0 attendu partout */
export const deborde = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/* E2E durcissement : LES PAGES QUI NE SONT PAS L'APP, sous service
   worker. (Ce scénario s'appelait `e2e-oauth-sw.mjs` : il ne gardait
   qu'`oauth.html`, donc il était rangé avec l'envoi direct et SAUTÉ
   tant que cette capacité reste masquée. Il garde maintenant toutes
   les pages livrées et visibles — le laisser sauté, c'était le laisser
   vert pendant que le défaut revenait.) Le SW ressert index.html à toute navigation (app une-page) —
   il ne doit détourner AUCUNE des pages qui se lisent seules : le
   retour OAuth (sinon le jeton n'arrive jamais), l'aide et la
   confidentialité (sinon les réglages rouvrent l'app).

   Ce scénario ne gardait qu'`oauth.html`, nommé à la main. Les deux
   pages livrées ensuite se sont fait avaler en silence, et le défaut
   ne se voyait QUE service worker installé — donc jamais chez celui
   qui vient de les écrire. La liste des pages se déduit maintenant de
   `PRECACHE` : une page neuve est gardée sans que personne y pense.

   On vérifie, SW au contrôle :
   1. chaque page de `PRECACHE` se sert ELLE-MÊME, titre à l'appui ;
   2. le postMessage same-origin (le vrai canal du jeton) fonctionne ;
   3. une navigation normale ressert bien l'app ;
   4. hors ligne pour de vrai, et le thème posé avant le premier pixel. */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, chromiumPath, SHOTS, serveRepo, ROOT } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* 1. l'app s'ouvre et son service worker prend le contrôle */
await page.goto(base + '/', { waitUntil: 'load' });
await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 })
  .catch(() => fail('le service worker n’a jamais pris le contrôle'));
console.log('service worker au contrôle ✓');

/* 2. CHAQUE page du dépôt se sert elle-même sous le SW.
   La liste vient du DISQUE, pas de `PRECACHE` : une page peut très bien
   exister sans être promise hors ligne (la présentation, dont les
   captures pèsent 300 ko que personne n'installerait pour rien). Le
   titre attendu se lit dans le fichier : rien n'est écrit ici qu'il
   faudrait penser à mettre à jour. */
const PAGES = (await readdir(ROOT))
  .filter(n => n.endsWith('.html') && n !== 'index.html')
  .sort();
if (PAGES.length < 3)
  fail('seulement ' + PAGES.length + ' page(s) relevée(s) à la racine — le relevé est cassé, pas le SW');
for (const nom of PAGES){
  const attendu = (await readFile(path.join(ROOT, nom), 'utf8')).match(/<title>([^<]*)<\/title>/)?.[1].trim();
  if (!attendu){ fail(nom + ' n’a pas de <title> — impossible de prouver qu’elle se sert elle-même'); continue; }
  const q = nom === 'oauth.html' ? '#access_token=TEST&token_type=bearer' : '';
  await page.goto(base + '/' + nom + q, { waitUntil: 'load' });
  const vu = (await page.title()).trim();
  if (vu !== attendu) fail(nom + ' détournée par le SW — titre servi : « ' + vu + ' » au lieu de « ' + attendu + ' »');
  else if (await page.$('#app, .bottomnav')) fail(nom + ' détournée : l’app a été servie à la place');
  else console.log(nom.padEnd(22) + ' servie intacte sous le SW ✓');
}
await page.goto(base + '/oauth.html#access_token=TEST&token_type=bearer', { waitUntil: 'load' });
await page.screenshot({ path: SHOTS + '/60-oauth-sous-sw.png' });

/* 3. le vrai canal : popup ouverte par l'app, jeton reçu par postMessage */
await page.goto(base + '/', { waitUntil: 'load' });
await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 });
const msg = await page.evaluate(() => new Promise((res, rej) => {
  setTimeout(() => rej(new Error('aucun message reçu en 8 s')), 8000);
  addEventListener('message', e => { if (e.data && e.data.oc === 'oauth') res(e.data); });
  open('./oauth.html#access_token=JETON-TEST&token_type=bearer');
})).catch(e => { fail('retour OAuth : ' + e.message); return null; });
if (msg && !/access_token=JETON-TEST/.test(msg.url)) fail('jeton absent du retour : ' + msg.url);
if (msg) console.log('postMessage du retour OAuth reçu par l’app ✓');

/* 4. une navigation ordinaire ressert l'app (page unique) */
await page.goto(base + '/#/pistes', { waitUntil: 'load' });
if (!/OpenContact/.test(await page.title()) || (await page.title()) === 'OpenContact — connexion')
  fail('navigation normale : l’app n’est plus servie — titre : ' + await page.title());
console.log('navigation normale : l’app répond ✓');

/* 5. hors ligne POUR DE VRAI : le serveur meurt, l'app doit revivre du
   cache au rechargement — pas une émulation que le SW contournerait */
await new Promise(r => { server.close(() => r()); server.closeAllConnections?.(); setTimeout(r, 1500); });
await page.reload({ waitUntil: 'load' }).catch(() => fail('rechargement hors ligne : la page n’a pas chargé'));
/* #sbVer existe vide dans le HTML : attendre que l'amorçage l'ait rempli */
await page.waitForFunction(() => /^\d+\.\d+/.test(document.querySelector('#sbVer')?.textContent.trim() || ''),
  null, { timeout: 15000 }).catch(() => fail('app hors ligne incomplète — amorçage inachevé'));
const vers = (await page.textContent('#sbVer')).trim();
if (!await page.$('.bottomnav')) fail('app hors ligne : navigation absente');
console.log('serveur coupé → rechargement : l’app revit du cache (v' + vers.trim() + ') ✓');

/* 6. le thème est posé AVANT le premier pixel (theme.js, bloquant dans
   le <head>). Sans lui, `<html data-theme="light">` reste peint tant
   qu'IndexedDB n'a pas répondu : mesuré à 95 ms sur un processeur bridé
   ×8, c'est-à-dire un flash blanc à CHAQUE lancement pour qui utilise le
   thème sombre. On vérifie que le tout PREMIER rendu est déjà bon, sans
   laisser à app.js le temps de corriger.
   (le serveur de l'étape 5 est mort exprès : celle-ci ouvre le sien) */
{
  const { server: srv2, base: b2 } = await serveRepo();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errors.push(String(e)));
  await p2.goto(b2, { waitUntil: 'load' });
  await p2.waitForSelector('#btnTheme');
  if (await p2.evaluate(() => document.documentElement.dataset.theme !== 'dark')) await p2.click('#btnTheme');
  await p2.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(p2);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });   /* téléphone d'entrée de gamme */
  await p2.reload({ waitUntil: 'domcontentloaded' });
  const vu = await p2.evaluate(() => ({
    t: document.documentElement.dataset.theme,
    fond: getComputedStyle(document.body).backgroundColor
  }));
  let bon = true;
  if (vu.t !== 'dark'){
    fail('premier rendu : thème « ' + vu.t + ' » au lieu de « dark » — flash au lancement'); bon = false;
  }
  const rouge = +((vu.fond.match(/\d+/g) || ['0'])[0]);
  if (rouge > 150){
    fail('premier rendu : fond clair ' + vu.fond + ' alors que le thème est sombre'); bon = false;
  }
  /* pas de ✓ après un échec : il ferait lire « ça marche » à côté de « ça casse » */
  if (bon) console.log('thème posé avant le premier pixel, même processeur bridé ×8 ✓');
  await ctx.close();
  srv2.close();
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
console.log(process.exitCode ? 'E2E pages-sw : ÉCHEC' : 'E2E pages-sw : OK');

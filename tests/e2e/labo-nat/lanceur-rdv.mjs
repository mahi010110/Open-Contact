/* La VRAIE app, rendez-vous QR (« Donner » en face à face, gros lot),
   le donneur dans une maison, le receveur dans l'autre. */
import { chromium, chromiumPath } from '../outils.mjs';
import { navigateurDans } from './navigateur.mjs';
const [nsA = 'oc-ha', nsB = 'oc-hb'] = process.argv.slice(2);
const BASE = 'http://100.64.9.1:8081';
const lancer = async ns => {
  return chromium.launch({ executablePath: navigateurDans(ns, chromiumPath()), args: ['--unsafely-treat-insecure-origin-as-secure=' + BASE] });
};
const ouvrir = async (b, n) => {
  const p = await (await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(async n => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://100.64.9.1:7443']));
    await st.kvSet(st.TURN_KEY, JSON.stringify([{ urls: 'stun:100.64.9.1:19302' }]));
    const rnd = len => Array.from(crypto.getRandomValues(new Uint8Array(len))).map(b => b.toString(16).padStart(2, '0')).join('');
    if (n) await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
      id: 'rdv-' + i, name: 'Piste ' + i, city: 'Lille', status: 'todo', desc: rnd(120), updatedAt: 1000 + i }))));
  }, n);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
};
const [bD, bR] = await Promise.all([lancer(nsA), lancer(nsB)]);
const D = await ouvrir(bD, 26), R = await ouvrir(bR, 0);
const toasts = [];
for (const [nom, p] of [['D', D], ['R', R]])
  await p.exposeFunction('__toast_' + nom, t => toasts.push(nom + ' : ' + t));
for (const [nom, p] of [['D', D], ['R', R]])
  await p.evaluate(nom => { const t = document.getElementById('toast');
    if (t) new MutationObserver(() => { const x = t.textContent.trim(); if (x) window['__toast_' + nom](x); })
      .observe(t, { childList: true, characterData: true, subtree: true }); }, nom);
await D.click('.bottomnav a[data-r="echanger"]');
await D.waitForSelector('#ecGive'); await D.click('#ecGive');
await D.waitForSelector('#dnQR'); await D.click('#dnQR');
await D.waitForSelector('.sy-phrase span', { timeout: 30000 });
const code = (await D.textContent('.sy-phrase span')).trim();
await new Promise(r => setTimeout(r, 5000));      /* le camarade sort son téléphone */
await R.click('.bottomnav a[data-r="echanger"]');
await R.waitForSelector('#ecRecv'); await R.click('#ecRecv');
await R.waitForSelector('#rcScan'); await R.click('#rcScan');
await R.waitForSelector('#rcCode'); await R.fill('#rcCode', code);
await R.waitForSelector('#rcCodeGo:not([hidden])'); await R.click('#rcCodeGo');
const t0 = Date.now(); let issue = 'rien';
while (Date.now() - t0 < 60000){
  await new Promise(r => setTimeout(r, 500));
  if (await R.$('.rc-big')){ issue = 'P2P : fiches reçues'; break; }
  if (await D.$('.qr-wrap[aria-label="QR à faire scanner"]')){ issue = 'BASCULE sur le QR hors ligne'; break; }
}
console.log(issue + ' après ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s' + (toasts.length ? ' · toasts : ' + toasts.join(' | ') : ''));
await bD.close(); await bR.close();

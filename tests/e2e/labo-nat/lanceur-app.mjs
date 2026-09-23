/* La VRAIE app, parcours « Partage en groupe », un téléphone dans chaque
   maison du labo. usage : node lanceur-app.mjs <nsA> <nsB> <etiquette> */
import { chromium, chromiumPath, SHOTS } from '../outils.mjs';
import { navigateurDans } from './navigateur.mjs';
const [nsA = 'oc-ha', nsB = 'oc-hb', etiq = 'essai'] = process.argv.slice(2);
const BASE = 'http://100.64.9.1:8081';
const lancer = async ns => {
  return chromium.launch({ executablePath: navigateurDans(ns, chromiumPath()), args: ['--unsafely-treat-insecure-origin-as-secure=' + BASE] });
};
const ouvrir = async (b, pistes) => {
  const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(async ([n, DEUX]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(DEUX
      ? ['wss://100.64.9.1:7443', 'wss://100.64.9.1:7444'] : ['wss://100.64.9.1:7443']));
    /* le STUN du labo, par adresse : les noms de Trystero n'y résolvent pas */
    await st.kvSet(st.TURN_KEY, JSON.stringify([{ urls: 'stun:100.64.9.1:19302' }]));
    if (n) await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
      id: 'lab-' + i, name: 'Piste du labo ' + i, city: 'Lille', status: 'todo', updatedAt: 1000 + i }))));
  }, [pistes, !!process.env.LABO_DEUX_RELAIS]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
};
const [bA, bB] = await Promise.all([lancer(nsA), lancer(nsB)]);
const A = await ouvrir(bA, 6), B = await ouvrir(bB, 0);
const mdp = 'labo-' + Math.random().toString(36).slice(2, 8);
for (const p of [A, B]){
  await p.click('.bottomnav a[data-r="echanger"]');
  await p.waitForSelector('#ecPromo'); await p.click('#ecPromo');
  await p.waitForSelector('#prPass'); await p.fill('#prPass', mdp);
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('#prStatus');
}
const t0 = Date.now(); let relie = false; const vus = new Set();
while (Date.now() - t0 < +(process.env.LABO_ATTENTE || 45000)){
  await new Promise(r => setTimeout(r, 1000));
  const s = await Promise.all([A, B].map(p => p.textContent('#prStatus').catch(() => '')));
  s.forEach((x, i) => vus.add('ABCD'[i] + ' : ' + (x || '').trim()));
  if (s.every(x => /camarade/.test(x || ''))){ relie = true; break; }
}
const duree = ((Date.now() - t0) / 1000).toFixed(0);
await A.screenshot({ path: SHOTS + '/labo-' + etiq + '-A.png' }); await B.screenshot({ path: SHOTS + '/labo-' + etiq + '-B.png' });
const fin = await Promise.all([A, B].map(p => p.textContent('#prStatus').catch(() => '')));
console.log((relie ? 'RELIÉS en ' + duree + ' s' : 'PAS RELIÉS après ' + duree + ' s')
  + '\n  écran A : « ' + fin[0].trim() + ' »\n  écran B : « ' + fin[1].trim() + ' »'
  + '\n  états vus : ' + [...vus].join(' | '));
await bA.close(); await bB.close();

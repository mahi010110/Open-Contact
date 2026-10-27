/* ============================================================
   RELEVÉ À GRANDE ÉCHELLE — chaque écran, avec le jeu massif
   (tests/e2e/jeu-massif.mjs). Informatif : il mesure, il ne rougit pas.

   Pour le pouce (390 × 844, processeur ralenti 4× : un téléphone moyen)
   et le poste (1280 × 800), préversion éteinte puis allumée :
   · l'ouverture : du rechargement au premier écran rendu, et les tâches
     longues (> 50 ms) pendant ce temps ;
   · chaque onglet : le temps de rendu, les nœuds du DOM, la longueur de
     la page en ÉCRANS, et les lignes rendues ;
   · les gestes lourds : taper dans la barre, ouvrir le plus gros groupe,
     la plus longue conversation, une fiche, « Donner », « Historique ».
   Écrit `captures/echelle/releve.json` et des captures à regarder.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, SHOTS } from './outils.mjs';
import { jeuMassif, semerMassif } from './jeu-massif.mjs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const OUT = path.join(SHOTS, 'echelle');
await mkdir(OUT, { recursive: true });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const jeu = await jeuMassif();
console.log('jeu :', JSON.stringify(jeu.compte));
const releve = { compte: jeu.compte, configs: [] };

const ERGOS = [{ nom: 'pouce', vp: { width: 390, height: 844 }, touch: true, cpu: 4 },
               { nom: 'poste', vp: { width: 1280, height: 800 }, touch: false, cpu: 1 }];
const filtre = process.argv.slice(2);

/* deux images après un geste : ce que l'écran montre est posé */
const pose = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const longues = p => p.evaluate(() => { const l = window.__lt || []; window.__lt = []; return { n: l.length, total: Math.round(l.reduce((s, x) => s + x, 0)), max: Math.round(Math.max(0, ...l)) }; });
const mesure = p => p.evaluate(() => {
  const main = document.querySelector('#main');
  const sc = document.scrollingElement;
  const compte = s => document.querySelectorAll(s).length;
  return { noeuds: document.getElementsByTagName('*').length, noeudsMain: main ? main.getElementsByTagName('*').length : 0,
           ecrans: +(Math.max(sc.scrollHeight, main ? main.scrollHeight : 0) / innerHeight).toFixed(1),
           lignes: { pistes: compte('#main .row-item, #main .bcard'), boite: compte('#main .bx-l'), plus: compte('#main .tr-more'),
                     actions: compte('#main .act-row, #main .tr-row') } };
});

for (const ergo of ERGOS){
  const nomConf = ergo.nom;
  if (filtre.length && !filtre.some(f => nomConf.includes(f))) continue;
  const conf = { nom: nomConf, ecrans: {}, gestes: {} };
  const ctx = await browser.newContext({ viewport: ergo.vp, hasTouch: ergo.touch, isMobile: ergo.touch, serviceWorkers: 'block' });
  await annuaireMuet(ctx);
  await ctx.addInitScript(() => {
    window.__lt = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) erreurs.push(m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await semerMassif(p, jeu);
  if (ergo.cpu > 1){ const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: ergo.cpu }); }
  /* l'ouverture, mesurée sur un second rechargement ralenti */
  const t0 = Date.now();
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent && document.querySelector('#main')?.children.length);
  await pose(p);
  conf.ouverture = { ms: Date.now() - t0, longues: await longues(p) };
  await p.waitForTimeout(1500);
  conf.apresOuverture = await longues(p);
  console.log(`\n━━━ ${nomConf} : ouverture ${conf.ouverture.ms} ms, tâches longues ${JSON.stringify(conf.ouverture.longues)}, ensuite ${JSON.stringify(conf.apresOuverture)}`);

  const onglets = ['aujourdhui', 'pistes', 'reseau', 'moi'];
  for (const r of onglets){
    const nav = ergo.touch ? `.bottomnav [data-r="${r}"]` : `[data-r="${r}"]:visible`;
    const lien = p.locator(nav).first();
    if (!(await lien.count())){ console.log(`  ${r} : pas d'onglet`); continue; }
    await longues(p);
    const t = Date.now();
    await lien.click();
    await p.waitForFunction(x => location.hash.includes(x), r);
    await pose(p);
    const ms = Date.now() - t;
    await p.waitForTimeout(400);
    const m = await mesure(p);
    conf.ecrans[r] = { ms, longues: await longues(p), ...m };
    console.log(`  ${r.padEnd(11)} ${String(ms).padStart(5)} ms · ${String(m.noeudsMain).padStart(5)} nœuds · ${m.ecrans} écrans · ${JSON.stringify(m.lignes)}`);
    await p.screenshot({ path: `${OUT}/${nomConf}-${r}.png` });
    /* plus bas : ce que montre la page après deux écrans de défilement */
    if (m.ecrans > 2.5){
      await p.evaluate(() => { const sc = document.scrollingElement; sc.scrollTop = innerHeight * 2; document.querySelector('#main')?.scrollTo?.(0, innerHeight * 2); });
      await pose(p);
      await p.screenshot({ path: `${OUT}/${nomConf}-${r}-bas.png` });
      await p.evaluate(() => { document.scrollingElement.scrollTop = 0; document.querySelector('#main')?.scrollTo?.(0, 0); });
    }
  }

  /* ---------- les gestes lourds ---------- */
  const geste = async (nom, fn) => {
    await longues(p);
    const t = Date.now();
    try { const extra = await fn(); await pose(p); conf.gestes[nom] = { ms: Date.now() - t, longues: await longues(p), ...(extra || {}) }; }
    catch (e) { conf.gestes[nom] = { erreur: String(e).split('\n')[0] }; }
    console.log(`  ✋ ${nom.padEnd(22)} ${JSON.stringify(conf.gestes[nom])}`);
  };
  const fermer = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(350); };
  await p.locator(ergo.touch ? '.bottomnav [data-r="pistes"]' : '[data-r="pistes"]:visible').first().click();
  await p.waitForSelector('#piQ');
  await geste('taper « advens lille »', async () => {
    const lat = [];
    await p.click('#piQ');
    for (const ch of 'advens lille'){
      const t = Date.now(); await p.keyboard.type(ch); await pose(p); lat.push(Date.now() - t);
    }
    await p.waitForTimeout(600);
    const n = await p.evaluate(() => document.querySelectorAll('#main .row-item, #main .bcard').length);
    await p.screenshot({ path: `${OUT}/${nomConf}-recherche.png` });
    return { parTouche: Math.round(lat.reduce((s, x) => s + x, 0) / lat.length), pire: Math.max(...lat), resultats: n };
  });
  await p.fill('#piQ', ''); await p.waitForTimeout(400);
  await geste('ouvrir une fiche', async () => {
    await p.locator('#main .row-item .ri-main, #main .bcard').first().click();
    await p.waitForSelector('.modal .modal-b, .pi-split .fiche, .fk', { timeout: 10000 });
    await p.screenshot({ path: `${OUT}/${nomConf}-fiche.png` });
  });
  await fermer();

  const boite = 'reseau';
  const versBoite = async () => { await p.locator(ergo.touch ? `.bottomnav [data-r="${boite}"]` : `[data-r="${boite}"]:visible`).first().click(); await p.waitForSelector('.bx-liste'); };
  await versBoite();
  const gros = Object.entries(jeu.groupes).sort((a, b) => b[1].fil.length - a[1].fil.length)[0][0];
  await geste('ouvrir le plus gros groupe', async () => {
    await p.click(`.bx-l[data-groupe="${gros}"]`);
    await p.waitForSelector('#grFil .gr-m');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${nomConf}-groupe.png` });
    return await p.evaluate(() => ({ bulles: document.querySelectorAll('#grFil .gr-m').length,
      noeuds: (document.querySelector('#grFil') || document.body).getElementsByTagName('*').length }));
  });
  await geste('ouvrir « Groupe » (membres)', async () => {
    const b = p.locator('.gr-membres').first();
    await b.click();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${nomConf}-groupe-membres.png` });
  });
  await fermer(); if (ergo.touch) await fermer();
  await versBoite();
  const long = jeu.profil.amis[0].id;
  await geste('ouvrir 300 messages', async () => {
    await p.click(`.bx-l[data-ami="${long}"]`);
    await p.waitForSelector('#msFil');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${nomConf}-conversation.png` });
    return await p.evaluate(() => ({ bulles: document.querySelectorAll('#msFil > *').length }));
  });
  if (ergo.touch) await fermer();
  await geste('ouvrir « Choisir »', async () => {
    await p.evaluate(() => { location.hash = '#/pistes'; });
    await p.click('#piProspect', { timeout: 3000 });
    await p.waitForSelector('.modal .pk', { timeout: 10000 });
    await p.screenshot({ path: `${OUT}/${nomConf}-choisir.png` });
    return await p.evaluate(() => ({ lignes: document.querySelectorAll('.modal .pk').length }));
  });
  await fermer();
  await geste('ouvrir « Historique »', async () => {
    await p.evaluate(() => { location.hash = '#/reseau'; });
    await p.click('#ecHisto', { timeout: 3000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${nomConf}-historique.png` });
    return await p.evaluate(() => ({ lignes: document.querySelectorAll('.modal li, .modal .ex-row').length }));
  });
  await fermer();
  conf.erreurs = erreurs.slice(0, 10);
  if (erreurs.length) console.log('  ⚠ erreurs :', erreurs.slice(0, 5));
  releve.configs.push(conf);
  await ctx.close();
}
await writeFile(path.join(OUT, 'releve.json'), JSON.stringify(releve, null, 1));
await browser.close();
server.close();
console.log('\nRelevé écrit :', path.join(OUT, 'releve.json'));

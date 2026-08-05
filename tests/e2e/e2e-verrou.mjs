/* E2E P1 : création du verrou, scellement, rechargement → écran
   verrouillé, mauvais code, bon code, re-authentification.
   390×844 (tactile) puis 1280×800, thème clair puis sombre. */
import { chromium, chromiumPath, ROOT, SHOTS, ouvrirReglages } from './outils.mjs';
import http from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let shot = 0;
const snap = (page, name) => page.screenshot({ path: `${SHOTS}/${String(++shot).padStart(2, '0')}-${name}.png` });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

/* --- 1. sans verrou : Moi montre la ligne sobre --- */
await page.goto(base + '/#/moi', { waitUntil: 'load' });
await ouvrirReglages(page);
const label = await page.textContent('#moiVerrou .rg-s');
if (!/non protégé/.test(label)) fail('étiquette attendue « non protégé », vu : ' + label);
await snap(page, 'moi-non-protege');

/* pré-remplir une donnée pour vérifier le scellement */
await page.evaluate(() => {
  localStorage.setItem('oc_data_v3', JSON.stringify([{ id: 'seed1', name: 'Entreprise Témoin', city: 'Lille' }]));
});
await page.reload({ waitUntil: 'load' });
await ouvrirReglages(page);

/* --- 2. parcours de création --- */
await page.click('#moiVerrou');
await page.waitForSelector('.modal');
/* Le parcours ouvre DIRECTEMENT sur le pavé : l'écran d'accueil ne
   demandait rien et n'affichait aucune donnée, il est parti. On le
   vérifie ici — un « Choisir mon code » de retour serait une porte de
   plus dans le plus long parcours de l'app. */
await page.waitForSelector('.modal .pad-k');
if (await page.$('.modal-f button')) fail('le parcours de protection rouvre sur une porte');
if (!/Six chiffres/.test(await page.locator('.modal-b').innerText()))
  fail('le pavé ne dit plus ce qu’il attend');
await snap(page, 'protege-code');
const tapCode = async code => {
  for (const d of code) await page.click(`.modal .pad-k[data-d="${d}"]`);
};
await page.waitForSelector('.modal .pad-k');
await tapCode('123456');                              /* trivial → refusé */
await page.waitForTimeout(200);
const weakMsg = await page.textContent('.modal .lock-msg');
if (!/facile/.test(weakMsg)) fail('code trivial non refusé : ' + weakMsg);
await tapCode('280941');
await page.waitForTimeout(200);
await tapCode('280941');                              /* confirmation */
await page.waitForSelector('.phrase-grid');
await snap(page, 'phrase-de-secours');
const words = await page.$$eval('.phrase-grid li', els => els.map(e => e.textContent.trim()));
if (words.length !== 12) fail('12 mots attendus, vu ' + words.length);
await page.click('.modal-f .btn-primary');            /* Je l'ai écrite */
await page.waitForSelector('#vw1');
const n1 = +(await page.textContent('label[for="vw1"]')).replace(/\D/g, '') - 1;
const n2 = +(await page.textContent('label[for="vw2"]')).replace(/\D/g, '') - 1;
await page.fill('#vw1', words[n1]);
await page.fill('#vw2', words[n2]);
await page.click('.modal-f .btn-primary');            /* Continuer */
await page.waitForSelector('.modal-f .btn-primary');  /* Télécharger */
const dl = page.waitForEvent('download');
await page.click('.modal-f .btn-primary');
await dl;
await snap(page, 'sauvegarde-bloquante');
/* Terminer devient actif après le téléchargement */
await page.click('.modal-f button:has-text("Terminer"):not([disabled])');
await page.waitForSelector('.toast.on', { timeout: 15000 });
/* refuser la biométrie si proposée */
const bioSheet = await page.$('.modal-confirm');
if (bioSheet) await page.click('.modal-confirm .modal-h .x');   /* la croix refuse (R2) */
await page.waitForTimeout(400);
const lbl2 = await page.textContent('#moiVerrou .rg-s');
/* l'ÉTAT seul : « se verrouille seul » décrit un comportement et ne
   tenait pas dans la colonne (« protégé — se verrouille s… ») ; le délai
   exact se dit sur la feuille Verrouillage */
if (lbl2.trim() !== 'protégé') fail('étiquette après création : ' + lbl2);
await snap(page, 'moi-protege');

/* --- 3. le scellement est réel --- */
const sealed = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const o = indexedDB.open('oc_kv_v1', 1);
    o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error);
  });
  const v = await new Promise((res, rej) => {
    const rq = db.transaction('kv').objectStore('kv').get('oc_data_v3');
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
  });
  return { data: String(v || '').slice(0, 5), meta: !!await new Promise((res) => {
    const rq = db.transaction('kv').objectStore('kv').get('oc_vault_v1');
    rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null);
  }) };
});
if (sealed.data !== 'OCV1.') fail('oc_data_v3 non scellée : ' + sealed.data);
if (!sealed.meta) fail('oc_vault_v1 absente');
console.log('scellement vérifié : oc_data_v3 =', sealed.data + '…');

/* --- 4. rechargement → écran verrouillé --- */
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.lock');
await snap(page, 'verrouille-mobile-clair');
const tapLock = async code => { for (const d of code) await page.click(`.lock .pad-k[data-d="${d}"]`); };
await tapLock('999999');
await page.waitForFunction(() => (document.querySelector('.lock .lock-msg') || {}).textContent, null, { timeout: 10000 });
const err = await page.textContent('.lock .lock-msg');
if (!/pas ça/.test(err)) fail('mauvais code : message manquant, vu : ' + err);
await snap(page, 'verrouille-mauvais-code');
await tapLock('280941');
await page.waitForSelector('#view-moi:not([hidden]), #view-aujourdhui:not([hidden])', { timeout: 10000 });
const opened = await page.evaluate(() => !document.querySelector('.lock'));
if (!opened) fail('déverrouillage sans effet');
console.log('déverrouillage OK ; la donnée témoin est relue :',
  await page.evaluate(async () => (JSON.parse(await (await import('./engine/storage.js')).kvGet('oc_data_v3')))[0].name));

/* PANNE VÉCUE : la barre « Annuler » (~30 s) et le toast (~4 s) sont
   posés en `fixed` et survivaient AU-DESSUS de l'écran verrouillé —
   verrouiller juste après avoir supprimé une piste affichait son nom
   sur un écran censé ne rien montrer. Ils sont masqués, pas détruits :
   la minuterie continue et « Annuler » est encore là au déverrouillage. */
await page.evaluate(async () => {
  const { showUndo } = await import('./ui/dom.js');
  showUndo('Supprimée : Capgemini', () => {});
});
await page.waitForSelector('.undo-bar');
await page.evaluate(async () => (await import('./ui/verrou.js')).lockNow());
await page.waitForSelector('.lock .pad-k');
await page.waitForTimeout(300);
const fuite = await page.evaluate(() =>
  [...document.querySelectorAll('.undo-bar, .toast')].some(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'
      && /Capgemini/.test(e.textContent);
  }));
if (fuite) fail('l’écran verrouillé laisse voir un nom de piste');
if (!await page.$('.undo-bar')) fail('« Annuler » détruit par le verrou au lieu d’être masqué');
await tapLock('280941');
await page.waitForSelector('.lock', { state: 'detached', timeout: 10000 });
await page.waitForTimeout(300);
const revenue = await page.evaluate(() => {
  const u = document.querySelector('.undo-bar');
  return !!u && getComputedStyle(u).display !== 'none' && /Capgemini/.test(u.textContent);
});
if (!revenue) fail('« Annuler » perdu après déverrouillage');
console.log('écran verrouillé : rien ne fuit, et « Annuler » survit ✓');
await page.evaluate(() => document.querySelector('.undo-bar')?.remove());

/* --- 5. re-authentification d'un geste sensible --- */
await page.goto(base + '/#/moi');
await ouvrirReglages(page);
await page.click('#moiRestore');
await page.waitForSelector('.modal-confirm .pad-k');
await snap(page, 'reauth-restaurer');
await page.keyboard.press('Escape');

/* --- 5bis. la re-preuve partage le garde-fou d'essais du verrou :
   clavier accepté, 5 échecs = délai, et le délai suit à l'écran
   verrouillé (compteur persistant, pas par feuille) --- */
await page.click('#moiRestore');
await page.waitForSelector('.modal-confirm .pad-k');
/* openSheet place le focus à la frame suivante : on l'ancre explicitement
   dans la feuille avant la preuve clavier pour ne pas dépendre du rythme CI. */
await page.focus('.modal-confirm .x');
const wrongOnce = async () => {
  await page.keyboard.type('111111');           /* clavier : accepté ici aussi */
  /* prouve que cette tentative a réellement démarré, plutôt que de relire
     le message de l'essai précédent */
  await page.waitForFunction(() => {
    const r = document.querySelector('.modal-confirm .rq-pad');
    return !!r && r.classList.contains('pad-off');
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => {
    const r = document.querySelector('.modal-confirm .rq-pad');
    const msg = (r && r.querySelector('.lock-msg').textContent) || '';
    return /pas ça|Réessaie/.test(msg) && (/Réessaie/.test(msg) || !r.classList.contains('pad-off'));
  }, null, { timeout: 15000 });
};
for (let i = 0; i < 5; i++) await wrongOnce();
const heldMsg = await page.textContent('.modal-confirm .lock-msg');
if (!/Réessaie dans/.test(heldMsg)) fail('5 échecs en re-preuve : délai attendu, vu : ' + heldMsg);
await snap(page, 'reauth-delai');
await page.keyboard.press('Escape');
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.lock');
await page.waitForFunction(() => /Réessaie dans/.test((document.querySelector('.lock .lock-msg') || {}).textContent || ''), null, { timeout: 10000 });
console.log('re-preuve : 5 échecs → délai, partagé avec l’écran verrouillé ✓');
/* le délai expire (~30 s) : le pavé se rouvre, le bon code efface le compteur */
await page.waitForFunction(() => !/Réessaie/.test((document.querySelector('.lock .lock-msg') || {}).textContent || ''), null, { timeout: 45000 });
await tapLock('280941');
await page.waitForFunction(() => !document.querySelector('.lock'), null, { timeout: 10000 });
await page.goto(base + '/#/moi');
await page.waitForSelector('#btnTheme');

/* --- 6. thème sombre + ordinateur --- */
await page.click('#btnTheme');
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
await page.waitForTimeout(600);        /* laisser l'écriture IndexedDB aboutir */
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.lock');
if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'dark') fail('thème sombre non persisté');
await snap(page, 'verrouille-mobile-sombre');
await tapLock('280941');
await page.waitForFunction(() => !document.querySelector('.lock'), null, { timeout: 10000 });
/* ordinateur : même contexte, viewport élargi, saisie CLAVIER */
await page.setViewportSize({ width: 1280, height: 800 });
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.lock');
await snap(page, 'verrouille-desktop-sombre');
await page.keyboard.type('280941');
await page.waitForFunction(() => !document.querySelector('.lock'), null, { timeout: 10000 });
console.log('desktop clavier : déverrouillé ✓');
await page.waitForTimeout(300);
await snap(page, 'desktop-moi-sombre');

/* ---------- refaire la phrase de secours (papier perdu, code su) ----------
   La phrase ne se REVOIT pas — elle n'est jamais écrite sur le disque,
   seul un enrobage de la clé maîtresse l'est. La seule porte honnête
   est d'en refaire une. Ce qui doit être vrai après :
   la NEUVE ouvre le coffre, l'ANCIENNE n'ouvre plus rien, le code
   marche toujours, et l'anneau porte la clé de la neuve — sinon la
   récupération d'urgence désignerait encore l'ancienne phrase, et on
   ne s'en apercevrait que le jour où il faut s'en servir. */
const phraseDe = () => page.evaluate(() =>
  [...document.querySelectorAll('.phrase-grid li')].map(n => n.textContent.trim()).join(' '));
const ceremonie = async () => {
  const mots = (await phraseDe()).split(' ');
  await page.click('.modal-f button:has-text("Je l’ai écrite")');
  await page.waitForSelector('#vw1');
  const idx = await page.evaluate(() =>
    [...document.querySelectorAll('.modal-b label')].map(l => +l.textContent.replace(/\D/g, '')));
  await page.fill('#vw1', mots[idx[0] - 1]);
  await page.fill('#vw2', mots[idx[1] - 1]);
  await page.click('.modal-f button:has-text("Continuer")');
  return mots.join(' ');
};
await page.evaluate(async () => (await import('./ui/verrou.js')).openManageSheet());
await page.waitForSelector('#vgPhrase');
await page.click('#vgPhrase');
await page.waitForSelector('.modal-confirm .pad-k');
for (const d of '280941') await page.click(`.modal-confirm .pad-k[data-d="${d}"]`);
await page.waitForSelector('.phrase-grid', { timeout: 15000 });
const neuve = await ceremonie();
await page.waitForSelector('.modal-f button:has-text("Télécharger")', { timeout: 25000 });
const dl2 = page.waitForEvent('download').catch(() => null);
await page.click('.modal-f button:has-text("Télécharger")');
await dl2;
await page.waitForTimeout(400);
/* la copie dit enfin ce qu'elle a produit — une DONNÉE, pas une phrase */
const ditLeFichier = await page.evaluate(() => {
  /* les feuilles s'empilent : c'est la DERNIÈRE qui porte la copie */
  const o = [...document.querySelectorAll('.overlay .modal-b')];
  return (o[o.length - 1]?.innerText || '').trim();
});
if (!/opencontact-copie-\d{4}-\d{2}-\d{2}\.oc/.test(ditLeFichier))
  fail('la copie ne nomme pas le fichier produit : « ' + ditLeFichier + ' »');
await page.click('.modal-f button:has-text("Terminer")');
await page.waitForTimeout(700);
const preuve = await page.evaluate(async ([fraiche]) => {
  const st = await import('./engine/storage.js');
  const v = await import('./engine/vault.js');
  const ring = await import('./engine/ring.js');
  const meta = JSON.parse(await st.kvGet(st.VAULT_KEY) || 'null');
  const ouvre = async p => { try { await v.unlockWithPhrase(meta, p); return true; } catch (e) { return false; } };
  const r = JSON.parse(await st.kvGet(st.RING_KEY) || 'null');
  const rec = await ring.recoveryKeys(fraiche);
  const principal = r && r.ring ? (r.ring.devices || []).find(d => d.id === r.ring.main) : null;
  return {
    neuve: await ouvre(fraiche),
    bidon: await ouvre('cerise hibou madrier levier filet rayon graine histoire buisson saule naval ruche'),
    code: await (async () => { try { await v.unlockWithPin(meta, '280941'); return true; } catch (e) { return false; } })(),
    anneauSuit: r && r.ring ? r.ring.recovery === rec.pub : 'pas d’anneau',
    signe: (r && r.ring && principal) ? await ring.verifyRing(r.ring, principal.pub) : 'pas d’anneau',
    pistes: (await import('./ui/state.js')).S.companies.length
  };
}, [neuve]);
if (!preuve.neuve) fail('la NOUVELLE phrase n’ouvre pas le coffre');
if (preuve.bidon) fail('une phrase quelconque ouvre le coffre');
if (!preuve.code) fail('le code n’ouvre plus le coffre après renouvellement');
if (preuve.anneauSuit !== true && preuve.anneauSuit !== 'pas d’anneau')
  fail('l’anneau porte encore la clé de l’ancienne phrase — la récupération d’urgence serait morte en silence');
if (preuve.signe === false) fail('l’anneau re-clé n’est plus signé par son principal');
if (!preuve.pistes) fail('les données ne sont plus lisibles après renouvellement');
console.log('phrase de secours refaite : la neuve ouvre, le code marche, l’anneau suit ✓');

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E : ÉCHEC' : 'E2E : OK');
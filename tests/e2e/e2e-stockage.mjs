/* E2E stockage : le dernier rang persistant.
   En navigation privée verrouillée, IndexedDB ET localStorage refusent.
   L'app tombait alors en mémoire : elle marchait, et tout disparaissait au
   rechargement — la panne la plus grave possible pour un outil sans serveur.
   Deux garde-fous que ce fichier tient :
     1. le rang « cache » prend le relais et les pistes SURVIVENT ;
     2. `sw.js` ne purge jamais `oc-kv-v1` à son activation — sinon chaque
        mise à jour de l'app effacerait les données, exactement ce que ce
        rang existe pour éviter.
   Et quand même le cache est impossible, l'app le DIT : bandeau lisible,
   bouton de secours réellement tapable (ni recouvert, ni hors d'atteinte). */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let rate = 0;
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; rate++; };
/* un ✓ après un échec est un mensonge : on ne l'imprime que si le bloc
   s'est réellement bien passé */
const ok = (n, m) => { if (rate === n) console.log(m); };

/* navigation privée verrouillée : les deux premiers coffres refusent */
const BLOQUE_2 = `
  indexedDB.open = () => { const r = {};
    setTimeout(() => r.onerror && r.onerror(new Event('error')), 0); return r; };
  try { Object.defineProperty(window, 'localStorage',
    { get(){ throw new DOMException('refusé', 'SecurityError'); } }); } catch (e) {}
`;
/* … et le Cache API par-dessus : il ne reste plus que la mémoire */
const BLOQUE_3 = BLOQUE_2 + `
  try { Object.defineProperty(window, 'caches',
    { get(){ throw new DOMException('refusé', 'SecurityError'); } }); } catch (e) {}
`;

async function page(inject){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(String(e)));
  await p.addInitScript(inject);
  return { ctx, p };
}

/* ---------- 1. le rang « cache » sauve les données ---------- */
{
  const { ctx, p } = await page(BLOQUE_2);
  await p.goto(base, { waitUntil: 'load' });
  await attendre(p, `(async()=>((await import('./engine/storage.js')).getBackend()!=='memory'))()`,
    { timeout: 9000, message: 'un rang persistant doit être trouvé' });
  const rang = await p.evaluate(async () => (await import('./engine/storage.js')).getBackend());
  if (rang !== 'cache') fail('les deux premiers coffres refusés → rang attendu « cache », obtenu « ' + rang + ' »');

  await p.evaluate(async () => (await import('./ui/capture.js')).openCapture());
  await p.waitForSelector('#cpName');
  await p.fill('#cpName', 'Orange Cyberdefense');
  await p.click('.modal-f .btn-primary');
  /* Attendre l'ÉCRITURE, pas l'état en mémoire. `S.companies` est
     rempli tout de suite ; `saveData()` part vers le rang de stockage de
     façon asynchrone, et le rang « cache » (Cache API) est le plus lent
     des trois. Recharger sur la foi de la mémoire, c'est courir contre
     une écriture qu'on n'a pas attendue — la suite rougissait un tour
     sur trois sur un code parfaitement sain. On relit donc la clé. */
  await attendre(p, `(async()=>{
    const st = await import('./engine/storage.js');
    return /Orange Cyberdefense/.test(String(await st.kvGet(st.DATA_KEY) || ''));
  })()`, { timeout: 9000, message: 'la capture doit être écrite sur le rang de stockage' });

  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('.bottomnav');
  await attendre(p, `(async()=>((await import('./engine/storage.js')).getBackend()==='cache'))()`, { timeout: 9000 });
  const apres = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.map(c => c.name));
  if (apres.length !== 1 || apres[0] !== 'Orange Cyberdefense')
    fail('la piste devait survivre au rechargement, trouvé : ' + JSON.stringify(apres));

  /* le bandeau d'alarme ne doit PAS s'afficher : rien n'est perdu */
  const banni = await p.evaluate(() => { const w = document.getElementById('saveWarn'); return !w || w.hidden; });
  if (!banni) fail('rien n’est perdu : aucun avertissement ne doit s’afficher');

  /* sw.js ne purge pas le coffre de données quand il s'active */
  const survit = await p.evaluate(async () => (await caches.keys()).includes('oc-kv-v1'));
  if (!survit) fail('sw.js a purgé « oc-kv-v1 » — les données seraient effacées à chaque mise à jour');
  ok(0, 'privée verrouillée : le rang « cache » prend le relais, la piste survit, sw.js l’épargne ✓');
  await ctx.close();
}

/* ---------- 2. plus aucun coffre : on le DIT, et le secours est tapable ---------- */
const rate1 = rate;
{
  const { ctx, p } = await page(BLOQUE_3);
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('.bottomnav');
  await attendre(p, `(async()=>((await import('./engine/storage.js')).getBackend()==='memory'))()`,
    { timeout: 9000, message: 'sans aucun coffre, le rang doit être « memory »' });
  const w = await p.evaluate(() => {
    const b = document.getElementById('saveWarn');
    if (!b || b.hidden) return null;
    const q = b.getBoundingClientRect();
    return { txt: b.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(q.height), l: Math.round(q.width) };
  });
  if (!w) fail('mémoire seule : l’avertissement doit s’afficher');
  else {
    /* les mots de l'app : une copie, jamais « sauvegarde » ni « export » */
    if (/sauvegarde|export/i.test(w.txt)) fail('vocabulaire : « ' + w.txt +' »');
    if (w.l < 280) fail('le bandeau est comprimé (' + w.l + ' px) — il devient illisible');
  }
  /* le bouton de secours doit être VRAIMENT atteignable : un toast passait
     devant lui, précisément au moment où l'utilisateur en a besoin */
  await p.evaluate(async () => (await import('./ui/dom.js')).toast('✓ Une piste ajoutée'));
  await p.waitForTimeout(350);
  const touche = await p.evaluate(() => {
    const b = document.getElementById('swCopy');
    if (!b) return 'bouton absent';
    const q = b.getBoundingClientRect();
    const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    return e ? (e.closest('.toast') ? 'LE TOAST' : (e.id || e.className)) : 'rien';
  });
  if (touche !== 'swCopy') fail('un doigt au centre de « Garder une copie » touche : ' + touche);
  ok(rate1, 'mémoire seule : l’app le dit dans ses mots, et le secours reste tapable sous un toast ✓');
  await ctx.close();
}

await browser.close();
server.close();
if (errors.length){ console.error('Erreurs console :\n' + [...new Set(errors)].join('\n')); process.exitCode = 1; }
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E stockage : ÉCHEC' : 'E2E stockage : OK');

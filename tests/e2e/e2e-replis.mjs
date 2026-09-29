/* ============================================================
   Les écrans de repli — ceux qu'on voit peu et qui décident de tout.

   Un chemin d'échec ne se voit qu'en le provoquant : aucun autre
   scénario ne choisit le mauvais fichier, ne se trompe de mot de passe,
   ne refuse la caméra ou ne perd sa phrase de secours. C'est pourtant là
   qu'on perd ses données ou qu'on abandonne. Chaque contrôle part du
   geste RÉEL (le vrai sélecteur de fichier, le vrai pavé) et lit ce que
   la personne voit :

   ① un PDF choisi par erreur ne montre JAMAIS l'erreur brute du
     navigateur (elle s'affichait en anglais : « Unexpected token… ») ;
   ② un partage ouvert depuis « Restaurer » s'ouvre là, au lieu d'envoyer
     le rouvrir ailleurs ; une copie ouverte dans « Recevoir » se
     restaure d'un geste ;
   ③ un mot de passe faux se dit SUR le champ, qui garde ce qui a été
     tapé — ni toast lointain, ni champ vidé ;
   ④ caméra bloquée et caméra absente se disent différemment ;
   ⑤ la copie que la protection EXIGE passe par la feuille de partage au
     doigt, et renoncer ne débloque pas la fin ;
   ⑥ code ET phrase perdus : l'écran verrouillé a une sortie ;
   ⑦ la localisation refusée dit où la rendre.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, ouvrirReglages } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okSi = (cond, msg) => { if (cond) console.log(msg + ' ✓'); else fail(msg); };

const PISTES = Array.from({ length: 3 }, (_, i) => ({ id: 'p' + i, name: 'Piste ' + (i + 1), city: 'Lille',
  status: 'todo', contacts: [], updatedAt: 1000 - i }));
const PDF = { name: 'mon-cv.pdf', mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj << /Type /Catalog >> endobj\n') };
/* un mot « technique » à l'écran = une erreur brute qui a remonté */
const BRUT = /Unexpected|JSON|token|undefined|Error|Lecture impossible/;

async function page({ doigt = true, partage = null, init = null, route = 'moi' } = {}){
  const ctx = await browser.newContext(doigt
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, acceptDownloads: true }
    : { viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  if (partage) await ctx.addInitScript(mode => {
    window.__partages = [];
    navigator.canShare = d => !!(d && d.files && d.files.every(f => /\.txt$/.test(f.name)));
    navigator.share = async d => {
      if (mode === 'renonce'){ const e = new Error('abort'); e.name = 'AbortError'; throw e; }
      window.__partages.push(d.files.map(f => f.name));
    };
  }, partage);
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/' + route, { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.PROFILE_KEY, JSON.stringify({ name: 'Sam Martin', formation: 'BTS SIO' }));
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, PISTES);
  await p.reload({ waitUntil: 'load' });
  return { ctx, p };
}
/* un toast se lit après l'avoir vidé, sinon on relit celui d'avant (§5) */
const viderToast = p => p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.textContent = ''; });
/* le message seul : le toast porte aussi sa croix, dont le « ✕ » se lit
   dans textContent */
const toastDe = async p => {
  await attendre(p, () => !!(document.querySelector('#toast')?.firstChild?.nodeValue || '').trim(), { message: 'un toast' });
  return p.evaluate(() => document.querySelector('#toast').firstChild.nodeValue.trim());
};
/* les fichiers, fabriqués par le vrai moteur */
async function fichiers(p){
  const f = await p.evaluate(async () => {
    const ex = await import('./engine/exchange.js');
    const cr = await import('./engine/crypto.js');
    const pistes = [{ id: 'z1', name: 'Zephyr SI', city: 'Lyon', contacts: [] },
                    { id: 'z2', name: 'Borée', city: 'Lille', contacts: [] }];
    return {
      partage: JSON.stringify(ex.sharePayload(pistes)),
      copie: JSON.stringify(ex.fullPayload(pistes, { name: 'Sam Copie' }, [], [])),
      chiffree: await cr.encryptOC2(ex.fullPayload(pistes, { name: 'Sam Copie' }, [], []), 'bon-mot')
    };
  });
  const oc = (name, txt) => ({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(txt) });
  return { partage: oc('partage.oc', f.partage), copie: oc('copie.oc', f.copie), chiffree: oc('chiffree.oc', f.chiffree) };
}
const restaurer = async (p, fichier) => {
  await ouvrirReglages(p);
  const [ch] = await Promise.all([p.waitForEvent('filechooser'), p.click('#moiRestore')]);
  await viderToast(p);
  await ch.setFiles(fichier);
};
const recevoir = async (p, fichier) => {
  await p.evaluate(async () => (await import('./ui/recevoir.js')).openRecevoir());
  await p.waitForSelector('#rcFile');
  const [ch] = await Promise.all([p.waitForEvent('filechooser'), p.click('#rcFile')]);
  await viderToast(p);
  await ch.setFiles(fichier);
};
const pistesVues = p => p.evaluate(async () => (await import('./ui/state.js')).S.companies.map(c => c.name).sort().join(','));

/* ---------- ① la mauvaise pièce ---------- */
{
  const { ctx, p } = await page();
  await restaurer(p, PDF);
  const t = await toastDe(p);
  okSi(t === 'Ce fichier n’est pas une copie OpenContact.' && !BRUT.test(t),
    'Restaurer un PDF : la phrase dit la mauvaise pièce (« ' + t + ' »)');
  await viderToast(p);
  await recevoir(p, PDF);
  const t2 = await toastDe(p);
  okSi(t2.startsWith('Ce n’est pas un partage OpenContact') && !BRUT.test(t2),
    'Recevoir un PDF : pareil, sans l’erreur brute (« ' + t2 + ' »)');
  await ctx.close();
}

/* ---------- ② le bon fichier au mauvais endroit ---------- */
{
  const { ctx, p } = await page();
  const F = await fichiers(p);
  await restaurer(p, F.partage);
  await p.waitForSelector('text=Aperçu avant fusion');
  okSi(!(await p.textContent('#toast')).includes('Échanger'), 'un partage ouvert depuis « Restaurer » s’ouvre ICI');
  await p.click('.modal-f .btn-primary');
  await attendre(p, async () => (await import('./ui/state.js')).S.companies.length === 5, { message: 'les deux pistes du partage arrivent' });
  okSi(true, 'et il se fusionne sans rien remplacer (3 + 2 pistes)');
  await ctx.close();
}
{
  const { ctx, p } = await page();
  const F = await fichiers(p);
  await recevoir(p, F.copie);
  await p.waitForSelector('#rcRestore');
  okSi(!(await p.textContent('.modal')).includes('va dans'), 'une copie dans « Recevoir » : plus de « va dans Moi »');
  await p.click('#rcRestore');
  await p.waitForSelector('text=Restaurer cette copie ?');
  await p.click('.modal-confirm .btn-danger');
  await attendre(p, async () => (await import('./ui/state.js')).S.companies.length === 2, { message: 'la copie remplace tout' });
  okSi(await pistesVues(p) === 'Borée,Zephyr SI', 'et elle se restaure d’un geste, la même question à l’appui');
  okSi(await p.evaluate(() => !!document.querySelector('.undo, #undoBar, [data-undo]') || /Annuler/.test(document.body.innerText)),
    'avec son « Annuler »');
  await ctx.close();
}

/* ---------- ③ le mot de passe faux ---------- */
{
  const { ctx, p } = await page();
  const F = await fichiers(p);
  await restaurer(p, F.chiffree);
  await p.waitForSelector('#rsPass');
  await p.fill('#rsPass', 'bon-mOt');
  await viderToast(p);
  await p.click('.modal-f .btn-primary');
  /* attendre sans jeter : un défaut doit se NOMMER, pas finir en délai dépassé */
  okSi(await p.waitForSelector('#rsPassErr:not([hidden])', { timeout: 15000 }).then(() => true, () => false),
    'Restaurer : le mot de passe faux se dit sous le champ');
  const etat = await p.evaluate(() => ({
    val: document.querySelector('#rsPass').value,
    inv: document.querySelector('#rsPass').getAttribute('aria-invalid'),
    lie: document.querySelector('#rsPass').getAttribute('aria-describedby'),
    toast: (document.querySelector('#toast')?.textContent || '').trim()
  }));
  okSi(etat.val === 'bon-mOt', 'Restaurer : ce qui a été tapé reste dans le champ');
  okSi(etat.inv === 'true' && etat.lie === 'rsPassErr', 'l’erreur est liée au champ (aria-invalid, aria-describedby)');
  okSi(!etat.toast, 'et aucun toast en haut de l’écran');
  await p.fill('#rsPass', 'bon-mot');
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('text=Restaurer cette copie ?', { timeout: 15000 });
  okSi(true, 'corrigé, il ouvre la copie');
  await ctx.close();
}
{
  const { ctx, p } = await page();
  const F = await fichiers(p);
  await recevoir(p, F.chiffree);
  await p.waitForSelector('#rcPass');
  await p.fill('#rcPass', 'faux');
  await viderToast(p);
  await p.click('.modal-f .btn-primary');
  okSi(await p.waitForSelector('#rcPassErr:not([hidden])', { timeout: 15000 }).then(() => true, () => false),
    'Recevoir : le mot de passe faux se dit sous le champ');
  okSi(await p.inputValue('#rcPass') === 'faux' && !(await p.textContent('#toast')).trim(),
    'Recevoir : même règle — l’erreur sur le champ, la saisie gardée');
  await ctx.close();
}

/* ---------- ④ la caméra ---------- */
for (const [nom, attendu] of [['NotAllowedError', 'La caméra est bloquée'], ['NotFoundError', 'Pas de caméra ici']]){
  const { ctx, p } = await page({ init: `navigator.mediaDevices.getUserMedia = async () => {
    const e = new Error('non'); e.name = ${JSON.stringify(nom)}; throw e; };` });
  await p.evaluate(async () => (await import('./ui/recevoir.js')).openRecevoir());
  await p.click('#rcScan');
  await attendre(p, () => !/Vise/.test(document.querySelector('#rcScanHint')?.textContent || ''), { message: 'la caméra répond' });
  const h = await p.textContent('#rcScanHint');
  okSi(h.startsWith(attendu) && h.includes('code'), nom + ' : « ' + h.slice(0, 40) + '… » — et le code reste le chemin');
  await ctx.close();
}

/* ---------- ⑤ ⑥ la protection : la copie exigée, puis la phrase perdue ---------- */
async function proteger(p){
  await ouvrirReglages(p);
  await p.click('#moiVerrou');
  await p.waitForSelector('.modal .pad-k');
  const tap = async code => { for (const d of code) await p.click(`.modal .pad-k[data-d="${d}"]`); };
  await tap('280941'); await p.waitForTimeout(150); await tap('280941');
  await p.waitForSelector('.phrase-grid');
  const words = await p.$$eval('.phrase-grid li', els => els.map(e => e.textContent.trim()));
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('#vw1');
  const n1 = +(await p.textContent('label[for="vw1"]')).replace(/\D/g, '') - 1;
  const n2 = +(await p.textContent('label[for="vw2"]')).replace(/\D/g, '') - 1;
  await p.fill('#vw1', words[n1]); await p.fill('#vw2', words[n2]);
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('.cp-what');
}
const terminer = p => p.$eval('.modal-f', f => [...f.querySelectorAll('button')].find(b => /Terminer/.test(b.textContent)).disabled);
{
  const { ctx, p } = await page({ partage: 'renonce' });
  await proteger(p);
  okSi((await p.textContent('.modal-f .btn-primary')).includes('Enregistrer la copie'), 'au doigt, la copie exigée dit « Enregistrer »');
  await p.click('.modal-f .btn-primary');
  await p.waitForTimeout(500);
  okSi(await terminer(p), 'renoncer au partage ne débloque pas « Terminer »');
  await ctx.close();
}
{
  const { ctx, p } = await page({ partage: 'accepte' });
  await proteger(p);
  await p.click('.modal-f .btn-primary');
  await attendre(p, () => (window.__partages || []).length === 1, { message: 'la feuille de partage reçoit la copie' });
  const [[nom]] = await p.evaluate(() => window.__partages);
  okSi(/^opencontact-copie-\d{4}-\d{2}-\d{2}\.oc\.txt$/.test(nom), 'la copie exigée passe par la feuille de partage (' + nom + ')');
  okSi(!(await terminer(p)), 'et « Terminer » se débloque');
  await p.click('.modal-f button:has-text("Terminer")');
  await attendre(p, async () => !!(await (await import('./engine/storage.js')).kvGet('oc_vault_v1')),
    { timeout: 20000, message: 'le coffre est écrit' });
  const bio = await p.$('.modal-confirm');
  if (bio) await p.click('.modal-confirm .modal-h .x');
  await p.waitForTimeout(300);

  /* ⑥ verrouillé, code oublié, phrase perdue */
  await p.evaluate(async () => (await import('./ui/verrou.js')).lockNow());
  await p.waitForSelector('.lock');
  await p.click('#lkForgot');
  await p.waitForSelector('#rcPerdue');
  await p.click('#rcPerdue');
  await p.waitForSelector('text=Phrase perdue');
  const txt = await p.textContent('.modal');
  okSi(txt.includes('personne ne peut rouvrir') && txt.includes('autres appareils reliés'),
    'phrase perdue : l’écran dit ce qu’on ne peut pas deviner, et où les pistes existent encore');
  const recharge = p.waitForEvent('load');
  await p.click('.modal-f .btn-danger');
  await recharge;
  await p.waitForSelector('#moiProfil, .td-head', { timeout: 15000 });
  const apres = await p.evaluate(async () => ({
    verrou: !!document.querySelector('.lock'),
    coffre: await (await import('./engine/storage.js')).kvGet('oc_vault_v1'),
    n: (await import('./ui/state.js')).S.companies.length
  }));
  okSi(!apres.verrou && !apres.coffre && apres.n === 0, 'et « Tout effacer » rouvre une app vide, sans verrou');
  await ctx.close();
}

/* ---------- ⑦ la localisation refusée ---------- */
{
  const { ctx, p } = await page({ route: 'pistes', init: () => {
    navigator.geolocation.getCurrentPosition = (_ok, ko) => ko({ code: 1, message: 'refus' });
  } });
  await p.waitForSelector('#piAffiner');
  await p.click('#piAffiner');
  await p.waitForSelector('[data-sort-set="dist"]');
  await viderToast(p);
  await p.click('[data-sort-set="dist"]');
  const t = await toastDe(p);
  okSi(t.startsWith('Localisation refusée') && t.includes('réglages'), '« Près de moi » refusé : où la rendre (« ' + t + ' »)');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E replis : ÉCHEC' : 'E2E replis : OK');
await browser.close();
server.close();

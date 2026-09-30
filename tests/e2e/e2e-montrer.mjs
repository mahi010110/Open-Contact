/* ============================================================
   Ce qui se voit ne se lit pas.

   La règle du mainteneur (30 septembre 2026) : « le user comprend
   directement en regardant ce qu'il faut faire, sans avoir à lire ou à
   chercher ». Elle a fait partir cinq phrases et deux toasts, par trois
   questions posées dans l'ordre — ① l'écran le dit-il déjà ? ② la
   phrase raconte-t-elle une suite de gestes ? ③ prévient-elle d'une
   perte qu'on ne peut pas voir venir ? Seule la ③ garde une phrase.

   Ce scénario ne se contente pas de vérifier que les phrases sont
   parties : un texte retiré ne prouve rien si ce qui devait le
   REMPLACER manque. Chaque point vérifie donc les deux moitiés — le
   silence, et la chose visible qui le rend possible.

   ① Premier lancement : sous le titre, les deux gestes, sans mode
     d'emploi — et « Voir un exemple » remplit l'écran sans toast,
     puisque « Retirer les pistes d'exemple » s'affiche au pied.
   ② « Moi » sans nom : le bouton seul. Ce que la phrase racontait, la
     feuille le MONTRE — son aperçu d'email doit exister.
   ③ « Tout est à jour » : le titre seul, et « Bientôt » juste dessous.
   ④ La fiche sans prochaine action dit « Aucune », et c'est le bouton
     « Planifier » qui porte le geste.
   ⑤ « Depuis mes e-mails » : trois pas numérotés, le premier EST le
     bouton ; copier le dit sur le bouton, sans toast — et le dit aussi à
     voix haute, puisque le toast le faisait ; le pied ne porte plus que
     « Lire ».
   ⑥ Prospecter sans campagnes : un choix à une seule option n'est pas
     un choix — « Écrire (n) » ouvre le premier composeur, sans feuille
     intermédiaire.
   ⑦ Au poste, « Échanger » vide : le panneau de détail se tait — la
     phrase du fil, juste à sa gauche, dit déjà le vide.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';
import { CAMPAGNES } from '../../ui/perimetre.js';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okSi = (cond, msg) => { if (cond) console.log(msg + ' ✓'); else fail(msg); };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const DESK = { viewport: { width: 1280, height: 800 } };
const j = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

async function ouvrir(opts, data = [], profil = {}){
  const ctx = await browser.newContext(opts);
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, [data, profil]);
  /* semer SANS recharger mesurerait l'état chargé à l'ouverture (§5) */
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
}
/* un toast se lit après l'avoir EFFACÉ, sinon on relit le précédent (§5) */
const viderToast = p => p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.textContent = ''; });
const toastLu = p => p.evaluate(() => {
  const t = document.getElementById('toast');
  return t && t.firstChild ? String(t.firstChild.nodeValue || '').trim() : '';
});
/* la prose d'un bloc : ce qui n'est ni un titre, ni un contrôle */
const prose = (p, sel) => p.evaluate(sel => {
  const b = document.querySelector(sel);
  if (!b) return null;
  const c = b.cloneNode(true);
  c.querySelectorAll('h1,h2,h3,button,a,label,svg,.ic').forEach(n => n.remove());
  return c.textContent.replace(/\s+/g, ' ').trim();
}, sel);

const PISTES = [
  { id: 'p1', name: 'Sopra Steria', city: 'Lille', status: 'active',
    contacts: [{ id: 'k1', name: 'Julie Martin', email: 'julie.martin@exemple.fr' }] },
  { id: 'p2', name: 'Wavestone', city: 'Paris', status: 'reply', nextAction: j(3), nextActionText: 'Préparer l’entretien' }
];

/* ---------- ① le premier lancement, aux deux ergonomies ---------- */
for (const [ergo, opts] of [['pouce', PHONE], ['poste', DESK]]){
  const p = await ouvrir(opts);
  await p.waitForSelector('#tdeAdd');
  const reste = await prose(p, '.td-empty');
  okSi(reste === '', `① premier lancement (${ergo}) : les deux gestes sous le titre, sans mode d’emploi`
    + (reste ? ` — lu : « ${reste} »` : ''));
  await viderToast(p);
  await p.click('#tdeDemo');
  await p.waitForSelector('#tdRmDemo');
  await p.waitForTimeout(300);
  const t = await toastLu(p);
  okSi(!t && await p.isVisible('#tdRmDemo'),
    `① « Voir un exemple » (${ergo}) : les pistes arrivent et « Retirer » s’affiche, sans toast`
    + (t ? ` — toast lu : « ${t} »` : ''));
  await p.context().close();
}

/* ---------- ② « Moi » sans nom, et ce qui remplace la phrase ---------- */
{
  const p = await ouvrir(PHONE);
  await p.evaluate(() => { location.hash = '#/moi'; });
  await p.waitForSelector('#moiProfil');
  const reste = await prose(p, '#view-moi .obj');
  okSi(reste === '', '② « Moi » sans nom : le bouton seul' + (reste ? ` — lu : « ${reste} »` : ''));
  await p.click('#moiProfil');
  await p.waitForSelector('#pfName');
  await p.fill('#pfFormation', 'BTS SIO');
  const ap = await p.evaluate(() => document.querySelector('#pfAp')?.textContent || '');
  okSi(/BTS SIO/.test(ap), '② la feuille MONTRE ce que la phrase racontait : l’aperçu d’email se remplit en tapant');
  await p.context().close();
}

/* ---------- ③ « Tout est à jour » ---------- */
{
  const p = await ouvrir(PHONE, [PISTES[1]], { name: 'Sam' });
  await p.waitForSelector('.td-clear');
  const reste = await prose(p, '.td-clear');
  okSi(reste === '' && !!(await p.$('details.tr-soon')),
    '③ « Tout est à jour » : le titre seul, « Bientôt » juste dessous'
    + (reste ? ` — lu : « ${reste} »` : ''));
  await p.context().close();
}

/* ---------- ④ la fiche sans prochaine action ---------- */
{
  const p = await ouvrir(PHONE, PISTES, { name: 'Sam' });
  await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === 'p1'));
  });
  await p.waitForSelector('#fiNa');
  const etat = (await p.textContent('.na-none')).trim();
  const geste = (await p.textContent('#fiNa')).trim();
  okSi(etat === 'Aucune' && geste === 'Planifier',
    `④ fiche : « Aucune » à côté de « Planifier » — le bouton porte le geste (lu : « ${etat} » / « ${geste} »)`);
  await p.context().close();
}

/* ---------- ⑤ « Depuis mes e-mails » ---------- */
for (const [ergo, opts] of [['pouce', PHONE], ['poste', DESK]]){
  const p = await ouvrir(opts, PISTES, { name: 'Sam' });
  await p.evaluate(async () => (await import('./ui/recevoir.js')).openImportMails());
  await p.waitForSelector('#rcMailTxt');
  const forme = await p.evaluate(() => {
    const lis = [...document.querySelectorAll('.modal-b ol > li')];
    return {
      n: lis.length,
      premier: !!lis[0]?.querySelector('#rcPrompt'),
      dernier: !!lis[2]?.querySelector('#rcMailTxt'),
      pied: [...document.querySelectorAll('.modal-f button')].map(b => b.textContent.trim())
    };
  });
  okSi(forme.n === 3 && forme.premier && forme.dernier,
    `⑤ « Depuis mes e-mails » (${ergo}) : trois pas, le premier est le bouton, le dernier le champ`);
  okSi(forme.pied.length === 1 && /^Lire$/.test(forme.pied[0]),
    `⑤ le pied ne porte plus que « Lire » (lu : ${forme.pied.join(' | ')})`);
  await viderToast(p);
  await p.click('#rcPrompt');
  await attendre(p, `/Consigne copiée/.test(document.querySelector('#rcPrompt')?.textContent || '')`,
    { timeout: 4000, message: 'le bouton de l’étape 1 dit « Consigne copiée »' });
  /* sans toast, la phrase doit quand même se DIRE à qui n'a pas l'écran */
  const dit = await attendre(p, `(document.getElementById('annonce')?.textContent || '') === 'Consigne copiée.'`,
    { timeout: 3000 }).then(() => true, () => false);
  okSi(dit, `⑤ (${ergo}) « Consigne copiée. » s’annonce dans la région vivante — le toast le faisait`);
  const t = await toastLu(p);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  okSi(!t && clip.length > 40,
    `⑤ copier le dit SUR le bouton, sans toast, et la consigne est dans le presse-papier`
    + (t ? ` — toast lu : « ${t} »` : ''));
  await p.context().close();
}

/* ---------- ⑥ Prospecter sans campagnes ---------- */
if (CAMPAGNES) console.log('⑥ campagnes allumées : la bifurcation a lieu d’être, contrôle sauté');
else {
  const p = await ouvrir(PHONE, PISTES, { name: 'Sam' });
  await p.evaluate(async () => (await import('./ui/prospect.js')).openProspect());
  await p.waitForSelector('.pk[data-id="p1"]');
  await p.click('.pk[data-id="p1"]');
  const verbe = (await p.textContent('.modal-f .btn-primary')).trim();
  okSi(verbe === 'Écrire (1)', `⑥ le bouton dit le geste (lu : « ${verbe} »)`);
  await p.click('.modal-f .btn-primary');
  await p.waitForTimeout(500);
  const titre = await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-h')].pop()?.textContent || '');
  okSi(/Écrire — Sopra Steria/.test(titre) && !(await p.$('#pmOne')),
    '⑥ « Écrire (1) » ouvre le composeur, sans feuille « Une par une » entre les deux');
  await p.context().close();
}

/* ---------- ⑦ « Échanger » vide, au poste ---------- */
{
  const p = await ouvrir(DESK);
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForSelector('.ec-detail', { state: 'attached' });
  const detail = await p.evaluate(() => document.querySelector('.ec-detail').textContent.trim());
  const fil = await p.evaluate(() => document.querySelector('.ec-rien')?.textContent.trim() || '');
  okSi(detail === '' && fil.length > 0,
    '⑦ « Échanger » vide au poste : une phrase pour le vide, pas deux' + (detail ? ` — détail lu : « ${detail} »` : ''));
  await p.context().close();
}

okSi(!errors.length, 'zéro erreur console' + (errors.length ? ' — ' + errors.join(' | ') : ''));
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E montrer : ÉCHEC' : 'E2E montrer : OK');

/* ============================================================
   « Moi » rangé par usage — et le profil qui sert ailleurs.

   Trois questions, trois endroits : est-ce que mes emails me
   présentent bien (« Ce que j'envoie »), est-ce que je risque de tout
   perdre (« À l'abri »), qui m'aide si ça cloche (le bas). Ce scénario
   garde ce qui se défait en silence :

   ① la porte « Réglages » ne revient pas au pouce ;
   ② « sans filet » ne parle QUE sans filet, et se tait dès qu'une copie
     part — il a été retiré une fois pour avoir parlé à chaque passage ;
   ③ au doigt, la copie passe par la feuille de partage (une copie
     restée sur le téléphone ne rattrape pas un téléphone perdu), et
     renoncer au partage ne compte pas comme une copie ;
   ④ « Effacer cet appareil » efface VRAIMENT — y compris la vieille clé
     `oc_data_v2` qu'une base vide relit au chargement ;
   ⑤ le profil sert là où l'on décide : « Par où commencer » fait monter
     les pistes qui prennent ce que tu cherches, et le composeur montre
     « Compléter mon profil » quand le mail partirait faux.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okSi = (cond, msg) => { if (cond) console.log(msg + ' ✓'); else fail(msg); };

const PROFIL = { name: 'Sam Martin', formation: 'BTS SIO', ecole: 'Lycée Eiffel', email: 'sam@lycee.fr',
  recherche: 'alternance', debut: '2027-09-01', fin: '2029-08-31' };
const pistes = n => Array.from({ length: n }, (_, i) => ({
  id: 'p' + i, name: 'Piste ' + String(i + 1).padStart(2, '0'), city: 'Lille', status: 'todo',
  contacts: [], updatedAt: 1000 - i }));

/* une page « Moi » semée par le vrai stockage, puis RECHARGÉE : semer
   sans recharger mesure l'état d'avant (§5, corollaire ②) */
async function page({ largeur = 390, profil = PROFIL, data = pistes(24), partage = null, route = 'moi' } = {}){
  const doigt = largeur < 901;
  const ctx = await browser.newContext({ viewport: { width: largeur, height: doigt ? 844 : 800 },
    hasTouch: doigt, isMobile: doigt, acceptDownloads: true });
  /* La feuille de partage n'existe pas sous Chromium desktop : on la
     simule, et on ENREGISTRE ce qu'elle reçoit. Elle refuse le `.oc` comme
     le fait Chrome (liste fermée d'extensions), pour prouver le repli
     `.oc.txt`. */
  if (partage) await ctx.addInitScript(mode => {
    window.__partages = [];
    navigator.canShare = d => !!(d && d.files && d.files.every(f => /\.txt$/.test(f.name)));
    navigator.share = async d => {
      if (mode === 'renonce'){ const e = new Error('abort'); e.name = 'AbortError'; throw e; }
      window.__partages.push(d.files.map(f => ({ name: f.name, size: f.size })));
    };
  }, partage);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/' + route, { waitUntil: 'load' });
  await p.evaluate(async ([pr, d]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, [profil, data]);
  await p.reload({ waitUntil: 'load' });
  return { ctx, p };
}
const lastBackupAt = p => p.evaluate(async () => (await import('./ui/state.js')).S.profile.flags.lastBackupAt || 0);

/* ---------- ① et ② : pas de porte, et « sans filet » au bon moment ---------- */
{
  const { ctx, p } = await page({ partage: 'accepte' });
  await p.waitForSelector('#moiVerrou');
  okSi(!(await p.$('#moiReglages')), 'plus de porte « Réglages » : les lignes sont sur « Moi »');
  okSi(!!(await p.$('#moiSync')) && !!(await p.$('#moiRestore')), 'appareils et restauration à portée, sans détour');
  await attendre(p, () => !!document.querySelector('#moiFilet'), { message: 'l’état « sans filet »' });
  okSi((await p.textContent('#moiFilet')).includes('Tes 24 pistes n’existent que sur cet appareil'),
    'sans filet : l’état nomme le fait');
  okSi(await p.$eval('#moiAbri', e => e.classList.contains('fs-alert')), 'et le cadre prend le bord ambre');

  /* ③ la copie par la feuille de partage */
  okSi((await p.textContent('#moiBkDo')).trim() === 'Mettre à l’abri', 'au doigt, le bouton dit le but');
  await p.click('#moiBkDo');
  await attendre(p, () => (window.__partages || []).length === 1, { message: 'la feuille de partage reçoit la copie' });
  const [[fichier]] = await p.evaluate(() => window.__partages);
  okSi(/^opencontact-copie-\d{4}-\d{2}-\d{2}\.oc\.txt$/.test(fichier.name) && fichier.size > 100,
    'le `.oc` refusé par le partage repart en `.oc.txt` — même nom, même contenu');
  okSi(await lastBackupAt(p) > 0, 'la copie partagée compte comme une copie');
  await attendre(p, () => !document.querySelector('#moiFilet'), { message: '« sans filet » se tait après la copie' });
  okSi(!(await p.$eval('#moiAbri', e => e.classList.contains('fs-alert'))), 'et le bord ambre part avec lui');
  await ctx.close();
}
{
  /* peu de pistes : rien ne vaut d'inquiéter */
  const { ctx, p } = await page({ data: pistes(3) });
  await p.waitForSelector('#moiVerrou');
  await p.waitForTimeout(400);
  okSi(!(await p.$('#moiFilet')), 'trois pistes : aucun « sans filet »');
  await ctx.close();
}
{
  /* ③ renoncer au partage : rien n'est parti, rien ne se compte */
  const { ctx, p } = await page({ partage: 'renonce' });
  await p.waitForSelector('#moiBkDo');
  await p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.textContent = ''; });
  await p.click('#moiBkDo');
  await p.waitForTimeout(500);
  okSi(await lastBackupAt(p) === 0, 'partage abandonné : aucune copie comptée');
  okSi(!!(await p.$('#moiFilet')), 'et « sans filet » reste — il n’y a toujours pas de filet');
  await ctx.close();
}
{
  /* au poste : le téléchargement d'avant, sous son vrai nom */
  const { ctx, p } = await page({ largeur: 1280 });
  await p.waitForSelector('#moiBkDo');
  okSi((await p.textContent('#moiBkDo')).trim() === 'Télécharger', 'au poste, le bouton télécharge');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#moiBkDo')]);
  okSi(/^opencontact-copie-\d{4}-\d{2}-\d{2}\.oc$/.test(dl.suggestedFilename()), 'la copie garde son nom `.oc`');
  await ctx.close();
}

/* ---------- ④ effacer cet appareil ---------- */
{
  const { ctx, p } = await page();
  await p.waitForSelector('#moiEfface');
  /* une vieille clé d'avant la v3 : une base vide la relit au chargement */
  await p.evaluate(() => localStorage.setItem('oc_data_v2', JSON.stringify([{ id: 'v2', name: 'Revenante', status: 'todo' }])));
  await p.click('#moiEfface');
  await p.waitForSelector('text=Effacer cet appareil ?');
  const msg = await p.textContent('.modal');
  okSi(msg.includes('24 pistes') && msg.includes('ce sera définitif'),
    'la question montre ce qu’on ne peut pas deviner : combien part, et qu’aucun filet n’existe');
  /* le rechargement, pas une navigation quelconque : les feuilles poussent
     et consomment des entrées d'historique, que `waitForNavigation`
     prendrait pour elle — et l'on mesurerait la page d'AVANT */
  const recharge = p.waitForEvent('load');
  await p.click('.modal .btn-danger');
  await recharge;
  await p.goto(base + '/#/moi', { waitUntil: 'load' });
  await p.waitForSelector('#moiProfil');
  const apres = await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    return { n: S.companies.length, nom: S.profile.name, v2: localStorage.getItem('oc_data_v2') };
  });
  okSi(apres.n === 0 && !apres.nom, 'effacé : ni piste ni profil au rechargement');
  okSi(apres.v2 === null, 'et la vieille clé `oc_data_v2` ne ressuscite rien');
  okSi(!(await p.$('#moiEfface')), 'rien à effacer : la ligne n’existe plus');
  await ctx.close();
}

/* ---------- ⑤ le profil sert là où l'on décide ---------- */
{
  const qui = [
    { id: 'a', name: 'Aster Stages', status: 'todo', positions: ['stage'], updatedAt: 3,
      contacts: [{ id: 'ca', name: 'Ana', email: 'ana@aster.test' }] },
    { id: 'b', name: 'Borée Alternance', status: 'todo', positions: ['alternance'], updatedAt: 2, contacts: [] },
    { id: 'c', name: 'Cirrus Muet', status: 'todo', updatedAt: 1,
      contacts: [{ id: 'cc', name: 'Céline', email: 'celine@cirrus.test' }] }
  ];
  const { ctx, p } = await page({ route: 'aujourdhui', data: qui });
  await p.waitForSelector('.act-start');
  const ordre = await p.$$eval('.act-start .act-verb', els => els.map(e => e.textContent.trim()));
  okSi(ordre.join(' > ') === 'Borée Alternance > Cirrus Muet > Aster Stages',
    '« Par où commencer » : prend ce que tu cherches > on ne sait pas > ne prend pas (' + ordre.join(' > ') + ')');
  okSi((await p.textContent('.act-start[data-id="b"]')).includes('prend des alternants'),
    'et la raison se lit sur la ligne');
  await ctx.close();
}
{
  /* sans rien choisi, l'ordre d'avant est intact : l'adresse passe devant */
  const qui = [
    { id: 'b', name: 'Borée Alternance', status: 'todo', positions: ['alternance'], updatedAt: 2, contacts: [] },
    { id: 'a', name: 'Aster Stages', status: 'todo', positions: ['stage'], updatedAt: 3,
      contacts: [{ id: 'ca', name: 'Ana', email: 'ana@aster.test' }] }
  ];
  const { ctx, p } = await page({ route: 'aujourdhui', data: qui, profil: { name: 'Sam', formation: 'BTS SIO' } });
  await p.waitForSelector('.act-start');
  const ordre = await p.$$eval('.act-start .act-verb', els => els.map(e => e.textContent.trim()));
  okSi(ordre[0] === 'Aster Stages', 'sans recherche choisie, le critère ne départage rien');

  /* le composeur : « Compléter mon profil » tant que le mail partirait faux */
  await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    (await import('./ui/mail.js')).openMail(S.companies.find(c => c.id === 'a'), { ctId: 'ca' });
  });
  await p.waitForSelector('#mBody');
  okSi(!!(await p.$('#mProfil')), 'recherche non choisie : le composeur propose de compléter le profil');
  await ctx.close();
}

/* ---------- Mes appareils : quel appareil fait quoi ---------- */
{
  const { ctx, p } = await page();
  await p.waitForSelector('#moiSync');
  await p.click('#moiSync');
  await p.waitForSelector('#syNew');
  okSi((await p.textContent('#syNew')).includes('sur le premier appareil')
    && (await p.textContent('#syJoin')).includes('sur l’appareil à ajouter'),
    'chaque choix dit sur quel appareil il se fait');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E moi : ÉCHEC' : 'E2E moi : OK');
await browser.close();
server.close();

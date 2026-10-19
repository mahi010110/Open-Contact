/* ============================================================
   OpenContact — e2e : PREMIERS PAS
   (lot F4, idée 6 de la page de concept, choisie par le mainteneur le
   13 octobre 2026 : « trois cases en haut d'Aujourd'hui — remplir ton
   profil, ajouter une piste, écrire ton premier mail. Chacune se coche
   toute seule quand c'est fait, et la tranche disparaît. On apprend en
   faisant, pas en lisant. »)

   Joué comme un nouveau venu, sur l'app réelle, sans réseau :
   ① tout neuf : les trois pas prennent la place des gestes de
     l'accueil — une liste ordonnée, le profil et la piste se tapent, le
     mail attend une piste ; « Voir un exemple » reste ;
   ② chaque pas mène là où il se fait (« Mon profil », « Nouvelle
     piste », le composeur sur la piste) ;
   ③ le profil rempli, la case se coche SEULE ; une piste ajoutée, la
     liste devient la première tranche, « Premiers pas 2/3 », et le
     mail se tape ;
   ④ le premier mail parti, la tranche disparaît — et ne revient pas
     au rechargement ;
   ⑤ l'exemple montre l'écran tel qu'il SERA : la tranche s'y tait ; un
     appareil qui a déjà écrit ne la voit jamais ;
   ⑥ une case cochée se DIT (« : fait ») à qui n'a pas l'écran ;
   ⑦ 320 px à 200 % : rien ne sort, rien n'est coupé ; pouce et poste,
     clair et sombre, captures à regarder ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, graine = null } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  if (graine){
    await p.evaluate(async ps => { const st = await import('./engine/storage.js'); await st.kvInit();
      await st.kvSet(st.DATA_KEY, JSON.stringify(ps)); }, graine);
    await p.reload();
    await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  }
  await p.waitForTimeout(300);
  return { ctx, p };
}
/* la liste telle qu'on la lit : chaque pas, son état, s'il se tape */
const pas = p => p.evaluate(() => [...document.querySelectorAll('#tdPas > li')].map(li => {
  const e = li.firstElementChild;
  return `${e.querySelector('.pp-l').textContent}:${e.classList.contains('pp-fait') ? 'fait' : e.tagName === 'BUTTON' ? 'à faire' : 'attend'}`;
}).join(' | '));
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop()?.querySelector('.mh-t')?.textContent || '');
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};

/* ---------- ①-④ un nouveau venu, au pouce ---------- */
{
  const { ctx, p } = await ecran('pouce');
  ok(await pas(p) === 'Remplir mon profil:à faire | Ajouter une piste:à faire | Écrire mon premier mail:attend',
    '① tout neuf : trois pas, le mail attend une piste — ' + await pas(p));
  ok(await p.evaluate(() => !!document.querySelector('.td-empty #tdPas') && !document.querySelector('#tdeAdd')
      && document.querySelector('#tdPas').tagName === 'OL' && !!document.querySelector('#tdeDemo')),
    '① ils prennent la place des gestes de l’accueil — une liste ordonnée, « Voir un exemple » reste');
  await p.screenshot({ path: `${SHOTS}/150-premiers-pas-neuf-pouce.png` });

  /* ② chaque pas mène là où il se fait */
  await p.click('[data-pp="profil"]');
  await p.waitForTimeout(400);
  ok(await dessus(p) === 'Mon profil', '② « Remplir mon profil » ouvre « Mon profil »');
  await fermer(p);
  await p.click('[data-pp="piste"]');
  await p.waitForTimeout(400);
  ok(await dessus(p) === 'Nouvelle piste', '② « Ajouter une piste » ouvre la capture');
  await fermer(p);

  /* ③ le profil rempli : la case se coche seule */
  await p.evaluate(async () => { const { S, saveProfile, bus } = await import('./ui/state.js');
    Object.assign(S.profile, { name: 'Tom Durand', formation: 'BTS SIO', recherche: 'alternance' }); saveProfile(); bus.refresh(); });
  await p.waitForTimeout(300);
  ok(await pas(p) === 'Remplir mon profil:fait | Ajouter une piste:à faire | Écrire mon premier mail:attend',
    '③ le profil rempli, sa case se coche seule — ' + await pas(p));
  /* ⑥ une case cochée se dit */
  ok(await p.evaluate(() => /Remplir mon profil : fait/.test(document.querySelector('#tdPas li').textContent.replace(/\s+/g, ' '))),
    '⑥ une case cochée se dit « : fait » à qui n’a pas l’écran');

  /* une piste : la liste devient la première tranche, et le mail se tape */
  await p.evaluate(async () => { const { S, saveData, bus } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.companies.push(normalizeCompany({ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo',
      contacts: [{ id: 'jm', name: 'Julie Marchand', email: 'julie@aztek.test' }] })); saveData(); bus.refresh(); });
  await p.waitForTimeout(300);
  const t = await p.evaluate(() => { const s = document.querySelector('.tr-pas');
    return s ? { titre: s.querySelector('.tr-h').textContent.replace(/\s+/g, ' ').trim(),
                 premiere: document.querySelector('#view-aujourdhui .tranche') === s } : null; });
  ok(t && t.titre === 'Premiers pas 2/3' && t.premiere, '③ une piste : « Premiers pas 2/3 », en première tranche — ' + JSON.stringify(t));
  ok(await pas(p) === 'Remplir mon profil:fait | Ajouter une piste:fait | Écrire mon premier mail:à faire',
    '③ le mail se tape maintenant — ' + await pas(p));
  await p.screenshot({ path: `${SHOTS}/150-premiers-pas-2sur3-pouce.png` });
  await p.click('[data-pp="mail"]');
  await p.waitForSelector('#mBody');
  ok(/^Bonjour Julie Marchand,/.test(await p.evaluate(() => document.querySelector('#mBody').value)),
    '② « Écrire mon premier mail » ouvre le composeur sur la piste');
  await fermer(p);

  /* ④ le premier mail parti : la tranche disparaît, pour de bon */
  await p.evaluate(async () => { const { S, saveData, bus } = await import('./ui/state.js');
    S.companies[0].appliedAt = new Date().toISOString().slice(0, 10); S.companies[0].status = 'active'; saveData(); bus.refresh(); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('#tdPas, .tr-pas')), '④ le premier mail parti, la tranche disparaît');
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('#tdPas, .tr-pas')), '④ et ne revient pas au rechargement');
  await ctx.close();
}

/* ---------- ⑤ l'exemple, et un appareil qui a déjà écrit ---------- */
{
  const { ctx, p } = await ecran('exemple');
  await p.click('#tdeDemo');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('#tdPas, .tr-pas')), '⑤ avec les pistes d’exemple, la tranche se tait');
  await ctx.close();
}
{
  const { ctx, p } = await ecran('ancien', { graine: [{ id: 'a', name: 'Advens', status: 'active', appliedAt: '2026-09-01' },
                                                     { id: 'b', name: 'Thales', status: 'todo' }] });
  ok(await p.evaluate(() => !document.querySelector('#tdPas, .tr-pas')), '⑤ un appareil qui a déjà écrit ne la voit jamais');
  await ctx.close();
}

/* ---------- ⑦ 320 px à 200 %, pouce et poste, clair et sombre ---------- */
for (const [nom, vp, sombre, graine] of [
  ['320-200', { width: 320, height: 640 }, false, null],
  ['pouce-sombre', { width: 390, height: 844 }, true, [{ id: 'az', name: 'Aztek', status: 'todo' }]],
  ['poste', { width: 1280, height: 800 }, false, null],
  ['poste-piste', { width: 1280, height: 800 }, false, [{ id: 'az', name: 'Aztek', status: 'todo' }]],
  ['poste-sombre', { width: 1280, height: 800 }, true, [{ id: 'az', name: 'Aztek', status: 'todo' }]]]){
  const { ctx, p } = await ecran(nom, { vp, sombre, graine });
  if (nom === '320-200'){
    await p.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    await p.waitForTimeout(200);
  }
  const m = await p.evaluate(() => {
    const l = document.querySelector('#tdPas');
    if (!l) return null;
    const b = l.getBoundingClientRect();
    return { hors: [...l.querySelectorAll('*')].some(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > b.right + 1 || r.left < b.left - 1); }),
             coupe: [...l.querySelectorAll('.pp-l')].some(e => e.scrollWidth > e.clientWidth + 1),
             page: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  ok(m && !m.hors && !m.coupe && !m.page, `⑦ ${nom} : rien ne sort, rien n’est coupé — ${JSON.stringify(m)}`);
  await p.evaluate(() => document.querySelector('#tdPas')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${SHOTS}/150-premiers-pas-${nom}.png` });
  await ctx.close();
}

ok(!errors.length, '⑦ zéro erreur console' + (errors.length ? ' : ' + errors.join(' | ') : ''));
await browser.close();
server.close();
if (ko){ console.log(`\n${ko} échec(s)`); process.exit(1); }
console.log('\nPremiers pas ✓');

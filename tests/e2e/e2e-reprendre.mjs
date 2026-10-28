/* ============================================================
   OpenContact — e2e : UN SUIVI QUI SE REMPLIT SEUL (lot R2)
   (docs/propositions/R2-suivi.md, validée le 20 octobre 2026)

   Ouvert à tous depuis la 7.0.0, sur l'app réelle :
   ① « Mes pistes » dit tes chiffres à la place du compte — écrites,
     réponses, décrochées —, déduits des pistes semées ; une recherche
     garde son « N sur M » ; rien d'écrit, le compte de pistes revient ;
   ② après sept jours sans un geste, « Aujourd'hui » s'ouvre sur
     « Reprendre » : trois lignes, dans l'ordre (les dates dépassées,
     puis ce qui se tait, puis par où commencer), sans un chiffre de
     retard ni un compte de ce qui a glissé, le nom sur UN bord ; le
     reste est replié, sans un chiffre au repos ;
   ③ ce qui arrive SANS geste (un merci, un ami qui t'ajoute) ne
     referme pas la pause ; un geste d'hier, si ;
   ④ pas de reprise tant que les premiers pas sont là, ni avec les
     pistes d'exemple ;
   ⑤ le premier geste referme la tranche : l'écran redevient celui de
     tous les jours ;
   ⑥ au poste, la même tranche, en colonne (l'état d'un geste, pas le
     tableau) ;
   pouce clair et sombre, petit téléphone, poste ; zéro erreur console.
   Quatre mutations à l'appui : le retard qui revient sur la ligne, la
   pause qui compte un merci comme un geste, les chiffres qui ne
   s'affichent pas, le repère qui disparaît (le nom perd son bord).
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const J = 864e5, now = Date.now();
const iso = d => new Date(now + d * J).toISOString().slice(0, 10);
/* une recherche en cours, laissée une dizaine de jours */
const PISTES = [
  { id: 'adv', name: 'Advens', city: 'Lille', status: 'active', appliedAt: iso(-14), nextAction: iso(-5), nextActionText: 'Relancer', updatedAt: now - 10 * J,
    contacts: [{ id: 'c1', name: 'Nadia Rahmani', email: 'nadia@advens.test' }], history: [{ d: iso(-14), t: 'Email envoyé' }] },
  { id: 'ora', name: 'Orange Cyberdefense', city: 'Lille', status: 'reply', appliedAt: iso(-20), nextAction: iso(-2), nextActionText: 'Préparer l’entretien', updatedAt: now - 9 * J,
    contacts: [{ id: 'c2', name: 'Paul Morel', email: 'paul@orange.test' }], history: [{ d: iso(-12), t: 'Statut → Réponse' }] },
  { id: 'cap', name: 'Capgemini', city: 'Lille', status: 'active', appliedAt: iso(-30), updatedAt: now - 30 * J, history: [{ d: iso(-30), t: 'Email envoyé' }],
    contacts: [{ id: 'c3', name: 'Léa Martin', email: 'lea@cap.test' }] },
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', updatedAt: now - 15 * J, contacts: [{ id: 'c4', name: 'Sam Petit', email: 'sam@kiabi.test' }] },
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'todo', updatedAt: now - 15 * J },
  { id: 'sop', name: 'Sopra Steria', city: 'Lille', status: 'reply', appliedAt: iso(-40), closedReason: 'won', closedAt: iso(-11), updatedAt: now - 11 * J },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'active', appliedAt: iso(-10), nextAction: iso(3), nextActionText: 'Relancer', updatedAt: now - 10 * J }
];
const PROFIL = { name: 'Tom Durand', email: 'tom@prive.test', formation: 'BTS SIO', recherche: 'alternance' };
/* hier, deux choses sont ARRIVÉES — aucune n'est un geste */
const JOURNAL = [{ t: now - 10 * J, txt: 'Email envoyé : Advens', cid: 'adv' },
                 { t: now - J, txt: 'Merci de Léa : Julie Marchand (Thales)', cid: null },
                 { t: now - J, txt: 'Karim t’a ajouté à ses amis', cid: null }];

async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, hash = '#/aujourdhui', 
                            pistes = PISTES, profil = PROFIL, journal = JOURNAL, mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  /* semer APRÈS le démarrage, puis recharger : l'app lit son état à
     l'ouverture (§5) */
  await p.evaluate(async ([ps, pr, jn]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(jn));
  }, [pistes, profil, journal]);
  await p.evaluate(h => { location.hash = h; }, hash);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(350);
  return { ctx, p };
}

/* ce que « Reprendre » montre, lu dans la page */
const reprise = p => p.evaluate(() => {
  const t = document.querySelector('#tdReprendre');
  if (!t) return null;
  const rows = [...t.querySelectorAll('.act-row')];
  /* `checkVisibility` et pas la boîte : le contenu d'un <details> fermé
     garde une boîte dans Chromium (content-visibility), il ne se peint
     pas pour autant — mesurer la boîte accusait « Bientôt », replié */
  const visible = e => e.checkVisibility();
  const reste = document.querySelector('#tdReste');
  return {
    ids: rows.map(r => r.dataset.id),
    sortes: rows.map(r => r.classList.contains('act-quiet') ? 'silence' : r.classList.contains('act-start') ? 'debut' : 'action'),
    /* pas un chiffre de retard, pas un compte, pas de « 30 j » */
    marques: t.querySelectorAll('.mark, .tr-n').length,
    jours: /\b\d+\s*j\b/.test(t.textContent),
    /* le nom sur un seul bord */
    bords: [...new Set(rows.map(r => Math.round(r.querySelector('.act-verb').getBoundingClientRect().left)))],
    /* le reste replié, sans un chiffre au repos */
    reste: reste ? { ouvert: reste.open, chiffres: [...document.querySelectorAll('#view-aujourdhui .tr-n')].filter(visible).length,
                     titre: reste.querySelector('summary').textContent.trim() } : null,
    tableau: !!document.querySelector('#view-aujourdhui .td-board'),
    premier: document.querySelector('#view-aujourdhui .tranche')?.id || ''
  };
});
const compte = p => p.evaluate(() => document.querySelector('#piCount')?.textContent.trim() || '');
const lisible = r => r ? `${r.ids.join(',')} (${r.sortes.join(',')}), marques ${r.marques}, jours ${r.jours}, bords ${r.bords.join('/')}, reste ${JSON.stringify(r.reste)}` : 'absente';
const repriseOk = r => !!r && r.ids.join(',') === 'adv,ora,cap' && r.sortes.join(',') === 'action,action,silence'
  && r.marques === 0 && !r.jours && r.bords.length === 1
  && !!r.reste && !r.reste.ouvert && r.reste.chiffres === 0 && r.reste.titre === 'Tout le reste' && !r.tableau;

/* ---------- ① tes chiffres, en tête de « Mes pistes » ---------- */
{
  const { ctx, p } = await ecran('chiffres', { hash: '#/pistes' });
  ok(await compte(p) === '5 écrites · 2 réponses · 1 décrochée',
    `① les chiffres à la place du compte, déduits des pistes — « ${await compte(p)} »`);
  /* L'EN-TÊTE TIENT au pouce : « Choisir » sur la ligne du titre, les
     chiffres sur UNE ligne sous lui. Vu sous WebKit puis à la police
     d'un iPhone (17 px) : « Choisir » tombait seul à gauche, puis les
     trois chiffres s'empilaient sur trois rangs (28 octobre 2026). */
  for (const [larg, police] of [[390, '17px'], [360, '16px'], [320, '16px']]){
    await p.setViewportSize({ width: larg, height: 844 });
    const t = await p.evaluate(async f => {
      document.documentElement.style.fontSize = f;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const r = s => document.querySelector(s).getBoundingClientRect();
      const h1 = r('#view-pistes .pi-head h1'), ch = r('#piProspect'), n = document.querySelector('#piCount');
      return { choisir: Math.round(ch.top - h1.top), droite: Math.round(innerWidth - ch.right),
               rangs: Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)) };
    }, police);
    ok(Math.abs(t.choisir) <= 12 && t.droite < 40 && t.rangs === 1,
      `① ${larg} px, police ${police} : « Choisir » en haut à droite, les chiffres sur une ligne — ${JSON.stringify(t)}`);
  }
  await p.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.fill('#piQ', 'Advens');
  await p.waitForTimeout(500);
  ok(/^1 sur 7$/.test(await compte(p)), `① une recherche garde son compte — « ${await compte(p)} »`);
  await p.screenshot({ path: `${SHOTS}/163-chiffres-recherche.png` });
  await ctx.close();
}
{
  const { ctx, p } = await ecran('chiffres-vides', { hash: '#/pistes',
    pistes: [{ id: 'a', name: 'Aztek', status: 'todo' }, { id: 'b', name: 'Thales', status: 'todo' }] });
  ok(await compte(p) === '2 pistes', `① rien d'écrit : trois zéros ne disent rien, le compte de pistes reste — « ${await compte(p)} »`);
  await ctx.close();
}

/* ---------- ② ③ ⑥ la reprise, sur chaque ergonomie ---------- */
for (const [nom, vp, sombre] of [['pouce', { width: 390, height: 844 }, false], ['pouce-sombre', { width: 390, height: 844 }, true],
                                 ['petit', { width: 320, height: 640 }, false], ['poste', { width: 1280, height: 800 }, false]]){
  const { ctx, p } = await ecran(nom, { vp, sombre });
  const r = await reprise(p);
  ok(repriseOk(r), `② ${nom} : « Reprendre », trois choses dans l'ordre, sans un jour ni un compte, le nom sur un bord, le reste replié — ${lisible(r)}`);
  ok(r && r.premier === 'tdReprendre', `② ${nom} : l'écran s'OUVRE sur elle — première tranche « ${r && r.premier} »`);
  await p.screenshot({ path: `${SHOTS}/163-reprendre-${nom}.png`, fullPage: true });
  if (nom === 'pouce'){
    /* le reste s'ouvre si on le veut, et garde son état d'un rendu à l'autre */
    await p.click('#tdReste > summary');
    await p.waitForTimeout(200);
    const dedans = await p.evaluate(() => [...document.querySelectorAll('#tdReste .act-row')].map(x => x.dataset.id).join(','));
    ok(dedans === 'wor', `② ${nom} : ouvert, le reste n'a que ce que « Reprendre » ne montre pas — ${dedans}`);
    await p.evaluate(async () => (await import('./ui/state.js')).bus.refresh());
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.querySelector('#tdReste')?.open === true), `② ${nom} : ouvert, il le reste après un rendu`);
    await p.screenshot({ path: `${SHOTS}/163-reprendre-reste.png`, fullPage: true });
  }
  await ctx.close();
}

/* ---------- ③ un geste d'hier referme la pause ---------- */
{
  const { ctx, p } = await ecran('geste-hier', { journal: [...JOURNAL, { t: now - J, txt: 'Donné (QR) : 1 piste(s)', ids: ['kia'] }] });
  ok(await reprise(p) === null, '③ un don d’hier est un geste : pas de reprise');
  await ctx.close();
}

/* ---------- ④ ni pendant les premiers pas, ni avec l'exemple ---------- */
{
  const froides = PISTES.map(c => ({ id: c.id, name: c.name, city: c.city, status: 'todo', updatedAt: now - 20 * J }));
  const { ctx, p } = await ecran('premiers-pas', { pistes: froides, journal: [] });
  ok(await reprise(p) === null && await p.evaluate(() => !!document.querySelector('#tdPas')),
    '④ rien n’est encore parti : les premiers pas restent, pas de reprise');
  await ctx.close();
}
{
  const { ctx, p } = await ecran('exemple', { pistes: [...PISTES, { id: 'demo1', name: 'Exemple SA', status: 'active', demo: true, updatedAt: now - 20 * J }] });
  ok(await reprise(p) === null, '④ avec les pistes d’exemple, la reprise se tait');
  await ctx.close();
}

/* ---------- ⑤ le premier geste referme la tranche ---------- */
{
  const { ctx, p } = await ecran('premier-geste');
  await p.click('#tdReprendre .act-row[data-id="adv"] .act-fait');
  await p.waitForTimeout(1200);
  ok(await reprise(p) === null && await p.evaluate(() => !!document.querySelector('#view-aujourdhui .tr-late')),
    '⑤ « Fait » sur la première ligne : la tranche se referme, l’écran de tous les jours revient');
  await ctx.close();
}

/* ---------- les mutations : le scénario sait encore échouer ---------- */
const lire = f => readFile(path.join(ROOT, f), 'utf8');
{
  const today = await lire('ui/today.js');
  const m = today.replace("const when = o.sansRetard ? ''", "const when = false ? ''");
  ok(m !== today, 'mutation ① le retard qui revient : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-retard', { mutations: { 'ui/today.js': m } });
  const r = await reprise(p);
  ok(!repriseOk(r), `mutation ① : la garde de la reprise rougit — ${lisible(r)}`);
  await ctx.close();
}
{
  const suivi = await lire('engine/suivi.js');
  const m = suivi.replace("if (!e || !(e.cid || (Array.isArray(e.ids) && e.ids.length))) continue;", 'if (!e) continue;');
  ok(m !== suivi, 'mutation ② le merci compté comme un geste : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-merci', { mutations: { 'engine/suivi.js': m } });
  ok(!repriseOk(await reprise(p)), 'mutation ② : la garde de la pause rougit — un merci ne referme pas une pause');
  await ctx.close();
}
{
  const pi = await lire('ui/pistes.js');
  const m = pi.replace("const chiffres = chiffresTexte(mesChiffres(S.companies));", "const chiffres = '';");
  ok(m !== pi, 'mutation ③ les chiffres absents : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-chiffres', { hash: '#/pistes', mutations: { 'ui/pistes.js': m } });
  ok(await compte(p) !== '5 écrites · 2 réponses · 1 décrochée', `mutation ③ : la garde des chiffres rougit — « ${await compte(p)} »`);
  await ctx.close();
}
{
  const today = await lire('ui/today.js');
  const m = today.replace("const repereHTML = nom => `<span class=\"act-sorte\" aria-hidden=\"true\">${ic(nom, 'ic-14')}</span>`;", "const repereHTML = nom => '';");
  ok(m !== today, 'mutation ④ le repère absent : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-bord', { mutations: { 'ui/today.js': m } });
  const r = await reprise(p);
  ok(!!r && r.bords.length > 1, `mutation ④ : le nom perd son bord, la garde le voit — ${lisible(r)}`);
  await ctx.close();
}

/* les mutations jettent des erreurs qui ne sont pas les nôtres */
const vraies = errors.filter(e => !e.startsWith('mutation'));
ok(!vraies.length, 'Zéro erreur console' + (vraies.length ? ' — ' + vraies.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E reprendre : ${ko} ÉCHEC(S)` : '\nE2E reprendre : OK');
process.exit(ko ? 1 : 0);

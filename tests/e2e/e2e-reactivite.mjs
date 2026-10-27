/* ============================================================
   E2E — UNE FEUILLE S'OUVRE SOUS LE DOIGT (porte « Performance »)
   (docs/recadrage.md : un geste répond en moins de 200 ms sur un
   téléphone moyen simulé)

   Un seuil en millisecondes ne se garde pas en CI : sur une machine
   partagée, le même tap varie de 50 ms d'une passe à l'autre, et une
   garde qui rougit au hasard finit ignorée. On garde donc les CAUSES,
   relevées à la trace de Chromium et qui se COMPTENT :

   ① PENDANT LE TAP, RIEN NE SE REDESSINE DERRIÈRE LA FEUILLE. Ouvrir un
     groupe ou une conversation la marque lue, et la boîte se redessinait
     dans le même geste — 45 ms d'un tap de 260, pour un écran que la
     feuille couvre. Elle se redessine après l'image (`bus.apresImage`).
     Mesuré : aucun nœud ajouté ou retiré dans `#main` tant que la tâche
     du tap n'est pas finie ;
   ② UNE MISE EN PAGE FORCÉE AU PLUS, dans la même fenêtre. Lire une
     hauteur juste après avoir écrit un style oblige le navigateur à tout
     recalculer sur-le-champ ; la fiche le faisait trois fois pour poser
     la hauteur de ses notes, puis une quatrième à l'image suivante. Une
     seule lecture suffit — celle qui pose la conversation sur ses
     nouveaux messages, par exemple. Les mises en page forcées se
     reconnaissent dans la trace : elles portent la pile de JavaScript
     qui les a demandées ; celle de l'image n'en porte aucune.

   Pouce, processeur ralenti 4× (un téléphone moyen), le petit jeu
   (huit pistes, un groupe, trois amis). Le temps du tap à l'image
   s'imprime, avec l'INP, pour lire, jamais pour juger.

   LA FENÊTRE NE S'ARRÊTE PAS À LA TÂCHE DU TAP. Ouvrir un groupe attend
   ses données : selon qu'elles sont déjà là ou non, la feuille se
   construit dans le tap ou dans une tâche d'après. Une première version
   ne regardait que la tâche du tap ; elle restait verte sur une boîte
   redessinée une tâche plus tard — sa propre mutation l'a montré. La
   fenêtre va donc du tap à la première image peinte APRÈS que la
   feuille est entrée dans la page.

   Deux mutations : la boîte redessinée pendant le tap (groupe), les
   champs de « Modifier » mesurés un par un.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, ROOT } from './outils.mjs';
import { jeuMassif, semerMassif } from './jeu-massif.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };
const jeu = await jeuMassif({ pistes: 8, amis: 3, groupes: 1, conversations: 2, motsParGroupe: [12] });
const GROUPE = Object.keys(jeu.groupes)[0], AMI = jeu.profil.amis[0].id;
const CAT = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack'].join(',');

/* les gestes : où on les fait, comment on tape, ce qui dit que la feuille est là */
const GESTES = [
  { nom: 'fiche', ou: 'pistes', tap: '#main .row-item .ri-main', la: '.modal .modal-b' },
  { nom: 'nouvelle piste', ou: 'pistes', tap: '#bnAdd', la: '.modal .modal-b' },
  { nom: 'groupe', ou: 'echanger', tap: `.bx-l[data-groupe="${GROUPE}"]`, la: '#grFil' },
  { nom: 'conversation', ou: 'echanger', tap: `.bx-l[data-ami="${AMI}"]`, la: '#msFil' },
  { nom: 'donner', ou: 'echanger', tap: '#ecGive', la: '.modal .pk' },
  /* deux feuilles qui s'ouvrent SUR la fiche : celle qui pose cinq champs
     qui grandissent, et le composeur */
  { nom: 'modifier', ou: 'pistes', avant: '#main .row-item .ri-main', tap: '#fiEdit', la: '#edName', fermer: 2 },
  { nom: 'écrire', ou: 'pistes', avant: '#main .row-item .ri-main', tap: '.modal-f button:has-text("Écrire")', la: '#mBody', fermer: 2 }
];

async function jouer({ nom, mutations = {}, seulement = null }){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    serviceWorkers: 'block' });
  await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body }));
  await ctx.addInitScript(() => {
    window.__inp = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) window.__inp.push(Math.round(e.duration)); })
      .observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await semerMassif(p, jeu);
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent && document.querySelector('#main')?.children.length);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.waitForTimeout(1000);
  const res = {};
  for (const g of GESTES){
    if (seulement && !seulement.includes(g.nom)) continue;
    await p.locator(`.bottomnav [data-r="${g.ou}"]`).first().tap();
    if (g.avant){ await p.locator(g.avant).first().tap(); await p.waitForSelector('.modal .modal-b'); }
    await p.waitForSelector(g.tap);
    await p.waitForTimeout(600);
    await p.evaluate(() => { window.__inp = []; });
    const evts = [];
    const recu = d => evts.push(...d.value);
    cdp.on('Tracing.dataCollected', recu);
    await cdp.send('Tracing.start', { categories: CAT, transferMode: 'ReportEvents' });
    await p.locator(g.tap).first().tap();
    await p.waitForSelector(g.la);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const fin = new Promise(r => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end'); await fin;
    cdp.off('Tracing.dataCollected', recu);
    await p.waitForTimeout(300);
    /* la fenêtre : du clic à la première image peinte après l'entrée
       de la feuille dans la page (son gabarit, `openSheet`) */
    const pile = e => (e.args?.beginData?.stackTrace || e.args?.data?.stackTrace || []);
    const dit = e => pile(e).slice(0, 2).map(f => `${f.functionName || '?'}@${(f.url || '').split('/').pop()}:${f.lineNumber}`).join(' < ');
    const clic = evts.filter(e => e.name === 'EventDispatch' && e.ph === 'X' && e.args?.data?.type === 'click')
      .sort((a, b) => b.dur - a.dur)[0];
    let forcees = [], derriere = [], fenetre = 0, posee = false, mises = 0;
    if (clic){
      const fil = evts.filter(e => e.tid === clic.tid && e.ph === 'X' && e.ts >= clic.ts);
      const gabarit = fil.filter(e => e.name === 'ParseHTML' && pile(e).some(f => f.functionName === 'openSheet')).sort((a, b) => a.ts - b.ts)[0];
      posee = !!gabarit;
      const depuis = gabarit ? gabarit.ts : clic.ts;
      const peint = fil.filter(e => e.name === 'Paint' && e.ts > depuis).sort((a, b) => a.ts - b.ts)[0];
      const bout = peint ? peint.ts : Infinity;
      fenetre = peint ? Math.round((bout - clic.ts) / 1000) : -1;
      const dedans = fil.filter(e => e.ts <= bout && pile(e).length);
      forcees = dedans.filter(e => e.name === 'Layout')
        .map(e => {
          /* le calcul de style qui la précède immédiatement compte avec elle */
          const st = dedans.filter(u => u.name === 'UpdateLayoutTree' && u.ts <= e.ts && u.ts + u.dur >= e.ts - 2000).pop();
          return { ou: dit(e), sales: e.args?.beginData?.dirtyObjects || 0, total: e.args?.beginData?.totalObjects || 0,
                   ms: +(((e.dur || 0) + (st ? st.dur : 0)) / 1000).toFixed(1) };
        });
      mises = fil.filter(e => e.ts <= bout && e.name === 'Layout').length;
      derriere = dedans.filter(e => pile(e).some(f => f.functionName === 'render' && /\/app\.js$/.test(f.url || ''))).map(e => e.name + ' ' + dit(e));
    }
    const x = await p.evaluate(() => ({ inp: Math.max(0, ...window.__inp) }));
    res[g.nom] = { clic: !!clic, posee, fenetre, forcees, derriere, mises, ...x };
    console.log(`  ${nom} · ${g.nom.padEnd(15)} tap → image ${String(fenetre).padStart(4)} ms · INP ${String(x.inp).padStart(4)} ms · ${mises} mise(s) en page dont ${forcees.length} forcée(s) · ${derriere.length} rendu(s) derrière${forcees.length + derriere.length ? '\n      ' + [...forcees.map(f => `${f.ou} (${f.sales}/${f.total} objets, ${f.ms} ms)`), ...derriere.map(d => 'derrière : ' + d)].join('\n      ') : ''}`);
    for (let i = 0; i < (g.fermer || 1); i++){ await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  }
  await ctx.close();
  return res;
}

/* LE FOCUS D'OUVERTURE ne compte pas : posé à l'image (`openSheet`,
   `focusOuverture`), il demande la mise en page que l'image ferait de
   toute façon, et il la fait à sa place. Toute autre mise en page
   forcée en est une DE PLUS — relevé : 2,5 à 3,5 ms chacune pour une
   simple retouche de champ, sur un téléphone moyen, et 40 à 90 ms pour
   la première d'une feuille neuve. */
const compte = x => x.forcees.filter(f => !/focusOuverture/.test(f.ou)).length;

/* ---------- l'app telle qu'elle est ---------- */
{
  const r = await jouer({ nom: 'app' });
  for (const g of GESTES){
    const x = r[g.nom];
    /* un contrôle vérifie qu'il a mesuré quelque chose avant de conclure
       (§5) : sans le tap, la feuille et l'image, il rendrait zéro */
    ok(x && x.clic && x.posee && x.fenetre > 0, `${g.nom} : le tap, la feuille et l'image se lisent dans la trace`);
    if (!x || !x.clic || !x.posee) continue;
    ok(!x.derriere.length, `① ${g.nom} : rien ne se redessine derrière la feuille (${x.derriere.length})`);
    ok(compte(x) <= 1, `② ${g.nom} : ${compte(x)} mise en page forcée, une au plus (focus d'ouverture à part)`);
  }
}

/* ---------- les mutations : chaque garde doit rougir ---------- */
async function muter(nom, f, avant, apres, seulement, rougit){
  if (process.env.OC_SANS_MUTATIONS) return;
  const src = await readFile(path.join(ROOT, f), 'utf8');
  if (!src.includes(avant)){ ko++; console.log(`ÉCHEC — mutation ${nom} : le texte visé n’existe plus dans ${f}`); return; }
  console.log(`mutation ${nom} : le fichier servi est bien modifié ✓`);
  const r = await jouer({ nom: 'mut', mutations: { [f]: src.split(avant).join(apres) }, seulement });
  ok(rougit(r), `mutation ${nom} : la garde rougit`);
}
await muter('① la boîte redessinée pendant le tap', 'ui/groupes.js',
  '  apresImage(sauver);\n  bus.apresImage();\n}',
  '  sauver();\n  bus.refresh();\n}',
  ['groupe'], r => r.groupe && r.groupe.derriere.length > 0);
await muter('② les champs de « Modifier » mesurés un par un', 'ui/dom.js',
  '  pousse.aLImage();\n  suivreLargeur(ta, pousse',
  '  pousse();\n  suivreLargeur(ta, pousse',
  ['modifier'], r => r.modifier && compte(r.modifier) > 1);

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E réactivité : ${ko} ÉCHEC(S)` : '\nE2E réactivité : OK');
process.exit(ko ? 1 : 0);

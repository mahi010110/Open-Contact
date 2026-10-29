/* ============================================================
   AU POSTE, LES ONGLETS SE RESSEMBLENT (lot E, 29 octobre 2026 — le
   mainteneur : « sur PC, rends les affichages plus cohérents, beaucoup
   ne le sont pas entre eux »)

   Relevé avant : « Réseau » prenait 1 180 px, les trois autres onglets
   1 060 — sur un grand écran, la page changeait de largeur à chaque
   onglet ; la liste de « Réseau » faisait 352 px, celle de « Mes
   pistes » 384, et la frontière avec le volet sautait de 32 px ; les
   gestes de « Mes pistes » suivaient le compteur, au milieu de la
   ligne, quand ceux d'« Aujourd'hui » et de « Réseau » se calaient à
   droite.

   Depuis l'app réelle, semée d'un jeu nourri, à 1 280, 1 600 et
   1 920 px :
   ① les quatre onglets posent la MÊME page (mêmes bords) ;
   ② « Mes pistes » et « Réseau » ont la même colonne de liste ;
   ③ les gestes d'un titre finissent au bord droit de la page ;
   et trois sondes remettent l'ancien dessin, chacune doit rougir.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet } from './outils.mjs';
import { jeuMassif, semerMassif } from './jeu-massif.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let echecs = 0;
const fail = m => { console.error('ÉCHEC :', m); echecs++; process.exitCode = 1; };
const ok = (c, m) => { if (c) console.log('  ✓', m); else fail(m); };
const jeu = await jeuMassif({ pistes: 30, amis: 6, groupes: 2, conversations: 4, motsParGroupe: [30, 12] });
const ONGLETS = ['aujourdhui', 'pistes', 'reseau', 'moi'];

/* ce qu'on relève sur un onglet : la page, sa colonne de liste, le bord
   droit des gestes du titre */
const relever = (p, r) => p.evaluate(r => {
  const pi = document.querySelector(`#view-${r} > .page-inner`);
  const b = pi.getBoundingClientRect();
  const col = document.querySelector({ pistes: '.pi-gauche', reseau: '.bx-gauche' }[r] || '#__rien');
  const gestes = [...document.querySelectorAll(`#view-${r} .td-head > button, #view-${r} .td-head > .seg3, #view-${r} .td-head .rz-verbes`)]
    .map(e => e.getBoundingClientRect()).filter(x => x.width);
  return { g: Math.round(b.left), d: Math.round(b.right), liste: col ? Math.round(col.getBoundingClientRect().width) : null,
           geste: gestes.length ? Math.round(Math.max(...gestes.map(x => x.right))) : null };
}, r);

async function mesurer(p){
  const m = {};
  for (const r of ONGLETS){
    await p.evaluate(r => { location.hash = '#/' + r; }, r);
    await p.waitForSelector(`#view-${r}:not([hidden]) h1`);
    await p.waitForTimeout(350);
    m[r] = await relever(p, r);
  }
  const fautes = [];
  const pages = new Set(ONGLETS.map(r => m[r].g + '→' + m[r].d));
  if (pages.size !== 1) fautes.push('pages : ' + ONGLETS.map(r => `${r} ${m[r].g}→${m[r].d}`).join(', '));
  if (m.pistes.liste == null || m.reseau.liste == null) fautes.push('une colonne de liste manque');
  else if (Math.abs(m.pistes.liste - m.reseau.liste) > 1) fautes.push(`listes : pistes ${m.pistes.liste}, réseau ${m.reseau.liste}`);
  for (const r of ['aujourdhui', 'pistes', 'reseau']){
    if (m[r].geste == null) fautes.push(`${r} : aucun geste relevé dans le titre`);
    else if (Math.abs(m[r].geste - m[r].d) > 1) fautes.push(`${r} : les gestes finissent à ${m[r].geste}, la page à ${m[r].d}`);
  }
  return { m, fautes };
}

for (const w of [1280, 1600, 1920]){
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|net::ERR/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async () => { const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:9'])); });
  await semerMassif(p, jeu);
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  const { m, fautes } = await mesurer(p);
  ok(!fautes.length, `${w} px : une page (${m.aujourdhui.g}→${m.aujourdhui.d}), une colonne de liste (${m.pistes.liste}), les gestes au bord droit`
    + (fautes.length ? ' — ' + fautes.join(' | ') : ''));

  /* les sondes : l'ancien dessin remis doit rougir — sur grand écran,
     où les largeurs différaient */
  if (w === 1600){
    for (const [nom, css, motif] of [
      ['la page de « Réseau » plus large', '#view-reseau>.page-inner{max-width:1180px!important}.page-wide{max-width:1060px}', /^pages/],
      ['la liste de « Réseau » plus étroite', '.bx-cols{grid-template-columns:minmax(17rem,22rem) minmax(0,1fr)!important}', /^listes/],
      ['les gestes de « Mes pistes » au milieu', '.pi-head>.pi-vue{margin-left:0!important}', /^pistes : les gestes/]
    ]){
      const s = await p.addStyleTag({ content: css });
      const r = await mesurer(p);
      ok(r.fautes.some(f => motif.test(f)), `sonde, ${nom} : vu` + (r.fautes.length ? '' : ' — rien relevé'));
      await s.evaluate(n => n.remove());
    }
  }
  await ctx.close();
}

ok(!errors.length, 'zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close(); server.close();
console.log(echecs ? `E2E au poste : ${echecs} échec(s)` : 'E2E au poste : OK');

/* ============================================================
   Taper au pouce, c'est taper derrière un CLAVIER

   Mesuré le 5 octobre 2026, clavier ouvert : le premier résultat de
   « Mes pistes » commençait à 286 px du haut — sous l'en-tête de l'app,
   le titre, la barre, les étiquettes et les onglets. On voyait DEUX
   résultats sur un 390 × 844, et AUCUN sur un 360 × 640 : le petit
   téléphone, celui qui décide (§5). La réponse est le motif de recherche
   d'iOS (UISearchController) : pendant la saisie, la barre de navigation
   et le grand titre s'effacent, la barre de recherche prend le haut.

   Ce fichier garde la promesse, à deux tailles de téléphone :
   ① au focus, la barre monte en haut de la vue et l'en-tête s'efface ;
   ② au moins N résultats ENTIERS tiennent au-dessus du clavier
     (4 en 390 × 844, 2 en 360 × 640) — le chiffre qui a tout décidé ;
   ③ rien ne glisse SOUS la barre collée : les étiquettes restent
     entières, et la bande au-dessus de la barre ne laisse rien voir
     du titre ;
   ④ le clavier rangé, l'en-tête revient ;
   ⑤ au poste, rien de tout cela : une souris n'a pas de clavier à
     l'écran, et l'en-tête y porte la navigation.

   Playwright n'ouvre pas de clavier : on mesure contre la LIGNE où le
   clavier d'un iPhone s'arrête (336 px pour 844, 300 pour 640, barre de
   suggestions comprise).
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const NOMS = ['Advens', 'Wavestone', 'Capgemini Lille', 'Sopra Steria', 'Worldline', 'OVHcloud', 'Decathlon Digital',
              'Leroy Merlin Tech', 'Kiabi IT', 'Auchan Retail', 'Boulanger', 'Norauto'];
const PISTES = NOMS.map((name, i) => ({ id: 'p' + i, name, city: i % 4 ? 'Lille' : 'Roubaix', status: i % 3 ? 'todo' : 'active',
  positions: ['alternance'], domain: 'esn', updatedAt: Date.now() - i * 1000, contacts: [] }));

async function ecran(vp, touch){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async d => { const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d)); }, PISTES);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  return { ctx, p };
}
const lire = (p, clavier) => p.evaluate(kb => {
  const ligne = innerHeight - kb;
  const R = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  /* les ÉTIQUETTES elles-mêmes, pas leur rangée : celle-ci chevauche la
     marge basse de la barre de 2 px, au repos comme en recherche */
  const hdr = R('.hdr'), sw = R('#view-pistes .search-wrap'), chips = R('#piChips button');
  const rows = [...document.querySelectorAll('#piBody .row-item')].map(x => x.getBoundingClientRect());
  /* ce qui est visible juste au-dessus de la barre : rien du titre */
  const dessus = sw ? document.elementFromPoint(innerWidth / 2, Math.max(0, sw.top - 4)) : null;
  return {
    enTete: hdr ? Math.round(hdr.bottom) : null,
    barre: sw ? Math.round(sw.top) : null,
    barreBas: sw ? Math.round(sw.bottom) : null,
    chipsHaut: chips && chips.height ? Math.round(chips.top) : null,
    entiers: rows.filter(x => x.top >= (sw ? sw.bottom : 0) && x.bottom <= ligne).length,
    titreDessus: !!(dessus && dessus.closest('.td-head')),
    total: rows.length
  };
}, clavier);

for (const [w, h, kb, min] of [[390, 844, 336, 4], [360, 640, 300, 2]]){
  const { ctx, p } = await ecran({ width: w, height: h }, true);
  const repos = await lire(p, kb);
  await p.tap('#piQ');
  await p.keyboard.type('alternance', { delay: 12 });
  await p.waitForTimeout(900);
  const f = await lire(p, kb);
  if (!(f.enTete <= 0)) fail(`${w}×${h} : l’en-tête reste à l’écran pendant la saisie (bas à ${f.enTete} px)`);
  if (f.barre > 20) fail(`${w}×${h} : la barre n’a pas monté (${repos.barre} → ${f.barre} px)`);
  if (f.entiers < min) fail(`${w}×${h} : ${f.entiers} résultat(s) entier(s) au-dessus du clavier, il en faut ${min} (au repos : ${repos.entiers})`);
  if (f.chipsHaut != null && f.chipsHaut < f.barreBas - 1) fail(`${w}×${h} : les étiquettes glissent sous la barre (${f.chipsHaut} < ${f.barreBas})`);
  if (f.titreDessus) fail(`${w}×${h} : le titre dépasse au-dessus de la barre collée`);
  await p.screenshot({ path: `${SHOTS}/99-clavier-${w}.png` });
  /* le clavier se range : l'en-tête revient */
  await p.keyboard.press('Enter');
  await p.waitForTimeout(500);
  const apres = await lire(p, kb);
  if (!(apres.enTete > 40)) fail(`${w}×${h} : clavier rangé, l’en-tête ne revient pas (${apres.enTete})`);
  if (!process.exitCode)
    console.log(`${w}×${h} · la barre monte (${repos.barre} → ${f.barre} px), l’en-tête s’efface, ${f.entiers} résultats entiers au-dessus du clavier (${repos.entiers} au repos, sans étiquette), rien sous la barre ; clavier rangé, l’en-tête revient ✓`);
  await ctx.close();
}

/* ⑤ au poste : rien ne bouge */
{
  const { ctx, p } = await ecran({ width: 1280, height: 800 }, false);
  const avant = await lire(p, 0);
  await p.click('#piQ');
  await p.keyboard.type('alternance', { delay: 12 });
  await p.waitForTimeout(700);
  const f = await lire(p, 0);
  const cls = await p.evaluate(() => document.documentElement.classList.contains('oc-cherche'));
  if (cls || f.enTete !== avant.enTete) fail('au poste, l’en-tête bouge pendant la saisie');
  else console.log('poste · rien ne bouge : l’en-tête porte la navigation, et il n’y a pas de clavier à l’écran ✓');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E clavier : ÉCHEC' : 'E2E clavier : OK');

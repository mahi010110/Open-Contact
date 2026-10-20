/* ============================================================
   OpenContact — e2e : LA PRÉVERSION et LES ANCIENNES ADRESSES
   (lot R0 du recadrage, docs/recadrage.md, décision 0004)

   R0 ne change RIEN à l'écran, sauf une ligne de Réglages. C'est ce
   que ce scénario prouve, sur l'app réelle :
   ① la ligne « Préversion » dit son état et vit après « Thème » ;
   ② elle ouvre deux rangées et une phrase qui dit ce qui est en test,
     et sur quel appareil ;
   ③ « Allumée » s'applique au tap, survit au rechargement, et le lot
     en test s'allume pour l'écran qui le demande (`lot`) ;
   ④ allumée, seul ce que le lot en test recadre bouge : la barre dit
     « Réseau » à la place d'« Échanger », et ce que R1 ne touche pas
     (« Aujourd'hui », « Moi ») dit exactement la même chose — R1 se
     garde lui-même dans e2e-reseau.mjs ;
   ⑤ éteinte, la clé disparaît : rien ne reste sur l'appareil ;
   ⑥ un lot ouvert à tous n'a plus besoin de préversion : la ligne
     disparaît d'elle-même, et le lot s'allume pour tout le monde
     (registre servi modifié — la règle, pas le cas du jour) ;
   ⑦ les adresses : `#pistes` et `#/pistes` mènent au même écran, une
     adresse inconnue mène à « Aujourd'hui », et le titre du document
     suit le registre des destinations ;
   ⑧ au poste aussi ; pouce clair et sombre, captures à regarder ;
     zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, ouvrirReglages, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const GRAINE = [
  { id: 'p1', name: 'Advens', city: 'Lille', status: 'active', contacts: [{ id: 'c1', name: 'Nadia Rahmani', email: 'nadia@advens.test' }] },
  { id: 'p2', name: 'Kiabi', city: 'Hem', status: 'todo', contacts: [] }
];

async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, registre = null } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  if (registre) await ctx.route('**/engine/drapeaux.js', r => r.fulfill({ contentType: 'text/javascript', body: registre }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ps => { const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps)); }, GRAINE);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(250);
  return { ctx, p };
}
const allerA = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(350); };
const reglages = async p => { await allerA(p, '#/moi'); await ouvrirReglages(p); await p.waitForTimeout(200); };
/* les rangées de Réglages, telles qu'on les lit : nom · état */
const rangees = p => p.evaluate(() => [...document.querySelectorAll('.rg-row')].map(r =>
  r.querySelector('.rg-n')?.textContent.trim() + (r.querySelector('.rg-s')?.textContent.trim() ? ' · ' + r.querySelector('.rg-s').textContent.trim() : '')));
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop()?.querySelector('.mh-t')?.textContent || '');
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};
const cle = p => p.evaluate(async () => { const st = await import('./engine/storage.js'); return st.kvGet(st.PREVERSION_KEY); });
const lotReseau = p => p.evaluate(async () => (await import('./ui/state.js')).lot('reseau'));
/* ce que montrent la barre et les quatre écrans, Réglages refermé.
   Un écran se lit quand il a FINI de se dessiner : « Mes pistes »
   complète une partie de son contenu après le premier rendu, et une
   lecture trop tôt rendait un écart qui ne venait pas de la préversion
   (vu une fois sur trois sous charge). On relit jusqu'à deux lectures
   identiques. */
const lire = (p, id) => p.evaluate(id => JSON.stringify({
  vue: document.querySelector('#view-' + id)?.innerText.replace(/\s+/g, ' ').trim(),
  barre: [...document.querySelectorAll('nav [data-r]')].map(a => a.innerText.replace(/\s+/g, ' ').trim()).join(' | '),
  titre: document.title
}), id);
const photo = async (p, routes = ['aujourdhui', 'pistes', 'echanger', 'moi']) => {
  const out = {};
  for (const r of routes){
    await allerA(p, '#/' + r);
    let prec = await lire(p, r), n = 0;
    for (;;){
      await p.waitForTimeout(250);
      const cur = await lire(p, r);
      if (cur === prec || ++n > 12) break;
      prec = cur;
    }
    out[r] = JSON.parse(prec);
  }
  return out;
};

/* ---------- ①-⑤ au pouce ---------- */
for (const sombre of [false, true]){
  const nom = sombre ? 'pouce-sombre' : 'pouce';
  const { ctx, p } = await ecran(nom, { sombre });
  const avant = await photo(p);
  await reglages(p);
  const r0 = await rangees(p);
  const iT = r0.findIndex(x => x.startsWith('Thème')), iP = r0.indexOf('Préversion · éteinte');
  ok(iP > -1 && iP === iT + 1, `① ${nom} : « Préversion · éteinte », juste après « Thème » — ${r0.join(' / ')}`);
  await p.click('#moiPreversion');
  await p.waitForTimeout(350);
  const feuille = await p.evaluate(() => ({
    choix: [...document.querySelectorAll('[data-preversion]')].map(b => b.textContent.trim() + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join(' | '),
    phrase: [...document.querySelectorAll('.overlay:not(.ov-out) .hint')].pop()?.textContent.trim()
  }));
  ok(await dessus(p) === 'Préversion' && feuille.choix === 'Éteinte* | Allumée'
    && feuille.phrase === 'Sur cet appareil seulement : l’onglet Réseau.',
    `② ${nom} : deux rangées, « Éteinte » retenue, et ce qui est en test — ${feuille.choix} — ${feuille.phrase}`);
  if (!sombre) await p.screenshot({ path: `${SHOTS}/160-preversion-feuille-pouce.png` });
  ok(await lotReseau(p) === false, `③ ${nom} : éteinte, le lot en test reste éteint`);
  await p.click('[data-preversion="oui"]');
  await p.waitForTimeout(250);
  const apres = await p.evaluate(() => ({
    choix: [...document.querySelectorAll('[data-preversion]')].map(b => b.textContent.trim() + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join(' | '),
    etat: document.querySelector('#moiPreversion .rg-s')?.textContent.trim()
  }));
  ok(apres.choix === 'Éteinte | Allumée*' && apres.etat === 'allumée' && await cle(p) === '1' && await lotReseau(p) === true,
    `③ ${nom} : « Allumée » s'applique au tap, la ligne le dit, la clé est posée, le lot s'allume`);
  await fermer(p);
  await p.screenshot({ path: `${SHOTS}/160-preversion-reglages-${nom}.png` });
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(250);
  ok(await lotReseau(p) === true, `③ ${nom} : allumée, elle survit au rechargement`);
  /* ce que le lot « reseau » ne touche pas ; la barre, elle, change
     d'UN mot — l'onglet qu'il recadre */
  const pendant = await photo(p, ['aujourdhui', 'moi']);
  for (const k of Object.keys(pendant)) pendant[k].barre = pendant[k].barre.replace(/Réseau/g, 'Échanger');
  const ecarts = Object.keys(pendant).filter(k => JSON.stringify(avant[k]) !== JSON.stringify(pendant[k]));
  for (const k of ecarts) for (const f of ['vue', 'barre', 'titre']) if (avant[k][f] !== pendant[k][f]){
    const x = avant[k][f], y = pendant[k][f]; let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`  écart ${k}.${f} à ${i} : « ${x.slice(Math.max(0, i - 40), i + 60)} » ≠ « ${y.slice(Math.max(0, i - 40), i + 60)} »`);
  }
  ok(!ecarts.length, `④ ${nom} : allumée, seul le lot bouge — la barre dit « Réseau », « Aujourd’hui » et « Moi » identiques${ecarts.length ? ' (écarts : ' + ecarts.join(', ') + ')' : ''}`);
  await reglages(p);
  ok((await rangees(p)).includes('Préversion · allumée'), `③ ${nom} : la ligne relue dit « allumée »`);
  await p.click('#moiPreversion');
  await p.waitForTimeout(300);
  await p.click('[data-preversion="non"]');
  await p.waitForTimeout(250);
  ok(await cle(p) == null && await lotReseau(p) === false && (await rangees(p)).includes('Préversion · éteinte'),
    `⑤ ${nom} : éteinte, la clé disparaît et le lot s'éteint`);
  await fermer(p);
  await ctx.close();
}

/* ---------- ⑥ un lot ouvert à tous : la ligne part d'elle-même ---------- */
{
  const src = await readFile(path.join(ROOT, 'engine', 'drapeaux.js'), 'utf8');
  const ouvert = src.replace(/ouvert: false/g, 'ouvert: true');
  ok(ouvert !== src, '⑥ le registre servi est bien modifié (sinon la preuve ne prouve rien)');
  const { ctx, p } = await ecran('ouvert', { registre: ouvert });
  await reglages(p);
  const r = await rangees(p);
  ok(!r.some(x => x.startsWith('Préversion')) && await lotReseau(p) === true,
    `⑥ rien en test : pas de ligne « Préversion », et le lot ouvert s'allume pour tous — ${r.join(' / ')}`);
  await ctx.close();
}

/* ---------- ⑦ les adresses ---------- */
{
  const { ctx, p } = await ecran('adresses');
  const ici = () => p.evaluate(() => ({
    vue: [...document.querySelectorAll('[id^="view-"]')].find(v => !v.hidden)?.id.replace('view-', ''),
    titre: document.title
  }));
  await allerA(p, '#pistes');
  const a = await ici();
  await allerA(p, '#/echanger');
  const b = await ici();
  await allerA(p, '#/nulle-part');
  const c = await ici();
  await allerA(p, '#/Moi');
  const d = await ici();
  ok(a.vue === 'pistes' && a.titre === 'Mes pistes — OpenContact', `⑦ « #pistes » mène à « Mes pistes » — ${JSON.stringify(a)}`);
  ok(b.vue === 'echanger' && b.titre === 'Échanger — OpenContact', `⑦ le titre suit le registre — ${JSON.stringify(b)}`);
  ok(c.vue === 'aujourdhui' && c.titre === 'Aujourd’hui — OpenContact', `⑦ une adresse inconnue mène à « Aujourd’hui » — ${JSON.stringify(c)}`);
  ok(d.vue === 'moi', `⑦ « #/Moi » (majuscule) mène à « Moi » — ${JSON.stringify(d)}`);
  await ctx.close();
}

/* ---------- ⑧ au poste ---------- */
{
  const { ctx, p } = await ecran('poste', { vp: { width: 1280, height: 800 } });
  await reglages(p);
  const r = await rangees(p);
  ok(r.includes('Préversion · éteinte'), `⑧ poste : la ligne est là — ${r.join(' / ')}`);
  await p.click('#moiPreversion');
  await p.waitForTimeout(300);
  await p.click('[data-preversion="oui"]');
  await p.waitForTimeout(250);
  ok(await cle(p) === '1' && await p.evaluate(() => document.querySelector('#moiPreversion .rg-s')?.textContent.trim()) === 'allumée',
    '⑧ poste : « Allumée » s’applique et la ligne le dit');
  await p.screenshot({ path: `${SHOTS}/160-preversion-poste.png` });
  await ctx.close();
}

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `E2E préversion : ${ko} ÉCHEC(S)` : 'E2E préversion : OK');
process.exit(ko ? 1 : 0);

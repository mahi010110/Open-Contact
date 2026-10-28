/* ============================================================
   OpenContact — e2e : LA PRÉVERSION et LES ANCIENNES ADRESSES
   (lot R0 du recadrage, docs/recadrage.md, décision 0004)

   Depuis la 7.0.0, aucun lot n'est en test : le registre réel est vide,
   et le mécanisme reste pour le prochain. Ce scénario prouve les deux,
   sur l'app réelle :
   ⓪ registre réel : pas de ligne « Préversion » dans Réglages, au pouce
     comme au poste — il n'y a rien à allumer ;
   avec un LOT D'ESSAI servi dans le registre (`essai`, en test) :
   ① la ligne « Préversion » dit son état et vit après « Thème » ;
   ② elle ouvre deux rangées et une phrase qui nomme ce qui est en test,
     et sur quel appareil ;
   ③ « Allumée » s'applique au tap, survit au rechargement, et le lot
     en test s'allume pour l'écran qui le demande (`lot`) ;
   ④ allumée, rien d'autre ne bouge : les quatre écrans disent
     exactement la même chose — la préversion n'est qu'un interrupteur ;
   ⑤ éteinte, la clé disparaît : rien ne reste sur l'appareil ;
   ⑥ le lot ouvert à tous n'a plus besoin de préversion : la ligne
     disparaît d'elle-même, et le lot s'allume pour tout le monde ;
   ⑦ les adresses : `#pistes` et `#/pistes` mènent au même écran,
     `#/echanger` mène à « Réseau », une adresse inconnue mène à
     « Aujourd'hui », et le titre du document suit le registre des
     destinations ;
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

/* des pistes HORODATÉES : sans `updatedAt`, `normalizeCompany` leur
   donne l'instant du chargement, et l'ordre « récentes d'abord » se
   jouait à la milliseconde près d'un rechargement à l'autre — ④ a vu
   Kiabi passer devant Advens en CI sans que rien n'ait bougé */
const GRAINE = [
  { id: 'p1', name: 'Advens', city: 'Lille', status: 'active', updatedAt: Date.UTC(2026, 9, 20),
    contacts: [{ id: 'c1', name: 'Nadia Rahmani', email: 'nadia@advens.test' }] },
  { id: 'p2', name: 'Kiabi', city: 'Hem', status: 'todo', updatedAt: Date.UTC(2026, 9, 19), contacts: [] }
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
const lotEssai = p => p.evaluate(async () => (await import('./ui/state.js')).lot('essai'));
/* le registre servi : le vrai, plus UN lot d'essai en test (ou ouvert) */
const SRC = await readFile(path.join(ROOT, 'engine', 'drapeaux.js'), 'utf8');
const VIDE = 'export const DRAPEAUX = Object.freeze([]);';
if (!SRC.includes(VIDE)) throw new Error('le registre réel n’est plus vide : ce scénario doit le lire tel quel');
const avecEssai = ouvert => SRC.replace(VIDE, `export const DRAPEAUX = Object.freeze([Object.freeze({
  id: 'essai', lot: 'R5', nom: 'un lot d’essai', raison: 'Prouver le mécanisme de préversion.',
  cree: '2026-10-27', retrait: '2027-04-01', ouvert: ${ouvert} })]);`);
const ESSAI = avecEssai(false);
/* ce que montrent la barre et les quatre écrans, Réglages refermé.
   Un écran se lit quand il a FINI de se dessiner : « Mes pistes »
   complète une partie de son contenu après le premier rendu, et une
   lecture trop tôt rendait un écart qui ne venait pas de la préversion
   (vu une fois sur trois sous charge). On relit jusqu'à deux lectures
   identiques. */
const lire = (p, id) => p.evaluate(id => JSON.stringify({
  vue: (() => {
    const v = document.querySelector('#view-' + id);
    return v ? v.innerText.replace(/\s+/g, ' ').trim() : undefined;
  })(),
  barre: [...document.querySelectorAll('nav [data-r]')].map(a => a.innerText.replace(/\s+/g, ' ').trim()).join(' | '),
  titre: document.title
}), id);
const photo = async (p, routes = ['aujourdhui', 'pistes', 'reseau', 'moi']) => {
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

/* ---------- ⓪ le registre réel : rien en test, pas de ligne ---------- */
for (const [nom, vp] of [['pouce', { width: 390, height: 844 }], ['poste', { width: 1280, height: 800 }]]){
  const { ctx, p } = await ecran('reel-' + nom, { vp });
  await reglages(p);
  const r = await rangees(p);
  ok(!r.some(x => x.startsWith('Préversion')) && !(await p.$('#moiPreversion')),
    `⓪ ${nom} : registre réel vide, pas de ligne « Préversion » — ${r.join(' / ')}`);
  await ctx.close();
}

/* ---------- ①-⑤ au pouce, avec le lot d'essai ---------- */
for (const sombre of [false, true]){
  const nom = sombre ? 'pouce-sombre' : 'pouce';
  const { ctx, p } = await ecran(nom, { sombre, registre: ESSAI });
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
    /* la phrase nomme chaque lot en test, dans l'ordre du registre : elle
       se DÉDUIT du registre — une liste tenue à la main ici mentait dès
       le lot suivant (R7) */
    && feuille.phrase === 'Sur cet appareil seulement : un lot d’essai.',
    `② ${nom} : deux rangées, « Éteinte » retenue, et ce qui est en test — ${feuille.choix} — ${feuille.phrase}`);
  if (!sombre) await p.screenshot({ path: `${SHOTS}/160-preversion-feuille-pouce.png` });
  ok(await lotEssai(p) === false, `③ ${nom} : éteinte, le lot en test reste éteint`);
  await p.click('[data-preversion="oui"]');
  await p.waitForTimeout(250);
  const apres = await p.evaluate(() => ({
    choix: [...document.querySelectorAll('[data-preversion]')].map(b => b.textContent.trim() + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join(' | '),
    etat: document.querySelector('#moiPreversion .rg-s')?.textContent.trim()
  }));
  ok(apres.choix === 'Éteinte | Allumée*' && apres.etat === 'allumée' && await cle(p) === '1' && await lotEssai(p) === true,
    `③ ${nom} : « Allumée » s'applique au tap, la ligne le dit, la clé est posée, le lot s'allume`);
  await fermer(p);
  await p.screenshot({ path: `${SHOTS}/160-preversion-reglages-${nom}.png` });
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(250);
  ok(await lotEssai(p) === true, `③ ${nom} : allumée, elle survit au rechargement`);
  /* le lot d'essai, aucun écran ne le demande : allumée, RIEN ne bouge
     — hors « Moi », dont Réglages dit maintenant « allumée » */
  const pendant = await photo(p, ['aujourdhui', 'pistes', 'reseau']);
  const ecarts = Object.keys(pendant).filter(k => JSON.stringify(avant[k]) !== JSON.stringify(pendant[k]));
  for (const k of ecarts) for (const f of ['vue', 'barre', 'titre']) if (avant[k][f] !== pendant[k][f]){
    const x = avant[k][f], y = pendant[k][f]; let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`  écart ${k}.${f} à ${i} : « ${x.slice(Math.max(0, i - 40), i + 60)} » ≠ « ${y.slice(Math.max(0, i - 40), i + 60)} »`);
  }
  ok(!ecarts.length, `④ ${nom} : allumée, rien d'autre ne bouge — trois écrans identiques${ecarts.length ? ' (écarts : ' + ecarts.join(', ') + ')' : ''}`);
  await reglages(p);
  ok((await rangees(p)).includes('Préversion · allumée'), `③ ${nom} : la ligne relue dit « allumée »`);
  await p.click('#moiPreversion');
  await p.waitForTimeout(300);
  await p.click('[data-preversion="non"]');
  await p.waitForTimeout(250);
  ok(await cle(p) == null && await lotEssai(p) === false && (await rangees(p)).includes('Préversion · éteinte'),
    `⑤ ${nom} : éteinte, la clé disparaît et le lot s'éteint`);
  await fermer(p);
  await ctx.close();
}

/* ---------- ⑥ un lot ouvert à tous : la ligne part d'elle-même ---------- */
{
  const ouvert = avecEssai(true);
  const { ctx, p } = await ecran('ouvert', { registre: ouvert });
  await reglages(p);
  const r = await rangees(p);
  ok(!r.some(x => x.startsWith('Préversion')) && await lotEssai(p) === true,
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
  ok(b.vue === 'reseau' && b.titre === 'Réseau — OpenContact', `⑦ « #/echanger » mène à « Réseau », le titre suit le registre — ${JSON.stringify(b)}`);
  ok(c.vue === 'aujourdhui' && c.titre === 'Aujourd’hui — OpenContact', `⑦ une adresse inconnue mène à « Aujourd’hui » — ${JSON.stringify(c)}`);
  ok(d.vue === 'moi', `⑦ « #/Moi » (majuscule) mène à « Moi » — ${JSON.stringify(d)}`);
  await ctx.close();
}

/* ---------- ⑧ au poste ---------- */
{
  const { ctx, p } = await ecran('poste', { vp: { width: 1280, height: 800 }, registre: ESSAI });
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

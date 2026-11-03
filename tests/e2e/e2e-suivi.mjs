/* ============================================================
   OpenContact — e2e : LA DEMANDE SE SUIT COMME UN COLIS
   (lot F3, idées G et I du 13 octobre 2026 — « Envoyée, Trouvée,
   Reçu : on sait toujours où elle en est, sans le nom de ceux qui la
   portent »)

   Un appareil semé de trois demandes ouvertes, une par étape, sans
   réseau :
   ① LA CARTE DIT OÙ ELLE EN EST : partie → « Trouvée » en cours ;
     trouvée chez un ami de Léa → « Reçu » en attente ; le contact
     arrivé → tout est fait, et il se propose JUSTE SOUS la carte. La
     phrase est la sienne (« … pour une alternance »), à qui elle est
     partie se lit dessous, et rien ne nomme personne d'autre que MON
     ami.
   ② ELLE SE DIT SANS L'ÉCRAN : l'étape en cours porte
     `aria-current="step"`, celle qui attend s'annonce « pas encore »,
     les barres sont muettes — l'état ne vit pas que dans un dessin.
   ③ TROIS COLONNES OU UNE PILE, JAMAIS DEUX PUIS UNE : de 320 à
     390 px, de 100 à 200 % de texte. En rangée, les trois barres sont
     à la même hauteur ; nulle part un mot d'étape n'est coupé — ni la
     ligne qui nomme mon ami, qui PLIE (« chez un ami de L… » rendait
     même au poste) —, nulle part la carte ne déborde. À 100 %, même en 320 px, c'est la
     rangée — le dessin choisi.
   ④ la même carte dans « Réseau › Mes demandes », pour une demande par
     métier et ville ;
   ⑤ pouce et poste, clair et sombre : captures à regarder ;
   ⑥ zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, SHOTS, suiviDe } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const now = Date.now(), J = 864e5;
const CLE = 'B' + 'x'.repeat(86);
const profil = { name: 'Tom Durand', email: 'tom@prive.test', formation: 'BTS SIO', recherche: 'alternance',
  amis: [{ id: 'KarimKarimKarim000001', nom: 'Karim Benali', recu: now - 9 * J, parcours: [], cle: CLE }],
  groupes: [{ code: 'abcdefghjkmnpqr', nom: 'BTS SIO Lille', at: now - 9 * J }] };
const pistes = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo' },
                { id: 'adv', name: 'Advens', city: 'Lille', status: 'todo' },
                { id: 'th', name: 'Thales', city: 'Lille', status: 'todo' }];
const reseau = { v: 1, depuis: 0, recues: [], mercis: [], lus: [], envois: [], entrees: [], attentes: [],
  demandes: [
    { id: 'demandeAz0001', pisteId: 'az', at: now - 2 * J, exp: now + 12 * J, vers: 2, groupes: ['BTS SIO Lille'],
      cherche: 'alternance', entreprise: { nom: 'Aztek' } },
    { id: 'demandeAdv001', pisteId: 'adv', at: now - 2 * J, exp: now + 12 * J, vers: 1,
      cherche: 'alternance', entreprise: { nom: 'Advens' }, trouve: { at: now - J, cercle: 2, par: 'Léa' } },
    { id: 'demandeTh0001', pisteId: 'th', at: now - 3 * J, exp: now + 11 * J, vers: 1,
      cherche: 'alternance', entreprise: { nom: 'Thales' }, trouve: { at: now - 2 * J, cercle: 1 } }],
  dons: [{ id: 'donThales0001', demande: 'demandeTh0001', de: { prenom: 'Karim', cle: CLE }, entreprise: { nom: 'Thales' },
           contact: { name: 'Julie Marchand', role: 'RH', email: 'julie@thales.test' }, at: now - 60000, statut: 'nouveau' }] };

async function ecran(nom, { vp, sombre = false, hash = '#/aujourdhui', graine = reseau } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/' + hash);
  /* semer APRÈS le démarrage, puis recharger : l'app lit son état à
     l'ouverture, et écrire dans le stockage ne le lui dit pas (§5) */
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([pr, ps, rs]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RESEAU_KEY, JSON.stringify(rs));
  }, [profil, pistes, graine]);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async () => (await import('./ui/reseau.js')).chargerReseau());
  return { ctx, p };
}
const ouvrirFiche = async (p, id) => {
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].forEach(o => o.querySelector('.modal-h .x')?.click()));
  await p.waitForTimeout(300);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForSelector('#fiDemande');
  await p.waitForTimeout(350);
};
/* la disposition des étapes : rangée, pile, ou ni l'un ni l'autre */
const disposition = (p, sel = '#fiDemande') => p.evaluate(s => {
  const c = document.querySelector(s);
  const et = [...c.querySelectorAll('.dmc-et')].map(e => e.getBoundingClientRect());
  const bars = [...c.querySelectorAll('.dmc-bar')].map(e => Math.round(e.getBoundingClientRect().top));
  const rangee = et.every(r => Math.abs(r.top - et[0].top) < 1);
  const pile = et.every((r, i) => !i || r.top >= et[i - 1].bottom - 1);
  const coupes = [...c.querySelectorAll('.dmc-et b, .dmc-t, .dmc-q')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim());
  return { forme: rangee ? 'rangée' : pile ? 'pile' : 'autre', barres: new Set(bars).size,
           deborde: c.scrollWidth > c.clientWidth + 1, coupes };
}, sel);

/* ---------- ①-③ au pouce ---------- */
{
  const { ctx, p } = await ecran('pouce', { vp: { width: 390, height: 844 } });
  const jour = /\S+\. \d\d\/\d\d/.source;
  await ouvrirFiche(p, 'az');
  let s = await suiviDe(p);
  ok(s.phrase === 'Tu cherches quelqu’un chez Aztek pour une alternance' && s.a === 'demandé à 2 amis et BTS SIO Lille',
    '① la phrase de la demande et à qui elle est partie : ' + JSON.stringify([s.phrase, s.a]));
  ok(new RegExp(`^Envoyée:fait:${jour} \\| Trouvée:cours:en cours \\| Reçu:-:pas encore$`).test(s.etapes),
    '① partie : « Trouvée » est en cours, « Reçu » attend — ' + s.etapes);
  await p.screenshot({ path: `${SHOTS}/140-suivi-envoyee-pouce.png` });
  /* ② l'état se dit sans l'écran */
  const a11y = await p.evaluate(() => {
    const c = document.querySelector('#fiDemande');
    return { cours: [...c.querySelectorAll('[aria-current="step"]')].map(e => e.querySelector('b').textContent),
             muettes: [...c.querySelectorAll('.dmc-bar')].every(b => b.getAttribute('aria-hidden') === 'true'),
             liste: c.querySelector('.dmc-suivi').tagName };
  });
  ok(a11y.cours.join() === 'Trouvée' && a11y.muettes && a11y.liste === 'OL',
    '② une liste ordonnée, l’étape en cours en aria-current, les barres muettes');

  await ouvrirFiche(p, 'adv');
  s = await suiviDe(p);
  ok(new RegExp(`^Envoyée:fait:${jour} \\| Trouvée:fait:chez un ami de Léa \\| Reçu:cours:en attente$`).test(s.etapes),
    '① trouvée plus loin : « chez un ami de Léa », et « Reçu » en attente — ' + s.etapes);
  ok(!/Karim|Julie/.test(await p.evaluate(() => document.querySelector('#fiDemande').textContent)),
    '① la carte ne nomme personne d’autre que MON ami');

  await ouvrirFiche(p, 'th');
  s = await suiviDe(p);
  ok(new RegExp(`^Envoyée:fait:${jour} \\| Trouvée:fait:chez un ami \\| Reçu:fait:aujourd’hui$`).test(s.etapes),
    '① le contact est arrivé : les trois étapes faites — ' + s.etapes);
  ok(await p.evaluate(() => document.querySelector('#fiDemande').nextElementSibling?.id === 'fiDon'
      && /Karim t’a donné Julie Marchand/.test(document.querySelector('#fiDon').textContent)),
    '① et ce qui est arrivé se propose juste dessous');
  await p.screenshot({ path: `${SHOTS}/140-suivi-recu-pouce.png` });

  /* ③ trois colonnes ou une pile, à toutes les tailles */
  const vus = [];
  for (const w of [320, 360, 390]){
    await p.setViewportSize({ width: w, height: 760 });
    for (const pc of [100, 113, 125, 150, 200]){
      await p.evaluate(f => { document.documentElement.style.fontSize = f + 'px'; }, 16 * pc / 100);
      await p.waitForTimeout(80);
      const d = await disposition(p);
      vus.push(`${w}/${pc}:${d.forme}`);
      ok(d.forme !== 'autre', `③ ${w} px, ${pc} % : trois colonnes ou une pile (${d.forme})`);
      if (d.forme === 'rangée') ok(d.barres === 1, `③ ${w} px, ${pc} % : en rangée, les trois barres à la même hauteur`);
      ok(!d.coupes.length && !d.deborde, `③ ${w} px, ${pc} % : rien de coupé, rien ne déborde ${d.coupes.join(' · ')}`);
      if (pc === 100) ok(d.forme === 'rangée', `③ ${w} px, 100 % : la rangée, le dessin choisi`);
      if (w === 320 && pc === 200){
        ok(d.forme === 'pile', '③ 320 px, 200 % : une pile');
        await p.evaluate(() => document.querySelector('#fiDemande').scrollIntoView({ block: 'start' }));
        await p.waitForTimeout(150);
        await p.screenshot({ path: `${SHOTS}/140-suivi-320-200.png` });
      }
    }
  }
  console.log('   ' + vus.join('  '));
  await ctx.close();
}

/* ---------- ④ la même carte dans « Réseau › Mes demandes » ---------- */
{
  const crit = { ...reseau, dons: [], demandes: [{ id: 'demandeCyb001', pisteId: null, at: now - J, exp: now + 13 * J, vers: 1,
    critere: { metier: 'cyber', ville: 'Lille' } }] };
  const { ctx, p } = await ecran('amis', { vp: { width: 390, height: 844 }, hash: '#/reseau', graine: crit });
  await p.waitForSelector('#rzDemandes .rz-carte');
  const s = await suiviDe(p, '#rzDemandes .rz-carte');
  ok(s.phrase === 'Tu cherches quelqu’un dans la cybersécurité à Lille' && /^Envoyée:fait.*Trouvée:cours/.test(s.etapes),
    '④ dans « Réseau », la même carte : ' + JSON.stringify(s));
  await p.screenshot({ path: `${SHOTS}/140-suivi-amis-pouce.png` });
  await ctx.close();
}

/* ---------- ⑤ captures : pouce sombre, poste clair et sombre ---------- */
for (const [nom, vp, sombre] of [['pouce-sombre', { width: 390, height: 844 }, true],
                                 ['poste', { width: 1280, height: 800 }, false], ['poste-sombre', { width: 1280, height: 800 }, true]]){
  const { ctx, p } = await ecran(nom, { vp, sombre });
  await ouvrirFiche(p, 'adv');
  const d = await disposition(p);
  ok(d.forme === 'rangée' && d.barres === 1 && !d.coupes.length, `⑤ ${nom} : la rangée, nette`);
  await p.screenshot({ path: `${SHOTS}/140-suivi-${nom}.png` });
  await ctx.close();
}

ok(!errors.length, '⑥ zéro erreur console' + (errors.length ? ' : ' + errors.join(' | ') : ''));
await browser.close();
server.close();
if (ko){ console.log(`\n${ko} échec(s)`); process.exit(1); }
console.log('\nLa demande se suit comme un colis ✓');

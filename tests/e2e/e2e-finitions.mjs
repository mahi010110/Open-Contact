/* ============================================================
   LES FINITIONS DU TÉLÉPHONE (audit d'octobre 2026)

   Demande du mainteneur, 6 octobre 2026 : « fais un immense audit UX
   sur smartphone, j'ai vu des immondices graphiques ». Chaque défaut
   relevé sur les captures (Chromium ET WebKit, `audit-captures.mjs`)
   et corrigé est gardé ici, en partant de l'état RÉEL de l'app :

   ① la barre Annuler ne se pose jamais sur une feuille ouverte — ni
     sur son corps, ni sur son pied, là où le pouce cherche
     « Enregistrer » ;
   ② le lien d'évitement reste caché à texte doublé (il dépassait ses
     48 px et laissait une bande d'accent en haut de chaque écran), et
     se montre entier au clavier ;
   ③ « Modifier » montre le nom d'une piste en ENTIER, et au doigt la
     feuille ne fait pas monter le clavier ;
   ④ Prospecter : « ＋ ajoute quelqu'un » sous la piste COCHÉE
     seulement, jamais sous chaque ligne ;
   ⑤ à texte doublé sur un 320 px, le champ de recherche garde de quoi
     se lire : « Affiner » passe dessous ;
   ⑥ un seul rythme vertical dans une feuille : deux champs empilés
     dans une grille sont espacés comme deux champs ordinaires, et deux
     dates côte à côte ont le même bas.

   MUTATIONS jouées à la main avant livraison (chacune fait rougir) :
   la règle `body:has(.overlay) .undo-bar` retirée ; le lien caché par
   `top:-48px` ; « Entreprise » rendu en `<input>` ; la ligne d'ajout
   sous toute piste sans adresse ; `flex-wrap` retiré de la barre ;
   `gap:10px` rendu à `.grid2`.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const LONG = 'Société Générale Global Solution Centre — Direction des systèmes d’information';
const PISTES = [
  { id: 'a', name: LONG, city: 'Villeneuve-d’Ascq', status: 'todo', updatedAt: 9, contacts: [] },
  { id: 'b', name: 'Cegid', city: 'Lyon', status: 'todo', updatedAt: 8, contacts: [] },
  { id: 'c', name: 'Damart', city: 'Roubaix', status: 'todo', updatedAt: 7, contacts: [{ id: 'k', name: 'Julien Leroy' }] },
  { id: 'd', name: 'Advens', city: 'Lille', status: 'active', updatedAt: 6,
    contacts: [{ id: 'm', name: 'Thomas Leroy', email: 'tleroy@advens.test' }] }
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR 2e année', ecole: 'Lycée Gustave Eiffel',
  recherche: 'alternance', debut: '2026-11-02', fin: '2028-09-30' };

async function ecran(vp, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true, colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [PISTES, PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  if (o.texte) await p.addStyleTag({ content: `html{font-size:${o.texte}px !important}` });
  await p.waitForTimeout(200);
  return { ctx, p };
}
const fermer = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
  while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 150)); }
});
const ouvrir = (p, id, f) => p.evaluate(new Function(`return (async () => { const { S } = await import('./ui/state.js');
  const c = S.companies.find(x => x.id === '${id}'); ${f} })()`));
const croise = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/* ---------- ①, ③, ④, ⑥ au pouce, 390 × 844 puis 360 × 640 ---------- */
for (const [vp, sombre] of [[{ width: 390, height: 844 }, false], [{ width: 360, height: 640 }, true]]){
  const nom = `${vp.width}×${vp.height}${sombre ? ' sombre' : ''}`;
  const { ctx, p } = await ecran(vp, { sombre });

  /* ③ « Modifier » : le nom entier, et pas de clavier au doigt */
  await ouvrir(p, 'a', `(await import('./ui/edit.js')).openEditPiste(c);`);
  await p.waitForSelector('#edName');
  await p.waitForTimeout(300);
  const m = await p.evaluate(() => {
    const t = document.querySelector('#edName');
    return { balise: t.tagName, cache: t.scrollHeight - t.clientHeight, large: t.scrollWidth - t.clientWidth,
             valeur: t.value, focus: document.activeElement && document.activeElement.id };
  });
  if (m.balise !== 'TEXTAREA' || m.cache > 1 || m.large > 1) fail(`${nom} · ③ « Entreprise » cache ${Math.max(m.cache, m.large)} px du nom (${m.balise})`);
  if (m.valeur !== LONG) fail(`${nom} · ③ « Entreprise » ne porte pas le nom : ${m.valeur}`);
  if (m.focus === 'edName') fail(`${nom} · ③ au doigt, « Modifier » met le curseur dans « Entreprise » : le clavier monte sur une feuille qu'on vient relire`);
  if (!process.exitCode) console.log(`${nom} · ③ « Modifier » montre le nom entier, sans faire monter le clavier ✓`);

  /* ① la barre Annuler, feuille ouverte : ni sur le corps, ni sur le pied */
  await p.evaluate(async () => { const { showUndo } = await import('./ui/dom.js'); showUndo('« Cegid » supprimée.', () => {}); });
  await p.waitForSelector('.undo-bar');
  await p.waitForTimeout(400);
  const u = await p.evaluate(() => {
    /* la feuille du HAUT de la pile — pas `.overlay:last-of-type` : la
       barre est un `div` ajouté APRÈS elle, et ce sélecteur ne trouvait
       plus rien (le garde restait vert sur une barre posée sur le pied) */
    const ov = [...document.querySelectorAll('.overlay')].pop();
    const r = e => { if (!e) return null; const b = e.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
    return { barre: r(document.querySelector('.undo-bar')), corps: r(ov && ov.querySelector('.modal-b')),
             pied: r(ov && ov.querySelector('.modal-f')), vue: innerHeight };
  });
  /* un contrôle vérifie qu'il a mesuré quelque chose avant de conclure (§5) */
  if (!u.corps || !u.pied) fail(`${nom} · ① la feuille n'a pas été mesurée`);
  if (!u.barre || u.barre.top < 0 || u.barre.bottom > u.vue) fail(`${nom} · ① la barre Annuler sort de l'écran : ${JSON.stringify(u.barre)}`);
  if (croise(u.barre, u.corps)) fail(`${nom} · ① la barre Annuler se pose sur le CORPS de la feuille`);
  if (croise(u.barre, u.pied)) fail(`${nom} · ① la barre Annuler se pose sur le PIED de la feuille, là où le pouce cherche « Enregistrer »`);
  if (!process.exitCode) console.log(`${nom} · ① feuille ouverte, la barre Annuler se pose au-dessus, hors du corps et du pied ✓`);
  await p.evaluate(() => document.querySelector('.undo-bar')?.remove());
  await fermer(p);

  /* ④ Prospecter : la ligne d'ajout suit la case */
  await p.evaluate(() => import('./ui/prospect.js').then(x => x.openProspect()));
  await p.waitForSelector('.pk');
  await p.waitForTimeout(200);
  const avant = await p.evaluate(() => ({ ajouts: document.querySelectorAll('.pk-add').length,
    sans: [...document.querySelectorAll('.pk .pk-s')].filter(s => /sans adresse/.test(s.textContent)).length }));
  if (avant.ajouts) fail(`${nom} · ④ rien n'est coché et « ajoute quelqu'un » se répète ${avant.ajouts} fois`);
  if (avant.sans !== 3) fail(`${nom} · ④ les pistes sans adresse ne le disent pas dans leur sous-ligne (${avant.sans} sur 3)`);
  await p.click('.pk[data-id="b"]');
  await p.waitForTimeout(150);
  const apres = await p.evaluate(() => ({ ajouts: [...document.querySelectorAll('.pk-add')].map(b => b.dataset.addct),
    focus: document.activeElement && document.activeElement.dataset && document.activeElement.dataset.id }));
  if (apres.ajouts.join() !== 'b') fail(`${nom} · ④ cocher Cegid : la ligne d'ajout vise ${JSON.stringify(apres.ajouts)}`);
  if (apres.focus !== 'b') fail(`${nom} · ④ cocher redessine la liste et fait tomber le focus (${apres.focus})`);
  if (!process.exitCode) console.log(`${nom} · ④ Prospecter : « sans adresse » sur la ligne, « ＋ ajoute quelqu'un » sous la seule piste cochée ✓`);
  await fermer(p);

  /* ⑥ un rythme vertical : grille empilée = champs ordinaires ; deux dates au même bas */
  await p.evaluate(() => import('./ui/profil.js').then(x => x.openProfil()));
  await p.waitForSelector('#pfEcole');
  await p.waitForTimeout(300);
  const r6 = await p.evaluate(() => {
    const b = s => document.querySelector(s).getBoundingClientRect();
    const lbl = id => document.querySelector(`label[for="${id}"]`).getBoundingClientRect();
    return { ordinaire: Math.round(lbl('pfFormation').top - b('#pfName').bottom),
             grille: Math.round(lbl('pfEcole').top - b('#pfFormation').bottom),
             debut: Math.round(b('#pfDebut').bottom), fin: Math.round(b('#pfFin').bottom) };
  });
  if (Math.abs(r6.grille - r6.ordinaire) > 1) fail(`${nom} · ⑥ deux rythmes : ${r6.ordinaire} px entre deux champs, ${r6.grille} dans une grille`);
  if (r6.debut !== r6.fin) fail(`${nom} · ⑥ « Début » et « Fin » décalés de ${Math.abs(r6.debut - r6.fin)} px`);
  if (!process.exitCode) console.log(`${nom} · ⑥ un seul rythme (${r6.ordinaire} px), « Début » et « Fin » au même bas ✓`);
  await fermer(p);
  await ctx.close();
}

/* ---------- ②, ⑤ à texte doublé, 320 × 568 ---------- */
{
  const { ctx, p } = await ecran({ width: 320, height: 568 }, { texte: 32 });
  const s = await p.evaluate(() => { const b = document.querySelector('a.skip').getBoundingClientRect(); return { bas: b.bottom, haut: b.top }; });
  if (s.bas > 0) fail(`② à 200 %, le lien d'évitement dépasse de ${Math.round(s.bas)} px en haut de l'écran`);
  await p.keyboard.press('Tab');
  await p.waitForTimeout(300);
  const f = await p.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect();
    return { skip: a.classList.contains('skip'), haut: b.top, bas: b.bottom }; });
  if (!f.skip || f.haut < -0.5 || f.bas <= 0) fail(`② au clavier, le lien d'évitement ne se montre pas entier : ${JSON.stringify(f)}`);
  if (!process.exitCode) console.log('320 · 200 % · ② le lien d’évitement reste caché, et se montre entier au clavier ✓');

  const b = await p.evaluate(() => {
    const q = document.querySelector('#piQ').getBoundingClientRect();
    const a = document.querySelector('#piAffiner').getBoundingClientRect();
    return { champ: Math.round(q.width), rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
             dessous: a.top >= q.bottom - 1 };
  });
  if (b.champ < 8 * b.rem && !b.dessous) fail(`⑤ à 200 %, le champ de recherche tombe à ${b.champ} px à côté d'« Affiner »`);
  if (!b.dessous) fail('⑤ à 200 % sur un 320 px, « Affiner » reste à côté du champ au lieu de passer dessous');
  if (!process.exitCode) console.log(`320 · 200 % · ⑤ le champ garde ${b.champ} px, « Affiner » passe dessous ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E finitions : ÉCHEC' : 'E2E finitions : OK');
await browser.close();
server.close();

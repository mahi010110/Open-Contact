/* La fenêtre se prend par sa barre de titre (poste), et cette place tient
   pour la feuille suivante. Ce qu'on vérifie surtout, ce sont les BORNES :
   une fenêtre poussée hors de l'écran ne se rattrape plus, et c'est le
   seul vrai risque de ce geste.
   On vérifie aussi ce qui ne doit PAS bouger : au doigt (la barre y sert
   à refermer d'un glissement) et sur une confirmation (une question n'est
   pas une fenêtre qu'on range). */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const PISTE = [{ id: 'p1', name: 'Sopra Steria Digital Services', status: 'contacted',
  city: 'Toulouse', domain: 'esn', notes: 'Relancer Nadia.',
  contacts: [{ id: 'c1', name: 'Nadia Berthier', role: 'RH', email: 'nadia@exemple.fr' }],
  updatedAt: 1 }];

async function charger(p){
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, PISTE);
  await p.reload({ waitUntil: 'load' });
  /* `attendre` et pas `page.waitForFunction` : celui-ci ne déballe pas la
     promesse d'un prédicat `async`, et une promesse en attente est
     « vraie » — l'attente réussissait donc sans rien vérifier, et la
     fiche s'ouvrait parfois sur une liste encore vide. */
  await attendre(p, async () => (await import('./ui/state.js')).S.companies.length === 1);
}
const ouvrirFiche = async p => {
  await p.evaluate(async () => {
    const { openFiche } = await import('./ui/fiche.js');
    const { S } = await import('./ui/state.js');
    openFiche(S.companies[0]);
  });
  await p.waitForSelector('.modal-fiche .modal-h');
  await p.waitForTimeout(300);
};
const fermer = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js');
  let s; while ((s = topSheet())) s.close(null, true);
});
const cadre = p => p.evaluate(() => {
  const m = document.querySelector('.overlay:not(.ov-behind) .modal');
  if (!m) return null;
  const r = m.getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
});
/* La place est en mémoire de session : recharger la page la remet au
   centre. C'est ce qui rend chaque poussée indépendante — sans ça, la
   deuxième partait d'une fenêtre déjà collée à un bord, et son point de
   prise tombait hors de l'écran (la souris tapait dans le vide, et le
   test « passait » en ne mesurant rien). */
const neuf = async p => { await charger(p); await ouvrirFiche(p); };

/* prise de la barre de titre à gauche du titre — jamais sur un bouton */
const prise = p => p.evaluate(() => {
  const r = document.querySelector('.overlay:not(.ov-behind) .modal-h').getBoundingClientRect();
  return { x: Math.round(r.left + 30), y: Math.round(r.top + r.height / 2) };
});
async function glisser(p, dx, dy){
  const b = await prise(p);
  if (b.x < 2 || b.x > 1278 || b.y < 2 || b.y > 798)
    throw new Error('point de prise hors écran : ' + JSON.stringify(b));
  await p.mouse.move(b.x, b.y);
  await p.mouse.down();
  /* en plusieurs pas : un seul `move` ne produit qu'un pointermove, et un
     geste qui ne marcherait qu'en un bond ne marcherait pas à la main */
  for (let i = 1; i <= 6; i++) await p.mouse.move(b.x + dx * i / 6, b.y + dy * i / 6);
  await p.mouse.up();
  await p.waitForTimeout(120);
}

/* ---------- 1. au poste : la fenêtre suit la souris ---------- */
const poste = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await poste.newPage();
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await neuf(p);
const dep0 = await cadre(p);
await glisser(p, 180, 120);
const dep1 = await cadre(p);
if (Math.abs(dep1.x - dep0.x - 180) > 2 || Math.abs(dep1.y - dep0.y - 120) > 2)
  fail(`la fenêtre n'a pas suivi la souris : ${JSON.stringify(dep0)} → ${JSON.stringify(dep1)}`);
else console.log(`la fenêtre suit la barre de titre : ${dep0.x},${dep0.y} → ${dep1.x},${dep1.y} ✓`);

/* ---------- 2. la place tient pour la feuille SUIVANTE ---------- */
await fermer(p);
await ouvrirFiche(p);
const dep2 = await cadre(p);
if (Math.abs(dep2.x - dep1.x) > 2 || Math.abs(dep2.y - dep1.y) > 2)
  fail(`la place n'a pas tenu à la réouverture : ${JSON.stringify(dep1)} → ${JSON.stringify(dep2)}`);
else console.log('la place tient pour la feuille suivante ✓');

/* ---------- 3. double-clic : retour au centre ---------- */
const bh = await prise(p);
await p.mouse.dblclick(bh.x, bh.y);
await p.waitForTimeout(300);
const rec = await cadre(p);
if (Math.abs(rec.x - dep0.x) > 2 || Math.abs(rec.y - dep0.y) > 2)
  fail(`le double-clic n'a pas recentré : ${JSON.stringify(rec)}, attendu ${JSON.stringify(dep0)}`);
else console.log('double-clic sur la barre : la fenêtre revient au centre ✓');

/* ---------- 4. les bornes : la fenêtre ne se perd pas ---------- */
/* Le vrai danger. On pousse très loin dans les quatre sens — chacun
   depuis une fenêtre remise au centre — et on exige qu'il reste toujours
   de quoi la reprendre. */
const bornes = [];
for (const [dx, dy, sens] of [[4000, 0, 'droite'], [-4000, 0, 'gauche'],
                              [0, 4000, 'bas'], [0, -4000, 'haut']]){
  await neuf(p);
  await glisser(p, dx, dy);
  const r = await cadre(p);
  const vuX = Math.min(r.x + r.w, 1280) - Math.max(r.x, 0);
  bornes.push({ sens, vuX, barre: r.y, bouge: r.x !== dep0.x || r.y !== dep0.y });
  if (!bornes[bornes.length - 1].bouge)
    fail(`poussée à ${sens} : la fenêtre n'a pas bougé du tout — le test ne mesure rien`);
  if (vuX < 79) fail(`poussée à ${sens} : plus que ${vuX} px de fenêtre visible`);
  if (r.y < -1) fail(`poussée à ${sens} : la barre de titre est passée au-dessus de l'écran (y=${r.y})`);
  if (r.y > 800 - 43) fail(`poussée à ${sens} : la barre de titre est sortie par le bas (y=${r.y})`);
}
console.log('bornes tenues dans les quatre sens :',
  bornes.map(b => `${b.sens} → ${b.vuX} px visibles, barre à y=${b.barre}`).join(' · '), '✓');

/* ---------- 5. une confirmation ne se déplace pas ---------- */
await charger(p);
await p.evaluate(async () => {
  const { confirmSheet } = await import('./ui/dom.js');
  confirmSheet({ title: 'Supprimer ?', msg: 'Test', danger: true });
});
await p.waitForSelector('.modal-confirm');
await p.waitForTimeout(250);
const cf0 = await cadre(p);
/* petit glissement, qui se RELÂCHE encore dans la fenêtre : plus loin,
   le relâchement tombe sur le fond et referme la confirmation (clic hors
   feuille) — on mesurerait alors une disparition, pas une immobilité */
await glisser(p, 90, 50);
const cf1 = await cadre(p);
if (!cf0 || !cf1) fail('confirmation introuvable : ' + JSON.stringify([cf0, cf1]));
else if (Math.abs(cf1.x - cf0.x) > 2 || Math.abs(cf1.y - cf0.y) > 2)
  fail(`une confirmation s'est déplacée : ${JSON.stringify(cf0)} → ${JSON.stringify(cf1)}`);
else console.log('une confirmation reste où elle est ✓');
await fermer(p);

/* ---------- 6. une feuille qui ATTEND derrière une autre ---------- */
/* Au poste, une feuille ouverte sur une autre remplace sa fenêtre : la
   précédente passe en `display:none`. Son rectangle vaut alors zéro — la
   borner là-dessus écrirait n'importe quoi dans une place que TOUTES les
   feuilles partagent. Le déclencheur : redimensionner l'écran pendant ce
   temps-là. */
await charger(p);
await ouvrirFiche(p);
await glisser(p, 150, 90);
const av = await cadre(p);
await p.evaluate(async () => {
  const { openEditPiste } = await import('./ui/edit.js');
  const { S } = await import('./ui/state.js');
  openEditPiste(S.companies[0]);
});
/* `attached` et pas `visible` : c'est précisément une feuille CACHÉE
   qu'on attend — l'attente par défaut ne l'aurait jamais vue */
await p.waitForSelector('.ov-behind', { state: 'attached' });
await p.setViewportSize({ width: 1180, height: 760 });
await p.waitForTimeout(250);
await p.evaluate(async () => (await import('./ui/dom.js')).topSheet().close(null, true));
await p.waitForTimeout(300);
const ap = await cadre(p);
/* Exiger la place EXACTE, pas seulement « quelque part sur l'écran » :
   mesuré, la corruption dérive de 80 px sans jamais sortir de l'écran —
   un contrôle « toujours visible » l'aurait laissée passer. La fenêtre
   rétrécit de 100 × 40, donc le centre au repos glisse de 50 × 20 ;
   `posee` étant intacte, la fenêtre doit suivre exactement ça. */
const vise = { x: av.x - 50, y: av.y - 20 };
if (!ap) fail('la feuille en attente n’est pas revenue');
else if (Math.abs(ap.x - vise.x) > 2 || Math.abs(ap.y - vise.y) > 2)
  fail(`la place a dérivé pendant l'attente : ${JSON.stringify(ap)}, attendu ${JSON.stringify(vise)}`);
else console.log(`feuille en attente : la place tient au pixel (${av.x},${av.y} → ${ap.x},${ap.y}) ✓`);
await fermer(p);
await p.setViewportSize({ width: 1280, height: 800 });

/* ---------- 7. le curseur dit le geste ---------- */
await ouvrirFiche(p);
const curseurs = await p.evaluate(() => {
  const h = document.querySelector('.modal-fiche .modal-h');
  const x = h.querySelector('.x');
  return { barre: getComputedStyle(h).cursor, croix: getComputedStyle(x).cursor,
           infobulle: h.title || '', bulleCroix: x.title || '' };
});
if (curseurs.barre !== 'grab') fail('la barre de titre n’annonce pas le geste : cursor=' + curseurs.barre);
else if (curseurs.croix !== 'pointer') fail('la croix a hérité du curseur de la barre : ' + curseurs.croix);
else if (!/déplacer/.test(curseurs.infobulle)) fail('pas d’infobulle sur la barre : ' + curseurs.infobulle);
/* sans `title` propre, la croix affiche celle de la barre : le bouton
   annoncerait le geste du voisin */
else if (curseurs.bulleCroix !== 'Fermer') fail('la croix n’a pas son infobulle : ' + curseurs.bulleCroix);
else console.log('curseur « grab » sur la barre, « pointer » sur la croix, chacune son infobulle ✓');
await fermer(p);

/* ---------- 8. au doigt : rien ne se déplace, et le glissement referme ---------- */
const pouce = await browser.newContext({ viewport: { width: 390, height: 844 },
  hasTouch: true, isMobile: true });
const t = await pouce.newPage();
t.on('pageerror', e => errors.push(String(e)));
t.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await charger(t);
await ouvrirFiche(t);
const etat = await t.evaluate(() => {
  const h = document.querySelector('.modal-fiche .modal-h');
  return { titre: h.title || '', curseur: getComputedStyle(h).cursor };
});
if (etat.titre) fail('au doigt, la barre annonce un geste souris : ' + etat.titre);
/* le glissement vers le bas doit toujours refermer — c'est le geste que
   le déplacement aurait pu manger */
const parti = await t.evaluate(() => new Promise(res => {
  const h = document.querySelector('.modal-fiche .modal-h');
  const r = h.getBoundingClientRect();
  const x = r.left + 40, y0 = r.top + r.height / 2;
  const pt = cy => new Touch({ identifier: 1, target: h, clientX: x, clientY: cy });
  const env = (nom, cy, fini) => h.dispatchEvent(new TouchEvent(nom, { bubbles: true, cancelable: true,
    touches: fini ? [] : [pt(cy)], changedTouches: [pt(cy)] }));
  env('touchstart', y0);
  env('touchmove', y0 + 70);
  env('touchmove', y0 + 150);
  env('touchend', y0 + 150, true);
  setTimeout(() => res(!document.querySelector('.modal-fiche')), 400);
}));
if (!parti) fail('au doigt, le glissement vers le bas ne referme plus la feuille');
else console.log('au doigt : pas d’infobulle souris, et le glissement referme toujours ✓');

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E fenêtre : ÉCHEC' : 'E2E fenêtre : OK');

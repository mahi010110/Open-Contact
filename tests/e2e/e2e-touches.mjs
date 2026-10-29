/* ============================================================
   OpenContact — e2e : LE CLAVIER AU POSTE (lot R8)
   (docs/propositions/R8-le-clavier.md, validée le 20 octobre 2026)

   Ouvert à tous depuis la 7.0.0, sur l'app réelle.
   ① Ctrl K ouvre « Chercher » au poste : « aztek » donne la piste, puis
     « Écrire à Aztek » et « Planifier Aztek » ; ↓ et Entrée font le
     geste ; « karim » écrit à Karim ; rien de tapé, les gestes. Au pouce,
     rien ne s'ouvre ;
   ② chaque lettre s'écrit dans son bouton, et `aria-keyshortcuts` la
     dit : N dans « Nouvelle piste », E et P dans la fiche, E et F sur la ligne
     d'« Aujourd'hui » qui a le curseur. Dans la fiche, P planifie, E
     écrit — mais une lettre tapée dans « Mes notes » s'y écrit. Sur la
     ligne, F coche l'action ;
   ③ Réglages, au poste : « Touches d'une lettre · allumées » ; éteintes,
     plus aucune touche n'est écrite ni n'agit (N, /, E, F), et Ctrl K
     reste. Au pouce, pas de rangée ;
   poste clair et sombre ; zéro erreur console.
   Quatre mutations : les touches qui ne se coupent plus, une lettre qui
   agit dans un champ, la piste trouvée par son nom qui ne passe plus
   devant, un écran choisi avant que la feuille ait rendu son entrée
   d'historique.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, relaisMuets, ouvrirReglages, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const auj = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const AUJ = iso(auj), J = 864e5, now = Date.now();
const PISTES = [
  { id: 'az', name: 'Aztek', city: 'Roubaix', status: 'active', updatedAt: now - J,
    nextAction: AUJ, nextActionText: 'Relancer Claire',
    contacts: [{ id: 'c1', name: 'Claire Dubois', email: 'claire@aztek.test' }] },
  { id: 'th', name: 'Thales', city: 'Lille', status: 'todo', updatedAt: now - 2 * J, desc: 'Partenaire d’Aztek' },
  { id: 'ki', name: 'Kiabi', city: 'Hem', status: 'todo', updatedAt: now - 3 * J }
];
const CLE = 'BHt0VjI2bS1xV2Z6c0Y4bnN3UGRLZ2pQS0dOYVVNbm9VZWpZQ3NuUmhHUXhBVmdIZHlXZDZHN2xrQmJiVjNvbEE';
const PROFIL = { name: 'Inès Martin', email: 'ines@exemple.test', formation: 'BTS SIO', recherche: 'alternance',
  amiId: 'InesInesInesInesInes01',
  amis: [{ id: 'KarimKarimKarimKarim01', nom: 'Karim Benali', parcours: [], cle: CLE.slice(0, 87), recu: 1 }] };

async function ecran(nom, { vp = { width: 1280, height: 800 }, sombre = false, 
                            profil = PROFIL, hash = '#/aujourdhui', mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx); await relaisMuets(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([ps, pr]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [PISTES, profil]);
  await p.evaluate(h => { location.hash = h; }, hash);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(400);
  return { ctx, p };
}
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .mh-t')].pop()?.textContent.trim() || '');
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};
const lignes = p => p.evaluate(() => [...document.querySelectorAll('#pkListe .pk-o b')].map(b => b.textContent.trim()));
/* le document a le focus, pas un champ : là où une lettre doit agir */
const surLeFond = p => p.evaluate(() => { document.activeElement?.blur(); document.body.focus(); });
const ouvrirFiche = async (p, id) => {
  await fermer(p);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForTimeout(450);
};

/* ---------- ① Ctrl K ---------- */
async function palette(mutations = {}){
  const { ctx, p } = await ecran('palette', { mutations });
  await surLeFond(p);
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(300);
  const titre = await dessus(p);
  const vide = await lignes(p);
  await p.keyboard.type('aztek');
  await p.waitForTimeout(150);
  const az = await lignes(p);
  return { ctx, p, titre, vide, az };
}
{
  const { ctx, p, titre, vide, az } = await palette();
  ok(titre === 'Chercher', '① Ctrl K ouvre « Chercher » — « ' + titre + ' »');
  ok(vide[0] === 'Nouvelle piste' && vide.includes('Ma semaine'), '① rien de tapé : les gestes de l’écran — ' + vide.join(' | '));
  ok(az.slice(0, 4).join(' | ') === 'Aztek | Écrire à Aztek | Planifier Aztek | Thales',
     '① « aztek » : la piste par son nom, ses gestes, puis celle qui en parle — ' + az.join(' | '));
  await p.screenshot({ path: `${SHOTS}/r8-chercher-poste.png` });
  /* ↓ choisit « Écrire à Aztek », Entrée le fait */
  await p.keyboard.press('ArrowDown');
  const sel = await p.evaluate(() => document.querySelector('#pkListe .pk-sel b')?.textContent.trim());
  const desc = await p.evaluate(() => document.querySelector('#pkQ').getAttribute('aria-activedescendant'));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(500);
  ok(sel === 'Écrire à Aztek' && desc === 'pkO1' && await dessus(p) === 'Écrire',
     '① ↓ puis Entrée : « Écrire à Aztek » ouvre le mail — ' + sel);
  await fermer(p);
  /* un ami : lui écrire */
  await surLeFond(p);
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(250);
  await p.keyboard.type('karim');
  await p.waitForTimeout(150);
  const k = await lignes(p);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(600);
  ok(k[0] === 'Écrire à Karim' && await dessus(p) === 'Karim Benali', '① « karim » : Entrée ouvre votre conversation — ' + k.join(' | '));
  await fermer(p);
  await ctx.close();
}
/* un ÉCRAN choisi dans « Chercher » : on y arrive, on y reste, et le
   retour ramène à celui d'avant — la feuille fermée rend son entrée
   d'historique AVANT que l'adresse change */
async function allerPar(mutations = {}){
  const { ctx, p } = await ecran('palette-ecran', { mutations });
  const vu = [];
  for (const mot of ['mes pistes', 'aujourd', 'mes pistes']){
    await surLeFond(p);
    await p.keyboard.press('Control+k');
    await p.waitForTimeout(250);
    await p.keyboard.type(mot);
    await p.waitForTimeout(150);
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
    vu.push(await p.evaluate(() => location.hash));
  }
  await p.goBack();
  await p.waitForTimeout(500);
  vu.push('retour ' + await p.evaluate(() => location.hash));
  await ctx.close();
  return vu.join(' → ');
}
{
  const vu = await allerPar();
  ok(vu === '#/pistes → #/aujourdhui → #/pistes → retour #/aujourdhui', '① un écran choisi : on y arrive, et le retour ramène à celui d’avant — ' + vu);
}
{
  const { ctx, p } = await ecran('palette-pouce', { vp: { width: 390, height: 844 } });
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(300);
  ok(!await dessus(p) && !await p.$('#btnPalette:visible'), '① au pouce : ni fenêtre, ni bouton');
  await ctx.close();
}

/* ---------- ② les lettres, dans leurs boutons ---------- */
{
  const { ctx, p } = await ecran('lettres');
  const ajout = await p.evaluate(() => { const b = document.querySelector('#btnAddTop');
    return { kbd: b.querySelector('.kbd-btn')?.textContent, aria: b.getAttribute('aria-keyshortcuts'), mot: b.textContent.replace(/\s+/g, ' ').trim() }; });
  const chercher = await p.evaluate(() => { const b = document.querySelector('#btnPalette');
    return b ? { t: b.textContent.replace(/\s+/g, ' ').trim(), aria: b.getAttribute('aria-keyshortcuts') } : null; });
  ok(ajout.kbd === 'N' && ajout.aria === 'N' && /^Nouvelle piste/.test(ajout.mot), '② « Nouvelle piste » porte N — ' + JSON.stringify(ajout));
  ok(chercher && /Chercher Ctrl K$/.test(chercher.t) && chercher.aria === 'Control+K', '② « Chercher » porte Ctrl K — ' + JSON.stringify(chercher));
  await p.screenshot({ path: `${SHOTS}/r8-entete-poste.png` });
  /* la ligne d'« Aujourd'hui » : ses lettres ne se montrent qu'au curseur */
  const avant = await p.evaluate(() => [...document.querySelectorAll('.act-row[data-id="az"] .kbd-btn')].map(k => getComputedStyle(k).display));
  await p.focus('.act-row[data-id="az"] .act-main');
  const pendant = await p.evaluate(() => [...document.querySelectorAll('.act-row[data-id="az"] .kbd-btn')].map(k => k.textContent + ':' + getComputedStyle(k).display));
  /* posée en absolu, la touche se calcule en `block` : on lit seulement
     qu'elle n'est plus cachée */
  ok(avant.length === 2 && avant.every(d => d === 'none') && pendant.map(x => x.replace(/:(?!none).*/, ':vue')).join() === 'F:vue,E:vue',
     '② sur la ligne, F et E ne se montrent qu’au curseur — ' + pendant.join());
  await p.screenshot({ path: `${SHOTS}/r8-ligne-poste.png` });
  await p.keyboard.press('f');
  await p.waitForTimeout(700);
  const fait = await p.evaluate(async () => { const { S } = await import('./ui/state.js'); return S.companies.find(c => c.id === 'az').nextAction || ''; });
  ok(!fait, '② F coche l’action de la ligne');
  /* la fiche : E et P, dans leurs boutons */
  await ouvrirFiche(p, 'az');
  const fiche = await p.evaluate(() => ({
    ecrire: [...document.querySelectorAll('.overlay .modal-f button')].map(b => {
      const k = b.querySelector('.kbd-btn');
      const mot = [...b.childNodes].filter(n => n !== k).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
      return k ? `${mot} [${k.textContent}:${b.getAttribute('aria-keyshortcuts')}]` : mot;
    }).join('|'),
    na: document.querySelector('#fiNa')?.getAttribute('aria-keyshortcuts'),
    naKbd: document.querySelector('#fiNa .kbd-btn')?.textContent
  }));
  ok(fiche.ecrire === 'Écrire [E:E]' && fiche.na === 'P' && fiche.naKbd === 'P', '② la fiche : E dans « Écrire », P dans « Planifier » — ' + JSON.stringify(fiche));
  await p.screenshot({ path: `${SHOTS}/r8-fiche-poste.png` });
  /* une lettre tapée dans « Mes notes » s'y écrit */
  await p.focus('#fiNotes');
  await p.keyboard.type('pe');
  await p.waitForTimeout(250);
  const notes = await p.evaluate(() => document.querySelector('#fiNotes').value);
  ok(notes === 'pe' && await dessus(p) === 'Fiche', '② dans « Mes notes », p et e s’écrivent — « ' + notes + ' »');
  await fermer(p);
  await ouvrirFiche(p, 'th');
  await p.evaluate(() => document.querySelector('.overlay .modal-b')?.focus());
  await p.evaluate(() => { const b = document.querySelector('.overlay .modal-b'); b.setAttribute('tabindex', '-1'); b.focus(); });
  await p.keyboard.press('p');
  await p.waitForTimeout(400);
  ok(await dessus(p) === 'Prochaine action ?', '② dans la fiche, P planifie — « ' + await dessus(p) + ' »');
  await fermer(p);
  await ouvrirFiche(p, 'th');
  await p.evaluate(() => { const b = document.querySelector('.overlay .modal-b'); b.setAttribute('tabindex', '-1'); b.focus(); });
  await p.keyboard.press('e');
  await p.waitForTimeout(500);
  ok(await dessus(p) === 'Écrire', '② dans la fiche, E écrit');
  await fermer(p);
  /* N, depuis l'écran */
  await surLeFond(p);
  await p.keyboard.press('n');
  await p.waitForTimeout(400);
  ok(await dessus(p) === 'Nouvelle piste', '② N ouvre une piste neuve');
  await ctx.close();
}

/* ---------- ③ « Touches d'une lettre » ---------- */
async function couper(mutations = {}){
  const { ctx, p } = await ecran('couper', { hash: '#/moi', mutations });
  await ouvrirReglages(p);
  const rangee = await p.evaluate(() => document.querySelector('#moiTouches')?.textContent.replace(/\s+/g, ' ').trim() || '');
  await p.click('#moiTouches');
  await p.waitForTimeout(300);
  await p.click('[data-touches="non"]');
  await p.waitForTimeout(200);
  const stocke = await p.evaluate(async () => { const st = await import('./engine/storage.js');
    return (JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}').flags || {}).sansLettres === true; });
  await fermer(p);
  await p.evaluate(() => { location.hash = '#/aujourdhui'; });
  await p.waitForTimeout(400);
  const kbd = await p.evaluate(() => document.querySelectorAll('.kbd-btn').length - document.querySelectorAll('#btnPalette .kbd-btn').length);
  const aria = await p.evaluate(() => document.querySelector('#btnAddTop').getAttribute('aria-keyshortcuts'));
  await surLeFond(p);
  await p.keyboard.press('n');
  await p.waitForTimeout(350);
  const apresN = await dessus(p);
  await p.keyboard.press('/');
  await p.waitForTimeout(350);
  const apresSlash = location => location;
  const hash = await p.evaluate(() => location.hash);
  await p.focus('.act-row[data-id="az"] .act-main');
  await p.keyboard.press('f');
  await p.waitForTimeout(400);
  const toujours = await p.evaluate(async () => { const { S } = await import('./ui/state.js'); return S.companies.find(c => c.id === 'az').nextAction || ''; });
  await surLeFond(p);
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(300);
  const palette = await dessus(p);
  await p.screenshot({ path: `${SHOTS}/r8-touches-eteintes-poste.png` });
  await ctx.close();
  return { rangee, stocke, kbd, aria, apresN, hash, toujours, palette };
}
{
  const r = await couper();
  ok(r.rangee === 'Touches d’une lettre allumées', '③ Réglages, au poste : « ' + r.rangee + ' »');
  ok(r.stocke, '③ « Éteintes » s’enregistre dans le profil (flags.sansLettres)');
  ok(r.kbd === 0 && !r.aria, '③ éteintes : plus aucune touche écrite, ni annoncée');
  ok(!r.apresN && r.hash === '#/aujourdhui' && !!r.toujours, '③ éteintes : N, / et F ne font plus rien');
  ok(r.palette === 'Chercher', '③ Ctrl K reste : un modificateur ne se déclenche pas en parlant');
}
{
  const { ctx, p } = await ecran('couper-pouce', { vp: { width: 390, height: 844 }, hash: '#/moi' });
  await ouvrirReglages(p);
  ok(!await p.$('#moiTouches'), '③ au pouce : pas de rangée, il n’y a pas de clavier');
  await ctx.close();
}

/* ---------- les deux thèmes ---------- */
{
  const { ctx, p } = await ecran('sombre', { sombre: true });
  await surLeFond(p);
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(250);
  await p.keyboard.type('aztek');
  await p.waitForTimeout(150);
  ok(await dessus(p) === 'Chercher', 'poste sombre : « Chercher »');
  await p.screenshot({ path: `${SHOTS}/r8-chercher-poste-sombre.png` });
  await ctx.close();
}

/* ---------- les mutations : chaque garde doit rougir ---------- */
async function muter(nom, f, avant, apres, rejouer, rougit){
  const src = await readFile(path.join(ROOT, f), 'utf8');
  if (!src.includes(avant)){ ko++; console.log(`ÉCHEC — mutation ${nom} : le texte visé n’existe plus dans ${f}`); return; }
  console.log(`mutation ${nom} : le fichier servi est bien modifié ✓`);
  const r = await rejouer({ [f]: src.replace(avant, apres) });
  ok(rougit(r), `mutation ${nom} : la garde rougit`);
}
await muter('① les touches qui ne se coupent plus', 'engine/clavier.js',
  'if (!ev || coupees || champ) return', 'if (!ev || champ) return',
  m => couper(m), r => !!r.apresN || !r.toujours);
await muter('② une lettre qui agit dans un champ', 'engine/clavier.js',
  'if (!ev || coupees || champ) return', 'if (!ev || coupees) return',
  async m => {
    const { ctx, p } = await ecran('champ-mut', { mutations: m });
    await ouvrirFiche(p, 'az');
    await p.focus('#fiNotes');
    await p.keyboard.type('e');
    await p.waitForTimeout(400);
    const t = await dessus(p);
    await ctx.close();
    return t;
  }, t => t === 'Écrire');
await muter('③ la piste par son nom qui ne passe plus devant', 'engine/clavier.js',
  '[...parNom, ...parFiche]', '[...parFiche, ...parNom]',
  m => palette(m).then(async r => { await r.ctx.close(); return r.az; }), az => az[0] !== 'Aztek');
await muter('④ un écran choisi avant que la feuille ait rendu son entrée', 'ui/clavier.js',
  "if (ECRANS.has(p.geste) && p.sorte === 'geste') await apresRetours();", '',
  m => allerPar(m), vu => vu !== '#/pistes → #/aujourdhui → #/pistes → retour #/aujourdhui');

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E touches : ${ko} ÉCHEC(S)` : '\nE2E touches : OK');
process.exit(ko ? 1 : 0);

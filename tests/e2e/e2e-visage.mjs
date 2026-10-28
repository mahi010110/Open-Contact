/* ============================================================
   MON VISAGE — dessiner le sien, et ce qui en sort
   (le mainteneur, 28 octobre 2026 : « j'aimerais bien pouvoir dessiner
   son propre dessin » ; son choix : « Mon visage »)

   Joué à deux — Karim dessine, Inès le voit —, sur un relais local qui
   garde tout ce qui passe :
   ① LA FUITE D'ABORD (§8), depuis l'état réel et par les vrais
     boutons : le dessin part dans le profil donné (« Mon QR », OCA1) —
     le motif et la teinte, rien d'autre — et NULLE PART AILLEURS : ni
     dans ce qui passe par un groupe (présence, mot), ni dans un partage
     de pistes ;
   ② l'éditeur : une case touchée s'allume avec sa jumelle, une teinte
     se choisit, « Enregistrer » ; « Mon visage » le montre dans « Moi »
     et sous « Mon QR » ; rien de dessiné, rien à enregistrer ;
   ③ chez Inès, qui reçoit le profil de Karim : son dessin dans « Mes
     amis », et sur ses mots dans le groupe — rien de plus n'a voyagé
     pour ça ;
   ④ « Visage d'origine » : le dessin part, le profil donné redevient ce
     qu'il était ;
   ⑤ pouce et poste, clair et sombre, captures ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, ouvrirMonQR, ouvrirRecevoir, ouvrirMesAmis, ouvrirDonner } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, nouveauCode, nouvelleCleSignature } from '../../engine/groupe.js';
import { nouvelleCle } from '../../engine/boite.js';
import { visageDessine, motifDe } from '../../engine/visage.js';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { evs.push(ev); return null; } });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const CODE = nouveauCode();
const CHEF = await nouvelleCleSignature();
const K = { ines: await nouvelleCle(), karim: await nouvelleCle() };
const ID = { ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001' };
const NOM = { ines: 'Inès Martin', karim: 'Karim Benali' };
const groupe = qui => ({ code: CODE, nom: 'BTS SIO Lille', at: 1, chef: CHEF.pub, ...(qui === 'ines' ? { sign: CHEF } : {}) });
const profil = qui => ({ name: NOM[qui], email: qui + '@prive.test', formation: 'BTS SIO', amiId: ID[qui], boite: K[qui], groupes: [groupe(qui)] });
const PISTES = [{ id: 'kp', name: 'Secret Corp', city: 'Lille', status: 'reply', notes: 'note privée', updatedAt: 2 }];

async function ecran(qui, { vp = { width: 390, height: 844 }, sombre = false } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, ignoreHTTPSErrors: true, colorScheme: sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  await ctx.addInitScript(() => {
    window.__copie = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copie.push(String(t)); } }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(qui + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|net::ERR/.test(m.text())) errors.push(qui + ' : ' + m.text()); });
  await p.goto(base + '/#/moi', { waitUntil: 'load' });
  await p.evaluate(async ([pr, ps, url]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [profil(qui), qui === 'karim' ? PISTES : [], relay.url]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-moi:not([hidden])');
  await p.waitForTimeout(300);
  return { ctx, p };
}
const fermerTout = async p => {
  for (let i = 0; i < 6; i++){
    const n = await p.evaluate(() => document.querySelectorAll('.overlay:not(.ov-out)').length);
    if (!n) break;
    await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop().querySelector('.modal-h button.x').click());
    await p.waitForTimeout(250);
  }
  await p.evaluate(() => document.querySelector('.undo-bar .bar-x')?.click());
};
const stocke = p => p.evaluate(async () => { const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}'); });
/* le tracé d'un visage tel que l'app le dessine */
const trace = v => v.cases.map(([x, y]) => `M${x + 1} ${y + 1}h1v1h-1z`).join('');
async function monQR(p){
  await fermerTout(p);
  await ouvrirMonQR(p);
  await p.waitForSelector('#mqCopier');
  await p.evaluate(() => { window.__copie = []; });
  await p.click('#mqCopier');
  await p.waitForTimeout(150);
  const txt = await p.evaluate(() => window.__copie.at(-1) || '');
  const d = await p.evaluate(async t => { const { decodeOCA, extraireOCA } = await import('./engine/exchange.js');
    return decodeOCA(extraireOCA(t)); }, txt);
  const sous = await p.evaluate(() => document.querySelector('#mqDonne .vz path')?.getAttribute('d') || '');
  return { txt, d, sous };
}
/* tout ce qui est passé par le groupe, ouvert avec son code */
async function groupeEnClair(){
  const k = await cleGroupe(CODE);
  const out = [];
  for (const ev of evs) if ((ev.tags || []).some(t => t[0] === 'x' && t[1] === k.etiquette)){ const m = await ouvrirMessage(k, ev.content); if (m) out.push(m); }
  return out;
}

/* ---------- ② l'éditeur, chez Karim ---------- */
const Ka = await ecran('karim');
await Ka.p.waitForSelector('#moiVisage');
const tire = motifDe(ID.karim);
{
  const avant = await Ka.p.evaluate(() => document.querySelector('#moiVisage .vz path').getAttribute('d'));
  if (avant !== trace(visageDessine(tire))) fail('« Mon visage » ne montre pas le visage tiré avant tout dessin');
}
await Ka.p.click('#moiVisage');
await Ka.p.waitForSelector('.mv-grille');
/* on part du visage actuel */
{
  const on = await Ka.p.evaluate(() => [...document.querySelectorAll('.mv-c')].map(b => b.getAttribute('aria-pressed') === 'true' ? 1 : 0).join(''));
  const attendu = Array.from({ length: 25 }, (_, i) => visageDessine(tire).cases.some(([x, y]) => x === i % 5 && y === Math.floor(i / 5)) ? 1 : 0).join('');
  if (on !== attendu) fail('l’éditeur ne part pas du visage actuel');
}
/* effacer tout, puis dessiner : chaque case touchée s'allume avec sa jumelle */
for (const b of await Ka.p.$$('.mv-c[aria-pressed="true"]')){
  const x = +(await b.getAttribute('data-x')), y = +(await b.getAttribute('data-y'));
  if (x <= 2 && await Ka.p.evaluate(([a, c]) => document.querySelector(`.mv-c[data-x="${a}"][data-y="${c}"]`).getAttribute('aria-pressed') === 'true', [x, y]))
    await Ka.p.click(`.mv-c[data-x="${x}"][data-y="${y}"]`);
}
if (await Ka.p.$('.mv-c[aria-pressed="true"]')) fail('la grille ne se vide pas');
if (!await Ka.p.evaluate(() => document.getElementById('mvGo').disabled)) fail('rien de dessiné, « Enregistrer » reste possible');
for (const [x, y] of [[0, 0], [1, 1], [2, 2], [4, 4]]) await Ka.p.click(`.mv-c[data-x="${x}"][data-y="${y}"]`);
const allumees = await Ka.p.evaluate(() => [...document.querySelectorAll('.mv-c[aria-pressed="true"]')].map(b => b.dataset.x + b.dataset.y).sort().join(' '));
if (allumees !== '00 04 11 22 31 40 44') fail('une case touchée n’allume pas sa jumelle : ' + allumees);
await Ka.p.click('.mv-t[data-t="4"]');
if (await Ka.p.getAttribute('.mv-t[data-t="4"]', 'aria-checked') !== 'true') fail('la teinte touchée ne se dit pas choisie');
await Ka.p.waitForTimeout(200);
await Ka.p.screenshot({ path: `${SHOTS}/160-visage-editeur-pouce.png` });
await Ka.p.click('#mvGo');
await Ka.p.waitForTimeout(400);
const DESSIN = (await stocke(Ka.p)).visage;
{
  /* les cases (0,0), (1,1), (2,2), (0,4) et leurs jumelles — le bit y·3+x */
  const m = (1 << 0) | (1 << 4) | (1 << 8) | (1 << 12);
  if (!DESSIN || DESSIN.m !== m || DESSIN.t !== 4 || Object.keys(DESSIN).length !== 2) fail('le dessin enregistré : ' + JSON.stringify(DESSIN));
  const ligne = await Ka.p.evaluate(() => ({ d: document.querySelector('#moiVisage .vz path').getAttribute('d'), c: document.querySelector('#moiVisage .vz').className }));
  if (ligne.d !== trace(visageDessine(DESSIN)) || !/vz-4/.test(ligne.c)) fail('« Mon visage » ne montre pas le dessin : ' + JSON.stringify(ligne));
}
console.log('② l’éditeur part du visage actuel, une case allume sa jumelle, rien de dessiné ne s’enregistre, « Mon visage » montre le dessin ✓');

/* ---------- ① la fuite d'abord ---------- */
const qr = await monQR(Ka.p);
{
  const cles = Object.keys(qr.d).sort().join(',');
  if (cles !== 'cle,id,kind,nom,parcours,v,visage') fail('le profil donné porte : ' + cles);
  if (JSON.stringify(qr.d.visage) !== JSON.stringify(DESSIN)) fail('le visage donné n’est pas le dessin, tel quel : ' + JSON.stringify(qr.d.visage));
  if (qr.sous !== trace(visageDessine(DESSIN))) fail('sous le QR, le visage n’est pas celui qui part');
}
await Ka.p.screenshot({ path: `${SHOTS}/160-visage-mon-qr-pouce.png` });
/* le groupe : Karim l'ouvre (sa présence part) et y écrit */
await fermerTout(Ka.p);
await Ka.p.evaluate(async c => (await import('./ui/groupes.js')).ouvrirGroupe(c), CODE);
await Ka.p.waitForSelector('#grMot');
await Ka.p.fill('#grMot', 'Salut le groupe');
await Ka.p.click('#grEnvoyer');
await Ka.p.waitForFunction(() => /Salut le groupe/.test(document.querySelector('#grFil')?.textContent || ''));
await Ka.p.waitForTimeout(800);
{
  const tout = await groupeEnClair();
  if (!tout.some(m => m.t === 'mot' && /Salut le groupe/.test(m.texte))) fail('le mot de Karim n’est pas au relais : la mesure ne mesure rien');
  const brut = JSON.stringify(tout);
  if (/"visage"/.test(brut) || brut.includes(`"m":${DESSIN.m},"t":${DESSIN.t}`)) fail('le visage passe par le groupe');
}
/* un partage de pistes (« Donner › Texte ») */
await fermerTout(Ka.p);
await ouvrirDonner(Ka.p);
await Ka.p.waitForSelector('#dnText');
await Ka.p.evaluate(() => { window.__copie = []; });
await Ka.p.click('#dnText');
await Ka.p.waitForTimeout(250);
{
  const sortie = await Ka.p.evaluate(() => window.__copie.join('\n'));
  if (!sortie.includes('Secret Corp')) fail('« Donner › Texte » n’a rien produit : la mesure ne mesure rien');
  if (/visage/i.test(sortie)) fail('un partage de pistes porte le visage');
}
console.log('① le dessin part dans le profil donné — le motif et la teinte, rien d’autre — et ni par le groupe, ni dans un partage de pistes ✓');

/* ---------- ③ chez Inès ---------- */
const In = await ecran('ines');
await ouvrirRecevoir(In.p, 'texte');
await In.p.fill('#rcTxt', qr.txt);
await In.p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-f .btn-primary').click());
await In.p.waitForSelector('#amAjouter');
await In.p.click('#amAjouter');
await In.p.waitForTimeout(500);
{
  const k = ((await stocke(In.p)).amis || []).find(a => a.id === ID.karim);
  if (!k || JSON.stringify(k.visage) !== JSON.stringify(DESSIN)) fail('chez Inès, Karim n’a pas son dessin : ' + JSON.stringify(k && k.visage));
}
await fermerTout(In.p);
await ouvrirMesAmis(In.p);
await In.p.waitForSelector('#piAmis');
{
  const d = await In.p.evaluate(id => document.querySelector(`#piAmis [data-ami="${id}"] .vz path, #piAmis .am-row .vz path`)?.getAttribute('d') || '', ID.karim);
  if (d !== trace(visageDessine(DESSIN))) fail('dans « Mes amis », Karim n’a pas son dessin');
}
await In.p.screenshot({ path: `${SHOTS}/160-visage-chez-ines-pouce.png` });
/* sa conversation porte son visage dans la barre, comme l'avatar en tête
   de toute messagerie */
await fermerTout(In.p);
await In.p.evaluate(async id => { const { S } = await import('./ui/state.js');
  (await import('./ui/messages.js')).ouvrirConversation(S.profile.amis.find(a => a.id === id)); }, ID.karim);
await In.p.waitForSelector('.modal-conv .modal-h .vz');
{
  const d = await In.p.evaluate(() => document.querySelector('.modal-conv .modal-h .vz path')?.getAttribute('d') || '');
  if (d !== trace(visageDessine(DESSIN))) fail('la barre de la conversation ne porte pas le dessin de Karim');
}
await In.p.waitForTimeout(400);
await In.p.screenshot({ path: `${SHOTS}/160-visage-conversation-pouce.png` });
await fermerTout(In.p);
await In.p.evaluate(async c => (await import('./ui/groupes.js')).ouvrirGroupe(c), CODE);
await In.p.waitForFunction(() => /Salut le groupe/.test(document.querySelector('#grFil')?.textContent || ''), null, { timeout: 15000 });
{
  const d = await In.p.evaluate(() => [...document.querySelectorAll('#grFil .gr-m')].find(li => /Salut le groupe/.test(li.textContent))?.querySelector('.vz path')?.getAttribute('d') || '');
  if (d !== trace(visageDessine(DESSIN))) fail('dans le groupe, le mot de Karim ne porte pas son dessin chez Inès');
}
await In.p.screenshot({ path: `${SHOTS}/160-visage-groupe-pouce.png` });
console.log('③ chez Inès : le dessin de Karim dans « Mes amis », dans la barre de sa conversation et sur son mot dans le groupe ✓');

/* ---------- ④ « Visage d'origine » ---------- */
await fermerTout(Ka.p);
await Ka.p.evaluate(() => { location.hash = '#/moi'; });
await Ka.p.waitForSelector('#moiVisage');
await Ka.p.click('#moiVisage');
await Ka.p.waitForSelector('#mvOrigine');
await Ka.p.click('#mvOrigine');
await Ka.p.click('#mvGo');
await Ka.p.waitForTimeout(400);
if ('visage' in await stocke(Ka.p)) fail('« Visage d’origine » laisse un dessin dans le profil');
{
  const q2 = await monQR(Ka.p);
  if ('visage' in q2.d) fail('revenu au visage d’origine, le profil donné porte encore un dessin');
}
console.log('④ « Visage d’origine » : le dessin part, le profil donné redevient ce qu’il était ✓');

/* ---------- ⑤ pouce et poste, clair et sombre ---------- */
for (const [nom, vp, sombre] of [['pouce-sombre', { width: 390, height: 844 }, true], ['petit', { width: 360, height: 640 }, false],
                                 ['poste', { width: 1280, height: 800 }, false], ['poste-sombre', { width: 1280, height: 800 }, true]]){
  const E = await ecran('karim', { vp, sombre });
  await E.p.waitForSelector('#moiVisage');
  await E.p.click('#moiVisage');
  await E.p.waitForSelector('.mv-grille');
  const m = await E.p.evaluate(() => {
    const b = [...document.querySelectorAll('.overlay .modal-b')].pop();
    const z = b.getBoundingClientRect();
    const hors = [...b.querySelectorAll('*')].some(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > z.right + 1 || r.left < z.left - 1); });
    const petites = [...b.querySelectorAll('.mv-c, .mv-t')].filter(e => matchMedia('(pointer:coarse)').matches && e.getBoundingClientRect().height < 43.5).length;
    return { hors, petites, page: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  if (m.hors || m.petites || m.page) fail(`${nom} : l’éditeur déborde ou ses cases sont petites — ${JSON.stringify(m)}`);
  await E.p.screenshot({ path: `${SHOTS}/160-visage-editeur-${nom}.png` });
  await E.ctx.close();
}
console.log('⑤ pouce, petit, poste, clair et sombre : rien ne déborde, chaque case est une cible ✓');

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
await browser.close();
server.close();
relay.close && relay.close();
console.log(process.exitCode ? 'E2E visage : ÉCHEC' : 'E2E visage : OK');
process.exit(process.exitCode || 0);

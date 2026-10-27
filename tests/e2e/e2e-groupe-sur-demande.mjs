/* ============================================================
   Le groupe « sur demande » — « un chef et ses adjoints acceptent les
   entrées ; si le chef ne revient plus, ses adjoints suffisent »
   (docs/reseau.md, lot 5c, décision 24)

   Inès crée « BTS SIO Lille », sur demande. Karim demande à entrer par
   la porte qu'elle lui montre ; elle accepte, puis le nomme adjoint.
   Sofia demande par la porte que Karim lui montre, et c'est Karim qui
   la fait entrer. Tom demande aussi ; Inès refuse.

   Joué à QUATRE (§8, règle 4), sur un relais local qui garde tout :

   ① LA FUITE D'ABORD : la porte ne porte jamais le code — le nom du
     groupe, son identifiant, des clés ; une demande d'entrée ne porte
     que le prénom et la clé de boîte (ni nom de famille, ni e-mail) ;
     le code ne voyage que scellé pour qui est accepté ; un refus
     n'envoie RIEN ;
   ② créer : « Ouvert » ou « Sur demande », et ce que ça change se lit
     sous les segments ; l'invitation est un QR sans code ;
   ③ demander à entrer (Rejoindre, ou Ajouter › Recevoir › Texte) : « Le groupe
     verra ton prénom » AVANT ; « BTS SIO Lille · en attente » après ;
   ④ chez qui ouvre : un point sur la ligne du groupe, « Karim veut
     entrer » EN TÊTE du groupe, Accepter / Refuser ; accepté, Karim
     entre seul à sa prochaine ouverture (« Tu es dans BTS SIO Lille. ») ;
   ⑤ « Nommer adjoint » : « Annuler » le retient (rien ne part) ; sinon
     la nomination part après la barre, signée — et l'adjoint ouvre la
     porte à son tour ;
   ⑥ pouce, poste, sombre, 320 px texte doublé : rien ne déborde ; zéro
     erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, ouvrirRecevoir } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, lirePorte } from '../../engine/groupe.js';
import { ouvrir, etiquetteBoite } from '../../engine/boite.js';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { evs.push(ev); return null; } });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ID = { ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', sofia: 'SofiaSofiaSofia000001', tom: 'TomTomTomTomTomTom0001' };
const NOM = { ines: 'Inès Martin', karim: 'Karim Benali', sofia: 'Sofia Haddad', tom: 'Tom Leroy' };
const PRIVE = ['Martin', 'Benali', 'Haddad', 'Leroy', '@prive.test', '06 12 34 56 78'];
const profil = (qui, o = {}) => ({ name: NOM[qui], email: qui + '@prive.test', phone: '06 12 34 56 78', formation: 'BTS SIO',
  amiId: ID[qui], ...o });

async function ecran(qui, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true,
    colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(qui + ' : ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(qui + ' : ' + m.text()); });
  /* ce que « Copier » met au presse-papier, lu sans dépendre des
     permissions du navigateur de test */
  await p.addInitScript(() => {
    window.__copie = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copie = t; } }, configurable: true });
  });
  await p.goto(base + '/#/reseau', { waitUntil: 'load' });
  await p.evaluate(async ([pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify([]));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [o.profilBrut || profil(qui, o.profil), relay.url]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-reseau:not([hidden])');
  return { ctx, p };
}
const fermerTout = async p => {
  for (let i = 0; i < 6; i++){
    const n = await p.evaluate(() => document.querySelectorAll('.overlay:not(.ov-out)').length);
    if (!n) break;
    await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop().querySelector('.modal-h button.x').click());
    await p.waitForTimeout(250);
  }
};
const rouvrir = async p => {
  await p.evaluate(() => { location.hash = '#/reseau'; });
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-reseau:not([hidden])');
};
const attendreQue = async (p, fn, arg, ms = 20000, quoi = '') => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(300))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  fail('attendu, jamais vu : ' + quoi);
  return false;
};
const profilDe = p => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./ui/state.js')).S.profile)));
const texte = (p, sel) => p.evaluate(s => document.querySelector(s)?.innerText.replace(/\s+/g, ' ').trim() ?? null, sel);
/* les lettres arrivées dans la boîte de quelqu'un, ouvertes avec SA clé */
const lettresPour = async boite => {
  const tag = await etiquetteBoite(boite.pub);
  const out = [];
  for (const ev of evs) if ((ev.tags || []).some(t => t[0] === 'x' && t[1] === tag)){ const l = await ouvrir(boite.priv, ev.content); if (l) out.push(l); }
  return out;
};
const messagesDu = async code => {
  const k = await cleGroupe(code);
  const out = [];
  for (const ev of evs) if ((ev.tags || []).some(t => t[0] === 'x' && t[1] === k.etiquette)){ const m = await ouvrirMessage(k, ev.content); if (m) out.push(m); }
  return out;
};
const ouvrirLeGroupe = async p => {
  await fermerTout(p);
  await p.click('.bx-l[data-groupe]');
  await p.waitForSelector('#grMot');
};
/* ce que porte VRAIMENT une porte : son contenu décodé — la chaîne est
   en base64url, un `includes` sur elle ne verrait jamais le code */
const dansLaPorte = t => { const m = String(t).match(/OCP1\.([A-Za-z0-9_-]+)/);
  return m ? Buffer.from(m[1], 'base64url').toString('utf8') : ''; };
const copierPorte = async p => {
  await p.waitForSelector('#grInviter .qr-wrap svg');
  await p.click('#grCopier');
  await attendreQue(p, () => window.__copie.includes('OCP1.'), null, 5000, 'la porte copiée');
  return p.evaluate(() => window.__copie);
};

/* « Groupes » (ou « Nouveau groupe ») → « Créer un groupe » / « Rejoindre un groupe » */
const nouveau = async (p, quoi) => {
  await p.click('#ecGrNeuf');
  await p.waitForSelector('#' + quoi);
  await p.click('#' + quoi);
};

/* ---------- ② Inès crée « BTS SIO Lille », sur demande ---------- */
const I = await ecran('ines');
await nouveau(I.p, 'grCreer');
await I.p.waitForSelector('#grNom');
if (await texte(I.p, '#grSorteDit') !== 'Qui a le QR entre.') fail('« Ouvert » par défaut, dit : ' + await texte(I.p, '#grSorteDit'));
await I.p.fill('#grNom', 'BTS SIO Lille');
await I.p.click('[data-sorte="demande"]');
if (await texte(I.p, '#grSorteDit') !== 'Tu acceptes chaque entrée.') fail('« Sur demande » dit : ' + await texte(I.p, '#grSorteDit'));
if (await I.p.getAttribute('[data-sorte="demande"]', 'aria-pressed') !== 'true') fail('le segment « Sur demande » ne se dit pas choisi');
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/125-groupe-creer-sur-demande-pouce.png` });
await I.p.click('#grCreerGo');
await I.p.waitForSelector('#grMot');
const porteI = await copierPorte(I.p);
const pI = await profilDe(I.p);
const G = pI.groupes[0];
{
  if (G.type !== 'demande' || G.chef !== G.sign.pub) fail('le groupe d’Inès : sur demande, et elle en est le chef — ' + JSON.stringify({ type: G.type }));
  if (await I.p.$('#grCodeAff')) fail('la porte affiche un code');
  /* ① la porte ne porte pas le code */
  const brut = dansLaPorte(porteI);
  if (!brut.includes('BTS SIO Lille')) fail('la porte ne se décode pas : ' + brut.slice(0, 80));
  if (brut.includes(G.code) || porteI.includes(G.code)) fail('la porte copiée contient le code du groupe');
  if (/Inès|Martin/.test(brut + porteI)) fail('la porte porte un nom de personne');
  const lu = lirePorte(porteI);
  if (!lu || lu.nom !== 'BTS SIO Lille' || lu.responsables.join() !== pI.boite.pub) fail('la porte lue : ' + JSON.stringify(lu));
}
await I.p.waitForTimeout(400);
await I.p.screenshot({ path: `${SHOTS}/126-groupe-porte-pouce.png` });
console.log('② créer « Sur demande » : le choix se lit sous les segments ; l’invitation est une porte, sans code ✓');

/* ---------- ③ Karim demande à entrer, en collant la porte ---------- */
const K = await ecran('karim');
await nouveau(K.p, 'grRejoindre');
await K.p.waitForSelector('#grCode');
await K.p.fill('#grCode', porteI);
if (await texte(K.p, '#grQui') !== 'Le groupe verra ton prénom : Karim.') fail('avant le geste : ' + await texte(K.p, '#grQui'));
if (await texte(K.p, '#grRejoindreGo') !== 'Demander à entrer') fail('le geste d’une porte : ' + await texte(K.p, '#grRejoindreGo'));
await K.p.click('#grRejoindreGo');
await K.p.waitForSelector('.bx-attente');
{
  /* le nom et l'état — le blason n'est qu'un dessin */
  const t = await texte(K.p, '.bx-attente .bx-m');
  if (t !== 'BTS SIO Lille en attente') fail('la rangée en attente : ' + t);
  if (await K.p.$('.bx-l[data-groupe]')) fail('Karim est dans le groupe avant d’être accepté');
  if ((await profilDe(K.p)).groupes?.length) fail('le profil de Karim porte un groupe avant d’être accepté');
}
await K.p.waitForTimeout(300);
await K.p.screenshot({ path: `${SHOTS}/127-groupe-en-attente-pouce.png` });
const pK = await profilDe(K.p);
{
  /* ① ce qui part : le prénom et la clé, rien d'autre */
  const l = (await lettresPour(pI.boite)).find(x => x.t === 'entree');
  if (!l) fail('aucune demande d’entrée dans la boîte d’Inès');
  else {
    const s = JSON.stringify(l);
    if (l.de.prenom !== 'Karim' || l.de.cle !== pK.boite.pub || l.porte !== G.porte) fail('la demande d’entrée : ' + s);
    const fuite = PRIVE.filter(x => s.includes(x));
    if (fuite.length) fail('la demande d’entrée porte : ' + fuite.join(', '));
    if (s.includes(G.code)) fail('la demande d’entrée porte le code');
  }
}
console.log('③ Karim colle la porte : « Le groupe verra ton prénom : Karim. », puis « en attente » ; la lettre ne porte que son prénom et sa clé ✓');

/* ---------- ④ Inès accepte ; Karim entre seul ---------- */
await rouvrir(I.p);
await attendreQue(I.p, () => !!document.querySelector('.bx-l[data-groupe] .bx-pt'), null, 20000,
  'le point de « Karim veut entrer » dans la boîte');
await ouvrirLeGroupe(I.p);
await I.p.waitForSelector('#grPorte');
{
  const t = await texte(I.p, '#grPorte');
  if (t !== 'Karim veut entrer Refuser Accepter') fail('en tête du groupe : ' + t);
  const ordre = await I.p.evaluate(() => { const b = document.querySelector('.modal-b'); const kids = [...b.children].map(x => x.id || x.className); return kids; });
  /* en tête : avant l'invitation, avant le fil — seule la ligne des
     membres passe devant */
  if (ordre.filter(x => x !== 'grMembres')[0] !== 'grPorte') fail('« Karim veut entrer » n’est pas en tête : ' + ordre.join(', '));
}
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/128-groupe-veut-entrer-pouce.png` });
await I.p.click('[data-accepter]');
await attendreQue(I.p, () => !document.querySelector('#grPorte'), null, 8000, '« Karim veut entrer » parti une fois accepté');
{
  const l = (await lettresPour(pK.boite)).find(x => x.t === 'admis');
  if (!l) fail('aucun « admis » dans la boîte de Karim');
  else if (l.code !== G.code || l.chef !== G.chef || l.nom !== 'BTS SIO Lille' || l.de.prenom !== 'Inès') fail('l’admis : ' + JSON.stringify({ ...l, code: '…' }));
  const fuite = PRIVE.filter(x => JSON.stringify(l || {}).includes(x));
  if (fuite.length) fail('l’admis porte : ' + fuite.join(', '));
}
await rouvrir(K.p);
await attendreQue(K.p, () => !!document.querySelector('.bx-l[data-groupe]') && !document.querySelector('.bx-attente'), null, 20000,
  'Karim dans le groupe, plus « en attente »');
{
  const g = (await profilDe(K.p)).groupes[0];
  if (!g || g.code !== G.code || g.type !== 'demande' || g.chef !== G.chef || !g.sign || g.sign.pub === G.chef)
    fail('le groupe de Karim : ' + JSON.stringify(g && { type: g.type, chef: g.chef === G.chef, sign: !!g.sign }));
}
await ouvrirLeGroupe(K.p);
await attendreQue(K.p, () => /Inès/.test(document.querySelector('#grMembres')?.textContent || ''), null, 20000, 'Inès dans les membres de Karim');
console.log('④ Inès voit « 1 » puis « Karim veut entrer » en tête, accepte ; Karim entre seul à sa prochaine ouverture ✓');

/* ---------- ⑤ Inès nomme Karim adjoint ; « Annuler » le retient ---------- */
await rouvrir(I.p);
await ouvrirLeGroupe(I.p);
await attendreQue(I.p, () => /Karim/.test(document.querySelector('#grMembres')?.textContent || ''), null, 20000, 'Karim dans les membres d’Inès');
if (await I.p.$('#grPorte')) fail('« Karim veut entrer » reste alors qu’il est dans le groupe');
await I.p.click('#grMembres');
/* la ligne d'un autre membre s'ouvre sur ses gestes (§6 : un geste
   lourd sur une ligne vit dans sa feuille) */
await I.p.waitForSelector(`[data-membre="${ID.karim}"]`);
{
  const noms = await I.p.evaluate(() => [...document.querySelectorAll('.gr-noms li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
  if (noms.join(' | ') !== 'Karim | Toi chef') fail('les membres chez Inès : ' + noms.join(' | '));
}
const nommerKarim = async () => {
  await I.p.click(`[data-membre="${ID.karim}"]`);
  await I.p.waitForSelector('[data-nommer]');
  await I.p.click('[data-nommer]');
  await I.p.waitForSelector('.undo-bar');
};
await nommerKarim();
if (!/Karim adjoint/.test(await texte(I.p, '.gr-noms'))) fail('Karim n’est pas dit adjoint après le geste : ' + await texte(I.p, '.gr-noms'));
await I.p.click('.undo-bar .btn-sm');
await attendreQue(I.p, () => !/adjoint/.test(document.querySelector('.gr-noms')?.innerText || 'adjoint'), null, 5000, 'Karim de nouveau simple membre après « Annuler »');
await nommerKarim();
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/129-groupe-membres-chef-pouce.png` });
await I.p.waitForTimeout(33000);
{
  const noms = (await messagesDu(G.code)).filter(m => m.t === 'adjoint');
  if (noms.length !== 1 || noms[0].membre !== ID.karim || noms[0].de !== ID.ines) fail('la nomination au relais (une, après la barre) : ' + noms.length);
  /* ① ce qui se dit au groupe : des prénoms et des clés, jamais un nom de famille ni un e-mail */
  const tout = JSON.stringify(await messagesDu(G.code));
  const fuite = PRIVE.filter(x => tout.includes(x));
  if (fuite.length) fail('le groupe porte : ' + fuite.join(', '));
}
console.log('⑤ « Nommer adjoint » : « Annuler » le retient, sinon une nomination part après la barre ✓');

/* ---------- l'adjoint ouvre la porte à son tour : Sofia entre par Karim ---------- */
await rouvrir(K.p);
await ouvrirLeGroupe(K.p);
await K.p.click('#grMembres');
await attendreQue(K.p, () => /Toi adjoint/.test(document.querySelector('.gr-noms')?.innerText.replace(/\s+/g, ' ') || ''), null, 20000,
  'Karim se lit adjoint chez lui');
const porteK = await copierPorte(K.p);
{
  const lu = lirePorte(porteK);
  if (!lu || !lu.responsables.includes(pI.boite.pub) || !lu.responsables.includes(pK.boite.pub)) fail('la porte de Karim : Inès ET Karim y ouvrent');
  if (dansLaPorte(porteK).includes(G.code) || porteK.includes(G.code)) fail('la porte de Karim contient le code');
}
const So = await ecran('sofia');
await ouvrirRecevoir(So.p, 'texte');
await So.p.fill('#rcTxt', porteK);
await So.p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f .btn')].find(b => b.textContent.trim() === 'Lire').click());
await So.p.waitForSelector('#grQui');
if (await texte(So.p, '#grQui') !== 'Le groupe verra ton prénom : Sofia.') fail('l’aperçu de la porte : ' + await texte(So.p, '#grQui'));
if (await texte(So.p, '#grRejoindreGo') !== 'Demander à entrer') fail('le geste de l’aperçu : ' + await texte(So.p, '#grRejoindreGo'));
await So.p.click('#grRejoindreGo');
await So.p.waitForSelector('.bx-attente');
await rouvrir(K.p);
await attendreQue(K.p, () => !!document.querySelector('.bx-l[data-groupe] .bx-pt'), null, 20000,
  'le point de « Sofia veut entrer » chez Karim');
await ouvrirLeGroupe(K.p);
await K.p.waitForSelector('#grPorte');
if (await texte(K.p, '#grPorte') !== 'Sofia veut entrer Refuser Accepter') fail('chez Karim, en tête : ' + await texte(K.p, '#grPorte'));
await K.p.click('[data-accepter]');
await rouvrir(So.p);
await attendreQue(So.p, () => !!document.querySelector('.bx-l[data-groupe]') && !document.querySelector('.bx-attente'), null, 20000,
  'Sofia dans le groupe');
{
  const g = (await profilDe(So.p)).groupes[0];
  if (!g || g.code !== G.code || g.chef !== G.chef) fail('Sofia entrée par Karim : le même groupe, le même chef');
}
/* chez Inès, la demande de Sofia (elle l'a reçue aussi) part d'elle-même
   quand Sofia est là */
await rouvrir(I.p);
await ouvrirLeGroupe(I.p);
await attendreQue(I.p, () => /Sofia/.test(document.querySelector('#grMembres')?.textContent || '') && !document.querySelector('#grPorte'), null, 25000,
  'Sofia dans les membres d’Inès, et plus à la porte');
console.log('⑤ bis : adjoint, Karim montre une porte où Inès ET lui ouvrent ; Sofia demande par Recevoir › Texte, Karim l’accepte ✓');

/* ---------- ① un refus n'envoie rien ---------- */
const T = await ecran('tom');
await nouveau(T.p, 'grRejoindre');
await T.p.fill('#grCode', porteI);
await T.p.click('#grRejoindreGo');
await T.p.waitForSelector('.bx-attente');
const pT = await profilDe(T.p);
await rouvrir(I.p);
await ouvrirLeGroupe(I.p);
await attendreQue(I.p, () => /Tom veut entrer/.test(document.querySelector('#grPorte')?.innerText.replace(/\s+/g, ' ') || ''), null, 20000, '« Tom veut entrer » chez Inès');
await I.p.click('[data-refuser]');
await attendreQue(I.p, () => !document.querySelector('#grPorte'), null, 5000, '« Tom veut entrer » parti une fois refusé');
await I.p.waitForTimeout(1500);
if ((await lettresPour(pT.boite)).length) fail('un refus a écrit à Tom');
await rouvrir(T.p);
await T.p.waitForTimeout(3000);
if (await T.p.$('.bx-l[data-groupe]') || !await T.p.$('.bx-attente')) fail('Tom, refusé : toujours en attente, jamais dedans');
console.log('① un refus n’envoie rien : Tom reste « en attente », rien dans sa boîte ✓');

/* ---------- ⑥ pouce, poste, sombre, 320 px texte doublé ---------- */
const surDemande = { groupes: [G], boite: pI.boite };
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['pouce-sombre', { sombre: true }],
                        ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const P = await ecran('ines', { ...o, profil: surDemande });
  if (o.gros) await P.p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await nouveau(P.p, 'grCreer');
  await P.p.waitForSelector('#grNom');
  await P.p.click('[data-sorte="demande"]');
  await P.p.waitForTimeout(350);
  const deborde = () => P.p.evaluate(() => {
    const b = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop();
    const box = b.getBoundingClientRect();
    return [...b.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > box.right + 1).map(x => x.className || x.tagName);
  });
  let d = await deborde();
  if (d.length) fail(`${nom} : « Créer » déborde (${d.slice(0, 3).join(', ')})`);
  await P.p.screenshot({ path: `${SHOTS}/130-groupe-creer-${nom}.png` });
  await fermerTout(P.p);
  await ouvrirLeGroupe(P.p);
  await attendreQue(P.p, () => !!document.querySelector('#grMembres'), null, 20000, nom + ' : les membres');
  await P.p.click('#grMembres');
  await P.p.waitForSelector('.gr-noms');
  await attendreQue(P.p, () => /adjoint/.test(document.querySelector('.gr-noms')?.innerText || ''), null, 20000, nom + ' : Karim adjoint');
  await P.p.waitForTimeout(400);
  d = await deborde();
  if (d.length) fail(`${nom} : « Membres » déborde (${d.slice(0, 3).join(', ')})`);
  await P.p.screenshot({ path: `${SHOTS}/131-groupe-membres-${nom}.png` });
  await P.ctx.close();
  console.log(`⑥ ${nom} : « Créer » et « Membres » tiennent ✓`);
}

for (const x of [I, K, So, T]) await x.ctx.close();
if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close?.();
console.log(process.exitCode ? 'E2E groupe sur demande : ÉCHEC' : 'E2E groupe sur demande : OK');
process.exit(process.exitCode || 0);

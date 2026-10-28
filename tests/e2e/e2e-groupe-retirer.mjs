/* ============================================================
   Retirer, dans un groupe « sur demande » — « un chef et ses adjoints
   retirent un message ou un membre » (docs/reseau.md, lot 5c2,
   décision 24)

   « BTS SIO Lille » est sur demande : Inès en est le chef, Karim et
   Sofia y sont. Sofia écrit un mot de trop ; Inès le retire, puis
   retire Sofia du groupe.

   Joué à TROIS (§8, règle 4), sur un relais local qui garde tout :

   ① LA FUITE D'ABORD : un message retiré ne laisse que « Retiré par
     Inès » — ni chez Karim, ni dans ce que porte le retrait ; le
     NOUVEAU code ne passe jamais par l'ancien groupe (que Sofia lit
     encore) : il va à la boîte de Karim, et à elle seule ;
   ② retirer un message : au geste, chez un responsable seulement ;
     « Annuler » le rend ; sinon il part après la barre, signé, et
     chez Karim il devient « Retiré par Inès » ;
   ③ retirer un membre : sa ligne s'ouvre sur « Retirer du groupe »
     (rouge, en dernier) ; « Annuler » ; puis le groupe change de code —
     Inès et Karim continuent sur le nouveau, Sofia lit « Tu n'es plus
     dans BTS SIO Lille. » et le groupe quitte son téléphone ;
   ④ pouce, poste, sombre, 320 px texte doublé ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, nouveauCode, nouvelleCleSignature } from '../../engine/groupe.js';
import { ouvrir, etiquetteBoite, nouvelleCle } from '../../engine/boite.js';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { evs.push(ev); return null; } });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ANCIEN = nouveauCode();
const K = { ines: await nouvelleCle(), karim: await nouvelleCle(), sofia: await nouvelleCle() };
const SIGN = { ines: await nouvelleCleSignature(), karim: await nouvelleCleSignature(), sofia: await nouvelleCleSignature() };
const ID = { ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', sofia: 'SofiaSofiaSofia000001' };
const NOM = { ines: 'Inès Martin', karim: 'Karim Benali', sofia: 'Sofia Haddad' };
const groupeDe = qui => ({ code: ANCIEN, nom: 'BTS SIO Lille', at: 1, type: 'demande', porte: 'porteBTSLille01', chef: SIGN.ines.pub, sign: SIGN[qui] });
const profil = (qui, o = {}) => ({ name: NOM[qui], email: qui + '@prive.test', formation: 'BTS SIO', amiId: ID[qui], boite: K[qui],
  groupes: [groupeDe(qui)], ...o });

async function ecran(qui, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true,
    colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(qui + ' : ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(qui + ' : ' + m.text()); });
  /* un toast dure 3,4 s : on garde CHACUN, plutôt que d'espérer le lire
     à temps (§5, un état fugace) */
  await p.addInitScript(() => {
    window.__toasts = [];
    new MutationObserver(() => { const t = document.getElementById('toast')?.textContent.trim();
      if (t && window.__toasts.at(-1) !== t) window.__toasts.push(t); })
      .observe(document, { subtree: true, childList: true, characterData: true });
  });
  await p.goto(base + '/#/reseau', { waitUntil: 'load' });
  await p.evaluate(async ([pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify([]));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [profil(qui, o.profil), relay.url]);
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
const texte = (p, sel) => p.evaluate(s => document.querySelector(s)?.innerText.replace(/\s+/g, ' ').trim() ?? null, sel);
const profilDe = p => p.evaluate(async () => JSON.parse(JSON.stringify((await import('./ui/state.js')).S.profile)));
const ouvrirLeGroupe = async p => {
  await fermerTout(p);
  await p.click('.bx-l[data-groupe]');
  await p.waitForSelector('#grMot');
};
const messagesDu = async code => {
  const k = await cleGroupe(code);
  const out = [];
  for (const ev of evs) if ((ev.tags || []).some(t => t[0] === 'x' && t[1] === k.etiquette)){ const m = await ouvrirMessage(k, ev.content); if (m) out.push(m); }
  return out;
};
const lettresPour = async boite => {
  const tag = await etiquetteBoite(boite.pub);
  const out = [];
  for (const ev of evs) if ((ev.tags || []).some(t => t[0] === 'x' && t[1] === tag)){ const l = await ouvrir(boite.priv, ev.content); if (l) out.push(l); }
  return out;
};
/* le glissé au doigt, comme e2e-amis-onglet : le motif de la suppression */
const glisser = (p, sel) => p.evaluate(s => {
  const node = document.querySelector(s);
  const b = node.getBoundingClientRect();
  const y = b.top + b.height / 2, x = b.left + b.width - 24;
  const jeter = (type, cx) => {
    const t = new Touch({ identifier: 5, target: node, clientX: cx, clientY: y });
    node.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
  };
  jeter('touchstart', x); jeter('touchmove', x - 40); jeter('touchmove', x - 100); jeter('touchend', x - 100);
}, sel);

/* chacun ouvre l'app : sa présence, signée, part sur le groupe */
const I = await ecran('ines');
const Ka = await ecran('karim');
const So = await ecran('sofia');
for (const x of [I, Ka, So]){ await rouvrir(x.p); await ouvrirLeGroupe(x.p); }
await attendreQue(I.p, () => /Karim/.test(document.querySelector('#grMembres')?.textContent || '') && /Sofia/.test(document.querySelector('#grMembres')?.textContent || ''),
  null, 20000, 'Karim et Sofia dans le groupe d’Inès');

/* ---------- ② Sofia écrit un mot de trop ; Inès le retire ---------- */
await So.p.fill('#grMot', 'un mot de trop');
await So.p.click('#grEnvoyer');
await attendreQue(So.p, () => /un mot de trop/.test(document.querySelector('#grFil')?.textContent || ''), null, 8000, 'le mot chez Sofia');
const motId = (await messagesDu(ANCIEN)).find(m => m.t === 'mot')?.id;
await attendreQue(I.p, id => !!document.querySelector(`#grFil [data-retirable="${id}"]`), motId, 20000, 'le mot de Sofia, retirable chez Inès');
await attendreQue(Ka.p, () => /un mot de trop/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, 'le mot chez Karim');
if (await Ka.p.$('#grFil [data-retirable]')) fail('Karim, simple membre, peut retirer un message');
{
  const sous = await I.p.evaluate(id => document.querySelector(`[data-retirable="${id}"] .sw-under`)?.textContent.trim(), motId);
  if (sous !== 'Retirer') fail('le glissé ne dit pas son mot : ' + sous);
}
await glisser(I.p, `[data-retirable="${motId}"]`);
await I.p.waitForSelector('.undo-bar');
if (!/Retiré par toi/.test(await texte(I.p, '#grFil'))) fail('chez Inès, le mot retiré ne dit pas « Retiré par toi » : ' + await texte(I.p, '#grFil'));
if (/un mot de trop/.test(await texte(I.p, '#grFil'))) fail('le mot retiré reste lisible chez Inès');
await I.p.click('.undo-bar .btn-sm');
await attendreQue(I.p, () => /un mot de trop/.test(document.querySelector('#grFil')?.textContent || ''), null, 5000, '« Annuler » rend le mot');
await I.p.waitForTimeout(400);
await glisser(I.p, `[data-retirable="${motId}"]`);
await I.p.waitForSelector('.undo-bar');
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/132-groupe-message-retire-pouce.png` });
await I.p.waitForTimeout(33000);
{
  const r = (await messagesDu(ANCIEN)).filter(m => m.t === 'retrait');
  if (r.length !== 1 || r[0].id !== motId || r[0].de !== ID.ines) fail('le retrait au relais (un, après la barre) : ' + r.length);
  if (JSON.stringify(r).includes('un mot de trop')) fail('le retrait porte le texte du message');
}
await rouvrir(Ka.p);
await ouvrirLeGroupe(Ka.p);
await attendreQue(Ka.p, () => /Retiré par Inès/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, '« Retiré par Inès » chez Karim');
if (/un mot de trop/.test(await texte(Ka.p, '#grFil'))) fail('le mot retiré reste lisible chez Karim');
await Ka.p.waitForTimeout(300);
await Ka.p.screenshot({ path: `${SHOTS}/133-groupe-retire-chez-karim-pouce.png` });
console.log('② retirer un message : au geste chez un responsable, « Annuler » le rend, sinon « Retiré par Inès » chez Karim, sans un mot de ce qu’il disait ✓');

/* ---------- ③ Inès retire Sofia : le groupe change de code ---------- */
await rouvrir(I.p);
await ouvrirLeGroupe(I.p);
await I.p.click('#grMembres');
await I.p.waitForSelector(`[data-membre="${ID.sofia}"]`);
await I.p.click(`[data-membre="${ID.sofia}"]`);
await I.p.waitForSelector('#grRetirerMembre');
{
  const ordre = await I.p.evaluate(() => [...[...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop().querySelectorAll('button')].map(b => b.textContent.trim()));
  if (ordre.at(-1) !== 'Retirer du groupe') fail('« Retirer du groupe » n’est pas en dernier : ' + ordre.join(' | '));
}
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/134-groupe-membre-pouce.png` });
await I.p.click('#grRetirerMembre');
await I.p.waitForSelector('.undo-bar');
if (/Sofia/.test(await texte(I.p, '.gr-noms'))) fail('Sofia reste dans les membres pendant la barre');
await I.p.click('.undo-bar .btn-sm');
await attendreQue(I.p, () => /Sofia/.test(document.querySelector('.gr-noms')?.textContent || ''), null, 5000, '« Annuler » rend Sofia');
await I.p.waitForTimeout(400);
await I.p.click(`[data-membre="${ID.sofia}"]`);
await I.p.waitForSelector('#grRetirerMembre');
await I.p.click('#grRetirerMembre');
await I.p.waitForSelector('.undo-bar');
await I.p.waitForTimeout(34000);
const NOUVEAU = (await profilDe(I.p)).groupes[0]?.code;
{
  if (!NOUVEAU || NOUVEAU === ANCIEN) fail('le groupe d’Inès n’a pas changé de code');
  /* ① le nouveau code ne passe JAMAIS par l'ancien groupe */
  const anciens = await messagesDu(ANCIEN);
  if (JSON.stringify(anciens).includes(NOUVEAU)) fail('le nouveau code est passé par l’ancien groupe');
  const ex = anciens.filter(m => m.t === 'exclu');
  if (ex.length !== 1 || ex[0].membre !== ID.sofia) fail('l’exclusion au relais (une, signée) : ' + ex.length);
  /* il va à la boîte de Karim, et à elle seule */
  const pourKarim = (await lettresPour(K.karim)).filter(l => l.t === 'recode');
  if (pourKarim.length !== 1 || pourKarim[0].code !== NOUVEAU || pourKarim[0].ancien !== ANCIEN) fail('la lettre du nouveau code chez Karim : ' + pourKarim.length);
  if ((await lettresPour(K.sofia)).some(l => l.t === 'recode' || JSON.stringify(l).includes(NOUVEAU))) fail('Sofia a reçu le nouveau code');
}
await rouvrir(Ka.p);
await attendreQue(Ka.p, c => import('./ui/state.js').then(({ S }) => (S.profile.groupes || [])[0]?.code === c), NOUVEAU, 20000, 'Karim sur le nouveau code');
await ouvrirLeGroupe(Ka.p);
await attendreQue(Ka.p, () => { const t = document.querySelector('#grMembres')?.textContent || ''; return /Inès/.test(t) && !/Sofia/.test(t); }, null, 20000,
  'chez Karim, Inès sans Sofia');
await Ka.p.fill('#grMot', 'on continue');
await Ka.p.click('#grEnvoyer');
await attendreQue(Ka.p, () => /on continue/.test(document.querySelector('#grFil')?.textContent || ''), null, 8000, 'le mot de Karim');
if (!(await messagesDu(NOUVEAU)).some(m => m.t === 'mot' && m.texte === 'on continue')) fail('le mot de Karim n’est pas parti sur le nouveau code');
await rouvrir(I.p);
await ouvrirLeGroupe(I.p);
await attendreQue(I.p, () => /on continue/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, '« on continue » chez Inès');
/* Sofia : le groupe quitte son téléphone, et elle le lit — en direct si
   elle a la feuille du groupe ouverte, sinon à sa prochaine ouverture */
await attendreQue(So.p, () => window.__toasts.some(t => /Tu n’es plus dans BTS SIO Lille\./.test(t)), null, 20000,
  '« Tu n’es plus dans BTS SIO Lille. » chez Sofia');
await rouvrir(So.p);
await attendreQue(So.p, () => !document.querySelector('.bx-l[data-groupe]'), null, 20000, 'le groupe parti de chez Sofia');
{
  const pS = await profilDe(So.p);
  if ((pS.groupes || []).length) fail('Sofia garde un groupe dans son profil');
  if (JSON.stringify(pS).includes(NOUVEAU)) fail('le nouveau code est chez Sofia');
}
console.log('③ retirer un membre : « Annuler » le rend ; sinon le groupe change de code — Karim le reçoit par sa boîte, Sofia jamais, et elle lit qu’elle n’y est plus ✓');

/* ---------- ④ pouce, poste, sombre, 320 px texte doublé ---------- */
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['pouce-sombre', { sombre: true }],
                        ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const P = await ecran('ines', o);
  if (o.gros) await P.p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirLeGroupe(P.p);
  await attendreQue(P.p, () => /Retiré par/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, nom + ' : le message retiré');
  await P.p.click('#grMembres');
  await P.p.waitForSelector(`[data-membre="${ID.karim}"]`);
  await P.p.click(`[data-membre="${ID.karim}"]`);
  await P.p.waitForSelector('#grRetirerMembre');
  await P.p.waitForTimeout(400);
  const d = await P.p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].flatMap(b => {
    const box = b.getBoundingClientRect();
    return [...b.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > box.right + 1).map(x => x.className || x.tagName);
  }));
  if (d.length) fail(`${nom} : une feuille déborde (${d.slice(0, 3).join(', ')})`);
  await P.p.screenshot({ path: `${SHOTS}/135-groupe-retirer-${nom}.png` });
  await P.ctx.close();
  console.log(`④ ${nom} : le fil, « Membres » et la feuille d’un membre tiennent ✓`);
}

for (const x of [I, Ka, So]) await x.ctx.close();
if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close?.();
console.log(process.exitCode ? 'E2E retirer : ÉCHEC' : 'E2E retirer : OK');
process.exit(process.exitCode || 0);

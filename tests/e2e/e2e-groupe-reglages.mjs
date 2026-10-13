/* ============================================================
   Les réglages d'un groupe — « supprimer le groupe ; gérer les groupes
   de la meilleure façon, avec plus de paramètres » (le mainteneur,
   13 octobre 2026 ; docs/reseau.md, décisions 31 à 35)

   « BTS SIO Lille » est OUVERT, et depuis la 6.66 il a un chef : Inès,
   qui l'a créé. Karim et Sofia y sont. Joué à TROIS (§8, règle 4), sur
   un relais local qui garde tout :

   ① LA FUITE D'ABORD : ce que voit le relais d'un réglage ou de la fin
     n'est que du bruit sous une étiquette ; la lettre du nouveau code ne
     passe jamais par le groupe ;
   ② seul le chef voit les réglages ; Karim lit les prénoms, l'invitation,
     « Quitter le groupe » — jamais « Supprimer » ;
   ③ renommer : chez Karim, la barre du groupe et sa porte suivent ;
   ④ la durée : « 24 heures » se lit dans le fil de Karim, et le mot qu'il
     écrit ensuite part avec sa durée ;
   ⑤ « qui écrit : les responsables » : chez Karim le champ laisse la
     place à l'état ; un mot qu'il forge quand même n'apparaît pas chez
     Sofia ; un réglage qu'il forge (signé de SA clé) ne change rien ;
   ⑥ une nouvelle invitation : le groupe change de code, Karim et Sofia
     suivent sans un geste, par leur boîte ;
   ⑦ supprimer pour tous : « Annuler » le rend ; sinon, après la barre,
     le groupe quitte les téléphones de Karim et Sofia, qui lisent qui
     l'a supprimé ;
   ⑧ pouce, poste, sombre, 320 px texte doublé ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, nouveauCode, nouvelleCleSignature, reglages as reglagesMsg } from '../../engine/groupe.js';
import { ouvrir, etiquetteBoite, nouvelleCle } from '../../engine/boite.js';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { evs.push(ev); return null; } });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const CODE = nouveauCode();
const K = { ines: await nouvelleCle(), karim: await nouvelleCle(), sofia: await nouvelleCle() };
const CHEF = await nouvelleCleSignature();
const ID = { ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', sofia: 'SofiaSofiaSofia000001' };
const NOM = { ines: 'Inès Martin', karim: 'Karim Benali', sofia: 'Sofia Haddad' };
/* un groupe OUVERT, avec son chef : Inès porte la clé, les autres la
   connaissent (elle est venue avec l'invitation) */
const groupeDe = qui => ({ code: CODE, nom: 'BTS SIO Lille', at: 1, chef: CHEF.pub, ...(qui === 'ines' ? { sign: CHEF } : {}) });
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
  await p.addInitScript(() => {
    window.__toasts = [];
    new MutationObserver(() => { const t = document.getElementById('toast')?.textContent.trim();
      if (t && window.__toasts.at(-1) !== t) window.__toasts.push(t); })
      .observe(document, { subtree: true, childList: true, characterData: true });
  });
  await p.goto(base + '/#/echanger', { waitUntil: 'load' });
  await p.evaluate(async ([pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify([]));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [profil(qui, o.profil), relay.url]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-echanger:not([hidden])');
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
  await fermerTout(p);
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-echanger:not([hidden])');
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
  await p.waitForSelector('#grMembres');
};
const ouvrirReglages = async p => {
  await ouvrirLeGroupe(p);
  await p.click('#grMembres');
  await p.waitForSelector('#grQuitter');
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
const choisir = async (p, rangee, val) => {
  await p.click(rangee);
  await p.waitForSelector(`[data-choix="${val}"]`);
  await p.click(`[data-choix="${val}"]`);
};

/* chacun ouvre l'app : sa présence part sur le groupe, avec sa clé de boîte */
const I = await ecran('ines');
const Ka = await ecran('karim');
const So = await ecran('sofia');
for (const x of [I, Ka, So]){ await rouvrir(x.p); await ouvrirLeGroupe(x.p); }
await attendreQue(I.p, () => /Karim/.test(document.querySelector('#grMembres')?.textContent || '') && /Sofia/.test(document.querySelector('#grMembres')?.textContent || ''),
  null, 20000, 'Karim et Sofia dans le groupe d’Inès');
{
  const pres = (await messagesDu(CODE)).filter(m => m.t === 'membre');
  for (const qui of ['karim', 'sofia'])
    if (!pres.some(m => m.de === ID[qui] && m.cle === K[qui].pub)) fail(`la présence de ${qui} ne porte pas sa clé de boîte (sans elle, pas de nouveau code)`);
}

/* ---------- ② seul le chef règle ---------- */
await ouvrirReglages(I.p);
{
  const rangs = await I.p.evaluate(() => [...document.querySelectorAll('.gr-regl .rg-row .rg-n')].map(x => x.textContent.trim()));
  if (rangs.join('|') !== 'Nom|Entrée|Messages|Qui écrit') fail('les réglages du chef : ' + rangs.join(' | '));
  if (!await I.p.$('#grSupprimer')) fail('le chef n’a pas « Supprimer le groupe »');
  if (!/^groupe\b/i.test(await texte(I.p, '.overlay:last-of-type .modal-h') || '')) fail('la barre ne dit pas « Groupe » : ' + await texte(I.p, '.overlay:last-of-type .modal-h'));
  if (!/BTS SIO Lille/.test(await texte(I.p, '.overlay:last-of-type .ap-nom') || '')) fail('le nom du groupe n’ouvre pas le contenu');
}
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/140-groupe-reglages-chef-pouce.png` });
await ouvrirReglages(Ka.p);
{
  if (await Ka.p.$('.gr-regl')) fail('Karim, simple membre, voit les réglages');
  if (await Ka.p.$('#grSupprimer')) fail('Karim peut supprimer le groupe');
  if (!await Ka.p.$('#grQuitter')) fail('Karim ne peut pas quitter');
}
await Ka.p.waitForTimeout(300);
await Ka.p.screenshot({ path: `${SHOTS}/140-groupe-reglages-membre-pouce.png` });
console.log('② seul le chef voit Nom · Entrée · Messages · Qui écrit et « Supprimer » ; Karim lit, quitte, c’est tout ✓');

/* ---------- ③ renommer ---------- */
await I.p.click('#grrNom');
await I.p.waitForSelector('#grNouveauNom');
await I.p.fill('#grNouveauNom', 'BTS SIO Lille 2');
await I.p.click('#grNomGo');
await attendreQue(I.p, () => /BTS SIO Lille 2/.test(document.querySelector('#grrNom .rg-s')?.textContent || ''), null, 8000, 'le nouveau nom chez Inès');
{
  const r = (await messagesDu(CODE)).filter(m => m.t === 'reglages');
  if (r.length !== 1 || r[0].nom !== 'BTS SIO Lille 2' || r[0].signe !== CHEF.pub) fail('le réglage au relais (un, signé du chef) : ' + JSON.stringify(r));
  /* ① le relais ne lit rien : ni le nom, ni l'auteur */
  const brut = JSON.stringify(evs);
  for (const x of ['BTS SIO', 'Lille', 'Inès', CODE]) if (brut.includes(x)) fail(`le relais lit « ${x} »`);
}
await rouvrir(Ka.p);
await attendreQue(Ka.p, () => /BTS SIO Lille 2/.test(document.querySelector('.bx-l[data-groupe]')?.textContent || ''), null, 20000, 'le nouveau nom dans « Échanger » chez Karim');
await ouvrirLeGroupe(Ka.p);
if (!/BTS SIO LILLE 2/i.test(await texte(Ka.p, '.overlay:last-of-type .modal-h'))) fail('la barre du groupe chez Karim : ' + await texte(Ka.p, '.overlay:last-of-type .modal-h'));
console.log('③ renommer : un réglage signé, illisible pour le relais ; chez Karim, la porte et la barre suivent ✓');

/* ---------- ④ la durée ---------- */
await ouvrirReglages(I.p);
await choisir(I.p, '#grrDuree', '1');
await attendreQue(I.p, () => /24 heures/.test(document.querySelector('#grrDuree .rg-s')?.textContent || ''), null, 8000, '« 24 heures » chez Inès');
await rouvrir(Ka.p);
await ouvrirLeGroupe(Ka.p);
await attendreQue(Ka.p, () => /24 heures/.test(document.querySelector('.gr-ephem')?.textContent || ''), null, 20000, '« 24 heures » dans le fil de Karim');
await Ka.p.fill('#grMot', 'à demain');
await Ka.p.click('#grEnvoyer');
await attendreQue(Ka.p, () => /à demain/.test(document.querySelector('#grFil')?.textContent || ''), null, 8000, 'le mot de Karim');
{
  const m = (await messagesDu(CODE)).find(x => x.t === 'mot' && x.texte === 'à demain');
  if (!m || m.j !== 1) fail('le mot de Karim ne part pas avec sa durée (24 heures) : ' + JSON.stringify(m));
  const ev = evs.find(e => e.tags.some(t => t[0] === 'expiration') && Math.abs(Number(e.tags.find(t => t[0] === 'expiration')[1]) * 1000 - (m.at + 864e5)) < 5000);
  if (!ev) fail('le relais ne reçoit pas l’échéance de 24 heures');
}
console.log('④ la durée : « 24 heures » chez Karim, et son mot part avec cette échéance ✓');

/* ---------- ⑤ qui écrit : les responsables ---------- */
await ouvrirReglages(I.p);
await choisir(I.p, '#grrEcrire', 'resp');
await attendreQue(I.p, () => /responsables/.test(document.querySelector('#grrEcrire .rg-s')?.textContent || ''), null, 8000, '« les responsables » chez Inès');
await rouvrir(Ka.p);
await ouvrirLeGroupe(Ka.p);
await attendreQue(Ka.p, () => !!document.querySelector('#grSeuls') && !document.querySelector('#grMot'), null, 20000, 'chez Karim, l’état à la place du champ');
if (await texte(Ka.p, '#grSeuls') !== 'Seuls les responsables écrivent ici.') fail('l’état chez Karim : ' + await texte(Ka.p, '#grSeuls'));
if (!await Ka.p.$('#grDonner')) fail('« Donner » a disparu avec le champ');
await Ka.p.waitForTimeout(300);
await Ka.p.screenshot({ path: `${SHOTS}/141-groupe-seuls-responsables-pouce.png` });
/* Karim forge un mot et un réglage, en passant à côté de l'écran */
await Ka.p.evaluate(async ([code, de]) => {
  const g = await import('./engine/groupe.js'), r = await import('./ui/reseau.js'), bo = await import('./engine/boite.js');
  const k = await g.cleGroupe(code);
  const poste = async m => r.publier(await r.evenement([['x', k.etiquette], ['expiration', String(Math.floor(Date.now() / 1000) + 86400)]], await g.sceller(k, m)));
  await poste({ t: 'mot', id: bo.nouvelId(), de, prenom: 'Karim', texte: 'je parle quand même', at: Date.now() });
  const sign = await g.nouvelleCleSignature();
  await poste(await g.reglages(sign, { de, code, nom: 'Pris par Karim', j: 30, ecrire: 'tous', entree: 'ouvert' }));
}, [CODE, ID.karim]);
await rouvrir(So.p);
await ouvrirLeGroupe(So.p);
await So.p.waitForTimeout(3000);
{
  const fil = await texte(So.p, '#grFil');
  if (/je parle quand même/.test(fil)) fail('le mot forgé de Karim apparaît chez Sofia');
  if (!/à demain/.test(fil)) fail('le mot de Karim écrit AVANT le réglage a disparu chez Sofia');
  if (/Pris par Karim/.test(await texte(So.p, '.overlay:last-of-type .modal-h'))) fail('un réglage signé par Karim a renommé le groupe');
  if (!/24 heures/.test(await texte(So.p, '.gr-ephem'))) fail('un réglage signé par Karim a changé la durée');
}
console.log('⑤ « les responsables » : chez Karim, l’état remplace le champ ; un mot ou un réglage qu’il forge ne change rien chez Sofia ✓');

/* ---------- ⑥ une nouvelle invitation ---------- */
await ouvrirReglages(I.p);
const invAvant = await I.p.evaluate(() => document.querySelector('#grCodeAff')?.textContent);
await I.p.click('#grNouvelleInv');
await I.p.waitForSelector('.overlay:last-of-type .modal-f .btn-primary, .overlay:last-of-type .modal-f .btn-danger');
await I.p.waitForTimeout(300);
await I.p.screenshot({ path: `${SHOTS}/142-groupe-nouvelle-invitation-pouce.png` });
await I.p.click('.overlay:last-of-type .modal-f .btn-primary, .overlay:last-of-type .modal-f .btn-danger');
await attendreQue(I.p, c => import('./ui/state.js').then(({ S }) => (S.profile.groupes || [])[0]?.code !== c), CODE, 15000, 'le nouveau code chez Inès');
const NOUVEAU = (await profilDe(I.p)).groupes[0]?.code;
await attendreQue(I.p, a => !!document.querySelector('#grCodeAff') && document.querySelector('#grCodeAff').textContent !== a, invAvant, 8000, 'la nouvelle invitation affichée');
{
  if (JSON.stringify(await messagesDu(CODE)).includes(NOUVEAU)) fail('le nouveau code est passé par le groupe');
  for (const qui of ['karim', 'sofia']){
    const l = (await lettresPour(K[qui])).filter(x => x.t === 'recode');
    if (l.length !== 1 || l[0].code !== NOUVEAU || l[0].exclu !== '') fail(`la lettre du nouveau code chez ${qui} : ` + JSON.stringify(l));
  }
}
for (const x of [Ka, So]){
  await rouvrir(x.p);
  await attendreQue(x.p, c => import('./ui/state.js').then(({ S }) => (S.profile.groupes || [])[0]?.code === c), NOUVEAU, 20000, 'le nouveau code suivi sans un geste');
}
/* le nom et la durée ont suivi le groupe sous son nouveau code */
await ouvrirLeGroupe(So.p);
if (!/24 heures/.test(await texte(So.p, '.gr-ephem'))) fail('la durée s’est perdue avec le nouveau code');
console.log('⑥ nouvelle invitation : un nouveau code, par la boîte de chacun, jamais par le groupe ; Karim et Sofia suivent ✓');

/* ---------- ⑥ bis l'entrée « sur demande » ----------
   L'invitation d'un groupe ouvert porte le code, et le code EST la clé :
   passer « sur demande » change donc le code, et la porte remplace le QR */
await ouvrirReglages(I.p);
await choisir(I.p, '#grrEntree', 'demande');
await attendreQue(I.p, c => import('./ui/state.js').then(({ S }) => { const g = (S.profile.groupes || [])[0];
  return !!g && g.code !== c && g.type === 'demande' && !!g.porte; }), NOUVEAU, 15000, 'le groupe d’Inès sur demande, sous un nouveau code');
const DEMANDE = (await profilDe(I.p)).groupes[0]?.code;
for (const [x, qui] of [[Ka, 'Karim'], [So, 'Sofia']]){
  /* le nouveau code arrive par la boîte, l'entrée par le groupe : deux
     relèves au plus */
  const ok = async () => x.p.evaluate(c => import('./ui/state.js').then(({ S }) => { const g = (S.profile.groupes || [])[0];
    return !!g && g.code === c && g.type === 'demande' && !!g.porte; }), DEMANDE);
  for (let i = 0; i < 4 && !await ok(); i++){ await rouvrir(x.p); await x.p.waitForTimeout(3000); }
  if (!await ok()) fail(`${qui} ne suit pas le groupe passé sur demande : ` + JSON.stringify((await profilDe(x.p)).groupes));
}
await ouvrirReglages(I.p);
await I.p.waitForTimeout(800);
if (await I.p.$('#grCodeAff')) fail('sur demande, l’invitation montre encore le code');
if (!/sur demande/.test(await texte(I.p, '#grrEntree .rg-s') || '')) fail('l’entrée ne dit pas « sur demande »');
console.log('⑥ bis « sur demande » : un nouveau code, Karim et Sofia suivent, et l’invitation n’est plus qu’une porte ✓');

/* ---------- ⑦ supprimer pour tous ---------- */
await ouvrirReglages(I.p);
{
  const ordre = await I.p.evaluate(() => [...[...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop().querySelectorAll('button')].map(b => b.textContent.trim()));
  if (ordre.at(-1) !== 'Supprimer le groupe') fail('« Supprimer le groupe » n’est pas en dernier : ' + ordre.join(' | '));
}
await I.p.click('#grSupprimer');
await I.p.waitForSelector('.undo-bar');
await I.p.click('.undo-bar .btn-sm');
await attendreQue(I.p, () => !!document.querySelector('.bx-l[data-groupe]'), null, 5000, '« Annuler » rend le groupe');
await ouvrirReglages(I.p);
await I.p.click('#grSupprimer');
await I.p.waitForSelector('.undo-bar');
await I.p.waitForTimeout(34000);
{
  const f = (await messagesDu(DEMANDE)).filter(m => m.t === 'fin');
  if (f.length !== 1 || f[0].signe !== CHEF.pub) fail('la fin au relais (une, signée du chef) : ' + f.length);
  if ((await profilDe(I.p)).groupes.length) fail('le groupe reste chez Inès');
}
for (const [x, qui] of [[Ka, 'Karim'], [So, 'Sofia']]){
  /* qui avait la feuille du groupe ouverte l'a appris EN DIRECT : on ne
     recharge pas, sinon on effacerait la trace de ce qu'il a lu */
  if (!await x.p.evaluate(() => window.__toasts.some(t => /a été supprimé/.test(t)))) await rouvrir(x.p);
  if (!await attendreQue(x.p, () => window.__toasts.some(t => /BTS SIO Lille 2 a été supprimé par Inès\./.test(t)), null, 20000,
    `« BTS SIO Lille 2 a été supprimé par Inès. » chez ${qui}`))
    console.error('   toasts chez ' + qui + ' : ' + JSON.stringify(await x.p.evaluate(() => window.__toasts)));
  await attendreQue(x.p, () => !document.querySelector('.bx-l[data-groupe]'), null, 8000, `le groupe parti de chez ${qui}`);
}
console.log('⑦ supprimer pour tous : « Annuler » le rend ; sinon, après la barre, le groupe quitte les téléphones de Karim et Sofia ✓');

/* ---------- ⑧ pouce, poste, sombre, 320 px texte doublé ---------- */
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['pouce-sombre', { sombre: true }],
                        ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const P = await ecran('ines', o);
  if (o.gros) await P.p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirReglages(P.p);
  await P.p.waitForTimeout(400);
  const d = await P.p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].flatMap(b => {
    const box = b.getBoundingClientRect();
    return [...b.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > box.right + 1).map(x => x.className || x.tagName);
  }));
  if (d.length) fail(`${nom} : la feuille déborde (${d.slice(0, 3).join(', ')})`);
  await P.p.screenshot({ path: `${SHOTS}/143-groupe-reglages-${nom}.png` });
  await P.p.click('#grrDuree');
  await P.p.waitForSelector('[data-choix="30"]');
  await P.p.waitForTimeout(300);
  await P.p.screenshot({ path: `${SHOTS}/143-groupe-duree-${nom}.png` });
  await P.ctx.close();
  console.log(`⑧ ${nom} : « Groupe » et ses réglages tiennent ✓`);
}

for (const x of [I, Ka, So]) await x.ctx.close();
if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close?.();
console.log(process.exitCode ? 'E2E réglages de groupe : ÉCHEC' : 'E2E réglages de groupe : OK');

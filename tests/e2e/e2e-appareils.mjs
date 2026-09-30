/* ============================================================
   Les appareils reliés : les renommer, et des gestes qui ont un nom.

   Deux VRAIS navigateurs reliés par un relais local : le nom ne se
   prouve qu'en le voyant arriver de l'autre côté. Les deux se nomment
   pareil au départ (« Linux · Chrome ») — c'est exactement ce que le
   mainteneur a photographié : deux « iPhone · Safari » indiscernables.

   ① Seul le PRINCIPAL renomme : chez lui, la ligne d'un appareil
     s'ouvre sur « Renommer » ; chez l'autre, non — et même appelée à
     la main, la commande refuse. Le nom part signé dans l'anneau.
   ② L'appareil renommé ADOPTE son nom : c'est lui qu'il annonce
     ensuite, et c'est lui que son écran affiche.
   ③ Un nom vide se dit sous le champ, et n'envoie rien.
   ④ Plus de poubelle nue dans la liste : chaque appareil est une ligne
     qui s'ouvre (chevron), et « Retirer » y porte son mot, en rouge,
     dans son propre groupe.
   ⑤ Les gestes qui changent des données sont des BOUTONS, jamais des
     liens : Restaurer une copie, Effacer cet appareil, Rompre le lien —
     le destructif séparé des autres par plus que leur écart ordinaire.
   ⑥ Sans principal — donc sans protection —, pas de roi : personne ne
     nomme les autres. Mais chaque appareil se renomme LUI-MÊME, et
     l'autre côté le voit arriver. Dans un anneau, un appareil ordinaire
     ne le peut plus : c'est le principal qui nomme, sinon deux autorités
     se contrediraient d'un écran à l'autre.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, ouvrirReglages } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

const { server, base } = await serveRepo();
const relay = await startLocalRelay({ tls: true });
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okSi = (cond, msg) => { if (cond) console.log(msg + ' ✓'); else fail(msg); };
/* le seul bruit attendu : notre propre fermeture en pleine négociation */
const benin = t => /User-Initiated Abort|reason=Close called|Close called/.test(t);
const mk = async opts => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...opts });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error' && !benin(m.text())) errors.push(m.text()); });
  p.on('pageerror', e => { if (!benin(String(e))) errors.push(String(e)); });
  return p;
};
const semer = (p, n) => p.evaluate(async ([url, n]) => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  await st.kvSet(st.PROFILE_KEY, JSON.stringify({ name: 'Sam Martin' }));
  await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) =>
    ({ id: 'p' + i, name: 'Piste ' + i, city: 'Lille', status: 'todo', updatedAt: 1000 + i }))));
}, [relay.url, n]);
const nomSelf = p => p.evaluate(async () => (await (await import('./ui/synclive.js')).deviceSelf()).name);

const A = await mk({ viewport: { width: 1280, height: 800 } });
const B = await mk({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
for (const [p, n] of [[A, 6], [B, 0]]){
  await p.goto(base, { waitUntil: 'load' });
  await semer(p, n);
  await p.reload({ waitUntil: 'load' });
}
const nomDepart = await nomSelf(A);
okSi(nomDepart === await nomSelf(B), 'au départ, les deux appareils portent le même nom (« ' + nomDepart + ' »)');

/* A devient le principal : c'est ce que fait l'activation de la protection */
okSi(await A.evaluate(async () => (await import('./ui/synclive.js')).ensureRing('aigle ancre avion lune')),
  'A est l’appareil principal');

/* relier les deux */
await A.click('.topnav a[data-r="moi"]');
await ouvrirReglages(A);
await A.click('#moiSync');
await A.waitForSelector('#syNew');
await A.click('#syNew');
await A.waitForSelector('.sy-phrase span');
const phrase = (await A.textContent('.sy-phrase span')).trim();
await B.click('.bottomnav a[data-r="moi"]');
await ouvrirReglages(B);
await B.click('#moiSync');
await B.waitForSelector('#syJoin');
await B.click('#syJoin');
await B.fill('#syPhrase', phrase);
await B.click('.modal-f .btn-primary');
const idB = await B.evaluate(async () => (await (await import('./ui/synclive.js')).deviceSelf()).id);
/* B entre dans l'anneau (chez A), et B l'apprend */
await attendre(B, async () => {
  const r = (await import('./ui/synclive.js')).getRing();
  return !!(r && r.devices.length >= 2);
}, { timeout: 45000, message: 'B apprend l’anneau signé par A' });
okSi(true, 'B est entré dans l’anneau, et l’a appris');

/* ---------- ④ la liste : des lignes qui s'ouvrent, plus de poubelle nue ---------- */
await attendre(A, `!!document.querySelector('[data-dev="${idB}"]')`, { timeout: 20000, message: 'la ligne de B chez A' })
  .catch(async () => {
    /* la feuille se redessine au fil de la sync ; sinon on la rouvre */
    await A.keyboard.press('Escape'); await ouvrirReglages(A); await A.click('#moiSync');
    await A.waitForSelector(`[data-dev="${idB}"]`, { timeout: 20000 });
  });
const liste = await A.evaluate(id => {
  const row = document.querySelector(`[data-dev="${id}"]`);
  return {
    bouton: row.tagName === 'BUTTON' && row.classList.contains('dev-open'),
    chevron: !!row.querySelector('.ic'),
    poubelles: document.querySelectorAll('.sy-devs .abtn, .sy-devs [data-rm]').length,
    soi: !!document.querySelector('[data-soi]')
  };
}, idB);
okSi(liste.bouton && liste.chevron && !liste.poubelles, 'chaque appareil est une ligne qui s’ouvre — aucune poubelle nue');
okSi(liste.soi, 'le principal peut ouvrir sa propre ligne (pour se renommer)');

/* ---------- ① ③ renommer, chez le principal ---------- */
await A.click(`[data-dev="${idB}"]`);
await A.waitForSelector('#dvRename');
const feuille = await A.evaluate(() => {
  const rm = document.querySelector('#dvRemove');
  /* un geste seul est un bouton à sa taille (`.btn-danger`), une rangée
     de liste reste `.pick-danger` : les deux disent « rouge, à part » */
  return { rougeSepare: rm.matches('.pick-danger, .btn-danger') && !!rm.closest('.pick-sortie'),
           mot: rm.textContent.trim() };
});
okSi(feuille.rougeSepare && /Retirer de mes appareils/.test(feuille.mot),
  '« Retirer » porte son mot, en rouge, dans son propre groupe');
await A.click('#dvRename');
await A.waitForSelector('#dvNom');
okSi(await A.inputValue('#dvNom') === nomDepart, 'le champ s’ouvre sur le nom actuel');
await A.fill('#dvNom', '   ');
await A.click('.modal-f .btn-primary');
okSi(await A.evaluate(() => !document.querySelector('#dvNomErr').hidden
  && document.querySelector('#dvNom').getAttribute('aria-invalid') === 'true'),
  'un nom vide se dit sous le champ, et rien ne part');
await A.fill('#dvNom', 'iPhone de Léa');
await A.click('.modal-f .btn-primary');
await attendre(A, `/iPhone de Léa/.test(document.querySelector('[data-dev="${idB}"]')?.textContent || '')`,
  { timeout: 10000, message: 'la liste du principal montre le nouveau nom' });
okSi(true, 'chez le principal, la liste dit « iPhone de Léa »');
const signe = await A.evaluate(async id => {
  const s = await import('./ui/synclive.js');
  const ring = await import('./engine/ring.js');
  const r = s.getRing();
  return { nom: ring.deviceIn(r, id).name, ok: await ring.verifyRing(r, ring.mainOf(r).pub) };
}, idB);
okSi(signe.nom === 'iPhone de Léa' && signe.ok, 'le nom est dans l’anneau, signé par le principal');

/* ---------- ② l'appareil renommé adopte son nom ---------- */
await attendre(B, async () => (await (await import('./ui/synclive.js')).deviceSelf()).name === 'iPhone de Léa',
  { timeout: 30000, message: 'B adopte le nom choisi par le principal' });
okSi(true, 'B adopte son nouveau nom — c’est lui qu’il annonce désormais');

/* ---------- ① chez B, qui n'est pas le principal : pas de « Renommer » ---------- */
const idA = await A.evaluate(async () => (await (await import('./ui/synclive.js')).deviceSelf()).id);
await attendre(B, `!!document.querySelector('[data-dev="${idA}"]')`, { timeout: 20000, message: 'la ligne de A chez B' });
okSi(await B.evaluate(() => /iPhone de Léa/.test(document.querySelector('.sy-devs')?.textContent || '')),
  'l’écran de B affiche son nouveau nom');
await B.click(`[data-dev="${idA}"]`);
await B.waitForSelector('#dvRemove');
okSi(!(await B.$('#dvRename')) && /Retirer de la liste/.test(await B.textContent('#dvRemove')),
  'chez un appareil ordinaire, la feuille ne propose pas « Renommer »');
okSi(await B.evaluate(async id => !(await (await import('./ui/synclive.js')).ringRenommer(id, 'Pirate')), idA),
  'et la commande, appelée à la main, refuse');
await B.keyboard.press('Escape');

/* ---------- ⑥ sans anneau, chaque appareil se renomme lui-même ---------- */
/* la liste doit être À L'ÉCRAN : une feuille fermée n'a pas de ligne
   qui s'ouvre, et ce contrôle serait vert pour rien */
okSi(await B.evaluate(() => !!document.querySelector('.sy-devs') && !document.querySelector('[data-soi]')),
  'dans un anneau, la ligne d’un appareil ordinaire ne s’ouvre pas sur lui-même');
okSi(await B.evaluate(async () => !(await (await import('./ui/synclive.js')).renommerSoi('Pirate'))),
  'et se renommer soi-même, appelé à la main, refuse : c’est le principal qui nomme');
const C = await mk({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const D = await mk({ viewport: { width: 1280, height: 800 } });
for (const [p, n] of [[D, 2], [C, 0]]){
  await p.goto(base, { waitUntil: 'load' });
  await semer(p, n);
  await p.reload({ waitUntil: 'load' });
}
await D.click('.topnav a[data-r="moi"]');
await ouvrirReglages(D);
await D.click('#moiSync');
await D.waitForSelector('#syNew');
await D.click('#syNew');
await D.waitForSelector('.sy-phrase span');
const phrase2 = (await D.textContent('.sy-phrase span')).trim();
await C.click('.bottomnav a[data-r="moi"]');
await ouvrirReglages(C);
await C.click('#moiSync');
await C.waitForSelector('#syJoin');
await C.click('#syJoin');
await C.fill('#syPhrase', phrase2);
await C.click('.modal-f .btn-primary');
const idC = await C.evaluate(async () => (await (await import('./ui/synclive.js')).deviceSelf()).id);
await attendre(D, `!!document.querySelector('[data-dev="${idC}"]')`, { timeout: 45000, message: 'la ligne de C chez D' });
okSi(await C.evaluate(async () => !(await import('./ui/synclive.js')).getRing()), 'C et D sont reliés, sans anneau ni principal');
await attendre(C, `!!document.querySelector('.sy-devs [data-soi]')`,
  { timeout: 20000, message: 'sans principal, la ligne de « cet appareil » s’ouvre (pour se renommer)' });
await C.click('[data-soi]');
await C.waitForSelector('#dvRename');
okSi(!(await C.$('#dvRemove')), 'sans principal, « cet appareil » s’ouvre sur « Renommer », et rien d’autre');
await C.click('#dvRename');
await C.waitForSelector('#dvNom');
await C.fill('#dvNom', 'Téléphone de Sam');
await C.click('.modal-f .btn-primary');
await attendre(C, async () => (await (await import('./ui/synclive.js')).deviceSelf()).name === 'Téléphone de Sam',
  { timeout: 10000, message: 'C garde le nom qu’il s’est donné' });
await attendre(D, `/Téléphone de Sam/.test(document.querySelector('[data-dev="${idC}"]')?.textContent || '')`,
  { timeout: 30000, message: 'D voit arriver le nouveau nom de C' });
okSi(true, 'C s’est renommé lui-même, et D voit « Téléphone de Sam »');
await D.click(`[data-dev="${idC}"]`);
await D.waitForSelector('#dvRemove');
okSi(!(await D.$('#dvRename')), 'sans principal, personne ne renomme les AUTRES : chez D, la ligne de C ne propose que « Retirer »');
await C.context().close();
await D.context().close();

/* ---------- ⑤ les gestes qui changent des données sont des boutons ---------- */
await A.keyboard.press('Escape');
await A.keyboard.press('Escape');
await A.waitForTimeout(300);
const moi = await A.evaluate(() => {
  const r = document.querySelector('#moiRestore'), e = document.querySelector('#moiEfface');
  const br = r.getBoundingClientRect(), be = e.getBoundingClientRect();
  return {
    restaurer: r.classList.contains('pick') && !r.classList.contains('linklike'),
    effacer: e.classList.contains('pick-danger') && !e.classList.contains('linklike') && !!e.closest('.pick-sortie'),
    ecart: be.top - br.bottom
  };
});
okSi(moi.restaurer && moi.effacer, '« Restaurer une copie » et « Effacer cet appareil » sont des boutons, plus des liens');
okSi(moi.ecart >= 8, 'et l’effacement a son propre groupe (' + Math.round(moi.ecart) + ' px d’écart, ≥ 8)');
await B.evaluate(() => { const d = document.querySelector('.sy-relays'); if (d) d.open = true; });
okSi(await B.evaluate(() => {
  const b = document.querySelector('#syBreak');
  return !!b && b.matches('.pick-danger, .btn-danger') && !b.classList.contains('linklike') && !!b.closest('.pick-sortie');
}), '« Rompre le lien » aussi : un bouton rouge, dans son groupe');

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E appareils : ÉCHEC' : 'E2E appareils : OK');
await browser.close();
relay.close?.();
server.close();
process.exit(process.exitCode || 0);

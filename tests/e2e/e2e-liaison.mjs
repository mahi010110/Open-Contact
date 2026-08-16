/* E2E liaison réelle (incident #14) : DEUX vrais navigateurs, un relais
   Nostr local (wss) — la chaîne entière est jouée, pas simulée :
   bibliothèque → WebSocket relais → découverte → WebRTC → échange.
   · sync « Mes appareils » : phrase créée sur bureau, entrée sur mobile,
     les pistes circulent dans les deux sens, l'état affiché est prouvé ;
   · partage en groupe : envoi réel → aperçu avant fusion → fusion ;
   · rendez-vous QR (code tapé) : donner ↔ recevoir ;
   · pannes DITES : aucun relais joignable → l'écran le dit, sur la sync
     ET sur le groupe — plus jamais « en liaison » dans le vide. */
import net from 'net';
import { chromium, chromiumPath, SHOTS, serveRepo, attendre, ouvrirReglages } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

const { server, base } = await serveRepo();
const relay = await startLocalRelay({ tls: true });
/* un port libre SANS relais pour la partie 4 — le relais y naîtra ensuite */
const portMort = await new Promise(res => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});
const browser = await chromium.launch({ executablePath: chromiumPath() });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];
/* Deux bruits de console ATTENDUS, jamais des bugs de l'app :
   1. le relais volontairement mort de la partie 4 (échec de connexion wss) ;
   2. l'abandon WebRTC quand on FERME une page/salle en pleine négociation
      au démontage — Trystero émet « User-Initiated Abort, reason=Close
      called » : c'est notre propre close() qui coupe, pas un échec de
      liaison (un vrai échec passe par onJoinError → état rtcfail, prouvé
      en partie 4). On ne filtre que ce motif exact, rien de plus large. */
const attenduRelais = new RegExp('wss://127\\.0\\.0\\.1:' + portMort + '/');
const attenduDemontage = /User-Initiated Abort|reason=Close called|Close called/;
const benin = t => attenduRelais.test(t) || attenduDemontage.test(t);
const mk = async opts => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...opts });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error' && !benin(m.text())) errors.push(m.text()); });
  p.on('pageerror', e => { if (!benin(String(e))) errors.push(String(e)); });
  return p;
};
const desktop = { viewport: { width: 1280, height: 800 } };
const mobile = { viewport: { width: 390, height: 844 }, hasTouch: true };
/* graines : descriptions incompressibles pour forcer le rendez-vous QR */
const seed = (page, prefix, n) => page.evaluate(async ([url, prefix, n]) => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  if (!n) return;
  const rnd = len => Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
    id: prefix + '-' + i, name: 'Piste ' + prefix + ' ' + i, city: 'Lille',
    status: 'todo', desc: rnd(120), updatedAt: 1000 + i
  }))));
}, [relay.url, prefix, n]);
const compte = page => page.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
const fusionner = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('.modal-f button')].find(x => /Fusionner/.test(x.textContent));
  if (!b) throw new Error('bouton Fusionner introuvable');
  b.click();
});

/* ============ 1. Sync appareils : bureau ↔ mobile ============ */
const A = await mk(desktop);
const B = await mk(mobile);
await A.goto(base, { waitUntil: 'load' });
await B.goto(base, { waitUntil: 'load' });
await seed(A, 'sync', 25);
await seed(B, '', 0);
await A.reload({ waitUntil: 'load' });
await attendre(A, async () => (await import('./ui/state.js')).S.companies.length === 25);

await A.click('.topnav a[data-r="moi"]');
await ouvrirReglages(A);
await A.click('#moiSync');
await A.waitForSelector('#syNew');
await A.click('#syNew');
await A.waitForSelector('.sy-phrase span');
const phrase = (await A.textContent('.sy-phrase span')).trim();
if (!/^[a-z2-9]{5}-[a-z2-9]{5}$/.test(phrase)) fail('phrase inattendue : ' + phrase);

await B.click('.bottomnav a[data-r="moi"]');
await ouvrirReglages(B);
await B.click('#moiSync');
await B.waitForSelector('#syJoin');
await B.click('#syJoin');
await B.fill('#syPhrase', phrase);
await B.click('.modal-f .btn-primary');

/* l'état affiché est PROUVÉ : pair en face + échange reçu = « à jour » */
for (const p of [A, B])
  await attendre(p, async () => {
    const sy = (await import('./ui/synclive.js')).getSync();
    return sy.peers >= 1 && sy.state === 'on' && sy.exchanged && sy.relays.open >= 1;
  }, { timeout: 40000, message: 'liaison sync prouvée' });
const stA = (await A.textContent('#syStatus')).trim();
/* « relié — à jour » : le même mot que la ligne des réglages et que la
   feuille, sans « en continu » qui ne disait rien de plus que « à jour ». */
if (!/appareil relié — à jour/.test(stA)) fail('statut bureau : ' + stA);

/* PANNE VÉCUE : la reprise différée du démarrage (initSyncLive, ~2 s
   après le lancement) tombait sur une salle DÉJÀ rejointe, la quittait
   et la rejoignait aussitôt. Quitter une salle prend un instant : les
   deux appareils restaient alors en morceaux — un pair fantôme d'un
   côté (« en liaison » qui n'échange jamais), plus personne de l'autre,
   et ça ne revenait pas. Rejoindre deux fois la même salle ne doit
   plus rien casser. */
for (const p of [A, B])
  await p.evaluate(async () => (await import('./ui/synclive.js')).initSyncLive());
await A.waitForTimeout(4000);
for (const p of [A, B])
  await attendre(p, async () => {
    const sy = (await import('./ui/synclive.js')).getSync();
    return sy.peers >= 1 && sy.state === 'on' && sy.exchanged;
  }, { timeout: 20000, message: 'la liaison survit à la reprise du démarrage' });
console.log('reprise sur une salle déjà rejointe : la liaison tient ✓');

/* les 25 pistes du bureau arrivent sur le mobile neuf… (marge large : la
   liaison WebRTC réelle peut mettre quelques secondes à ouvrir son canal) */
await attendre(B, async () => (await import('./ui/state.js')).S.companies.length === 25,
  { timeout: 40000, message: '25 pistes A→B' });
/* …et une piste créée sur mobile repart vers le bureau */
await B.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies.push(normalizeCompany({ id: 'retour-b', name: 'Retour Mobile SARL', city: 'Roubaix', status: 'todo' }));
  saveData();
});
await attendre(A, async () => (await import('./ui/state.js')).S.companies.some(c => c.id === 'retour-b'),
  { timeout: 40000, message: 'piste B→A' });
const devsB = await B.evaluate(async () => (await import('./ui/synclive.js')).loadDevices());
if (!devsB.length) fail('aucun appareil vu côté mobile');
console.log('sync réelle : 25 pistes A→B, 1 piste B→A, appareils vus :', devsB.map(d => d.name).join(', '), '✓');
await A.screenshot({ path: SHOTS + '/liaison-sync-bureau.png' });
await B.screenshot({ path: SHOTS + '/liaison-sync-mobile.png' });
/* thème sombre : le statut reste lisible */
await B.evaluate(() => document.documentElement.dataset.theme = 'dark');
await B.screenshot({ path: SHOTS + '/liaison-sync-mobile-sombre.png' });
await A.close();
await B.close();

/* ============ 2. Partage en groupe : envoi réel + aperçu ============ */
const C = await mk(desktop);
const D = await mk(mobile);
await C.goto(base, { waitUntil: 'load' });
await D.goto(base, { waitUntil: 'load' });
await seed(C, 'promo', 25);
await seed(D, '', 0);
await C.reload({ waitUntil: 'load' });
await attendre(C, async () => (await import('./ui/state.js')).S.companies.length === 25);

for (const [p, nav] of [[C, '.topnav'], [D, '.bottomnav']]){
  await p.click(nav + ' a[data-r="echanger"]');
  await p.waitForSelector('#ecPromo');
  await p.click('#ecPromo');
  await p.waitForSelector('#prPass');
  await p.fill('#prPass', 'promo-e2e-liaison');
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('#prStatus');
}
for (const p of [C, D])
  await attendre(p, () => /camarade/.test(document.querySelector('#prStatus')?.textContent || ''),
    { timeout: 40000, message: 'groupe relié' });
/* D est connecté mais n'a AUCUNE piste partageable : l'écran doit le DIRE,
   jamais rester muet sans bouton ni explication (retour utilisateur). */
await attendre(D, () => /Rien à partager/.test(document.querySelector('#prZone')?.textContent || ''),
  { timeout: 8000, message: 'message « rien à partager » côté client sans piste' });
if (await D.$('#prSend')) fail('un bouton Envoyer apparaît alors qu’il n’y a rien à partager');
console.log('groupe : client sans piste voit « Rien à partager » (pas un vide muet) ✓');

/* « Choisir ce qui part » : la seule des trois listes de pistes que rien
   n'atteignait — elle vit derrière une salle connectée. Elle donnait donc
   sa propre version de la sous-ligne (la ville seule) pendant que
   « Donner » disait « statut · ville » et « Prospecter » le statut seul.
   Trois descriptions du même objet, sur trois écrans qui se suivent.
   Déplier ne partage RIEN : l'invariant « rien ne part sans clic » juste
   en dessous continue de le vérifier après ce dépli. */
await C.click('#prPick');
await C.waitForSelector('.pick-list .pk .pk-m');
const ligneGroupe = (await C.textContent('.pick-list .pk .pk-m')).replace(/\s+/g, ' ').trim();
if (!/À contacter/.test(ligneGroupe) || !/Lille/.test(ligneGroupe))
  fail('« Choisir ce qui part » ne décrit pas la piste comme les deux autres listes : ' + ligneGroupe);
else console.log('groupe : la ligne dit « ' + ligneGroupe.slice(0, 46) + ' », comme Donner et Prospecter ✓');
await C.click('#prPick');   /* on referme : la suite mesure l'écran au repos */

/* INVARIANT (retour utilisateur) : RIEN ne part sans clic « Envoyer ».
   C a 25 pistes et vient d'en éditer une, mais tant qu'il n'a pas cliqué,
   D ne doit avoir reçu AUCUN aperçu. Le partage en groupe n'est jamais
   automatique — seul le bouton déclenche l'envoi. */
await C.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  S.companies[0].nextActionText = 'édité — ne doit surtout pas partir tout seul';
  S.companies[0].updatedAt = Date.now();
  saveData();   /* déclenche oc:change — ne DOIT PAS provoquer d'envoi groupe */
});
await C.waitForTimeout(5000);
if (await D.$('.rc-big')) fail('AUTO-ENVOI : D a reçu un aperçu sans que C ait cliqué « Envoyer »');
console.log('groupe : rien ne part sans clic « Envoyer », même après édition (invariant tenu) ✓');

/* clic « Envoyer » → l'envoi part (pas de confirmation : geste direct) */
await C.waitForSelector('#prSend');
await C.click('#prSend');
await D.waitForSelector('.rc-big', { timeout: 20000 });
const recap = (await D.textContent('.rc-big')).trim();
if (!/25 pistes/.test(recap)) fail('aperçu groupe : ' + recap);
await D.screenshot({ path: SHOTS + '/liaison-groupe-apercu-mobile.png' });
await fusionner(D);
await attendre(D, async () => (await import('./ui/state.js')).S.companies.length === 25,
  { timeout: 15000, message: 'fusion après aperçu' });
console.log('partage en groupe réel : 25 pistes envoyées, aperçu, fusion ✓');
await C.screenshot({ path: SHOTS + '/liaison-groupe-bureau.png' });

/* ============ 3. Rendez-vous QR : donner ↔ recevoir par code ============ */
/* fermer les feuilles de groupe des deux côtés */
for (const p of [C, D])
  await p.evaluate(async () => {
    const { topSheet } = await import('./ui/dom.js');
    let s; let n = 0;
    while ((s = topSheet()) && n++ < 4){ s.close(null, true); await new Promise(r => setTimeout(r, 150)); }
  });
/* le mobile ajoute une piste, puis donne TOUT (gros lot → rendez-vous P2P) */
await D.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies.push(normalizeCompany({ id: 'rdv-extra', name: 'Rendez-vous SARL', city: 'Arras', status: 'todo' }));
  saveData();
});
await D.click('.bottomnav a[data-r="echanger"]');
await D.waitForSelector('#ecGive');
await D.click('#ecGive');
await D.waitForSelector('#dnQR');
await D.click('#dnQR');
await D.waitForSelector('.sy-phrase span', { timeout: 20000 });   /* écran rendez-vous */
const code = (await D.textContent('.sy-phrase span')).trim();
console.log('code de rendez-vous affiché :', code);

await C.click('.topnav a[data-r="echanger"]');
await C.waitForSelector('#ecRecv');
await C.click('#ecRecv');
await C.waitForSelector('#rcScan');
await C.click('#rcScan');
await C.waitForSelector('#rcCode');       /* pas de caméra ici : le code se tape */
await C.fill('#rcCode', code);
await C.waitForSelector('#rcCodeGo:not([hidden])');
await C.click('#rcCodeGo');
await C.waitForSelector('.rc-big', { timeout: 30000 });
/* le partage communautaire retire les id (communityView) : la nouvelle
   piste se reconnaît par son nom, les 25 autres fusionnent par nom+ville */
await fusionner(C);
await attendre(C, async () => (await import('./ui/state.js')).S.companies.some(c => c.name === 'Rendez-vous SARL'),
  { timeout: 15000, message: 'fusion après rendez-vous' });
const stD = (await D.textContent('#dnRdvSt').catch(() => '')).trim();
if (!/Envoyé/.test(stD)) fail('statut donneur après envoi : ' + stD);
console.log('rendez-vous QR réel (code tapé) : 26 pistes passées, statut « ' + stD + ' » ✓');
await C.close();
await D.close();

/* ============ 4. Pannes DITES : aucun relais joignable ============ */
const E = await mk(mobile);
await E.goto(base, { waitUntil: 'load' });
await E.evaluate(async port => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:' + port + '/']));
}, portMort);
await E.click('.bottomnav a[data-r="moi"]');
await ouvrirReglages(E);
await E.click('#moiSync');
await E.waitForSelector('#syNew');
await E.click('#syNew');
/* le mot « relais » a quitté le statut : il ne veut rien dire pour un
   étudiant et vit désormais dans « Connexion avancée », là où c'est un
   réglage. L'écran dit l'état et ce qu'on peut faire. */
await attendre(E, () => /Pas de connexion/.test(document.querySelector('#syStatus')?.textContent || ''),
  { timeout: 30000, message: 'panne de connexion dite (sync)' });
const syE = await E.evaluate(async () => (await import('./ui/synclive.js')).getSync());
if (syE.state !== 'norelay') fail('état attendu norelay, obtenu ' + syE.state);
if (!await E.$('#syRetry')) fail('bouton Réessayer absent en panne de relais');
await E.screenshot({ path: SHOTS + '/liaison-norelay-mobile.png' });
console.log('sync : « Pas de connexion » affiché sans jargon, Réessayer présent ✓');

/* « Réessayer » n'est pas un bouton décoratif : le relais renaît sur le
   même port, un tap, et la liaison se rétablit réellement */
const relaisRevenu = await startLocalRelay({ tls: true, port: portMort });
await E.click('#syRetry');
await attendre(E, async () => {
  const sy = (await import('./ui/synclive.js')).getSync();
  return sy.state === 'wait' && sy.relays.open >= 1;
}, { timeout: 30000, message: 'liaison rétablie après Réessayer' });
/* Le moteur reprend AVANT que l'écran le dise : `attendre` ci-dessus rend
   la main sur l'ÉTAT, et le libellé se réécrit au tick suivant, quand
   l'abonné se rejoue. Lu dans la foulée, il portait encore la phrase
   d'avant — d'où un rouge qui n'accusait rien de réel (vu en CI le
   03/08 : l'échec et la ligne « prouvé ✓ » à la même milliseconde).
   On attend donc ce que l'utilisateur VOIT, qui est de toute façon ce
   que ce contrôle prétend prouver. Le délai reste borné, et l'échec
   dit ce qui était affiché à la place. */
let statutVu = false;
try {
  await attendre(E, () => /En attente de ton autre appareil/.test(document.querySelector('#syStatus')?.textContent || ''),
    { timeout: 10000 });
  statutVu = true;
} catch (e) {}
if (!statutVu) fail('statut après Réessayer : « ' + (await E.textContent('#syStatus')).trim() + ' »');
console.log('Réessayer : relais revenu → « En attente », prouvé ✓');
relaisRevenu.close();

await E.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js');
  let s; let n = 0;
  while ((s = topSheet()) && n++ < 4){ s.close(null, true); await new Promise(r => setTimeout(r, 150)); }
});
await E.click('.bottomnav a[data-r="echanger"]');
await E.waitForSelector('#ecPromo');
await E.click('#ecPromo');
await E.waitForSelector('#prPass');
await E.fill('#prPass', 'promo-morte');
await E.click('.modal-f .btn-primary');
await attendre(E, () => /Pas de connexion/.test(document.querySelector('#prStatus')?.textContent || ''),
  { timeout: 30000, message: 'panne de connexion dite (groupe)' });
console.log('groupe : « Pas de connexion » affiché, replis QR/fichier rappelés ✓');
await E.screenshot({ path: SHOTS + '/liaison-norelay-groupe-mobile.png' });
await E.close();

/* ---------- 6. LES RELAIS RÉELLEMENT COMPOSÉS ----------
   Deux appareils ne se trouvent que sur un relais COMMUN. Sans liste
   explicite, Trystero mélange ses 43 relais publics avec une graine
   tirée de l'`appId` et n'en garde que CINQ — les mêmes pour tous les
   utilisateurs d'OpenContact, à jamais, et jamais les 38 autres. Ces
   cinq-là tombent, et le partage meurt partout à la fois sans que rien
   ne soit cassé chez nous. Les unitaires gardent le CONTENU de la
   liste ; ce contrôle-ci garde ce qui compte vraiment — les adresses
   que le navigateur compose pour de bon.

   On enveloppe `WebSocket` au lieu d'écouter `page.on('websocket')` :
   Playwright n'émet cet évènement que pour une connexion qui S'ÉTABLIT.
   Une adresse injoignable — le cas exact qu'on veut couvrir, puisque le
   symptôme rapporté est « rien ne passe » — ne laisse aucune trace. La
   première version de ce contrôle a mesuré zéro socket sur un code qui
   en composait neuf. */
const MOUCHARD = () => {
  window.__ws = [];
  const Vrai = WebSocket;
  const Faux = function (url, ...r){ window.__ws.push(String(url)); return new Vrai(url, ...r); };
  Faux.prototype = Vrai.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Faux[k] = Vrai[k];
  window.WebSocket = Faux;
};
const composes = async (avant) => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true,
    viewport: { width: 393, height: 800 }, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(MOUCHARD);
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  if (avant) await avant(p);
  await p.evaluate(async () => {
    const { openRoom } = await import('./ui/synclive.js');
    await openRoom('promo', 'relais-controle', {});
  });
  await p.waitForTimeout(2500);
  const urls = await p.evaluate(() => (window.__ws || []).map(u => u.replace(/\/$/, '')));
  await ctx.close();
  return [...new Set(urls)];
};
{
  const { RELAIS_DEFAUT } = await import('../../engine/transport.js');
  const attendus = RELAIS_DEFAUT.map(u => u.replace(/\/$/, ''));
  const vus = await composes(null);
  const manquants = attendus.filter(u => !vus.some(v => v.startsWith(u)));
  if (!vus.length)
    fail('relais : aucun WebSocket composé — le contrôle ne mesure plus rien');
  else if (manquants.length)
    fail(`relais : ${manquants.length} relais épinglé(s) jamais composé(s) — ${manquants.join(', ')}. `
      + 'Trystero est retombé sur son tirage de cinq sur quarante-trois : deux camarades '
      + 'peuvent se retrouver sur des relais différents et ne jamais se voir');
  else console.log(`relais : les ${attendus.length} relais épinglés sont tous composés `
    + '(le tirage par défaut n’en donnait que 5) ✓');

  /* et la liste de l'utilisateur reste PRIORITAIRE : celui dont le
     réseau bloque tout doit garder la main sur son transport */
  const perso = relay.url.replace(/\/$/, '');
  const vus2 = await composes(p => p.evaluate(async u => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([u]));
  }, relay.url));
  const intrus = vus2.filter(u => !u.startsWith(perso));
  if (!vus2.length) fail('relais perso : aucun WebSocket — le contrôle ne mesure plus rien');
  else if (intrus.length)
    fail('relais : la liste de l’utilisateur ne prime plus — ' + intrus.slice(0, 4).join(', '));
  else console.log('relais : la liste de l’utilisateur reste prioritaire ✓');
}

if (errors.length){ fail('erreurs console : ' + JSON.stringify(errors.slice(0, 6), null, 1)); }
else console.log('Zéro erreur console (hors relais volontairement mort).');
console.log(process.exitCode ? 'E2E liaison : ÉCHEC' : 'E2E liaison : OK');
await browser.close();
relay.close();
server.close();
process.exit(process.exitCode || 0);

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
import { chromium, chromiumPath, SHOTS, serveRepo, attendre, ouvrirReglages, ROOT } from './outils.mjs';
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
/* L'envoi vit dans le pied et ne disparaît plus : il se DÉSACTIVE, ce
   qui est la bonne conduite (une action impossible se coupe, elle ne
   s'évanouit pas — on saurait sinon qu'elle a existé sans savoir
   pourquoi elle est partie). */
if (!(await D.$('.modal-f .btn-primary[disabled]')))
  fail('l’envoi n’est pas désactivé alors qu’il n’y a rien à partager');
console.log('groupe : client sans piste voit « Rien à partager » (pas un vide muet) ✓');

/* « Choisir ce qui part » : la seule des trois listes de pistes que rien
   n'atteignait — elle vit derrière une salle connectée. Elle donnait donc
   sa propre version de la sous-ligne (la ville seule) pendant que
   « Donner » disait « statut · ville » et « Prospecter » le statut seul.
   Trois descriptions du même objet, sur trois écrans qui se suivent.
   Déplier ne partage RIEN : l'invariant « rien ne part sans clic » juste
   en dessous continue de le vérifier après ce dépli. */
/* La liste est là D'EMBLÉE : plus de « Choisir ce qui part » à déplier.
   Le bouton d'envoi vivait au-dessus d'elle, et le pli n'existait que
   pour le dégager ; descendu dans le pied, plus rien n'est enterré. */
await C.waitForSelector('.pick-list .pk .pk-m');
if (await C.$('#prPick'))
  fail('partage en groupe : le pli est revenu alors que l’envoi vit dans le pied');
if (!(await C.$('.modal-f .btn-primary')))
  fail('partage en groupe : l’envoi n’est pas dans le pied de la feuille');
const ligneGroupe = (await C.textContent('.pick-list .pk .pk-m')).replace(/\s+/g, ' ').trim();
if (!/À contacter/.test(ligneGroupe) || !/Lille/.test(ligneGroupe))
  fail('« Choisir ce qui part » ne décrit pas la piste comme les deux autres listes : ' + ligneGroupe);
else console.log('groupe : la ligne dit « ' + ligneGroupe.slice(0, 46) + ' », comme Donner et Prospecter ✓');

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
await C.click('.modal-f .btn-primary');
await D.waitForSelector('.rc-big', { timeout: 20000 });
const recap = (await D.textContent('.rc-big')).trim();
if (!/25 pistes/.test(recap)) fail('aperçu groupe : ' + recap);
await D.screenshot({ path: SHOTS + '/liaison-groupe-apercu-mobile.png' });
await fusionner(D);
await attendre(D, async () => (await import('./ui/state.js')).S.companies.length === 25,
  { timeout: 15000, message: 'fusion après aperçu' });
console.log('partage en groupe réel : 25 pistes envoyées, aperçu, fusion ✓');
await C.screenshot({ path: SHOTS + '/liaison-groupe-bureau.png' });

/* ---- UN APERÇU FERMÉ SANS FUSIONNER N'A PAS CONSOMMÉ L'ENVOI ----
   L'empreinte d'un envoi se pose à la RÉCEPTION : c'est ce qui empêche
   un re-clic de rouvrir deux fois la même feuille. Mais le receveur qui
   regarde, hésite et referme se retrouvait PIÉGÉ — le même envoi
   renvoyé était jeté en silence, sans aucun moyen de le redemander,
   pendant que l'expéditeur lisait « Parti vers 1 camarade ✓ ».
   Reproduit de bout en bout avant correction : douze pistes envoyées,
   aperçu fermé, renvoi, zéro piste et rien à l'écran.
   On garde les DEUX moitiés — sans la seconde, « ne jamais oublier »
   passerait le contrôle et rouvrirait la feuille à chaque re-clic. */
{
  await C.evaluate(async () => {
    const { S, saveData } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.companies.push(normalizeCompany({ id: 'renvoi-1', name: 'Renvoi SARL', city: 'Douai', status: 'todo' }));
    saveData();
  });
  await C.waitForTimeout(600);
  await C.click('.modal-f .btn-primary');
  await D.waitForSelector('.rc-big', { timeout: 20000 });
  /* le receveur referme SANS fusionner */
  await D.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); topSheet()?.close(null, true); });
  await D.waitForTimeout(1200);
  await C.click('.modal-f .btn-primary');
  let revu = true;
  try { await D.waitForSelector('.rc-big', { timeout: 15000 }); } catch (e) { revu = false; }
  if (!revu)
    fail('renvoi : l’aperçu fermé sans fusionner a CONSOMMÉ l’envoi — le même envoi renvoyé '
      + 'ne réapparaît pas, et l’expéditeur lit pourtant « Parti vers 1 camarade ✓ ». '
      + 'Le receveur n’a aucun moyen de le redemander');
  else {
    await fusionner(D);
    await attendre(D, async () => (await import('./ui/state.js')).S.companies.some(c => c.name === 'Renvoi SARL'),
      { timeout: 15000, message: 'fusion après renvoi' });
    /* et l'autre moitié : une fois FUSIONNÉ, le même envoi ne revient plus */
    await D.waitForTimeout(800);
    await C.click('.modal-f .btn-primary');
    await C.waitForTimeout(4000);
    if (await D.$('.rc-big'))
      fail('renvoi : l’envoi DÉJÀ fusionné rouvre quand même l’aperçu — le dédoublonnage ne sert plus à rien');
    else console.log('renvoi : aperçu fermé sans fusionner → l’envoi revient ; '
      + 'une fois fusionné → il ne revient plus ✓');
  }
}

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

/* LE DÉLAI QUE MET UNE VRAIE PERSONNE. Ce contrôle rejoignait en une
   seconde — ce que personne ne fait : on sort son téléphone, on ouvre
   l'app, on tape « Recevoir », « En personne », puis on vise. Trente
   secondes est un minimum honnête, et la bibliothèque fait expirer les
   offres (`offerExpiryTimer`) : un rendez-vous qui ne survit pas au
   temps de sortir son téléphone ne sert à rien.
   Mesuré à 0, 10, 25, 45 et 75 s avant d'écrire cette ligne : les cinq
   passent. On en fige un, celui qui ressemble à la vie. */
await D.waitForTimeout(30000);
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
console.log('rendez-vous QR réel (code tapé, 30 s après l’affichage du QR) : '
  + '26 pistes passées, statut « ' + stD + ' » ✓');
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

/* ---------- LE RELAIS MUET : la panne qu'un socket ouvert cache ----------
   Signalée à l'usage : « le partage ne fonctionne pas », et l'écran
   restait sur « En attente de ton autre appareil », indéfiniment.
   Le relais mort ci-dessus REFUSE le socket, donc l'app le voyait. Un
   relais qui l'ACCEPTE puis se tait comptait au contraire comme joint
   (`readyState === 1`), et l'app en concluait « des relais, mais
   personne en face » — elle accusait le pair absent d'une panne qui
   n'était pas la sienne, et invitait à patienter devant quelque chose
   qui n'arriverait jamais.
   C'est l'erreur de l'incident #14 un étage plus bas. Ici on plante un
   relais muet et on exige le même verdict que pour un relais mort :
   l'utilisateur a le même problème, donc il lit la même phrase et a le
   même bouton. */
{
  const muet = await startLocalRelay({ tls: true, muet: true });
  const portMuet = new URL(muet.url).port;
  const M = await mk(mobile);
  await M.goto(base, { waitUntil: 'load' });
  await M.evaluate(async port => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:' + port + '/']));
  }, portMuet);
  await M.click('.bottomnav a[data-r="moi"]');
  await ouvrirReglages(M);
  await M.click('#moiSync');
  await M.waitForSelector('#syNew');
  await M.click('#syNew');
  /* la SONDE d'abord : le socket doit vraiment s'ouvrir, sinon on
     mesure un relais mort déguisé et le contrôle ne prouve rien */
  await attendre(M, async () => {
    const r = (await import('./ui/synclive.js')).relaySnapshot();
    return r.open > 0;
  }, { timeout: 30000, message: 'le socket vers le relais muet ne s’est jamais ouvert' });
  const vu = await M.evaluate(async () => {
    const sl = await import('./ui/synclive.js');
    return { snap: sl.relaySnapshot(), etat: sl.getSync().state };
  });
  if (!vu.snap.open) fail('le relais muet n’a pas accepté le socket — le cas n’est pas joué');
  if (vu.snap.vivants) fail('un relais muet est compté comme vivant : ' + JSON.stringify(vu.snap));
  await attendre(M, () => /Pas de connexion/.test(document.querySelector('#syStatus')?.textContent || ''),
    { timeout: 40000, message: 'relais muet : l’app doit dire « Pas de connexion », pas « En attente »' });
  const syM = await M.evaluate(async () => (await import('./ui/synclive.js')).getSync());
  if (syM.state !== 'norelay') fail('relais muet : état attendu norelay, obtenu ' + syM.state);
  if (/En attente/.test(await M.textContent('#syStatus')))
    fail('relais muet : l’écran invite encore à attendre un pair qui ne viendra pas');
  if (!await M.$('#syRetry')) fail('relais muet : bouton Réessayer absent');
  console.log('relais muet : socket ouvert, ' + vu.snap.open + ' joint(s), 0 vivant → '
    + '« Pas de connexion » et non « En attente » ✓');
  await M.context().close();
  muet.close();
}

/* RÉPONDRE N'EST PAS RELAYER — la même erreur, encore un étage plus bas,
   et celle-ci a été MESURÉE dans le monde réel : le 18/09, quatre des
   neuf relais épinglés lisaient parfaitement et refusaient les
   écritures, pendant que la sonde de lecture en rendait sept sur neuf
   « sains ». Ils répondaient, donc ils passaient pour vivants, donc
   l'écran disait « En attente de ton autre appareil » devant une
   découverte qui ne pouvait pas avoir lieu.
   Le double est un relais qui répond EOSE aux REQ et « OK false » aux
   EVENT. SON CONTRÔLE EST DANS L'ASSERTION : `refus` ne peut être posé
   qu'en lisant une réponse reçue de lui — s'il était simplement muet,
   ce compteur resterait à zéro et le scénario échouerait au lieu de
   rejouer le cas d'à côté sans le savoir. */
{
  const restreint = await startLocalRelay({ tls: true, refus: true });
  const portR = new URL(restreint.url).port;
  const R = await mk(mobile);
  await R.goto(base, { waitUntil: 'load' });
  await R.evaluate(async port => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:' + port + '/']));
  }, portR);
  await R.click('.bottomnav a[data-r="moi"]');
  await ouvrirReglages(R);
  await R.click('#moiSync');
  await R.waitForSelector('#syNew');
  await R.click('#syNew');
  /* il doit d'abord REFUSER — c'est ce refus qui prouve qu'il parle */
  await attendre(R, async () => {
    const r = (await import('./ui/synclive.js')).relaySnapshot();
    return r.refus > 0;
  }, { timeout: 30000, message: 'le relais restreint n’a jamais refusé une publication — le cas n’est pas joué' });
  const vuR = await R.evaluate(async () => {
    const sl = await import('./ui/synclive.js');
    return { snap: sl.relaySnapshot(), etat: sl.getSync().state };
  });
  if (!vuR.snap.open) fail('le relais restreint n’a pas accepté le socket — le cas n’est pas joué');
  if (!vuR.snap.refus) fail('le relais restreint n’a pas été vu refuser — le cas n’est pas joué');
  if (vuR.snap.vivants) fail('un relais qui refuse de relayer est compté vivant : ' + JSON.stringify(vuR.snap));
  await attendre(R, () => /Pas de connexion/.test(document.querySelector('#syStatus')?.textContent || ''),
    { timeout: 40000, message: 'relais restreint : l’app doit dire « Pas de connexion », pas « En attente »' });
  const syR = await R.evaluate(async () => (await import('./ui/synclive.js')).getSync());
  if (syR.state !== 'norelay') fail('relais restreint : état attendu norelay, obtenu ' + syR.state);
  if (/En attente/.test(await R.textContent('#syStatus')))
    fail('relais restreint : l’écran invite encore à attendre un pair qui ne peut pas être annoncé');
  if (!await R.$('#syRetry')) fail('relais restreint : bouton Réessayer absent');
  /* et le rapport de diagnostic doit le DIRE : c'est lui qui affichait
     « 9 qui répondent » sans que rien ne puisse passer */
  const rapport = await R.evaluate(async () => {
    const { diagnosticData, diagnosticText } = await import('./engine/diagnostic.js');
    const { relaySnapshot } = await import('./ui/synclive.js');
    return diagnosticText(diagnosticData({ relais: relaySnapshot() }));
  });
  if (!/qui refuse\(nt\) de relayer/.test(rapport))
    fail('le rapport de diagnostic ne dit pas que les relais refusent : ' + rapport);
  /* ET L'ÉCRAN NE DOIT PAS ENVOYER CHERCHER AU MAUVAIS ENDROIT. « Ton
     réseau la bloque ? » est juste quand rien ne répond ; ici les relais
     ont répondu « non », et changer de wifi ne changera rien. */
  const phrase = await R.textContent('#syStatus');
  if (/réseau/.test(phrase))
    fail('relais restreint : l’écran accuse le réseau de l’utilisateur — « ' + phrase.trim() + ' »');
  if (!/refusent/.test(phrase))
    fail('relais restreint : l’écran ne nomme pas la cause connue — « ' + phrase.trim() + ' »');
  console.log('relais qui LIT et REFUSE d’écrire : ' + vuR.snap.refus + ' refus, 0 vivant → '
    + '« Pas de connexion », et le rapport le dit ✓');
  await R.context().close();
  restreint.close();
}

/* ET LE PIRE DES QUATRE : LE RELAIS QUI AVALE EN SILENCE.
   C'est la panne rencontrée sur deux vrais téléphones, sur les trois
   fonctions à la fois, après que les trois corrections précédentes
   étaient livrées et vertes. Il lit (REQ → EOSE), il prend nos
   publications sans un mot — ni `OK true`, ni `OK false` — et ne
   retransmet rien. Il n'est donc ni muet, ni refusant : l'app le
   comptait vivant et rendait « En attente » à l'infini.

   CE SCÉNARIO EST CELUI QUI DISTINGUE LES DEUX MESURES. Un relais sain
   bavarde ET porte ; seul celui-ci fait l'un sans l'autre. Sans lui, on
   ne peut pas prouver que l'app mesure le PORTAGE plutôt que le
   bavardage — les trois autres doubles passent aussi bien avec
   l'ancienne règle qu'avec la nouvelle.
   SON CONTRÔLE EST DANS L'ASSERTION : on exige `muets > 0`, ce qui ne
   peut être vrai que si le socket est OUVERT et qu'il a répondu à
   autre chose. S'il était simplement mort, ce compteur resterait à
   zéro et le scénario échouerait au lieu de rejouer le cas d'à côté
   sans le savoir. */
{
  const avaleur = await startLocalRelay({ tls: true, avale: true });
  const portA = new URL(avaleur.url).port;
  const A2 = await mk(mobile);
  await A2.goto(base, { waitUntil: 'load' });
  await A2.evaluate(async port => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:' + port + '/']));
  }, portA);
  await A2.click('.bottomnav a[data-r="moi"]');
  await ouvrirReglages(A2);
  await A2.click('#moiSync');
  await A2.waitForSelector('#syNew');
  await A2.click('#syNew');

  await attendre(A2, async () => {
    const r = (await import('./ui/synclive.js')).relaySnapshot();
    return r.open > 0 && r.muets > 0;
  }, { timeout: 30000,
       message: 'le relais avaleur n’a jamais été vu ouvert-et-muet — le cas n’est pas joué' });

  const vuA = await A2.evaluate(async () => {
    const sl = await import('./ui/synclive.js');
    return { snap: sl.relaySnapshot(), etat: sl.getSync().state };
  });
  if (!vuA.snap.open)
    fail('le relais avaleur n’a pas accepté le socket — le cas n’est pas joué');
  if (vuA.snap.refus)
    fail('le relais avaleur a REFUSÉ quelque chose — c’est le cas d’à côté qui est joué, '
      + 'pas le silence : ' + JSON.stringify(vuA.snap));
  if (vuA.snap.vivants)
    fail('UN RELAIS QUI AVALE EN SILENCE EST COMPTÉ VIVANT : ' + JSON.stringify(vuA.snap)
      + '. C’est la panne des deux téléphones — l’app mesure le bavardage (EOSE, NOTICE) '
      + 'au lieu du PORTAGE (OK true, EVENT délivré), et l’écran tourne indéfiniment');

  await attendre(A2, () => /Pas de connexion/.test(document.querySelector('#syStatus')?.textContent || ''),
    { timeout: 40000,
      message: 'relais avaleur : l’app doit dire « Pas de connexion », jamais « En attente »' });
  const syA = await A2.evaluate(async () => (await import('./ui/synclive.js')).getSync());
  if (syA.state !== 'norelay')
    fail('relais avaleur : état attendu norelay, obtenu ' + syA.state);
  if (/En attente/.test(await A2.textContent('#syStatus')))
    fail('relais avaleur : l’écran invite encore à attendre un pair qui ne peut pas être annoncé');
  console.log('relais qui AVALE en silence : ' + vuA.snap.muets + ' muet(s), 0 vivant → '
    + '« Pas de connexion » au lieu de « En attente » ✓');
  await A2.context().close();
  avaleur.close();
}

/* « Réessayer » n'est pas un bouton décoratif : le relais renaît sur le
   même port, un tap, et la liaison se rétablit réellement.
   ON EXIGE `vivants`, PAS SEULEMENT `open` — et c'est plus fort qu'avant :
   depuis qu'un socket ouvert ne suffit plus à faire un relais joint, se
   contenter de `open >= 1` laisserait passer un relais qui accepte la
   connexion et se tait, c'est-à-dire exactement la panne d'à côté.
   Le délai suit la condition : il faut maintenant l'aller-retour complet
   (socket, abonnement, première réponse) et non la seule ouverture du
   socket. Trente secondes suffisaient en isolé et tombaient sous la
   charge de la suite entière ; c'est le délai qui s'ajuste, jamais la
   condition qu'on affaiblit. */
const relaisRevenu = await startLocalRelay({ tls: true, port: portMort });
await E.click('#syRetry');
await attendre(E, async () => {
  const sy = (await import('./ui/synclive.js')).getSync();
  return sy.state === 'wait' && sy.relays.open >= 1 && sy.relays.vivants >= 1;
}, { timeout: 60000, message: 'liaison rétablie après Réessayer (relais vivant, pas seulement ouvert)' });
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

/* ---- LA CAUSE DE L'ÉCHEC ARRIVE JUSQU'À L'ÉCRAN ----
   Trystero fait passer TROIS pannes par le seul rappel `onJoinError` —
   un code différent des deux côtés, aucun TURN configuré, un TURN qui
   ne répond pas. L'app les recevait toutes et les jetait
   (`onJoinError: () => watch.fail()` ignorait son argument), donc elle
   disait « rien ne passe » aussi bien à qui s'était trompé d'une lettre
   qu'à qui avait besoin d'un serveur. Deux niveaux de garde, parce que
   la panne se perd à deux endroits différents. */
/* ---- LE NAT D'OPÉRATEUR, REPRODUIT ----
   C'est la panne que les gens rencontrent vraiment, et rien ne la
   jouait : les deux appareils se trouvent par le relais, échangent
   leur SDP, et AUCUN chemin direct ne s'établit. Deux téléphones en
   données mobiles sont dans ce cas — chacun derrière le NAT de son
   opérateur, sans TURN pour les relier.

   On la reproduit en retirant au receveur tout candidat ICE : les
   « trickle » (`addIceCandidate`) ET ceux embarqués dans le SDP
   distant. Le second est indispensable — sans lui, deux pages de la
   même machine se relient par la boucle locale et le transfert
   RÉUSSIT, ce qui a fait passer une première version de ce contrôle
   pour une reproduction alors qu'elle ne prouvait rien.

   CE QUE ÇA GARDE A CHANGÉ DE NATURE. Nommer la panne ne suffisait
   pas : devant un camarade qui attend, une phrase à lire demande de
   comprendre un problème de transport pour donner trois contacts.
   Les deux moitiés BASCULENT donc toutes seules — le donneur affiche
   le QR hors ligne, qui porte les fiches dans l'image, et le receveur
   rouvre son scanner. Le contrôle vérifie le basculement SANS UN SEUL
   CLIC, et il vérifie aussi qu'il a bien joué le cas : le toast du
   donneur doit dire « Liaison impossible », ce qui ne peut venir que
   d'un `rtcfail` — les deux pairs se sont TROUVÉS puis n'ont pas pu se
   parler. Un simple « Pas de connexion » voudrait dire que les relais
   ont lâché, c'est-à-dire une autre panne que celle qu'on reproduit. */
{
  const COUPE_ICE = () => {
    RTCPeerConnection.prototype.addIceCandidate = function(){ return Promise.resolve(); };
    const srd = RTCPeerConnection.prototype.setRemoteDescription;
    RTCPeerConnection.prototype.setRemoteDescription = function (d, ...r){
      if (d && d.sdp)
        d = { type: d.type, sdp: String(d.sdp).split('\n')
          .filter(l => !/^a=candidate:/.test(l.trim())).join('\n') };
      return srd.call(this, d, ...r);
    };
  };
  const G = await mk(mobile), P = await mk(mobile);
  for (const p of [G, P]){
    await p.addInitScript(COUPE_ICE);
    await p.goto(base, { waitUntil: 'load' });
    await p.waitForSelector('#view-aujourdhui:not([hidden])');
  }
  await seed(G, 'nat', 26);
  await seed(P, 'natr', 0);
  for (const p of [G, P]){ await p.reload({ waitUntil: 'load' }); await p.waitForSelector('#view-aujourdhui:not([hidden])'); }

  await G.click('.bottomnav a[data-r="echanger"]');
  await G.waitForSelector('#ecGive'); await G.click('#ecGive');
  await G.waitForSelector('#dnQR'); await G.click('#dnQR');
  await G.waitForSelector('.sy-phrase span', { timeout: 25000 });
  const codeNat = (await G.textContent('.sy-phrase span')).trim();
  await P.click('.bottomnav a[data-r="echanger"]');
  await P.waitForSelector('#ecRecv'); await P.click('#ecRecv');
  await P.waitForSelector('#rcScan'); await P.click('#rcScan');
  await P.waitForSelector('#rcCode');
  await P.fill('#rcCode', codeNat);
  await P.waitForSelector('#rcCodeGo:not([hidden])');
  await P.click('#rcCodeGo');

  /* UN TOAST EST FUGACE (§5) : on ne peut pas le lire en boucle, il
     dure 3,4 s. On l'enregistre à la source, par observation du nœud
     que `toast()` remplit — rien n'est manqué, rien n'est relu deux
     fois. */
  const ENREGISTRER_TOASTS = () => {
    window.__toasts = [];
    const t = document.getElementById('toast');
    new MutationObserver(() => {
      const s = (t.textContent || '').trim();
      if (s && window.__toasts[window.__toasts.length - 1] !== s) window.__toasts.push(s);
    }).observe(t, { childList: true, characterData: true, subtree: true });
  };
  await G.evaluate(ENREGISTRER_TOASTS);
  await P.evaluate(ENREGISTRER_TOASTS);

  /* AUCUN CLIC ENTRE ICI ET LÀ : c'est tout l'objet du contrôle. */
  const bascule = async (page, sel) => {
    for (let i = 0; i < 45; i++){
      if (await page.$(sel)) return true;
      await page.waitForTimeout(2000);
    }
    return false;
  };
  const okG = await bascule(G, '.qr-wrap[aria-label="QR à faire scanner"]');
  const okP = await bascule(P, '#rcCode');
  const tG = await G.evaluate(() => window.__toasts || []);
  const tP = await P.evaluate(() => window.__toasts || []);
  const prog = ((await G.textContent('#dnQrProg').catch(() => '')) || '').trim();
  /* LE CONTRÔLE QUI DIT QU'ON A JOUÉ LA BONNE PANNE. Le toast ne peut
     plus le dire — « Liaison impossible » couvre les deux — et c'est
     très bien à l'écran, mais ici il faut la cause exacte : sans elle,
     un relais local qui tombe ferait passer ce scénario au vert en
     reproduisant une panne qui n'est PAS celle du NAT. `echecLiaison()`
     rend la dernière cause diagnostiquée de la session. */
  const causeG = await G.evaluate(() =>
    import('./ui/synclive.js').then(m => m.echecLiaison()));

  if (!okG)
    fail('NAT : le donneur reste sur son rendez-vous — il faudrait qu’il trouve tout seul '
      + 'le repli pendant que son camarade attend. Toasts vus : ' + JSON.stringify(tG));
  else if (causeG !== 'sansturn')
    fail('NAT : le donneur a basculé, mais la panne jouée n’est pas celle du NAT — '
      + '`echecLiaison()` rend « ' + causeG + ' », attendu « sansturn » (les deux pairs '
      + 'se sont trouvés puis n’ont pas pu se parler faute de chemin direct). Le '
      + 'scénario ne reproduit plus ce qu’il prétend reproduire');
  else if (!tG.some(x => /Liaison impossible/.test(x)))
    fail('NAT : le donneur a basculé sans dire pourquoi — l’écran change sous le pouce '
      + 'et rien ne l’explique. Toasts vus : ' + JSON.stringify(tG));
  /* ON N'ASSERTE PAS UNE VALEUR QUI BOUGE. Le QR animé tourne toutes
     les 900 ms : exiger « partie 1/7 », c'est jouer à pile ou face
     selon l'instant où la mesure tombe. Une mutation l'a dit — elle a
     fait rougir CE contrôle-ci (« partie 3/7 ») au lieu de celui
     qu'elle cassait, et un garde qui accuse le mauvais endroit se
     corrige mal. Ce qui ne bouge pas, et qui est ce qu'on veut
     prouver : il y a PLUSIEURS parties, donc le QR porte les fiches. */
  else if (!/partie \d+\/[2-9]/.test(prog))
    fail('NAT : le donneur n’affiche pas un QR de données en plusieurs parties — « '
      + prog + ' ». Le repli doit PORTER les fiches, pas rouvrir un rendez-vous');
  else if (!okP)
    fail('NAT : le receveur ne rouvre pas son scanner — le donneur affiche un QR que '
      + 'personne ne scanne. Toasts vus : ' + JSON.stringify(tP));
  else if (!tP.some(x => /scanne le QR hors ligne/.test(x)))
    fail('NAT : le receveur a changé d’écran sans dire pourquoi — toasts ' + JSON.stringify(tP));
  else console.log('NAT d’opérateur reproduit : sans un seul clic, le donneur passe au QR '
    + 'hors ligne (' + prog + ') et le receveur rouvre son scanner ✓');
  await G.close(); await P.close();
}

{
  /* ① le CÂBLAGE interne : `fail(err)` rend la cause à l'écran */
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true,
    viewport: { width: 393, height: 800 }, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  const vu = await p.evaluate(async () => {
    const { watchLiaison } = await import('./ui/synclive.js');
    const out = [];
    const w = watchLiaison(() => 0, (stage, cause) => out.push([stage, cause || '']));
    w.fail({ error: 'incorrect room password when decrypting offer' });
    const apresMdp = out[out.length - 1];
    const w2 = watchLiaison(() => 0, (stage, cause) => out.push([stage, cause || '']));
    w2.fail({ error: 'could not connect to peer x after exchanging SDP; '
      + 'configure TURN servers with turnConfig or rtcConfig.iceServers' });
    const apresTurn = out[out.length - 1];
    w.stop(); w2.stop();
    return { apresMdp, apresTurn };
  });
  if (vu.apresMdp[0] !== 'rtcfail' || vu.apresMdp[1] !== 'motdepasse')
    fail('liaison : un code différent n’arrive pas à l’écran — reçu ' + JSON.stringify(vu.apresMdp)
      + '. L’app renverra chercher le QR quelqu’un qui doit juste retaper son code');
  else if (vu.apresTurn[0] !== 'rtcfail' || vu.apresTurn[1] !== 'sansturn')
    fail('liaison : le manque de TURN n’arrive pas à l’écran — reçu ' + JSON.stringify(vu.apresTurn));
  else console.log('liaison : la cause de l’échec (code / TURN) arrive jusqu’à l’écran ✓');
  await ctx.close();
}
{
  /* ② les APPELANTS : un rappel qui ignore son argument reperd tout, et
     ça ne se voit dans aucun rendu — c'est la forme exacte du défaut
     d'origine, donc elle se garde à la source. */
  const { readFileSync, readdirSync } = await import('fs');
  const path = await import('path');
  const dir = path.join(ROOT, 'ui');
  const sourds = [];
  for (const nom of readdirSync(dir).filter(n => n.endsWith('.js'))){
    const src = readFileSync(path.join(dir, nom), 'utf8');
    const re = /onJoinError\s*:\s*(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g;
    let m;
    while ((m = re.exec(src))){
      const args = m[1].replace(/[()]/g, '').trim();
      if (!args) sourds.push(nom + ' : « onJoinError: ' + m[1] + ' => … »');
    }
  }
  if (sourds.length)
    fail('liaison : ' + sourds.length + ' rappel(s) `onJoinError` jettent leur erreur —\n      '
      + sourds.join('\n      ')
      + '\n      Trystero y fait passer trois pannes qui appellent trois gestes opposés.');
  else console.log('liaison : les 4 rappels `onJoinError` transmettent leur erreur ✓');
}

{
  /* ③ TOUS LES ÉCRANS, pas un seul. La cause a été câblée dans le
     partage en groupe et OUBLIÉE sur le rendez-vous QR — deux écrans
     sur trois affichaient donc encore la même phrase pour trois pannes,
     et c'est justement là que ça coûte le plus cher : le camarade est
     en face, il vient de scanner, et rien ne dit s'il faut refaire le
     QR ou passer au fichier. Un correctif à moitié appliqué ne se voit
     dans aucun rendu ; il se garde à la source.
     On vise la RÈGLE, pas la forme de l'appel : tout endroit qui rend
     l'état `rtcfail` doit brancher sur la cause. Une première version
     lisait la liste des paramètres de `watchLiaison`, et ratait le
     rappel passé par son nom (`stageStatus`) — elle a rendu 2 sites
     sur 3, et elle l'a dit au lieu de conclure. */
  const { readFileSync, readdirSync } = await import('fs');
  const path = await import('path');
  const dir = path.join(ROOT, 'ui');
  /* UNE exception, et elle se NOMME (§5). `syncLabel` rend une
     ÉTIQUETTE de deux mots au bout d'une ligne de réglages — « rien ne
     passe » —, pas un message d'état : nommer la cause là ferait entrer
     une phrase dans une ligne de liste, et le détail vit déjà sur
     l'écran que cette ligne ouvre (§7, le plus court qui reste
     compris). L'exemption se vérifie elle-même plus bas : le jour où
     cette fonction se met à rendre des phrases, elle en sort. */
  const EXEMPT = new Map([['moi.js', 'syncLabel']]);
  const sourds = [];
  let vus = 0, exemptes = 0;
  for (const nom of readdirSync(dir).filter(n => n.endsWith('.js'))){
    const src = readFileSync(path.join(dir, nom), 'utf8');
    const re = /'rtcfail'/g;
    let m, dejaDit = false;
    while ((m = re.exec(src))){
      vus++;
      /* la branche qui rend cet état lit-elle la cause ? on regarde le
         voisinage immédiat, là où vivent les `else if` de la série */
      const autour = src.slice(Math.max(0, m.index - 1200), m.index + 1200);
      if (/\bcause\b/.test(autour)) continue;
      const fn = EXEMPT.get(nom);
      /* l'exemption ne vaut QUE si la ligne rend encore une étiquette
         courte, dans la fonction nommée */
      const ligne = src.slice(src.lastIndexOf('\n', m.index) + 1, src.indexOf('\n', m.index));
      const rendu = (ligne.match(/return\s+'([^']*)'/) || [])[1];
      if (fn && src.includes(fn) && rendu !== undefined && rendu.length <= 20){ exemptes++; continue; }
      if (dejaDit) continue;
      dejaDit = true;
      sourds.push(nom + ' (ligne ' + (src.slice(0, m.index).split('\n').length) + ')'
        + (fn ? ' — l’exemption « ' + fn + ' » ne s’applique plus : ce n’est plus une étiquette courte' : ''));
    }
  }
  if (exemptes !== 1)
    fail('liaison : ' + exemptes + ' exemption(s) au lieu d’une — l’exception nommée a bougé, relis-la');
  if (vus < 4)
    fail('liaison : seulement ' + vus + ' rendu(s) de `rtcfail` relevé(s) — le contrôle est cassé, pas le code');
  else if (sourds.length)
    fail('liaison : ' + sourds.length + ' écran(s) rendent `rtcfail` sans lire la cause —\n      '
      + sourds.join('\n      ')
      + '\n      Trois pannes y arrivent, et elles appellent trois gestes opposés.');
  else console.log('liaison : les ' + vus + ' rendus de `rtcfail` branchent sur la cause '
    + '(1 exemption nommée : l’étiquette de la ligne de réglages) ✓');
}

if (errors.length){ fail('erreurs console : ' + JSON.stringify(errors.slice(0, 6), null, 1)); }
else console.log('Zéro erreur console (hors relais volontairement mort).');
console.log(process.exitCode ? 'E2E liaison : ÉCHEC' : 'E2E liaison : OK');
await browser.close();
relay.close();
server.close();
process.exit(process.exitCode || 0);

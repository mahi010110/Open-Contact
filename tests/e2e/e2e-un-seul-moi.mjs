/* ============================================================
   OpenContact — e2e : UN SEUL « MOI » (lot R5,
   docs/propositions/R5-un-seul-moi.md)

   Une phrase de douze mots ramène tout sur un téléphone neuf. Joué sur
   un relais local qui GARDE les événements et remplace les adressables
   (NIP-33), avec trois téléphones : Inès (ses pistes), un téléphone
   neuf, et un troisième qui a déjà une piste.

   ① LA FUITE D'ABORD, lue sur ce que le relais voit passer : un dépôt
     ne porte que son étiquette, son poste, son morceau et son
     expiration ; le contenu est du chiffré — ni nom, ni entreprise, ni
     note, ni e-mail, ni clé de boîte ; l'auteur n'est pas la clé de la
     page ; et l'appareil ne garde pas la phrase, seulement ses clés ;
   ② chez Inès : « Ma copie › Phrase de secours » — créer, les douze
     mots, deux à retaper — et la rangée dit « déposée aujourd'hui » ;
   ③ le téléphone neuf : « J'ai déjà OpenContact » sur l'accueil vide ;
     un mot inconnu, onze mots, une phrase qui n'a rien déposé : chaque
     erreur sous le champ, la saisie gardée ;
   ④ la bonne phrase : l'APERÇU avant (les pistes, le profil, les amis,
     les groupes, le lien des appareils), « Ramener », tout revient —
     puis « Annuler » remet l'écran vide, et « Ramener » de nouveau ;
   ⑤ le téléphone neuf dépose à son tour, sous SON poste : le dépôt
     d'Inès reste (rien ne se remplace d'un appareil à l'autre) ;
   ⑥ RIEN NE S'ÉCRASE : un troisième téléphone qui a une piste plus
     récente la garde — l'aperçu ne la compte pas, la fusion non plus ;
   ⑦ « Changer de phrase » : l'ancienne ne ramène plus rien ;
   ⑧ protéger ses données donne LA phrase : après « Protéger », la
     rangée est déposée, et la clé de oc_moi_v1 est scellée par le coffre ;
   ⑨ pouce et poste, clair et sombre : la rangée, « Retrouver », l'aperçu
     — rien ne déborde ; zéro erreur console.
   Trois mutations : le dépôt en clair (①), la restauration qui remplace
   au lieu de fusionner (⑥), le changement de phrase qui n'efface pas (⑦).
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, attendre, ouvrirReglages } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { nouvelleCle } from '../../engine/boite.js';
import path from 'path';
import fs from 'fs/promises';

const MUTATION = process.env.OC_MUTATION || '';
const vus = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => {
  if (ev.kind === 30078 || ev.kind === 5) vus.push(ev);
  return null;
} });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okv = m => console.log(m + ' ✓');

const INES = { name: 'Inès Martin', formation: 'BTS SIO', email: 'ines@prive.test', updatedAt: Date.now() - 3600e3,
  amiId: 'InesInesInesInes01',
  boite: await nouvelleCle(),
  amis: [{ id: 'KarimKarimKarim01', nom: 'Karim Benali', parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2026-09', fin: '' }] }] };
const now = Date.now();
const PISTES = [
  { id: 'az', name: 'Aztek Sécurité', city: 'Roubaix', status: 'todo', notes: 'NOTE-TRES-PRIVEE', updatedAt: now - 7200e3,
    contacts: [{ id: 'j1', name: 'Julie Marchand', email: 'julie@aztek.test' }] },
  { id: 'ad', name: 'Advens', city: 'Lille', status: 'applied', updatedAt: now - 7200e3, contacts: [] },
  { id: 'or', name: 'Orange Cyberdefense', city: 'Lille', status: 'todo', updatedAt: now - 7200e3, contacts: [] }
];

/* les mutations se servent à la place du vrai fichier */
async function muter(ctx){
  if (!MUTATION) return;
  const fichier = path.resolve('ui/moi-phrase.js');
  let src = await fs.readFile(fichier, 'utf8');
  if (MUTATION === 'clair') src = src.replace('decouper(await sceller(e0.cles, c), idDepot())', 'decouper(\'OCM1.n.AAAA.\' + JSON.stringify(c), idDepot())');
  if (MUTATION === 'remplace') src = src.replace("const res = syncMerge(copie, { companies: S.companies, orphans: S.orphans, profile: S.profile, tombs: S.tombs });",
    "const res = { companies: copie.companies, orphans: copie.orphans, profile: copie.profile, tombs: copie.tombs };");
  if (MUTATION === 'garde') src = src.replace('if (ancien) effacerDepots(ancien).catch(() => {});', '');
  await ctx.route('**/ui/moi-phrase.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: src }));
}

async function ecran(o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true,
                                         colorScheme: o.sombre ? 'dark' : 'light', acceptDownloads: true });
  await annuaireMuet(ctx);
  await muter(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(10000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([d, pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    if (d) await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    if (pr) await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [o.pistes || null, o.profil || null, relay.url]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return { ctx, p };
}
const brut = (p, k) => p.evaluate(async k => (await import('./engine/storage.js')).kvGet(k).catch(() => 'ILLISIBLE'), k);
const lu = async (p, k) => JSON.parse(await brut(p, k) || 'null');
const ouvrirMoi = async p => {
  await p.evaluate(() => { location.hash = '#/moi'; });
  await p.waitForSelector('#moiPhrase');
};
const lireMots = p => p.$$eval('.phrase-grid li', els => els.map(e => e.textContent.trim()));
/* la cérémonie : lire les douze mots, « Je l'ai écrite », retaper les deux demandés */
async function ceremonie(p){
  await p.waitForSelector('.phrase-grid');
  const mots = await lireMots(p);
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('#vw1');
  const n1 = +(await p.textContent('label[for="vw1"]')).replace(/\D/g, '') - 1;
  const n2 = +(await p.textContent('label[for="vw2"]')).replace(/\D/g, '') - 1;
  await p.fill('#vw1', mots[n1]);
  await p.fill('#vw2', mots[n2]);
  await p.click('.modal-f .btn-primary');
  return mots;
}
const etatRangee = p => p.textContent('#moiPhraseSt').then(t => t.trim()).catch(() => '');
const debordements = p => p.evaluate(() => {
  const out = [];
  for (const b of document.querySelectorAll('.modal-b, #view-moi')){
    const r = b.getBoundingClientRect();
    for (const e of b.querySelectorAll('*')){
      const q = e.getBoundingClientRect();
      if (!q.width || getComputedStyle(e).position === 'fixed') continue;
      if (q.right > r.right + 1 || q.left < r.left - 1) out.push((e.id || e.className || e.tagName) + ' ' + Math.round(q.left) + '→' + Math.round(q.right) + ' / ' + Math.round(r.right));
    }
  }
  return out.slice(0, 5);
});
async function snap(p, nom){
  if (MUTATION) return;
  await fs.mkdir(SHOTS, { recursive: true });
  await p.screenshot({ path: path.join(SHOTS, 'un-seul-moi-' + nom + '.png') });
}

try {
  /* ---------- ② Inès crée sa phrase ---------- */
  const A = await ecran({ pistes: PISTES, profil: { ...INES, groupes: [] } });
  await ouvrirMoi(A.p);
  if (await etatRangee(A.p) !== 'à créer') fail('la rangée ne dit pas « à créer » : ' + await etatRangee(A.p));
  await snap(A.p, 'rangee-a-creer');
  await A.p.click('#moiPhrase');
  await A.p.waitForSelector('#mpNew');
  await snap(A.p, 'choix');
  await A.p.click('#mpNew');
  const mots = await ceremonie(A.p);
  if (mots.length !== 12) fail('douze mots attendus : ' + mots.length);
  await attendre(A.p, () => /^déposée aujourd/.test(document.querySelector('#moiPhraseSt')?.textContent || ''),
    { timeout: 30000, message: 'la rangée dit « déposée aujourd’hui »' }).catch(e => fail(e.message));
  okv('② la phrase se crée dans « Ma copie », et la copie se dépose seule');

  /* ---------- ① la fuite ---------- */
  const depots = vus.filter(e => e.kind === 30078 && e.content);
  if (!depots.length) fail('aucun dépôt vu par le relais');
  const tout = JSON.stringify(depots);
  for (const x of ['Inès', 'Ines', 'Martin', 'Aztek', 'Advens', 'NOTE-TRES-PRIVEE', 'julie@', 'ines@prive', INES.boite.priv.slice(0, 24), 'Thales', 'BTS SIO', ...mots])
    if (tout.includes(x)) fail('le relais lit « ' + x + ' »');
  for (const e of depots){
    if (JSON.stringify(e.tags.map(t => t[0])) !== '["d","x","expiration"]') fail('étiquettes en trop : ' + JSON.stringify(e.tags));
    if (!/^OCMP1\./.test(e.content)) fail('un dépôt ne commence pas par OCMP1');
    const [eti, poste, i] = e.tags[0][1].split('.');
    if (eti !== e.tags[1][1] || !/^[A-Za-z0-9_-]{11}$/.test(poste) || !/^\d+$/.test(i)) fail('le `d` ne dit pas étiquette · poste · morceau : ' + e.tags[0][1]);
    const jours = (Number(e.tags[2][1]) - e.created_at) / 86400;
    if (Math.round(jours) !== 63) fail('expiration attendue à 63 jours : ' + jours);
  }
  const clePage = await A.p.evaluate(async () => (await (await import('./assets/vendor/trystero-nostr.min.js')).relayTopic.evenement(1, [], '')).pubkey);
  if (depots.some(e => e.pubkey === clePage)) fail('le dépôt est signé de la clé de la page');
  const etatA = await lu(A.p, 'oc_moi_v1');
  if (!etatA || !etatA.cles || JSON.stringify(etatA).includes(mots[0] + ' ' + mots[1])) fail('oc_moi_v1 garde la phrase, ou rien');
  okv('① le relais ne lit que des étiquettes et du chiffré, signé d’une clé de la semaine ; l’appareil ne garde pas la phrase');

  /* ---------- ③ le téléphone neuf : les erreurs ---------- */
  const B = await ecran();
  await B.p.waitForSelector('#tdeMoi');
  await snap(B.p, 'accueil');
  await B.p.click('#tdeMoi');
  await B.p.waitForSelector('#mpPhrase');
  const essai = async (txt, motif, quoi) => {
    await B.p.fill('#mpPhrase', txt);
    await B.p.click('.modal-f .btn-primary');
    await attendre(B.p, () => !document.querySelector('#mpHint')?.hidden && !document.querySelector('.modal-f .btn-primary')?.disabled,
      { timeout: 30000, message: quoi });
    const h = await B.p.textContent('#mpHint');
    if (!motif.test(h)) fail(quoi + ' : « ' + h + ' »');
    if (await B.p.inputValue('#mpPhrase') !== txt) fail(quoi + ' : la saisie ne reste pas');
  };
  await essai(mots.slice(0, 11).join(' ') + ' zzzz', /Mot inconnu : « zzzz »/, 'un mot inconnu');
  await essai(mots.slice(0, 11).join(' '), /Il faut 12 mots, il y en a 11/, 'onze mots');
  const autre = await B.p.evaluate(async () => (await import('./engine/vault.js')).makeVaultPhrase());
  await essai(autre, /Aucune copie trouvée/, 'une phrase qui n’a rien déposé');
  await snap(B.p, 'retrouver-erreur');
  okv('③ chaque erreur se dit sous le champ, et la saisie reste');

  /* ---------- ④ la bonne phrase : l'aperçu, Ramener, Annuler ---------- */
  await B.p.fill('#mpPhrase', mots.join('  ').toUpperCase());
  await B.p.click('.modal-f .btn-primary');
  await B.p.waitForSelector('.modal .cp-what', { timeout: 30000 });
  const texte = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();
  const apercu = await texte(B.p, '.modal-b');
  for (const m of [/3 pistes/, /ton profil, 1 ami/]) if (!m.test(apercu)) fail('l’aperçu ne dit pas ' + m + ' : ' + apercu);
  if (await B.p.evaluate(async () => (await import('./ui/state.js')).S.companies.length)) fail('l’aperçu a déjà écrit');
  await snap(B.p, 'apercu');
  await B.p.click('.modal-f .btn-primary');
  await attendre(B.p, async () => (await import('./ui/state.js')).S.companies.length === 3, 'les pistes reviennent');
  const prof = await B.p.evaluate(async () => (await import('./ui/state.js')).S.profile);
  if (prof.name !== 'Inès Martin' || !prof.boite || prof.boite.priv !== INES.boite.priv || (prof.amis || []).length !== 1)
    fail('le profil ne revient pas en entier (nom, boîte, amis) : ' + JSON.stringify({ n: prof.name, b: !!prof.boite, a: (prof.amis || []).length }));
  await B.p.waitForSelector('.undo-bar .btn', { timeout: 5000 }).catch(() => fail('pas de barre Annuler'));
  await B.p.click('.undo-bar .btn');
  await attendre(B.p, async () => (await import('./ui/state.js')).S.companies.length === 0, '« Annuler » vide l’écran');
  await B.p.waitForSelector('#tdeMoi');
  await B.p.click('#tdeMoi');
  await B.p.fill('#mpPhrase', mots.join(' '));
  await B.p.click('.modal-f .btn-primary');
  await B.p.waitForSelector('.modal .cp-what', { timeout: 30000 });
  await B.p.click('.modal-f .btn-primary');
  await attendre(B.p, async () => (await import('./ui/state.js')).S.companies.length === 3, 'Ramener, de nouveau');
  okv('④ l’aperçu avant, « Ramener », « Annuler », et de nouveau');

  /* ---------- ⑤ le téléphone neuf dépose sous SON poste ---------- */
  const postes = () => new Set(vus.filter(e => e.kind === 30078 && e.content).map(e => e.tags[0][1].split('.')[1]));
  await attendre(B.p, () => true);
  for (const fin = Date.now() + 30000; postes().size < 2 && Date.now() < fin; ) await new Promise(r => setTimeout(r, 300));
  if (postes().size < 2) fail('le téléphone neuf n’a pas déposé sous un poste à lui : ' + postes().size);
  okv('⑤ chaque appareil dépose sous son poste');

  /* ---------- ⑥ rien ne s'écrase ---------- */
  const C = await ecran({ pistes: [{ id: 'az', name: 'Aztek (renommée ici)', city: 'Roubaix', status: 'interview', updatedAt: Date.now(), contacts: [] }],
                         profil: { name: 'Inès M.', updatedAt: Date.now() } });
  await ouvrirMoi(C.p);
  await C.p.click('#moiPhrase');
  await C.p.waitForSelector('#mpJoin');
  await C.p.click('#mpJoin');
  await C.p.waitForSelector('#mpPhrase');
  await C.p.fill('#mpPhrase', mots.join(' '));
  await C.p.click('.modal-f .btn-primary');
  await C.p.waitForSelector('.modal .cp-what', { timeout: 30000 });
  const apC = await texte(C.p, '.modal-b');
  if (!/2 pistes en plus/.test(apC) || /plus récente/.test(apC) || /ton profil/.test(apC)) fail('l’aperçu compte ce qui ne changera pas : ' + apC);
  await C.p.click('.modal-f .btn-primary');
  await attendre(C.p, async () => (await import('./ui/state.js')).S.companies.length === 3, 'les deux pistes en plus arrivent').catch(e => fail(e.message));
  const az = await C.p.evaluate(async () => (await import('./ui/state.js')).S.companies.find(c => c.id === 'az'));
  if (!az || az.name !== 'Aztek (renommée ici)') fail('la piste plus récente d’ici a été écrasée : ' + (az && az.name));
  if ((await C.p.evaluate(async () => (await import('./ui/state.js')).S.profile.name)) !== 'Inès M.') fail('le profil plus récent d’ici a été écrasé');
  okv('⑥ rien ne s’écrase : la piste et le profil plus récents d’ici restent');

  /* ---------- ⑦ Changer de phrase ----------
     B et C ont adopté l'ancienne phrase et déposent encore sous elle :
     ce qu'on vérifie, c'est que ce QU'INÈS avait déposé sous l'ancienne
     ne se relit plus — remplacé par du vide, chez un relais qui garde. */
  await ouvrirMoi(A.p);
  await A.p.click('#moiPhrase');
  await A.p.waitForSelector('#mpChange');
  await snap(A.p, 'ma-phrase');
  await A.p.click('#mpChange');
  const neufs = await ceremonie(A.p);
  if (neufs.join(' ') === mots.join(' ')) fail('la nouvelle phrase est l’ancienne');
  const ancienPoste = await A.p.evaluate(async ([m, app]) => {
    const moi = await import('./engine/moi.js');
    const c = await moi.clesDe(m);
    const w = moi.semaineDe(Date.now());
    return (await moi.etiquetteSemaine(c, w)) + '.' + (await moi.posteSemaine(c, app, w)) + '.';
  }, [mots.join(' '), etatA.appareil]);
  const gardesAnciens = () => relay.gardes.filter(e => e.kind === 30078 && (e.tags.find(t => t[0] === 'd') || [])[1]?.startsWith(ancienPoste));
  for (const fin = Date.now() + 30000; gardesAnciens().some(e => e.content) && Date.now() < fin; ) await new Promise(r => setTimeout(r, 300));
  if (!gardesAnciens().length) fail('le relais ne gardait rien sous l’ancien poste — le contrôle ne mesure rien');
  else if (gardesAnciens().some(e => e.content)) fail('ce qu’Inès avait déposé sous l’ancienne phrase se relit encore');
  if (!vus.some(e => e.kind === 5)) fail('aucune demande d’effacement (NIP-09)');
  await attendre(A.p, () => /^déposée aujourd/.test(document.querySelector('#moiPhraseSt')?.textContent || ''),
    { timeout: 30000, message: 'la nouvelle phrase dépose à son tour' }).catch(e => fail(e.message));
  okv('⑦ « Changer de phrase » : ce qu’Inès avait déposé sous l’ancienne ne se relit plus');

  /* ---------- ⑧ protéger donne LA phrase ---------- */
  const E = await ecran({ pistes: PISTES.slice(0, 1), profil: { name: 'Léa', updatedAt: 1 } });
  await E.p.evaluate(() => { location.hash = '#/moi'; });
  await ouvrirReglages(E.p);
  await E.p.click('#moiVerrou');
  await E.p.waitForSelector('.modal .pad-k');
  for (const c of '280941') await E.p.click(`.modal .pad-k[data-d="${c}"]`);
  await E.p.waitForTimeout(300);
  for (const c of '280941') await E.p.click(`.modal .pad-k[data-d="${c}"]`);
  await ceremonie(E.p);
  await E.p.waitForSelector('.modal-f .btn-primary');
  const dl = E.p.waitForEvent('download');
  await E.p.click('.modal-f .btn-primary');
  await dl;
  await E.p.click('.modal-f button:has-text("Terminer"):not([disabled])');
  await attendre(E.p, async () => {
    const st = await import('./engine/storage.js');
    const v = await st.kvGet('oc_moi_v1');
    return v && JSON.parse(v).depot;
  }, { timeout: 30000, message: 'protéger dépose la copie sous la même phrase' }).catch(e => fail(e.message));
  /* scellée : sans la clé du coffre, oc_moi_v1 ne se lit pas */
  const sansCle = await E.p.evaluate(async () => {
    const st = await import('./engine/storage.js');
    st.vaultDetach();
    try { await st.kvGet('oc_moi_v1'); return 'lisible'; } catch (e) { return e.message; }
  });
  if (sansCle !== 'verrou') fail('oc_moi_v1 se lit sans le coffre : ' + sansCle);
  await E.ctx.close();
  okv('⑧ « Protéger » donne LA phrase : la copie se dépose sous elle, et ses clés sont scellées par le coffre');

  /* ---------- ⑨ pouce et poste, clair et sombre ---------- */
  if (!MUTATION){
    for (const [vp, sombre, nom] of [[{ width: 320, height: 640 }, false, 'pouce-320'], [{ width: 390, height: 844 }, true, 'pouce-sombre'], [{ width: 1280, height: 800 }, false, 'poste'], [{ width: 1280, height: 800 }, true, 'poste-sombre']]){
      const F = await ecran({ pistes: PISTES, profil: INES, vp, sombre });
      await ouvrirMoi(F.p);
      await F.p.waitForTimeout(300);
      const d1 = await debordements(F.p);
      if (d1.length) fail(nom + ' : « Moi » déborde — ' + d1.join(' ; '));
      await snap(F.p, 'moi-' + nom);
      await F.p.click('#moiPhrase');
      await F.p.waitForSelector('#mpJoin');
      await F.p.click('#mpJoin');
      await F.p.waitForSelector('#mpPhrase');
      const d2 = await debordements(F.p);
      if (d2.length) fail(nom + ' : « Retrouver » déborde — ' + d2.join(' ; '));
      await snap(F.p, 'retrouver-' + nom);
      await F.ctx.close();
    }
    okv('⑨ pouce et poste, clair et sombre : rien ne déborde');
  }

  const errs = errors.filter(e => !/WebSocket|net::ERR|Failed to load resource/.test(e));
  if (errs.length) fail('erreurs console : ' + errs.slice(0, 3).join(' | '));
  else okv('zéro erreur console');
} catch (e) {
  fail(e.stack || String(e));
} finally {
  await browser.close();
  server.close();
  relay.close();
}
if (MUTATION) console.log(process.exitCode ? 'MUTATION ' + MUTATION + ' : attrapée ✓' : 'MUTATION ' + MUTATION + ' : PAS attrapée ✗');

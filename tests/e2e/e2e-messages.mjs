/* ============================================================
   Parler à un ami — la conversation privée
   (retour du mainteneur, 13 octobre 2026 : « pouvoir parler par message
   à un ami en conversation privée »)

   Inès et Karim sont amis. Elle lui écrit depuis sa fiche ; la lettre
   ATTEND sur un relais que le téléphone de Karim s'ouvre, comme une
   demande (lot 3). Joué à DEUX (§8, règle 4), sur un relais local qui
   garde les lettres, plus un faussaire :

   ① LA FUITE D'ABORD, lue sur ce que le relais voit passer et dans la
     lettre ouverte avec la clé de Karim : le relais ne lit rien ; la
     lettre ne porte que le prénom, la clé de boîte, le texte, l'heure et
     la preuve — ni nom de famille, ni e-mail, ni piste, ni note ;
   ② chez Inès : « Écrire à Karim » au pied de sa fiche, le message à
     droite, ses retours à la ligne gardés, le champ vidé ;
   ③ chez Karim : « Tes amis » en tête d'« Aujourd'hui » (« t'a écrit »),
     le chiffre au bout de la ligne d'Inès dans « Amis », la conversation
     d'un tap — et, lue, plus rien ne se compte ;
   ④ EN DIRECT : conversation ouverte des deux côtés, ce qui s'écrit en
     face arrive sans rien toucher ;
   ⑤ SANS RÉSEAU : le message reste dans la conversation, « pas encore
     parti », puis part à la relève suivante — une fois, pas deux ;
   ⑥ LE FAUSSAIRE : une lettre au nom de Karim, scellée pour Inès mais
     prouvée d'une autre clé, est lue et JETÉE ;
   ⑦ un ami retiré emporte la conversation ;
   ⑧ pouce et poste, clair et sombre, 320 px texte doublé : rien ne
     déborde ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { nouvelleCle, ouvrir, etiquetteBoite, sceller, prouver, nouvelId } from '../../engine/boite.js';

const lettres = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => {
  const x = (ev.tags || []).find(t => t[0] === 'x');
  if (x && /^oc-boite-/.test(x[1])) lettres.push(ev);
  return null;
} });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const bI = await nouvelleCle(), bK = await nouvelleCle();
const ID_I = 'InesInesInesInes01', ID_K = 'KarimKarimKarim01';
const AMI_K = { id: ID_K, nom: 'Karim Benali', parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2026-09', fin: '' }], cle: bK.pub };
const AMI_I = { id: ID_I, nom: 'Inès Martin', parcours: [], cle: bI.pub };
const INES = { name: 'Inès Martin', formation: 'BTS SIO', email: 'ines@prive.test', boite: bI, amiId: ID_I, amis: [AMI_K] };
const KARIM = { name: 'Karim Benali', formation: 'BTS SIO', email: 'karim@prive.test', boite: bK, amiId: ID_K, amis: [AMI_I] };
const PISTES_I = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', notes: 'note très privée d’Inès', updatedAt: 9 }];
const PISTES_K = [{ id: 'kz', name: 'Advens', city: 'Lille', status: 'todo', notes: 'note privée de Karim', updatedAt: 2 }];
const MORT = 'wss://127.0.0.1:9';

async function ecran(profil, pistes, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true,
                                         colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket connection to 'wss:\/\/127\.0\.0\.1:9/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr, url, conv]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
    if (conv) await st.kvSet(st.MESSAGES_KEY, JSON.stringify(conv));
  }, [pistes, profil, relay.url, o.conv || null]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return { ctx, p };
}
const fermerTout = async p => {
  for (let i = 0; i < 6; i++){
    const n = await p.evaluate(() => document.querySelectorAll('.overlay').length);
    if (!n) break;
    await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-h button.x').click());
    await p.waitForTimeout(250);
  }
};
const rouvrir = async p => {
  await fermerTout(p);
  await p.evaluate(() => { location.hash = '#/aujourdhui'; });
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
};
const ongletAmis = async p => {
  await fermerTout(p);
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForSelector('[data-portee="amis"]');
  await p.click('[data-portee="amis"]');
  await p.waitForSelector('#piAmis .am-row');
};
const convDe = (p, id) => p.evaluate(async i => {
  const st = await import('./engine/storage.js');
  const c = JSON.parse(await st.kvGet(st.MESSAGES_KEY) || 'null');
  return c && c.fils && c.fils[i] ? c.fils[i] : null;
}, id);
const reseauDe = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.RESEAU_KEY) || 'null');
});
const bulles = p => p.evaluate(() => [...document.querySelectorAll('.overlay #msFil .ms-m')].map(li => ({
  moi: li.classList.contains('gr-moi'), texte: li.querySelector('p').innerText, heure: !!li.querySelector('time'),
  attente: /pas encore parti/.test(li.querySelector('.gr-qui')?.textContent || '') })));
const attendre = async (f, quoi, ms = 20000) => {
  for (const fin = Date.now() + ms; Date.now() < fin; await new Promise(r => setTimeout(r, 300))){
    const v = await f().catch(() => null);
    if (v) return v;
  }
  fail(quoi);
  return null;
};
const lettresPour = async (b, t = 'message') => {
  const et = await etiquetteBoite(b.pub);
  const out = [];
  for (const ev of lettres){
    if ((ev.tags.find(x => x[0] === 'x') || [])[1] !== et) continue;
    const l = await ouvrir(b.priv, ev.content);
    if (l && l.t === t) out.push({ ev, l });
  }
  return out;
};
async function ecrire(p, texte){
  await p.click('#msChamp');
  const lignes = texte.split('\n');
  for (let i = 0; i < lignes.length; i++){
    if (i) await p.keyboard.press('Shift+Enter');
    await p.keyboard.type(lignes[i]);
  }
  await p.keyboard.press('Enter');
}

const I = await ecran(INES, PISTES_I);
const K = await ecran(KARIM, PISTES_K);

/* ---------- ② chez Inès : « Écrire à Karim », au pied de sa fiche ---------- */
await ongletAmis(I.p);
await I.p.click('#piAmis .am-row .ri-main');
await I.p.waitForSelector('.overlay .modal-f #amEcrire');
{
  const t = await I.p.evaluate(() => {
    const b = document.querySelector('.overlay .modal-f #amEcrire');
    return { mot: b.innerText.trim(), primaire: b.classList.contains('btn-primary') };
  });
  if (t.mot !== 'Écrire à Karim' || !t.primaire) fail('la fiche d’un ami ne porte pas « Écrire à Karim » en primaire au pied : ' + JSON.stringify(t));
}
await I.p.waitForTimeout(500);
await I.p.screenshot({ path: `${SHOTS}/130-conv-fiche-ami.png` });
await I.p.click('.overlay #amEcrire');
await I.p.waitForSelector('#msChamp');
{
  const t = await I.p.evaluate(() => ({ titre: [...document.querySelectorAll('.overlay')].pop().querySelector('.mh-t').textContent.trim(),
    vide: document.querySelector('#msVide')?.textContent.trim() || '', ph: document.querySelector('#msChamp').getAttribute('aria-label') }));
  if (t.titre !== 'Karim Benali') fail('la barre d’une conversation porte : ' + t.titre);
  if (t.vide !== 'Aucun message pour l’instant.') fail('la conversation vide dit : ' + t.vide);
  if (t.ph !== 'Écrire à Karim') fail('le champ se nomme : ' + t.ph);
}
await I.p.screenshot({ path: `${SHOTS}/130-conv-vide.png` });
await ecrire(I.p, 'Salut Karim !\nTu as un contact chez Thales ?');
await attendre(async () => (await bulles(I.p)).length === 1 && !(await bulles(I.p))[0].attente, 'le message d’Inès ne part pas');
{
  const [b] = await bulles(I.p);
  if (!b.moi) fail('le message d’Inès n’est pas à droite');
  if (b.texte !== 'Salut Karim !\nTu as un contact chez Thales ?') fail('le retour à la ligne s’est perdu : ' + JSON.stringify(b.texte));
  if (await I.p.inputValue('#msChamp')) fail('le champ ne se vide pas après l’envoi');
}
await I.p.screenshot({ path: `${SHOTS}/130-conv-ines.png` });
console.log('② « Écrire à Karim » au pied de sa fiche, le message à droite, la ligne gardée, le champ vidé ✓');

/* ---------- ① la fuite d'abord ---------- */
{
  const [x] = await lettresPour(bK);
  if (!x) fail('aucune lettre « message » pour Karim au relais');
  else {
    const tags = x.ev.tags.map(t => t[0]).sort().join(',');
    if (tags !== 'expiration,x') fail('des étiquettes en plus : ' + tags);
    const jours = Math.round((+x.ev.tags.find(t => t[0] === 'expiration')[1] - x.l.at / 1000) / 86400);
    if (jours !== 30) fail('un message expire au bout de ' + jours + ' jours');
    if (/Thales|Karim|Inès|Salut/.test(JSON.stringify(x.ev))) fail('le relais lit le message');
    const cles = Object.keys(x.l).sort().join(',');
    if (cles !== 'at,de,id,preuve,t,texte,v') fail('le message porte : ' + cles);
    if (Object.keys(x.l.de).sort().join(',') !== 'cle,prenom' || x.l.de.prenom !== 'Inès') fail('l’auteur porte : ' + JSON.stringify(x.l.de));
    for (const m of ['Martin', 'ines@prive.test', 'BTS SIO', 'Aztek', 'Roubaix', 'note très privée'])
      if (JSON.stringify(x.l).includes(m)) fail(`le message laisse sortir « ${m} »`);
    /* une lettre ne s'ouvre qu'avec SA clé */
    if (await ouvrir(bI.priv, x.ev.content)) fail('le message s’ouvre avec une autre clé que celle de Karim');
  }
  console.log('① la fuite d’abord : une étiquette, 30 jours, du chiffré ; le prénom, la clé, le texte, l’heure et la preuve — rien d’autre ✓');
}

/* ---------- ③ chez Karim : « Aujourd'hui », « Amis », la conversation ---------- */
await rouvrir(K.p);
const ligne = await attendre(() => K.p.evaluate(() => {
  const r = document.querySelector('.tr-amis .act-ami[data-sorte="message"]');
  return r ? { nom: r.querySelector('.act-verb').textContent.trim(), raison: r.querySelector('.act-vecu').textContent.trim(),
               qui: r.querySelector('.act-who').textContent.trim(), tete: !r.closest('.tranche').previousElementSibling?.classList.contains('tranche') } : null;
}), 'chez Karim, « Aujourd’hui » ne dit pas qu’Inès a écrit');
if (ligne){
  if (ligne.nom !== 'Inès Martin' || ligne.raison !== 't’a écrit' || !/^Salut Karim ! Tu as un contact chez Thales/.test(ligne.qui))
    fail('la ligne d’« Aujourd’hui » : ' + JSON.stringify(ligne));
  console.log('③ « Tes amis » chez Karim : « Inès Martin · t’a écrit · Salut Karim !… » ✓');
}
await K.p.screenshot({ path: `${SHOTS}/130-conv-aujourdhui.png` });
await ongletAmis(K.p);
{
  const n = await K.p.evaluate(() => document.querySelector('#piAmis .am-row .am-n')?.textContent.trim() || '');
  if (n !== '1') fail('la ligne d’Inès dans « Amis » ne compte pas le message non lu : « ' + n + ' »');
  const al = await K.p.evaluate(() => document.querySelector('#piAmis .am-row .ri-main').getAttribute('aria-label'));
  if (al !== 'Ouvrir Inès Martin, 1 message non lu') fail('le nom de la ligne : ' + al);
}
await K.p.screenshot({ path: `${SHOTS}/130-conv-amis.png` });
await K.p.evaluate(() => { location.hash = '#/aujourdhui'; });
await K.p.waitForSelector('.tr-amis .act-ami[data-sorte="message"] .act-main');
await K.p.click('.tr-amis .act-ami[data-sorte="message"] .act-main');
await K.p.waitForSelector('#msFil');
{
  const b = await bulles(K.p);
  if (b.length !== 1 || b[0].moi || b[0].texte !== 'Salut Karim !\nTu as un contact chez Thales ?') fail('chez Karim, la conversation : ' + JSON.stringify(b));
}
await fermerTout(K.p);
await K.p.waitForTimeout(300);
if (await K.p.$('.tr-amis .act-ami[data-sorte="message"]')) fail('lu, le message reste dans « Aujourd’hui »');
await ongletAmis(K.p);
if (await K.p.$('#piAmis .am-row .am-n')) fail('lu, le message se compte encore dans « Amis »');
console.log('③ un tap ouvre la conversation (Inès à gauche) ; lue, rien ne se compte plus ✓');

/* ---------- ④ en direct, des deux côtés ---------- */
await K.p.click('#piAmis .am-row .ri-main');
await K.p.waitForSelector('.overlay #amEcrire');
await K.p.click('.overlay #amEcrire');
await K.p.waitForSelector('#msFil');
await I.p.waitForTimeout(1500);
await ecrire(I.p, 'Tu es là ?');
await attendre(async () => (await bulles(K.p)).some(b => !b.moi && b.texte === 'Tu es là ?'), 'en direct, le message d’Inès n’arrive pas chez Karim', 15000);
await ecrire(K.p, 'Oui ! Je te présente Julie demain.');
await attendre(async () => (await bulles(I.p)).some(b => !b.moi && b.texte === 'Oui ! Je te présente Julie demain.'), 'en direct, la réponse de Karim n’arrive pas chez Inès', 15000);
{
  /* l'heure une fois par salve : « Tu es là ? » suit « Salut Karim ! »
     de quelques secondes, il ne la redit pas ; la réponse de Karim, si */
  const h = (await bulles(I.p)).map(b => b.heure).join();
  if (h !== 'true,false,true') fail('chez Inès, l’heure par bulle : ' + h + ' (attendu true,false,true)');
}
await K.p.screenshot({ path: `${SHOTS}/130-conv-karim.png` });
await I.p.screenshot({ path: `${SHOTS}/130-conv-ines-direct.png` });
console.log('④ en direct : ce qui s’écrit en face arrive, feuille ouverte, sans rien toucher ✓');

/* ---------- ⑤ sans réseau : « pas encore parti », puis parti, une fois ---------- */
await fermerTout(K.p);
await I.p.evaluate(async m => { const st = await import('./engine/storage.js'); await st.kvSet(st.RELAYS_KEY, JSON.stringify([m])); }, MORT);
const avant = (await lettresPour(bK)).length;
await ecrire(I.p, 'Merci, à demain');
await attendre(async () => { const b = await bulles(I.p); return b.at(-1)?.texte === 'Merci, à demain' && b.at(-1).attente; },
  'sans réseau, le message n’est pas gardé « pas encore parti »', 15000);
await I.p.screenshot({ path: `${SHOTS}/130-conv-attente.png` });
await I.p.evaluate(async u => { const st = await import('./engine/storage.js'); await st.kvSet(st.RELAYS_KEY, JSON.stringify([u])); }, relay.url);
await rouvrir(I.p);
await attendre(async () => (await lettresPour(bK)).length > avant, 'revenu le réseau, le message gardé ne part pas', 30000);
{
  const e = await reseauDe(I.p);
  if ((e.envois || []).some(x => x.lettre && x.lettre.t === 'message')) fail('parti, le message reste dans la file');
}
await rouvrir(K.p);
await attendre(async () => ((await convDe(K.p, ID_I)) || { m: [] }).m.some(m => m.texte === 'Merci, à demain'), 'chez Karim, le message gardé n’arrive pas');
await K.p.waitForTimeout(2500);
{
  const n = ((await convDe(K.p, ID_I)) || { m: [] }).m.filter(m => m.texte === 'Merci, à demain').length;
  const nL = (await lettresPour(bK)).filter(x => x.l.texte === 'Merci, à demain').length;
  if (n !== 1) fail('chez Karim, le message gardé arrive ' + n + ' fois');
  if (nL !== 1) fail('le message gardé est parti ' + nL + ' fois');
}
console.log('⑤ sans réseau : gardé « pas encore parti », parti au retour du réseau, reçu une fois ✓');

/* ---------- ⑥ le faussaire ---------- */
{
  /* il a la clé PUBLIQUE de Karim (elle est dans son QR) et celle d'Inès,
     pas la clé privée de Karim : sa preuve ne tient pas */
  const faux = await nouvelleCle();
  const id = nouvelId(), at = Date.now(), texte = 'Envoie-moi ton mot de passe';
  const l = { v: 1, t: 'message', id, de: { prenom: 'Karim', cle: bK.pub }, texte, at,
              preuve: await prouver(faux.priv, bI.pub, 'message·' + id + '·' + at + '·' + texte) };
  await I.p.evaluate(async ([pubI, scelle, exp]) => {
    const bo = await import('./engine/boite.js'), r = await import('./ui/reseau.js');
    await r.publier(await r.evenement([['x', await bo.etiquetteBoite(pubI)], ['expiration', String(exp)]], scelle));
  }, [bI.pub, await sceller(bI.pub, l), Math.floor(Date.now() / 1000) + 86400]);
  await rouvrir(I.p);
  const lu = await attendre(async () => ((await reseauDe(I.p)) || {}).lus?.some(x => x.id === id), 'la lettre forgée n’a pas été lue : la mesure ne mesure rien');
  if (lu && ((await convDe(I.p, ID_K)) || { m: [] }).m.some(m => m.texte === texte)) fail('un message écrit au nom de Karim, sans sa clé, est entré dans la conversation');
  else if (lu) console.log('⑥ un message au nom de Karim, prouvé d’une autre clé, est lu et jeté ✓');
}

/* ---------- ⑦ un ami retiré emporte la conversation ---------- */
await I.p.evaluate(async id => {
  const { S, saveProfile } = await import('./ui/state.js');
  const { retirerAmi } = await import('./engine/amis.js');
  S.profile.amis = retirerAmi(S.profile.amis, id);
  saveProfile();
}, ID_K);
await I.p.waitForTimeout(400);
await rouvrir(I.p);
if (await attendre(async () => !(await convDe(I.p, ID_K)), 'Karim retiré, sa conversation reste sur le téléphone d’Inès', 10000))
  console.log('⑦ un ami retiré emporte sa conversation ✓');

/* ---------- ⑧ pouce et poste, clair et sombre, 320 px texte doublé ---------- */
const CONV = { v: 1, fils: { [ID_K]: { vu: 0, m: [
  { id: 'm0000001', moi: true, texte: 'Salut Karim !\nTu as un contact chez Thales Digital Identity and Security ?', at: Date.now() - 7200000 },
  { id: 'm0000002', moi: false, texte: 'Oui, Julie Marchand, au recrutement. Je lui en parle demain matin et je reviens vers toi.', at: Date.now() - 3600000 },
  { id: 'm0000003', moi: false, texte: 'C’est bon, elle attend ton mail.', at: Date.now() - 60000 }] } } };
for (const [nom, o] of [['pouce', {}], ['pouce-sombre', { sombre: true }], ['poste', { vp: { width: 1280, height: 800 } }],
                        ['poste-sombre', { vp: { width: 1280, height: 800 }, sombre: true }], ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  /* une boîte neuve : ce que le relais garde pour la vraie Inès ne
     vient pas se mêler à la conversation semée */
  const E = await ecran({ ...INES, boite: await nouvelleCle() }, PISTES_I, { ...o, conv: CONV });
  if (o.gros) await E.p.addStyleTag({ content: 'html{font-size:200% !important}' });
  await ongletAmis(E.p);
  const n = await E.p.evaluate(() => document.querySelector('#piAmis .am-row .am-n')?.textContent.trim() || '');
  if (n !== '2') fail(nom + ' : la ligne de Karim compte « ' + n + ' »');
  await E.p.screenshot({ path: `${SHOTS}/130-conv-amis-${nom}.png` });
  const poste = (o.vp || {}).width > 900;
  if (poste){
    /* au poste, le geste vit dans le détail, contourné */
    const b = await E.p.evaluate(() => { const x = document.querySelector('.am-detail #amEcrire');
      return x ? { mot: x.innerText.replace(/\s+/g, ' ').trim(), contour: x.classList.contains('btn-contour') } : null; });
    if (!b || !/^Écrire à Karim 2$/.test(b.mot) || !b.contour) fail(nom + ' : le détail ne porte pas « Écrire à Karim » : ' + JSON.stringify(b));
    await E.p.click('.am-detail #amEcrire');
  } else {
    await E.p.click('#piAmis .am-row .ri-main');
    await E.p.waitForSelector('.overlay #amEcrire');
    await E.p.click('.overlay #amEcrire');
  }
  await E.p.waitForSelector('#msFil');
  await E.p.waitForTimeout(500);
  const fautes = await E.p.evaluate(() => {
    const b = [...document.querySelectorAll('.overlay .modal-b')].pop();
    const f = [];
    if (b.scrollWidth > b.clientWidth + 1) f.push('la feuille défile latéralement');
    for (const p of b.querySelectorAll('.ms-m p')) if (p.scrollWidth > p.clientWidth + 1) f.push('une bulle déborde');
    const pied = [...document.querySelectorAll('.overlay .modal-f')].pop();
    for (const x of pied.querySelectorAll('#msChamp, #msEnvoyer')){
      const r = x.getBoundingClientRect(), m = pied.getBoundingClientRect();
      if (r.right > m.right + 1 || r.left < m.left - 1) f.push(x.id + ' sort du pied');
      if (r.height < 43) f.push(x.id + ' fait ' + Math.round(r.height) + ' px');
    }
    /* l'heure une fois par salve : les deux messages de Karim, à une
       heure d'écart, la disent chacun ; aucune bulle ne la répète */
    const heures = [...b.querySelectorAll('.ms-m')].map(li => !!li.querySelector('time'));
    if (heures.join() !== 'true,true,true') f.push('l’heure : ' + heures.join());
    /* le dernier message est à l'écran : la conversation s'ouvre en bas */
    const der = b.querySelector('.ms-m:last-child').getBoundingClientRect(), bb = b.getBoundingClientRect();
    if (der.bottom > bb.bottom + 1) f.push('le dernier message est sous le pied');
    return f;
  });
  /* à la souris, un contrôle fait 32 px (§5) : la hauteur ne se compte qu'au doigt */
  const vraies = poste ? fautes.filter(x => !/ fait \d+ px$/.test(x)) : fautes;
  if (vraies.length) fail(nom + ' : ' + vraies.join(' ; '));
  await E.p.screenshot({ path: `${SHOTS}/130-conv-${nom}.png` });
  await E.ctx.close();
}
console.log('⑧ pouce, poste, sombre, 320 px texte doublé : rien ne déborde, la conversation s’ouvre sur le dernier message ✓');

const vraies = errors.filter(e => !/net::ERR|Failed to load resource|WebSocket/.test(e));
if (vraies.length) fail('erreurs console : ' + vraies.join(' | '));
await browser.close();
server.close();
relay.close();
console.log(process.exitCode ? 'E2E messages : ÉCHEC' : 'E2E messages : OK');
process.exit(process.exitCode || 0);

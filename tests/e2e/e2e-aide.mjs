/* ============================================================
   OpenContact — e2e : CEUX QUI AIDENT (lot R7)
   (docs/propositions/R7-ceux-qui-aident.md, validée le 20 octobre 2026)

   Ouvert à tous depuis la 7.0.0, sur l'app réelle, joué
   à deux : Karim décroche chez Aztek, Inès y postule.
   ① LA FUITE D'ABORD, par le vrai bouton : le profil que « Mon QR »
     donne ne porte, en plus de l'identifiant, du nom, du parcours et de
     la clé publique, que `aide` — des mots de la table — ; ni adresse,
     ni formation, ni pistes, ni notes. Ce qui est écrit sous le QR est
     ce qui part ;
   ② « Décroché » : la feuille propose l'entreprise dans le parcours et
     les trois cases ; rien ne s'écrit avant « Enregistrer » ; le mot que
     le profil ne dit pas se choisit, jamais deviné ; plus d'emoji ;
   ③ Moi : la rangée « Je peux aider » et ses cases, enregistrées au tap ;
   ④ chez Inès : « Karim y est en alternance » ouvre « Demander à
     Karim », où ce qu'il offre devient un choix ; « Écrire à Karim »
     pose la phrase dans la conversation, SANS l'envoyer ; sa ligne dans
     « Amis » dit ce qu'il offre ;
   ⑤ le merci : une piste qu'il a portée répond, « Le dire à Karim » pose
     le merci ; écrit, la ligne se tait ;
   pouce clair et sombre, poste ; zéro erreur console.
   Trois mutations : un champ du profil glissé dans `aide`, le message
   prêt qui part tout seul, le merci qui ne se tait plus.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { nouvelleCle } from '../../engine/boite.js';
import { readFile } from 'fs/promises';
import path from 'path';

const relay = await startLocalRelay({ tls: true });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const auj = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const AUJ = iso(auj), MOIS = AUJ.slice(0, 7);
const bK = await nouvelleCle(), bI = await nouvelleCle();
const KARIM_ID = 'KarimKarimKarimKarim01', INES_ID = 'InesInesInesInesInes01';

const KARIM = {
  name: 'Karim Benali', email: 'karim@prive.test', phone: '0611223344', formation: 'BTS SIO', ecole: 'Lycée Baggio',
  ville: 'Lille', recherche: 'alternance', amiId: KARIM_ID, boite: bK, aide: ['parler', 'relire'],
  amis: [{ id: INES_ID, nom: 'Inès Martin', parcours: [], cle: bI.pub, recu: 1 }]
};
const PISTES_KARIM = [
  { id: 'kaz', name: 'Aztek', city: 'Roubaix', status: 'reply', notes: 'NOTE-PRIVEE-KARIM', updatedAt: 2,
    contacts: [{ id: 'kc', name: 'Julie Privée', email: 'julie@secret.test' }] }];
/* Inès a Karim pour ami — son profil tel que « Mon QR » l'aurait donné
   après « Décroché » : en alternance chez Aztek depuis ce mois-ci */
const KARIM_AMI = { id: KARIM_ID, nom: 'Karim Benali', cle: bK.pub, aide: ['parler', 'relire'], recu: 1,
  parcours: [{ entreprise: 'Aztek', quoi: 'alternance', debut: MOIS, fin: '' }] };
const INES = { name: 'Inès Martin', email: 'ines@prive.test', formation: 'BTS SIO', recherche: 'alternance',
  amiId: INES_ID, boite: bI, amis: [KARIM_AMI] };
const PISTES_INES = [
  { id: 'iaz', name: 'AZTEK SAS', city: 'Roubaix', status: 'todo', updatedAt: 5 },
  /* un contact que Karim m'a donné, et la piste vient de répondre */
  { id: 'ith', name: 'Thales', city: 'Lille', status: 'reply', updatedAt: 6,
    contacts: [{ id: 'tc', name: 'Paul Martin', email: 'paul@thales.test', via: 'Karim' }],
    history: [{ d: AUJ, t: 'Statut → Réponse' }] }
];

const fichier = async f => readFile(path.join(ROOT, f), 'utf8');
async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false,
                            pistes, profil, messages = null, mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, ignoreHTTPSErrors: true, colorScheme: sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  await ctx.addInitScript(() => {
    window.__copie = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copie.push(String(t)); } }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([ps, pr, url, ms]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
    if (ms) await st.kvSet(st.MESSAGES_KEY, JSON.stringify(ms)); else await st.kvDel(st.MESSAGES_KEY);
  }, [pistes, profil, relay.url, messages]);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(400);
  return { ctx, p };
}
const dessus = p => p.evaluate(() => {
  const o = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
  return o ? { titre: o.querySelector('.mh-t')?.textContent.trim(),
               pied: [...o.querySelectorAll('.modal-f button')].map(b => b.textContent.trim()).join('|') } : null;
});
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};
const profilStocke = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}');
});
const ouvrirFiche = async (p, id) => {
  await fermer(p);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForTimeout(450);
};
const viderToast = p => p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.textContent = ''; });
const toastDe = p => p.evaluate(() => document.querySelector('#toast')?.textContent.replace('✕', '').trim() || '');

/* ---------- ① la fuite d'abord ---------- */
async function fuite(mutations = {}){
  const { ctx, p } = await ecran('karim', { profil: KARIM, pistes: PISTES_KARIM, mutations });
  /* préversion allumée, les amis vivent dans l'onglet Réseau (lot R1) :
     « Mon QR » s'ouvre par sa fonction, le chemin n'est pas l'objet ici */
  await p.evaluate(async () => (await import('./ui/amis.js')).openMonQR());
  await p.waitForSelector('#mqCopier');
  await p.waitForSelector('.qr-wrap svg');
  await p.click('#mqCopier');
  await p.waitForTimeout(150);
  const txt = await p.evaluate(() => window.__copie.at(-1) || '');
  const d = await p.evaluate(async t => {
    const { decodeOCA, extraireOCA } = await import('./engine/exchange.js');
    return decodeOCA(extraireOCA(t));
  }, txt);
  const dit = await p.evaluate(() => document.querySelector('#mqAide')?.textContent.replace(/\s+/g, ' ').trim() || '');
  await ctx.close();
  return { d, dit };
}
{
  const { d, dit } = await fuite();
  ok(d && Object.keys(d).sort().join() === 'aide,cle,id,kind,nom,parcours,v',
     '① le profil donné porte ses champs et `aide`, rien d’autre — ' + (d && Object.keys(d).sort().join()));
  ok(d && JSON.stringify(d.aide) === '["parler","relire"]', '① `aide` : des mots de la table — ' + JSON.stringify(d && d.aide));
  const sans = JSON.stringify({ ...d, id: undefined, cle: undefined });
  const fuites = ['karim@prive.test', '0611223344', 'BTS SIO', 'Baggio', 'Lille', 'NOTE-PRIVEE', 'Julie', 'Aztek', 'Inès']
    .filter(x => sans.includes(x));
  ok(!fuites.length, '① ni adresse, ni formation, ni pistes, ni notes, ni ami' + (fuites.length ? ' — sort : ' + fuites.join(', ') : ''));
  ok(dit === 'Je peux aider : parler de mon entreprise · relire un CV', '① sous le QR, ce qui part : « ' + dit + ' »');
}

/* ---------- ② « Décroché » ---------- */
async function decrocher(o = {}){
  const { ctx, p } = await ecran('decroche', { profil: o.profil || KARIM, pistes: PISTES_KARIM, vp: o.vp, sombre: o.sombre });
  await ouvrirFiche(p, 'kaz');
  await p.click('#fiClore');
  await p.waitForSelector('.pick-close[data-r="won"]');
  await viderToast(p);
  await p.click('.pick-close[data-r="won"]');
  await p.waitForTimeout(450);
  return { ctx, p };
}
{
  const { ctx, p } = await decrocher();
  const f = await dessus(p);
  ok(f && f.titre === 'Décroché' && f.pied === 'Enregistrer', '② après « Décroché », la feuille : ' + JSON.stringify(f));
  const etat = await p.evaluate(() => ({
    parcours: document.querySelector('#dcParcours')?.textContent.replace(/\s+/g, ' ').trim(),
    coche: document.querySelector('#dcParcours')?.getAttribute('aria-pressed'),
    cases: [...document.querySelectorAll('[data-aide]')].map(b => b.textContent.trim() + (b.classList.contains('on') ? ' ✓' : '')),
    puces: document.querySelectorAll('[data-quoi]').length
  }));
  ok(etat.parcours === 'Ajouter Aztek à mon parcours Alternance · depuis ' + MOIS.slice(0, 4) && etat.coche === 'true',
     '② « Ajouter Aztek à mon parcours », cochée, le mot du profil — ' + JSON.stringify(etat.parcours));
  ok(etat.cases.join('|') === 'Parler de mon entreprise ✓|Relire un CV ✓|Présenter quelqu’un' && etat.puces === 0,
     '② les trois cases, ce que j’offre déjà coché, et aucune puce quand le profil dit le mot — ' + etat.cases.join('|'));
  ok(!/🎉/.test(await toastDe(p)), '② plus d’emoji : la feuille remplace le toast');
  await p.screenshot({ path: `${SHOTS}/r7-decroche-pouce.png` });
  /* rien ne s'écrit avant « Enregistrer » */
  await p.click('[data-aide="presenter"]');
  const avant = await profilStocke(p);
  ok(JSON.stringify(avant.aide) === '["parler","relire"]' && !(avant.parcours || []).length, '② rien ne s’écrit avant « Enregistrer »');
  await p.click('.overlay:not(.ov-out) .modal-f button:has-text("Enregistrer")');
  await p.waitForTimeout(350);
  const apres = await profilStocke(p);
  const e = (apres.parcours || [])[0] || {};
  ok(e.entreprise === 'Aztek' && e.quoi === 'alternance' && e.debut === MOIS && !e.fin && e.pisteId === 'kaz',
     '② « Enregistrer » : Aztek entre dans le parcours, en alternance depuis ce mois-ci — ' + JSON.stringify(e));
  ok(JSON.stringify(apres.aide) === '["parler","relire","presenter"]', '② et ce que j’offre — ' + JSON.stringify(apres.aide));
  ok((await dessus(p))?.titre !== 'Décroché', '② la feuille se ferme, la fiche reste dessous');
  await ctx.close();
}
{
  /* le profil ne dit pas ce qu'on cherche : le mot se choisit, jamais deviné */
  const { ctx, p } = await decrocher({ profil: { ...KARIM, recherche: '' } });
  const puces = await p.evaluate(() => [...document.querySelectorAll('[data-quoi]')].map(b => b.textContent.trim()).join('|'));
  ok(puces === 'Stage|Alternance|Emploi', '② sans mot au profil, trois puces — ' + puces);
  await p.click('.overlay:not(.ov-out) .modal-f button:has-text("Enregistrer")');
  await p.waitForTimeout(300);
  ok(!((await profilStocke(p)).parcours || []).length, '② sans mot choisi, rien n’entre dans le parcours');
  await ctx.close();
  const b = await decrocher({ profil: { ...KARIM, recherche: '' } });
  await b.p.click('[data-quoi="stage"]');
  await b.p.click('.overlay:not(.ov-out) .modal-f button:has-text("Enregistrer")');
  await b.p.waitForTimeout(300);
  ok(((await profilStocke(b.p)).parcours || [])[0]?.quoi === 'stage', '② « Stage » choisi : la ligne entre en stage');
  await b.ctx.close();
}

/* ---------- ③ Moi ---------- */
{
  const { ctx, p } = await ecran('moi', { profil: KARIM, pistes: PISTES_KARIM });
  await p.evaluate(() => { location.hash = '#/moi'; });
  await p.waitForSelector('#moiAide');
  const r = await p.evaluate(() => document.querySelector('#moiAide').textContent.replace(/\s+/g, ' ').trim());
  ok(r === 'Je peux aider 2', '③ dans Moi, la rangée « Je peux aider » et son compte — « ' + r + ' »');
  await p.screenshot({ path: `${SHOTS}/r7-moi-pouce.png` });
  await p.click('#moiAide');
  await p.waitForTimeout(300);
  ok((await dessus(p))?.titre === 'Je peux aider', '③ elle ouvre ses cases');
  await p.click('[data-aide="relire"]');
  await p.waitForTimeout(200);
  ok(JSON.stringify((await profilStocke(p)).aide) === '["parler"]', '③ une case décochée s’enregistre au tap');
  await fermer(p);
  const r2 = await p.evaluate(() => document.querySelector('#moiAide')?.textContent.replace(/\s+/g, ' ').trim());
  ok(r2 === 'Je peux aider 1', '③ la rangée suit — « ' + r2 + ' »');
  await ctx.close();
  /* sans personne en face, une offre ne va nulle part */
  const seul = await ecran('moi-seul', { profil: { name: 'Léa', recherche: 'stage' }, pistes: [] });
  await seul.p.evaluate(() => { location.hash = '#/moi'; });
  await seul.p.waitForTimeout(400);
  ok(!await seul.p.$('#moiAide'), '③ sans ami ni QR donné : pas de rangée');
  await seul.ctx.close();
}

/* ---------- ④ chez Inès : la demande ---------- */
async function demander(o = {}){
  const { ctx, p } = await ecran('ines', { profil: INES, pistes: PISTES_INES, vp: o.vp, sombre: o.sombre,
                                          mutations: o.mutations || {} });
  await ouvrirFiche(p, 'iaz');
  const bandeau = await p.evaluate(() => document.querySelector('#fiVecu')?.textContent.replace(/\s+/g, ' ').trim() || '');
  await p.click('#fiVecu');
  await p.waitForTimeout(350);
  return { ctx, p, bandeau };
}
const messagesStockes = p => p.evaluate(async id => {
  const st = await import('./engine/storage.js');
  const m = JSON.parse(await st.kvGet(st.MESSAGES_KEY) || 'null');
  return ((m && m.fils && m.fils[id]) || { m: [] }).m.length;
}, KARIM_ID);
async function jouerDemande(mutations){
  const { ctx, p, bandeau } = await demander({ mutations });
  const f = await dessus(p);
  const choix = await p.evaluate(() => [...document.querySelectorAll('[data-sorte]')].map(b => b.textContent.trim()));
  await p.click('[data-sorte="parler"]');
  const mot = await p.evaluate(() => document.querySelector('#dmMot')?.textContent.trim());
  await p.screenshot({ path: `${SHOTS}/r7-demander-pouce.png` });
  await p.click('.overlay:not(.ov-out) .modal-f button:has-text("Écrire à Karim")');
  await p.waitForSelector('#msChamp');
  await p.waitForTimeout(700);
  const champ = await p.evaluate(() => document.querySelector('#msChamp').value);
  const titre = (await dessus(p))?.titre;
  const n = await messagesStockes(p);
  await ctx.close();
  return { bandeau, f, choix, mot, champ, titre, n };
}
const ATTENDU = 'Salut Karim, tu es en alternance chez AZTEK SAS ? Je cherche une alternance et j’aimerais comprendre comment ça se passe là-bas. '
  + 'Tu aurais 20 minutes cette semaine ou la suivante pour m’en parler ?';
{
  const r = await jouerDemande();
  ok(r.bandeau === 'Karim y est en alternance', '④ le bandeau : « ' + r.bandeau + ' »');
  ok(r.f && r.f.titre === 'Demande' && r.f.pied === 'Écrire à Karim', '④ « Demande », « Écrire à Karim » au pied — ' + JSON.stringify(r.f));
  ok(r.choix.join('|') === 'À qui écrire chez AZTEK SAS|20 minutes pour parler d’AZTEK SAS|Relire mon CV',
     '④ ce que Karim offre devient un choix — ' + r.choix.join('|'));
  ok(r.mot === ATTENDU, '④ la phrase change sous les yeux — « ' + r.mot + ' »');
  ok(r.titre === 'Karim Benali' && r.champ === ATTENDU, '④ « Écrire à Karim » pose la phrase dans votre conversation');
  ok(r.n === 0, '④ rien n’est parti : la phrase attend la flèche');
}
{
  /* sa ligne dans « Amis » dit ce qu'il offre */
  const { ctx, p } = await ecran('ines-amis', { profil: INES, pistes: PISTES_INES });
  await p.evaluate(async () => (await import('./ui/amis.js')).openMesAmis());
  await p.waitForSelector('.am-row .ri-sub');
  const s = await p.evaluate(() => document.querySelector('.am-row .ri-sub')?.textContent.replace(/\s+/g, ' ').trim());
  ok(/peut parler de son entreprise$/.test(s || ''), '④ dans « Amis », sa ligne dit ce qu’il offre — « ' + s + ' »');
  await ctx.close();
}

/* ---------- ⑤ le merci ---------- */
async function merci(o = {}){
  const { ctx, p } = await ecran('merci', { profil: INES, pistes: PISTES_INES, messages: o.messages || null,
                                           mutations: o.mutations || {}, vp: o.vp, sombre: o.sombre });
  await ouvrirFiche(p, 'ith');
  const ligne = await p.evaluate(() => document.querySelector('#fiMerci')?.textContent.replace(/\s+/g, ' ').trim() || '');
  return { ctx, p, ligne };
}
const DEJA_DIT = { v: 1, fils: { [KARIM_ID]: { m: [{ id: 'msg-merci-01', moi: true, texte: 'merci !', at: Date.now() - 60000 }], vu: Date.now() } } };
{
  const { ctx, p, ligne } = await merci();
  ok(ligne === 'Le dire à Karim', '⑤ Thales a répondu : « ' + ligne + ' »');
  await p.screenshot({ path: `${SHOTS}/r7-merci-pouce.png` });
  await p.click('#fiMerci');
  await p.waitForSelector('#msChamp');
  await p.waitForTimeout(300);
  const champ = await p.evaluate(() => document.querySelector('#msChamp').value);
  ok(champ === 'Thales m’a répondu, merci pour ton aide !', '⑤ le merci, prêt dans la conversation — « ' + champ + ' »');
  await ctx.close();
}
async function merciDit(mutations){
  const { ctx, p, ligne } = await merci({ messages: DEJA_DIT, mutations });
  await ctx.close();
  return ligne;
}
ok(!await merciDit(), '⑤ déjà écrit à Karim depuis la réponse : la ligne se tait');

/* ---------- les deux ergonomies, les deux thèmes ---------- */
for (const [nom, vp, sombre] of [['pouce-sombre', { width: 390, height: 844 }, true], ['poste', { width: 1280, height: 800 }, false],
                                 ['poste-sombre', { width: 1280, height: 800 }, true]]){
  const d = await decrocher({ vp, sombre });
  ok((await dessus(d.p))?.titre === 'Décroché', `${nom} : la feuille « Décroché »`);
  await d.p.screenshot({ path: `${SHOTS}/r7-decroche-${nom}.png` });
  await d.ctx.close();
  const m = await demander({ vp, sombre });
  ok((await dessus(m.p))?.titre === 'Demande', `${nom} : la feuille « Demande »`);
  await m.p.screenshot({ path: `${SHOTS}/r7-demander-${nom}.png` });
  await m.ctx.close();
}

/* ---------- les mutations : chaque garde doit rougir ---------- */
async function muter(nom, f, avant, apres, rejouer, rougit){
  const src = await fichier(f);
  if (!src.includes(avant)){ ko++; console.log(`ÉCHEC — mutation ${nom} : le texte visé n’existe plus dans ${f}`); return; }
  const body = src.replace(avant, apres);
  console.log(`mutation ${nom} : le fichier servi est bien modifié ✓`);
  const r = await rejouer({ [f]: body });
  ok(rougit(r), `mutation ${nom} : la garde rougit`);
}
await muter('① la formation glissée dans `aide`', 'engine/amis.js',
  'if (aide.length) d.aide = aide;', 'if (aide.length) d.aide = [...aide, p.formation];',
  m => fuite(m), r => !r.d || JSON.stringify(r.d.aide) !== '["parler","relire"]' || /BTS SIO/.test(JSON.stringify(r.d)));
await muter('② le message prêt qui part tout seul', 'ui/messages.js',
  "queueMicrotask(() => champ.dispatchEvent(new Event('input'))); }",
  "queueMicrotask(() => champ.dispatchEvent(new Event('input'))); setTimeout(() => envoyer(), 50); }",
  m => jouerDemande(m), r => r.n !== 0);
await muter('③ le merci qui ne se tait plus', 'engine/aide.js',
  'if (t >= depuis) continue;', 'if (t >= depuis && false) continue;',
  m => merciDit(m), ligne => ligne === 'Le dire à Karim');

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
server.close();
relay.close();
console.log(ko ? `\nE2E ceux qui aident : ${ko} ÉCHEC(S)` : '\nE2E ceux qui aident : OK');
process.exit(ko ? 1 : 0);

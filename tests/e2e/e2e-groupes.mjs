/* ============================================================
   Les groupes — « une demande faite comme dans un groupe : chacun est
   libre de partager à son tour » (docs/reseau.md, lot 5, décisions 22
   à 27)

   Inès crée « BTS SIO Lille ». Karim tape le code, Sofia colle
   l'invitation. On s'y écrit, on s'y donne des pistes — sans être là
   en même temps.

   Joué à TROIS (§8, règle 4), sur un relais local qui GARDE les
   événements comme les relais publics mesurés :

   ① LA FUITE D'ABORD : le relais ne voit qu'une étiquette, une
     expiration et du bruit — ni le nom du groupe, ni un prénom, ni un
     mot, ni une piste ; ouvert avec le code, un don de pistes ne porte
     que la vue communautaire (jamais une note) ; un membre ne porte que
     son prénom (décision 26) ; le profil donné à un ami ne porte aucun
     groupe ;
   ② créer : sans groupe, la boîte de « Réseau » n'a que « Mes amis »
     et UN geste, « Nouveau groupe », qui ouvre « Créer » ou
     « Rejoindre » ; le nom, puis le groupe s'ouvre sur son invitation
     (QR + code) ; la boîte le montre en conversation, « Nouveau groupe »
     en dernier ;
   ③ rejoindre en tapant le code : « Le groupe verra ton prénom :
     Karim. » AVANT le geste ; en collant l'invitation (Recevoir ›
     Texte) : l'aperçu porte le nom du groupe ; le code SEUL, collé
     au même endroit, est reconnu aussi ;
   ④ un mot : en direct chez qui a le groupe ouvert, marqué d'un point
     dans la boîte chez qui ne l'a pas ; sept jours sur le relais
     (NIP-40), et l'app l'oublie passé ce délai ;
   ⑤ des pistes en différé : Inès donne, Sofia les reçoit en rouvrant
     l'app — aperçu, fusion, « Annuler », « dans tes pistes » ;
   ⑥ quitter : « Annuler » le rattrape ; sinon le départ se dit après
     la barre, et Karim sort de la liste des autres ;
   ⑦ cinq groupes au plus : « Nouveau groupe » disparaît,
     une invitation dit pourquoi on n'entre pas ;
   ⑧ sans prénom, « Créer » ouvre le profil sur le nom ;
   ⑨ pouce et poste, sombre, 320 px texte doublé : rien ne déborde ;
     zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, ouvrirRecevoir } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, lireInvitation } from '../../engine/groupe.js';
import { rassembler } from '../../engine/portage.js';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => {
  const x = (ev.tags || []).find(t => t[0] === 'x');
  if (x && /^oc-groupe-/.test(x[1])) evs.push(ev);
  return null;
} });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ID = { ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', sofia: 'SofiaSofiaSofia000001' };
const NOM = { ines: 'Inès Martin', karim: 'Karim Benali', sofia: 'Sofia Haddad' };
const profil = (qui, o = {}) => ({ name: NOM[qui], email: qui + '@prive.test', phone: '06 12 34 56 78', formation: 'BTS SIO',
  amiId: ID[qui], ...o });
const PISTES = {
  ines: [{ id: 'ia', name: 'Advens', city: 'Lille', domain: 'cyber', status: 'todo', updatedAt: 5, notes: 'note privée d’Inès',
           contacts: [{ id: 'ij', name: 'Julie Marchand', role: 'RH', email: 'julie@advens.test' }],
           history: [{ d: '2026-10-01', t: 'relancée en privé' }], status: 'sent', appliedAt: '2026-10-01',
           nextAction: '2026-10-20', nextActionText: 'Relancer Julie' },
         { id: 'ib', name: 'Wallix', city: 'Lille', status: 'todo', updatedAt: 4 }],
  karim: [],
  sofia: [{ id: 'sq', name: 'Quick', city: 'Lille', status: 'todo', updatedAt: 3 }]
};

async function ecran(qui, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true,
    colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(qui + ' : ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(qui + ' : ' + m.text()); });
  await p.goto(base + '/#/reseau', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [PISTES[qui] || [], profil(qui, o.profil), relay.url]);
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
const titreFeuille = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .mh-t')].pop()?.textContent.trim() || '');
const texteEcran = p => p.evaluate(() => document.body.innerText + ' ' +
  [...document.querySelectorAll('[aria-label]')].map(x => x.getAttribute('aria-label')).join(' '));
const attendreQue = async (p, fn, arg, ms = 20000, quoi = '') => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(300))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  fail('attendu, jamais vu : ' + quoi);
  return false;
};
/* « Groupes » (ou « Nouveau groupe ») → « Créer un groupe » / « Rejoindre un groupe » */
const nouveau = async (p, quoi) => {
  await p.click('#ecGrNeuf');
  await p.waitForSelector('#' + quoi);
  await p.click('#' + quoi);
};
/* Ajouter › Recevoir › Texte : là où se colle tout ce qu'on te tend */
const recevoirTexte = async (p, txt) => {
  await ouvrirRecevoir(p, 'texte');
  await p.fill('#rcTxt', txt);
};
const fil = p => p.evaluate(() => [...document.querySelectorAll('#grFil .gr-m')].map(li =>
  [li.querySelector('.gr-qui b')?.textContent.trim(), li.querySelector('p')?.textContent.trim()].join(' : ')));

/* ---------- ② Inès crée « BTS SIO Lille » ---------- */
const I = await ecran('ines');
{
  /* la boîte vide : une phrase, un geste — ni bouton « Créer », ni
     « Rejoindre », ni les gestes des amis jetés en vrac */
  const t = await I.p.evaluate(() => [...document.querySelectorAll('.bx-liste button')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  if (t.join('|') !== 'Mes amis|Nouveau groupe') fail('la boîte, sans groupe : ' + JSON.stringify(t));
  if (await I.p.$('#ecPromo')) fail('la porte « Partage en groupe » est encore là');
  /* Donner et Recevoir ont quitté « Réseau » (R1) : le + et « Mes pistes » */
  const gestes = await I.p.evaluate(() => [...document.querySelectorAll('#view-reseau button')]
    .map(b => b.textContent.trim()).filter(t => /^(Donner|Recevoir)$/.test(t)));
  const restes = await I.p.evaluate(() => ['#ecScan', '#ecMonQR', '#ecGrCreer', '#ecGrRejoindre', '.ec-amis', '.ec-groupes']
    .filter(s => document.querySelector('#view-reseau ' + s)));
  if (gestes.length) fail('« Réseau » porte encore Donner ou Recevoir : ' + JSON.stringify(gestes));
  if (restes.length) fail('« Réseau » garde des gestes jetés en vrac : ' + restes.join(', '));
}
/* le téléphone d'Inès SAIT partager : une feuille de partage posée
   qui enregistre ce qu'on lui donne (Chromium sous Linux n'en a pas).
   C'est ce texte-là que Sofia collera — jamais une invitation fabriquée
   par le test, qui prouverait le moteur et pas le geste. */
await I.p.evaluate(() => {
  window.__envoye = [];
  navigator.canShare = () => true;
  navigator.share = async d => { window.__envoye.push(d); };
});
await nouveau(I.p, 'grCreer');
await I.p.waitForSelector('#grNom');
if (await I.p.evaluate(() => !document.querySelector('#grCreerGo').hidden)) fail('« Créer » sans nom');
await I.p.fill('#grNom', '  BTS SIO   Lille ');
await I.p.click('#grCreerGo');
await I.p.waitForSelector('#grInviter .qr-wrap svg');
const code = await I.p.evaluate(() => document.querySelector('#grCodeAff').textContent.trim());
if (!/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}$/.test(code)) fail('le code affiché : ' + code);
if (await titreFeuille(I.p) !== 'BTS SIO Lille') fail('le titre du groupe : ' + await titreFeuille(I.p));
/* L'INVITATION SE NOMME ET S'ENVOIE D'UN GESTE. Un QR et un code posés
   sans un mot dans un fil vide ne disaient pas à quoi ils servaient ;
   et « Copier » laissait trois gestes à faire (ouvrir la conversation de
   la classe, coller, envoyer) là où le téléphone sait le faire en un. */
{
  const inv = await I.p.evaluate(() => ({
    t: document.querySelector('#grInviter .gr-inv-t')?.textContent.trim() || '',
    b: document.querySelector('#grInviter #grCopier')?.textContent.trim() || ''
  }));
  if (inv.t !== 'Inviter') fail('l’invitation ne se nomme pas : « ' + inv.t + ' »');
  if (inv.b !== 'Envoyer') fail('au doigt, sur un téléphone qui sait partager, l’invitation dit « ' + inv.b + ' » et non « Envoyer »');
  await I.p.click('#grCopier');
  await attendreQue(I.p, () => window.__envoye.length === 1, null, 3000, 'la feuille de partage reçoit l’invitation');
}
const invitationTexte = await I.p.evaluate(() => window.__envoye[0]?.text || '');
if (!invitationTexte.includes('« BTS SIO Lille »') || !/Ajouter › Recevoir › Texte/.test(invitationTexte))
  fail('le message envoyé ne dit ni le groupe ni où le coller : « ' + invitationTexte + ' »');
await I.p.waitForTimeout(450);
await I.p.screenshot({ path: `${SHOTS}/110-groupe-cree-pouce.png` });
console.log('② Inès crée « BTS SIO Lille » : le groupe s’ouvre sur « Inviter » (QR + ' + code + '), « Envoyer » part par la feuille de partage ✓');

/* ---------- ③ Karim tape le code ---------- */
const K = await ecran('karim');
await nouveau(K.p, 'grRejoindre');
await K.p.waitForSelector('#grCode');
await K.p.fill('#grCode', code.toUpperCase().replace(/-/g, ' '));
{
  const qui = await K.p.evaluate(() => document.querySelector('#grQui').textContent.trim());
  if (qui !== 'Le groupe verra ton prénom : Karim.') fail('avant de rejoindre : « ' + qui + ' »');
}
await K.p.waitForTimeout(300);
await K.p.screenshot({ path: `${SHOTS}/111-groupe-rejoindre-pouce.png` });
await K.p.click('#grRejoindreGo');
await K.p.waitForSelector('#grMot');
await attendreQue(K.p, () => /Inès/.test(document.querySelector('#grMembres')?.textContent || ''), null, 20000, 'Inès dans les membres chez Karim');
{
  const m = await K.p.evaluate(() => document.querySelector('#grMembres').textContent.replace(/\s+/g, ' ').trim());
  if (m !== 'Inès · toi') fail('les membres chez Karim : « ' + m + ' »');
  if (await titreFeuille(K.p) !== 'BTS SIO Lille') fail('Karim a appris le nom du groupe : ' + await titreFeuille(K.p));
}
console.log('③ Karim tape le code : « Le groupe verra ton prénom : Karim. », puis « Inès · toi » ✓');

/* ---------- ④ un mot : en direct chez Inès ---------- */
await K.p.fill('#grMot', 'Qui va au forum jeudi ?');
await K.p.press('#grMot', 'Enter');
await attendreQue(K.p, () => document.querySelectorAll('#grFil .gr-moi').length === 1, null, 10000, 'le mot de Karim chez Karim');
await attendreQue(I.p, () => /forum jeudi/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, 'le mot de Karim, en direct chez Inès');
{
  const f = await fil(I.p);
  if (f.join(' | ') !== 'Karim : Qui va au forum jeudi ?') fail('le fil chez Inès : ' + f.join(' | '));
}
await I.p.waitForTimeout(450);
await I.p.screenshot({ path: `${SHOTS}/112-groupe-fil-pouce.png` });
console.log('④ un mot de Karim arrive en direct chez Inès, le groupe ouvert ✓');

/* ---------- ⑤ des pistes en différé : Inès donne ---------- */
/* Karim referme le groupe : ce qui arrive ensuite se compte chez lui */
await fermerTout(K.p);
await I.p.click('#grDonner');
await I.p.waitForSelector('#dnGroupe');
if (await titreFeuille(I.p) !== 'Donner à BTS SIO Lille') fail('le titre de Donner : ' + await titreFeuille(I.p));
{
  const pied = await I.p.evaluate(() => [...[...document.querySelectorAll('.overlay:not(.ov-out)')].pop().querySelectorAll('.modal-f .btn')].map(b => b.textContent.trim()));
  if (pied.join('|') !== 'Donner') fail('au groupe, un seul geste dans le pied : ' + pied.join(' | '));
}
await I.p.waitForTimeout(400);
await I.p.screenshot({ path: `${SHOTS}/113-groupe-donner-pouce.png` });
await I.p.click('#dnGroupe');
await attendreQue(I.p, () => /2 pistes/.test(document.querySelector('#grFil')?.textContent || ''), null, 15000, 'le don dans le fil d’Inès');
console.log('⑤ Inès donne 2 pistes au groupe, depuis la liste de « Donner » ✓');

/* chez Karim, la feuille fermée : la boîte le marque d'un point (R10) */
await rouvrir(K.p);
await attendreQue(K.p, () => !!document.querySelector('.bx-l.bx-nonlu[data-groupe] .bx-pt'), null, 20000, 'le point chez Karim');
await K.p.waitForTimeout(300);
await K.p.screenshot({ path: `${SHOTS}/114-groupe-reseau-pouce.png` });
console.log('④ chez Karim, le groupe fermé : sa ligne en gras, avec un point ✓');

/* ---------- ③ bis Sofia colle l'invitation ---------- */
/* le message qu'Inès a ENVOYÉ, tel quel — ce que Sofia trouve dans
   la conversation de la classe */
const So = await ecran('sofia');
await recevoirTexte(So.p, invitationTexte);
await So.p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f .btn')].find(b => b.textContent.trim() === 'Lire').click());
await So.p.waitForSelector('#grRejoindreGo');
if (await titreFeuille(So.p) !== 'BTS SIO Lille') fail('l’aperçu de l’invitation : ' + await titreFeuille(So.p));
{
  const qui = await So.p.evaluate(() => document.querySelector('#grQui').textContent.trim());
  if (qui !== 'Le groupe verra ton prénom : Sofia.') fail('avant de rejoindre, chez Sofia : « ' + qui + ' »');
}
await So.p.click('#grRejoindreGo');
await So.p.waitForSelector('#grMot');
/* ce qui s'est dit AVANT elle, dans les sept jours, l'attend */
await attendreQue(So.p, () => /forum jeudi/.test(document.querySelector('#grFil')?.textContent || '')
  && /2 pistes/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, 'le fil chez Sofia');
{
  const f = await fil(So.p);
  if (f.join(' | ') !== 'Karim : Qui va au forum jeudi ? | Inès : 2 pistes') fail('le fil chez Sofia : ' + f.join(' | '));
}
console.log('③ Sofia colle l’invitation : l’aperçu dit « BTS SIO Lille » et « ton prénom : Sofia », puis le fil l’attend ✓');

await So.p.click('#grFil [data-voir]');
await So.p.waitForSelector('.rc-de');
{
  const de = await So.p.evaluate(() => document.querySelector('.rc-de').textContent.replace(/\s+/g, ' ').trim());
  if (de !== 'De Inès, dans BTS SIO Lille') fail('l’aperçu des pistes : « ' + de + ' »');
}
await So.p.waitForTimeout(350);
await So.p.screenshot({ path: `${SHOTS}/115-groupe-apercu-pouce.png` });
await So.p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f .btn')].find(b => /Fusionner/.test(b.textContent)).click());
await So.p.waitForSelector('.undo-bar');
await attendreQue(So.p, () => /dans tes pistes/.test(document.querySelector('#grFil')?.textContent || ''), null, 8000, '« dans tes pistes » chez Sofia');
{
  const recu = await So.p.evaluate(async () => { const { S } = await import('./ui/state.js'); return S.companies.map(c => ({ name: c.name, notes: c.notes || '', contacts: (c.contacts || []).map(x => [x.name, x.note || ''].join('/')) })); });
  const advens = recu.find(c => c.name === 'Advens');
  if (!advens) fail('Advens n’est pas arrivée chez Sofia');
  else {
    if (advens.notes) fail('la note privée d’Inès est arrivée : ' + advens.notes);
    if (advens.contacts.join() !== 'Julie Marchand/') fail('le contact donné : ' + advens.contacts.join());
  }
}
console.log('⑤ Sofia, arrivée après : « Voir », l’aperçu « De Inès, dans BTS SIO Lille », la fusion, « dans tes pistes » — sans aucune note ✓');

/* ---------- ① LA FUITE : ce que le relais a gardé ---------- */
{
  const k = await cleGroupe(lireInvitation(code).code);
  const B64 = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;
  const sortes = {};
  const parts = new Map();
  for (const ev of evs){
    const tags = ev.tags.map(t => t[0]).sort().join(',');
    if (tags !== 'expiration,x') fail('des étiquettes en plus : ' + tags);
    if (ev.tags.find(t => t[0] === 'x')[1] !== k.etiquette) fail('une autre étiquette que celle du groupe');
    if (!B64.test(ev.content)) fail('du texte en clair dans un événement : ' + ev.content.slice(0, 60));
    const m = await ouvrirMessage(k, ev.content);
    if (!m){ fail('un événement que le code n’ouvre pas'); continue; }
    sortes[m.t] = (sortes[m.t] || 0) + 1;
    const json = JSON.stringify(m);
    for (const prive of ['@prive.test', '06 12', 'Martin', 'Benali', 'Haddad', 'note privée', 'relancée en privé', 'Relancer Julie'])
      if (json.includes(prive)) fail(`« ${prive} » est parti au groupe (${m.t})`);
    const cles = Object.keys(m).sort().join(',');
    /* depuis la 6.67, une présence porte la clé de BOÎTE du membre — une
       clé publique, qui ne dit rien de lui : c'est par elle qu'un nouveau
       code lui arrive (décision 35). Celle du chef porte en plus sa clé
       de signature, prouvée (`sign`, `sig`) : c'est elle qui rend ses
       réglages vérifiables chez chacun. Rien d'autre. */
    const chef = m.t === 'membre' && m.sign;
    const attendu = { membre: chef ? 'at,cle,de,nom,prenom,sig,sign,t' : 'at,cle,de,nom,prenom,t', mot: 'at,de,id,prenom,t,texte',
                      part: 'at,d,de,i,id,n,nb,prenom,t', depart: 'at,de,t' }[m.t];
    if (cles !== attendu) fail(`${m.t} porte ${cles} (attendu ${attendu})`);
    if (m.t === 'membre' && !/^[A-Za-z0-9_-]{86,88}$/.test(String(m.cle))) fail('une présence porte autre chose qu’une clé de boîte : ' + m.cle);
    const exp = +ev.tags.find(t => t[0] === 'expiration')[1];
    const jours = Math.round((exp - m.at / 1000) / 86400);
    if (jours !== (m.t === 'membre' || m.t === 'depart' ? 30 : 7)) fail(`${m.t} expire au bout de ${jours} jours`);
    if (m.t === 'part'){ const l = parts.get(m.id) || []; l[m.i] = m.d; parts.set(m.id, l); }
  }
  for (const [, l] of parts){
    const don = await rassembler(l);
    if (don.kind !== 'share') fail('un don qui n’est pas un partage : ' + don.kind);
    const j = JSON.stringify(don);
    const fuite = j.match(/note privée|relancée en privé|Relancer Julie|"notes"|"history"|"nextAction|"status"|"appliedAt"|2026-10-20/g);
    if (fuite) fail('le suivi privé est parti dans un don au groupe : ' + fuite.join(', ') + ' — ' + j);
  }
  if (!sortes.membre || !sortes.mot || !sortes.part) fail('le relevé n’a pas tout vu : ' + JSON.stringify(sortes));
  /* le profil donné à un ami ne porte aucun groupe */
  const donne = await I.p.evaluate(async () => { const { S } = await import('./ui/state.js');
    return JSON.stringify((await import('./engine/amis.js')).profilDonne(S.profile, S.companies)); });
  if (donne.includes(lireInvitation(code).code) || /groupe/i.test(donne)) fail('le profil donné porte un groupe');
  console.log(`① la fuite d’abord : ${evs.length} événements, une étiquette, une expiration (7 j, 30 j pour une présence) et du chiffré — `
    + 'aucun nom de famille, e-mail, téléphone ni note ; le profil donné ne porte aucun groupe ✓');
}

/* ---------- ④ bis sept jours plus tard, le fil est vide ---------- */
await So.ctx.clock.setSystemTime(new Date(Date.now() + 8 * 86400000));
await rouvrir(So.p);
await So.p.click('.bx-l[data-groupe]');
await So.p.waitForSelector('#grMot');
await So.p.waitForTimeout(1500);
{
  const f = await fil(So.p);
  if (f.length) fail('après huit jours, le fil garde : ' + f.join(' | '));
  const m = await So.p.evaluate(() => document.querySelector('#grMembres')?.textContent.replace(/\s+/g, ' ').trim() || '');
  if (!/Inès/.test(m) || !/Karim/.test(m)) fail('les membres, eux, restent : ' + m);
}
console.log('④ huit jours plus tard : le fil est vide chez Sofia, les membres restent ✓');
await fermerTout(So.p);

/* ---------- ⑥ quitter : « Annuler » le rattrape, sinon le départ se dit ---------- */
await K.p.click('.bx-l[data-groupe]');
await K.p.waitForSelector('#grMembres');
await K.p.click('#grMembres');
await K.p.waitForSelector('#grQuitter');
{
  const noms = await K.p.evaluate(() => [...document.querySelectorAll('.gr-noms li')].map(li => li.textContent.trim()));
  if (noms.join(',') !== 'Inès,Sofia,Toi') fail('les membres, « Toi » en dernier : ' + noms.join(', '));
}
await K.p.waitForTimeout(350);
await K.p.screenshot({ path: `${SHOTS}/116-groupe-membres-pouce.png` });
await K.p.click('#grQuitter');
await K.p.waitForSelector('.undo-bar');
if (await K.p.$('.bx-l[data-groupe]')) fail('le groupe reste dans « Échanger » après « Quitter »');
await K.p.click('.undo-bar .btn-sm');
await attendreQue(K.p, () => !!document.querySelector('.bx-l[data-groupe]'), null, 5000, 'le groupe revenu après « Annuler »');
await K.p.waitForTimeout(32000);
{
  const k = await cleGroupe(lireInvitation(code).code);
  let departs = 0;
  for (const ev of evs){ const m = await ouvrirMessage(k, ev.content); if (m && m.t === 'depart') departs++; }
  if (departs) fail('« Annuler » n’a pas retenu le départ');
}
await K.p.click('.bx-l[data-groupe]');
await K.p.waitForSelector('#grMembres');
await K.p.click('#grMembres');
await K.p.waitForSelector('#grQuitter');
await K.p.click('#grQuitter');
await K.p.waitForSelector('.undo-bar');
await K.p.waitForTimeout(33000);
{
  const k = await cleGroupe(lireInvitation(code).code);
  let departs = 0;
  for (const ev of evs){ const m = await ouvrirMessage(k, ev.content); if (m && m.t === 'depart' && m.de === ID.karim) departs++; }
  if (departs !== 1) fail('le départ de Karim au relais : ' + departs);
}
await rouvrir(I.p);
await I.p.click('.bx-l[data-groupe]');
await attendreQue(I.p, () => { const t = document.querySelector('#grMembres')?.textContent || ''; return /Sofia/.test(t) && !/Karim/.test(t); },
  null, 20000, 'Karim parti de la liste chez Inès');
console.log('⑥ quitter : « Annuler » rattrape tout, rien ne part ; sinon le départ se dit après la barre, et Karim sort de la liste d’Inès ✓');
await fermerTout(I.p);

/* ---------- ⑦ cinq groupes au plus ---------- */
{
  const cinq = await I.p.evaluate(async () => { const g = await import('./engine/groupe.js');
    return Array.from({ length: 5 }, (x, i) => ({ code: g.nouveauCode(), nom: 'Groupe ' + (i + 1), at: i })); });
  const P = await ecran('sofia', { profil: { groupes: cinq } });
  await P.p.waitForSelector('.bx-l[data-groupe]');
  if (await P.p.evaluate(() => document.querySelectorAll('.bx-l[data-groupe]').length) !== 5) fail('cinq rangées attendues');
  if (await P.p.$('#ecGrNeuf')) fail('à cinq groupes, « Nouveau groupe » est encore là');
  /* le code SEUL, recopié d'un message, s'ouvre là où on le colle */
  await recevoirTexte(P.p, code);
  await P.p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f .btn')].find(b => b.textContent.trim() === 'Lire').click());
  await P.p.waitForSelector('#grQui');
  const qui = await P.p.evaluate(() => document.querySelector('#grQui').textContent.trim());
  if (qui !== 'Tu es déjà dans 5 groupes.') fail('à cinq groupes, l’invitation dit : « ' + qui + ' »');
  if (await P.p.$('#grRejoindreGo')) fail('à cinq groupes, « Rejoindre » est encore là');
  await P.ctx.close();
  console.log('⑦ cinq groupes au plus : « Nouveau groupe » absent ; le code seul, collé dans Recevoir, dit « Tu es déjà dans 5 groupes. » ✓');
}

/* ---------- ⑧ sans prénom, « Créer » ouvre le profil sur le nom ---------- */
{
  const P = await ecran('karim', { profil: { name: '' } });
  await nouveau(P.p, 'grCreer');
  await P.p.waitForSelector('#pfName');
  if (await P.p.$('#grNom')) fail('sans prénom, la feuille « Créer un groupe » s’ouvre quand même');
  await P.ctx.close();
  console.log('⑧ sans prénom, « Créer » ouvre le profil sur le nom ✓');
}

/* ---------- ⑨ pouce, poste, sombre, 320 px texte doublé ---------- */
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['pouce-sombre', { sombre: true }],
                        ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const P = await ecran('ines', { ...o, profil: { groupes: [{ code: lireInvitation(code).code, nom: 'BTS SIO Lille', at: 1 }] } });
  if (o.gros) await P.p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await P.p.waitForSelector('.bx-l[data-groupe]');
  await P.p.waitForTimeout(400);
  await P.p.screenshot({ path: `${SHOTS}/117-groupes-echanger-${nom}.png` });
  await P.p.click('.bx-l[data-groupe]');
  await P.p.waitForSelector('#grMot');
  await attendreQue(P.p, () => !!document.querySelector('#grMembres'), null, 20000, nom + ' : les membres');
  await P.p.waitForTimeout(500);
  /* au poste, le groupe se pose à droite de la boîte (le volet) ; au
     pouce, c'est une feuille */
  const r = await P.p.evaluate(() => {
    const ici = document.querySelector('#bxVolet .dock') ? '#bxVolet' : '.overlay:not(.ov-out)';
    const b = [...document.querySelectorAll(ici + ' .modal-b')].pop();
    const box = b.getBoundingClientRect();
    const larges = [...b.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > box.right + 1).map(x => x.className || x.tagName);
    const pied = document.querySelector('.gr-pied').getBoundingClientRect();
    const modal = [...document.querySelectorAll(ici + ' .modal')].pop().getBoundingClientRect();
    return { lateral: b.scrollWidth > b.clientWidth + 1, larges, piedEnBas: modal.bottom - pied.bottom < 40 };
  });
  if (r.lateral || r.larges.length) fail(`${nom} : la feuille du groupe déborde (${r.larges.slice(0, 3).join(', ')})`);
  if (!r.piedEnBas) fail(`${nom} : le pied ne tient pas le bas de la feuille`);
  await P.p.screenshot({ path: `${SHOTS}/118-groupe-feuille-${nom}.png` });
  await P.ctx.close();
  console.log(`⑨ ${nom} : « Échanger » et le groupe (feuille au pouce, volet au poste) tiennent, le pied en bas ✓`);
}

for (const x of [I, K, So]) await x.ctx.close();
if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close?.();
console.log(process.exitCode ? 'E2E groupes : ÉCHEC' : 'E2E groupes : OK');
process.exit(process.exitCode || 0);

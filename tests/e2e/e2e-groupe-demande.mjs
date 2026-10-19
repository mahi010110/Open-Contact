/* ============================================================
   La demande au groupe — « une demande faite comme dans un groupe :
   chacun est libre de partager à son tour » (docs/reseau.md, lot 5b,
   décisions 20, 28 et 29)

   Inès, Karim et Sofia sont dans « BTS SIO Lille ». Inès n'a aucun
   ami : elle demande quelqu'un chez Aztek, à son groupe. Karim a Julie
   Marchand chez Aztek ; Sofia ne connaît personne dans ses pistes, mais
   elle connaît Paul. Karim est aussi dans « Club cyber » ; Sofia a une
   amie, Léa.

   Joué à TROIS (§8, règle 4), sur un relais local qui garde tout :

   ① LA FUITE D'ABORD : dans le groupe, la demande ne porte que le
     prénom d'Inès, sa clé et l'entreprise ; les RÉPONSES ne passent
     jamais par le groupe (décision 29) — ni « Julie », ni « Paul »,
     ni un e-mail dans aucun événement du groupe : elles vont à la
     boîte d'Inès, et à elle seule ;
   ② chez Inès : « Demander à mon groupe », la phrase et « BTS SIO
     Lille » AVANT ; « Demandé à BTS SIO Lille » ; prévenue dès que le
     téléphone de Karim trouve — « Trouvé dans un groupe » ;
   ③ chez Karim : la demande EN TÊTE du groupe, à son nom (« tu as
     Julie Marchand ») ; « Tes amis » la redit dans « Aujourd'hui » ;
     « Répondre » → « Donner Julie Marchand » ;
   ④ chez Sofia : la demande dans le fil, rien en tête ; « Je connais
     quelqu'un » — un nom, un téléphone, rien d'autre ; « Donné » ;
   ⑤ « Faire suivre » : Karim la relaie à « Club cyber » (« relayée
     par Karim », une fois), Sofia à ses amis (le saut du lot 4b, son
     jeton scellé pour Inès) ;
   ⑥ « Masquer » : une autre demande disparaît chez Sofia, et ne revient
     pas ;
   ⑦ chez Inès, les deux contacts arrivent par sa boîte ; poste, 320 px
     texte doublé ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, nouveauCode } from '../../engine/groupe.js';
import { ouvrir, etiquetteBoite, nouvelleCle } from '../../engine/boite.js';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { evs.push(ev); return null; } });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const BTS = nouveauCode(), CLUB = nouveauCode();
const K = { ines: await nouvelleCle(), karim: await nouvelleCle(), sofia: await nouvelleCle(), lea: await nouvelleCle() };
const ID = { ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', sofia: 'SofiaSofiaSofia000001', lea: 'LeaLeaLeaLeaLeaLea0001' };
const NOM = { ines: 'Inès Martin', karim: 'Karim Benali', sofia: 'Sofia Haddad', lea: 'Léa Durand' };
const g = (code, nom) => ({ code, nom, at: 1 });
const PROFIL = {
  ines: { groupes: [g(BTS, 'BTS SIO Lille')], amis: [] },
  karim: { groupes: [g(BTS, 'BTS SIO Lille'), g(CLUB, 'Club cyber')], amis: [] },
  sofia: { groupes: [g(BTS, 'BTS SIO Lille')],
           amis: [{ id: ID.lea, nom: NOM.lea, cle: K.lea.pub, parcours: [], recu: 1 }] }
};
const profil = qui => ({ name: NOM[qui], email: qui + '@prive.test', phone: '06 12 34 56 78', formation: 'BTS SIO',
  amiId: ID[qui], boite: K[qui], ...PROFIL[qui] });
const PISTES = {
  ines: [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', notes: 'note privée d’Inès', updatedAt: 9 },
         { id: 'th', name: 'Thales', city: 'Lille', status: 'todo', updatedAt: 8 }],
  karim: [{ id: 'ka', name: 'Aztek', city: 'Roubaix', status: 'todo', updatedAt: 5, notes: 'note de Karim',
            contacts: [{ id: 'kj', name: 'Julie Marchand', role: 'RH', email: 'julie@aztek.test', note: 'ma voisine' }] }],
  sofia: [{ id: 'sq', name: 'Quick', city: 'Lille', status: 'todo', updatedAt: 3 }]
};

async function ecran(qui, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(qui + ' : ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(qui + ' : ' + m.text()); });
  await p.goto(base + '/#/echanger', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [PISTES[qui], profil(qui), relay.url]);
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
const rouvrir = async (p, route = 'echanger') => {
  await p.evaluate(r => { location.hash = '#/' + r; }, route);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector(`#view-${route}:not([hidden])`);
};
const attendreQue = async (p, fn, arg, ms = 20000, quoi = '') => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(300))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  fail('attendu, jamais vu : ' + quoi);
  return false;
};
const ouvrirGroupe = async (p, nom) => {
  await fermerTout(p);
  await p.evaluate(n => [...document.querySelectorAll('.bx-l[data-groupe]')].find(b => b.querySelector('b').textContent.trim() === n).click(), nom);
  await p.waitForSelector('#grMot');
};
const ouvrirFiche = async (p, id) => {
  await fermerTout(p);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForTimeout(450);
};
const pied = p => p.evaluate(() => [...[...document.querySelectorAll('.overlay:not(.ov-out)')].pop().querySelectorAll('.modal-f .btn')]);
const cliquerPied = (p, mot) => p.evaluate(m => [...[...document.querySelectorAll('.overlay:not(.ov-out)')].pop()
  .querySelectorAll('.modal-f .btn')].find(b => b.textContent.trim() === m).click(), mot);
/* « Répondre » sur la demande qui parle de `motif` — et si elle n'en a
   plus, dire POURQUOI au lieu de planter : dans un groupe, chacun relaie
   à son tour, un téléphone ne fait jamais suivre tout seul */
const repondreA = async (p, motif) => {
  const etat = await p.evaluate(m => { const li = [...document.querySelectorAll('.gr-dem')].find(x => x.textContent.includes(m));
    if (!li) return 'absente'; const b = li.querySelector('[data-repondre]'); if (!b) return li.innerText.replace(/\s+/g, ' ').trim(); b.click(); return ''; }, motif);
  if (etat) fail(`pas de « Répondre » sur ${motif} : « ${etat} » — le téléphone a-t-il fait suivre tout seul ?`);
  return !etat;
};
const lignes = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s + ' .gr-dem')].map(li => li.innerText.replace(/\s+/g, ' ').trim()), sel);

/* chacun ouvre l'app une fois : sa présence est dans le groupe */
const I = await ecran('ines');
const Ka = await ecran('karim');
const So = await ecran('sofia');

/* ---------- ② Inès demande, à son groupe ---------- */
await ouvrirFiche(I.p, 'az');
{
  const geste = await I.p.evaluate(() => document.querySelector('#fiDemander')?.textContent.replace(/\s+/g, ' ').trim());
  if (geste !== 'Demander à mon groupe') fail('sans ami, le geste de la fiche : ' + geste);
}
await I.p.click('#fiDemander');
await I.p.waitForSelector('#dmGo');
{
  const mot = await I.p.evaluate(() => document.querySelector('#dmMot').textContent.trim());
  const qui = await I.p.evaluate(() => document.querySelector('#dmQui').textContent.replace(/\s+/g, ' ').trim());
  if (mot !== 'Inès cherche quelqu’un chez Aztek.') fail('la phrase : ' + mot);
  if (qui !== 'BTS SIO Lille') fail('à qui, AVANT : ' + qui);
}
await I.p.waitForTimeout(400);
await I.p.screenshot({ path: `${SHOTS}/120-groupe-demander-pouce.png` });
await I.p.click('#dmGo');
await I.p.waitForSelector('#fiDemande', { timeout: 15000 });
{
  const e = await I.p.evaluate(() => document.querySelector('#fiDemande').textContent.replace(/\s+/g, ' ').trim());
  if (e !== 'Demandé à BTS SIO Lille · aujourd’hui') fail('la fiche après la demande : ' + e);
}
console.log('② Inès, sans ami : « Demander à mon groupe », « BTS SIO Lille » avant, puis « Demandé à BTS SIO Lille » ✓');

/* ---------- ③ chez Karim : en tête, à son nom ---------- */
await rouvrir(Ka.p);
await ouvrirGroupe(Ka.p, 'BTS SIO Lille');
await attendreQue(Ka.p, () => !!document.querySelector('#grEnTete .gr-dem'), null, 20000, 'la demande en tête chez Karim');
{
  const t = await lignes(Ka.p, '#grEnTete');
  if (!/Inès cherche quelqu’un chez Aztek/.test(t[0] || '') || !/tu as Julie Marchand/.test(t[0] || ''))
    fail('en tête chez Karim : ' + t.join(' | '));
  if ((await lignes(Ka.p, '#grFil')).length) fail('la demande trouvée est aussi dans le fil, deux fois');
}
await Ka.p.waitForTimeout(400);
await Ka.p.screenshot({ path: `${SHOTS}/121-groupe-demande-entete-pouce.png` });
/* « Aujourd'hui » la redit : quelqu'un attend */
await fermerTout(Ka.p);
await rouvrir(Ka.p, 'aujourdhui');
await attendreQue(Ka.p, () => /Inès, dans BTS SIO Lille, cherche quelqu’un/.test(document.querySelector('.tr-amis')?.textContent || ''),
  null, 15000, '« Tes amis » chez Karim');
console.log('③ chez Karim : la demande EN TÊTE, « tu as Julie Marchand », et « Inès, dans BTS SIO Lille, cherche quelqu’un » dans « Aujourd’hui » ✓');

/* ② bis : Inès prévenue, sans savoir qui */
await rouvrir(I.p, 'aujourdhui');
await attendreQue(I.p, async () => { const { etatReseau } = await import('./ui/reseau.js');
  return etatReseau().demandes.some(d => d.trouve && d.trouve.groupe); }, null, 20000, 'Inès prévenue');
await ouvrirFiche(I.p, 'az');
{
  const e = await I.p.evaluate(() => document.querySelector('#fiDemande')?.textContent.replace(/\s+/g, ' ').trim());
  if (e !== 'Trouvé dans un groupe · en attente') fail('Inès prévenue : ' + e);
}
console.log('② chez Inès, avant le oui : « Trouvé dans un groupe · en attente » ✓');

/* Karim répond : Donner */
await rouvrir(Ka.p);
await ouvrirGroupe(Ka.p, 'BTS SIO Lille');
await Ka.p.waitForSelector('#grEnTete [data-repondre]');
await Ka.p.click('#grEnTete [data-repondre]');
await Ka.p.waitForSelector('#rpConnais');
{
  const rangs = await Ka.p.evaluate(() => [...document.querySelectorAll('.gr-rep .pick')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  if (rangs.join(' | ') !== 'Donner Julie Marchand | Je connais quelqu’un | Faire suivre | Masquer') fail('les réponses chez Karim : ' + rangs.join(' | '));
}
await Ka.p.waitForTimeout(350);
await Ka.p.screenshot({ path: `${SHOTS}/122-groupe-repondre-pouce.png` });
await Ka.p.click('#rpDonner');
await Ka.p.waitForSelector('#drDonner');
await Ka.p.click('#drDonner');
await attendreQue(Ka.p, async () => { const { etatReseau } = await import('./ui/reseau.js');
  return etatReseau().recues.some(r => r.statut === 'donnee'); }, null, 15000, 'le don de Karim');
console.log('③ Karim : « Répondre » → « Donner Julie Marchand » → « Donner » ✓');

/* ---------- ⑤ Karim fait suivre à « Club cyber » ---------- */
await ouvrirGroupe(Ka.p, 'BTS SIO Lille');
/* donnée, la demande ne propose plus « Répondre » : pour la relayer,
   il passe par une SECONDE demande d'Inès (Thales), qu'il ne connaît pas */
await ouvrirFiche(I.p, 'th');
await I.p.click('#fiDemander');
await I.p.waitForSelector('#dmGo');
await I.p.click('#dmGo');
await I.p.waitForSelector('#fiDemande', { timeout: 15000 });
await rouvrir(Ka.p);
await ouvrirGroupe(Ka.p, 'BTS SIO Lille');
await attendreQue(Ka.p, () => /Thales/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, 'la demande Thales chez Karim');
await repondreA(Ka.p, 'Thales');
await Ka.p.waitForSelector('#rpSuivre');
if (await Ka.p.$('#rpDonner')) fail('« Donner » proposé chez Karim pour Thales, où il n’a personne');
await Ka.p.click('#rpSuivre');
await Ka.p.waitForSelector('[data-vers]');
if (await Ka.p.$('#rpAmis')) fail('« À mes amis » chez Karim, qui n’a aucun ami');
await Ka.p.click('[data-vers]');
/* la feuille ne se referme qu'une fois la demande partie. Attendre
   `#rpMot` ne prouvait rien : il n'existe plus dès la page « Faire
   suivre », et sur une machine lente la lecture du relais passait
   AVANT l'envoi (vu en CI, reproduit en retardant les envois) */
await attendreQue(Ka.p, () => !document.querySelector('[data-vers]'), null, 10000, 'la feuille « Faire suivre » refermée');
{
  const k = await cleGroupe(CLUB);
  let relayees = [];
  for (const ev of evs){
    const x = (ev.tags.find(t => t[0] === 'x') || [])[1];
    if (x !== k.etiquette) continue;
    const m = await ouvrirMessage(k, ev.content);
    if (m && m.t === 'demande') relayees.push(m);
  }
  if (relayees.length !== 1 || relayees[0].relais?.prenom !== 'Karim' || relayees[0].relais?.n !== 1
      || relayees[0].lettre?.entreprise?.nom !== 'Thales' || relayees[0].lettre?.de?.prenom !== 'Inès')
    fail('la demande relayée dans « Club cyber » : ' + JSON.stringify(relayees).slice(0, 300));
}
await ouvrirGroupe(Ka.p, 'Club cyber');
await attendreQue(Ka.p, () => /relayée par Karim/.test(document.querySelector('#grFil')?.textContent || ''), null, 10000, '« relayée par Karim »');
console.log('⑤ Karim relaie « Thales » à « Club cyber » : la lettre d’Inès, « relayée par Karim », n = 1 ✓');

/* ---------- ④ chez Sofia : le fil, « Je connais quelqu'un » ---------- */
await rouvrir(So.p);
await ouvrirGroupe(So.p, 'BTS SIO Lille');
await attendreQue(So.p, () => document.querySelectorAll('#grFil .gr-dem').length === 2, null, 20000, 'les deux demandes chez Sofia');
if (await So.p.$('#grEnTete')) fail('chez Sofia, qui ne connaît personne, une demande est passée en tête');
await repondreA(So.p, 'Aztek');
await So.p.waitForSelector('#rpConnais');
if (await So.p.$('#rpDonner')) fail('« Donner » chez Sofia, qui n’a personne chez Aztek');
await So.p.click('#rpConnais');
await So.p.waitForSelector('#rpNom');
await So.p.fill('#rpNom', 'Paul Martin');
await So.p.fill('#rpJoindre', 'pas un moyen');
await So.p.click('#rpGo');
if (await So.p.evaluate(() => document.querySelector('#rpErr').hidden)) fail('un moyen de joindre faux passe sans rien dire');
await So.p.fill('#rpJoindre', '06 11 22 33 44');
if (!await So.p.evaluate(() => document.querySelector('#rpErr').hidden)) fail('l’erreur reste affichée une fois le champ corrigé');
await So.p.waitForTimeout(300);
await So.p.screenshot({ path: `${SHOTS}/123-groupe-connais-pouce.png` });
await So.p.click('#rpGo');
await attendreQue(So.p, () => [...document.querySelectorAll('#grFil .gr-dem')].some(li => /Aztek/.test(li.textContent) && /Donné/.test(li.textContent)),
  null, 15000, '« Donné » chez Sofia');
console.log('④ chez Sofia : la demande dans le fil, pas en tête ; « Je connais quelqu’un » — un nom, un téléphone — puis « Donné » ✓');

/* ⑤ bis : Sofia fait suivre « Thales » à ses amis (Léa) */
await repondreA(So.p, 'Thales');
await So.p.waitForSelector('#rpSuivre');
await So.p.click('#rpSuivre');
await So.p.waitForSelector('#rpAmis');
await So.p.click('#rpAmis');
await attendreQue(So.p, () => [...document.querySelectorAll('#grFil .gr-dem')].some(li => /Thales/.test(li.textContent) && /fait suivre/.test(li.textContent)),
  null, 15000, '« Tu l’as fait suivre » chez Sofia');
{
  const etiqLea = await etiquetteBoite(K.lea.pub);
  const pourLea = [];
  for (const ev of evs) if ((ev.tags.find(t => t[0] === 'x') || [])[1] === etiqLea){ const l = await ouvrir(K.lea.priv, ev.content); if (l) pourLea.push(l); }
  const d = pourLea.find(l => l.t === 'demande');
  if (!d || d.cercle !== 2 || d.par?.prenom !== 'Sofia' || d.de?.prenom !== 'Inès' || d.entreprise?.nom !== 'Thales' || (d.chaine || []).length !== 1)
    fail('la demande chez Léa : ' + JSON.stringify(d).slice(0, 300));
}
console.log('⑤ Sofia fait suivre « Thales » à Léa : cercle 2, « par Sofia », un jeton — le saut du lot 4b ✓');

/* ---------- ⑥ Masquer ---------- */
/* une troisième demande, d'Inès encore, que Sofia masque */
await I.p.evaluate(async () => { const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies.push(normalizeCompany({ id: 'ca', name: 'Capgemini', city: 'Lille', status: 'todo' })); saveData(); });
await ouvrirFiche(I.p, 'ca');
await I.p.click('#fiDemander');
await I.p.waitForSelector('#dmGo');
await I.p.click('#dmGo');
await I.p.waitForSelector('#fiDemande', { timeout: 15000 });
await rouvrir(So.p);
await ouvrirGroupe(So.p, 'BTS SIO Lille');
await attendreQue(So.p, () => /Capgemini/.test(document.querySelector('#grFil')?.textContent || ''), null, 20000, 'Capgemini chez Sofia');
await repondreA(So.p, 'Capgemini');
await So.p.waitForSelector('#rpMasquer');
await So.p.click('#rpMasquer');
await attendreQue(So.p, () => !/Capgemini/.test(document.querySelector('#grFil')?.textContent || ''), null, 8000, 'Capgemini masquée');
await rouvrir(So.p);
await ouvrirGroupe(So.p, 'BTS SIO Lille');
await So.p.waitForTimeout(1500);
if (/Capgemini/.test(await So.p.evaluate(() => document.querySelector('#grFil')?.textContent || ''))) fail('la demande masquée est revenue');
console.log('⑥ « Masquer » : la demande disparaît chez Sofia, et ne revient pas à la relève ✓');

/* ---------- ⑦ chez Inès, deux contacts par sa boîte ---------- */
await rouvrir(I.p, 'aujourdhui');
await attendreQue(I.p, async () => { const { etatReseau } = await import('./ui/reseau.js');
  return etatReseau().dons.length >= 2; }, null, 20000, 'les deux dons chez Inès');
{
  const dons = await I.p.evaluate(async () => (await import('./ui/reseau.js')).etatReseau().dons.map(d => d.de.prenom + ':' + d.contact.name + ':' + (d.contact.email || d.contact.phone)));
  if (dons.sort().join(' | ') !== 'Karim:Julie Marchand:julie@aztek.test | Sofia:Paul Martin:06 11 22 33 44') fail('les dons chez Inès : ' + dons.join(' | '));
}
console.log('⑦ chez Inès : Julie Marchand (de Karim) et Paul Martin (de Sofia), arrivés par sa boîte ✓');

/* ---------- ① LA FUITE : rien des réponses ne passe par le groupe ---------- */
{
  const kb = await cleGroupe(BTS), kc = await cleGroupe(CLUB);
  const etiqIns = await etiquetteBoite(K.ines.pub);
  let demandes = 0;
  for (const ev of evs){
    const x = (ev.tags.find(t => t[0] === 'x') || [])[1];
    if (x === kb.etiquette || x === kc.etiquette){
      const m = await ouvrirMessage(x === kb.etiquette ? kb : kc, ev.content);
      const j = JSON.stringify(m || {});
      for (const mot of ['Julie', 'julie@', 'Paul', '06 11', '@prive.test', 'note privée', 'note de Karim', 'ma voisine', 'Martin'])
        if (j.includes(mot)) fail(`« ${mot} » est passé par le groupe (${m && m.t})`);
      if (m && m.t === 'demande'){
        demandes++;
        const cles = Object.keys(m.lettre).sort().join(',');
        if (cles !== 'cercle,de,entreprise,exp,id,t,v' && cles !== 'cercle,de,entreprise,exp,id,t') fail('la demande au groupe porte : ' + cles);
        if (Object.keys(m.lettre.de).sort().join(',') !== 'cle,prenom') fail('qui demande porte : ' + Object.keys(m.lettre.de).join(','));
      }
      if (m && !['membre', 'demande', 'mot', 'part', 'depart'].includes(m.t)) fail('une sorte inconnue au groupe : ' + m.t);
    }
  }
  if (demandes < 4) fail('le relevé n’a pas vu les demandes au groupe : ' + demandes);
  /* les deux dons : à la boîte d'Inès, et à elle seule */
  let dons = 0;
  for (const ev of evs){
    if ((ev.tags.find(t => t[0] === 'x') || [])[1] !== etiqIns) continue;
    const l = await ouvrir(K.ines.priv, ev.content);
    if (l && l.t === 'don'){
      dons++;
      if (JSON.stringify(l).includes('ma voisine') || JSON.stringify(l).includes('note de Karim')) fail('le don porte une note');
    }
  }
  if (dons !== 2) fail('les dons à la boîte d’Inès : ' + dons);
  console.log(`① la fuite d’abord : ${demandes} demandes au groupe, prénom + clé + entreprise ; aucune réponse n’y passe — `
    + 'les deux dons vont à la boîte d’Inès, sans note ✓');
}

/* ---------- ⑦ bis poste, 320 px texte doublé ---------- */
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const P = await ecran('karim', o);
  if (o.gros) await P.p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirGroupe(P.p, 'BTS SIO Lille');
  await attendreQue(P.p, () => document.querySelectorAll('.gr-dem').length >= 2, null, 20000, nom + ' : les demandes');
  await P.p.waitForTimeout(500);
  /* au poste, le groupe se pose à droite de la boîte (le volet) */
  const r = await P.p.evaluate(() => {
    const ici = document.querySelector('#bxVolet .dock') ? '#bxVolet' : '.overlay:not(.ov-out)';
    const b = [...document.querySelectorAll(ici + ' .modal-b')].pop();
    const box = b.getBoundingClientRect();
    return { lateral: b.scrollWidth > b.clientWidth + 1,
             larges: [...b.querySelectorAll('*')].filter(x => x.getBoundingClientRect().right > box.right + 1).length };
  });
  if (r.lateral || r.larges) fail(`${nom} : la feuille du groupe déborde`);
  await P.p.screenshot({ path: `${SHOTS}/124-groupe-demandes-${nom}.png` });
  await P.ctx.close();
  console.log(`⑦ ${nom} : les demandes du groupe tiennent ✓`);
}

for (const x of [I, Ka, So]) await x.ctx.close();
if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close?.();
console.log(process.exitCode ? 'E2E demande au groupe : ÉCHEC' : 'E2E demande au groupe : OK');
process.exit(process.exitCode || 0);

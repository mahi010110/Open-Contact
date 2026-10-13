/* ============================================================
   Les sauts — « je n'ai pas beaucoup de connaissances »
   (docs/reseau.md, lot 4b, décisions 17 à 19)

   Tom cherche quelqu'un chez Aztek. Tom et Léa sont amis, Léa et Karim
   aussi, Karim et Sofia aussi. Sofia y est en alternance. Personne ne
   touche à rien entre deux : chaque téléphone relève sa boîte à
   l'ouverture, et fait suivre tout seul quand il ne trouve rien.

   Joué à QUATRE (§8, règle 4), sur un relais local qui GARDE les
   lettres comme les relais publics mesurés :

   ① LA FUITE D'ABORD : le relais ne lit rien ; la demande qui arrive
     chez Sofia ne porte que l'entreprise, le prénom de Tom, le cercle,
     l'expiration, « par Karim » et deux jetons opaques ; chez Tom, le
     nom de Karim n'apparaît NULLE PART (il ne le connaît pas) ; la
     lettre « trouvé » n'a pas d'auteur ; le merci qui remonte ne porte
     pas le nom de qui était au bout ;
   ② rien ne s'affiche chez Léa ni chez Karim, qui ne connaissent
     personne (règle 6) — leur téléphone a fait suivre, c'est tout ;
   ③ chez Sofia : « Tom, par Karim, cherche quelqu'un », « tu y es en
     alternance », un seul oui : « Tom peut m'écrire » ;
   ④ chez Tom : prévenu AVANT ce oui — « Trouvé chez un ami de Léa » —,
     puis « Sofia Haddad y est en alternance · par Léa », « Ajouter à
     la piste » ;
   ⑤ le merci remonte toute la chaîne : Sofia, Léa, puis Karim ;
   ⑥ Karim coupe le passage dans ses réglages : la demande suivante
     s'arrête chez lui, Sofia ne reçoit rien ;
   ⑦ « dans la cybersécurité à Lille » : depuis l'onglet Amis, une
     demande sans entreprise ; Léa a quelqu'un dans une piste cyber à
     Lille, Tom l'ajoute — la piste naît chez lui ;
   ⑧ pouce et poste, 320 px texte doublé : rien ne déborde ; zéro
     erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, ouvrirReglages } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { ouvrir, etiquetteBoite, nouvelleCle } from '../../engine/boite.js';

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

/* les quatre boîtes, nées ici : chacun a déjà donné son QR à ses amis */
const K = { tom: await nouvelleCle(), lea: await nouvelleCle(), karim: await nouvelleCle(), sofia: await nouvelleCle() };
const ID = { tom: 'TomTomTomTomTomTom0001', lea: 'LeaLeaLeaLeaLeaLea0001', karim: 'KarimKarimKarim000001', sofia: 'SofiaSofiaSofia000001' };
const NOM = { tom: 'Tom Petit', lea: 'Léa Durand', karim: 'Karim Benali', sofia: 'Sofia Haddad' };
const PARCOURS = { sofia: [{ id: 's1', entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', fin: '' },
                           { id: 's2', entreprise: 'Thales', quoi: 'stage', debut: '2024-04', fin: '2024-06' }] };
const ami = (qui, recu) => ({ id: ID[qui], nom: NOM[qui], cle: K[qui].pub, parcours: (PARCOURS[qui] || []).map(({ id, ...e }) => e), recu });
const profil = (qui, amis, o = {}) => ({ name: NOM[qui], email: qui + '@prive.test', formation: 'BTS SIO', amiId: ID[qui],
  boite: K[qui], amis, parcours: PARCOURS[qui] || [], ...o });

const PISTES = {
  tom: [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', notes: 'note privée de Tom', updatedAt: 9 },
        { id: 'th', name: 'Thales', city: 'Lille', status: 'todo', updatedAt: 8 }],
  lea: [{ id: 'la', name: 'Advens', city: 'Lille', domain: 'cyber', status: 'todo', updatedAt: 5, notes: 'note de Léa',
          contacts: [{ id: 'lj', name: 'Julie Marchand', role: 'RH', email: 'julie@advens.test', note: 'ma tante' }] }],
  karim: [{ id: 'kq', name: 'Quick', city: 'Lille', status: 'todo', updatedAt: 3 }],
  sofia: []
};

async function ecran(qui, amis, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(qui + ' : ' + String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(qui + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [PISTES[qui], profil(qui, amis, o.profil), relay.url]);
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
const sansAnnuler = async p => {
  if (await p.evaluate(() => { const x = document.querySelector('.undo-bar .bar-x'); if (x) x.click(); return !!x; }))
    await p.waitForTimeout(320);
};
const rouvrir = async p => {
  await p.evaluate(() => { location.hash = '#/aujourdhui'; });
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
};
const reseauDe = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.RESEAU_KEY) || 'null');
});
const attendreReseau = async (p, pred, ms = 20000) => {
  const f = new Function('e', 'return ' + pred);
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(300)){
    const e = await reseauDe(p).catch(() => null);
    if (e && f(e)) return e;
  }
  fail('la boîte ne s’est pas relevée (' + pred + ')');
  return await reseauDe(p) || { recues: [], dons: [], mercis: [], demandes: [] };
};
const ouvrirFiche = async (p, id) => {
  await fermerTout(p);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForTimeout(450);
};
/* ce que le relais a gardé, ouvert avec la clé de son destinataire */
const etiquettes = {};
for (const [k, b] of Object.entries(K)) etiquettes[await etiquetteBoite(b.pub)] = k;
const lues = async () => {
  const out = [];
  for (const ev of lettres){
    const pour = etiquettes[(ev.tags.find(t => t[0] === 'x') || [])[1]];
    out.push({ ev, pour, l: pour ? await ouvrir(K[pour].priv, ev.content) : null });
  }
  return out;
};
const deSorte = async (t, pour, pred = () => true) => (await lues()).filter(x => x.l && x.l.t === t && (!pour || x.pour === pour) && pred(x.l));
const attendreLettre = async (t, pour, pred, ms = 45000) => {
  for (const fin = Date.now() + ms; Date.now() < fin; await new Promise(r => setTimeout(r, 500)))
    if ((await deSorte(t, pour, pred)).length) return (await deSorte(t, pour, pred)).at(-1);
  fail(`aucune lettre « ${t} » pour ${pour} au relais`);
  return null;
};
/* une ligne de « Tes amis », lue champ par champ */
const ligneAmis = (p, i = 0) => p.evaluate(k => { const r = document.querySelectorAll('.tr-amis .act-ami')[k];
  return r ? ['.act-verb', '.act-vecu', '.act-who'].map(s => r.querySelector(s)?.textContent.trim()).join(' | ') : ''; }, i);
const texteEcran = p => p.evaluate(() => document.body.innerText + ' ' +
  [...document.querySelectorAll('[aria-label]')].map(x => x.getAttribute('aria-label')).join(' '));

/* ---------- les quatre téléphones ---------- */
const T = await ecran('tom', [ami('lea', 3)]);
const L = await ecran('lea', [ami('tom', 3), ami('karim', 2)]);
const Ka = await ecran('karim', [ami('lea', 2), ami('sofia', 1)]);
const So = await ecran('sofia', [ami('karim', 1)]);

/* ---------- Tom demande, depuis la fiche ---------- */
await ouvrirFiche(T.p, 'az');
await T.p.click('#fiDemander');
await T.p.waitForSelector('#dmMot');
{
  const mot = await T.p.evaluate(() => document.querySelector('#dmMot').textContent.trim());
  const qui = await T.p.evaluate(() => document.querySelector('#dmQui').textContent.replace(/\s+/g, ' ').trim());
  if (mot !== 'Tom cherche quelqu’un chez Aztek.') fail('la phrase : ' + mot);
  /* elle va plus loin que tes amis : ça se dit AVANT */
  if (qui !== 'Léa, puis leurs amis') fail('à qui : ' + qui);
}
await T.p.waitForTimeout(450);
await T.p.screenshot({ path: `${SHOTS}/101-sauts-demander-pouce.png` });
await T.p.click('#dmGo');
await T.p.waitForSelector('#fiDemande', { timeout: 15000 });
const dem = await attendreLettre('demande', 'lea');
console.log('Tom demande : « Tom cherche quelqu’un chez Aztek. » — à Léa, « puis leurs amis » ✓');

/* ---------- Léa, puis Karim : rien ne s'affiche, la demande passe ---------- */
await rouvrir(L.p);
const versKarim = await attendreLettre('demande', 'karim', l => l.id === dem.l.id);
await L.p.waitForTimeout(500);
if (await L.p.$('.tr-amis')) fail('chez Léa, qui ne connaît personne, « Tes amis » s’affiche (règle 6)');
if (versKarim){
  if (versKarim.l.cercle !== 2 || versKarim.l.par.prenom !== 'Léa' || versKarim.l.chaine.length !== 1) fail('la demande chez Karim : ' + JSON.stringify(versKarim.l).slice(0, 200));
  if ((await deSorte('demande', 'tom', l => l.id === dem.l.id)).length) fail('Léa a renvoyé la demande à Tom');
  if ((await deSorte('demande', 'lea', l => l.id === dem.l.id)).length !== 1) fail('Léa a reçu la demande plus d’une fois');
}
await rouvrir(Ka.p);
const versSofia = await attendreLettre('demande', 'sofia', l => l.id === dem.l.id);
await Ka.p.waitForTimeout(500);
if (await Ka.p.$('.tr-amis')) fail('chez Karim, qui ne connaît personne, « Tes amis » s’affiche');
/* la lettre de TOM à Léa porte le même id : un renvoi, lui, serait d'un cercle plus loin */
if ((await deSorte('demande', 'lea', l => l.id === dem.l.id && l.cercle > 1)).length) fail('Karim a renvoyé la demande à Léa');
console.log('② Léa puis Karim ne voient rien : leur téléphone fait suivre, une fois, jamais en arrière ✓');

/* ---------- ① la fuite d'abord ---------- */
{
  /* le contenu n'est QUE du base64 scellé : aucun texte en clair ne peut
     s'y glisser. Un nom de trois lettres peut, lui, y apparaître par
     hasard (« Tom » dans du bruit) : il ne se cherche que dans les tags */
  const pasScelle = lettres.filter(e => !/^OCB1\.[A-Za-z0-9_-]+$/.test(e.content));
  if (pasScelle.length) fail('une lettre n’est pas scellée : ' + pasScelle[0].content.slice(0, 60));
  const brut = JSON.stringify(lettres.map(e => e.content));
  for (const m of ['Aztek', 'Karim', 'Sofia', 'Léa', 'note privée'])
    if (brut.includes(m)) fail(`le relais lit « ${m} »`);
  const tags = JSON.stringify(lettres.map(e => e.tags));
  for (const m of ['Aztek', 'Tom', 'Léa', 'Karim', 'Sofia'])
    if (tags.includes(m)) fail(`les étiquettes du relais disent « ${m} »`);
  if (versSofia){
    const l = versSofia.l;
    const cles = Object.keys(l).sort().join(',');
    if (cles !== 'cercle,chaine,de,entreprise,exp,id,par,t,v') fail('la demande chez Sofia porte : ' + cles);
    if (l.cercle !== 3 || l.par.prenom !== 'Karim' || l.de.prenom !== 'Tom' || l.chaine.length !== 2) fail('la demande chez Sofia : ' + JSON.stringify(l).slice(0, 200));
    if (/note|Léa/.test(JSON.stringify(l.entreprise) + JSON.stringify(l.de) + JSON.stringify(l.par))) fail('la demande chez Sofia laisse sortir autre chose');
    /* les jetons : opaques pour Sofia */
    for (const j of l.chaine) if (await ouvrir(K.sofia.priv, j)) fail('Sofia ouvre un jeton de la chaîne');
  }
}
console.log('① le relais ne lit rien ; chez Sofia : l’entreprise, Tom, « par Karim », deux jetons qu’elle n’ouvre pas ✓');

/* ---------- ③ Sofia y est : un seul oui ---------- */
await rouvrir(So.p);
await So.p.waitForSelector('.tr-amis .act-ami', { timeout: 20000 }).catch(() => fail('chez Sofia, « Tes amis » ne s’affiche pas'));
{
  const ligne = await ligneAmis(So.p);
  if (ligne !== 'Aztek | Tom, par Karim, cherche quelqu’un | tu y es en alternance') fail('chez Sofia : ' + ligne);
}
/* prévenu tout de suite, sans auteur */
const trouve = await attendreLettre('trouve', 'tom', l => l.demande === dem.l.id);
if (trouve && (trouve.l.de || /Sofia|Karim/.test(JSON.stringify(trouve.l)))) fail('la lettre « trouvé » dit qui : ' + JSON.stringify(trouve.l).slice(0, 160));
console.log('④ dès que Sofia ouvre l’app, Tom reçoit « trouvé » — sans auteur ✓');

/* Tom, AVANT le oui de Sofia */
await rouvrir(T.p);
await attendreReseau(T.p, `e.demandes.some(d => d.trouve && d.trouve.par)`);
await ouvrirFiche(T.p, 'az');
{
  const f = await T.p.evaluate(() => document.querySelector('#fiDemande')?.textContent.replace(/\s+/g, ' ').trim());
  if (f !== 'Trouvé chez un ami de Léa · en attente') fail('la fiche de Tom avant le oui : ' + f);
}
await T.p.waitForTimeout(450);
await T.p.screenshot({ path: `${SHOTS}/101-sauts-trouve-pouce.png` });
console.log('④ chez Tom, avant le oui : « Trouvé chez un ami de Léa · en attente » ✓');

await So.p.evaluate(() => document.querySelector('.tr-amis .act-ami .act-main').click());
await So.p.waitForSelector('#drDonner');
{
  const s = await So.p.evaluate(() => ({ chez: document.querySelector('#drChez')?.textContent.trim(),
    nom: document.querySelector('#drNom')?.textContent.trim(),
    obj: [...document.querySelectorAll('.overlay .obj-l')].map(x => x.textContent.trim()),
    geste: document.querySelector('#drDonner').textContent.trim() }));
  if (s.chez !== 'chez Aztek · par Karim') fail('la feuille de Sofia : ' + s.chez);
  if (s.nom !== 'Sofia Haddad' || s.obj.join('|') !== 'tu y es en alternance|sofia@prive.test') fail('ce que Sofia donnerait : ' + JSON.stringify(s));
  if (s.geste !== 'Tom peut m’écrire') fail('le oui de Sofia : ' + s.geste);
}
await So.p.waitForTimeout(450);
await So.p.screenshot({ path: `${SHOTS}/101-sauts-sofia-pouce.png` });
await So.p.click('#drDonner');
const don = await attendreLettre('don', 'tom', l => l.demande === dem.l.id);
if (don){
  if (JSON.stringify(don.l.soi) !== '{"quoi":"alternance","maintenant":true}' || don.l.chaine.length !== 2) fail('le don : ' + JSON.stringify(don.l).slice(0, 220));
  if (don.l.contact.name !== 'Sofia Haddad' || don.l.contact.email !== 'sofia@prive.test') fail('le contact donné : ' + JSON.stringify(don.l.contact));
}
console.log('③ chez Sofia : « Tom, par Karim, cherche quelqu’un », « tu y es en alternance », « Tom peut m’écrire » ✓');

/* ---------- ④ Tom : le don, « par Léa », ajouter ---------- */
await rouvrir(T.p);
await attendreReseau(T.p, `e.dons.some(d => d.par === 'Léa')`);
await ouvrirFiche(T.p, 'az');
{
  const b = await T.p.evaluate(() => document.querySelector('#fiDon')?.textContent.replace(/\s+/g, ' ').trim());
  if (b !== 'Sofia Haddad y est en alternance · par Léa') fail('le bandeau chez Tom : ' + b);
  /* Tom ne connaît pas Karim : son nom n'apparaît nulle part */
  if (/Karim/.test(await texteEcran(T.p))) fail('le nom de Karim apparaît chez Tom');
}
await T.p.click('#fiDon');
await T.p.waitForSelector('#ddAjouter');
{
  /* la barre dit « Contact » ; qui l'a donné, et par qui, ouvre le contenu */
  const t = await T.p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.mh-t')?.textContent);
  const de = await T.p.evaluate(() => document.querySelector('#ddDe')?.textContent.trim());
  if (t !== 'Contact' || de !== 'Sofia, par Léa, t’a donné') fail(`le don chez Tom : barre « ${t} », en tête « ${de} »`);
}
await T.p.waitForTimeout(450);
await T.p.screenshot({ path: `${SHOTS}/101-sauts-don-pouce.png` });
await T.p.click('#ddAjouter');
await T.p.waitForTimeout(400);
{
  const c = await T.p.evaluate(async () => (await import('./ui/state.js')).S.companies.find(x => x.id === 'az').contacts.map(x => x.name));
  if (c.join() !== 'Sofia Haddad') fail('le contact n’est pas dans la piste de Tom : ' + c);
  if (/Karim/.test(await texteEcran(T.p))) fail('le nom de Karim apparaît chez Tom après l’ajout');
}
await sansAnnuler(T.p);
console.log('④ chez Tom : « Sofia Haddad y est en alternance · par Léa », ajoutée à la piste, Karim jamais nommé ✓');

/* ---------- ⑤ le merci remonte ---------- */
await attendreLettre('merci', 'sofia', l => l.demande === dem.l.id && !l.relais);
const mLea = await attendreLettre('merci', 'lea', l => l.demande === dem.l.id && l.relais);
if (mLea && (mLea.l.contact.name || /Sofia/.test(JSON.stringify(mLea.l)))) fail('le merci à Léa dit qui était au bout');
await rouvrir(L.p);
await L.p.waitForFunction(() => /Tom te dit merci : quelqu’un a été trouvé chez Aztek, grâce à toi\./.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20000 })
  .catch(() => fail('Léa n’est pas remerciée'));
const mKarim = await attendreLettre('merci', 'karim', l => l.demande === dem.l.id && l.relais);
if (mKarim && (mKarim.l.contact.name || /Sofia/.test(JSON.stringify(mKarim.l)))) fail('le merci à Karim dit qui était au bout');
await rouvrir(Ka.p);
await Ka.p.waitForFunction(() => /Léa te dit merci : quelqu’un a été trouvé chez Aztek, grâce à toi\./.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 20000 })
  .catch(() => fail('Karim n’est pas remercié'));
console.log('⑤ le merci remonte : Sofia, puis Léa, puis Karim — sans le nom de qui était au bout ✓');

/* ---------- ⑥ Karim coupe le passage ---------- */
await fermerTout(Ka.p);
await Ka.p.evaluate(() => { location.hash = '#/moi'; });
await ouvrirReglages(Ka.p);
await Ka.p.waitForSelector('#moiRelais');
if (await Ka.p.evaluate(() => document.querySelector('#moiRelais .rg-s').textContent.trim()) !== 'transmises') fail('l’état du réglage de Karim');
await Ka.p.click('#moiRelais');
await Ka.p.waitForSelector('#rlNon');
await Ka.p.waitForTimeout(450);
await Ka.p.screenshot({ path: `${SHOTS}/101-sauts-reglage-pouce.png` });
await Ka.p.click('#rlNon');
await Ka.p.waitForTimeout(250);
if (await Ka.p.evaluate(() => document.querySelector('#moiRelais .rg-s').textContent.trim()) !== 'arrêtées') fail('le réglage ne dit pas « arrêtées »');
await fermerTout(Ka.p);
await ouvrirFiche(T.p, 'th');
await T.p.click('#fiDemander');
await T.p.waitForSelector('#dmGo');
await T.p.click('#dmGo');
await T.p.waitForSelector('#fiDemande', { timeout: 15000 });
const dem2 = await attendreLettre('demande', 'lea', l => l.entreprise && l.entreprise.nom === 'Thales');
await rouvrir(L.p);
await attendreLettre('demande', 'karim', l => l.id === dem2.l.id);
await rouvrir(Ka.p);
await attendreReseau(Ka.p, `e.recues.some(r => r.id === ${JSON.stringify(dem2.l.id)})`);
await new Promise(r => setTimeout(r, 3000));
if ((await deSorte('demande', 'sofia', l => l.id === dem2.l.id)).length) fail('Karim a coupé le passage, et la demande arrive quand même chez Sofia');
console.log('⑥ Karim coupe le passage : la demande s’arrête chez lui, Sofia ne reçoit rien ✓');

/* ---------- ⑦ « dans la cybersécurité à Lille » ---------- */
await fermerTout(T.p);
await T.p.evaluate(() => { location.hash = '#/pistes'; });
await T.p.waitForSelector('[data-portee="amis"]');
await T.p.click('[data-portee="amis"]');
await T.p.fill('#piQ', 'cyber Lille');
await T.p.waitForSelector('#avDemander', { timeout: 5000 }).catch(() => fail('l’onglet Amis ne propose pas de demander « cyber Lille »'));
await T.p.waitForTimeout(450);
await T.p.screenshot({ path: `${SHOTS}/101-sauts-amis-critere-pouce.png` });
await T.p.click('#avDemander');
await T.p.waitForSelector('#dmMot');
{
  const mot = await T.p.evaluate(() => document.querySelector('#dmMot').textContent.trim());
  if (mot !== 'Tom cherche quelqu’un dans la cybersécurité à Lille.') fail('la phrase du critère : ' + mot);
}
await T.p.click('#dmGo');
await T.p.waitForTimeout(600);
const dem3 = await attendreLettre('demande', 'lea', l => !!l.critere);
if (dem3 && JSON.stringify(dem3.l.critere) !== '{"metier":"cyber","ville":"Lille"}') fail('le critère qui part : ' + JSON.stringify(dem3.l.critere));
if (dem3 && dem3.l.entreprise) fail('une demande par critère porte une entreprise');
{
  const f = await T.p.evaluate(() => [...document.querySelectorAll('#piAmis .am-dem')].map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  if (!f.some(x => /^Quelqu’un dans la cybersécurité à Lille · demandé à 1 ami$/.test(x))) fail('la demande partie ne se lit pas dans Amis : ' + JSON.stringify(f));
  if (await T.p.$('#avDemander')) fail('la même demande se propose encore');
}
await rouvrir(L.p);
await L.p.waitForSelector('.tr-amis .act-ami', { timeout: 20000 }).catch(() => fail('chez Léa, la demande par critère ne s’affiche pas'));
{
  const ligne = await ligneAmis(L.p);
  if (ligne !== 'Advens | Tom cherche quelqu’un | tu as Julie Marchand') fail('chez Léa : ' + ligne);
}
await L.p.evaluate(() => document.querySelector('.tr-amis .act-ami .act-main').click());
await L.p.waitForSelector('#drDonner');
await L.p.click('#drDonner');
const don3 = await attendreLettre('don', 'tom', l => l.demande === dem3.l.id);
if (don3){
  if (JSON.stringify(don3.l.entreprise) !== '{"nom":"Advens","ville":"Lille"}') fail('le don par critère dit : ' + JSON.stringify(don3.l.entreprise));
  if (/ma tante|note de Léa/.test(JSON.stringify(don3.l))) fail('le don laisse sortir la note de Léa');
}
await rouvrir(T.p);
await attendreReseau(T.p, `e.dons.some(d => d.entreprise && d.entreprise.nom === 'Advens')`);
await T.p.waitForSelector('.tr-amis .act-ami', { timeout: 10000 });
await T.p.evaluate(() => [...document.querySelectorAll('.tr-amis .act-ami')].find(r => /Advens/.test(r.textContent)).querySelector('.act-main').click());
await T.p.waitForSelector('#ddAjouter');
if (await T.p.evaluate(() => document.querySelector('#ddAjouter').textContent.trim()) !== 'Ajouter à mes pistes') fail('le don sans piste ne propose pas « Ajouter à mes pistes »');
await T.p.click('#ddAjouter');
await T.p.waitForTimeout(400);
{
  const a = await T.p.evaluate(async () => { const c = (await import('./ui/state.js')).S.companies.find(x => x.name === 'Advens');
    return c ? { city: c.city, contacts: c.contacts.map(x => x.name) } : null; });
  if (!a || a.city !== 'Lille' || a.contacts.join() !== 'Julie Marchand') fail('la piste n’est pas née chez Tom : ' + JSON.stringify(a));
}
console.log('⑦ « dans la cybersécurité à Lille » : Léa a Julie chez Advens, la piste naît chez Tom ✓');

/* ---------- ⑧ pouce et poste, 320 px texte doublé ---------- */
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const S2 = await ecran('sofia', [ami('karim', 1)], o);
  if (o.gros) await S2.p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  /* la demande de Tom l'attend toujours sur le relais : la relève la rend */
  await S2.p.waitForSelector('.tr-amis .act-ami', { timeout: 20000 }).catch(() => {});
  if (await S2.p.$('.tr-amis .act-ami')){
    await S2.p.evaluate(() => document.querySelector('.tr-amis .act-ami .act-main').click());
    await S2.p.waitForSelector('#drDonner');
    await S2.p.waitForTimeout(300);
    const r = await S2.p.evaluate(() => {
      const b = [...document.querySelectorAll('.overlay .modal-b')].pop();
      return { lateral: b.scrollWidth > b.clientWidth + 1,
               coupes: [...b.querySelectorAll('.obj-n, #drChez')].filter(x => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).textOverflow !== 'ellipsis').length };
    });
    if (r.lateral || r.coupes) fail(`${nom} : la feuille de Sofia déborde ou coupe`);
    await S2.p.waitForTimeout(450);
    await S2.p.screenshot({ path: `${SHOTS}/101-sauts-sofia-${nom}.png` });
    console.log(`⑧ ${nom} : la feuille de Sofia tient ✓`);
  } else fail(`${nom} : la demande n’est pas revenue à la relève`);
  await S2.ctx.close();
}

for (const x of [T, L, Ka, So]) await x.ctx.close();
if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close?.();
console.log(process.exitCode ? 'E2E sauts : ÉCHEC' : 'E2E sauts : OK');
process.exit(process.exitCode || 0);

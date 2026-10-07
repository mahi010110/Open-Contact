/* ============================================================
   La demande à ses amis — « Quelqu'un chez Aztek ? »
   (docs/reseau.md, lot 3)

   Inès n'a personne à qui écrire chez Aztek. Elle le demande à ses
   amis — ceux dont elle a le profil — et la lettre ATTEND sur un relais
   que leur téléphone s'ouvre. Karim connaît Julie là-bas : son app le
   lui montre, il la donne d'un tap, Inès l'ajoute, et Karim est
   remercié. Sofia ne connaît personne : rien ne s'affiche chez elle.

   Joué à TROIS (§8, règle 4), sur un relais local qui GARDE les
   lettres comme les relais publics mesurés (sonde-boite-relais.mjs) :

   ① LA FUITE D'ABORD, lue sur ce que le relais voit passer et dans la
     lettre ouverte avec la clé de son destinataire : le relais ne lit
     rien (ni l'entreprise, ni un prénom, ni une note) ; la demande ne
     porte que l'entreprise, le prénom, le cercle et l'expiration ; le
     don ne porte que de quoi joindre le contact — jamais sa note, ni
     le suivi de Karim ; une lettre ne s'ouvre qu'avec SA clé ;
   ② la feuille montre la phrase EXACTE et à qui elle part — un ami
     ancien, sans boîte, n'y est pas ; partie, la fiche le dit ;
   ③ RÈGLE 6 : chez Sofia, qui ne connaît personne, rien ne s'affiche ;
   ④ chez Karim, « Tes amis » dans « Aujourd'hui », ce qu'il donnerait
     avant de le donner, puis « Donner » d'un tap ;
   ⑤ chez Inès, le contact arrive par un aperçu (rien n'est ajouté
     avant « Ajouter à la piste »), « Annuler » le rend, et Karim est
     remercié UNE fois ;
   ⑥ trois demandes ouvertes au plus ; une piste qui a déjà quelqu'un à
     qui écrire ne propose rien ; l'ami ancien dit « Rescanne son QR » ;
   ⑦ pouce et poste, clair et sombre, 320 px texte doublé : rien ne
     déborde ; zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { ouvrir, etiquetteBoite } from '../../engine/boite.js';

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

/* Karim a tout ce qui ne doit PAS partir : une note sur la piste, une
   note sur Julie, un contact sans moyen de le joindre */
const KARIM = { name: 'Karim Benali', formation: 'BTS SIO', email: 'karim@prive.test' };
const PISTES_KARIM = [
  { id: 'kz', name: 'AZTEK SAS', city: 'Lille', status: 'todo', notes: 'note privée de Karim', updatedAt: 2,
    contacts: [{ id: 'kj', name: 'Julie Marchand', role: 'RH', email: 'julie@aztek.test', note: 'ne pas citer ma tante' },
               { id: 'kp', name: 'Paul Sansmoyen', role: 'Dev' }] },
  { id: 'ka', name: 'Advens', city: 'Lille', status: 'todo', updatedAt: 3,
    contacts: [{ id: 'km', name: 'Marc Advens', email: 'marc@advens.test' },
               { id: 'kn', name: 'Nora Advens', role: 'Tech lead', phone: '0600000001' }] }];
const SOFIA = { name: 'Sofia Haddad', formation: 'BUT info' };
const PISTES_SOFIA = [{ id: 'sp', name: 'Sopra Steria', city: 'Lille', status: 'todo', updatedAt: 2 }];
/* Awa : une amie ajoutée en 6.54, avant les boîtes — pas de clé */
const AWA = { id: 'AwaAwaAwaAwaAwaAwa01', nom: 'Awa Diallo', parcours: [] };
const INES = { name: 'Inès Martin', formation: 'BTS SIO', email: 'ines@exemple.test', amis: [AWA] };
const PISTES_INES = [
  { id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', notes: 'note très privée d’Inès', updatedAt: 9 },
  { id: 'adv', name: 'Advens', city: 'Lille', status: 'todo', updatedAt: 8 },
  { id: 'th', name: 'Thales', city: 'Lille', status: 'todo', updatedAt: 7 },
  { id: 'or', name: 'Orange Cyberdefense', city: 'Lille', status: 'todo', updatedAt: 6 },
  { id: 'q', name: 'Quick', city: 'Lille', status: 'todo', updatedAt: 5,
    contacts: [{ id: 'qc', name: 'Léo Quick', email: 'leo@quick.test' }] }
];

async function ecran(profil, pistes, o = {}){
  const vp = o.vp || { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 900, ignoreHTTPSErrors: true,
                                         colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  await ctx.addInitScript(() => {
    window.__copie = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copie.push(String(t)); } }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr, url]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [pistes, profil, relay.url]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return { ctx, p };
}
const dessus = p => p.evaluate(() => { const o = [...document.querySelectorAll('.overlay')]; return o[o.length - 1]?.querySelector('.mh-t')?.textContent || ''; });
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
async function monProfilCopie(p){
  await fermerTout(p);
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForSelector('#ecAmis');
  await p.click('#ecAmis');
  await p.click('#amMonQR');
  await p.waitForSelector('.qr-wrap svg');
  await p.click('#mqCopier');
  await p.waitForTimeout(150);
  return p.evaluate(() => window.__copie.at(-1) || '');
}
async function ajouterAmi(p, txt){
  await fermerTout(p);
  await sansAnnuler(p);
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForSelector('#ecAmis');
  await p.click('#ecAmis');
  await p.click('#amScan');
  await p.click('#rcTexte');
  await p.fill('#rcTxt', txt);
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-f .btn-primary').click());
  await p.waitForSelector('#amAjouter');
  await p.click('#amAjouter');
  await p.waitForTimeout(300);
}
const ouvrirFiche = async (p, id) => {
  await fermerTout(p);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForTimeout(400);
};
const boiteDe = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}').boite || null;
});
const reseauDe = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.RESEAU_KEY) || 'null');
});
const pisteDe = (p, id) => p.evaluate(async i => {
  const { S } = await import('./ui/state.js');
  return JSON.parse(JSON.stringify(S.companies.find(c => c.id === i)));
}, id);
/* rouvrir l'app comme on la rouvre : la boîte se relève toute seule
   (demarrerReseau, ~2 s après le démarrage) */
const rouvrir = async p => {
  await p.evaluate(() => { location.hash = '#/aujourdhui'; });
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
};
/* une fonction asynchrone rend une promesse, et une promesse est
   « vraie » : `waitForFunction` conclurait tout de suite. On sonde. */
const attendreReseau = async (p, pred, ms = 15000) => {
  const f = new Function('e', 'return ' + pred);
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(300)){
    const e = await reseauDe(p).catch(() => null);
    if (e && f(e)) return e;
  }
  fail('la boîte ne s’est pas relevée (' + pred + ')');
  return await reseauDe(p) || { recues: [], dons: [], mercis: [], demandes: [] };
};
const deborde = p => p.evaluate(() => {
  const b = [...document.querySelectorAll('.overlay .modal-b')].pop() || document.querySelector('#view-aujourdhui');
  const fautes = [];
  if (b.scrollWidth > b.clientWidth + 1) fautes.push('la feuille défile latéralement');
  for (const el of b.querySelectorAll('b, .act-verb, .obj-n, button')){
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis'
        && getComputedStyle(el).overflow === 'hidden') fautes.push('coupé : ' + el.textContent.trim().slice(0, 40));
  }
  return fautes;
});

/* ---------- les trois téléphones ---------- */
const K = await ecran(KARIM, PISTES_KARIM);
const S2 = await ecran(SOFIA, PISTES_SOFIA);
const I = await ecran(INES, PISTES_INES);
const qrKarim = await monProfilCopie(K.p);
const qrSofia = await monProfilCopie(S2.p);
const bK = await boiteDe(K.p), bS = await boiteDe(S2.p);
if (!bK || !bS) fail('« Mon QR » n’a pas fait naître la boîte aux lettres');
await ajouterAmi(I.p, qrKarim);
await ajouterAmi(I.p, qrSofia);
await sansAnnuler(I.p);

/* ---------- ⑥ (d'abord) ce qui ne propose rien ---------- */
await ouvrirFiche(I.p, 'q');
if (await I.p.$('#fiDemander')) fail('une piste qui a déjà quelqu’un à qui écrire propose de demander');

/* ---------- ② la demande, depuis la fiche ---------- */
await ouvrirFiche(I.p, 'az');
const geste = await I.p.evaluate(() => document.querySelector('#fiDemander')?.textContent.replace(/\s+/g, ' ').trim());
if (geste !== 'Demander à mes amis') fail('la fiche ne propose pas de demander : ' + geste);
await I.p.screenshot({ path: `${SHOTS}/100-demande-fiche-pouce.png` });
await I.p.click('#fiDemander');
await I.p.waitForSelector('#dmGo');
{
  const mot = await I.p.evaluate(() => document.querySelector('#dmMot').textContent.trim());
  const qui = await I.p.evaluate(() => document.querySelector('#dmQui').textContent.replace(/\s+/g, ' ').trim());
  if (mot !== 'Inès cherche quelqu’un chez Aztek.') fail('la phrase qui part : « ' + mot + ' »');
  if (qui !== 'Karim · Sofia') fail('à qui elle part : « ' + qui + ' » (Awa, sans boîte, ne doit pas y être)');
  if (lettres.length) fail('une lettre est partie AVANT « Demander »');
}
await I.p.waitForTimeout(400);
await I.p.screenshot({ path: `${SHOTS}/100-demande-feuille-pouce.png` });
await I.p.click('#dmGo');
await I.p.waitForSelector('#fiDemande', { timeout: 15000 });
{
  const etat = await I.p.evaluate(() => document.querySelector('#fiDemande').textContent.replace(/\s+/g, ' ').trim());
  if (etat !== 'Demandé à 2 amis · aujourd’hui') fail('la fiche ne dit pas que c’est parti : ' + etat);
  if (await I.p.$('#fiDemander')) fail('le bouton reste après la demande');
}
await I.p.waitForTimeout(400);
await I.p.screenshot({ path: `${SHOTS}/100-demande-partie-pouce.png` });
console.log('② la phrase exacte, à qui (sans l’amie ancienne), puis « Demandé à 2 amis » ✓');

/* ---------- ① la fuite d'abord : ce que voit le relais, ce que lit l'ami ---------- */
{
  if (lettres.length !== 2) fail(`${lettres.length} lettre(s) au relais, 2 attendues (Karim, Sofia)`);
  const brut = JSON.stringify(lettres);
  for (const x of ['Aztek', 'AZTEK', 'Inès', 'Ines', 'Roubaix', 'note très privée', 'ines@exemple.test', 'Karim', 'Sofia'])
    if (brut.includes(x)) fail(`le relais lit « ${x} »`);
  const xK = await etiquetteBoite(bK.pub), xS = await etiquetteBoite(bS.pub);
  const pourK = lettres.find(e => e.tags.some(t => t[0] === 'x' && t[1] === xK));
  const pourS = lettres.find(e => e.tags.some(t => t[0] === 'x' && t[1] === xS));
  if (!pourK || !pourS) fail('chaque ami n’a pas SA lettre, rangée sous SON étiquette');
  if (lettres.some(e => !String(e.content).startsWith('OCB1.'))) fail('une lettre part sans être scellée');
  if (lettres.some(e => !e.tags.some(t => t[0] === 'expiration'))) fail('une lettre part sans expiration');
  const l = await ouvrir(bK.priv, pourK.content);
  if (!l) fail('Karim ne peut pas ouvrir sa lettre');
  else {
    const cles = Object.keys(l).sort().join(',');
    if (cles !== 'cercle,de,entreprise,exp,id,t,v') fail('la demande porte : ' + cles);
    if (Object.keys(l.de).sort().join(',') !== 'cle,prenom') fail('« de » porte : ' + Object.keys(l.de));
    if (Object.keys(l.entreprise).join(',') !== 'nom' || l.entreprise.nom !== 'Aztek') fail('« entreprise » : ' + JSON.stringify(l.entreprise));
    if (l.de.prenom !== 'Inès' || l.cercle !== 1) fail('prénom / cercle : ' + JSON.stringify(l));
    if (Math.abs(l.exp - Date.now() - 14 * 864e5) > 120000) fail('la demande ne vit pas 14 jours');
  }
  if (await ouvrir(bS.priv, pourK.content)) fail('Sofia ouvre la lettre de Karim');
}
console.log('① le relais ne lit rien ; la demande ne porte que l’entreprise, le prénom, le cercle, l’expiration ✓');

/* ---------- ③ règle 6 : Sofia ne connaît personne ---------- */
await rouvrir(S2.p);
await attendreReseau(S2.p, 'e.recues.length === 1');
{
  const e = await reseauDe(S2.p);
  if (e.recues[0].statut !== 'rien') fail('chez Sofia la demande est « ' + e.recues[0].statut + ' »');
  if (await S2.p.$('.tr-amis')) fail('« Tes amis » s’affiche chez qui ne trouve rien');
  const t = await S2.p.evaluate(() => document.querySelector('#toast.on')?.textContent || '');
  if (/Inès|cherche/.test(t)) fail('un toast parle de la demande chez Sofia : ' + t);
}
console.log('③ chez Sofia, qui ne connaît personne chez Aztek : rien ne s’affiche ✓');

/* ---------- ④ Karim : ce qu'il donnerait, puis « Donner » ---------- */
await rouvrir(K.p);
await K.p.waitForSelector('.tr-amis .act-ami', { timeout: 15000 });
{
  const ligne = await K.p.evaluate(() => {
    const r = document.querySelector('.tr-amis .act-ami');
    return [r.querySelector('.act-verb'), r.querySelector('.act-vecu'), r.querySelector('.act-who')].map(x => x.textContent.trim()).join(' | ');
  });
  if (ligne !== 'AZTEK SAS | Inès cherche quelqu’un | tu as Julie Marchand') fail('« Tes amis » : ' + ligne);
  const premier = await K.p.evaluate(() => document.querySelector('#view-aujourdhui .tranche')?.classList.contains('tr-amis'));
  if (!premier) fail('« Tes amis » ne passe pas en tête');
}
await K.p.screenshot({ path: `${SHOTS}/100-demande-aujourdhui-ami-pouce.png` });
await K.p.click('.tr-amis .act-main');
await K.p.waitForSelector('#drDonner');
{
  if (await dessus(K.p) !== 'Inès cherche quelqu’un') fail('la feuille : ' + await dessus(K.p));
  /* un seul contact joignable (Paul n'a aucun moyen) : ce n'est pas un
     choix, il se LIT, et « Donner » tient le pied */
  if (await K.p.$('#drListe')) fail('un seul contact se présente comme un choix');
  const vu = await K.p.evaluate(() => [document.querySelector('#drNom'), ...document.querySelectorAll('.overlay .obj-l')]
    .map(x => x.textContent.trim()).join(' | '));
  if (vu !== 'Julie Marchand | RH | julie@aztek.test') fail('ce qu’il donnerait : ' + vu);
  const tout = await K.p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().textContent);
  if (/ne pas citer|note privée|Paul/.test(tout)) fail('la feuille montre ce qui ne part pas : ' + tout.slice(0, 160));
  if (lettres.length !== 2) fail('une lettre est partie AVANT le tap');
}
await K.p.waitForTimeout(400);
await K.p.screenshot({ path: `${SHOTS}/100-demande-recue-pouce.png` });
await K.p.evaluate(() => { const t = document.querySelector('#toast'); if (t){ t.textContent = ''; t.classList.remove('on'); } });
await K.p.click('#drDonner');
await K.p.waitForFunction(() => /Julie Marchand donné à Inès\./.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 15000 });
await K.p.waitForTimeout(300);
if (await K.p.$('.tr-amis')) fail('la ligne reste après avoir donné');
{
  const don = lettres[2];
  if (!don) fail('aucune lettre de don au relais');
  else {
    const bI = await boiteDe(I.p);
    if (JSON.stringify(don).match(/Julie|aztek\.test|ne pas citer|Karim/)) fail('le relais lit le don');
    const l = await ouvrir(bI.priv, don.content);
    if (!l || l.t !== 'don') fail('Inès ne peut pas ouvrir le don');
    else {
      if (Object.keys(l.contact).sort().join(',') !== 'email,name,role') fail('le don porte : ' + Object.keys(l.contact));
      const s = JSON.stringify(l);
      for (const x of ['ne pas citer', 'note privée de Karim', 'Paul', 'todo', 'Lille', 'karim@prive.test'])
        if (s.includes(x)) fail(`le don laisse sortir « ${x} »`);
    }
  }
}
console.log('④ chez Karim, « Tes amis » en tête, ce qu’il donnerait, puis un tap — sans note ni suivi ✓');

/* ---------- ⑤ Inès : l'aperçu, « Ajouter », « Annuler », le merci ---------- */
await rouvrir(I.p);
await I.p.waitForSelector('.tr-amis .act-ami', { timeout: 15000 });
{
  const ligne = await I.p.evaluate(() => {
    const r = document.querySelector('.tr-amis .act-ami');
    return [r.querySelector('.act-verb'), r.querySelector('.act-vecu'), r.querySelector('.act-who')].map(x => x.textContent.trim()).join(' | ');
  });
  if (ligne !== 'Aztek | Karim t’a donné | Julie Marchand') fail('« Tes amis » chez Inès : ' + ligne);
}
await I.p.screenshot({ path: `${SHOTS}/100-demande-aujourdhui-don-pouce.png` });
await ouvrirFiche(I.p, 'az');
{
  const b = await I.p.evaluate(() => document.querySelector('#fiDon')?.textContent.replace(/\s+/g, ' ').trim());
  if (b !== 'Karim t’a donné Julie Marchand') fail('le bandeau de la fiche : ' + b);
}
await I.p.click('#fiDon');
await I.p.waitForSelector('#ddAjouter');
if ((await pisteDe(I.p, 'az')).contacts.length) fail('le contact est ajouté AVANT « Ajouter à la piste » (invariant ②)');
await I.p.waitForTimeout(400);
await I.p.screenshot({ path: `${SHOTS}/100-demande-don-pouce.png` });
await I.p.click('#ddAjouter');
await I.p.waitForTimeout(400);
{
  const c = await pisteDe(I.p, 'az');
  if (c.contacts.length !== 1 || c.contacts[0].name !== 'Julie Marchand' || c.contacts[0].email !== 'julie@aztek.test')
    fail('le contact ajouté : ' + JSON.stringify(c.contacts));
  if (!(c.history || []).some(h => /Contact donné par Karim : Julie Marchand/.test(h.t))) fail('l’historique ne dit pas d’où vient Julie');
  if (!await I.p.$('.undo-bar')) fail('pas d’« Annuler » après l’ajout');
}
/* « Annuler » rend tout, puis on rajoute — Karim ne sera remercié qu'une fois */
await I.p.evaluate(() => [...document.querySelectorAll('.undo-bar .btn')].find(b => /Annuler/.test(b.textContent)).click());
await I.p.waitForTimeout(400);
if ((await pisteDe(I.p, 'az')).contacts.length) fail('« Annuler » ne retire pas le contact');
if (!await I.p.$('#fiDon')) fail('« Annuler » ne rend pas le bandeau du don');
await I.p.click('#fiDon');
await I.p.waitForSelector('#ddAjouter');
await I.p.click('#ddAjouter');
await I.p.waitForTimeout(600);
await sansAnnuler(I.p);
console.log('⑤ chez Inès, l’aperçu avant, « Ajouter à la piste », « Annuler » rend tout ✓');

await rouvrir(K.p);
await attendreReseau(K.p, 'e.mercis.length >= 1');
await K.p.waitForTimeout(1500);
{
  const e = await reseauDe(K.p);
  if (e.mercis.length !== 1) fail(`Karim est remercié ${e.mercis.length} fois`);
  const j = await K.p.evaluate(async () => {
    const st = await import('./engine/storage.js');
    return JSON.stringify(JSON.parse(await st.kvGet(st.JOURNAL_KEY) || '[]'));
  });
  if (!/Merci de Inès : Julie Marchand/.test(j)) fail('le journal de Karim ne garde pas le merci');
}
console.log('⑤ Karim est remercié, une fois, sans un geste de plus ✓');

/* ---------- ⑥ trois demandes ouvertes au plus ; l'amie ancienne ---------- */
for (const id of ['adv', 'th']){
  await ouvrirFiche(I.p, id);
  await I.p.click('#fiDemander');
  await I.p.click('#dmGo');
  await I.p.waitForSelector('#fiDemande', { timeout: 15000 });
}
await ouvrirFiche(I.p, 'or');
if (await I.p.$('#fiDemander')) fail('une quatrième demande se propose (trois ouvertes au plus)');
await fermerTout(I.p);
await I.p.evaluate(() => { location.hash = '#/echanger'; });
await I.p.waitForSelector('#ecAmis');
await I.p.click('#ecAmis');
await I.p.waitForSelector('[data-ami="AwaAwaAwaAwaAwaAwa01"]');
await I.p.click('[data-ami="AwaAwaAwaAwaAwaAwa01"]');
await I.p.waitForTimeout(300);
{
  const t = await I.p.evaluate(() => document.querySelector('#amAncien')?.textContent.trim());
  if (t !== 'Rescanne son QR pour lui demander quelqu’un.') fail('l’amie ancienne : ' + t);
}
await I.p.screenshot({ path: `${SHOTS}/100-demande-amie-ancienne-pouce.png` });
await fermerTout(I.p);
await I.p.click('#ecAmis');
await I.p.waitForSelector('[data-ami]');
await I.p.evaluate(() => [...document.querySelectorAll('[data-ami]')].find(b => /Karim/.test(b.textContent)).click());
await I.p.waitForTimeout(300);
if (await I.p.$('#amAncien')) fail('un ami qui a une boîte se dit « à rescanner »');
console.log('⑥ trois demandes au plus, rien sur une piste qui a déjà quelqu’un, l’amie ancienne à rescanner ✓');

/* ---------- ④ bis : Karim connaît DEUX personnes chez Advens ---------- */
await rouvrir(K.p);
await K.p.waitForSelector('.tr-amis .act-ami', { timeout: 15000 });
await K.p.evaluate(() => [...document.querySelectorAll('.tr-amis .act-ami')].find(r => /Advens/.test(r.textContent)).querySelector('.act-main').click());
await K.p.waitForSelector('#drListe');
{
  const on = () => K.p.evaluate(() => [...document.querySelectorAll('#drListe .pk')].map(b => b.classList.contains('on')));
  if ((await on()).join() !== 'true,false') fail('le premier contact n’est pas choisi d’office : ' + await on());
  await K.p.click('#drListe .pk[data-i="1"]');
  if ((await on()).join() !== 'false,true') fail('choisir un contact n’en choisit pas UN : ' + await on());
  await K.p.waitForTimeout(300);
  await K.p.screenshot({ path: `${SHOTS}/100-demande-recue-deux-pouce.png` });
  const avant = lettres.length;
  await K.p.click('#drDonner');
  await K.p.waitForFunction(() => /Nora Advens donné à Inès\./.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 15000 });
  const l = await ouvrir((await boiteDe(I.p)).priv, lettres[avant].content);
  if (!l || l.contact.name !== 'Nora Advens' || l.contact.phone !== '0600000001') fail('le don ne porte pas le contact choisi : ' + JSON.stringify(l));
}
console.log('④ deux contacts : le premier choisi d’office, un tap en choisit un autre, « Donner » donne celui-là ✓');

/* ---------- ⑦ pouce et poste, clair et sombre, 320 px texte doublé ---------- */
for (const [nom, o] of [['poste', { vp: { width: 1280, height: 800 } }], ['poste-sombre', { vp: { width: 1280, height: 800 }, sombre: true }],
                        ['pouce-sombre', { sombre: true }], ['320-200', { vp: { width: 320, height: 640 }, gros: true }]]){
  const E = await ecran({ ...INES, amis: [AWA, { id: 'KarimKarimKarim01', nom: 'Karim Benali', parcours: [], cle: bK.pub }] }, PISTES_INES, o);
  if (o.gros) await E.p.addStyleTag({ content: 'html{font-size:200% !important}' });
  await ouvrirFiche(E.p, 'az');
  if (!await E.p.$('#fiDemander')) fail(nom + ' : pas de « Demander à mes amis »');
  /* sur la fiche, ce que ce lot AJOUTE : le bouton tient dans la feuille
     et ne se coupe pas (le reste de la fiche a ses propres gardes) */
  let f = await E.p.evaluate(() => {
    const b = document.querySelector('#fiDemander'), m = b.closest('.modal-b').getBoundingClientRect(), r = b.getBoundingClientRect();
    return [...(r.right > m.right + 1 ? ['« Demander à mes amis » dépasse de la feuille'] : []),
            ...(b.scrollWidth > b.clientWidth + 1 ? ['« Demander à mes amis » est coupé'] : [])];
  });
  await E.p.screenshot({ path: `${SHOTS}/100-demande-fiche-${nom}.png` });
  await E.p.click('#fiDemander');
  await E.p.waitForSelector('#dmGo');
  f = f.concat(await deborde(E.p));
  await E.p.waitForTimeout(400);
  await E.p.screenshot({ path: `${SHOTS}/100-demande-feuille-${nom}.png` });
  if (f.length) fail(nom + ' : ' + f.join(' ; '));
  else console.log(`⑦ ${nom} : la fiche et la feuille — rien ne déborde ✓`);
  await E.ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
relay.close();
console.log(process.exitCode ? 'E2E demande : ÉCHEC' : 'E2E demande : OK');

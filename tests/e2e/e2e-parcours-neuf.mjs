/* E2E parcours d'un profil NEUF (première ouverture) : ce qu'aucun autre
   scénario ne joue en entier — l'app vide qui enseigne, la toute première
   capture faite à la main, et sa survie au rechargement. Mobile ET bureau.
   (Le hors-ligne réel est couvert par e2e-oauth-sw ; le thème sombre par
   e2e-pistes — ici on ne les redouble pas.) */
import { chromium, chromiumPath, SHOTS, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];
const watch = p => {
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(String(e)));
};
const closeSheets = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js');
  let s; let n = 0;
  while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); }
});

/* ---------- mobile : première ouverture, tout est vide ---------- */
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const M = await mob.newPage();
watch(M);
await M.goto(base, { waitUntil: 'load' });
await M.waitForSelector('#view-aujourdhui:not([hidden])');

/* Aujourd'hui vide DOIT enseigner, jamais un « aucune donnée » sec (CLAUDE §6) */
const tdEmpty = await M.textContent('.td-empty').catch(() => '');
if (!/première piste|quoi faire|un jour à la fois/i.test(tdEmpty))
  fail('Aujourd’hui vide n’enseigne pas : ' + JSON.stringify(tdEmpty));
else console.log('Aujourd’hui vide : état enseignant ✓');
await M.screenshot({ path: SHOTS + '/parcours-neuf-aujourdhui.png' });

/* Mes pistes vide : même exigence */
await M.click('.bottomnav a[data-r="pistes"]');
await M.waitForSelector('#view-pistes:not([hidden])');
const piEmpty = await M.textContent('.td-empty, .empty-list').catch(() => '');
if (!/Aucune piste|Ajoute une piste|première piste/i.test(piEmpty))
  fail('Mes pistes vide n’enseigne pas : ' + JSON.stringify(piEmpty));
else console.log('Mes pistes vide : état enseignant ✓');

/* première capture — deux blocs (#7) : l'entreprise + le contact, ensemble */
await M.click('#bnAdd');
await M.waitForSelector('#cpName');
await M.fill('#cpName', 'Boulangerie Cyber SARL');
await M.fill('#cpCtName', 'Sam Roubaix');
await M.fill('#cpCtCoord', 'sam@boulangeriecyber.fr');
await M.click('.overlay .btn-primary');           /* Ajouter (rafale : reste ouvert) */
await attendre(M, async () => (await import('./ui/state.js')).S.companies.length === 1,
  { timeout: 8000, message: 'première capture' });
const withCt = await M.evaluate(async () =>
  (await import('./ui/state.js')).S.companies[0].contacts.map(t => t.email));
if (String(withCt) !== 'sam@boulangeriecyber.fr') fail('le contact saisi doit suivre la piste : ' + withCt);
await closeSheets(M);
await M.waitForSelector('.overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
console.log('Première capture : piste + contact créés d’un seul geste ✓');

/* elle s'affiche dans la liste */
await M.click('.bottomnav a[data-r="pistes"]');
await M.waitForSelector('#view-pistes:not([hidden])');
const listed = await M.evaluate(() =>
  [...document.querySelectorAll('#piBody h3, #piBody b')].some(n => /Boulangerie Cyber/.test(n.textContent)));
if (!listed) fail('la piste capturée n’apparaît pas dans Mes pistes');
else console.log('La piste capturée s’affiche dans Mes pistes ✓');

/* persistance : elle survit à un rechargement (IndexedDB, pas la mémoire) */
await M.reload({ waitUntil: 'load' });
await attendre(M, async () => (await import('./ui/state.js')).S.companies.some(c => /Boulangerie Cyber/.test(c.name)),
  { timeout: 8000, message: 'persistance après rechargement' });
console.log('La piste survit au rechargement ✓');

/* ---------- bureau neuf : l'exemple enseigne aussi ---------- */
const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const D = await desk.newPage();
watch(D);
await D.goto(base, { waitUntil: 'load' });
await D.waitForSelector('#view-aujourdhui:not([hidden])');
/* « Voir un exemple » pose de vraies pistes de démo, supprimables */
await D.evaluate(async () => {
  const { addDemo } = await import('./ui/state.js');
  addDemo();
  (await import('./ui/state.js')).bus.refresh?.();
});
await attendre(D, async () => (await import('./ui/state.js')).S.companies.some(c => c.demo),
  { timeout: 6000, message: 'pistes d’exemple' });
console.log('Bureau neuf : les pistes d’exemple se posent ✓');
await D.screenshot({ path: SHOTS + '/parcours-neuf-bureau-demo.png' });

/* ---------- capture au bureau : le formulaire complet (#3) ---------- */
await D.click('#btnAddTop');
await D.waitForSelector('#edName');
if (await D.$('#cpName')) fail('le bureau ne sert plus le mini-formulaire du pouce');
const pied = await D.evaluate(() =>
  [...document.querySelectorAll('.overlay .modal-f .btn')].map(b => b.textContent.trim()));
if (String(pied) !== 'Terminer') fail('un seul bouton attendu au bureau : ' + JSON.stringify(pied));
for (const [sel, val] of [['#edName', 'Boulangerie Cyber SARL'], ['#edCity', 'Roubaix'],
  ['#edTechs', 'SOC, Linux'], ['#cpCtName', 'Sam Roubaix'], ['#cpCtCoord', 'sam@boulangeriecyber.fr']])
  await D.fill(sel, val);
await D.selectOption('#edDomain', 'cyber');
await D.click('.overlay .dchip');                 /* un poste recherché */
await D.screenshot({ path: SHOTS + '/parcours-neuf-capture-bureau.png' });
await D.click('.overlay .modal-f .btn-primary');
await attendre(D, async () =>
  (await import('./ui/state.js')).S.companies.some(c => c.name === 'Boulangerie Cyber SARL'),
  { timeout: 6000, message: 'capture au bureau' });
const neuve = await D.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  const c = S.companies.find(x => x.name === 'Boulangerie Cyber SARL') || {};
  return { city: c.city, domain: c.domain, techs: c.techs, pos: c.positions,
           ct: (c.contacts || []).map(t => t.email), reste: !!document.querySelector('.overlay:not(.ov-out)') };
});
if (neuve.city !== 'Roubaix' || neuve.domain !== 'cyber' || neuve.techs !== 'SOC, Linux')
  fail('les champs complets ne suivent pas la piste : ' + JSON.stringify(neuve));
if (!(neuve.pos || []).length) fail('les postes recherchés ne suivent pas : ' + JSON.stringify(neuve.pos));
if (String(neuve.ct) !== 'sam@boulangeriecyber.fr') fail('le contact ne suit pas : ' + neuve.ct);
if (neuve.reste) fail('au bureau, « Terminer » ferme — pas de rafale');
console.log('Capture au bureau : formulaire complet, un seul bouton, tout est retenu ✓');

/* ---------- écrire : l'accroche d'abord, la matière sous les yeux ----------
   Mesuré avant : l'accroche personnalisée était en 3ᵉ position sur 5,
   derrière « l'activité de X a retenu toute mon attention » — l'accroche
   générique que l'APEC et JobTeaser citent comme à éviter. Et la matière
   pour l'écrire vivait sur la FICHE, derrière cette feuille.
   Les deux chiffres qui justifient le lot : un corps personnalisé répond
   ~33 % plus, une accroche nourrie de recherche fait passer les réponses
   de ~7 % à ~17 %. */
const ecrire = await D.evaluate(async () => {
  const { S, saveData, saveProfile } = await import('./ui/state.js');
  const { normalizeCompany, defaultTemplates } = await import('./engine/model.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  S.profile.name = 'Maheydine Oun';
  S.profile.formation = 'BTS SIO';
  S.profile.email = 'm@x.test';
  /* le profil doit être COMPLET : une ligne « Étiquette : {{jeton}} »
     dont le jeton est vide disparaît (c'est voulu), et un profil creux
     amputerait le gabarit — le compte de mots ne mesurerait alors plus
     le gabarit mais le trou. Une mutation l'a montré. */
  S.profile.phone = '06 39 98 12 34';
  S.profile.cvUrl = 'https://cv.test/moi.pdf';
  S.profile.templates = defaultTemplates();
  saveProfile();
  const lire = async piste => {
    document.querySelectorAll('.overlay .x').forEach(x => x.click());
    await new Promise(r => setTimeout(r, 200));
    S.companies = [normalizeCompany(piste)];
    saveData();
    const { openMail } = await import('./ui/mail.js');
    openMail(S.companies[0], { ctId: S.companies[0].contacts[0].id });
    await new Promise(r => setTimeout(r, 350));
    const corps = document.getElementById('mBody');
    const sav = document.querySelector('.ml-know');
    const msg = document.querySelector('.fld-body');
    return {
      objet: document.getElementById('mSubj').value,
      corps: corps.value,
      savoir: sav ? sav.innerText.replace(/\s+/g, ' ').trim() : '',
      /* la matière doit être AU-DESSUS du champ où l'on écrit, et les
         deux visibles ensemble : lire ailleurs et retenir, c'est le
         travail qu'on essaie justement d'épargner */
      avant: sav ? sav.getBoundingClientRect().bottom <= msg.getBoundingClientRect().top + 1 : null,
      ecart: sav ? Math.round(msg.getBoundingClientRect().top - sav.getBoundingClientRect().bottom) : null
    };
  };
  return {
    riche: await lire({ name: 'Adrastia Systèmes', city: 'Toulouse',
      desc: 'SOC managé pour les PME', techs: 'Fortinet, Linux',
      tips: 'passer par le forum', website: 'adrastia.example',
      process: 'CV → RH → test', contacts: [{ name: 'Nadia', email: 'n@a.test' }] }),
    siteSeul: await lire({ name: 'Velmont', website: 'velmont.example',
      contacts: [{ name: 'Marc', email: 'm@v.test' }] }),
    rien: await lire({ name: 'Ostral', contacts: [{ name: 'X', email: 'x@o.test' }] })
  };
});

/* ① l'accroche est le PREMIER bloc après le bonjour */
const blocs = ecrire.riche.corps.split(/\n\n+/);
if (!/^\[/.test((blocs[1] || '').trim()))
  fail('l’accroche personnalisée n’est pas le premier bloc : ' + JSON.stringify(blocs.slice(0, 2)));
/* ② et le modèle ne souffle plus l'accroche générique à éviter */
else if (/retenu toute mon attention|votre entreprise m['’]intéresse/i.test(
           ecrire.riche.corps.replace(/\[[^\]]*\]/g, '')))
  fail('le modèle contient l’accroche générique que les recruteurs voient dix fois par jour');
/* ③ court : hors accroche, le corps tient sous 50 mots */
else {
  const mots = ecrire.riche.corps.replace(/\[[^\]]*\]/g, '').split(/\s+/).filter(Boolean).length;
  if (mots > 50) fail(`${mots} mots hors accroche — sous 100 les réponses montent, on vise bien plus court`);
  else if (ecrire.riche.objet.length < 30 || ecrire.riche.objet.length > 60)
    fail(`objet de ${ecrire.riche.objet.length} car. — hors de la fenêtre 40-60 qui s’affiche en entier au mobile`);
  else console.log(`écrire : accroche en 1ᵉʳ bloc, ${mots} mots, objet ${ecrire.riche.objet.length} car. ✓`);
}
/* ④ la matière est là, au-dessus du champ, et seulement quand elle existe */
if (!/SOC managé/.test(ecrire.riche.savoir) || !/Fortinet/.test(ecrire.riche.savoir)
    || !/forum/.test(ecrire.riche.savoir))
  fail('« À savoir » n’apporte pas la matière de la fiche : ' + ecrire.riche.savoir);
else if (/CV → RH/.test(ecrire.riche.savoir))
  fail('le process est remonté dans le composeur — il n’aide pas à écrire la première phrase');
else if (!ecrire.riche.avant)
  fail(`la matière est SOUS le champ message (${ecrire.riche.ecart}px) — on écrit après avoir lu`);
else if (!/velmont\.example/.test(ecrire.siteSeul.savoir))
  fail('sans notes, le site devrait être la matière : ' + ecrire.siteSeul.savoir);
else if (ecrire.rien.savoir)
  fail('un cadre « À savoir » vide s’affiche alors qu’il n’y a rien à savoir');
else console.log('« À savoir » : les notes au-dessus du champ, le site en repli, absent si rien ✓');

if (errors.length) fail('erreurs console : ' + JSON.stringify(errors.slice(0, 6)));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E parcours neuf : ÉCHEC' : 'E2E parcours neuf : OK');
await browser.close();
server.close();
process.exit(process.exitCode || 0);

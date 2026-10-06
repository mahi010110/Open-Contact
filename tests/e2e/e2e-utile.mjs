/* ============================================================
   « À découvrir » doit être UTILE (docs/utile.md)

   Retour du mainteneur, 6 octobre 2026 : « je ne sais pas à qui écrire »,
   « les entreprises ne correspondent pas », « je ne sais pas si elles
   recrutent », « la carte ne m'aide pas à choisir ». Chaque réponse a
   été mesurée sur le vrai monde (`sonde-utile.mjs`) ; ce fichier garde
   ce que l'écran en fait, en partant de l'état RÉEL de l'app :

   ① une ville tapée cherche AUTOUR de son centre : la question porte le
     point (et rien de privé), et ce qui tombe à plus de 30 km du centre
     ne s'affiche pas — « Lille » rendait Maubeuge ;
   ② qui recrute : pour une alternance, « Offres d'alternance autour de
     Lille » tient la tête de la liste — un LIEN vers La bonne alternance,
     qui ne part que si on le touche ; pour un stage, rien ;
   ③ à qui écrire, selon la taille : le dirigeant d'une PME par son nom,
     le recrutement d'une grande — jamais une adresse devinée ;
   ④ « colle à ta formation » ne se dit que quand c'est vrai : SISR et des
     missions de réseau, oui ; SISR et de l'édition de logiciels, non ;
   ⑤ au poste, la même chose, et le lien tient sa cible.

   L'annuaire est REMPLACÉ par des réponses à sa forme relevée ; les
   autres sources se taisent.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* trois entreprises autour de Lille, une à Dunkerque (65 km du centre) */
const ENT = (siren, nom, ville, cp, tranche, naf, lat, lng, o = {}) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, activite_principale: naf, tranche_effectif_salarie: tranche,
  categorie_entreprise: o.cat || 'PME', date_creation: '2009-03-12', nombre_etablissements_ouverts: 3, etat_administratif: 'A',
  nature_juridique: '5710', complements: { liste_idcc: ['1486'], est_entrepreneur_individuel: false },
  siege: { est_siege: true, numero_voie: '7', type_voie: 'RUE', libelle_voie: 'NATIONALE', code_postal: cp, libelle_commune: ville,
           latitude: String(lat), longitude: String(lng), etat_administratif: 'A', caractere_employeur: 'O' },
  matching_etablissements: [],
  dirigeants: [{ nom: o.dn || 'LEROY', prenoms: o.dp || 'THOMAS', qualite: 'Président', type_dirigeant: 'personne physique' }]
});
const RES = [
  ENT('812345678', 'ADVENS', 'LILLE', '59000', '22', '62.03Z', 50.64, 3.07),
  ENT('326820065', 'SOPRA STERIA GROUP', 'LILLE', '59000', '53', '62.02A', 50.636, 3.06, { cat: 'GE' }),
  ENT('411111111', 'EDITIONS LOGICIELLES DU NORD', 'LAMBERSART', '59130', '12', '58.29C', 50.65, 3.02, { dn: 'NGUYEN', dp: 'MARC' }),
  ENT('433333333', 'NORD RESEAUX SERVICES', 'DUNKERQUE', '59140', '11', '62.09Z', 51.03, 2.37)
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR', ecole: 'Lycée Baggio', recherche: 'alternance', email: 'ines@exemple.test' };
const PISTES = [{ id: 'a', name: 'Advalys Cyber', city: 'Lille', status: 'active', updatedAt: 5, notes: 'rappeler Bertrand',
  contacts: [{ id: 'c1', name: 'Julie Marchand', email: 'julie@advalys.test' }] }];
const PRIVES = ['bertrand', 'julie', 'marchand', 'ines', 'martin', 'baggio', 'sisr'];
const pliees = s => decodeURIComponent(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function ecran(vp, touch, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  const journal = [], ailleurs = [];
  const cors = { 'access-control-allow-origin': '*' };
  await ctx.route('https://recherche-entreprises.api.gouv.fr/**', r => { journal.push(r.request().url());
    const q = new URL(r.request().url()).searchParams.get('q') || '';
    const res = /^\d{9}$/.test(q) ? RES.filter(x => x.siren === q) : RES;
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: res, total_results: res.length }) }); });
  /* les sources de la carte se taisent ; tout ce qui sort ailleurs est noté */
  await ctx.route(/^https:\/\/(query\.wikidata\.org|fr\.wikipedia\.org|bodacc-datadila\.opendatasoft\.com|(commons|upload)\.wikimedia\.org)\//,
    r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"results":{"bindings":[]},"type":"standard"}' }));
  await ctx.route('https://autocomplete.clearbit.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' }));
  await ctx.route(/labonnealternance|linkedin|hellowork/, r => { ailleurs.push(r.request().url()); return r.abort(); });
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [PISTES, { ...PROFIL, ...(o.profil || {}) }]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  return { ctx, p, journal, ailleurs };
}
const chercher = async (p, q) => {
  await p.fill('#piQ', q);
  await p.waitForTimeout(1100);
  if (!(await p.$('#piPortee [data-portee="decouvrir"][aria-selected="true"], #piPortee [data-portee="decouvrir"].on')))
    await p.click('#piPortee [data-portee="decouvrir"]');
  await p.waitForSelector('#piDec .dc-row', { timeout: 4000 });
  await p.waitForTimeout(300);
};
const lireListe = p => p.evaluate(() => ({
  noms: [...document.querySelectorAll('#piDec .dc-row .dc-nom')].map(x => x.textContent.trim()),
  subs: [...document.querySelectorAll('#piDec .dc-row .dc-sub')].map(x => x.textContent.trim()),
  offres: (() => { const a = document.querySelector('#piDec .dc-offres'); if (!a) return null;
    const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), href: a.href, cible: a.target, h: Math.round(r.height) }; })()
}));
const lireApercu = (p, sel) => p.evaluate(sel => {
  const b = document.querySelector(sel);
  if (!b) return null;
  const lignes = {};
  b.querySelectorAll('.ct .fk').forEach(f => { lignes[f.querySelector('.fk-l').textContent.trim()] = f.querySelector('.fk-v').textContent.replace(/\s+/g, ' ').trim(); });
  const li = b.querySelector('.ct .ct-li');
  return { lignes, ton: !!b.querySelector('.ct-ton'), li: li ? li.href : '', mail: /@/.test(b.textContent) };
}, sel);

/* ---------- au pouce ---------- */
{
  const { ctx, p, journal, ailleurs } = await ecran({ width: 390, height: 844 }, true);
  await chercher(p, 'alternance réseau Lille');
  const l = await lireListe(p);
  /* ① autour de la ville : la question porte le point, rien de privé */
  const pt = journal.map(u => new URL(u)).find(u => u.pathname === '/near_point');
  if (!pt || pt.searchParams.get('lat') !== '50.631' || pt.searchParams.get('long') !== '3.047' || pt.searchParams.get('radius') !== '15')
    fail('« Lille » ne cherche pas autour de son centre : ' + (pt ? pt.search : journal.join(' | ')));
  for (const u of journal){ const w = PRIVES.find(m => pliees(u).includes(m)); if (w) fail(`« ${w} » est sorti : ${u}`); }
  if (l.noms.length !== 3) fail('la liste n’a pas été mesurée : ' + JSON.stringify(l.noms));
  if (l.noms.some(n => /Nord Reseaux/i.test(n))) fail('Dunkerque, à 65 km, s’affiche pour « Lille »');
  if (!l.subs.every(s => /\d+ km/.test(s))) fail('la distance au centre ne se lit pas sur chaque ligne : ' + l.subs);
  if (!process.exitCode) console.log(`pouce · ① « Lille » : autour de son centre (15 km), rien de privé ; Dunkerque écartée ; ${l.noms.length} lignes, chacune à sa distance ✓`);

  /* ② qui recrute : un lien, en tête, qui ne part que si on le touche */
  if (!l.offres) fail('« Offres d’alternance autour de Lille » manque');
  else {
    const u = new URL(l.offres.href);
    if (l.offres.t !== 'Offres d’alternance autour de Lille') fail('le lien d’offres dit : ' + l.offres.t);
    if (u.origin !== 'https://labonnealternance.apprentissage.beta.gouv.fr' || u.searchParams.get('romes') !== 'M1801,M1810'
        || u.searchParams.get('job_name') !== 'Administration réseau' || u.searchParams.get('address') !== 'Lille')
      fail('le lien d’offres : ' + l.offres.href);
    if ([...u.searchParams.keys()].sort().join() !== 'address,job_name,lat,lon,radius,romes') fail('le lien d’offres porte autre chose : ' + u.search);
    if (l.offres.cible !== '_blank') fail('le lien d’offres ne s’ouvre pas ailleurs');
    if (l.offres.h < 44) fail(`le lien d’offres fait ${l.offres.h} px au doigt`);
    const y = await p.evaluate(() => [document.querySelector('#piDec .dc-offres').getBoundingClientRect().top,
      document.querySelector('#piDec .dc-list').getBoundingClientRect().top]);
    if (!(y[0] < y[1])) fail('le lien d’offres ne tient pas la tête de la liste');
  }
  if (ailleurs.length) fail('La bonne alternance ou LinkedIn ont été appelés sans geste : ' + ailleurs[0]);
  if (!process.exitCode) console.log('pouce · ② « Offres d’alternance autour de Lille » en tête : un lien, le métier et le point, rien ne part sans geste ✓');
  await p.screenshot({ path: `${SHOTS}/99-utile-liste-pouce.png` });

  /* ③ ④ l'aperçu : à qui écrire selon la taille, « colle à ta formation » quand c'est vrai */
  const voir = async nom => {
    await p.click(`#piDec .dc-row:has-text("${nom}") .dc-main`);
    await p.waitForSelector('.overlay .ct .fk', { timeout: 3000 });
    await p.waitForTimeout(300);
    const a = await lireApercu(p, '.overlay .modal-b');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(350);
    return a;
  };
  const pme = await voir('Advens');
  if (pme.lignes['Écrire à'] !== 'Thomas Leroy, président LinkedIn') fail('PME : à qui écrire : ' + pme.lignes['Écrire à']);
  if (new URL(pme.li).searchParams.get('keywords') !== 'Thomas Leroy Advens') fail('PME : la recherche LinkedIn : ' + pme.li);
  if (!pme.ton || !/^Infogérance/.test(pme.lignes['Missions'] || '')) fail('SISR et de l’infogérance : « colle à ta formation » manque — ' + JSON.stringify(pme.lignes));
  const grande = await voir('Sopra');
  if (grande.lignes['Écrire à'] !== 'Son service recrutement LinkedIn') fail('grande : à qui écrire : ' + grande.lignes['Écrire à']);
  if (new URL(grande.li).searchParams.get('keywords') !== 'Sopra Steria Group recrutement') fail('grande : la recherche LinkedIn : ' + grande.li);
  const edit = await voir('Editions');
  if (edit.ton) fail('SISR et de l’édition de logiciels : « colle à ta formation » se dit à tort');
  if (edit.lignes['Missions'] !== 'Édition de logiciels') fail('missions : ' + edit.lignes['Missions']);
  if ([pme, grande, edit].some(a => a.mail)) fail('une adresse e-mail apparaît dans un aperçu : rien ne se devine');
  if (ailleurs.length) fail('LinkedIn a été appelé sans geste : ' + ailleurs[0]);
  if (!process.exitCode) console.log('pouce · ③ ④ le dirigeant d’une PME, le recrutement d’une grande, aucune adresse devinée ; « colle à ta formation » seulement quand c’est vrai ✓');

  /* ② pour un STAGE : pas le service de l'alternance, mais HelloWork,
     avec les mots MESURÉS porteurs (docs/recherche-profil.md) */
  await chercher(p, 'stage réseau Roubaix');
  const s = await lireListe(p);
  const su = s.offres && new URL(s.offres.href);
  if (!s.offres || /labonnealternance/.test(s.offres.href)) fail('un stage n’a pas son lien d’offres de stage : ' + JSON.stringify(s.offres));
  else if (s.offres.t !== 'Offres de stage autour de Roubaix' || su.origin !== 'https://www.hellowork.com'
      || su.searchParams.get('k') !== 'stage réseau' || su.searchParams.get('l') !== 'Roubaix'
      || [...su.searchParams.keys()].sort().join() !== 'k,l' || s.offres.cible !== '_blank' || s.offres.h < 44)
    fail('le lien d’offres de stage : ' + JSON.stringify(s.offres));
  else if (ailleurs.length) fail('HelloWork a été appelé sans geste : ' + ailleurs[0]);
  else console.log('pouce · ② pour un stage : « Offres de stage autour de Roubaix », HelloWork, « stage réseau » — rien ne part sans geste ✓');
  await ctx.close();
}

/* ---------- ⑤ au poste, clair et sombre ---------- */
for (const sombre of [false, true]){
  const { ctx, p, ailleurs } = await ecran({ width: 1280, height: 800 }, false, { sombre });
  await chercher(p, 'alternance réseau Lille');
  const l = await lireListe(p);
  if (!l.offres || l.noms.length !== 3) fail(`poste${sombre ? ' sombre' : ''} : ${JSON.stringify(l)}`);
  if (l.offres && l.offres.h < 32) fail(`poste : le lien d’offres fait ${l.offres.h} px`);
  await p.click('#piDec .dc-row:has-text("Advens") .dc-main');
  await p.waitForSelector('#piDec .dc-detail .ct .fk', { timeout: 3000 });
  const a = await lireApercu(p, '#piDec .dc-detail');
  if (a.lignes['Écrire à'] !== 'Thomas Leroy, président LinkedIn') fail('poste : à qui écrire : ' + JSON.stringify(a.lignes));
  if (ailleurs.length) fail('poste : un site a été appelé sans geste : ' + ailleurs[0]);
  await p.evaluate(() => document.activeElement.blur());
  await p.screenshot({ path: `${SHOTS}/99-utile-poste${sombre ? '-sombre' : ''}.png` });
  if (!process.exitCode) console.log(`poste ${sombre ? 'sombre' : 'clair'} · ⑤ le lien d’offres, la liste autour de Lille, à qui écrire dans le panneau ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E utile : ÉCHEC' : 'E2E utile : OK');

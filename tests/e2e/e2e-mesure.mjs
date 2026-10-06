/* ============================================================
   UNE RECHERCHE À TA MESURE (docs/recherche-profil.md)

   Demande du mainteneur, 6 octobre 2026 : « que la recherche passe au
   niveau supérieur — des informations précises et adaptées au profil ».
   Ses quatre décisions (« Où je cherche », HelloWork + Clearbit,
   « Nouveau » + « Pas pour moi », une ligne de marché) et ce que les
   sondes ont relevé sont gardés ici, en partant de l'état RÉEL de l'app :

   ① « Autour de » dans le profil : une ville que l'app ne sait pas
     placer se dit sous son champ, avec la ville la plus proche quand
     c'est une faute de frappe ; la ville s'enregistre comme l'app
     l'écrit, avec son rayon ;
   ② le profil AJOUTE à la question ce que la barre ne dit pas — ta ville
     et ton rayon, le métier de ta formation — en ÉTIQUETTES visibles :
     la question porte le centre et le rayon, jamais le texte du profil
     ni un mot privé ; la croix retire, la puce revient en pointillé,
     un tap la remet ;
   ③ la taille du SITE qu'on rejoindrait (« 6-9 salariés ici ») sur la
     ligne et dans la carte, et l'aide à l'embauche d'un apprenti ;
   ④ « Pas pour moi » : la ligne sort et ne revient pas, Annuler la rend,
     « Écartées » la remet — et ça tient après un rechargement ;
   ⑤ « Nouveau » : rien la première fois, puis seulement ce qui n'y
     était pas ;
   ⑥ le marché (BMO 2026) en une ligne, sa source nommée ;
   ⑦ une faute de frappe se PROPOSE (« Lille ? »), un tap la corrige ;
   ⑧ un stage, sans rien taper que « stage » : le lien HelloWork vers la
     ville du profil ;
   ⑨ au poste, clair et sombre : les étiquettes, « Pas pour moi » dans le
     panneau, rien ne déborde.

   MUTATIONS jouées à la main avant livraison (chacune fait rougir) :
   le rayon ignoré (`rayonVille` retiré), le profil appliqué même retiré
   (`sansProfil` ignoré), les écartées non filtrées (`ecartees` retiré de
   `classer`), « nouveau » dès la première fois (`nouveauxDe` sans
   souvenir), le texte du profil dans la question (le libellé au lieu du
   centre).

   L'annuaire est REMPLACÉ par des réponses à sa forme relevée ; les
   autres sources se taisent.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ENT = (siren, nom, ville, cp, tranche, naf, lat, lng, o = {}) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, activite_principale: naf, tranche_effectif_salarie: tranche,
  categorie_entreprise: o.cat || 'PME', date_creation: '2009-03-12', nombre_etablissements_ouverts: 3, etat_administratif: 'A',
  nature_juridique: '5710', complements: { liste_idcc: ['1486'], est_entrepreneur_individuel: false },
  siege: { est_siege: true, numero_voie: '7', type_voie: 'RUE', libelle_voie: 'NATIONALE', code_postal: '69001', libelle_commune: 'LYON',
           latitude: '45.76', longitude: '4.83', etat_administratif: 'A', caractere_employeur: 'O' },
  /* l'ÉTABLISSEMENT trouvé autour du point, avec SA taille et SON activité */
  matching_etablissements: [{ est_siege: false, numero_voie: '3', type_voie: 'RUE', libelle_voie: 'DU PORT', code_postal: cp,
    libelle_commune: ville, latitude: String(lat), longitude: String(lng), etat_administratif: 'A', caractere_employeur: 'O',
    tranche_effectif_salarie: o.ici || 'NN', activite_principale: o.nafIci || naf }],
  dirigeants: [{ nom: 'LEROY', prenoms: 'THOMAS', qualite: 'Président', type_dirigeant: 'personne physique' }]
});
const BASE = [
  ENT('812345678', 'FIDUCIAL INFORMATIQUE', 'VILLENEUVE-D\'ASCQ', '59650', '41', '62.02A', 50.62, 3.14, { ici: '03', cat: 'ETI' }),
  ENT('326820065', 'RESEAUX DU NORD', 'LILLE', '59000', '12', '62.03Z', 50.636, 3.06),
  ENT('411111111', 'DIGITAL FLANDRE', 'LAMBERSART', '59130', '11', '62.09Z', 50.65, 3.02)
];
const NEUVE = ENT('422222222', 'NOUVELLE INFRA', 'LOOS', '59120', '11', '62.03Z', 50.61, 3.01);
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR', ecole: 'Lycée Baggio', recherche: 'alternance', debut: '2026-11-02',
  email: 'ines@exemple.test' };
const PISTES = [{ id: 'a', name: 'Advalys Cyber', city: 'Lille', status: 'active', updatedAt: 5, notes: 'rappeler Bertrand',
  contacts: [{ id: 'c1', name: 'Julie Marchand', email: 'julie@advalys.test' }] }];
const PRIVES = ['bertrand', 'julie', 'marchand', 'ines', 'martin', 'baggio', 'sisr', 'lille'];
const pliees = s => decodeURIComponent(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function ecran(vp, touch, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  const etat = { journal: [], ailleurs: [], res: [...BASE] };
  const cors = { 'access-control-allow-origin': '*' };
  await ctx.route('https://recherche-entreprises.api.gouv.fr/**', r => { etat.journal.push(r.request().url());
    const q = new URL(r.request().url()).searchParams.get('q') || '';
    const res = /^\d{9}$/.test(q) ? etat.res.filter(x => x.siren === q) : etat.res;
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: res, total_results: res.length }) }); });
  await ctx.route(/^https:\/\/(query\.wikidata\.org|fr\.wikipedia\.org|bodacc-datadila\.opendatasoft\.com|(commons|upload)\.wikimedia\.org)\//,
    r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"results":{"bindings":[]},"type":"standard"}' }));
  await ctx.route('https://autocomplete.clearbit.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' }));
  await ctx.route(/labonnealternance|linkedin|hellowork/, r => { etat.ailleurs.push(r.request().url()); return r.abort(); });
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
  return { ctx, p, etat };
}
const versDecouvrir = async (p, q) => {
  await p.fill('#piQ', q);
  await p.waitForTimeout(200);
  if (!(await p.$('#piPortee [data-portee="decouvrir"][aria-selected="true"]'))) await p.click('#piPortee [data-portee="decouvrir"]');
  await p.waitForSelector('#piDec .dc-row', { timeout: 4000 });
  await p.waitForFunction(() => !document.querySelector('#piDec [aria-busy="true"]'), null, { timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(250);
};
const lire = p => p.evaluate(() => ({
  noms: [...document.querySelectorAll('#piDec .dc-row .dc-nom')].map(x => x.textContent.trim()),
  subs: [...document.querySelectorAll('#piDec .dc-row .dc-sub')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
  neufs: [...document.querySelectorAll('#piDec .dc-row:has(.dc-neuf) .dc-nom')].map(x => x.textContent.trim()),
  chips: [...document.querySelectorAll('#piChips .st-chip')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
  props: [...document.querySelectorAll('#piChips .prop-chip')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
  marche: document.querySelector('#piDec .dc-marche')?.textContent.replace(/\s+/g, ' ').trim() || '',
  offres: (() => { const a = document.querySelector('#piDec .dc-offres'); return a ? { t: a.textContent.trim(), href: a.href } : null; })(),
  ecl: document.querySelector('#piDec [data-dc-ecartees]')?.textContent.trim() || ''
}));
const dernieres = (etat, n0) => etat.journal.slice(n0).map(u => new URL(u));

/* ---------- ① « Autour de » dans le profil ---------- */
{
  const { ctx, p } = await ecran({ width: 390, height: 844 }, true);
  await p.goto(base + '/#/moi', { waitUntil: 'load' });
  await p.waitForSelector('#moiProfil');
  await p.click('#moiProfil');
  await p.waitForSelector('#pfVille');
  await p.fill('#pfVille', 'Lile');
  await p.locator('#pfVille').blur();
  await p.waitForTimeout(150);
  const err = await p.evaluate(() => ({ t: document.querySelector('#pfVilleErr')?.textContent.trim(), cache: document.querySelector('#pfVilleErr')?.hidden,
    inv: document.querySelector('#pfVille').getAttribute('aria-invalid'), desc: document.querySelector('#pfVille').getAttribute('aria-describedby') }));
  if (err.cache || err.t !== 'Ville inconnue. Lille ?' || err.inv !== 'true' || err.desc !== 'pfVilleErr')
    fail('« Lile » : l’erreur sous le champ : ' + JSON.stringify(err));
  await p.screenshot({ path: `${SHOTS}/99-mesure-profil-erreur.png` });
  await p.click('#pfVilleErr [data-pf-ville]');
  if (await p.inputValue('#pfVille') !== 'Lille') fail('« Lille ? » ne remplit pas le champ');
  /* une ville que l'app ne sait pas placer RETIENT la feuille, sous son champ */
  await p.fill('#pfVille', 'Trifouillis');
  await p.click('.overlay .modal-f .btn-primary');
  await p.waitForTimeout(250);
  const retenu = await p.evaluate(() => ({ ouvert: !!document.querySelector('#pfVille'), t: document.querySelector('#pfVilleErr')?.textContent.trim(),
    focus: document.activeElement?.id }));
  if (!retenu.ouvert || retenu.t !== 'Ville inconnue. Essaie la grande ville la plus proche.' || retenu.focus !== 'pfVille')
    fail('une ville inconnue n’est pas retenue sous son champ : ' + JSON.stringify(retenu));
  await p.fill('#pfVille', 'saint etienne');
  await p.click('.overlay [data-rayon="5"]');
  const rayons = await p.evaluate(() => [...document.querySelectorAll('.overlay [data-rayon]')].map(b => [b.textContent.trim(), b.getAttribute('aria-pressed'),
    Math.round(b.getBoundingClientRect().height)]));
  if (rayons.map(r => r[0]).join() !== '5 km,15 km,30 km' || rayons.find(r => r[1] === 'true')[0] !== '5 km' || rayons.some(r => r[2] < 44))
    fail('les rayons : ' + JSON.stringify(rayons));
  await p.screenshot({ path: `${SHOTS}/99-mesure-profil.png` });
  await p.click('.overlay .modal-f .btn-primary');
  await p.waitForSelector('#pfVille', { state: 'detached' });
  const pr = await p.evaluate(async () => { const st = await import('./engine/storage.js'); return JSON.parse(await st.kvGet(st.PROFILE_KEY)); });
  if (pr.ville !== 'Saint-Étienne' || pr.rayon !== 5) fail('le profil enregistre : ' + JSON.stringify({ ville: pr.ville, rayon: pr.rayon }));
  if (!process.exitCode) console.log('pouce · ① « Lile » → « Ville inconnue. Lille ? » sous le champ, un tap corrige ; une ville inconnue retient la feuille ; « saint etienne » s’enregistre « Saint-Étienne », 5 km ✓');
  await ctx.close();
}

/* ---------- ② à ⑦ au pouce ---------- */
{
  const { ctx, p, etat } = await ecran({ width: 390, height: 844 }, true, { profil: { ville: 'Lille', rayon: 5 } });
  let n0 = etat.journal.length;
  await versDecouvrir(p, 'alternance');
  let l = await lire(p);
  let qs = dernieres(etat, n0);
  const pt = qs.find(u => u.pathname === '/near_point');
  /* ② le profil ajoute, en étiquettes : la question porte le centre et le rayon */
  if (l.chips.join(' | ') !== 'Alternance | Réseau | Lille · 5 km')
    fail('les étiquettes : ' + JSON.stringify(l.chips));
  /* ⑤ la toute PREMIÈRE fois, rien n'est « nouveau » : tout le serait */
  if (l.neufs.length) fail('« nouveau » dès la première recherche : ' + l.neufs);
  if (!pt || pt.searchParams.get('lat') !== '50.631' || pt.searchParams.get('long') !== '3.047' || pt.searchParams.get('radius') !== '5'
      || pt.searchParams.get('activite_principale') !== '62.02A,62.03Z,62.09Z,61.10Z,46.51Z')
    fail('la question ne porte pas le centre, le rayon et le métier : ' + (pt ? pt.search : qs.map(u => u.search).join(' | ')));
  for (const u of etat.journal){ const w = PRIVES.find(m => pliees(u).includes(m)); if (w) fail(`« ${w} » est sorti : ${u}`); }
  /* la jumelle demande tout le Nord : ce qui tombe à plus de 10 km (2 × 5) est écarté */
  if (!l.noms.length) fail('la liste n’a pas été mesurée');
  if (!process.exitCode) console.log('pouce · ② « Réseau » et « Lille · 5 km » en étiquettes ; la question porte le centre, 5 km, les codes du réseau — rien de privé, ni le texte du profil ✓');

  /* ⑥ le marché, une ligne, sa source nommée */
  if (!/^Nord : \d[\d  ]* embauches prévues en réseau et support, \d+ % difficiles à pourvoir\. France Travail, 2026$/.test(l.marche))
    fail('la ligne de marché : ' + l.marche);
  else console.log('pouce · ⑥ « ' + l.marche + ' » ✓');

  /* ③ la taille du SITE sur la ligne, et dans la carte avec celle de l'entreprise ; l'aide */
  const fid = l.subs[l.noms.findIndex(n => /Fiducial/.test(n))] || '';
  if (!/6-9 salariés ici$/.test(fid)) fail('la ligne ne dit pas la taille du site : ' + fid);
  await p.click('#piDec .dc-row:has-text("Fiducial") .dc-main');
  await p.waitForSelector('.overlay .ct .fk');
  await p.waitForTimeout(600);
  const carte = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.overlay .ct .fk')].map(f =>
    [f.querySelector('.fk-l').textContent.trim(), f.querySelector('.fk-v').textContent.replace(/\s+/g, ' ').trim()])));
  if (carte['Taille'] !== '6 à 9 salariés ici · 500 à 999 en tout') fail('la taille dans la carte : ' + carte['Taille']);
  /* une ETI, un BTS : 1 500 €, sous conditions */
  if (carte['Aide'] !== 'l’État lui verse jusqu’à 1 500 € la 1re année, sous conditions') fail('l’aide : ' + carte['Aide']);
  const pied = await p.evaluate(() => [...document.querySelectorAll('.overlay .modal-f .btn')].map(b => b.textContent.trim()));
  if (pied.join(' | ') !== 'Pas pour moi | Ajouter à mes pistes') fail('le pied de l’aperçu : ' + pied);
  await p.screenshot({ path: `${SHOTS}/99-mesure-apercu-pouce.png` });
  if (!process.exitCode) console.log('pouce · ③ « 6-9 salariés ici » sur la ligne ; « 6 à 9 salariés ici · 500 à 999 en tout » et l’aide (1 500 €, sous conditions) dans la carte ✓');

  /* ④ « Pas pour moi » depuis l'aperçu : la ligne sort, Annuler la rend */
  await p.click('.overlay .modal-f .btn:has-text("Pas pour moi")');
  await p.waitForTimeout(400);
  l = await lire(p);
  if (l.noms.some(n => /Fiducial/.test(n))) fail('« Pas pour moi » : la ligne est restée');
  if (l.ecl !== 'Écartées · 1') fail('« Écartées » ne se lit pas en pied de liste : ' + l.ecl);
  await p.click('#undoBar button, .undo-bar button, [data-undo]').catch(() => fail('pas de barre Annuler'));
  await p.waitForTimeout(400);
  l = await lire(p);
  if (!l.noms.some(n => /Fiducial/.test(n)) || l.ecl) fail('Annuler ne rend pas la ligne : ' + JSON.stringify(l.noms) + ' ' + l.ecl);
  /* écartée pour de bon : elle ne revient pas après un rechargement, « Écartées » la remet */
  await p.click('#piDec .dc-row:has-text("Fiducial") .dc-main');
  await p.waitForSelector('.overlay .modal-f');
  await p.click('.overlay .modal-f .btn:has-text("Pas pour moi")');
  await p.waitForTimeout(400);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  n0 = etat.journal.length;
  await versDecouvrir(p, 'alternance');
  l = await lire(p);
  if (l.noms.some(n => /Fiducial/.test(n))) fail('écartée, elle revient après un rechargement');
  await p.click('#piDec [data-dc-ecartees]');
  await p.waitForSelector('.overlay [data-rendre]');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${SHOTS}/99-mesure-ecartees.png` });
  await p.click('.overlay [data-rendre]');
  await p.waitForTimeout(400);
  l = await lire(p);
  if (!l.noms.some(n => /Fiducial/.test(n)) || await p.$('.overlay [data-rendre]')) fail('« Écartées » ne la remet pas : ' + JSON.stringify(l.noms));
  if (!process.exitCode) console.log('pouce · ④ « Pas pour moi » : la ligne sort, Annuler la rend ; écartée, elle ne revient pas après un rechargement ; « Écartées · 1 » la remet ✓');

  /* ② la croix retire l'étiquette du profil : elle revient en pointillé, un tap la remet */
  n0 = etat.journal.length;
  await p.click('#piChips [data-dc-pf="lieu"]');
  await p.waitForTimeout(1100);
  l = await lire(p);
  const focusPf = await p.evaluate(() => document.activeElement?.dataset?.dcPf || document.activeElement?.id);
  if (l.chips.includes('Lille · 5 km') || !l.props.includes('Lille · 5 km')) fail('retirée, « Lille · 5 km » ne revient pas en pointillé : ' + JSON.stringify(l));
  if (focusPf !== 'lieu') fail('le focus tombe ailleurs que sur la puce : ' + focusPf);
  if (dernieres(etat, n0).some(u => u.pathname === '/near_point')) fail('retirée, la ville part encore : ' + dernieres(etat, n0).map(u => u.search));
  await p.click('#piChips .prop-chip[data-dc-pf="lieu"]');
  await p.waitForTimeout(1100);
  l = await lire(p);
  if (!l.chips.includes('Lille · 5 km')) fail('un tap ne remet pas la ville : ' + JSON.stringify(l.chips));
  if (!process.exitCode) console.log('pouce · ② la croix retire « Lille · 5 km » (plus rien ne part autour de Lille), la puce revient en pointillé, un tap la remet ✓');

  /* ⑤ « Nouveau » : rien la première fois (joué tout en haut), ni en
     refaisant la même recherche ; une entreprise apparue depuis, seule, le dit */
  if (l.neufs.length) fail('« nouveau » sans rien de neuf : ' + l.neufs);
  etat.res = [...BASE, NEUVE];
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  await versDecouvrir(p, 'alternance');
  l = await lire(p);
  if (l.neufs.join() !== 'Nouvelle Infra') fail('« nouveau » : ' + JSON.stringify(l.neufs));
  else console.log('pouce · ⑤ « nouveau » : rien la première fois, puis seulement « Nouvelle Infra », apparue depuis ✓');
  await p.screenshot({ path: `${SHOTS}/99-mesure-liste-pouce.png` });

  /* ⑦ une faute de frappe se propose */
  await p.fill('#piQ', 'alternance Lile');
  await p.waitForTimeout(300);
  const prop = await p.$('#piChips .prop-chip[data-prop="alternance Lille"]');
  if (!prop || (await prop.textContent()).trim() !== 'Lille ?') fail('« Lile » : pas de « Lille ? » proposé');
  else {
    await prop.click();
    await p.waitForTimeout(200);
    if (await p.inputValue('#piQ') !== 'alternance Lille') fail('« Lille ? » ne corrige pas la barre : ' + await p.inputValue('#piQ'));
    else console.log('pouce · ⑦ « alternance Lile » → « Lille ? » en pointillé, un tap corrige la barre ✓');
  }
  if (etat.ailleurs.length) fail('un site d’offres ou LinkedIn a été appelé sans geste : ' + etat.ailleurs[0]);
  await ctx.close();
}

/* ---------- ⑧ un stage, la ville du profil : HelloWork ---------- */
{
  const { ctx, p, etat } = await ecran({ width: 390, height: 844 }, true,
    { profil: { ville: 'Lyon', rayon: 15, formation: 'BTS SIO SLAM', recherche: 'stage' } });
  await versDecouvrir(p, 'stage');
  const l = await lire(p);
  const u = l.offres && new URL(l.offres.href);
  if (!u || l.offres.t !== 'Offres de stage autour de Lyon' || u.origin !== 'https://www.hellowork.com'
      || u.searchParams.get('k') !== 'stage développeur' || u.searchParams.get('l') !== 'Lyon')
    fail('le lien de stage par le profil : ' + JSON.stringify(l.offres));
  else if (etat.ailleurs.length) fail('HelloWork appelé sans geste');
  else console.log('pouce · ⑧ « stage » seul, profil SLAM à Lyon : « Offres de stage autour de Lyon », « stage développeur » ✓');
  await ctx.close();
}

/* ---------- ⑨ au poste, clair et sombre ---------- */
for (const sombre of [false, true]){
  const { ctx, p } = await ecran({ width: 1280, height: 800 }, false, { sombre, profil: { ville: 'Lille', rayon: 15 } });
  await versDecouvrir(p, 'alternance');
  const l = await lire(p);
  if (l.chips.join(' | ') !== 'Alternance | Réseau | Lille · 15 km') fail(`poste : les étiquettes : ${l.chips}`);
  await p.waitForSelector('#piDec .dc-detail [data-ap-ecarter]');
  const nom = await p.evaluate(() => document.querySelector('#piDec .dc-detail .ap-nom').textContent.trim());
  const h = await p.evaluate(() => [...document.querySelectorAll('#piDec .dc-detail .ap-agir .btn')].map(b => Math.round(b.getBoundingClientRect().height)));
  if (h.some(x => x !== h[0])) fail('poste : les deux gestes du panneau n’ont pas la même hauteur : ' + h);
  const deborde = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (deborde) fail('poste : la page déborde');
  await p.evaluate(() => document.activeElement.blur());
  await p.screenshot({ path: `${SHOTS}/99-mesure-poste${sombre ? '-sombre' : ''}.png` });
  await p.click('#piDec .dc-detail [data-ap-ecarter]');
  await p.waitForTimeout(400);
  const apres = await lire(p);
  if (apres.noms.includes(nom)) fail('poste : « Pas pour moi » laisse la ligne');
  if (!process.exitCode) console.log(`poste ${sombre ? 'sombre' : 'clair'} · ⑨ les étiquettes du profil, « Pas pour moi » dans le panneau, rien ne déborde ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E à ta mesure : ÉCHEC' : 'E2E à ta mesure : OK');

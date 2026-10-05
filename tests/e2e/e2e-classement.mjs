/* ============================================================
   « À découvrir » — une liste qui peut t'accueillir
   (docs/sources.md, lot 4)

   Mesuré le 5 octobre 2026 sur le vrai annuaire : sans mot tapé, il
   trie par nombre d'établissements — toujours les mêmes groupes
   nationaux en tête —, et 40 % du numérique dans le Nord sont des
   entrepreneurs individuels, c'est-à-dire des personnes. Ce scénario
   garde ce que le lot change, sur l'app réelle et ses vraies requêtes :

   ① aucune personne n'est DEMANDÉE (chaque requête porte le filtre) ni
     MONTRÉE (une réponse qui en contient une ne l'affiche pas) ;
   ② la question jumelle part — les employeurs de 10 à 499 salariés —,
     et ce qu'elle rend arrive en première page, mêlé aux géants ;
   ③ l'employeur passe devant celle dont on ne sait rien, et une
     convention sans tranche se dit « a des salariés » ;
   ④ ta zone : une question sans lieu prend le département de tes pistes,
     elle se VOIT (étiquette pleine), se retire d'un tap, revient
     proposée en pointillé, et le focus ne tombe jamais par terre ;
   ⑤ « Voir 10 de plus » ajoute dessous : ce qu'on vient de lire ne
     bouge pas, même quand la page suivante fait monter une entreprise
     dans la fusion.

   L'annuaire est remplacé par des réponses fabriquées à sa forme RELEVÉE
   (sonde-sources.mjs), choisies selon la requête : aucun réseau requis.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const E = (siren, nom, ville, cp, o = {}) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, sigle: null, activite_principale: '62.02A',
  categorie_entreprise: 'PME', tranche_effectif_salarie: o.tranche ?? '12', date_creation: '2012-01-01',
  nature_juridique: o.nature || '5710', nombre_etablissements_ouverts: 3,
  complements: { est_entrepreneur_individuel: o.nature === '1000', liste_idcc: o.idcc || [] },
  siege: { est_siege: true, numero_voie: '1', type_voie: 'RUE', libelle_voie: 'DU TEST', code_postal: cp,
           libelle_commune: ville, latitude: '50.63', longitude: '3.06', etat_administratif: 'A' },
  matching_etablissements: [{ adresse: `1 RUE DU TEST ${cp} ${ville}`, code_postal: cp, libelle_commune: ville,
           latitude: '50.63', longitude: '3.06', etat_administratif: 'A' }],
  dirigeants: []
});
/* la question « telle quelle » : les géants d'abord, comme le vrai annuaire
   (et, glissée au milieu, une PERSONNE et une entreprise dont on ne sait rien) */
const GEANTS = [
  E('100000001', 'CAPGEMINI TECHNOLOGY SERVICES', 'LILLE', '59000', { tranche: '53' }),
  E('100000002', 'SOPRA STERIA GROUP', 'LILLE', '59000', { tranche: '53' }),
  E('100000003', 'JEAN DUPONT (CYBER-PENTESTER)', 'LILLE', '59000', { tranche: 'NN', nature: '1000' }),
  E('100000004', 'INETUM', 'LILLE', '59000', { tranche: '52' }),
  E('100000005', 'CYBER-SUR', 'LILLE', '59000', { tranche: 'NN' }),
  E('100000006', 'NOUVELLE CONVENTION', 'LILLE', '59000', { tranche: 'NN', idcc: ['1486'] }),
  E('100000007', 'ORANGE BUSINESS SERVICES', 'LILLE', '59000', { tranche: '52' }),
  E('100000008', 'ALTRAN TECHNOLOGIES', 'LILLE', '59000', { tranche: '52' }),
  E('100000009', 'CGI FRANCE', 'LILLE', '59000', { tranche: '53' }),
  E('100000010', 'NXO FRANCE', 'LILLE', '59000', { tranche: '42' })
];
const GEANTS_P2 = Array.from({ length: 10 }, (_, i) =>
  E(String(100000011 + i), 'GROUPE NATIONAL ' + (i + 11), 'LILLE', '59000', { tranche: '51' }));
/* la jumelle : des employeurs locaux de taille moyenne */
const MOYENS = [
  E('200000001', 'JILITI', 'LILLE', '59000', { tranche: '32' }),
  E('200000002', 'COFIDOC', 'LILLE', '59000', { tranche: '21' }),
  E('200000003', 'CHAPSVISION', 'LILLE', '59000', { tranche: '22' })
];
/* page 2 de la jumelle : elle rend AUSSI CGI (rang 9 de la question large).
   Dans la fusion, CGI gagne des points et monterait — sauf qu'elle est
   déjà à l'écran, et ce qui est à l'écran ne bouge plus. */
const MOYENS_P2 = [E('100000009', 'CGI FRANCE', 'LILLE', '59000', { tranche: '53' }),
  E('200000004', 'INCOMM', 'LILLE', '59000', { tranche: '21' })];

function annuaire(ctx){
  const journal = [];
  ctx.route('https://recherche-entreprises.api.gouv.fr/**', async route => {
    const u = new URL(route.request().url());
    journal.push(u);
    const jumelle = u.searchParams.get('tranche_effectif_salarie') === '11,12,21,22,31,32';
    const page = Number(u.searchParams.get('page') || 1);
    const results = jumelle ? (page === 1 ? MOYENS : MOYENS_P2) : (page === 1 ? GEANTS : GEANTS_P2);
    return route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ total_results: 20, page, per_page: 10, results }) });
  });
  return { journal };
}

const PISTES = [
  { id: 'a', name: 'Advalys', city: 'Lille', domain: 'cyber', status: 'active', updatedAt: 5 },
  { id: 'b', name: 'Lumen Data', city: 'Roubaix', domain: 'cyber', status: 'reply', updatedAt: 4 },
  { id: 'c', name: 'Aztek', city: 'Lyon', domain: 'esn', status: 'todo', updatedAt: 3 }
];

async function ecran(vp, touch, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  const an = annuaire(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify({ name: 'Inès Martin', recherche: 'alternance' }));
  }, o.pistes || PISTES);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  return { ctx, p, an };
}
const taper = async (p, txt) => { await p.fill('#piQ', ''); await p.click('#piQ'); await p.keyboard.type(txt, { delay: 6 }); };
const fini = async p => {
  await p.waitForTimeout(900);
  await p.waitForFunction(() => {
    const s = document.querySelector('#piDec');
    return !s || !s.querySelector('[aria-busy="true"]');
  }, null, { timeout: 5000 }).catch(() => {});
};
const lire = p => p.evaluate(() => ({
  noms: [...document.querySelectorAll('#piDec .dc-nom')].map(n => n.textContent.trim()),
  tailles: [...document.querySelectorAll('#piDec .dc-taille')].map(n => n.textContent.trim()),
  zone: document.querySelector('#piDec .dc-zone .st-chip')?.textContent.trim() || '',
  proposee: document.querySelector('#piDec .dc-zone .prop-chip')?.textContent.trim() || '',
  section: !!document.querySelector('#piDec .tr-dec')
}));

/* ---------- au pouce ---------- */
{
  const { ctx, p, an } = await ecran({ width: 390, height: 844 }, true);
  await taper(p, 'alternance Lille');
  await fini(p);
  const d = await lire(p);
  /* ① aucune personne demandée, aucune montrée */
  const sansFiltre = an.journal.filter(u => u.searchParams.get('est_entrepreneur_individuel') !== 'false');
  if (!an.journal.length) fail('aucune requête n’est partie : le scénario n’a rien mesuré');
  if (sansFiltre.length) fail('une requête demande aussi les personnes : ' + sansFiltre[0].search);
  if (d.noms.some(n => /Dupont/.test(n))) fail('une PERSONNE (entrepreneur individuel) s’affiche dans « À découvrir »');
  else console.log(`pouce · ① ${an.journal.length} requêtes, toutes sans personne ; la personne glissée dans la réponse ne s’affiche pas ✓`);
  /* ② la jumelle part, et ce qu'elle rend est en première page */
  const jumelle = an.journal.find(u => u.searchParams.get('tranche_effectif_salarie') === '11,12,21,22,31,32');
  const moyens = ['Jiliti', 'Cofidoc', 'Chapsvision'].filter(n => d.noms.slice(0, 10).includes(n));
  if (!jumelle) fail('la question jumelle (10 à 499 salariés) n’est pas partie');
  if (moyens.length < 3) fail('les employeurs moyens n’arrivent pas en première page : ' + JSON.stringify(d.noms.slice(0, 10)));
  else console.log(`pouce · ② la jumelle part, et ${moyens.join(', ')} arrivent en première page, mêlés aux géants ✓`);
  /* ③ l'employeur devant l'inconnu ; la convention seule se dit */
  const iInconnu = d.noms.indexOf('Cyber-sur');
  const iDernierEmployeur = Math.max(...['Capgemini Technology Services', 'Jiliti', 'NXO France', 'Nouvelle Convention']
    .map(n => d.noms.indexOf(n)));
  if (iInconnu < 0 || iInconnu < iDernierEmployeur)
    fail('une entreprise dont on ne sait rien passe devant un employeur : ' + JSON.stringify(d.noms));
  const conv = d.tailles[d.noms.indexOf('Nouvelle Convention')];
  if (conv !== 'a des salariés') fail(`une convention sans tranche dit « ${conv} » au lieu de « a des salariés »`);
  else console.log('pouce · ③ l’employeur passe devant l’inconnu, et une convention sans tranche dit « a des salariés » ✓');

  /* ⑤ « Voir 10 de plus » ajoute dessous, sans rebattre */
  const avant = d.noms.slice();
  await p.click('#piDec [data-dc-plus]');
  await fini(p);
  const apres = (await lire(p)).noms;
  if (apres.length <= avant.length) fail('« Voir 10 de plus » n’a rien ajouté');
  if (apres.slice(0, avant.length).join('|') !== avant.join('|'))
    fail('« Voir 10 de plus » a rebattu ce qui était déjà à l’écran :\n  avant ' + avant.join(', ') + '\n  après ' + apres.slice(0, avant.length).join(', '));
  else console.log(`pouce · ⑤ « Voir 10 de plus » : ${apres.length - avant.length} lignes dessous, les ${avant.length} lues n’ont pas bougé ✓`);

  /* ④ ta zone : posée, retirée, proposée, reposée — et le focus suit */
  await taper(p, 'réseau');
  await fini(p);
  const z = await lire(p);
  const derniere = an.journal[an.journal.length - 1];
  if (z.zone !== 'Nord (59)') fail(`« réseau » sans lieu : l’étiquette de zone dit « ${z.zone} »`);
  if (!derniere || derniere.searchParams.get('departement') !== '59') fail('« réseau » sans lieu ne part pas dans ta zone');
  else console.log('pouce · ④ « réseau » sans lieu : la question prend ta zone, et l’étiquette « Nord (59) » le dit ✓');
  await p.evaluate(() => document.activeElement.blur());
  await p.evaluate(() => document.querySelector('#piDec').scrollIntoView({ block: 'start' }));
  await p.screenshot({ path: `${SHOTS}/97-classement-zone-pouce.png` });
  const nAvant = an.journal.length;
  await p.click('#piDec .dc-zone .st-chip');
  await p.waitForTimeout(400);
  const sans = await lire(p);
  const focus1 = await p.evaluate(() => document.activeElement && (document.activeElement.closest('#piDec') ? 'section' : document.activeElement.id || document.activeElement.tagName));
  if (sans.zone || !sans.proposee) fail(`zone retirée : posée « ${sans.zone} », proposée « ${sans.proposee} »`);
  if (an.journal.length !== nAvant) fail('zone retirée, « réseau » sans lieu a quand même interrogé l’annuaire');
  if (focus1 !== 'section') fail(`zone retirée : le focus est tombé sur ${focus1}`);
  else console.log('pouce · ④ la croix la retire : rien ne part, elle revient PROPOSÉE en pointillé, et le focus reste dans la section ✓');
  await p.screenshot({ path: `${SHOTS}/97-classement-zone-proposee.png` });
  await p.click('#piDec .dc-zone .prop-chip');
  await fini(p);
  const re = await lire(p);
  if (re.zone !== 'Nord (59)' || !re.noms.length) fail('un tap sur la zone proposée ne la remet pas');
  else console.log('pouce · ④ un tap sur la zone proposée la repose, et la liste revient ✓');
  /* un lieu tapé décide : pas de zone */
  await taper(p, 'réseau Lyon');
  await fini(p);
  const ly = await lire(p);
  if (ly.zone || ly.proposee) fail('un lieu tapé ET une zone : deux lieux à la fois');
  const large = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (large) fail('la page défile latéralement');
  await ctx.close();
}

/* ---------- au pouce, sombre ; au poste, clair et sombre ---------- */
for (const [vp, touch, sombre, nom] of [[{ width: 390, height: 844 }, true, true, 'pouce-sombre'],
                                         [{ width: 1280, height: 800 }, false, false, 'poste'],
                                         [{ width: 1280, height: 800 }, false, true, 'poste-sombre']]){
  const { ctx, p } = await ecran(vp, touch, { sombre });
  await taper(p, 'réseau');
  await fini(p);
  const z = await lire(p);
  if (z.zone !== 'Nord (59)') fail(`${nom} : pas d’étiquette de zone`);
  /* l'étiquette tient sa cible (§5) et ne déborde pas de la section */
  const g = await p.evaluate(() => {
    const b = document.querySelector('#piDec .dc-zone .st-chip').getBoundingClientRect();
    const s = document.querySelector('#piDec .tr-dec').getBoundingClientRect();
    return { h: Math.round(b.height), dedans: b.right <= s.right + 1 };
  });
  const min = touch ? 44 : 32;
  if (g.h < min || !g.dedans) fail(`${nom} : l’étiquette de zone mesure ${g.h} px ou déborde`);
  await p.evaluate(() => document.activeElement.blur());
  await p.evaluate(() => document.querySelector('#piDec').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: `${SHOTS}/97-classement-zone-${nom}.png` });
  await ctx.close();
}
console.log('pouce sombre, poste clair et sombre : l’étiquette de zone tient sa cible et sa section ✓');

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E classement : ÉCHEC' : 'E2E classement : OK');

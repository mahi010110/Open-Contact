/* ============================================================
   La fiche s'enrichit — et rien d'autre que ce qu'on sait

   LE MINIMUM, AU BON MOMENT (décision du mainteneur, 7 octobre 2026 :
   « au final c'est juste un bouton en plus ou un lien en plus »). Ce que
   les sources publiques savent d'une piste se LIT dans la carte de « À
   savoir » ; plus un lien ni un bouton autour. L'entreprise se reconnaît
   pendant qu'on tape son nom, et trouver quelqu'un se fait dans
   « Ajouter un contact ». Ce fichier lit chaque requête qui sort, en
   partant de l'état RÉEL de l'app (§8), et vérifie :

   ① ce qui part : le SIREN seul, à l'ouverture d'une fiche qui en porte
     un ; le NOM TAPÉ et le département de la ville, pendant qu'on écrit
     le nom dans « Modifier » ou la capture. Jamais une note, un contact,
     le profil ;
   ② ce qui se voit : la carte (missions, taille, site), la source en
     gris — et RIEN d'autre : ni « Trouver dans l'annuaire », ni « C'est
     laquelle ? », ni « Compléter ma fiche », ni offres, fiche officielle,
     anciens de l'école, SIREN ; sous les contacts vides, rien ;
   ③ « À savoir » n'existe que s'il a quelque chose à dire, et se montre
     sur la réponse de l'annuaire SANS redessiner la fiche (la note en
     cours reste, au pouce comme au poste) ;
   ④ le dirigeant est proposé dans « Ajouter un contact », « Trouver sur
     LinkedIn » à côté du nom (l'école ne part que là) ; rien ne s'ajoute
     sans « Enregistrer » ;
   ⑤ le nom se propose : ville et taille, jamais un code ; un nom long
     plie ; choisir remplit les VIDES sous les yeux, n'écrase rien, et
     « Enregistrer » attache le SIREN ;
   ⑥ hors ligne, une panne : rien ne se dit, rien ne casse, la carte
     revient avec le réseau.

   Les services sont REMPLACÉS par des réponses à leur forme réelle
   (relevée par `sonde-annuaire.mjs`). La CSP de l'app, elle, est la
   vraie : si elle bloquait un appel, le navigateur le refuserait avant
   toute interception.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ADVENS = {
  siren: '812345678', nom_complet: 'ADVENS', nom_raison_sociale: 'ADVENS', activite_principale: '62.02A',
  categorie_entreprise: 'PME', tranche_effectif_salarie: '22', date_creation: '2009-03-12',
  nombre_etablissements_ouverts: 4, etat_administratif: 'A',
  siege: { est_siege: true, numero_voie: '38', type_voie: 'RUE', libelle_voie: 'DE LA BASSEE', code_postal: '59000',
           libelle_commune: 'LILLE', latitude: '50.637', longitude: '3.06', etat_administratif: 'A' },
  matching_etablissements: [],
  dirigeants: [{ nom: 'LEROY', prenoms: 'THOMAS', qualite: 'Président', type_dirigeant: 'personne physique' },
               { nom: 'PETIT', prenoms: 'CLAIRE', qualite: 'Directrice générale', type_dirigeant: 'personne physique' },
               { denomination: 'CABINET AUDIT NORD', qualite: 'Commissaire aux comptes', type_dirigeant: 'personne morale' }]
};
const LUMEN = (siren, nom, ville, cp) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, activite_principale: '63.11Z', tranche_effectif_salarie: '11',
  date_creation: '2018-01-01', nombre_etablissements_ouverts: 1, etat_administratif: 'A',
  siege: { est_siege: true, numero_voie: '5', type_voie: 'PLACE', libelle_voie: 'DU THEATRE', code_postal: cp,
           libelle_commune: ville, latitude: '50.64', longitude: '3.07', etat_administratif: 'A' },
  matching_etablissements: [], dirigeants: []
});

const PISTES = [
  { id: 'a', name: 'Advens', siren: '812345678', city: 'Lille', address: '38 Rue de la Bassée\n59000 Lille',
    domain: 'cyber', status: 'todo', updatedAt: 5, notes: 'rappeler Bertrand lundi',
    contacts: [{ id: 'c1', name: 'Claire Petit', role: 'DG', email: 'claire@advens.test' }] },
  { id: 'b', name: 'Lumen Data', city: 'Lille', desc: 'Data et IA, équipe de 12', status: 'todo', updatedAt: 4,
    notes: 'voir avec Bertrand', contacts: [{ id: 'c2', name: 'Paul Martin', email: 'paul@lumen.test' }] }
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO', ecole: 'Lycée Baggio', recherche: 'alternance',
                 email: 'ines@exemple.test' };
const PRIVES = ['bertrand', 'rappeler', 'claire', 'paul', 'martin', 'ines', 'baggio', 'sio', 'lundi', 'equipe'];

/* les services fabriqués : on note CHAQUE requête */
function services(ctx){
  const journal = [];
  let mode = { statut: 200 };
  ctx.route('https://recherche-entreprises.api.gouv.fr/**', async route => {
    const u = route.request().url();
    journal.push(u);
    const m = typeof mode === 'function' ? mode() : mode;
    if (m.retard) await new Promise(ok => setTimeout(ok, m.retard));
    if (m.statut !== 200)
      return route.fulfill({ status: m.statut, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'non' });
    const q = new URL(u).searchParams.get('q') || '';
    const results = q === '812345678' ? [ADVENS]
      : /lumen/i.test(q) ? [LUMEN('856123456', 'LUMEN DATA', 'LILLE', '59000'), LUMEN('857000111', 'LUMEN DATA CONSEIL', 'LILLE', '59800'),
                            LUMEN('858000222', 'LUMEN DATA GLOBAL SOLUTIONS CENTRE DE SERVICES PARTAGES', 'LILLE', '59000')]
      : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results, total_results: results.length }) });
  });
  ctx.route('https://autocomplete.clearbit.com/**', route => { journal.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }); });
  ctx.route('https://query.wikidata.org/**', async route => {
    const u = route.request().url();
    journal.push(u);
    const site = /812345678/.test(decodeURIComponent(u)) ? 'https://www.advens.fr/' : '';
    return route.fulfill({ status: 200, contentType: 'application/sparql-results+json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results: { bindings: site ? [{ site: { type: 'uri', value: site } }] : [] } }) });
  });
  /* le BODACC et Wikipédia, que la carte interroge aussi (ui/carte.js) :
     notés, et muets — `e2e-carte.mjs` joue ce qu'ils disent */
  for (const [hote, type, body] of [['https://bodacc-datadila.opendatasoft.com/**', 'application/json', '{"results":[]}'],
                                     ['https://fr.wikipedia.org/**', 'application/json', '{}']])
    ctx.route(hote, route => { journal.push(route.request().url());
      return route.fulfill({ status: 200, contentType: type, headers: { 'access-control-allow-origin': '*' }, body }); });
  return { journal, regler: m => { mode = m; } };
}
const pliees = s => decodeURIComponent(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fuite = u => PRIVES.find(w => pliees(u).includes(w));

async function ecran(vp, touch, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  const sv = services(ctx);
  const p = await ctx.newPage();
  /* un geste qui ne trouve pas sa cible échoue VITE et se nomme, au lieu
     d'attendre trente secondes à chaque clic et de finir tué sans un mot */
  p.setDefaultTimeout(5000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/status of (500|429)|ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [o.pistes || PISTES, PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  return { ctx, p, sv };
}
const ouvrirFiche = (p, id) => p.evaluate(async id => {
  const { S } = await import('./ui/state.js');
  (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === id));
}, id);
const fermer = p => p.evaluate(() => document.querySelector('.modal-fiche button.x')?.click());
const piste = (p, id) => p.evaluate(id => import('./ui/state.js').then(({ S }) =>
  JSON.parse(JSON.stringify(S.companies.find(c => c.id === id)))), id);
/* ce que la fiche montre de l'entreprise, et ce qu'elle ne doit plus montrer */
const lire = p => p.evaluate(() => {
  const k = document.querySelector('#fiKnow');
  const lignes = {};
  document.querySelectorAll('#faCarte .fk').forEach(f => {
    const l = f.querySelector('.fk-l')?.textContent.trim();
    if (l) lignes[l] = f.querySelector('.fk-v')?.textContent.replace(/\s+/g, ' ').trim();
  });
  const fiche = document.querySelector('.modal-fiche .modal-b');
  const ctsField = document.querySelector('#fiCtAdd')?.closest('.field');
  return {
    existe: !!k, visible: !!k && !k.hidden && k.getClientRects().length > 0, ouvert: !!k?.open, lignes,
    source: document.querySelector('#faCarte .ct-src')?.textContent.replace(/\s+/g, ' ').trim() || '',
    sousContacts: ctsField ? [...ctsField.querySelectorAll('a, p')].map(x => x.textContent.trim()) : [],
    /* les mots des gestes retirés : aucun ne doit revenir */
    anciens: (fiche?.textContent.match(/Trouver dans l.annuaire|C.est laquelle|Compléter ma fiche|Fiche officielle|Offres d.emploi|Anciens de mon école|Qui y travaille|Personne pour l.instant|SIREN \d|Réessayer|Je cherche dans/g) || [])
  };
});

/* ---------- ①②③④ au pouce : une piste qui porte un SIREN ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  /* une réponse LENTE : la marque se pose avant qu'elle arrive. Si la
     réponse redessinait la fiche entière au lieu de ses zones, le champ
     de notes serait un AUTRE nœud */
  sv.regler({ statut: 200, retard: 400 });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiNotes');
  await p.evaluate(() => { document.querySelector('#fiNotes').__marque = 1; });
  await p.waitForSelector('#faCarte .fk', { timeout: 4000 }).catch(() => {});
  await p.waitForSelector('#faCarte a.fk-v[href*="advens.fr"]', { timeout: 3000, state: 'attached' }).catch(() => {});
  sv.regler({ statut: 200 });
  const b = await lire(p);
  if (!b.visible || !b.ouvert) fail('au pouce, « À savoir » ne montre pas la carte sans toucher : ' + JSON.stringify(b));
  if (!(await p.evaluate(() => document.querySelector('#fiNotes')?.__marque)))
    fail('la réponse de l’annuaire a redessiné toute la fiche, pas seulement ses zones');
  const qa = sv.journal.find(u => u.startsWith('https://recherche-entreprises'));
  const qw = sv.journal.find(u => u.startsWith('https://query.wikidata.org'));
  const ua = new URL(qa || 'http://x/');
  if (ua.searchParams.get('q') !== '812345678' || [...ua.searchParams.keys()].sort().join() !== 'per_page,q')
    fail('la question à l’annuaire ne porte pas QUE le SIREN : ' + qa);
  if (!qw || !pliees(qw).includes('812345678')) fail('le site n’a pas été cherché sur Wikidata : ' + qw);
  for (const u of sv.journal){ const w = fuite(u); if (w) fail(`« ${w} » est sorti : ${u}`); }
  if (b.lignes['Missions'] !== 'Conseil et intégration informatique') fail('missions : ' + b.lignes['Missions']);
  if (b.lignes['Taille'] !== '100 à 199 salariés') fail('taille : ' + b.lignes['Taille']);
  if (!/advens\.fr/.test(b.lignes['Site'] || '')) fail('le site Wikidata ne se montre pas : ' + JSON.stringify(b.lignes));
  if (!/Annuaire des entreprises/.test(b.source)) fail('la source n’est pas nommée : ' + b.source);
  if (b.anciens.length) fail('la fiche porte encore : ' + b.anciens.join(', '));
  if (b.sousContacts.length) fail('sous les contacts, la fiche pose encore : ' + b.sousContacts);
  console.log('pouce · SIREN : le SIREN seul part ; la carte se voit (missions, taille, site), la source en gris — plus un lien ni un bouton autour, et la note en cours reste ✓');
  await p.screenshot({ path: `${SHOTS}/98-enrichir-pouce.png` });

  /* ④ le dirigeant est PROPOSÉ là où l'on ajoute un contact, LinkedIn à
     côté du nom — un tap remplit le nom et le rôle, rien ne s'ajoute sans
     « Enregistrer ». Claire Petit est déjà un contact : on ne la propose
     pas deux fois ; un cabinet n'est personne à qui écrire */
  await p.evaluate(() => document.querySelector('#fiCtAdd').scrollIntoView({ block: 'center' }));
  await p.click('#fiCtAdd');
  await p.waitForSelector('.ce-sugg [data-sugg]', { timeout: 3000 }).catch(() => {});
  const aj = await p.evaluate(() => ({
    sugg: [...document.querySelectorAll('.ce-sugg [data-sugg]')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    li: (() => { const a = document.querySelector('.overlay .ce-gens'); return a ? { k: new URL(a.href).searchParams.get('keywords'), t: a.target } : null; })()
  }));
  if (aj.sugg.length !== 1 || !/^Thomas Leroy président$/.test(aj.sugg[0])) fail('« Ajouter un contact » propose : ' + JSON.stringify(aj.sugg));
  if (!aj.li || aj.li.k !== 'Advens Lycée Baggio' || aj.li.t !== '_blank') fail('« Trouver sur LinkedIn » : ' + JSON.stringify(aj.li));
  const nAvant = (await piste(p, 'a')).contacts.length;
  await p.click('.ce-sugg [data-sugg="0"]');
  const rempli = await p.evaluate(() => ({ nom: document.querySelector('#ceName').value, role: document.querySelector('#ceRole').value,
    focus: document.activeElement?.id }));
  if (rempli.nom !== 'Thomas Leroy' || rempli.role !== 'Président' || rempli.focus !== 'ceEmail')
    fail('un tap sur la suggestion ne remplit pas nom et rôle : ' + JSON.stringify(rempli));
  if ((await piste(p, 'a')).contacts.length !== nAvant) fail('le dirigeant est devenu contact sans « Enregistrer »');
  await p.screenshot({ path: `${SHOTS}/98-enrichir-contact-pouce.png` });
  await p.click('.overlay:last-child .modal-f button:has-text("Enregistrer")');
  await p.waitForTimeout(300);
  const apres = await piste(p, 'a');
  const t = (apres.contacts || []).find(x => x.name === 'Thomas Leroy');
  if (!t || t.role !== 'Président') fail('le dirigeant n’est pas devenu contact : ' + JSON.stringify(apres.contacts));
  for (const u of sv.journal){ const w = fuite(u); if (w) fail(`« ${w} » est sorti : ${u}`); }
  console.log('pouce · le dirigeant proposé dans « Ajouter un contact », LinkedIn à côté du nom (l’école ne part que là) ; rien sans « Enregistrer » ✓');
  await fermer(p);
  await ctx.close();
}

/* ---------- ③⑤ au pouce : une piste SANS SIREN, reconnue en tapant son nom ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  await ouvrirFiche(p, 'b');
  await p.waitForSelector('#fiNotes');
  await p.waitForTimeout(500);
  let b = await lire(p);
  if (sv.journal.length) fail('sans SIREN, une requête est partie à l’ouverture : ' + sv.journal);
  /* elle a une phrase à toi : « À savoir » existe pour la dire */
  if (!b.visible) fail('« À savoir » ne montre pas ce que tu as écrit');
  if (b.anciens.length) fail('sans SIREN, la fiche pose encore : ' + b.anciens.join(', '));
  /* Modifier : on retape le nom, l'entreprise se propose */
  await p.click('#fiEdit');
  await p.waitForSelector('#edName');
  await p.fill('#edName', '');
  await p.click('#edName');
  await p.keyboard.type('Lumen', { delay: 30 });
  await p.waitForSelector('.ac-nom', { timeout: 3000 }).catch(() => {});
  const sug = await p.evaluate(() => [...document.querySelectorAll('.ac-nom')].map(x => ({
    nom: x.querySelector('b').textContent.trim(), sous: x.querySelector('span')?.textContent.trim() || '',
    coupe: x.querySelector('b').scrollWidth > x.querySelector('b').clientWidth + 1, h: Math.round(x.getBoundingClientRect().height) })));
  const u = new URL(sv.journal.find(x => x.startsWith('https://recherche-entreprises')) || 'http://x/');
  if (u.searchParams.get('q') !== 'Lumen' || u.searchParams.get('departement') !== '59')
    fail('la question porte autre chose que le nom tapé et le département : ' + u.search);
  for (const x of sv.journal){ const w = fuite(x); if (w) fail(`« ${w} » est sorti : ${x}`); }
  if (sug.map(x => x.nom).join('|') !== 'Lumen Data|Lumen Data Conseil|Lumen Data Global Solutions Centre de Services Partages')
    fail('les noms proposés : ' + JSON.stringify(sug));
  if (sug.some(x => /\d{2}\.\d{2}[A-Z]/.test(x.sous))) fail('un code d’activité revient sous un nom : ' + JSON.stringify(sug));
  if (sug[0] && sug[0].sous !== 'Lille · 10-19 salariés') fail('la sous-ligne ne dit pas la ville et la taille : ' + sug[0].sous);
  if (sug.some(x => x.coupe)) fail('un nom proposé est coupé au lieu de plier');
  if (sug.some(x => x.h < 44)) fail('une proposition fait moins de 44 px au doigt : ' + sug.map(x => x.h));
  await p.screenshot({ path: `${SHOTS}/98-enrichir-nom-pouce.png` });
  await p.dispatchEvent('.ac-nom[data-i="0"]', 'pointerdown');
  await p.waitForTimeout(200);
  const form = await p.evaluate(() => ({ nom: document.querySelector('#edName').value, desc: document.querySelector('#edDesc').value,
    adr: document.querySelector('#edAddress').value, dom: document.querySelector('#edDomain').value, liste: !!document.querySelector('.ac-nom') }));
  if (form.nom !== 'Lumen Data' || form.liste) fail('choisir n’écrit pas le nom, ou la liste reste : ' + JSON.stringify(form));
  if (form.desc !== 'Data et IA, équipe de 12') fail('la description saisie a été écrasée : ' + form.desc);
  if (!/Place du Theatre/i.test(form.adr) || form.dom !== 'cloud') fail('les vides ne se remplissent pas sous les yeux : ' + JSON.stringify(form));
  if ((await piste(p, 'b')).siren) fail('le SIREN s’attache avant « Enregistrer »');
  await p.click('.overlay:last-child .modal-f button:has-text("Enregistrer")');
  await p.waitForTimeout(500);
  const c = await piste(p, 'b');
  if (c.siren !== '856123456') fail('« Enregistrer » n’attache pas le SIREN : ' + c.siren);
  if (c.desc !== 'Data et IA, équipe de 12') fail('la description saisie a été écrasée : ' + c.desc);
  if (!/Place du Theatre/i.test(c.address || '') || c.lat == null || c.domain !== 'cloud') fail('la piste n’a pas pris ce qui manquait : ' + JSON.stringify(c));
  await p.waitForSelector('#faCarte .fk', { timeout: 3000 }).catch(() => {});
  b = await lire(p);
  if (b.lignes['Taille'] !== '10 à 19 salariés') fail('après le choix, la carte ne montre pas l’entreprise : ' + JSON.stringify(b.lignes));
  console.log('pouce · sans SIREN : rien à l’ouverture ; le nom tapé se propose (ville · taille, aucun code, nom entier), nom + département seulement ; choisir remplit les vides sous les yeux, rien d’écrasé, « Enregistrer » attache ✓');
  await fermer(p);
  await ctx.close();
}

/* ---------- ⑤ la capture au pouce : le nom se reconnaît aussi ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true, { pistes: [] });
  await p.evaluate(() => import('./ui/capture.js').then(m => m.openCapture()));
  await p.waitForSelector('#cpName');
  await p.click('#cpName');
  await p.keyboard.type('Lumen', { delay: 30 });
  await p.waitForSelector('.ac-nom', { timeout: 3000 }).catch(() => {});
  const u = new URL(sv.journal.find(x => x.startsWith('https://recherche-entreprises')) || 'http://x/');
  if (u.searchParams.get('q') !== 'Lumen' || u.searchParams.has('departement')) fail('capture : la question porte autre chose que le nom : ' + u.search);
  await p.dispatchEvent('.ac-nom[data-i="1"]', 'pointerdown');
  await p.waitForTimeout(150);
  await p.click('.modal-f button:has-text("Ajouter")');
  await p.waitForTimeout(400);
  const c = await p.evaluate(async () => JSON.parse(JSON.stringify((await import('./ui/state.js')).S.companies[0] || null)));
  if (!c || c.name !== 'Lumen Data Conseil' || c.siren !== '857000111' || c.city !== 'Lille')
    fail('capture : l’entreprise choisie n’est pas rattachée : ' + JSON.stringify(c));
  else console.log('capture au pouce · le nom tapé se propose ; « Ajouter » rattache la piste à l’entreprise choisie, avec sa ville ✓');
  await ctx.close();
}

/* ---------- ⑥ hors ligne, puis le retour du réseau ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  await ctx.setOffline(true);
  await p.evaluate(() => dispatchEvent(new Event('offline')));
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiNotes');
  await p.waitForTimeout(500);
  let b = await lire(p);
  if (sv.journal.length) fail('hors ligne, une requête est partie');
  if (b.anciens.length) fail('hors ligne, la fiche se met à parler : ' + b.anciens.join(', '));
  await ctx.setOffline(false);
  await p.evaluate(() => dispatchEvent(new Event('online')));
  await p.waitForSelector('#faCarte .fk', { timeout: 3000 }).catch(() => {});
  b = await lire(p);
  if (b.lignes['Missions'] !== 'Conseil et intégration informatique') fail('le réseau revenu, la carte ne revient pas : ' + JSON.stringify(b.lignes));
  /* une panne : rien ne se dit, rien ne casse */
  await fermer(p);
  await ctx.close();
  const e2 = await ecran({ width: 390, height: 844 }, true);
  e2.sv.regler({ statut: 500 });
  await ouvrirFiche(e2.p, 'a');
  await e2.p.waitForSelector('#fiNotes');
  await e2.p.waitForTimeout(600);
  const b2 = await lire(e2.p);
  if (b2.anciens.length || Object.keys(b2.lignes).length) fail('une panne de l’annuaire se dit ou laisse une carte : ' + JSON.stringify(b2));
  else console.log('hors ligne et panne : rien ne se dit, rien ne casse ; la carte revient avec le réseau ✓');
  await e2.ctx.close();
}

/* ---------- ③ au poste, dans les deux thèmes ---------- */
for (const sombre of [false, true]){
  const { ctx, p, sv } = await ecran({ width: 1280, height: 800 }, false, { sombre });
  sv.regler({ statut: 200, retard: 400 });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiNotes');
  /* on écrit une note PENDANT que la réponse arrive : elle doit rester */
  await p.click('#fiNotes');
  await p.keyboard.type('à relire', { delay: 5 });
  await p.waitForSelector('#faCarte .fk', { timeout: 4000 }).catch(() => {});
  const b = await lire(p);
  if (!b.ouvert || !b.visible) fail('au poste, « À savoir » n’est pas ouvert');
  if (!sv.journal.length) fail('au poste, rien n’est parti à l’ouverture');
  if (b.lignes['Taille'] !== '100 à 199 salariés') fail('au poste, les données ne sont pas là');
  const note = await p.evaluate(() => ({ v: document.querySelector('#fiNotes').value, f: document.activeElement?.id }));
  if (note.v !== PISTES[0].notes + 'à relire' || note.f !== 'fiNotes') fail('la réponse a redessiné la fiche sous les doigts : ' + JSON.stringify(note));
  const deborde = await p.evaluate(() => {
    const m = document.querySelector('.modal-fiche .modal-b');
    return [...m.querySelectorAll('#fiKnow *')].filter(x => x.getBoundingClientRect().right > m.getBoundingClientRect().right + 1)
      .map(x => x.className || x.tagName).slice(0, 3);
  });
  if (deborde.length) fail('« À savoir » déborde de la fenêtre : ' + deborde);
  await p.evaluate(() => document.querySelector('#fiKnow').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: `${SHOTS}/98-enrichir-poste${sombre ? '-sombre' : ''}.png` });
  console.log(`poste ${sombre ? 'sombre' : 'clair'} · ouvert d’office, la note en cours reste, rien ne déborde ✓`);
  await ctx.close();
}

/* ---------- au plus étroit, texte doublé ---------- */
{
  const { ctx, p } = await ecran({ width: 320, height: 640 }, true);
  await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#faCarte .fk', { timeout: 4000 }).catch(() => {});
  const r = await p.evaluate(() => {
    const m = document.querySelector('.modal-fiche .modal-b');
    const mr = m.getBoundingClientRect().right;
    return [...m.querySelectorAll('#fiKnow *')].filter(x => x.getBoundingClientRect().right > mr + 1).length;
  });
  if (r) fail(`320 px à 200 % : ${r} élément(s) dépassent la feuille`);
  await p.screenshot({ path: `${SHOTS}/98-enrichir-320-200.png` });
  console.log('320 px à 200 % : rien ne dépasse ✓');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
await browser.close();
server.close();
if (!process.exitCode) console.log('\nOK — la fiche montre ce qu’on sait, rien d’autre ; aucun mot privé ne sort, et rien ne change sans geste.');

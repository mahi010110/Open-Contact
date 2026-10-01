/* ============================================================
   La fiche s'enrichit — l'annuaire, Wikidata, trois liens d'un tap
   (docs/recherche.md, lot 3)

   Le bloc « Annuaire » de la fiche interroge deux services publics
   depuis le navigateur. Ce fichier lit chaque requête qui sort, en
   partant de l'état RÉEL de l'app (§8 : un contrôle de fuite lit les
   octets qui sortent par le vrai chemin), et vérifie que rien ne change
   dans la fiche sans un geste qui se défait.

   ① ce qui part : le SIREN seul pour une piste qui en porte un ; le nom
     et le département pour une piste qui n'en porte pas, et seulement
     sur « Trouver dans l'annuaire ». Jamais une note, un contact, le
     profil. Au pouce, rien ne part tant que le bloc est replié ;
   ② ce qui change : « Ajouter à ma fiche » complète les VIDES, n'écrase
     rien, et se défait ; un dirigeant ne devient un contact que si on
     l'ajoute, et se défait ; choisir « la bonne » attache le SIREN ;
   ③ les liens : LinkedIn porte l'école, France Travail ne la porte pas,
     la fiche officielle vise le SIREN ; tous s'ouvrent ailleurs ;
   ④ hors ligne, une panne : chaque cas se dit, et se répare ;
   ⑤ au poste : le bloc est ouvert, la réponse arrive sans redessiner la
     fiche sous les doigts (les notes en cours restent), aucune feuille
     ne défile de travers, dans les deux thèmes.

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
    if (m.statut !== 200)
      return route.fulfill({ status: m.statut, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'non' });
    const q = new URL(u).searchParams.get('q') || '';
    const results = q === '812345678' ? [ADVENS]
      : /lumen/i.test(q) ? [LUMEN('856123456', 'LUMEN DATA', 'LILLE', '59000'), LUMEN('857000111', 'LUMEN DATA CONSEIL', 'LILLE', '59800')]
      : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results, total_results: results.length }) });
  });
  ctx.route('https://query.wikidata.org/**', async route => {
    const u = route.request().url();
    journal.push(u);
    const site = /812345678/.test(decodeURIComponent(u)) ? 'https://www.advens.fr/' : '';
    return route.fulfill({ status: 200, contentType: 'application/sparql-results+json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results: { bindings: site ? [{ site: { type: 'uri', value: site } }] : [] } }) });
  });
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
/* le bloc a-t-il FINI de charger ? sinon on lirait l'état d'avant */
const bloc = async (p, ms = 3000) => {
  await p.waitForFunction(() => {
    const b = document.querySelector('#fiAnn .fa-box');
    return b && !b.querySelector('[aria-busy="true"]');
  }, null, { timeout: ms }).catch(() => {});
  return p.evaluate(() => {
    const d = document.querySelector('#fiAnn');
    const lignes = {};
    d?.querySelectorAll('.fi-know > .fk').forEach(f => {
      const l = f.querySelector('.fk-l')?.textContent.trim();
      if (l) lignes[l] = f.querySelector('.fk-v')?.textContent.replace(/\s+/g, ' ').trim();
    });
    return {
      present: !!d, ouvert: !!(d && d.open), lignes,
      etat: d?.querySelector('.fa-etat')?.textContent.replace(/\s+/g, ' ').trim() || '',
      completer: !!d?.querySelector('[data-fa-completer]'),
      quoi: d?.querySelector('.fa-quoi')?.textContent.trim() || '',
      dirs: [...(d?.querySelectorAll('[data-fa-dir]') || [])].map(b => b.dataset.faDir),
      trouver: !!d?.querySelector('[data-fa-trouver]'),
      choix: [...(d?.querySelectorAll('[data-fa-pick] b') || [])].map(b => b.textContent.trim()),
      liens: [...(d?.querySelectorAll('[data-lien]') || [])].map(a => ({ cle: a.dataset.lien, href: a.href,
        label: a.textContent.trim(), cible: a.target }))
    };
  });
};
/* le dépliage est animé (`foldAnim`, ui/dom.js) : la hauteur reste posée
   en dur jusqu'à la fin — une mesure ou une capture prise avant lirait
   un cadre rogné qui n'existe plus un quart de seconde plus tard */
const ouvrirBloc = async p => {
  await p.evaluate(() => document.querySelector('#fiAnn').scrollIntoView({ block: 'center' }));
  await p.click('#fiAnn > summary');
  await p.waitForFunction(() => !document.querySelector('#fiAnn').__folding, null, { timeout: 2000 }).catch(() => {});
};
/* le défileur de la feuille, quel qu'il soit — on descend au bloc */
const auFond = async p => {
  await p.waitForFunction(() => !document.querySelector('#fiAnn')?.__folding, null, { timeout: 2000 }).catch(() => {});
  const r = await p.evaluate(() => {
    let n = document.querySelector('#fiAnn');
    while (n && !(n.scrollHeight > n.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(n).overflowY))) n = n.parentElement;
    if (n) n.scrollTo({ top: n.scrollHeight, behavior: 'instant' });
    return n ? [n.className, n.scrollTop, n.scrollHeight, n.clientHeight] : null;
  });
  await p.waitForTimeout(250);
  return r;
};
const annuler = async p => {
  await p.waitForSelector('.undo-bar button', { timeout: 2000 });
  await p.evaluate(() => [...document.querySelectorAll('.undo-bar button')].find(b => /annuler/i.test(b.textContent))?.click());
  await p.waitForTimeout(200);
};

/* ---------- au pouce : une piste qui porte un SIREN ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiAnn');
  await p.waitForTimeout(400);
  let b = await bloc(p, 300);
  if (b.ouvert) fail('au pouce, le bloc « Annuaire » est déplié d’office');
  if (sv.journal.length) fail(`au pouce, une requête est partie bloc replié : ${sv.journal}`);
  /* une marque sur la fiche : si la réponse redessinait la fiche entière
     au lieu du seul bloc, le champ de notes serait un AUTRE nœud */
  await p.evaluate(() => { document.querySelector('#fiNotes').__marque = 1; });
  await ouvrirBloc(p);
  b = await bloc(p);
  /* le site arrive APRÈS les données (une seconde question, à Wikidata) */
  await p.waitForSelector('#fiAnn a.fk-v[href*="advens.fr"]', { timeout: 3000 }).catch(() => {});
  b = await bloc(p);
  if (!(await p.evaluate(() => document.querySelector('#fiNotes')?.__marque)))
    fail('la réponse de l’annuaire a redessiné toute la fiche, pas seulement son bloc');
  const [qa, qw] = sv.journal;
  const ua = new URL(qa || 'http://x/');
  if (ua.searchParams.get('q') !== '812345678' || [...ua.searchParams.keys()].sort().join() !== 'per_page,q')
    fail('la question à l’annuaire ne porte pas QUE le SIREN : ' + qa);
  if (!qw || !/query\.wikidata\.org/.test(qw) || !pliees(qw).includes('812345678')) fail('le site n’a pas été cherché sur Wikidata : ' + qw);
  for (const u of sv.journal){ const w = fuite(u); if (w) fail(`« ${w} » est sorti : ${u}`); }
  if (b.lignes['Activité'] !== 'Conseil en systèmes et logiciels informatiques') fail('activité : ' + JSON.stringify(b.lignes));
  if (b.lignes['Effectif'] !== '100-199 salariés') fail('effectif : ' + b.lignes['Effectif']);
  if (b.lignes['Création'] !== '2009') fail('création : ' + b.lignes['Création']);
  if (!/Thomas Leroy/.test(b.lignes['Dirigeant'] || '') || /Cabinet/.test(b.lignes['Dirigeant'] || ''))
    fail('dirigeant : ' + b.lignes['Dirigeant']);
  /* Claire Petit est déjà un contact : on ne la propose pas deux fois */
  if (b.dirs.join() !== 'Thomas Leroy') fail('dirigeants proposés : ' + b.dirs);
  if (!/advens\.fr/.test(b.lignes['Site'] || '')) fail('le site Wikidata ne se montre pas : ' + JSON.stringify(b.lignes));
  if ('Adresse' in b.lignes || 'Siège' in b.lignes) fail('l’adresse se redit alors que la fiche l’a déjà');
  /* la fiche n'a ni site ni « En bref » : ce sont les deux seuls vides que
     l'annuaire sait remplir — l'adresse, la ville, le secteur sont déjà là */
  if (!b.completer || b.quoi !== 'activité · site') fail(`« Ajouter à ma fiche » : ${b.completer} « ${b.quoi} »`);
  console.log('pouce · SIREN : replié rien ne part ; déplié, le SIREN seul part, activité, effectif, dirigeant, site ✓');

  /* ③ les liens */
  const L = Object.fromEntries(b.liens.map(l => [l.cle, l]));
  if (b.liens.map(l => l.cle).join() !== 'gens,offres,officielle') fail('liens : ' + b.liens.map(l => l.cle));
  if (L.gens.label !== 'Anciens de mon école' || new URL(L.gens.href).searchParams.get('keywords') !== 'Advens Lycée Baggio')
    fail('LinkedIn : ' + L.gens.href);
  if (pliees(L.offres.href).includes('baggio') || new URL(L.offres.href).searchParams.get('motsCles') !== 'Advens')
    fail('France Travail : ' + L.offres.href);
  if (L.officielle.href !== 'https://annuaire-entreprises.data.gouv.fr/entreprise/812345678') fail('fiche officielle : ' + L.officielle.href);
  if (b.liens.some(l => l.cible !== '_blank')) fail('un lien ne s’ouvre pas ailleurs');
  console.log('pouce · trois liens : l’école vers LinkedIn seulement, la fiche officielle par le SIREN ✓');
  await auFond(p);
  await p.screenshot({ path: `${SHOTS}/98-enrichir-pouce.png` });

  /* ② compléter : le vide se remplit, le reste ne bouge pas, et ça se défait */
  const avant = await piste(p, 'a');
  await p.click('[data-fa-completer]');
  await p.waitForTimeout(200);
  let apres = await piste(p, 'a');
  if (apres.website !== 'https://www.advens.fr/') fail('le site n’est pas entré dans la fiche : ' + apres.website);
  if (apres.desc !== 'Conseil en systèmes et logiciels informatiques') fail('« En bref » vide ne s’est pas rempli : ' + apres.desc);
  if (apres.address !== avant.address || apres.domain !== 'cyber' || apres.city !== 'Lille')
    fail('« Ajouter à ma fiche » a écrasé quelque chose : ' + JSON.stringify(apres));
  const ouvertApres = await p.evaluate(() => document.querySelector('#fiAnn')?.open);
  if (!ouvertApres) fail('le bloc s’est replié après le geste');
  if (!(await p.$('#fiKnow a[href*="advens.fr"]'))) fail('« À savoir » ne montre pas le site ajouté');
  b = await bloc(p);
  if (b.completer) fail('« Ajouter à ma fiche » reste alors qu’il n’y a plus rien à ajouter');
  await annuler(p);
  apres = await piste(p, 'a');
  if (apres.website || apres.desc) fail('Annuler n’a pas tout retiré : ' + apres.website + ' / ' + apres.desc);
  if ((apres.history || []).some(h => /annuaire/i.test(h.t))) fail('Annuler laisse une ligne d’historique');
  console.log('pouce · « Ajouter à ma fiche » : le vide se remplit, rien d’écrasé, Annuler défait ✓');

  /* ② un dirigeant devient un contact — seulement sur geste, et se défait */
  await p.click('[data-fa-dir="Thomas Leroy"]');
  await p.waitForTimeout(200);
  apres = await piste(p, 'a');
  const t = (apres.contacts || []).find(x => x.name === 'Thomas Leroy');
  if (!t || t.role !== 'Président') fail('le dirigeant n’est pas devenu contact : ' + JSON.stringify(apres.contacts));
  b = await bloc(p);
  if (b.dirs.length) fail('le dirigeant ajouté reste proposé');
  await annuler(p);
  apres = await piste(p, 'a');
  if ((apres.contacts || []).some(x => x.name === 'Thomas Leroy')) fail('Annuler n’a pas retiré le contact');
  console.log('pouce · dirigeant → contact sur geste, Annuler le retire ✓');
  await fermer(p);
  await ctx.close();
}

/* ---------- au pouce : une piste SANS SIREN, sur geste ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  await ouvrirFiche(p, 'b');
  await p.waitForSelector('#fiAnn');
  await ouvrirBloc(p);
  let b = await bloc(p, 500);
  if (sv.journal.length) fail('sans SIREN, une requête est partie sans geste : ' + sv.journal);
  if (!b.trouver) fail('pas de « Trouver dans l’annuaire »');
  if (new URL(b.liens.find(l => l.cle === 'officielle').href).searchParams.get('terme') !== 'Lumen Data')
    fail('sans SIREN, la fiche officielle ne vise pas la recherche par nom');
  await p.click('[data-fa-trouver]');
  b = await bloc(p);
  const u = new URL(sv.journal[0] || 'http://x/');
  if (u.searchParams.get('q') !== 'Lumen Data' || u.searchParams.get('departement') !== '59')
    fail('la recherche par nom ne porte pas le nom et le département : ' + u.search);
  for (const x of sv.journal){ const w = fuite(x); if (w) fail(`« ${w} » est sorti : ${x}`); }
  if (b.choix.join('|') !== 'Lumen Data|Lumen Data Conseil') fail('candidats : ' + b.choix);
  await auFond(p);
  await p.screenshot({ path: `${SHOTS}/98-enrichir-choix-pouce.png` });
  await p.click('[data-fa-pick="856123456"]');
  await p.waitForTimeout(300);
  let c = await piste(p, 'b');
  if (c.siren !== '856123456') fail('le SIREN n’est pas attaché : ' + c.siren);
  if (c.desc !== 'Data et IA, équipe de 12') fail('la description saisie a été écrasée : ' + c.desc);
  if (!/Place du Theatre/i.test(c.address || '') || c.lat == null) fail('l’adresse vide ne s’est pas remplie : ' + c.address);
  if (c.domain !== 'cloud') fail('le secteur vide ne s’est pas rempli : ' + c.domain);
  b = await bloc(p);
  if (b.lignes['SIREN'] !== '856123456' || b.trouver) fail('après le choix, le bloc ne montre pas l’entreprise : ' + JSON.stringify(b));
  await annuler(p);
  c = await piste(p, 'b');
  if (c.siren || c.address || c.lat != null || c.domain !== 'autre') fail('Annuler n’a pas tout défait : ' + JSON.stringify(c));
  console.log('pouce · sans SIREN : rien sans geste, nom + département seulement, la bonne s’attache, rien d’écrasé, Annuler ✓');
  await fermer(p);
  await ctx.close();
}

/* ---------- ④ hors ligne, puis une panne qui se répare ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  await ctx.setOffline(true);
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiAnn');
  await ouvrirBloc(p);
  let b = await bloc(p, 800);
  if (b.etat !== 'Hors ligne. Réessayer') fail('hors ligne : « ' + b.etat + ' »');
  if (sv.journal.length) fail('hors ligne, une requête est partie');
  if (b.liens.length !== 3) fail('hors ligne, les liens ont disparu');
  await ctx.setOffline(false);
  sv.regler({ statut: 500 });
  await p.click('[data-fa-encore]');
  b = await bloc(p);
  if (b.etat !== 'L’annuaire ne répond pas. Réessayer') fail('panne : « ' + b.etat + ' »');
  sv.regler({ statut: 200 });
  await p.click('[data-fa-encore]');
  b = await bloc(p);
  if (b.lignes['Activité'] !== 'Conseil en systèmes et logiciels informatiques') fail('après Réessayer, rien ne revient');
  console.log('hors ligne et panne : chaque cas se dit, Réessayer répare ✓');
  await ctx.close();
}

/* ---------- ⑤ au poste, dans les deux thèmes ---------- */
for (const sombre of [false, true]){
  const { ctx, p, sv } = await ecran({ width: 1280, height: 800 }, false, { sombre });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiAnn');
  /* on écrit une note PENDANT que la réponse arrive : elle doit rester */
  await p.click('#fiNotes');
  await p.keyboard.type('à relire', { delay: 5 });
  const b = await bloc(p);
  if (!b.ouvert) fail('au poste, le bloc « Annuaire » n’est pas ouvert');
  if (!sv.journal.length) fail('au poste, rien n’est parti à l’ouverture');
  if (b.lignes['Effectif'] !== '100-199 salariés') fail('au poste, les données ne sont pas là');
  const note = await p.evaluate(() => ({ v: document.querySelector('#fiNotes').value, f: document.activeElement?.id }));
  if (note.v !== PISTES[0].notes + 'à relire' || note.f !== 'fiNotes') fail('la réponse a redessiné la fiche sous les doigts : ' + JSON.stringify(note));
  const deborde = await p.evaluate(() => {
    const m = document.querySelector('.modal-fiche .modal-b');
    return [...m.querySelectorAll('#fiAnn *')].filter(x => x.getBoundingClientRect().right > m.getBoundingClientRect().right + 1)
      .map(x => x.className || x.tagName).slice(0, 3);
  });
  if (deborde.length) fail('le bloc déborde de la fenêtre : ' + deborde);
  await p.evaluate(() => document.querySelector('#fiAnn').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: `${SHOTS}/98-enrichir-poste${sombre ? '-sombre' : ''}.png` });
  console.log(`poste ${sombre ? 'sombre' : 'clair'} · ouvert d’office, la note en cours reste, rien ne déborde ✓`);
  await ctx.close();
}

/* ---------- au plus étroit, texte doublé : les liens se replient ---------- */
{
  const { ctx, p } = await ecran({ width: 320, height: 640 }, true);
  await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#fiAnn');
  await ouvrirBloc(p);
  await bloc(p);
  const r = await p.evaluate(() => {
    const m = document.querySelector('.modal-fiche .modal-b');
    const mr = m.getBoundingClientRect().right;
    return {
      deborde: [...m.querySelectorAll('#fiAnn *')].filter(x => x.getBoundingClientRect().right > mr + 1).length,
      coupes: [...document.querySelectorAll('#fiAnn .btn')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.trim())
    };
  });
  if (r.deborde) fail(`320 px à 200 % : ${r.deborde} élément(s) dépassent la feuille`);
  if (r.coupes.length) fail('320 px à 200 % : libellés coupés ' + r.coupes);
  await auFond(p);
  await p.screenshot({ path: `${SHOTS}/98-enrichir-320-200.png` });
  console.log('320 px à 200 % : rien ne dépasse, aucun libellé coupé ✓');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
await browser.close();
server.close();
if (!process.exitCode) console.log('\nOK — la fiche s’enrichit sans qu’un mot privé ne sorte, et rien ne change sans geste.');

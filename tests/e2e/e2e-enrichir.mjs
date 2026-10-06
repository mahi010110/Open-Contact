/* ============================================================
   La fiche s'enrichit — l'annuaire, Wikidata, trois liens d'un tap
   (docs/recherche.md, lot 3 ; docs/presentation-recherche.md, lot B)

   Ce que l'annuaire apporte à la fiche est RANGÉ PAR USAGE (§6) :
   « Anciens de mon école » avec les contacts, le dirigeant proposé dans
   « Ajouter un contact », les données, « Compléter ma fiche », les offres
   et la fiche officielle dans « À savoir », une entreprise fermée sous
   le nom. Deux services publics
   sont interrogés depuis le navigateur. Ce fichier lit chaque requête qui sort, en
   partant de l'état RÉEL de l'app (§8 : un contrôle de fuite lit les
   octets qui sortent par le vrai chemin), et vérifie que rien ne change
   dans la fiche sans un geste qui se défait.

   ① ce qui part : le SIREN seul pour une piste qui en porte un ; le nom
     et le département pour une piste qui n'en porte pas, et seulement
     sur « Trouver dans l'annuaire ». Jamais une note, un contact, le
     profil. La question par SIREN part à l'ouverture de la fiche : ce
     qu'elle rapporte sert dès qu'on ajoute un contact ;
   ② ce qui change : « Compléter ma fiche » remplit les VIDES, n'écrase
     rien, et se défait ; un dirigeant ne devient un contact que si on le
     choisit dans « Ajouter un contact », et rien ne s'ajoute sans
     « Enregistrer » ; choisir « la bonne » attache le SIREN ;
   ③ les liens : LinkedIn porte l'école, France Travail ne la porte pas,
     la fiche officielle vise le SIREN ; tous s'ouvrent ailleurs ;
   ④ hors ligne, une panne : chaque cas se dit, et se répare ;
   ⑤ au poste : « À savoir » est ouvert, la réponse arrive sans redessiner
     la fiche sous les doigts (les notes en cours restent), aucune feuille
     ne défile de travers, dans les deux thèmes ;
   ⑥ chaque donnée est À SA PLACE : les anciens de l'école dans les
     contacts, le dirigeant là où l'on ajoute un contact, le reste dans
     « À savoir », plus aucun bloc « Annuaire » à part.

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
/* les trois zones ont-elles FINI de charger ? sinon on lirait l'état d'avant */
const bloc = async (p, ms = 3000) => {
  await p.waitForFunction(() => {
    const b = document.querySelector('#faSavoir');
    return b && !b.querySelector('[aria-busy="true"]');
  }, null, { timeout: ms }).catch(() => {});
  return p.evaluate(() => {
    const sav = document.querySelector('#faSavoir'), cts = document.querySelector('#faCts');
    const carte = document.querySelector('#faCarte');
    const lignes = {};
    document.querySelectorAll('#faCarte .fk, #faSavoir .fk').forEach(f => {
      const l = f.querySelector('.fk-l')?.textContent.trim();
      if (l) lignes[l] = f.querySelector('.fk-v')?.textContent.replace(/\s+/g, ' ').trim();
    });
    return {
      present: !!sav, ouvert: !!document.querySelector('#fiKnow')?.open, lignes,
      fait: carte?.querySelector('.ct-quoi p')?.textContent.trim() || '',
      qui: !!cts?.querySelector('.fa-qui'),
      ancien: !!document.querySelector('#fiAnn'),
      etat: sav?.querySelector('.fa-etat')?.textContent.replace(/\s+/g, ' ').trim() || '',
      completer: !!sav?.querySelector('[data-fa-completer]'),
      quoi: sav?.querySelector('.fa-quoi')?.textContent.trim() || '',
      siren: sav?.querySelector('.fa-siren')?.textContent.trim() || '',
      gensVisible: !!cts?.querySelector('[data-lien="gens"]')?.getClientRects().length,
      trouver: !!sav?.querySelector('[data-fa-trouver]'),
      choix: [...(sav?.querySelectorAll('[data-fa-pick] b') || [])].map(b => b.textContent.trim()),
      liens: [...document.querySelectorAll('#faCts [data-lien], #faSavoir [data-lien]')].map(a => ({ cle: a.dataset.lien, href: a.href,
        label: a.textContent.trim(), cible: a.target, zone: a.closest('#faCts') ? 'contacts' : 'savoir' })),
      fermee: document.querySelector('#faEtat')?.textContent.replace(/\s+/g, ' ').trim() || ''
    };
  });
};
/* « À savoir » se déplie avec une animation (`foldAnim`, ui/dom.js) : la
   hauteur reste posée en dur jusqu'à la fin — une mesure ou une capture
   prise avant lirait un cadre rogné */
const ouvrirBloc = async p => {
  if (await p.evaluate(() => document.querySelector('#fiKnow')?.open)) return;
  await p.evaluate(() => document.querySelector('#fiKnow').scrollIntoView({ block: 'center' }));
  await p.click('#fiKnow > summary');
  await p.waitForFunction(() => !document.querySelector('#fiKnow').__folding, null, { timeout: 2000 }).catch(() => {});
};
/* le défileur de la feuille, quel qu'il soit — on descend au fond */
const auFond = async p => {
  await p.waitForFunction(() => !document.querySelector('#fiKnow')?.__folding, null, { timeout: 2000 }).catch(() => {});
  const r = await p.evaluate(() => {
    let n = document.querySelector('#faSavoir');
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
  /* une réponse LENTE : la marque se pose avant qu'elle arrive. Si la
     réponse redessinait la fiche entière au lieu de ses zones, le champ
     de notes serait un AUTRE nœud */
  sv.regler({ statut: 200, retard: 400 });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#faSavoir', { state: 'attached' });
  await p.evaluate(() => { document.querySelector('#fiNotes').__marque = 1; });
  let b = await bloc(p);
  /* le site arrive APRÈS les données (une seconde question, à Wikidata) */
  await p.waitForSelector('#faCarte a.fk-v[href*="advens.fr"]', { timeout: 3000, state: 'attached' }).catch(() => {});
  b = await bloc(p);
  sv.regler({ statut: 200 });
  if (b.ancien) fail('le bloc « Annuaire » à part existe encore — chaque donnée doit être à sa place');
  /* la carte se voit sans rien toucher (demande du mainteneur) */
  if (!b.ouvert) fail('au pouce, « À savoir » est replié : la carte de l’entreprise ne se voit pas sans toucher');
  if (!(await p.evaluate(() => document.querySelector('#fiNotes')?.__marque)))
    fail('la réponse de l’annuaire a redessiné toute la fiche, pas seulement ses zones');
  const qa = sv.journal.find(u => u.startsWith('https://recherche-entreprises'));
  const qw = sv.journal.find(u => u.startsWith('https://query.wikidata.org'));
  const ua = new URL(qa || 'http://x/');
  if (ua.searchParams.get('q') !== '812345678' || [...ua.searchParams.keys()].sort().join() !== 'per_page,q')
    fail('la question à l’annuaire ne porte pas QUE le SIREN : ' + qa);
  if (!qw || !/query\.wikidata\.org/.test(qw) || !pliees(qw).includes('812345678')) fail('le site n’a pas été cherché sur Wikidata : ' + qw);
  for (const u of sv.journal){ const w = fuite(u); if (w) fail(`« ${w} » est sorti : ${u}`); }
  /* ⑥ « Anciens de mon école » est avec les CONTACTS, visible sans rien déplier */
  if (!b.gensVisible) fail('au pouce, « Anciens de mon école » ne se voit pas sans déplier');
  await ouvrirBloc(p);
  b = await bloc(p);
  /* la carte : sans « En bref » ni Wikipédia, pas de phrase — les
     MISSIONS en mots simples, la taille en mots (6 octobre : le chiffre
     d'affaires, la création, les sites ne départagent rien) */
  if (b.fait) fail('le libellé de l’INSEE revient en tête de la carte : ' + b.fait);
  if (b.lignes['Missions'] !== 'Conseil et intégration informatique') fail('missions : ' + b.lignes['Missions']);
  if (b.lignes['Taille'] !== '100 à 199 salariés') fail('taille : ' + b.lignes['Taille']);
  if (b.lignes['Dirigeant'] || /création|sites|CA /.test(JSON.stringify(b.lignes))) fail('l’ancienne carte revient : ' + JSON.stringify(b.lignes));
  /* la piste a déjà une adresse (Claire Petit) : « à qui écrire » se tait */
  if (b.qui) fail('« Écrire à » se montre alors que la piste a déjà une adresse');
  if (!/advens\.fr/.test(b.lignes['Site'] || '')) fail('le site Wikidata ne se montre pas : ' + JSON.stringify(b.lignes));
  if (b.lignes['Siège'] || /Rue de la Bassée/.test(Object.values(b.lignes).filter((v, i, a) => a.indexOf(v) !== i).join()))
    fail('l’adresse se redit alors que la fiche l’a déjà');
  /* la fiche n'a ni site ni « En bref » : ce sont les deux seuls vides que
     l'annuaire sait remplir — l'adresse, la ville, le secteur sont déjà là */
  if (!b.completer || b.quoi !== 'activité · site') fail(`« Compléter ma fiche » : ${b.completer} « ${b.quoi} »`);
  if (b.siren !== 'SIREN 812345678') fail('la ligne de source ne dit pas le SIREN : ' + b.siren);
  console.log('pouce · SIREN : le SIREN seul part ; « À savoir » ouvert montre la carte — missions, taille, le site — et la source en ligne grise ; « à qui écrire » se tait, la piste a une adresse ✓');

  /* ③ les liens */
  const L = Object.fromEntries(b.liens.map(l => [l.cle, l]));
  if (b.liens.map(l => l.cle).join() !== 'gens,offres,officielle') fail('liens : ' + b.liens.map(l => l.cle));
  /* ⑥ chacun à sa place : trouver quelqu'un avec les contacts, le reste dans « À savoir » */
  if (b.liens.map(l => l.zone).join() !== 'contacts,savoir,savoir') fail('les liens ne sont pas à leur place : ' + b.liens.map(l => l.cle + ':' + l.zone));
  if (L.gens.label !== 'Anciens de mon école' || new URL(L.gens.href).searchParams.get('keywords') !== 'Advens Lycée Baggio')
    fail('LinkedIn : ' + L.gens.href);
  if (pliees(L.offres.href).includes('baggio') || new URL(L.offres.href).searchParams.get('motsCles') !== 'Advens')
    fail('France Travail : ' + L.offres.href);
  if (L.officielle.href !== 'https://annuaire-entreprises.data.gouv.fr/entreprise/812345678') fail('fiche officielle : ' + L.officielle.href);
  if (b.liens.some(l => l.cible !== '_blank')) fail('un lien ne s’ouvre pas ailleurs');
  console.log('pouce · trois liens : « Anciens de mon école » avec les contacts, offres et fiche officielle dans « À savoir » ✓');
  await auFond(p);
  await p.screenshot({ path: `${SHOTS}/98-enrichir-pouce.png` });

  /* ② compléter : le vide se remplit, le reste ne bouge pas, et ça se défait */
  const avant = await piste(p, 'a');
  await p.click('[data-fa-completer]');
  await p.waitForTimeout(200);
  let apres = await piste(p, 'a');
  if (apres.website !== 'https://www.advens.fr/') fail('le site n’est pas entré dans la fiche : ' + apres.website);
  if (apres.desc !== 'Conseil et intégration informatique') fail('« En bref » vide ne s’est pas rempli des missions : ' + apres.desc);
  if (apres.address !== avant.address || apres.domain !== 'cyber' || apres.city !== 'Lille')
    fail('« Compléter ma fiche » a écrasé quelque chose : ' + JSON.stringify(apres));
  const ouvertApres = await p.evaluate(() => document.querySelector('#fiKnow')?.open);
  if (!ouvertApres) fail('« À savoir » s’est replié après le geste');
  if (!(await p.$('#fiKnow a[href*="advens.fr"]'))) fail('« À savoir » ne montre pas le site ajouté');
  b = await bloc(p);
  if (b.completer) fail('« Compléter ma fiche » reste alors qu’il n’y a plus rien à ajouter');
  await annuler(p);
  apres = await piste(p, 'a');
  if (apres.website || apres.desc) fail('Annuler n’a pas tout retiré : ' + apres.website + ' / ' + apres.desc);
  if ((apres.history || []).some(h => /annuaire/i.test(h.t))) fail('Annuler laisse une ligne d’historique');
  console.log('pouce · « Compléter ma fiche » : le vide se remplit, rien d’écrasé, « À savoir » reste ouvert, Annuler défait ✓');

  /* ② le dirigeant est PROPOSÉ là où l'on ajoute un contact — un tap
     remplit le nom et le rôle, rien ne s'ajoute sans « Enregistrer ».
     Claire Petit est déjà un contact : on ne la propose pas deux fois ;
     un cabinet n'est personne à qui écrire */
  await p.evaluate(() => document.querySelector('#fiCtAdd').scrollIntoView({ block: 'center' }));
  await p.click('#fiCtAdd');
  await p.waitForSelector('.ce-sugg [data-sugg]', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(400);
  const sugg = await p.evaluate(() => [...document.querySelectorAll('.ce-sugg [data-sugg]')].map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  if (sugg.length !== 1 || !/^Thomas Leroy président$/.test(sugg[0])) fail('« Ajouter un contact » propose : ' + JSON.stringify(sugg));
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
  apres = await piste(p, 'a');
  const t = (apres.contacts || []).find(x => x.name === 'Thomas Leroy');
  if (!t || t.role !== 'Président') fail('le dirigeant n’est pas devenu contact : ' + JSON.stringify(apres.contacts));
  console.log('pouce · le dirigeant proposé dans « Ajouter un contact » : un tap remplit, rien sans « Enregistrer » ✓');
  await fermer(p);
  await ctx.close();
}

/* ---------- au pouce : une piste SANS SIREN, sur geste ---------- */
{
  const { ctx, p, sv } = await ecran({ width: 390, height: 844 }, true);
  await ouvrirFiche(p, 'b');
  await p.waitForSelector('#faSavoir', { state: 'attached' });
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
  if (b.choix.join('|') !== 'Lumen Data|Lumen Data Conseil|Lumen Data Global Solutions Centre de Services Partages')
    fail('candidats : ' + b.choix);
  /* le NOM d'un candidat plie, il ne se coupe jamais — c'est lui qui
     départage deux homonymes (§6, une liste où l'on choisit). Mesuré en
     LARGEUR : un nom forcé sur un rang garde sa hauteur et déborde de côté */
  const coupes = await p.evaluate(() => [...document.querySelectorAll('.fa-choix .pk-m > b')]
    .filter(x => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map(x => x.textContent));
  if (coupes.length) fail('un nom de candidat est coupé : ' + coupes);
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
  if (b.siren !== 'SIREN 856123456' || b.trouver || !b.lignes['Taille']) fail('après le choix, « À savoir » ne montre pas l’entreprise : ' + JSON.stringify(b));
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
  await p.waitForSelector('#faSavoir', { state: 'attached' });
  await ouvrirBloc(p);
  let b = await bloc(p, 800);
  if (b.etat !== 'Hors ligne. Réessayer') fail('hors ligne : « ' + b.etat + ' »');
  if (sv.journal.length) fail('hors ligne, une requête est partie');
  if (b.liens.length !== 3) fail('hors ligne, les liens ont disparu : ' + b.liens.map(l => l.cle));
  /* la panne se règle AVANT le retour du réseau : l'app relance d'elle-même
     la question quand le réseau revient (c'est voulu), et en CI cette
     relance a atteint l'annuaire avant la panne — il répondait, et le
     bouton « Réessayer » n'existait jamais. Si le retour n'a rien relancé,
     c'est le geste qui le fait. */
  sv.regler({ statut: 500 });
  await ctx.setOffline(false);
  await p.waitForTimeout(300);
  if ((await bloc(p, 500)).etat === 'Hors ligne. Réessayer') await p.click('[data-fa-encore]');
  await p.waitForFunction(() => /ne répond pas/.test(document.querySelector('#faSavoir .fa-etat')?.textContent || ''),
    null, { timeout: 3000 }).catch(() => {});
  b = await bloc(p);
  if (b.etat !== 'L’annuaire ne répond pas. Réessayer') fail('panne : « ' + b.etat + ' »');
  sv.regler({ statut: 200 });
  await p.click('[data-fa-encore]');
  b = await bloc(p);
  if (b.lignes['Missions'] !== 'Conseil et intégration informatique') fail('après Réessayer, rien ne revient');
  console.log('hors ligne et panne : chaque cas se dit, Réessayer répare ✓');
  await ctx.close();
}

/* ---------- ⑤ au poste, dans les deux thèmes ---------- */
for (const sombre of [false, true]){
  const { ctx, p, sv } = await ecran({ width: 1280, height: 800 }, false, { sombre });
  sv.regler({ statut: 200, retard: 400 });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#faSavoir', { state: 'attached' });
  /* on écrit une note PENDANT que la réponse arrive : elle doit rester */
  await p.click('#fiNotes');
  await p.keyboard.type('à relire', { delay: 5 });
  const b = await bloc(p);
  if (!b.ouvert) fail('au poste, « À savoir » n’est pas ouvert');
  if (!sv.journal.length) fail('au poste, rien n’est parti à l’ouverture');
  if (b.lignes['Taille'] !== '100 à 199 salariés') fail('au poste, les données ne sont pas là');
  const note = await p.evaluate(() => ({ v: document.querySelector('#fiNotes').value, f: document.activeElement?.id }));
  if (note.v !== PISTES[0].notes + 'à relire' || note.f !== 'fiNotes') fail('la réponse a redessiné la fiche sous les doigts : ' + JSON.stringify(note));
  const deborde = await p.evaluate(() => {
    const m = document.querySelector('.modal-fiche .modal-b');
    return [...m.querySelectorAll('#faSavoir *, #faCts *')].filter(x => x.getBoundingClientRect().right > m.getBoundingClientRect().right + 1)
      .map(x => x.className || x.tagName).slice(0, 3);
  });
  if (deborde.length) fail('l’annuaire déborde de la fenêtre : ' + deborde);
  await p.evaluate(() => document.querySelector('#faSavoir').scrollIntoView({ block: 'center' }));
  await p.screenshot({ path: `${SHOTS}/98-enrichir-poste${sombre ? '-sombre' : ''}.png` });
  console.log(`poste ${sombre ? 'sombre' : 'clair'} · ouvert d’office, la note en cours reste, rien ne déborde ✓`);
  await ctx.close();
}

/* ---------- au plus étroit, texte doublé : les liens se replient ---------- */
{
  const { ctx, p } = await ecran({ width: 320, height: 640 }, true);
  await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirFiche(p, 'a');
  await p.waitForSelector('#faSavoir', { state: 'attached' });
  await ouvrirBloc(p);
  await bloc(p);
  const r = await p.evaluate(() => {
    const m = document.querySelector('.modal-fiche .modal-b');
    const mr = m.getBoundingClientRect().right;
    return {
      deborde: [...m.querySelectorAll('#faSavoir *, #faCts *')].filter(x => x.getBoundingClientRect().right > mr + 1).length,
      coupes: [...document.querySelectorAll('#faSavoir .btn, #faCts .btn')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.trim())
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

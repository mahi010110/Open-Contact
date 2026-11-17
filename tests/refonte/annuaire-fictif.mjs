/* ============================================================
   OpenContact · tests de la nouvelle interface · un annuaire fictif
   (docs/refonte-reprendre.md §8)

   Le réseau est fermé dans l'environnement de développement : pour
   jouer Trouver de bout en bout, l'annuaire public des entreprises et
   les sources de la carte (Wikidata, BODACC, Wikipédia, Egapro,
   Clearbit) répondent ici, DANS LEUR FORMAT RÉEL — le même qu'ont relevé
   les sondes (tests/e2e/sonde-annuaire.mjs). Les entreprises sont
   celles de la maquette validée : quelques noms réels (dont les comptes
   et les dirigeants sont inventés), les autres inventés.
   La CSP de la page, elle, est la vraie : si elle bloquait un appel, le
   navigateur le refuserait avant toute interception.
   ============================================================ */
const LILLE = [50.631, 3.047];
/* une position à `km` du centre de Lille, dans une direction */
const pos = (km, deg) => {
  const r = deg * Math.PI / 180;
  return [LILLE[0] + (km / 111) * Math.cos(r), LILLE[1] + (km / (111 * Math.cos(LILLE[0] * Math.PI / 180))) * Math.sin(r)];
};
const E = o => {
  const [lat, lng] = pos(o.km, o.deg || 0);
  const etab = { est_siege: true, numero_voie: '12', type_voie: 'RUE', libelle_voie: o.rue || 'NATIONALE', code_postal: o.cp || '59000',
    libelle_commune: o.ville.toUpperCase(), latitude: lat.toFixed(5), longitude: lng.toFixed(5), etat_administratif: 'A',
    activite_principale: o.naf, tranche_effectif_salarie: o.ici || o.tr, caractere_employeur: 'O' };
  return {
    siren: o.siren, nom_complet: o.nom.toUpperCase(), nom_raison_sociale: o.nom.toUpperCase(), sigle: null,
    activite_principale: o.naf, categorie_entreprise: o.cat || 'PME', tranche_effectif_salarie: o.tr,
    date_creation: '2009-03-12', nombre_etablissements_ouverts: o.sites || 1, nature_juridique: '5710',
    etat_administratif: 'A',
    complements: { liste_idcc: ['1486'], est_entrepreneur_individuel: false, egapro_renseignee: !!o.egapro },
    finances: o.ca ? { [o.an || 2025]: { ca: o.ca, resultat_net: o.res } } : null,
    siege: { ...etab, est_siege: !o.ici },
    matching_etablissements: [{ ...etab, est_siege: !o.ici, adresse: `12 RUE ${etab.libelle_voie} ${etab.code_postal} ${etab.libelle_commune}` }],
    dirigeants: o.dir ? [{ nom: o.dir[1].toUpperCase(), prenoms: o.dir[0].toUpperCase(), qualite: o.dir[2], type_dirigeant: 'personne physique' }] : []
  };
};
export const ENTREPRISES = [
  E({ siren: '812000001', nom: 'Réseaux et Systèmes du Nord', ville: 'Lille', km: 1, deg: 20, naf: '62.03Z', tr: '12', ca: 2100000, res: 140000, dir: ['Claire', 'Durand', 'Présidente'] }),
  E({ siren: '812000002', nom: 'Nord Infogérance', ville: 'Lambersart', cp: '59130', km: 3, deg: 290, naf: '62.09Z', tr: '11', ca: 840000, res: 52000, an: 2024, dir: ['Marc', 'Delattre', 'Gérant'] }),
  E({ siren: '812000003', nom: 'Advens', ville: 'Lille', km: 2, deg: 120, naf: '62.02A', tr: '32', cat: 'ETI', egapro: true }),
  E({ siren: '812000004', nom: 'Septentrion Cloud', ville: 'Marcq-en-Barœul', cp: '59700', km: 5, deg: 40, naf: '63.11Z', tr: '21', ca: 6400000, res: 310000, dir: ['Hugo', 'Vasseur', 'Directeur général'] }),
  E({ siren: '812000005', nom: 'Fiducial Informatique', ville: "Villeneuve-d'Ascq", cp: '59650', km: 6, deg: 100, naf: '62.09Z', tr: '41', ici: '03', cat: 'ETI', sites: 40 }),
  E({ siren: '812000006', nom: 'Datagora', ville: 'Roubaix', cp: '59100', km: 9, deg: 60, naf: '62.01Z', tr: '11', ca: 1200000, res: -45000, dir: ['Sophie', 'Marchal', 'Gérante'] }),
  E({ siren: '812000007', nom: 'Orange Cyberdefense', ville: 'Lille', km: 3, deg: 200, naf: '62.02A', tr: '51', cat: 'GE', sites: 30 }),
  E({ siren: '812000008', nom: 'OVHcloud', ville: 'Roubaix', cp: '59100', km: 9, deg: 50, naf: '63.11Z', tr: '51', cat: 'GE', sites: 12 }),
  E({ siren: '812000009', nom: 'Hauts-de-France Télécom', ville: 'Wasquehal', cp: '59290', km: 6, deg: 70, naf: '61.10Z', tr: '12', ca: 3300000, res: 210000, dir: ['Élodie', 'Carpentier', 'Présidente'] }),
  E({ siren: '812000010', nom: 'Brasserie Numérique', ville: 'Lille', km: 2, deg: 250, naf: '62.01Z', tr: '03', ca: 410000, res: 23000, an: 2024, dir: ['Nora', 'Belkacem', 'Gérante'] }),
  E({ siren: '812000011', nom: 'Atelier Numérique des Flandres', ville: 'Armentières', cp: '59280', km: 14, deg: 300, naf: '62.09Z', tr: '03', dir: ['Paul', 'Dewaele', 'Gérant'] }),
  E({ siren: '812000012', nom: 'Lys Informatique', ville: 'Armentières', cp: '59280', km: 12, deg: 295, naf: '62.03Z', tr: '11', ca: 950000, res: 61000, dir: ['Julien', 'Caron', 'Gérant'] }),
  E({ siren: '812000013', nom: 'Opale Systèmes', ville: 'Lille', km: 2, deg: 160, naf: '62.03Z', tr: '12', ca: 1800000, res: 90000, dir: ['Sandrine', 'Lefebvre', 'Présidente'] }),
  E({ siren: '812000014', nom: 'Deûle Réseaux', ville: 'Lambersart', cp: '59130', km: 3, deg: 310, naf: '61.10Z', tr: '12', dir: ['Thomas', 'Leroy', 'Président'] }),
  E({ siren: '812000015', nom: 'Citadelle Réseaux', ville: 'Lille', km: 2, deg: 330, naf: '62.09Z', tr: '12', ca: 1500000, res: 70000, dir: ['Karine', 'Duhamel', 'Présidente'] }),
  E({ siren: '812000016', nom: 'Lomme Systèmes', ville: 'Lomme', cp: '59160', km: 5, deg: 260, naf: '62.03Z', tr: '12', dir: ['Antoine', 'Leleu', 'Gérant'] })
];
/* ce que le BODACC dit de deux d'entre elles */
const BODACC = {
  '812000011': [{ dateparution: '2026-09-14', familleavis: 'collective', familleavis_lib: 'Procédures collectives',
    jugement: JSON.stringify({ famille: 'Jugement d’ouverture', nature: 'Jugement d’ouverture de redressement judiciaire', date: '2026-09-10' }) }],
  '812000001': [{ dateparution: '2026-03-02', familleavis: 'creation', familleavis_lib: 'Créations',
    acte: JSON.stringify({ descriptif: 'Création d’un établissement secondaire à Lens' }) }],
  '812000004': [{ dateparution: '2026-01-20', familleavis: 'modification', familleavis_lib: 'Modifications diverses',
    modificationsgenerales: JSON.stringify({ descriptif: 'Modification survenue sur l’administration : nouveau président' }) }]
};
const plat = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* Branche l'annuaire fictif sur un contexte Playwright. `mode` peut
   rendre une panne ({statut: 500}) ou une limite ({statut: 429}).
   Rend le journal des requêtes, pour vérifier ce qui part. */
export function brancherAnnuaire(ctx, o = {}){
  const journal = [];
  let mode = o.mode || { statut: 200 };
  const cors = { 'access-control-allow-origin': '*' };
  ctx.route('https://recherche-entreprises.api.gouv.fr/**', async route => {
    const u = new URL(route.request().url());
    journal.push(u.toString());
    const m = typeof mode === 'function' ? mode(u) : mode;
    if (m.statut !== 200) return route.fulfill({ status: m.statut, contentType: 'text/plain', headers: cors, body: 'non' });
    if (m.lent) await new Promise(r => setTimeout(r, m.lent));
    const page = Number(u.searchParams.get('page') || 1), par = Number(u.searchParams.get('per_page') || 10);
    let l = ENTREPRISES;
    const q = plat(u.searchParams.get('q') || '');
    if (/^\d{9}$/.test(q)) l = l.filter(e => e.siren === q);
    else if (q){
      const mots = q.split(' ').filter(w => !['reseau', 'reseaux', 'informatique', 'cyber', 'cybersecurite', 'securite', 'cloud', 'developpement'].includes(w));
      l = mots.length ? l.filter(e => mots.every(w => plat(e.nom_complet).split(' ').some(x => x.startsWith(w)))) : l;
    }
    const tr = u.searchParams.get('tranche_effectif_salarie');
    if (tr) l = l.filter(e => tr.split(',').includes(e.tranche_effectif_salarie));
    const body = { total_results: l.length, page, per_page: par, results: l.slice((page - 1) * par, page * par) };
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  });
  const autres = [];
  const vide = (type, body) => route => { autres.push(route.request().url());
    return route.fulfill({ status: 200, contentType: type, headers: cors, body }); };
  ctx.route('https://query.wikidata.org/**', vide('application/sparql-results+json', '{"results":{"bindings":[]}}'));
  ctx.route('https://bodacc-datadila.opendatasoft.com/**', route => {
    const u = decodeURIComponent(route.request().url().replace(/\+/g, ' '));
    autres.push(u);
    const s = (u.match(/registre like "(\d{9})"/) || [])[1];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: BODACC[s] || [] }) });
  });
  ctx.route('https://fr.wikipedia.org/**', vide('application/json', '{}'));
  ctx.route('https://autocomplete.clearbit.com/**', vide('application/json', '[]'));
  ctx.route('https://egapro.travail.gouv.fr/**', vide('application/json', '[]'));
  return { journal, autres, regler: m => { mode = m; } };
}

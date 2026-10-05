/* ============================================================
   OpenContact — sonde de LA CARTE D'UNE ENTREPRISE

   Demande du mainteneur (5 octobre 2026) : « que les infos soient
   affichées d'une belle façon sans devoir appuyer sur un lien », et
   « mixer les sources afin de donner les meilleures infos, les plus
   utiles ». Avant de dessiner une carte qui MÊLE plusieurs sources, une
   question par source, et une mesure pour chacune :

   ① répond-elle à une PAGE WEB, sans clé (CORS) ? Seul un vrai
     navigateur en juge : tout part de la page, comme dans l'app ;
   ② sur un échantillon RÉEL d'entreprises qu'un étudiant regarderait
     (le numérique, 10 à 499 salariés et quelques grands, Nord et Rhône),
     CHEZ COMBIEN dit-elle quelque chose — et quoi, mot pour mot ?

   Une source qui répond pour 2 entreprises sur 40 ne mérite pas une
   rangée de la carte ; une qui répond pour 35 la mérite. C'est ce
   chiffre-là que la conception lira, pas une documentation.

   Sources relevées :
   · l'annuaire des entreprises : finances (chiffre d'affaires, résultat),
     compléments (labels, conventions), établissements, dirigeants ;
   · Wikidata (par le SIREN, P1616) : logo, site, page LinkedIn, effectif
     exact et sa date, fondation, maison mère, secteur, description,
     article Wikipédia — et TOUTES les propriétés présentes, pour voir ce
     qu'on n'aurait pas pensé à demander ;
   · Wikipédia (résumé de l'article) ;
   · le BODACC (annonces légales) : ce qui s'est passé, par famille ;
   · OpenStreetMap (Overpass) : téléphone, courriel, site au siège ;
   · data.gouv (API tabulaire) : l'index de l'égalité professionnelle.

   INFORMATIVE : elle relève, elle ne fait pas rougir la CI. Sans réseau,
   elle se tait au lieu d'accuser.
   ============================================================ */
import http from 'http';
import { chromium, chromiumPath } from './outils.mjs';

const AN = 'https://recherche-entreprises.api.gouv.fr';
const NUM = 'activite_principale=62.01Z,62.02A,62.03Z,62.09Z,63.11Z,58.29C';
const ECHANTILLON = [
  ['Nord · 10-499', `${AN}/search?${NUM}&departement=59&etat_administratif=A&est_entrepreneur_individuel=false&tranche_effectif_salarie=11,12,21,22,31,32&per_page=20`],
  ['Rhône · 10-499', `${AN}/search?${NUM}&departement=69&etat_administratif=A&est_entrepreneur_individuel=false&tranche_effectif_salarie=11,12,21,22,31,32&per_page=12`],
  ['Nord · grands', `${AN}/search?${NUM}&departement=59&etat_administratif=A&est_entrepreneur_individuel=false&tranche_effectif_salarie=41,42,51,52,53&per_page=8`],
  ['cyber · Nord', `${AN}/search?q=cyber&activite_principale=62.02A,62.09Z,62.01Z&departement=59&etat_administratif=A&est_entrepreneur_individuel=false&per_page=6`],
];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>sonde</title>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);

/* tout appel part de la PAGE : c'est la règle CORS qu'on mesure */
const appeler = (url, o = {}) => page.evaluate(async ([u, o]) => {
  const t0 = performance.now();
  try {
    const res = await fetch(u, { method: o.post ? 'POST' : 'GET', body: o.post || undefined,
      headers: o.post ? { 'content-type': 'application/x-www-form-urlencoded' } : { accept: o.accept || 'application/json' },
      signal: AbortSignal.timeout(o.ms || 20000) });
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { ok: res.ok, statut: res.status, ms: Math.round(performance.now() - t0), json, debut: txt.slice(0, 200) };
  } catch (e){ return { ok: false, statut: 0, erreur: String(e && e.message || e), ms: Math.round(performance.now() - t0) }; }
}, [url, o]);
const pause = ms => new Promise(ok => setTimeout(ok, ms));
const pct = (n, d) => d ? Math.round(100 * n / d) + ' %' : '—';
const ligne = (nom, r) => console.log(`${r.ok ? '✓' : r.statut ? '·' : '✗'} ${nom} — ${r.statut || r.erreur} · ${r.ms} ms`);

/* ---------- 0. l'échantillon, tiré de l'annuaire ---------- */
console.log('0. L’ÉCHANTILLON (annuaire, depuis la page)\n');
const ents = new Map();
for (const [nom, url] of ECHANTILLON){
  let r = await appeler(url);
  if (r.statut === 429){ await pause(2500); r = await appeler(url); }
  ligne(nom, r);
  for (const x of (r.json && r.json.results) || []) if (!ents.has(x.siren)) ents.set(x.siren, x);
  await pause(1200);
}
const liste = [...ents.values()];
const N = liste.length;
console.log(`→ ${N} entreprises\n`);
if (!N){
  console.log('Rien de mesurable : l’annuaire n’a rien rendu. Aucune conclusion.');
  await browser.close(); server.close(); process.exit(0);
}

/* ---------- 1. l'annuaire : ce qu'il sait déjà et qu'on ne montre pas ---------- */
console.log('1. ANNUAIRE — ce que la réponse porte déjà\n');
{
  const a = f => liste.filter(f).length;
  const fin = liste.filter(x => x.finances && Object.keys(x.finances).length);
  const annees = new Map();
  for (const x of fin) for (const y of Object.keys(x.finances)) annees.set(y, (annees.get(y) || 0) + 1);
  console.log(`finances (CA, résultat) : ${fin.length}/${N} (${pct(fin.length, N)}) · années ${[...annees].sort().map(([y, n]) => y + ':' + n).join(' ')}`);
  const deux = fin.filter(x => Object.keys(x.finances).length >= 2);
  console.log(`  deux années ou plus (une tendance) : ${deux.length}/${N}`);
  for (const x of fin.slice(0, 6)) console.log(`  · ${x.nom_raison_sociale} : ${JSON.stringify(x.finances)}`);
  const cles = new Map();
  for (const x of liste) for (const [k, v] of Object.entries(x.complements || {}))
    if (v === true || (Array.isArray(v) && v.length)) cles.set(k, (cles.get(k) || 0) + 1);
  console.log('compléments vrais ou remplis :', [...cles].sort((p, q) => q[1] - p[1]).map(([k, n]) => `${k}:${n}`).join(' '));
  const idcc = new Map();
  for (const x of liste) for (const c of (x.complements && x.complements.liste_idcc) || []) idcc.set(c, (idcc.get(c) || 0) + 1);
  console.log('conventions :', [...idcc].sort((p, q) => q[1] - p[1]).slice(0, 8).map(([k, n]) => `${k}:${n}`).join(' '));
  console.log(`dirigeants personnes : ${a(x => (x.dirigeants || []).some(d => d.type_dirigeant === 'personne physique'))}/${N} · plus d'un établissement : ${a(x => x.nombre_etablissements_ouverts > 1)}/${N}`);
  console.log(`enseigne au siège : ${a(x => x.siege && (x.siege.liste_enseignes || []).length)}/${N} · année de la tranche : ${[...new Set(liste.map(x => x.annee_tranche_effectif_salarie))].join(',')}`);
  console.log('clés de premier niveau :', Object.keys(liste[0]).join(', '));
  console.log('clés du siège :', Object.keys(liste[0].siege || {}).join(', '));
  console.log('clés des compléments :', Object.keys(liste[0].complements || {}).join(', '));
}

/* ---------- 2. Wikidata, par le SIREN ---------- */
console.log('\n2. WIKIDATA — par le SIREN (P1616)\n');
const wd = new Map();      /* siren → { item, ... } */
{
  const valeurs = liste.map(x => `"${x.siren}"`).join(' ');
  const q = `SELECT ?siren ?e ?eLabel ?desc ?site ?logo ?image ?li ?emp ?empDate ?fond ?mere ?mereLabel ?secteurLabel ?article WHERE {
    VALUES ?siren { ${valeurs} } ?e wdt:P1616 ?siren .
    OPTIONAL { ?e schema:description ?desc FILTER(LANG(?desc) = "fr") }
    OPTIONAL { ?e wdt:P856 ?site } OPTIONAL { ?e wdt:P154 ?logo } OPTIONAL { ?e wdt:P18 ?image }
    OPTIONAL { ?e wdt:P4264 ?li }
    OPTIONAL { ?e p:P1128 ?st . ?st ps:P1128 ?emp . OPTIONAL { ?st pq:P585 ?empDate } }
    OPTIONAL { ?e wdt:P571 ?fond } OPTIONAL { ?e wdt:P749 ?mere } OPTIONAL { ?e wdt:P452 ?secteur }
    OPTIONAL { ?article schema:about ?e ; schema:isPartOf <https://fr.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`;
  const r = await appeler('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { accept: 'application/sparql-results+json' });
  ligne('Wikidata · SPARQL par SIREN', r);
  for (const b of (r.json && r.json.results && r.json.results.bindings) || []){
    const s = b.siren.value;
    const e = wd.get(s) || { item: b.e.value, nom: b.eLabel && b.eLabel.value };
    for (const k of ['desc', 'site', 'logo', 'image', 'li', 'emp', 'empDate', 'fond', 'mereLabel', 'secteurLabel', 'article'])
      if (b[k] && !e[k]) e[k] = b[k].value;
    wd.set(s, e);
  }
  const c = k => [...wd.values()].filter(e => e[k]).length;
  console.log(`connues de Wikidata : ${wd.size}/${N} (${pct(wd.size, N)})`);
  for (const k of ['desc', 'site', 'logo', 'image', 'li', 'emp', 'fond', 'mereLabel', 'secteurLabel', 'article'])
    console.log(`  ${k} : ${c(k)}/${N}`);
  for (const [s, e] of [...wd].slice(0, 8)) console.log(`  · ${s} ${e.nom} : ${JSON.stringify(e).slice(0, 420)}`);
  /* toutes les propriétés présentes sur ces fiches : ce qu'on n'aurait
     pas pensé à demander (identifiants d'autres sites, par exemple) */
  if (wd.size){
    const items = [...wd.values()].map(e => 'wd:' + e.item.split('/').pop()).join(' ');
    const q2 = `SELECT ?p ?pLabel (COUNT(DISTINCT ?e) AS ?n) WHERE { VALUES ?e { ${items} } ?e ?d ?v .
      ?p wikibase:directClaim ?d . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }
      GROUP BY ?p ?pLabel ORDER BY DESC(?n) LIMIT 60`;
    await pause(400);
    const r2 = await appeler('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q2), { accept: 'application/sparql-results+json' });
    ligne('Wikidata · propriétés présentes', r2);
    console.log('  ', ((r2.json && r2.json.results && r2.json.results.bindings) || [])
      .map(b => `${b.p.value.split('/').pop()} ${b.pLabel.value}:${b.n.value}`).join(' | '));
  }
}

/* ---------- 3. Wikipédia : le résumé de l'article ---------- */
console.log('\n3. WIKIPÉDIA — le résumé (REST)\n');
{
  const avec = [...wd.values()].filter(e => e.article).slice(0, 8);
  let ok = 0;
  for (const e of avec){
    const titre = decodeURIComponent(e.article.split('/wiki/').pop());
    const r = await appeler('https://fr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titre));
    if (r.ok) ok++;
    ligne('résumé · ' + titre, r);
    if (r.json) console.log(`   extrait (${(r.json.extract || '').length} car.) : ${(r.json.extract || '').slice(0, 260)} · vignette ${r.json.thumbnail ? 'oui' : 'non'}`);
  }
  console.log(`→ ${ok}/${avec.length} résumés lus · ${avec.length}/${N} entreprises ont un article`);
}

/* ---------- 4. le BODACC : ce qui s'est passé ---------- */
console.log('\n4. BODACC — les annonces, par famille\n');
{
  const familles = new Map();
  let avec = 0, collectives = 0, ms = 0, vus = 0;
  const recents = [];
  for (const x of liste.slice(0, 24)){
    const where = encodeURIComponent(`registre like "${x.siren}"`);
    const r = await appeler(`https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=${where}&order_by=dateparution%20desc&limit=5`);
    vus++; ms += r.ms || 0;
    if (!r.ok){ ligne('BODACC · ' + x.siren, r); continue; }
    const res = r.json.results || [];
    if (res.length) avec++;
    for (const a of res){
      familles.set(a.familleavis_lib, (familles.get(a.familleavis_lib) || 0) + 1);
      if (a.familleavis === 'collective') collectives++;
    }
    if (res[0]) recents.push(`${x.nom_raison_sociale} : ${res[0].dateparution} ${res[0].familleavis_lib} — ${String(res[0].modificationsgenerales || res[0].acte || res[0].depot || '').slice(0, 140)}`);
    await pause(150);
  }
  console.log(`avec au moins une annonce : ${avec}/${vus} · temps moyen ${Math.round(ms / (vus || 1))} ms · procédures collectives : ${collectives}`);
  console.log('familles :', [...familles].map(([k, n]) => `${k}:${n}`).join(' | '));
  for (const t of recents.slice(0, 8)) console.log('  ·', t);
}

/* ---------- 5. OpenStreetMap : téléphone, courriel, site au siège ---------- */
console.log('\n5. OPENSTREETMAP (Overpass) — au siège, par le nom\n');
{
  let avec = 0, vus = 0;
  const tags = new Map();
  for (const x of liste.slice(0, 12)){
    const la = Number(x.siege && x.siege.latitude), lo = Number(x.siege && x.siege.longitude);
    if (!Number.isFinite(la)) continue;
    const mot = String(x.nom_raison_sociale || x.nom_complet || '').split(/\s+/)[0].replace(/["\\]/g, '');
    if (mot.length < 3) continue;
    const q = `[out:json][timeout:15];nwr["name"~"${mot}",i](around:250,${la},${lo});out tags 3;`;
    const r = await appeler('https://overpass-api.de/api/interpreter', { post: 'data=' + encodeURIComponent(q), ms: 20000 });
    vus++;
    const els = (r.json && r.json.elements) || [];
    if (els.length) avec++;
    for (const el of els) for (const k of Object.keys(el.tags || {})) if (/phone|email|website|contact|opening/.test(k)) tags.set(k, (tags.get(k) || 0) + 1);
    console.log(`${r.ok ? '✓' : '·'} ${x.nom_raison_sociale} — ${r.statut || r.erreur} · ${r.ms} ms · ${els.length} objet(s) ${els.map(e => JSON.stringify(e.tags).slice(0, 160)).join(' ')}`);
    await pause(1100);
  }
  console.log(`→ trouvées au siège : ${avec}/${vus} · étiquettes utiles : ${[...tags].map(([k, n]) => k + ':' + n).join(' ')}`);
}

/* ---------- 6. data.gouv : l'index de l'égalité professionnelle ---------- */
console.log('\n6. DATA.GOUV — l’index de l’égalité professionnelle (API tabulaire)\n');
{
  const cat = await appeler('https://www.data.gouv.fr/api/1/datasets/?q=index%20egalite%20professionnelle%20femmes%20hommes&page_size=4');
  ligne('data.gouv · catalogue', cat);
  const ressources = [];
  for (const d of (cat.json && cat.json.data) || []){
    console.log(`   · ${d.title} — ${d.organization && d.organization.name}`);
    for (const x of d.resources || []) if (/csv|xlsx/i.test(x.format || '')) ressources.push([d.title, x.id, x.title]);
  }
  for (const [t, id, nom] of ressources.slice(0, 3)){
    const r = await appeler(`https://tabular-api.data.gouv.fr/api/resources/${id}/data/?page_size=2`);
    ligne(`tabulaire · ${nom}`, r);
    if (r.json && r.json.data) console.log('   colonnes :', Object.keys(r.json.data[0] || {}).join(', ').slice(0, 600));
    const col = r.json && r.json.data && Object.keys(r.json.data[0] || {}).find(k => /siren/i.test(k));
    if (col){
      let avec = 0;
      for (const x of liste.slice(0, 20)){
        const q = await appeler(`https://tabular-api.data.gouv.fr/api/resources/${id}/data/?${encodeURIComponent(col)}__exact=${x.siren}&page_size=3`);
        if (q.json && q.json.data && q.json.data.length){
          avec++;
          if (avec <= 4) console.log(`   · ${x.nom_raison_sociale} : ${JSON.stringify(q.json.data[0]).slice(0, 300)}`);
        }
      }
      console.log(`   → ${avec}/20 entreprises de l'échantillon présentes`);
    }
  }
}

const temoin = await page.evaluate(async () => {
  try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; } catch (e) { return 'coupé'; }
});
console.log(`\nBILAN : ${N} entreprises · Wikidata ${wd.size} · réseau ${temoin}`);
await browser.close();
server.close();

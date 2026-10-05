/* ============================================================
   OpenContact — sonde des sources CANDIDATES (docs/sources.md)

   Avant d'ajouter une source à la recherche, deux questions, et une
   mesure pour chacune — jamais la mémoire de quelqu'un :

   ① Répond-elle à une page web, sans clé ni compte ? C'est la seule
     façon pour l'app d'appeler sans serveur OpenContact (§10). Le
     navigateur en juge (CORS), pas `curl` : la partie A ouvre une vraie
     page sur une vraie origine dans un vrai Chromium, et appelle comme
     l'app le ferait.
   ② Que sait-elle vraiment ? La partie B lit, CÔTÉ SERVEUR, la
     documentation machine de chaque API (OpenAPI) et cherche les listes
     publiques annoncées : on écrit le moteur d'après ce relevé.

   INFORMATIVE comme `sonde-annuaire.mjs` : elle relève, elle ne fait pas
   rougir la CI. Sans réseau, elle se tait au lieu d'accuser.
   ============================================================ */
import http from 'http';
import { chromium, chromiumPath } from './outils.mjs';

const LILLE = { lat: 50.6292, lon: 3.0573 };
const enc = encodeURIComponent;
const OVERPASS_Q = `[out:json][timeout:20];nwr["office"="it"](around:3000,${LILLE.lat},${LILLE.lon});out center 5;`;
const SPARQL = `SELECT ?e ?li ?site ?emp ?wttj WHERE { ?e wdt:P1616 "380129866" .
  OPTIONAL { ?e wdt:P4264 ?li } OPTIONAL { ?e wdt:P856 ?site } OPTIONAL { ?e wdt:P1128 ?emp } } LIMIT 3`;

/* ---------- A. ce qu'un NAVIGATEUR peut appeler ---------- */
const NAVIGATEUR = [
  ['LBA v1 · entreprises + offres (caller)', `https://labonnealternance.apprentissage.beta.gouv.fr/api/v1/jobs?romes=M1805,M1810&latitude=${LILLE.lat}&longitude=${LILLE.lon}&radius=30&caller=opencontact`],
  ['LBA v1 · jobsEtFormations (caller)', `https://labonnealternance.apprentissage.beta.gouv.fr/api/V1/jobsEtFormations?romes=M1805&latitude=${LILLE.lat}&longitude=${LILLE.lon}&radius=30&caller=opencontact`],
  ['LBA v1 · métiers par mot', 'https://labonnealternance.apprentissage.beta.gouv.fr/api/v1/metiers/all'],
  ['LBA v1 · rome par titre', 'https://labonnealternance.apprentissage.beta.gouv.fr/api/v1/metiers?title=cybersecurite'],
  ['LBA v3 · jobs/search', `https://labonnealternance.apprentissage.beta.gouv.fr/api/v3/jobs/search?latitude=${LILLE.lat}&longitude=${LILLE.lon}&radius=30&romes=M1805`],
  ['API apprentissage · job/v1/search', `https://api.apprentissage.beta.gouv.fr/api/job/v1/search?latitude=${LILLE.lat}&longitude=${LILLE.lon}&radius=30&romes=M1805`],
  ['BODACC · annonces par SIREN', 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?q=326820065&limit=2'],
  ['Overpass · overpass-api.de', `https://overpass-api.de/api/interpreter?data=${enc(OVERPASS_Q)}`],
  ['Overpass · kumi.systems', `https://overpass.kumi.systems/api/interpreter?data=${enc(OVERPASS_Q)}`],
  ['Overpass · private.coffee', `https://overpass.private.coffee/api/interpreter?data=${enc(OVERPASS_Q)}`],
  ['Géoplateforme · géocodage', 'https://data.geopf.fr/geocodage/search?q=12%20rue%20nationale%2059000%20lille&limit=1'],
  ['API Adresse (ancienne)', 'https://api-adresse.data.gouv.fr/search/?q=12%20rue%20nationale%2059000%20lille&limit=1'],
  ['Annuaire · filtre ESS', 'https://recherche-entreprises.api.gouv.fr/search?q=informatique&est_ess=true&departement=59&per_page=2'],
  ['Annuaire · filtre organisme de formation', 'https://recherche-entreprises.api.gouv.fr/search?q=informatique&est_organisme_formation=true&departement=59&per_page=2'],
  ['Annuaire · minimal + include', 'https://recherche-entreprises.api.gouv.fr/search?q=sopra%20steria&minimal=true&include=complements,siege&per_page=1'],
  ['Wikidata · LinkedIn + site + effectif', 'https://query.wikidata.org/sparql?format=json&query=' + enc(SPARQL)],
  ['data.gouv · API (catalogue)', 'https://www.data.gouv.fr/api/1/datasets/?q=prestataires%20qualifi%C3%A9s%20ANSSI&page_size=3']
];

/* ---------- B. ce que chaque API DIT savoir (côté serveur) ---------- */
const DOCUMENTATION = [
  ['Annuaire · OpenAPI', 'https://recherche-entreprises.api.gouv.fr/openapi.json'],
  ['LBA · OpenAPI', 'https://labonnealternance.apprentissage.beta.gouv.fr/api/docs/json'],
  ['API apprentissage · OpenAPI', 'https://api.apprentissage.beta.gouv.fr/api/doc/openapi.json'],
  ['BODACC · champs', 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales'],
];
const LISTES = [
  ['data.gouv · ANSSI', 'https://www.data.gouv.fr/api/1/datasets/?q=ANSSI%20qualifi%C3%A9s&page_size=5'],
  ['data.gouv · apprentis par entreprise', 'https://www.data.gouv.fr/api/1/datasets/?q=entreprises%20apprentis%20contrats&page_size=5'],
  ['data.gouv · offres alternance', 'https://www.data.gouv.fr/api/1/datasets/?q=offres%20alternance&page_size=5'],
  ['cyber.gouv.fr · prestataires qualifiés', 'https://cyber.gouv.fr/produits-services-qualifies'],
  ['cyber.gouv.fr · PASSI', 'https://cyber.gouv.fr/prestataires-daudit-de-la-securite-des-systemes-dinformation-passi'],
];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>sonde</title>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);

const forme = (v, n = 0) => {
  if (n > 3) return '…';
  if (Array.isArray(v)) return v.length ? [forme(v[0], n + 1)] : [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).slice(0, 40).map(k => [k, forme(v[k], n + 1)]));
  return typeof v;
};
console.log('A. NAVIGATEUR (CORS, sans clé)\n');
let acceptes = 0;
for (const [nom, url] of NAVIGATEUR){
  const r = await page.evaluate(async u => {
    const t0 = performance.now();
    try {
      const res = await fetch(u, { headers: { accept: 'application/json' } });
      const txt = await res.text();
      let json = null; try { json = JSON.parse(txt); } catch (e) {}
      return { ok: res.ok, statut: res.status, ms: Math.round(performance.now() - t0), json, debut: txt.slice(0, 160) };
    } catch (e){ return { ok: false, statut: 0, erreur: String(e && e.message || e) }; }
  }, url);
  if (r.statut) acceptes++;
  console.log(`${r.ok ? '✓' : r.statut ? '·' : '✗'} ${nom} — ${r.statut || r.erreur}${r.ms ? ' · ' + r.ms + ' ms' : ''}`);
  if (r.json) console.log('   forme :', JSON.stringify(forme(r.json)).slice(0, 900));
  else if (r.debut) console.log('   début :', r.debut.replace(/\s+/g, ' '));
}

/* côté serveur : pas de CORS ici, c'est de la LECTURE de documentation */
const lire = async (u, o = {}) => {
  try {
    const res = await fetch(u, { headers: { accept: o.html ? 'text/html' : 'application/json', 'user-agent': 'opencontact-sonde/1 (+github)' } });
    const txt = await res.text();
    return { statut: res.status, txt };
  } catch (e){ return { statut: 0, txt: String(e && e.message || e) }; }
};
console.log('\nB. DOCUMENTATION (côté serveur)\n');
for (const [nom, url] of DOCUMENTATION){
  const r = await lire(url);
  console.log(`— ${nom} : ${r.statut}`);
  let j = null; try { j = JSON.parse(r.txt); } catch (e) {}
  if (j && j.paths){
    for (const [chemin, ops] of Object.entries(j.paths)){
      for (const [verbe, op] of Object.entries(ops)){
        if (!op || typeof op !== 'object') continue;
        const params = (op.parameters || []).map(p => p.name || (p.$ref || '').split('/').pop()).filter(Boolean);
        const secu = op.security ? JSON.stringify(op.security) : (j.security ? 'global:' + JSON.stringify(j.security) : 'aucune');
        console.log(`   ${verbe.toUpperCase()} ${chemin} · sécurité ${secu.slice(0, 80)}${params.length ? ' · ' + params.join(', ').slice(0, 400) : ''}`);
      }
    }
  } else if (j && j.fields){
    console.log('   champs :', j.fields.map(f => f.name).join(', ').slice(0, 900));
  } else console.log('   ', r.txt.slice(0, 300).replace(/\s+/g, ' '));
}
console.log('\nC. LISTES PUBLIQUES ANNONCÉES\n');
for (const [nom, url] of LISTES){
  const r = await lire(url, { html: !url.includes('/api/') });
  console.log(`— ${nom} : ${r.statut}`);
  let j = null; try { j = JSON.parse(r.txt); } catch (e) {}
  if (j && Array.isArray(j.data)){
    for (const d of j.data) console.log(`   · ${d.title} — ${d.organization && d.organization.name} — ${(d.resources || []).map(x => x.format).join('/')} — ${d.page}`);
  } else {
    const liens = [...new Set((r.txt.match(/href="[^"]+\.(?:csv|json|xlsx|xls|ods|pdf)[^"]*"/gi) || []))].slice(0, 12);
    console.log('   fichiers :', liens.join(' ') || 'aucun');
    const t = r.txt.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const i = t.search(/PASSI|qualifi/i);
    if (i >= 0) console.log('   extrait :', t.slice(Math.max(0, i - 200), i + 600));
  }
}
/* D. Le BRUIT de « À découvrir » : un étudiant cherche une entreprise
   qui peut l'ACCUEILLIR. Combien de ce que l'annuaire rend aujourd'hui
   sont des indépendants sans salarié ? Et dans quel ordre l'annuaire
   rend-il une question sans texte — l'app le montre tel quel. */
console.log('\nD. LE BRUIT DE L’ANNUAIRE (côté serveur)\n');
const NUM = 'activite_principale=62.01Z,62.02A,62.03Z,62.09Z,63.11Z,58.29C';
const AN = 'https://recherche-entreprises.api.gouv.fr';
const BRUIT = [
  ['numérique · Nord · tel quel', `${AN}/search?${NUM}&departement=59&etat_administratif=A&per_page=25`],
  ['numérique · Nord · sans entrepreneur individuel', `${AN}/search?${NUM}&departement=59&etat_administratif=A&est_entrepreneur_individuel=false&per_page=25`],
  ['numérique · Nord · avec salariés', `${AN}/search?${NUM}&departement=59&etat_administratif=A&tranche_effectif_salarie=01,02,03,11,12,21,22,31,32,41,42,51,52,53&per_page=25`],
  ['cyber · Nord · tel quel', `${AN}/search?q=cyber&activite_principale=62.02A,62.09Z,62.01Z&departement=59&etat_administratif=A&per_page=25`],
  ['numérique · autour de Lille 10 km', `${AN}/near_point?lat=50.6292&long=3.0573&radius=10&${NUM}&per_page=25`],
];
for (const [nom, url] of BRUIT){
  const r = await lire(url);
  let j = null; try { j = JSON.parse(r.txt); } catch (e) {}
  if (!j || !Array.isArray(j.results)){ console.log(`— ${nom} : ${r.statut} ${r.txt.slice(0, 160)}`); continue; }
  const compte = f => { const m = new Map(); for (const x of j.results){ const k = String(f(x)); m.set(k, (m.get(k) || 0) + 1); } return [...m].map(([k, n]) => `${k}:${n}`).join(' '); };
  console.log(`— ${nom} : ${r.statut} · total ${j.total_results}`);
  console.log('   tranche :', compte(x => x.tranche_effectif_salarie));
  console.log('   nature juridique :', compte(x => x.nature_juridique));
  console.log('   entrepreneur individuel :', compte(x => x.complements && x.complements.est_entrepreneur_individuel));
  console.log('   convention collective :', compte(x => ((x.complements && x.complements.liste_idcc) || []).join('+') || '—'));
  console.log('   ordre :', j.results.slice(0, 10).map(x => `${x.nom_raison_sociale || x.nom_complet} [${x.tranche_effectif_salarie || '∅'} ${String(x.date_creation || '').slice(0, 4)} ${x.nombre_etablissements_ouverts ?? '?'}ét]`).join(' | ').slice(0, 1200));
  await new Promise(ok => setTimeout(ok, 400));      /* l'annuaire limite le débit */
}
const temoin = await page.evaluate(async () => {
  try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; } catch (e) { return 'coupé'; }
});
console.log(`\nBILAN : ${acceptes}/${NAVIGATEUR.length} sources ont répondu au navigateur · réseau ${temoin}`);
if (temoin === 'coupé' && !acceptes) console.log('Rien de mesurable ici : pas de réseau sortant. Aucune conclusion.');
await browser.close();
server.close();

/* ============================================================
   OpenContact — sonde des sources ouvertes de « À découvrir »
   (docs/recherche.md, lot 2 : « précédé de la preuve que l'annuaire
   répond à un navigateur »)

   La barre de recherche va interroger, DEPUIS LE NAVIGATEUR, trois
   services publics, sans clé ni compte :
   · l'API Recherche d'entreprises (data.gouv.fr) ;
   · le service des communes (geo.api.gouv.fr) ;
   · Wikidata (le site web officiel d'une entreprise, par son SIREN).

   Aucun serveur OpenContact ne peut faire l'intermédiaire (§10). Il faut
   donc que CHACUN réponde à une page d'une autre origine — c'est CORS,
   et c'est le navigateur qui en juge, pas `curl`. La sonde ouvre une
   vraie page sur une vraie origine (127.0.0.1) dans un vrai Chromium, et
   y fait les appels exactement comme l'app les fera. Un `fetch` refusé
   par CORS lève une erreur ; un `fetch` accepté rend le JSON.

   Elle relève aussi ce que l'app devra savoir lire : les paramètres que
   l'annuaire accepte vraiment (code d'activité, département, rayon…) et
   la FORME exacte d'un résultat. Le moteur est écrit d'après ce relevé,
   pas d'après la mémoire de quelqu'un.

   INFORMATIVE : elle parle au monde réel, elle relève, elle ne fait pas
   rougir la CI (un service public qui tousse un lundi matin n'est pas un
   défaut de l'app). Elle refuse en revanche de conclure quand elle n'a
   rien pu mesurer — sans réseau, tout échouerait pareil et le rapport
   accuserait trois services en bonne santé (la leçon de
   `sonde-relais-publics.mjs`).
   ============================================================ */
import http from 'http';
import { chromium, chromiumPath } from './outils.mjs';

const ANNUAIRE = 'https://recherche-entreprises.api.gouv.fr';
const APPELS = [
  ['annuaire · texte', `${ANNUAIRE}/search?q=sopra%20steria&per_page=2`],
  ['annuaire · activité + département', `${ANNUAIRE}/search?activite_principale=62.01Z,62.02A&departement=59&per_page=3`],
  ['annuaire · texte + activité + code postal', `${ANNUAIRE}/search?q=cyber&activite_principale=62.02A,62.09Z&code_postal=69002&per_page=3`],
  ['annuaire · région', `${ANNUAIRE}/search?activite_principale=62.01Z&region=32&per_page=3`],
  ['annuaire · section d’activité', `${ANNUAIRE}/search?q=informatique&section_activite_principale=J&departement=31&per_page=3`],
  ['annuaire · catégorie', `${ANNUAIRE}/search?activite_principale=62.02A&categorie_entreprise=GE&per_page=3`],
  ['annuaire · tranche d’effectif', `${ANNUAIRE}/search?activite_principale=62.01Z&departement=59&tranche_effectif_salarie=11,12&per_page=3`],
  ['annuaire · en activité', `${ANNUAIRE}/search?activite_principale=62.01Z&departement=59&etat_administratif=A&per_page=3`],
  ['annuaire · autour d’un point', `${ANNUAIRE}/near_point?lat=50.6292&long=3.0573&radius=5&activite_principale=62.01Z&per_page=3`],
  ['annuaire · rayon trop grand', `${ANNUAIRE}/near_point?lat=50.6292&long=3.0573&radius=80&per_page=1`],
  ['communes · par nom', 'https://geo.api.gouv.fr/communes?nom=villeneuve%20d%20ascq&fields=nom,code,codesPostaux,codeDepartement,codeRegion,centre&boost=population&limit=3'],
  ['communes · par code postal', 'https://geo.api.gouv.fr/communes?codePostal=59000&fields=nom,code,centre&limit=3'],
  ['wikidata · SIREN → site', 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(
    'SELECT ?e ?site WHERE { ?e wdt:P1616 "380129866" . OPTIONAL { ?e wdt:P856 ?site } } LIMIT 3')],
  ['wikidata · recherche par SIREN', 'https://www.wikidata.org/w/api.php?action=query&list=search&format=json&origin=*&srsearch=haswbstatement:P1616=380129866']
];

/* la page qui appelle : une vraie origine, comme l'app installée */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>sonde</title>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origine = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.goto(origine + '/');

const forme = v => {
  if (Array.isArray(v)) return v.length ? [forme(v[0])] : [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).slice(0, 60).map(k => [k, forme(v[k])]));
  return typeof v;
};
const rapport = [];
for (const [nom, url] of APPELS){
  const r = await page.evaluate(async u => {
    const t0 = performance.now();
    try {
      const res = await fetch(u, { headers: { accept: 'application/json' } });
      const txt = await res.text();
      let json = null;
      try { json = JSON.parse(txt); } catch (e) {}
      return { ok: res.ok, statut: res.status, ms: Math.round(performance.now() - t0),
               json, debut: json ? '' : txt.slice(0, 200) };
    } catch (e) {
      /* CORS refusé ou réseau coupé : le navigateur ne dit PAS lequel —
         c'est la même TypeError, exprès. La sonde-témoin plus bas
         départage. */
      return { ok: false, statut: 0, erreur: String(e && e.message || e), ms: Math.round(performance.now() - t0) };
    }
  }, url);
  const total = r.json && (r.json.total_results ?? (r.json.results && r.json.results.bindings && r.json.results.bindings.length)
    ?? (Array.isArray(r.json) ? r.json.length : r.json.query && r.json.query.search && r.json.query.search.length));
  rapport.push({ nom, ...r, total });
  console.log(`${r.ok ? '✓' : '✗'} ${nom} — ${r.statut || r.erreur} · ${r.ms} ms${total != null ? ' · ' + total + ' résultat(s)' : ''}`
    + (r.debut ? ' · « ' + r.debut.replace(/\s+/g, ' ') + ' »' : ''));
}
/* la forme d'un résultat de l'annuaire, et un exemple réel — c'est
   d'après ce relevé que `engine/annuaire.js` lit les réponses */
const premier = rapport.find(x => x.ok && x.json && Array.isArray(x.json.results) && x.json.results.length);
if (premier){
  console.log('\nFORME d’un résultat (annuaire) :');
  console.log(JSON.stringify(forme(premier.json.results[0]), null, 1).slice(0, 6000));
  console.log('\nEXEMPLE (annuaire · ' + premier.nom + ') :');
  console.log(JSON.stringify(premier.json.results[0], null, 1).slice(0, 5000));
  const proche = rapport.find(x => x.nom.includes('autour') && x.ok && x.json && x.json.results && x.json.results.length);
  if (proche){
    console.log('\nEXEMPLE (annuaire · autour d’un point) :');
    console.log(JSON.stringify(proche.json.results[0], null, 1).slice(0, 4000));
  }
}
const communes = rapport.find(x => x.nom === 'communes · par nom' && x.ok);
if (communes) console.log('\nEXEMPLE (communes) :', JSON.stringify(communes.json).slice(0, 800));
const wd = rapport.filter(x => x.nom.startsWith('wikidata') && x.ok);
for (const w of wd) console.log(`\nEXEMPLE (${w.nom}) :`, JSON.stringify(w.json).slice(0, 800));

/* LE TÉMOIN. Une page qui n'a AUCUN accès CORS par construction : si
   elle aussi échoue de la même façon que tout le reste, ce n'est pas
   CORS qu'on mesure, c'est le réseau — et la sonde se tait au lieu
   d'accuser trois services. */
const temoin = await page.evaluate(async () => {
  try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; }
  catch (e) { return 'coupé'; }
});
const ok = rapport.filter(x => x.ok).length;
console.log(`\nBILAN : ${ok}/${rapport.length} appels acceptés par le navigateur · réseau ${temoin}`);
if (temoin === 'coupé' && !ok) console.log('Rien de mesurable ici : pas de réseau sortant. Aucune conclusion sur CORS.');
else {
  const parSource = s => rapport.filter(x => x.nom.startsWith(s));
  for (const s of ['annuaire', 'communes', 'wikidata']){
    const l = parSource(s);
    const acc = l.filter(x => x.ok).length;
    console.log(`CORS ${s} : ${acc ? 'ACCEPTÉ' : 'REFUSÉ ou injoignable'} (${acc}/${l.length})`);
  }
}
await browser.close();
server.close();

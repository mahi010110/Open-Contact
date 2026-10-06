/* ============================================================
   OpenContact — sonde : DES INFORMATIONS UTILES, MÊLÉES

   Retour du mainteneur, 6 octobre 2026 : « ce qu'il manque, c'est de
   l'utilité — des informations intéressantes et utiles. Mixer les
   sources et pouvoir afficher les infos importantes. » Avant de
   concevoir, on MESURE ce qu'une page vierge peut lire, sans clé ni
   compte (§0, question ②), sur de vraies entreprises du numérique :

   ① l'annuaire : les comptes (chiffre d'affaires, résultat, sur
     plusieurs années — une tendance ?) et les « compléments » (ESS,
     société à mission, service public, index égalité déclaré,
     organisme de formation, convention collective) ;
   ② le BODACC : au-delà des procédures collectives, les annonces qui
     disent quelque chose de VIVANT — un établissement ouvert, un
     dirigeant qui change, une fusion, une augmentation de capital ;
   ③ Wikidata élargi : effectif exact, date de création, maison mère,
     secteur, produits, chiffre d'affaires ;
   ④ la commande publique (DECP, data.gouv) : les marchés qu'elle a
     gagnés, et AUPRÈS DE QUI — ses clients publics ;
   ⑤ l'index de l'égalité femmes-hommes (Egapro) ;
   ⑥ data.gouv : ce qui existe sur l'apprentissage par entreprise.

   INFORMATIVE : elle relève, elle ne fait pas rougir la CI.
   ============================================================ */
import http from 'http';
import { chromium, chromiumPath } from './outils.mjs';

/* UNE PAGE VIERGE, SANS LA CSP DE L'APP (leçon du 6/10, docs/utile.md) */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>sonde</title>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);

const pause = ms => new Promise(ok => setTimeout(ok, ms));
const depuisPage = (url, o = {}) => page.evaluate(async ([u, o]) => {
  const t0 = performance.now();
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), o.ms || 20000);
    const res = await fetch(u, { headers: o.headers || { accept: 'application/json' }, signal: ctl.signal });
    clearTimeout(t);
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { ok: res.ok, statut: res.status, ms: Math.round(performance.now() - t0), json, debut: txt.slice(0, 400) };
  } catch (e){ return { ok: false, statut: 0, erreur: String(e && e.message || e), ms: Math.round(performance.now() - t0) }; }
}, [url, o]);
const court = (x, n = 300) => JSON.stringify(x).slice(0, n);

/* ---------- l'échantillon : de vraies entreprises du numérique ---------- */
const AN = 'https://recherche-entreprises.api.gouv.fr/search';
const ech = [];
for (const f of ['departement=59&tranche_effectif_salarie=11,12,21,22', 'departement=59&tranche_effectif_salarie=31,32,41,42,51,52,53',
                 'departement=69&tranche_effectif_salarie=11,12,21,22,31,32', 'departement=35&tranche_effectif_salarie=11,12,21,22,31,32',
                 'departement=44&tranche_effectif_salarie=21,22,31,32,41']){
  const r = await depuisPage(`${AN}?activite_principale=62.01Z,62.02A,62.03Z,62.09Z,63.11Z,58.29C&${f}&etat_administratif=A&est_entrepreneur_individuel=false&per_page=10`);
  for (const x of (r.json && r.json.results) || []) ech.push(x);
  await pause(1300);
}
console.log(`ÉCHANTILLON : ${ech.length} entreprises\n`);

/* ---------- ① l'annuaire : comptes et compléments ---------- */
console.log('① L’ANNUAIRE — comptes et compléments\n');
{
  let avecFin = 0, deuxAns = 0, hausse = 0, baisse = 0, resPos = 0, resNeg = 0;
  const flags = {};
  const idcc = {};
  console.log('   clés de « complements » :', Object.keys((ech[0] && ech[0].complements) || {}).join(', '));
  for (const x of ech){
    const f = x.finances || {};
    const ans = Object.keys(f).sort();
    if (ans.length) avecFin++;
    if (ans.length >= 2){
      deuxAns++;
      const a = f[ans[ans.length - 2]], b = f[ans[ans.length - 1]];
      if (a && b && a.ca && b.ca){ if (b.ca > a.ca * 1.05) hausse++; else if (b.ca < a.ca * 0.95) baisse++; }
    }
    const der = ans.length ? f[ans[ans.length - 1]] : null;
    if (der && typeof der.resultat_net === 'number'){ if (der.resultat_net >= 0) resPos++; else resNeg++; }
    for (const [k, v] of Object.entries(x.complements || {})) if (v === true) flags[k] = (flags[k] || 0) + 1;
    for (const c of (x.complements && x.complements.liste_idcc) || []) idcc[c] = (idcc[c] || 0) + 1;
  }
  console.log(`   comptes : ${avecFin}/${ech.length} · deux années ou plus ${deuxAns} · CA en hausse >5 % ${hausse}, en baisse ${baisse} · résultat ≥ 0 ${resPos}, < 0 ${resNeg}`);
  console.log('   compléments vrais :', court(flags, 600));
  console.log('   conventions (IDCC) :', court(Object.entries(idcc).sort((a, b) => b[1] - a[1]).slice(0, 10), 400));
  for (const x of ech.slice(0, 6)) console.log(`   · ${x.nom_complet} — finances ${court(x.finances || {}, 220)}`);
}

/* ---------- ② le BODACC : ce qui est VIVANT ---------- */
console.log('\n② LE BODACC — les annonces d’une entreprise, toutes familles\n');
{
  const B = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';
  const familles = {}, recents = {};
  let lues = 0;
  for (const x of ech.slice(0, 30)){
    const r = await depuisPage(`${B}?where=${encodeURIComponent(`registre like "${x.siren}"`)}&order_by=dateparution%20desc&limit=20`);
    if (!r.ok){ console.log('   BODACC', r.statut, r.erreur || r.debut); continue; }
    lues++;
    const res = (r.json && r.json.results) || [];
    for (const a of res){
      familles[a.familleavis] = (familles[a.familleavis] || 0) + 1;
      if (String(a.dateparution) >= '2023-10-01') recents[a.familleavis] = (recents[a.familleavis] || 0) + 1;
    }
    if (lues <= 8) for (const a of res.slice(0, 4)){
      const d = a.modificationsgenerales || a.listeetablissements || a.acte || a.depot || '';
      console.log(`   · ${x.nom_complet} · ${a.dateparution} · ${a.familleavis} (${a.familleavis_lib}) · ${String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 260)}`);
    }
    await pause(400);
  }
  console.log(`   ${lues} entreprises lues · familles : ${court(familles)} · depuis oct. 2023 : ${court(recents)}`);
}

/* ---------- ③ Wikidata élargi ---------- */
console.log('\n③ WIKIDATA ÉLARGI — effectif, création, maison mère, secteur, produits\n');
{
  const sirens = ech.map(x => x.siren).concat(['326820065', '479766842', '702012956', '552081317', '380129866']).slice(0, 60);
  const q = `SELECT ?siren ?e ?eLabel ?effectif ?creation ?mereLabel ?secteurLabel ?produitLabel ?ca WHERE {
    VALUES ?siren { ${sirens.map(s => `"${s}"`).join(' ')} }
    ?e wdt:P1616 ?siren .
    OPTIONAL { ?e wdt:P1128 ?effectif }
    OPTIONAL { ?e wdt:P571 ?creation }
    OPTIONAL { ?e wdt:P749 ?mere }
    OPTIONAL { ?e wdt:P452 ?secteur }
    OPTIONAL { ?e wdt:P1056 ?produit }
    OPTIONAL { ?e wdt:P2139 ?ca }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  } LIMIT 300`;
  const r = await depuisPage('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { accept: 'application/sparql-results+json' } });
  const b = (r.json && r.json.results && r.json.results.bindings) || [];
  const par = new Map();
  for (const x of b){
    const s = x.siren.value;
    const o = par.get(s) || { nom: x.eLabel && x.eLabel.value, effectif: '', creation: '', mere: '', secteurs: new Set(), produits: new Set(), ca: '' };
    if (x.effectif) o.effectif = x.effectif.value;
    if (x.creation) o.creation = x.creation.value.slice(0, 4);
    if (x.mereLabel) o.mere = x.mereLabel.value;
    if (x.secteurLabel) o.secteurs.add(x.secteurLabel.value);
    if (x.produitLabel) o.produits.add(x.produitLabel.value);
    if (x.ca) o.ca = x.ca.value;
    par.set(s, o);
  }
  const n = k => [...par.values()].filter(o => k === 'secteurs' || k === 'produits' ? o[k].size : o[k]).length;
  console.log(`   ${r.statut} · ${par.size}/${sirens.length} connues · effectif ${n('effectif')} · création ${n('creation')} · maison mère ${n('mere')} · secteur ${n('secteurs')} · produits ${n('produits')} · CA ${n('ca')}`);
  for (const [s, o] of [...par].slice(0, 10)) console.log(`   · ${o.nom} (${s}) · ${o.effectif} pers. · ${o.creation} · mère ${o.mere} · ${[...o.secteurs].slice(0, 2).join(', ')} · ${[...o.produits].slice(0, 3).join(', ')}`);
}

/* ---------- ④ la commande publique (DECP) ---------- */
console.log('\n④ LA COMMANDE PUBLIQUE (DECP, data.gouv) — ses clients publics ?\n');
{
  const r = await depuisPage('https://www.data.gouv.fr/api/1/datasets/?q=' + encodeURIComponent('données essentielles commande publique') + '&page_size=6');
  console.log('   data.gouv (page) :', r.statut, r.erreur || '');
  const sets = (r.json && r.json.data) || [];
  const candidats = [];
  for (const d of sets){
    console.log(`   · ${d.title} · ${d.organization && d.organization.name} · ${(d.resources || []).length} ressources`);
    for (const x of (d.resources || []).slice(0, 8)){
      console.log(`       - ${x.title} · ${x.format} · ${x.filesize || '?'} o · ${x.id}`);
      if (/csv|parquet/i.test(x.format || '')) candidats.push(x);
    }
  }
  for (const x of candidats.slice(0, 6)){
    const p = await depuisPage(`https://tabular-api.data.gouv.fr/api/resources/${x.id}/profile/`);
    const cols = p.json && (p.json.profile && (p.json.profile.columns ? Object.keys(p.json.profile.columns) : p.json.profile.header));
    console.log(`   tabulaire ${x.title} : ${p.statut} · colonnes ${court(cols || p.debut, 500)}`);
    if (p.ok && Array.isArray(cols)){
      const col = cols.find(c => /titulaire.*(id|siret)|siret.*titulaire|titulaire_id/i.test(c)) || cols.find(c => /siret|siren/i.test(c));
      if (!col) continue;
      for (const e of ech.slice(0, 12)){
        const siret = e.siege && e.siege.siret;
        for (const v of [siret, e.siren].filter(Boolean)){
          const q = await depuisPage(`https://tabular-api.data.gouv.fr/api/resources/${x.id}/data/?${encodeURIComponent(col)}__contains=${v}&page_size=5`);
          const lignes = (q.json && q.json.data) || [];
          if (lignes.length){ console.log(`     ✓ ${e.nom_complet} (${col} ~ ${v}) : ${q.json.meta && q.json.meta.total} marché(s) · ${court(lignes[0], 400)}`); break; }
        }
        await pause(250);
      }
    }
  }
}

/* ---------- ⑤ l'index égalité (Egapro) ---------- */
console.log('\n⑤ L’INDEX ÉGALITÉ (Egapro)\n');
{
  for (const u of ['https://egapro.travail.gouv.fr/api/public/declarations?siren=326820065',
                   'https://egapro.travail.gouv.fr/api/search?q=326820065',
                   'https://egapro.travail.gouv.fr/api/public/declarations-exhaustive?siren=326820065']){
    const r = await depuisPage(u);
    console.log(`   ${u} → ${r.statut} ${r.erreur || ''} ${court(r.json || r.debut, 300)}`);
  }
  const r = await depuisPage('https://www.data.gouv.fr/api/1/datasets/?q=' + encodeURIComponent('index egalite professionnelle egapro') + '&page_size=4');
  for (const d of (r.json && r.json.data) || []){
    console.log(`   · ${d.title} · ${(d.resources || []).map(x => x.format + ' ' + x.id).slice(0, 4).join(' | ')}`);
    for (const x of (d.resources || []).filter(x => /csv/i.test(x.format || '')).slice(0, 2)){
      const p = await depuisPage(`https://tabular-api.data.gouv.fr/api/resources/${x.id}/profile/`);
      const cols = p.json && p.json.profile && (p.json.profile.columns ? Object.keys(p.json.profile.columns) : p.json.profile.header);
      console.log(`     tabulaire : ${p.statut} · ${court(cols || p.debut, 400)}`);
      if (p.ok && Array.isArray(cols)){
        const col = cols.find(c => /siren/i.test(c));
        let trouves = 0;
        for (const e of ech.slice(0, 20)){
          const q = await depuisPage(`https://tabular-api.data.gouv.fr/api/resources/${x.id}/data/?${encodeURIComponent(col)}__exact=${e.siren}&page_size=3`);
          const l = (q.json && q.json.data) || [];
          if (l.length){ trouves++; if (trouves <= 3) console.log(`     ✓ ${e.nom_complet} : ${court(l[0], 300)}`); }
          await pause(200);
        }
        console.log(`     ${trouves}/20 entreprises de l’échantillon trouvées`);
      }
    }
  }
}

/* ---------- ⑥ l'apprentissage, par entreprise ? ---------- */
console.log('\n⑥ L’APPRENTISSAGE PAR ENTREPRISE — ce que data.gouv publie\n');
for (const q of ['apprentissage entreprises siret', 'contrats apprentissage employeurs', 'entreprises accueillant des apprentis']){
  const r = await depuisPage('https://www.data.gouv.fr/api/1/datasets/?q=' + encodeURIComponent(q) + '&page_size=5');
  for (const d of (r.json && r.json.data) || []) console.log(`   « ${q} » · ${d.title} · ${d.organization && d.organization.name}`);
}

console.log('\nFIN');
await browser.close();
server.close();

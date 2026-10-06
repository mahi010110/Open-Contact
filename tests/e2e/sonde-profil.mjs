/* ============================================================
   OpenContact — sonde : UNE RECHERCHE PRÉCISE ET À TA MESURE

   Demande du mainteneur, 6 octobre 2026 : « que la recherche passe au
   niveau supérieur », « des informations précises et adaptées au profil ».
   Avant de concevoir, on MESURE ce qu'une page web peut réellement lire,
   sans clé ni compte (§0, question ②) :

   ① l'ÉTABLISSEMENT local, pas l'entreprise : autour de Lille, ce que
     l'annuaire dit du bureau qu'on rejoindrait — sa taille, son
     activité, siège ou non, son enseigne — face à l'entreprise entière ;
   ② data.gouv.fr : l'enquête « Besoins en main-d'œuvre » (BMO) de France
     Travail, le ROME, les métiers de l'ONISEP, le RNCP — où sont les
     fichiers, et si l'API tabulaire les sert à une page (CORS), pour un
     bassin et un métier de l'informatique ;
   ③ les liens vers des offres de STAGE : quel format garde ses critères
     une fois ouvert (1jeune1solution, Welcome to the Jungle, HelloWork,
     Indeed, France Travail) ;
   ④ le temps de trajet : la Géoplateforme de l'IGN (itinéraire à pied, à
     vélo, en voiture) répond-elle à une page ;
   ⑤ le BODACC : les entreprises du numérique qui se CRÉENT ou ouvrent un
     établissement près d'ici, ces derniers mois.

   INFORMATIVE : elle relève, elle ne fait pas rougir la CI.
   ============================================================ */
import http from 'http';
import { chromium, chromiumPath } from './outils.mjs';

/* UNE PAGE VIERGE, SANS LA CSP DE L'APP. Une page de l'app refuse
   d'elle-même tout domaine que sa CSP ne nomme pas : mesurer depuis elle,
   c'est mesurer la CSP, pas le service. C'est exactement l'erreur de la
   première version de sonde-utile.mjs (6/10) — les pages carrières et
   Clearbit y passaient pour « illisibles » ; ⓪ les remesure ici. */
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
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), o.ms || 15000);
    const res = await fetch(u, { headers: o.headers || { accept: 'application/json' }, signal: ctl.signal });
    clearTimeout(t);
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { ok: res.ok, statut: res.status, ms: Math.round(performance.now() - t0), json, debut: txt.slice(0, 300) };
  } catch (e){ return { ok: false, statut: 0, erreur: String(e && e.message || e), ms: Math.round(performance.now() - t0) }; }
}, [url, o]);
const serveur = async (u, o = {}) => {
  try {
    const res = await fetch(u, { method: o.method || 'GET', headers: { 'user-agent': 'opencontact-sonde/1 (+github)', accept: 'application/json', ...(o.headers || {}) }, signal: AbortSignal.timeout(20000) });
    const txt = o.method === 'OPTIONS' ? '' : await res.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    const h = {}; res.headers.forEach((v, k) => { if (/access-control|content-type/i.test(k)) h[k] = v; });
    return { statut: res.status, json, txt, h };
  } catch (e){ return { statut: 0, txt: String(e && e.message || e), h: {} }; }
};

/* ---------- ⓪ la contre-mesure : ce que la CSP de l'app avait masqué ---------- */
console.log('⓪ CONTRE-MESURE — depuis une page vierge (sans la CSP de l’app)\n');
{
  const AN = 'https://recherche-entreprises.api.gouv.fr/search';
  const echantillon = [];
  for (const f of ['departement=59&tranche_effectif_salarie=11,12,21,22,31,32', 'departement=69&tranche_effectif_salarie=11,12,21,22,31,32',
                   'departement=75&tranche_effectif_salarie=21,22,31,32,41,42']){
    const r = await depuisPage(`${AN}?activite_principale=62.01Z,62.02A,62.03Z,62.09Z,63.11Z,58.29C&${f}&etat_administratif=A&est_entrepreneur_individuel=false&per_page=15`);
    for (const x of (r.json && r.json.results) || []) echantillon.push(x.nom_complet || x.nom_raison_sociale);
    await pause(1300);
  }
  /* des TÉMOINS connus pour publier sur ces logiciels : s'ils ne répondent
     pas, la sonde mesure mal, pas le service */
  const TEMOINS = [['Lever', 'mistral'], ['Greenhouse', 'datadog'], ['SmartRecruiters', 'Ubisoft2'], ['Recruitee', 'bitpanda'], ['Workable', 'ivalua']];
  const slugs = nom => {
    const b = String(nom).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(sas|sasu|sarl|sa|eurl|groupe|group|france|services?|solutions?|consulting|conseil|informatique|technologies?)\b/g, ' ')
      .replace(/\(.*?\)/g, ' ').trim();
    const mots = b.split(/[^a-z0-9]+/).filter(Boolean);
    return [...new Set([mots.join(''), mots.join('-'), mots[0]].filter(s => s && s.length >= 3))];
  };
  const ATS = {
    Lever: [s => `https://api.lever.co/v0/postings/${s}?mode=json`, j => Array.isArray(j) ? j.map(x => x.text) : null],
    Greenhouse: [s => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`, j => j && Array.isArray(j.jobs) ? j.jobs.map(x => x.title) : null],
    Recruitee: [s => `https://${s}.recruitee.com/api/offers/`, j => j && Array.isArray(j.offers) ? j.offers.map(x => x.title) : null],
    SmartRecruiters: [s => `https://api.smartrecruiters.com/v1/companies/${s}/postings`, j => j && Array.isArray(j.content) && j.totalFound ? j.content.map(x => x.name) : null],
    Workable: [s => `https://apply.workable.com/api/v1/widget/accounts/${s}`, j => j && Array.isArray(j.jobs) ? j.jobs.map(x => x.title) : null]
  };
  for (const [ats, s] of TEMOINS){
    const [url, lire] = ATS[ats];
    const r = await depuisPage(url(s), { ms: 10000 });
    const t = r.ok && r.json ? lire(r.json) : null;
    console.log(`   témoin ${ats} « ${s} » : ${r.statut || r.erreur} · ${t ? t.length + ' offres' : 'rien de lisible'}`);
  }
  const trouves = new Map(), lisible = new Map();
  for (const nom of echantillon.slice(0, 40)){
    for (const s of slugs(nom).slice(0, 2)){
      for (const [ats, [url, lire]] of Object.entries(ATS)){
        const r = await depuisPage(url(s), { ms: 8000 });
        const e = lisible.get(ats) || { lu: 0, muet: 0 }; lisible.set(ats, e);
        if (r.statut) e.lu++; else e.muet++;
        const titres = r.ok && r.json ? lire(r.json) : null;
        if (titres && titres.length){
          trouves.set(nom + ' @' + ats, titres);
          console.log(`   ✓ ${nom} → ${ats} « ${s} » : ${titres.length} offre(s) · ${titres.slice(0, 3).join(' | ').slice(0, 160)}`);
        }
      }
      await pause(120);
    }
  }
  const alt = [...trouves.values()].flat().filter(t => /altern|apprenti|stage|intern/i.test(t)).length;
  console.log(`BILAN ⓪ pages carrières : ${echantillon.length} entreprises · ${trouves.size} tableaux · ${alt} offres alternance/stage · lisible/muet : ${[...lisible].map(([k, v]) => k + ' ' + v.lu + '/' + v.muet).join(' · ')}`);
  let dom = 0, lu = 0;
  for (const nom of echantillon.slice(0, 15)){
    const r = await depuisPage('https://autocomplete.clearbit.com/v1/companies/suggest?query=' + encodeURIComponent(nom), { ms: 8000 });
    if (r.statut) lu++;
    if (Array.isArray(r.json) && r.json[0] && r.json[0].domain) dom++;
  }
  console.log(`BILAN ⓪ Clearbit : ${dom}/15 domaines · ${lu} réponses lisibles`);
  /* La bonne alternance : la page étrangère lit-elle la réponse (401 attendu) ? */
  for (const u of ['https://api.apprentissage.beta.gouv.fr/api/job/v1/search?latitude=50.63&longitude=3.06&radius=30&romes=M1805']){
    const b = await depuisPage(u, { headers: { accept: 'application/json', authorization: 'Bearer jeton-de-sonde' } });
    const n = await depuisPage(u);
    console.log(`   API apprentissage · avec jeton factice : ${b.statut || b.erreur} · sans jeton : ${n.statut || n.erreur} ${n.debut ? n.debut.slice(0, 120) : ''}`);
  }
  console.log('');
}

/* ---------- ① l'établissement local ---------- */
console.log('① L’ÉTABLISSEMENT QU’ON REJOINDRAIT (annuaire, autour de Lille)\n');
{
  const AN = 'https://recherche-entreprises.api.gouv.fr';
  const u = `${AN}/near_point?lat=50.631&long=3.047&radius=15&activite_principale=62.02A,62.03Z,62.01Z,46.51Z&etat_administratif=A&per_page=10&limite_matching_etablissements=3`;
  const r = await depuisPage(u);
  const res = (r.json && r.json.results) || [];
  console.log(`near_point : ${r.statut} · ${res.length} entreprises · ${r.ms} ms`);
  if (res[0]){
    console.log('   clés d’une entreprise :', Object.keys(res[0]).join(', '));
    const e = (res[0].matching_etablissements || [])[0] || {};
    console.log('   clés d’un établissement :', Object.keys(e).join(', '));
  }
  let local = 0, autreTaille = 0, autreNaf = 0, enseigne = 0;
  for (const x of res){
    const e = (x.matching_etablissements || [])[0] || {};
    if (e.tranche_effectif_salarie) local++;
    if (e.tranche_effectif_salarie && e.tranche_effectif_salarie !== x.tranche_effectif_salarie) autreTaille++;
    if (e.activite_principale && e.activite_principale !== x.activite_principale) autreNaf++;
    if ((e.liste_enseignes || []).length || e.nom_commercial) enseigne++;
    console.log(`   · ${(x.nom_raison_sociale || '').slice(0, 30)} — entreprise [${x.tranche_effectif_salarie}·${x.activite_principale}] · ici : ${e.libelle_commune || '?'} [${e.tranche_effectif_salarie || '∅'}·${e.activite_principale || '?'}] siège ${e.est_siege} · employeur ${e.caractere_employeur} · enseignes ${JSON.stringify(e.liste_enseignes || [])} · ouvert ${e.date_creation || e.date_debut_activite || '?'} · ${(x.matching_etablissements || []).length} établ. rendus`);
  }
  console.log(`BILAN ① : ${res.length} · taille de l’établissement connue ${local} · différente de l’entreprise ${autreTaille} · activité différente ${autreNaf} · enseigne ${enseigne}\n`);
  /* un SIREN connu, par la question de la fiche : ses établissements ? */
  for (const siren of ['326820065', '479766842']){
    const s = await depuisPage(`${AN}/search?q=${siren}&per_page=1&limite_matching_etablissements=20`);
    const x = ((s.json && s.json.results) || [])[0] || {};
    console.log(`   SIREN ${siren} : ${s.statut} · ${(x.matching_etablissements || []).length} établissements rendus · ouverts ${x.nombre_etablissements_ouverts}`);
    await pause(800);
  }
  await pause(1200);
}

/* ---------- ② data.gouv.fr ---------- */
console.log('\n② DATA.GOUV.FR — BMO, ROME, ONISEP, RNCP\n');
const DG = 'https://www.data.gouv.fr/api/1';
const TAB = 'https://tabular-api.data.gouv.fr/api';
{
  const c = await depuisPage(`${DG}/datasets/?q=besoins%20en%20main-d%27oeuvre&page_size=3`);
  console.log(`API data.gouv depuis la page : ${c.statut || c.erreur} · ${c.ms} ms`);
  const recherches = ['besoins en main-d\'oeuvre 2026', 'enquête besoins en main d oeuvre BMO', 'repertoire operationnel des metiers et des emplois ROME',
                      'ideo metiers onisep', 'repertoire national des certifications professionnelles', 'ideo formations initiales'];
  const ressources = [];
  for (const q of recherches){
    const r = await serveur(`${DG}/datasets/?q=${encodeURIComponent(q)}&page_size=4`);
    const ds = (r.json && r.json.data) || [];
    console.log(`— « ${q} » : ${r.statut} · ${ds.length} jeux`);
    for (const d of ds){
      console.log(`   ▸ ${d.title} [${d.id}] · ${(d.organization && d.organization.name) || '?'} · maj ${String(d.last_update || '').slice(0, 10)}`);
      for (const x of (d.resources || []).slice(0, 6)){
        console.log(`       · ${x.title} · ${x.format} · ${x.filesize || '?'} o · ${x.id}`);
        ressources.push({ d: d.title, ...x });
      }
    }
    await pause(400);
  }
  /* l'API tabulaire : chaque ressource tabulaire candidate, depuis la page */
  const candidates = ressources.filter(x => /csv|xlsx|xls/i.test(x.format || '') && /bmo|besoin|main|rome|metier|idéo|ideo|rncp|certif/i.test((x.title || '') + ' ' + x.d)).slice(0, 10);
  for (const x of candidates){
    const p = await depuisPage(`${TAB}/resources/${x.id}/profile/`);
    const cols = p.json && p.json.profile && p.json.profile.header ? p.json.profile.header : (p.json && p.json.profile ? Object.keys(p.json.profile.columns || {}) : []);
    console.log(`   tabulaire · ${x.title.slice(0, 60)} · ${p.statut || p.erreur} · colonnes : ${JSON.stringify(cols).slice(0, 400)}`);
    const d = await depuisPage(`${TAB}/resources/${x.id}/data/?page_size=3`);
    console.log(`       données : ${d.statut || d.erreur} · ${d.json ? JSON.stringify((d.json.data || []).slice(0, 2)).slice(0, 500) : d.debut}`);
    await pause(400);
  }
}

/* ---------- ③ les liens vers des offres de stage ---------- */
console.log('\n③ LES OFFRES DE STAGE — le lien garde-t-il ses critères ?\n');
{
  const LIENS = [
    ['1j1s stages · motCle + localisation', 'https://www.1jeune1solution.gouv.fr/stages?motCle=informatique&libelleLocalisation=Lille%20(59)&codeLocalisation=59&typeLocalisation=DEPARTEMENT'],
    ['1j1s stages · motCle seul', 'https://www.1jeune1solution.gouv.fr/stages?motCle=d%C3%A9veloppeur'],
    ['France Travail · stage informatique Lille', 'https://candidat.francetravail.fr/offres/recherche?motsCles=stage%20informatique&lieux=59350&rayon=10&tri=0'],
    ['Welcome to the Jungle · stage', 'https://www.welcometothejungle.com/fr/jobs?query=informatique&refinementList%5Bcontract_type%5D%5B%5D=internship&aroundQuery=Lille%2C%20France'],
    ['HelloWork · stage', 'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=stage%20informatique&l=Lille%2059000'],
    ['Indeed · stage', 'https://fr.indeed.com/jobs?q=stage+informatique&l=Lille+%2859%29']
  ];
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } });
  const p2 = await ctx.newPage();
  for (const [nom, u] of LIENS){
    try {
      const res = await p2.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await p2.waitForTimeout(8000);
      const t = await p2.evaluate(() => ({ titre: document.title, url: location.href,
        texte: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500) }));
      const comptes = (t.texte.match(/\d[\d\s.]*\s*(offres?|stages?|résultats?|emplois?)\b[^.]{0,50}/gi) || []).slice(0, 4);
      console.log(`— ${nom} : ${res ? res.status() : 0} · « ${t.titre.slice(0, 90)} » · ${t.url === u ? 'même adresse' : 'redirigé → ' + t.url.slice(0, 160)}`);
      console.log(`    comptes : ${comptes.join(' | ') || '—'}`);
      console.log(`    texte : ${t.texte.slice(0, 300)}`);
    } catch (e){ console.log(`— ${nom} : ✗ ${String(e.message || e).slice(0, 140)}`); }
  }
  await ctx.close();
}

/* ---------- ④ le temps de trajet (IGN) ---------- */
console.log('\n④ LE TEMPS DE TRAJET — Géoplateforme de l’IGN, depuis la page\n');
{
  const G = 'https://data.geopf.fr/navigation/itineraire';
  for (const prof of ['pedestrian', 'car']){
    const u = `${G}?resource=bdtopo-osrm&start=3.047,50.631&end=3.145,50.623&profile=${prof}&optimization=fastest&getSteps=false&timeUnit=minute&distanceUnit=kilometer`;
    const r = await depuisPage(u);
    console.log(`— ${prof} : ${r.statut || r.erreur} · ${r.ms} ms · ${r.json ? 'durée ' + r.json.duration + ' min · ' + r.json.distance + ' km' : r.debut}`);
    await pause(500);
  }
  const caps = await depuisPage('https://data.geopf.fr/navigation/getCapabilities');
  console.log(`— capacités : ${caps.statut || caps.erreur} · ${caps.json ? JSON.stringify((caps.json.resources || []).map(x => x.id + ':' + (x.availableOperations || []).map(o => o.id).join('/'))).slice(0, 500) : caps.debut}`);
}

/* ---------- ⑤ le BODACC : ce qui se crée près d'ici ---------- */
console.log('\n⑤ LE BODACC — les créations récentes du numérique dans le Nord\n');
{
  const B = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';
  const p = new URLSearchParams({ where: 'familleavis="creation" and numerodepartement="59" and dateparution>="2026-04-01"', limit: '5', order_by: 'dateparution desc' });
  const r = await depuisPage(`${B}?${p}`);
  const res = (r.json && r.json.results) || [];
  console.log(`créations dans le Nord depuis avril : ${r.statut || r.erreur} · total ${r.json && r.json.total_count}`);
  if (res[0]) console.log('   clés :', Object.keys(res[0]).join(', '));
  for (const x of res.slice(0, 3)) console.log('   ·', JSON.stringify({ commercant: x.commercant, ville: x.ville, registre: x.registre, etab: String(x.listeetablissements || '').slice(0, 300) }));
  const q2 = new URLSearchParams({ where: 'familleavis="creation" and numerodepartement="59" and dateparution>="2026-04-01" and search(listeetablissements, "informatique")', limit: '5' });
  const r2 = await depuisPage(`${B}?${q2}`);
  console.log(`   … dont « informatique » : ${r2.statut || r2.erreur} · total ${r2.json && r2.json.total_count} ${r2.json ? '' : r2.debut}`);
}

/* ---------- ⑥ HelloWork : le lien de stage, métier par métier ---------- */
console.log('\n⑥ HELLOWORK — le lien « Offres de stage autour de … », métier par métier\n');
{
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } });
  const p2 = await ctx.newPage();
  const H = 'https://www.hellowork.com/fr-fr/emploi/recherche.html';
  for (const [k, l] of [['stage réseau', 'Lille'], ['stage développeur', 'Lyon'], ['stage cybersécurité', 'Rennes'],
                        ['stage support informatique', 'Marseille'], ['stage informatique', 'Nantes'], ['stage informatique', 'Lille 59000']]){
    const u = `${H}?k=${encodeURIComponent(k)}&l=${encodeURIComponent(l)}`;
    try {
      const res = await p2.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await p2.waitForTimeout(6000);
      const t = await p2.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
      const n = (t.match(/(\d[\d\s]*)\s*offres?\b/i) || [])[0] || '?';
      const lieux = (t.match(/\|\s*\d{2}\b/g) || []).slice(0, 8).join(' ');
      console.log(`— « ${k} » · ${l} : ${res ? res.status() : 0} · ${n} · départements des premières offres ${lieux}`);
    } catch (e){ console.log(`— « ${k} » · ${l} : ✗ ${String(e.message || e).slice(0, 120)}`); }
  }
  await ctx.close();
}

/* ---------- ⑦ Clearbit : le bon site, ou un homonyme ? ---------- */
console.log('\n⑦ CLEARBIT — le site trouvé est-il le bon ?\n');
{
  const NOMS = ['Advens', 'Sopra Steria Group', 'Inetum', 'Capgemini Technology Services', 'Keyrus', 'Scalian', 'Jiliti', 'Cofidoc',
                'Groupe Cybertek', 'Computacenter France', 'Visiativ Solutions Entreprise', 'Chapsvision', 'Linkt', 'Prodware', 'Trustteam',
                'Euro Information', 'Local.fr', 'Incomm', 'Hays Services', 'Orange Business Services'];
  for (const nom of NOMS){
    const r = await depuisPage('https://autocomplete.clearbit.com/v1/companies/suggest?query=' + encodeURIComponent(nom), { ms: 8000 });
    const l = Array.isArray(r.json) ? r.json.slice(0, 3).map(x => `${x.name} → ${x.domain}`).join(' | ') : (r.erreur || r.statut);
    console.log(`   ${nom} : ${l}`);
    await pause(200);
  }
}

const temoin = await page.evaluate(async () => { try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; } catch (e) { return 'coupé'; } });
console.log(`\nFIN · réseau ${temoin}`);
await browser.close();
server.close();

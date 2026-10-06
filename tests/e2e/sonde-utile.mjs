/* ============================================================
   OpenContact — sonde : « À DÉCOUVRIR » EST-IL UTILE ?

   Retour du mainteneur, 6 octobre 2026, sur « À découvrir » et la carte
   de l'entreprise : « je ne sais pas à qui écrire », « les entreprises ne
   correspondent pas », « je ne sais pas si elles recrutent », « la carte
   ne m'aide pas à choisir ». Avant de reconcevoir, on MESURE chacune de
   ces quatre plaintes sur le vrai monde, depuis une vraie page :

   ① ce qu'un étudiant obtient VRAIMENT pour ses questions typiques —
     la chaîne de l'app elle-même (interpréteur, questions, fusion), les
     dix premières entreprises, leur nom tel qu'on le reconnaîtrait
     (raison sociale, nom commercial, enseigne, sigle) ;
   ② où sont les employeurs qu'on ne demande pas : les codes d'activité
     des DSI d'entreprises non informatiques, des intégrateurs, des
     collectivités, des hôpitaux — là où un BTS SIO SISR fait souvent
     son alternance ;
   ③ « recrutent-elles ? » : l'API apprentissage de l'État (La bonne
     alternance) — sa documentation, ses conditions, et surtout si un
     NAVIGATEUR peut l'appeler (CORS, avec un jeton) ; ce qu'appelle le
     site public lui-même ;
   ④ les offres publiques des logiciels de recrutement (Lever,
     Greenhouse, Recruitee, SmartRecruiters, Workable) : chez combien
     d'entreprises réelles, et avec des alternances ?
   ⑤ « à qui écrire » : un domaine (donc un site, une page carrières)
     par l'autocomplétion de Clearbit — couverture, CORS.

   INFORMATIVE : elle relève, elle ne fait pas rougir la CI.
   ============================================================ */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.goto(base + '/sonde-vide.html').catch(() => {});
await page.goto(base + '/', { waitUntil: 'domcontentloaded' }).catch(() => {});

const pause = ms => new Promise(ok => setTimeout(ok, ms));
const depuisPage = (url, o = {}) => page.evaluate(async ([u, o]) => {
  const t0 = performance.now();
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), o.ms || 15000);
    const res = await fetch(u, { headers: o.headers || { accept: 'application/json' }, signal: ctl.signal, method: o.method || 'GET', body: o.body });
    clearTimeout(t);
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { ok: res.ok, statut: res.status, ms: Math.round(performance.now() - t0), json, debut: txt.slice(0, 240) };
  } catch (e){ return { ok: false, statut: 0, erreur: String(e && e.message || e), ms: Math.round(performance.now() - t0) }; }
}, [url, o]);
const serveur = async (u, o = {}) => {
  try {
    const res = await fetch(u, { method: o.method || 'GET', headers: { 'user-agent': 'opencontact-sonde/1 (+github)', accept: o.accept || '*/*', ...(o.headers || {}) },
      signal: AbortSignal.timeout(20000) });
    const txt = o.method === 'OPTIONS' ? '' : await res.text();
    const h = {}; res.headers.forEach((v, k) => { if (/access-control|content-type|www-auth/i.test(k)) h[k] = v; });
    return { statut: res.status, txt, h };
  } catch (e){ return { statut: 0, txt: String(e && e.message || e), h: {} }; }
};

/* ---------- ① les questions d'un étudiant, par la chaîne de l'app ---------- */
console.log('① CE QU’UN ÉTUDIANT OBTIENT (la chaîne de l’app, depuis la page)\n');
const QUESTIONS = ['alternance réseau Lille', 'alternance développeur Lyon', 'stage cybersécurité Lille',
                   'alternance SISR Roubaix', 'alternance Lille', 'stage développeur web Marseille'];
const vus = [];
for (const q of QUESTIONS){
  const r = await page.evaluate(async q => {
    const R = await import('./engine/requete.js');
    const A = await import('./engine/annuaire.js');
    const interp = R.interpreter(q, R.contexteRecherche([]));
    const urls = A.questionsAnnuaire(interp, {});
    const listes = [], bruts = {};
    for (const [k, u] of urls.entries()){
      if (k) await new Promise(ok => setTimeout(ok, 1200));
      let res = await fetch(u);
      if (res.status === 429){ await new Promise(ok => setTimeout(ok, 2500)); res = await fetch(u); }
      const j = res.ok ? await res.json() : { results: [] };
      for (const x of j.results || []) bruts[x.siren] = x;
      listes.push(A.lireAnnuaire(j, {}));
    }
    const d = A.decouvertes(listes, [], { genres: urls.map(A.genreQuestion) });
    return {
      etiquettes: interp.etiquettes.map(e => e.famille + ':' + e.cle), urls: urls.map(u => decodeURIComponent(u.split('?')[1] || '')),
      top: d.slice(0, 12).map(x => {
        const b = bruts[x.siren] || {};
        const s = b.siege || {};
        return { nom: x.nom, sigle: x.sigle, commercial: s.nom_commercial || '', enseignes: (s.liste_enseignes || []).join('/'),
          naf: x.naf, act: x.activite, tranche: x.tranche, ville: x.ville, employeur: x.employeur, nature: b.nature_juridique,
          etab: x.etablissements, dirigeants: (x.dirigeants || []).filter(d => d.personne).length };
      })
    };
  }, q);
  console.log(`— « ${q} » : étiquettes ${r.etiquettes.join(', ') || '—'}`);
  for (const u of r.urls) console.log(`   question : ${u.slice(0, 260)}`);
  for (const x of r.top) {
    vus.push(x);
    console.log(`   · ${x.nom}${x.sigle ? ' [' + x.sigle + ']' : ''}${x.commercial ? ' « ' + x.commercial + ' »' : ''}${x.enseignes ? ' ‹' + x.enseignes + '›' : ''} — ${x.naf} ${x.act || '?'} · ${x.tranche || '∅'} · ${x.ville} · employeur ${x.employeur} · nj ${x.nature} · ${x.etab} étab. · ${x.dirigeants} dirigeant(s)`);
  }
  await pause(1500);
}
{
  const n = vus.length;
  const sans = vus.filter(x => !x.tranche || x.tranche === '00' || x.tranche === 'NN').length;
  const petits = vus.filter(x => ['01', '02', '03'].includes(x.tranche)).length;
  const reconnaissables = vus.filter(x => x.commercial || x.enseignes || x.sigle).length;
  console.log(`\nBILAN ① : ${n} lignes · sans salarié déclaré ${sans} · 1 à 9 salariés ${petits} · avec nom commercial/enseigne/sigle ${reconnaissables} · avec un dirigeant personne ${vus.filter(x => x.dirigeants).length}\n`);
}

/* ---------- ② les employeurs qu'on ne demande pas ---------- */
console.log('② LES EMPLOYEURS HORS NUMÉRIQUE (Nord, 10 salariés et plus)\n');
const AN = 'https://recherche-entreprises.api.gouv.fr/search';
const AUTRES = [
  ['46.51Z commerce de gros d’ordinateurs (intégrateurs, revendeurs)', 'activite_principale=46.51Z'],
  ['46.52Z commerce de gros de composants électroniques et télécom', 'activite_principale=46.52Z'],
  ['95.11Z réparation d’ordinateurs', 'activite_principale=95.11Z'],
  ['61.10Z/61.20Z/61.90Z télécommunications', 'activite_principale=61.10Z,61.20Z,61.90Z'],
  ['84.11Z administration publique (mairies, départements) — 50+', 'activite_principale=84.11Z&tranche_effectif_salarie=21,22,31,32,41,42,51,52,53'],
  ['86.10Z hôpitaux — 250+', 'activite_principale=86.10Z&tranche_effectif_salarie=32,41,42,51,52,53'],
  ['85.42Z enseignement supérieur', 'activite_principale=85.42Z'],
  ['64.19Z banques — 250+', 'activite_principale=64.19Z&tranche_effectif_salarie=32,41,42,51,52,53'],
  ['70.22Z conseil pour les affaires (cabinets, dont SI)', 'activite_principale=70.22Z&tranche_effectif_salarie=11,12,21,22,31,32'],
];
for (const [nom, f] of AUTRES){
  const r = await depuisPage(`${AN}?${f}&departement=59&etat_administratif=A&est_entrepreneur_individuel=false${f.includes('tranche') ? '' : '&tranche_effectif_salarie=11,12,21,22,31,32,41,42,51,52,53'}&per_page=8`);
  const j = r.json || {};
  console.log(`— ${nom} : ${r.statut} · total ${j.total_results ?? '?'}`);
  console.log('   ', (j.results || []).map(x => `${x.nom_raison_sociale || x.nom_complet} [${x.tranche_effectif_salarie}]`).join(' | ').slice(0, 900));
  await pause(1300);
}

/* ---------- ③ l'API apprentissage (La bonne alternance) ---------- */
console.log('\n③ L’API APPRENTISSAGE — documentation, conditions, CORS\n');
const DOCS = [
  'https://api.apprentissage.beta.gouv.fr/api/doc/json', 'https://api.apprentissage.beta.gouv.fr/api/documentation/json',
  'https://api.apprentissage.beta.gouv.fr/api/openapi.json', 'https://api.apprentissage.beta.gouv.fr/openapi.json',
  'https://api.apprentissage.beta.gouv.fr/api/docs/json', 'https://api.apprentissage.beta.gouv.fr/api/v1/openapi.json',
  'https://labonnealternance.apprentissage.beta.gouv.fr/api/docs/json', 'https://labonnealternance.apprentissage.beta.gouv.fr/api/v3/openapi.json',
  'https://labonnealternance.apprentissage.beta.gouv.fr/api/v3/docs/json', 'https://labonnealternance.apprentissage.beta.gouv.fr/api/openapi.json'
];
for (const u of DOCS){
  const r = await serveur(u, { accept: 'application/json' });
  let j = null; try { j = JSON.parse(r.txt); } catch (e) {}
  if (j && j.paths){
    console.log(`✓ ${u} : ${r.statut} · ${Object.keys(j.paths).length} chemins`);
    for (const [chemin, ops] of Object.entries(j.paths)) for (const [verbe, op] of Object.entries(ops)){
      if (!op || typeof op !== 'object' || !/job|recruteur|company|entreprise|offre|search|formation/i.test(chemin)) continue;
      const params = (op.parameters || []).map(p => p.name).filter(Boolean).join(',');
      console.log(`   ${verbe.toUpperCase()} ${chemin} · sécurité ${JSON.stringify(op.security || j.security || 'aucune').slice(0, 60)} · ${params.slice(0, 200)}`);
    }
  } else console.log(`· ${u} : ${r.statut} ${r.txt.slice(0, 120).replace(/\s+/g, ' ')}`);
}
for (const u of ['https://api.apprentissage.beta.gouv.fr/fr/cgu', 'https://api.apprentissage.beta.gouv.fr/cgu', 'https://api.apprentissage.beta.gouv.fr/fr/documentation-technique']){
  const r = await serveur(u, { accept: 'text/html' });
  const t = r.txt.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log(`— ${u} : ${r.statut}`);
  for (const mot of ['jeton', 'token', 'expir', 'personnel', 'gratuit', 'limite', 'navigateur', 'CORS']){
    const i = t.toLowerCase().indexOf(mot.toLowerCase());
    if (i >= 0) console.log(`   [${mot}] …${t.slice(Math.max(0, i - 160), i + 220)}…`);
  }
}
/* le NAVIGATEUR peut-il l'appeler avec un jeton ? (préflight CORS) */
const PROBES_JETON = [
  'https://api.apprentissage.beta.gouv.fr/api/job/v1/search?latitude=50.63&longitude=3.06&radius=30&romes=M1805',
  'https://labonnealternance.apprentissage.beta.gouv.fr/api/v3/jobs/search?latitude=50.63&longitude=3.06&radius=30&romes=M1805'
];
for (const u of PROBES_JETON){
  const b = await depuisPage(u, { headers: { accept: 'application/json', authorization: 'Bearer jeton-de-sonde' } });
  console.log(`— navigateur + jeton factice · ${u.split('?')[0]} : ${b.statut || b.erreur} ${b.debut ? b.debut.replace(/\s+/g, ' ').slice(0, 160) : ''}`);
  const o = await serveur(u, { method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:8080', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } });
  console.log(`   préflight (serveur) : ${o.statut} · ${JSON.stringify(o.h)}`);
}
/* ce qu'appelle le site public lui-même — sans jeton ? */
{
  const accueil = await serveur('https://labonnealternance.apprentissage.beta.gouv.fr/recherche?romes=M1805&lat=50.63&lon=3.06&radius=30', { accept: 'text/html' });
  const scripts = [...new Set((accueil.txt.match(/\/_next\/static\/[^"']+\.js/g) || []))].slice(0, 40);
  console.log(`— site public : ${accueil.statut} · ${scripts.length} scripts`);
  const chemins = new Set();
  for (const s of scripts){
    const r = await serveur('https://labonnealternance.apprentissage.beta.gouv.fr' + s, { accept: '*/*' });
    for (const m of r.txt.match(/["'`](\/api\/[a-zA-Z0-9_\-\/:.{}$]+)/g) || []) chemins.add(m.slice(1));
  }
  console.log('   chemins /api appelés par le site :', [...chemins].slice(0, 60).join(' '));
  for (const c of [...chemins].filter(c => /job|recruteur|company|search|offre/i.test(c) && !/[{$:]/.test(c)).slice(0, 8)){
    const b = await depuisPage('https://labonnealternance.apprentissage.beta.gouv.fr' + c + '?romes=M1805&latitude=50.63&longitude=3.06&radius=30');
    console.log(`   navigateur · ${c} : ${b.statut || b.erreur} ${b.debut ? b.debut.replace(/\s+/g, ' ').slice(0, 200) : ''}`);
  }
  const page42 = await serveur('https://labonnealternance.apprentissage.beta.gouv.fr/emploi/recruteurs_lba/42139181400025/rhone-alpes-pme-gestion', { accept: 'text/html' });
  console.log(`   page « recruteur LBA » d’un SIRET connu : ${page42.statut}`);
}

/* ---------- ④ les offres publiques des logiciels de recrutement ---------- */
console.log('\n④ LES OFFRES PUBLIQUES DES LOGICIELS DE RECRUTEMENT\n');
const echantillon = [];
for (const f of ['departement=59&tranche_effectif_salarie=11,12,21,22,31,32', 'departement=69&tranche_effectif_salarie=11,12,21,22,31,32',
                 'departement=75&tranche_effectif_salarie=21,22,31,32,41,42']){
  const r = await depuisPage(`${AN}?activite_principale=62.01Z,62.02A,62.03Z,62.09Z,63.11Z,58.29C&${f}&etat_administratif=A&est_entrepreneur_individuel=false&per_page=15`);
  for (const x of (r.json && r.json.results) || []) echantillon.push(x.nom_complet || x.nom_raison_sociale);
  await pause(1300);
}
const slugs = nom => {
  const b = String(nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(sas|sasu|sarl|sa|eurl|groupe|group|france|services?|solutions?|consulting|conseil|informatique|technologies?)\b/g, ' ')
    .replace(/\(.*?\)/g, ' ').trim();
  const mots = b.split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set([mots.join(''), mots.join('-'), mots[0]].filter(s => s && s.length >= 3))];
};
const ATS = [
  ['Lever', s => `https://api.lever.co/v0/postings/${s}?mode=json`, j => Array.isArray(j) ? j.map(x => x.text) : null],
  ['Greenhouse', s => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`, j => j && Array.isArray(j.jobs) ? j.jobs.map(x => x.title) : null],
  ['Recruitee', s => `https://${s}.recruitee.com/api/offers/`, j => j && Array.isArray(j.offers) ? j.offers.map(x => x.title) : null],
  ['SmartRecruiters', s => `https://api.smartrecruiters.com/v1/companies/${s}/postings`, j => j && Array.isArray(j.content) && j.totalFound ? j.content.map(x => x.name) : null],
  ['Workable', s => `https://apply.workable.com/api/v1/widget/accounts/${s}`, j => j && Array.isArray(j.jobs) ? j.jobs.map(x => x.title) : null],
];
const trouves = new Map(), cors = new Map();
for (const nom of echantillon.slice(0, 40)){
  for (const s of slugs(nom).slice(0, 2)){
    for (const [ats, url, lire] of ATS){
      const r = await depuisPage(url(s), { ms: 8000 });
      cors.set(ats, (cors.get(ats) || { ok: 0, bloque: 0 }));
      if (r.statut) cors.get(ats).ok++; else cors.get(ats).bloque++;
      const titres = r.ok && r.json ? lire(r.json) : null;
      if (titres && titres.length){
        trouves.set(nom + ' @' + ats, titres);
        console.log(`✓ ${nom} → ${ats} « ${s} » : ${titres.length} offre(s) · ${titres.slice(0, 4).join(' | ').slice(0, 200)}`);
      }
    }
    await pause(150);
  }
}
const alternance = [...trouves.values()].flat().filter(t => /altern|apprenti|stage|intern/i.test(t)).length;
console.log(`BILAN ④ : ${echantillon.length} entreprises, ${trouves.size} tableaux d’offres trouvés · offres alternance/stage : ${alternance}`);
console.log('   CORS par service (réponse lisible / refusée) :', [...cors].map(([k, v]) => `${k} ${v.ok}/${v.bloque}`).join(' · '));

/* ---------- ⑤ un domaine, donc un site ---------- */
console.log('\n⑤ UN SITE, PAR L’AUTOCOMPLÉTION (Clearbit)\n');
let dom = 0, lu = 0;
for (const nom of echantillon.slice(0, 25)){
  const r = await depuisPage('https://autocomplete.clearbit.com/v1/companies/suggest?query=' + encodeURIComponent(nom), { ms: 8000 });
  if (r.statut) lu++;
  const d = Array.isArray(r.json) && r.json[0] ? r.json[0] : null;
  if (d && d.domain) dom++;
  console.log(`${r.statut ? '·' : '✗'} ${nom} → ${r.statut || r.erreur} ${d ? d.name + ' · ' + d.domain : ''}`);
  await pause(200);
}
console.log(`BILAN ⑤ : ${dom}/${Math.min(25, echantillon.length)} domaines · ${lu} réponses lisibles depuis la page`);

const temoin = await page.evaluate(async () => { try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; } catch (e) { return 'coupé'; } });
console.log(`\nFIN · réseau ${temoin}`);
await browser.close();
server.close();

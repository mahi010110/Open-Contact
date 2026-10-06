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
   ② le centre de chaque ville que la barre connaît (geo.api.gouv.fr),
     pour chercher AUTOUR d'une ville plutôt que dans son département ;
   ③ ce que rend l'annuaire autour d'un point avec les filtres de l'app
     (métier, taille) : passent-ils, dans quel ordre, à quelle distance ;
   ④ les liens vers les offres (La bonne alternance, 1jeune1solution,
     France Travail) : quel format affiche vraiment des résultats.

   Premier relevé, le 6 octobre (dans l'historique du dépôt) : l'API
   apprentissage refuse toute page (aucun en-tête CORS, avec ou sans
   jeton) et ses conditions interdisent de diffuser un jeton ; aucune
   page carrières publique (Lever, Greenhouse, Recruitee, SmartRecruiters,
   Workable) chez 45 entreprises réelles ; l'autocomplétion de Clearbit
   ne répond plus. Ces trois pistes sont fermées.

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

/* ---------- ② les coordonnées des villes que la barre connaît ----------
   Pour chercher AUTOUR d'une ville plutôt que dans tout son département
   (« Lille » rendait Maubeuge et Dunkerque), l'app a besoin du centre de
   chaque ville — hors ligne, dans engine/lieux.js. On les relève une fois
   ici, au découpage officiel (geo.api.gouv.fr). */
console.log('② LE CENTRE DE CHAQUE VILLE (geo.api.gouv.fr)\n');
{
  const { VILLES } = await import('../../engine/lieux.js');
  const out = [], manquent = [];
  for (const v of VILLES){
    const u = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(v.nom)}&codeDepartement=${v.dept}&fields=nom,centre,population&boost=population&limit=3`;
    const r = await serveur(u, { accept: 'application/json' });
    let j = null; try { j = JSON.parse(r.txt); } catch (e) {}
    const plie = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/-/g, ' ');
    const c = Array.isArray(j) ? (j.find(x => plie(x.nom) === plie(v.nom)) || j[0]) : null;
    if (c && c.centre && c.centre.coordinates){
      const [lng, lat] = c.centre.coordinates;
      out.push(`${v.nom}:${lat.toFixed(3)},${lng.toFixed(3)}`);
    } else manquent.push(v.nom + ':' + v.dept);
    await pause(60);
  }
  for (let k = 0; k < out.length; k += 8) console.log('COORD ' + out.slice(k, k + 8).join('|'));
  console.log(`BILAN ② : ${out.length}/${VILLES.length} villes · sans centre : ${manquent.join(', ') || 'aucune'}\n`);
}

/* ---------- ③ autour d'un point, avec les filtres de l'app ---------- */
console.log('③ AUTOUR D’UNE VILLE (/near_point) — les filtres passent-ils, dans quel ordre ?\n');
const AN = 'https://recherche-entreprises.api.gouv.fr';
const CENTRES = [['Lille', 50.632, 3.058], ['Lyon', 45.758, 4.835], ['Marseille', 43.296, 5.37], ['Roubaix', 50.69, 3.18]];
const RESEAU = '62.02A,62.03Z,62.09Z,61.10Z,46.51Z';
const DEV = '62.01Z,58.29C,62.02A';
const km = (a, b, c, d) => { const R = 6371, t = x => x * Math.PI / 180; const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
for (const [ville, lat, lng] of CENTRES){
  for (const [lib, codes] of [['réseau', RESEAU], ['dev', DEV]]){
    for (const tr of ['', '&tranche_effectif_salarie=11,12,21,22,31,32']){
      const u = `${AN}/near_point?lat=${lat}&long=${lng}&radius=15&activite_principale=${codes}&etat_administratif=A&est_entrepreneur_individuel=false&per_page=12${tr}`;
      const r = await depuisPage(u);
      const j = r.json || {};
      const lignes = (j.results || []).map(x => {
        const e = (x.matching_etablissements || [])[0] || {};
        const d = e.latitude ? km(lat, lng, +e.latitude, +e.longitude).toFixed(1) : '?';
        return `${(x.nom_raison_sociale || x.nom_complet || '').slice(0, 34)} [${x.tranche_effectif_salarie || '∅'}·${x.activite_principale}] ${e.libelle_commune || '?'} ${d} km`;
      });
      console.log(`— ${ville} · ${lib}${tr ? ' · 10-499' : ''} : ${r.statut} · total ${j.total_results ?? '?'} · ${r.ms} ms${r.erreur ? ' · ' + r.erreur : ''}`);
      for (const l of lignes) console.log('    ' + l);
      await pause(1300);
    }
  }
}

/* ---------- ④ les liens vers les offres : quel format s'affiche vraiment ? ---------- */
console.log('\n④ LES LIENS VERS LES OFFRES (la page rendue, dans un vrai navigateur)\n');
const LIENS = [
  ['LBA /recherche', 'https://labonnealternance.apprentissage.beta.gouv.fr/recherche?romes=M1801,M1810&lat=50.632&lon=3.058&radius=30&job_name=Administration%20r%C3%A9seau&address=Lille'],
  ['LBA /recherche-emploi', 'https://labonnealternance.apprentissage.beta.gouv.fr/recherche-emploi?romes=M1801,M1810&lat=50.632&lon=3.058&radius=30&job_name=Administration%20r%C3%A9seau&address=Lille'],
  ['LBA /recherche-apprentissage', 'https://labonnealternance.apprentissage.beta.gouv.fr/recherche-apprentissage?romes=M1801,M1810&lat=50.632&lon=3.058&radius=30&job_name=Administration%20r%C3%A9seau&address=Lille'],
  ['LBA recruteur SIRET inconnu', 'https://labonnealternance.apprentissage.beta.gouv.fr/emploi/recruteurs_lba/00000000000000/x'],
  ['1j1s apprentissage', 'https://www.1jeune1solution.gouv.fr/apprentissage?libelleMetier=Administration%20r%C3%A9seau&codeRomes=M1801&libelleCommune=Lille&latitudeCommune=50.632&longitudeCommune=3.058&distanceCommune=30'],
  ['1j1s stages', 'https://www.1jeune1solution.gouv.fr/stages?motCle=informatique&libelleLocalisation=Lille%20(59000)&codeLocalisation=59350&typeLocalisation=COMMUNE'],
  ['France Travail alternance', 'https://candidat.francetravail.fr/offres/recherche?motsCles=informatique&lieux=59350&natureOffre=E2&offresPartenaires=true&rayon=10&tri=0'],
  ['France Travail entreprise', 'https://candidat.francetravail.fr/offres/recherche?motsCles=Capgemini%20alternance&offresPartenaires=true'],
  ['France Travail entreprise+lieu', 'https://candidat.francetravail.fr/offres/recherche?motsCles=Capgemini&lieux=59D&offresPartenaires=true']
];
{
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } });
  const p2 = await ctx.newPage();
  for (const [nom, u] of LIENS){
    let statut = 0;
    try {
      const res = await p2.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      statut = res ? res.status() : 0;
      await p2.waitForTimeout(9000);
      const t = await p2.evaluate(() => ({ titre: document.title, url: location.href,
        texte: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 2000) }));
      const comptes = (t.texte.match(/\d[\d\s]*\s*(offres?|entreprises?|résultats?|stages?|formations?|alternances?)\b[^.]{0,40}/gi) || []).slice(0, 6);
      console.log(`— ${nom} : ${statut} · « ${t.titre.slice(0, 80)} » · ${t.url === u ? 'même adresse' : 'redirigé → ' + t.url.slice(0, 160)}`);
      console.log(`    comptes : ${comptes.join(' | ') || '—'}`);
      console.log(`    texte : ${t.texte.slice(0, 420)}`);
    } catch (e){ console.log(`— ${nom} : ${statut} · ✗ ${String(e.message || e).slice(0, 140)}`); }
  }
  await ctx.close();
}

const temoin = await page.evaluate(async () => { try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; } catch (e) { return 'coupé'; } });
console.log(`\nFIN · réseau ${temoin}`);
await browser.close();
server.close();

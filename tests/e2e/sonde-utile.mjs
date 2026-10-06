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
   ② le lien « Offres d'alternance autour de … » que l'app construit
     (La bonne alternance), métier par métier : la page rendue montre-t-elle
     des offres ?

   Relevés du 6 octobre (dans l'historique du dépôt) : le centre des
   villes (geo.api.gouv.fr, posé dans engine/lieux.js) ; `/near_point`
   garde le métier mais IGNORE la taille ; l'API
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
    /* comme l'écran : la ville tapée est le point de référence */
    const lieu = interp.etiquettes.find(e => e.famille === 'lieu' && Array.isArray(e.centre));
    const userPos = lieu ? { lat: lieu.centre[0], lng: lieu.centre[1] } : null;
    const listes = [], bruts = {};
    for (const [k, u] of urls.entries()){
      if (k) await new Promise(ok => setTimeout(ok, 1200));
      let res = await fetch(u);
      if (res.status === 429){ await new Promise(ok => setTimeout(ok, 2500)); res = await fetch(u); }
      const j = res.ok ? await res.json() : { results: [] };
      for (const x of j.results || []) bruts[x.siren] = x;
      listes.push(A.lireAnnuaire(j, { userPos }));
    }
    const d = A.decouvertes(listes, [], { genres: urls.map(A.genreQuestion), userPos, loin: userPos ? A.LOIN_KM : 0 });
    return {
      etiquettes: interp.etiquettes.map(e => e.famille + ':' + e.cle), urls: urls.map(u => decodeURIComponent(u.split('?')[1] || '')),
      top: d.slice(0, 12).map(x => {
        const b = bruts[x.siren] || {};
        const s = b.siege || {};
        return { nom: x.nom, sigle: x.sigle, commercial: s.nom_commercial || '', enseignes: (s.liste_enseignes || []).join('/'),
          naf: x.naf, act: x.activite, tranche: x.tranche, ville: x.ville + (x.distance != null ? ' ' + x.distance.toFixed(1) + ' km' : ''), employeur: x.employeur, nature: b.nature_juridique,
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

/* ---------- ② qui recrute en alternance : le lien de l'app, métier par métier ---------- */
console.log('② LES OFFRES D’ALTERNANCE — le lien que l’app construit, rendu dans un vrai navigateur\n');
{
  const LIENS = await page.evaluate(async () => {
    const R = await import('./engine/requete.js');
    const A = await import('./engine/annuaire.js');
    return ['alternance réseau Lille', 'alternance développeur Lyon', 'alternance cybersécurité Lille',
            'alternance support Marseille', 'alternance cloud Nantes', 'alternance Rennes']
      .map(q => [q, (A.offresAlternance(R.interpreter(q, R.contexteRecherche([])), {}) || {}).url]);
  });
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } });
  const p2 = await ctx.newPage();
  for (const [q, u] of LIENS){
    if (!u){ console.log(`— « ${q} » : pas de lien`); continue; }
    try {
      const res = await p2.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await p2.waitForTimeout(9000);
      const t = await p2.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500));
      const compte = (t.match(/\d[\d\s]*\s*offres? en alternance[^.]{0,60}/i) || [''])[0];
      const vide = /aucun(e)? (résultat|offre)/i.test(t);
      console.log(`— « ${q} » : ${res ? res.status() : 0} · ${compte || (vide ? 'AUCUNE offre' : '?')}`);
      console.log(`    ${t.slice(t.indexOf('disponibles') > 0 ? t.indexOf('disponibles') : 0, (t.indexOf('disponibles') > 0 ? t.indexOf('disponibles') : 0) + 300)}`);
    } catch (e){ console.log(`— « ${q} » : ✗ ${String(e.message || e).slice(0, 140)}`); }
  }
  await ctx.close();
}

const temoin = await page.evaluate(async () => { try { await fetch('https://example.com/', { mode: 'no-cors' }); return 'réseau'; } catch (e) { return 'coupé'; } });
console.log(`\nFIN · réseau ${temoin}`);
await browser.close();
server.close();

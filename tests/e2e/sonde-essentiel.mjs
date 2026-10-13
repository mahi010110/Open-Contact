/* ============================================================
   OpenContact — sonde : L'ESSENTIEL D'UNE ENTREPRISE
   (retour du mainteneur, 13 octobre 2026 : « "À découvrir" est encore
   trop gadget — avoir exactement les besoins de l'entreprise et plus
   d'infos sur elle » ; choisis : ses offres en cours, ce qu'elle fait
   vraiment, sa santé et sa taille, qui contacter, « et toutes les bonnes
   informations, cherche les autres sources »)

   `sonde-utilite.mjs` a déjà relevé ce qui existe (comptes, BODACC
   vivant, Wikidata, commande publique, Egapro). Celle-ci relève ce qu'il
   faut pour ÉCRIRE le moteur sans rien deviner :

   ① EGAPRO : la réponse ENTIÈRE de `api/search`, depuis une page (CORS),
     et sa couverture sur les entreprises qui disent l'avoir déclaré ;
   ② LE BODACC VIVANT : chaque annonce de 24 mois classée par les règles
     que le moteur emploiera, avec son texte — pour relire à l'œil
     qu'aucune n'est mal comprise (une cession n'est pas un rachat) ;
   ③ LES COMPTES : l'année la plus récente, le chiffre d'affaires et le
     résultat — combien en ont, combien sont à zéro ;
   ④ SES OFFRES : une recherche d'offres au NOM de l'entreprise rend-elle
     des offres de CETTE entreprise ? France Travail, HelloWork, LinkedIn,
     Welcome to the Jungle, Indeed, chargés comme une page : c'est un lien
     qu'on ouvrirait, pas une lecture de l'app.

   INFORMATIVE : elle relève, elle ne fait pas rougir la CI.
   ============================================================ */
import http from 'http';
import { chromium, chromiumPath } from './outils.mjs';

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
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), o.ms || 20000);
    const res = await fetch(u, { headers: { accept: 'application/json' }, signal: ctl.signal });
    clearTimeout(t);
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { ok: res.ok, statut: res.status, json, debut: txt.slice(0, 300) };
  } catch (e){ return { ok: false, statut: 0, erreur: String(e && e.message || e) }; }
}, [url, o]);
const court = (x, n = 300) => String(JSON.stringify(x) ?? '').slice(0, n);

/* l'échantillon : de vraies entreprises du numérique, de la PME au groupe */
const AN = 'https://recherche-entreprises.api.gouv.fr/search';
const ech = [];
for (const f of ['departement=59&tranche_effectif_salarie=11,12,21,22', 'departement=59&tranche_effectif_salarie=31,32,41,42,51,52',
                 'departement=69&tranche_effectif_salarie=21,22,31,32', 'departement=33&tranche_effectif_salarie=11,12,21,22,31']){
  const r = await depuisPage(`${AN}?activite_principale=62.01Z,62.02A,62.03Z,62.09Z,63.11Z,58.29C&${f}&etat_administratif=A&est_entrepreneur_individuel=false&per_page=10`);
  for (const x of (r.json && r.json.results) || []) ech.push(x);
  await pause(1300);
}
console.log(`ÉCHANTILLON : ${ech.length} entreprises\n`);

/* ---------- ① Egapro ---------- */
console.log('① EGAPRO — la réponse entière, depuis une page\n');
{
  const declarees = ech.filter(x => x.complements && x.complements.egapro_renseignee === true);
  let trouves = 0, avecNote = 0;
  for (const [i, x] of declarees.slice(0, 15).entries()){
    const r = await depuisPage(`https://egapro.travail.gouv.fr/api/search?q=${x.siren}`);
    const d = (r.json && Array.isArray(r.json.data)) ? r.json.data : [];
    const moi = d.find(e => e && e.entreprise && String(e.entreprise.siren) === String(x.siren));
    if (moi) trouves++;
    if (moi && (moi.notes || moi.note)) avecNote++;
    if (i < 3) console.log(`   ${x.nom_complet} → ${r.statut} ${r.erreur || ''}\n   ${court(r.json || r.debut, 2500)}\n`);
    await pause(300);
  }
  console.log(`   déclarées dans l'annuaire : ${declarees.length}/${ech.length} · trouvées dans Egapro : ${trouves}/${Math.min(15, declarees.length)} · avec une note : ${avecNote}`);
}

/* ---------- ② le BODACC vivant, classé comme le moteur le fera ---------- */
console.log('\n② LE BODACC — chaque annonce de 24 mois, classée\n');
{
  const B = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';
  const DEPUIS = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);
  /* les règles candidates — l'ordre compte : la première qui parle gagne */
  const REGLES = [
    ['nouvel établissement', a => a.familleavis === 'creation' || /cr[ée]ation d'un [ée]tablissement|ouverture d'un [ée]tablissement/i.test(texte(a))],
    ['rachète une activité', a => a.familleavis === 'vente' && /fonds acquis|acquis par achat/i.test(texte(a)) && /listeprecedentproprietaire/.test(JSON.stringify(Object.keys(a)))],
    ['fusion', a => /fusion|absorb/i.test(texte(a))],
    ['nouvelle direction', a => a.familleavis === 'modification' && /administration|dirigeant|g[ée]rant|pr[ée]sident/i.test(texte(a))],
    ['déménage son siège', a => a.familleavis === 'modification' && /transfert du si[èe]ge|si[èe]ge social/i.test(texte(a))],
    ['nouvelle activité', a => a.familleavis === 'modification' && /activit[ée]/i.test(texte(a))]
  ];
  function texte(a){
    return ['modificationsgenerales', 'acte', 'listeetablissements', 'listeprecedentproprietaire']
      .map(k => a[k]).filter(Boolean).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' ');
  }
  const par = {}, exemples = {};
  let lues = 0, avecUn = 0, nonClasses = 0;
  for (const x of ech.slice(0, 30)){
    const r = await depuisPage(`${B}?where=${encodeURIComponent(`registre like "${x.siren}" and dateparution >= date'${DEPUIS}'`)}&order_by=dateparution%20desc&limit=30`);
    if (!r.ok){ console.log('   BODACC', r.statut, r.erreur || r.debut); continue; }
    lues++;
    let un = false;
    for (const a of (r.json && r.json.results) || []){
      if (a.familleavis === 'dpc') continue;
      const regle = REGLES.find(([, f]) => f(a));
      if (!regle){ nonClasses++; if (nonClasses <= 6) console.log(`   ? ${x.nom_complet} · ${a.dateparution} · ${a.familleavis} · ${texte(a).slice(0, 200)}`); continue; }
      un = true;
      par[regle[0]] = (par[regle[0]] || 0) + 1;
      (exemples[regle[0]] = exemples[regle[0]] || []).push(`${x.nom_complet} · ${a.dateparution} · ${a.familleavis} · ${texte(a).slice(0, 220)}`);
    }
    if (un) avecUn++;
    await pause(400);
  }
  console.log(`   ${lues} lues · au moins un événement : ${avecUn} · par règle : ${court(par)} · non classées : ${nonClasses}`);
  for (const [k, l] of Object.entries(exemples)){
    console.log(`\n   « ${k} » — ${l.length} annonce(s) :`);
    for (const e of l.slice(0, 5)) console.log('     · ' + e);
  }
}

/* ---------- ③ les comptes ---------- */
console.log('\n③ LES COMPTES — l’année la plus récente\n');
{
  const annees = {};
  let avec = 0, caZero = 0, benef = 0, perte = 0;
  for (const x of ech){
    const f = x.finances || {};
    const ans = Object.keys(f).filter(a => /^\d{4}$/.test(a)).sort();
    if (!ans.length) continue;
    avec++;
    const a = ans[ans.length - 1];
    annees[a] = (annees[a] || 0) + 1;
    const d = f[a] || {};
    if (!d.ca) caZero++;
    if (typeof d.resultat_net === 'number') d.resultat_net >= 0 ? benef++ : perte++;
  }
  console.log(`   ${avec}/${ech.length} avec des comptes · année : ${court(annees)} · CA nul ou absent ${caZero} · bénéficiaires ${benef} · en perte ${perte}`);
}

/* ---------- ④ ses offres, au nom de l'entreprise ----------
   Aucune source d'offres ne se lit depuis une page sans clé (La bonne
   alternance demande un jeton, les ATS publics ne couvrent que 2 sur 45).
   Reste un LIEN qu'on ouvrirait : il ne vaut que si la page d'arrivée
   montre les offres de CETTE entreprise, pas tout ce qui contient son nom.
   Chaque site est chargé comme un navigateur le ferait, et on relève le
   nombre annoncé, la part des premières offres qui citent l'entreprise,
   et un extrait à relire à l'œil. */
console.log('\n④ SES OFFRES — une recherche au nom de l’entreprise, site par site\n');
{
  const plier = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const SITES = [
    ['France Travail', n => `https://candidat.francetravail.fr/offres/recherche?motsCles=${encodeURIComponent(n)}`],
    ['HelloWork', n => `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${encodeURIComponent(n)}`],
    ['LinkedIn', n => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(n)}&location=France`],
    ['Welcome to the Jungle', n => `https://www.welcometothejungle.com/fr/jobs?query=${encodeURIComponent(n)}`],
    ['Indeed', n => `https://fr.indeed.com/emplois?q=${encodeURIComponent(n)}`]
  ];
  const noms = ['Sopra Steria', 'Advens', 'Inetum', 'Keyrus', 'Scalian', 'Cofidoc'];
  for (const x of ech.filter(x => ['21', '22', '31', '32', '41', '42'].includes(String(x.tranche_effectif_salarie))).slice(0, 4))
    noms.push(x.nom_raison_sociale || x.nom_complet);
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const p2 = await ctx.newPage();
  const bilan = {};
  for (const [site, url] of SITES){
    console.log(`— ${site}`);
    for (const nom of noms){
      const cle = plier(nom).split(/\s+/)[0];
      try {
        const res = await p2.goto(url(nom), { waitUntil: 'domcontentloaded', timeout: 25000 });
        await p2.waitForTimeout(5000);
        const t = await p2.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
        const n = (t.match(/(\d[\d\s.]*)\s*(offres?|emplois?|résultats?|jobs?)\b/i) || [])[0] || '?';
        const occ = plier(t).split(cle).length - 1;
        const i = plier(t).indexOf(cle);
        const extrait = i < 0 ? '' : t.slice(Math.max(0, i - 80), i + 120);
        (bilan[site] = bilan[site] || []).push(occ);
        console.log(`   ${nom} → ${res ? res.status() : 0} · « ${n.trim()} » · « ${cle} » cité ${occ} fois · ${extrait}`);
      } catch (e){ console.log(`   ${nom} → ✗ ${String(e.message || e).slice(0, 120)}`); }
      await pause(800);
    }
  }
  console.log('\n   bilan (citations du nom par recherche) : ' + court(bilan, 800));
  await ctx.close();
}

await browser.close();
server.close();
console.log('\nFIN');

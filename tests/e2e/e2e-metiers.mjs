/* ============================================================
   E2E — tous les métiers (lot R9-b, ouvert en 7.0.0)
   (docs/propositions/R9-tous-les-metiers.md)

   LA FUITE D'ABORD : ce qui part vers l'annuaire pour un métier du ROME
   est une SECTION d'activité (une lettre), jamais un mot de ton profil —
   « BTS MCO » ne quitte pas le téléphone. Puis :
   ① la table se lit au calme ; « aide-soignante alternance
     Lyon » devient trois étiquettes, le métier avec sa fiche ;
     « À découvrir » demande la santé (Q) autour de Lyon, et « Offres
     d'alternance » part avec le code ROME du métier ;
   ② ce que la barre comprenait ne change pas : « cyber Lille » demande
     les mêmes codes qu'avant, « Orange » reste du texte ;
   ③ ton profil « BTS MCO » ajoute son étiquette (« BTS MCO ») et ses
     secteurs, sans un mot de plus ;
   ④ elle ne se lit pas au démarrage : rien dans la première seconde,
     puis au calme, trois secondes après l'ouverture ;
   pouce et poste ; zéro erreur console.
   Trois mutations : un mot du profil qui part vers l'annuaire, les
   sections oubliées, une appellation posée AVANT les villes.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, sourcesCarteMuettes, relaisMuets, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

/* « Berger » a déclaré y être passé : son nom est AUSSI une appellation
   du ROME (A1410). Tapé, il désigne la personne — le nom tiré des pistes
   passe avant la table, qui ne vient qu'en dernier */
const PISTES = [{ id: 'a', name: 'Pharmacie du Centre', city: 'Lyon', status: 'todo', updatedAt: 2 },
                { id: 'b', name: 'Orange', city: 'Lille', status: 'todo', updatedAt: 1 },
                { id: 'c', name: 'Ferme des Prés', city: 'Lille', status: 'todo', vecu: 'stage', vecuQui: 'Berger', updatedAt: 0 }];
/* une réponse de l'annuaire : le lien des offres suit la liste */
const CLINIQUE = { siren: '851234567', nom_complet: 'CLINIQUE DU PARC', nom_raison_sociale: 'CLINIQUE DU PARC', sigle: null,
  activite_principale: '86.10Z', section_activite_principale: 'Q', categorie_entreprise: 'PME', tranche_effectif_salarie: '22',
  date_creation: '2001-03-12', nombre_etablissements_ouverts: 1,
  siege: { est_siege: true, numero_voie: '4', type_voie: 'RUE', libelle_voie: 'DU PARC', code_postal: '69003',
           libelle_commune: 'LYON', latitude: '45.76', longitude: '4.85', etat_administratif: 'A' },
  matching_etablissements: [{ adresse: '4 RUE DU PARC 69003 LYON', code_postal: '69003', libelle_commune: 'LYON',
           latitude: '45.76', longitude: '4.85', etat_administratif: 'A' }], dirigeants: [] };
const PROFIL = { name: 'Inès Martin', formation: 'BTS MCO', recherche: 'alternance', ville: 'Lille', rayon: 15,
                 email: 'ines@exemple.test' };

async function ecran(nom, { vp = { width: 390, height: 844 }, mutations = {}, profil = PROFIL } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, serviceWorkers: 'block' });
  const journal = [], fichiers = [];
  await ctx.route('https://recherche-entreprises.api.gouv.fr/**', r => { journal.push(r.request().url());
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ results: [CLINIQUE], total_results: 1, page: 1, per_page: 10 }) }); });
  await sourcesCarteMuettes(ctx); await relaisMuets(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('request', r => { if (/metiers-donnees\.js/.test(r.url())) fichiers.push(r.url()); });
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/pistes');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([ps, pr]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [PISTES, profil]);
  fichiers.length = 0;
  await p.reload();
  await p.waitForSelector('#piQ');
  return { ctx, p, journal, fichiers };
}
/* la table est-elle lue ? (elle se lit au calme, trois secondes après) */
const tablePrete = p => p.waitForFunction(async () => !!(await import('./ui/metiers.js')).metiersPrets(), null, { timeout: 9000 })
  .then(() => true, () => false);
const taper = async (p, txt) => { await p.fill('#piQ', ''); await p.click('#piQ'); await p.keyboard.type(txt, { delay: 5 }); await p.waitForTimeout(250); };
const etiquettes = p => p.evaluate(() => [...document.querySelectorAll('#piChips .et-chip')].map(n => n.textContent.trim()));
const versDecouvrir = async p => {
  await p.click('#piPortee [data-portee="decouvrir"]');
  await p.waitForSelector('#piDec .dc-vue', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(1600);
};
const params = u => Object.fromEntries(new URL(u).searchParams);
const plie = s => decodeURIComponent(s).toLowerCase();

/* ---------- ① et la fuite d'abord ---------- */
async function jouer(o = {}){
  const { ctx, p, journal, fichiers } = await ecran(o.nom || 'metiers', o);
  const prete = await tablePrete(p);
  await taper(p, 'aide-soignante alternance Lyon');
  const et = await etiquettes(p);
  const icone = await p.evaluate(() => !!document.querySelector('#piChips .et-chip .ic')?.style.maskImage.includes('clipboard')
    || [...document.querySelectorAll('#piChips .et-chip .ic')].some(i => /clipboard/.test(i.outerHTML)));
  await versDecouvrir(p);
  const q1 = journal.slice();
  const offre = await p.evaluate(() => document.querySelector('.dc-offres')?.href || '');
  if (o.shot) await p.screenshot({ path: `${SHOTS}/r9-metiers-${o.shot}.png` });
  /* ③ la barre vide, « À découvrir » ouvert : le profil ajoute sa formation */
  journal.length = 0;
  await p.fill('#piQ', ''); await p.waitForTimeout(1800);
  const profil = await p.evaluate(() => document.querySelector('[data-dc-pf="metier"]')?.textContent.trim() || '');
  const q3 = journal.slice();
  if (o.shot) await p.screenshot({ path: `${SHOTS}/r9-metiers-profil-${o.shot}.png` });
  /* ② ce que la barre comprenait */
  journal.length = 0;
  await taper(p, 'cyber Lille'); await p.waitForTimeout(1800);
  const q2 = journal.slice();
  await taper(p, 'Orange');
  const orange = await etiquettes(p);
  /* un nom des pistes qui est aussi un métier : la personne d'abord */
  await taper(p, 'Berger');
  const berger = await p.evaluate(() => [...document.querySelectorAll('#piChips .et-chip')].map(n =>
    n.textContent.trim() + ':' + ((n.querySelector('.ic')?.getAttribute('style') || '').match(/icons\/([\w-]+)\.svg/) || [])[1]).join(' | '));
  await ctx.close();
  return { prete, et, icone, q1, offre, profil, q3, q2, orange, berger, fichiers };
}
const fuite = r => [...r.q1, ...r.q3, ...r.q2].map(plie).filter(u => /mco|bts|ines|martin|exemple/.test(u));
const r = await jouer({ shot: 'pouce' });
ok(!fuite(r).length, 'LA FUITE D’ABORD : rien du profil vers l’annuaire — ni « BTS MCO », ni ton nom' + (fuite(r).length ? ' — ' + fuite(r)[0] : ''));
ok(r.prete, '① la table du ROME se lit au calme, lot ouvert');
ok(r.et.join(' | ') === 'Aide-soignante | Alternance | Lyon', '① « aide-soignante alternance Lyon » : trois étiquettes — ' + r.et.join(' | '));
const p1 = r.q1.map(params);
ok(p1.length && p1.every(x => x.section_activite_principale === 'Q' && !x.activite_principale),
   '① « À découvrir » demande la santé (Q), et aucun code du numérique — ' + p1.map(x => x.section_activite_principale + '/' + (x.activite_principale || '')).join(', '));
ok(/romes=J1501/.test(r.offre) && /job_name=Aide-soignante/.test(r.offre), '① « Offres d’alternance » part avec le code du métier — ' + decodeURIComponent(r.offre).replace(/^.*\?/, ''));
ok(r.profil === 'BTS MCO' && r.q3.map(params).some(x => /G/.test(x.section_activite_principale || '') && !x.q),
   `③ ton profil « BTS MCO » ajoute son étiquette et ses secteurs — « ${r.profil} », ${r.q3.map(params).map(x => x.section_activite_principale).join(', ')}`);
const p2 = r.q2.map(params);
ok(p2.length && p2.every(x => /62\.0/.test(x.activite_principale || '') && !x.section_activite_principale),
   '② « cyber Lille » : les codes du numérique, comme avant — ' + p2.map(x => x.activite_principale).join(' / '));
ok(!r.orange.length, '② « Orange » reste du texte');
ok(r.berger === 'Berger:user', '② « Berger », qui y est passé, reste une personne — pas le métier de berger — ' + r.berger);
{
  const s = await jouer({ nom: 'metiers-poste', vp: { width: 1280, height: 800 }, shot: 'poste' });
  ok(s.et.join(' | ') === 'Aide-soignante | Alternance | Lyon' && /romes=J1501/.test(s.offre) && !fuite(s).length,
     '① au poste : les mêmes étiquettes, la même offre, rien du profil');
}

/* ---------- ④ pas au démarrage ---------- */
{
  const { ctx, p, fichiers } = await ecran('demarrage');
  await p.waitForTimeout(1000);
  const tot = fichiers.length;
  await p.waitForTimeout(3000);
  const tard = fichiers.length;
  await ctx.close();
  ok(!tot && tard === 1, `④ la table ne se lit pas au démarrage : ${tot} lecture la première seconde, ${tard} au calme`);
}

/* ---------- les mutations : chaque garde doit rougir ---------- */
async function muter(nom, f, avant, apres, rejouer, rougit){
  const src = await readFile(path.join(ROOT, f), 'utf8');
  if (!src.includes(avant)){ ko++; console.log(`ÉCHEC — mutation ${nom} : le texte visé n’existe plus dans ${f}`); return; }
  console.log(`mutation ${nom} : le fichier servi est bien modifié ✓`);
  const x = await rejouer({ [f]: src.split(avant).join(apres) });
  ok(rougit(x), `mutation ${nom} : la garde rougit`);
}
await muter('① un mot du profil qui part vers l’annuaire', 'engine/annuaire.js',
  'else if (!NAF_METIER[e.cle] && e.sections) for (const x of String(e.sections)) sections.add(x);',
  'else if (!NAF_METIER[e.cle] && e.sections){ for (const x of String(e.sections)) sections.add(x); p.set("q", e.label); }',
  m => jouer({ nom: 'mut-fuite', mutations: m }), x => fuite(x).length > 0);
await muter('② les sections oubliées', 'engine/annuaire.js',
  'else if (!NAF_METIER[e.cle] && e.sections) for (const x of String(e.sections)) sections.add(x);', '',
  m => jouer({ nom: 'mut-sections', mutations: m }), x => !x.q1.map(params).every(y => y.section_activite_principale === 'Q'));
await muter('③ une appellation posée avant les villes', 'engine/requete.js',
  '  if (metiers) for (const [forme, e] of metiers.formes) poser(forme, e);\n  memo = { cle, dict };',
  '  memo = { cle, dict };',
  async m => {
    /* la mutation : les appellations passent DEVANT tout — on les pose en tête */
    return jouer({ nom: 'mut-ordre', mutations: { 'engine/requete.js': m['engine/requete.js'].replace(
      "  const poser = (phrase, e) => { const k = cleDe(phrase); if (k && !dict.has(k)) dict.set(k, e); };",
      "  const poser = (phrase, e) => { const k = cleDe(phrase); if (k && !dict.has(k)) dict.set(k, e); };\n  if (metiers) for (const [forme, e] of metiers.formes) poser(forme, e);") } });
  }, x => x.berger !== 'Berger:user');

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E métiers : ${ko} ÉCHEC(S)` : '\nE2E métiers : OK');
process.exit(ko ? 1 : 0);

/* ============================================================
   OpenContact — sonde : TOUS LES MÉTIERS (lot R9-b)
   (docs/propositions/R9-tous-les-metiers.md)

   Avant d'embarquer une table de métiers, on RELÈVE ce que disent les
   fichiers ouverts, jamais supposé (§6, « À découvrir ») :
   ① le ROME 4.0 de France Travail (data.gouv.fr) : les ressources, leur
     format, leur licence ; les métiers, les appellations, les grands
     domaines ;
   ② le RNCP de France Compétences (data.gouv.fr) : l'export ouvert
     porte-t-il les codes ROME de chaque certification, et pour quelle
     part des diplômes courants (BTS, BUT, CAP, bac pro) ?
   Elle parle au monde réel, côté CI seulement : l'app, elle, n'ira
   jamais chercher ces fichiers (invariant ④). INFORMATIVE : elle relève,
   elle ne fait pas rougir la CI.
   ============================================================ */
import { mkdtemp, writeFile, readdir, stat, readFile } from 'fs/promises';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';

const API = 'https://www.data.gouv.fr/api/1/datasets/';
const JEUX = { rome: '58da857388ee384902e505f5', rncp: '5eebbc067a14b6fecc9c9976' };
const MAX_OCTETS = 400 * 1024 * 1024;
const dossier = await mkdtemp(path.join(tmpdir(), 'metiers-'));

const lireJson = async u => { const r = await fetch(u, { headers: { accept: 'application/json' } }); return r.ok ? r.json() : null; };
async function telecharger(u, nom){
  const r = await fetch(u, { redirect: 'follow' });
  if (!r.ok) return { erreur: 'HTTP ' + r.status };
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_OCTETS) return { erreur: 'trop gros : ' + buf.length };
  const f = path.join(dossier, nom);
  await writeFile(f, buf);
  return { f, octets: buf.length, type: r.headers.get('content-type') || '' };
}
async function fichiers(d){
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })){
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...await fichiers(p)); else out.push(p);
  }
  return out;
}
const tete = async (f, n = 4) => (await readFile(f, 'latin1')).split(/\r?\n/).slice(0, n).map(l => l.slice(0, 400));

for (const [cle, id] of Object.entries(JEUX)){
  console.log(`\n━━━ ${cle.toUpperCase()} (${id}) ━━━`);
  const j = await lireJson(API + id + '/');
  if (!j){ console.log('  jeu de données illisible'); continue; }
  console.log(`  titre : ${j.title}\n  licence : ${j.license}\n  mis à jour : ${j.last_update || j.last_modified}`);
  /* le plus récent d'abord, et dix lignes au plus : le RNCP publie un
     export par jour depuis 2020, sa liste entière noyait tout le reste
     du journal (premier passage, 20 octobre) */
  const res = (j.resources || []).slice()
    .sort((a, b) => String(b.last_modified || '').localeCompare(String(a.last_modified || '')));
  console.log(`  ${res.length} ressources ; les plus récentes :`);
  for (const r of res.slice(0, 10))
    console.log(`  · ${r.title} | ${r.format} | ${r.filesize || '?'} o | ${String(r.last_modified || '').slice(0, 10)} | ${r.url}`);
  /* le ROME : ce qui est lisible (csv, json, zip, xlsx) ; le RNCP : son
     export CSV le plus récent seulement — l'XML pèse 476 Mo */
  const choisies = cle === 'rome'
    ? res.filter(r => /csv|json|zip|xlsx?/i.test(String(r.format || '') + ' ' + r.url)).slice(0, 6)
    : res.filter(r => /export-fiches-csv/i.test(String(r.title || '') + ' ' + r.url)).slice(0, 1);
  for (const r of choisies){
    const nom = cle + '-' + path.basename(new URL(r.url).pathname).replace(/[^\w.-]/g, '_');
    const t = await telecharger(r.url, nom);
    if (t.erreur){ console.log(`\n  ✗ ${nom} : ${t.erreur}`); continue; }
    console.log(`\n  ↓ ${nom} : ${t.octets} o, ${t.type}`);
    let liste = [t.f];
    if (/\.zip$/i.test(nom) || /zip/.test(t.type)){
      const d = path.join(dossier, nom + '.d');
      try { execFileSync('unzip', ['-o', '-q', t.f, '-d', d]); liste = await fichiers(d); }
      catch (e){ console.log('    unzip impossible'); continue; }
    }
    for (const f of liste.slice(0, 40)){
      const s = await stat(f);
      console.log(`    ▸ ${path.relative(dossier, f)} (${s.size} o)`);
      if (/\.(csv|txt|json)$/i.test(f) && s.size){
        const n = (await readFile(f, 'latin1')).split(/\r?\n/).filter(Boolean).length;
        console.log(`      ${n} lignes`);
        for (const l of await tete(f, cle === 'rome' ? 3 : 2)) console.log('      | ' + l);
      }
    }
  }
}

/* ② le RNCP : la part des diplômes courants qui portent un code ROME.
   Le fichier qui relie une fiche à ses codes ROME, s'il existe, se
   reconnaît à son en-tête. */
console.log('\n━━━ RNCP → ROME : ce que l\'export relie ━━━');
const tous = await fichiers(dossier);
const sep = l => (l.match(/;/g) || []).length >= (l.match(/,/g) || []).length ? ';' : ',';
for (const f of tous.filter(f => /rncp/i.test(f) && /\.csv$/i.test(f))){
  const lignes = (await readFile(f, 'utf8')).split(/\r?\n/).filter(Boolean);
  const s = sep(lignes[0]);
  const h = lignes[0].split(s).map(x => x.replace(/^"|"$/g, '').trim());
  const iRome = h.findIndex(x => /rome/i.test(x) && /code/i.test(x));
  if (iRome < 0) continue;
  console.log(`  ${path.basename(f)} : ${lignes.length - 1} lignes, colonnes ${h.join(' | ')}`);
  const iFiche = h.findIndex(x => /num.*fiche|fiche|rncp/i.test(x));
  const fiches = new Set(lignes.slice(1).map(l => l.split(s)[iFiche]).filter(Boolean));
  console.log(`    fiches avec au moins un code ROME : ${fiches.size}`);
}
const std = tous.find(f => /rncp/i.test(f) && /standard/i.test(f) && /\.csv$/i.test(f));
if (std){
  const lignes = (await readFile(std, 'utf8')).split(/\r?\n/).filter(Boolean);
  const s = sep(lignes[0]);
  const h = lignes[0].split(s).map(x => x.replace(/^"|"$/g, '').trim());
  console.log(`  ${path.basename(std)} : ${lignes.length - 1} fiches ; colonnes : ${h.join(' | ')}`);
  const iInt = h.findIndex(x => /intitul/i.test(x));
  const iAct = h.findIndex(x => /actif/i.test(x));
  for (const motif of [/^BTS\b/i, /^(BUT|Bachelor universitaire de technologie)\b/i, /^CAP\b/i, /^(Bac pro|Baccalauréat professionnel)\b/i]){
    const n = lignes.slice(1).filter(l => { const c = l.split(s); return motif.test((c[iInt] || '').replace(/^"/, '')) && (iAct < 0 || /actif|oui|true/i.test(c[iAct] || '')); }).length;
    console.log(`    ${motif.source} : ${n} fiches actives`);
  }
}
/* ③ L'ANNUAIRE ACCEPTE-T-IL PLUSIEURS SECTIONS ? Un métier du ROME
   s'exerce souvent dans deux (la coiffure : commerce G et services S) ;
   `questionsAnnuaire` les envoie séparées d'une virgule. Relevé, pas
   supposé : une section seule, puis deux, autour de Lille. */
console.log('\n━━━ Annuaire : plusieurs sections d\'une question ━━━');
const AN = 'https://recherche-entreprises.api.gouv.fr/search?departement=59&etat_administratif=A&est_entrepreneur_individuel=false&per_page=25&section_activite_principale=';
for (const sec of ['G', 'S', 'G,S', 'Q']){
  try {
    const r = await fetch(AN + sec, { headers: { accept: 'application/json' } });
    const j = r.ok ? await r.json() : null;
    const vues = new Set(((j && j.results) || []).map(x => x.section_activite_principale).filter(Boolean));
    console.log(`  ${sec.padEnd(4)} : HTTP ${r.status}, ${j ? j.total_results : '?'} résultats, sections rendues : ${[...vues].sort().join(',')}`);
  } catch (e){ console.log(`  ${sec} : ${e.message}`); }
  await new Promise(ok => setTimeout(ok, 400));
}
console.log('\nSonde métiers : relevé terminé');

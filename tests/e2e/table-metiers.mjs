/* ============================================================
   OpenContact — la table des métiers (lot R9-b)
   (docs/propositions/R9-tous-les-metiers.md)

   Fabrique `engine/metiers-donnees.js` à partir des fichiers ouverts que
   `sonde-metiers.mjs` a relevés le 20 octobre 2026 — jamais à la main :
   · le ROME 4.0 de France Travail, en CSV (Licence Ouverte) :
     `unix_referentiel_code_rome` (les fiches), `unix_cr_gd_dp` (leur
     grand domaine), `unix_arborescence_secteur_naf` (les divisions NAF
     où le métier s'exerce), `unix_referentiel_appellation` (les noms
     qu'on lui donne) ;
   · le RNCP de France Compétences, en CSV (Licence Ouverte 2.0) :
     `Standard` (les certifications, leur abrégé, actives ou non) et
     `Rome` (leurs codes ROME).

   RÉDUITE À CE QUI SERT :
   · une fiche = son nom, son grand domaine, les sections NAF de
     l'annuaire (A…U, tirées des divisions) ;
   · une appellation = son nom court et son code — seulement celles
     qu'on emploie (« peu usité » écarté), de cinq mots au plus par
     forme (la barre ne lit pas plus long), et jamais une qui heurterait
     ce que la barre comprend déjà : une ville, un département, une
     région, un statut, ce que tu cherches, un métier de l'informatique,
     un mot de liaison (la règle ① de la barre : mieux vaut ne pas
     comprendre que mal comprendre) ;
   · une formation = son abrégé (BTS, CAP…), son intitulé, son sigle
     (« Management commercial opérationnel » → MCO, comme l'écrit un
     étudiant), ses codes ROME — seulement les certifications ACTIVES
     des diplômes qu'un étudiant tape.

   Sortie : le module, et dans le journal ses chiffres, ses collisions
   et le module lui-même compressé (gzip, base64) entre deux bornes — la
   CI a le réseau, le poste du mainteneur et l'assistant non.
   Réseau sortant requis. `--ecrire` écrit le fichier dans le dépôt.
   ============================================================ */
import { mkdtemp, writeFile, readFile, readdir } from 'fs/promises';
import { execFileSync } from 'child_process';
import { gzipSync } from 'zlib';
import { createHash as hash } from 'crypto';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleDe, METIER, STATUT, RECH, TAILLE } from '../../engine/requete.js';
import { VILLES, DEPARTEMENTS, REGIONS } from '../../engine/lieux.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROME_CSV = 'https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/csv';
const RNCP_JEU = 'https://www.data.gouv.fr/api/1/datasets/5eebbc067a14b6fecc9c9976/';
const MOTS_MAX = 5;
/* les diplômes qu'un étudiant écrit dans « Formation » — l'abrégé du RNCP */
const DIPLOMES = new Set(['BTS', 'BTSA', 'BUT', 'DUT', 'CAP', 'CAPA', 'BAC PRO', 'BP', 'BPA', 'MC', 'TP', 'LP',
  'LICENCE PRO', 'DEUST', 'DN MADE', 'BMA', 'TH', 'TITRE PRO', 'CQP']);
/* une section NAF par division (nomenclature d'activités française, rév. 2) */
const SECTION_DE_DIVISION = d => d <= 3 ? 'A' : d <= 9 ? 'B' : d <= 33 ? 'C' : d === 35 ? 'D' : d <= 39 ? 'E'
  : d <= 43 ? 'F' : d <= 47 ? 'G' : d <= 53 ? 'H' : d <= 56 ? 'I' : d <= 63 ? 'J' : d <= 66 ? 'K' : d === 68 ? 'L'
  : d <= 75 ? 'M' : d <= 82 ? 'N' : d === 84 ? 'O' : d === 85 ? 'P' : d <= 88 ? 'Q' : d <= 93 ? 'R' : d <= 96 ? 'S'
  : d <= 98 ? 'T' : 'U';

const dossier = await mkdtemp(path.join(tmpdir(), 'table-metiers-'));
async function telecharger(u, nom){
  const r = await fetch(u, { redirect: 'follow' });
  if (!r.ok) throw new Error(`${u} : HTTP ${r.status}`);
  const f = path.join(dossier, nom);
  await writeFile(f, Buffer.from(await r.arrayBuffer()));
  const d = f + '.d';
  execFileSync('unzip', ['-o', '-q', f, '-d', d]);
  return d;
}
/* un CSV comme le RFC 4180 le décrit : guillemets doublés, retours à la
   ligne dans un champ ; le séparateur se lit sur l'en-tête */
function lireCsv(txt){
  txt = txt.replace(/^﻿/, '');
  const sep = (txt.slice(0, txt.indexOf('\n')).match(/;/g) || []).length > (txt.slice(0, txt.indexOf('\n')).match(/,/g) || []).length ? ';' : ',';
  const lignes = []; let champ = '', ligne = [], q = false;
  for (let i = 0; i < txt.length; i++){
    const c = txt[i];
    if (q){
      if (c === '"'){ if (txt[i + 1] === '"'){ champ += '"'; i++; } else q = false; }
      else champ += c;
    } else if (c === '"') q = true;
    else if (c === sep){ ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r'){
      if (c === '\r' && txt[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.length > 1 || ligne[0] !== '') lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== '' || ligne.length){ ligne.push(champ); lignes.push(ligne); }
  const tete = lignes.shift().map(h => h.trim());
  return lignes.map(l => Object.fromEntries(tete.map((h, i) => [h, (l[i] || '').trim()])));
}
const trouver = async (d, motif) => {
  const f = (await readdir(d)).find(n => motif.test(n));
  if (!f) throw new Error('fichier absent : ' + motif);
  return lireCsv(await readFile(path.join(d, f), 'utf8'));
};

/* ---------- le ROME ---------- */
const dRome = await telecharger(ROME_CSV, 'rome.zip');
const version = ((await readFile(path.join(dRome, 'version.txt'), 'utf8')).match(/version\s*:\s*(\d+)/i) || [])[1] || '?';
const codes = await trouver(dRome, /^unix_referentiel_code_rome_v\d+_utf8\.csv$/);
const gd = await trouver(dRome, /^unix_cr_gd_dp_v\d+_utf8\.csv$/);
const gds = await trouver(dRome, /^unix_grand_domaine_v\d+_utf8\.csv$/);
const naf = await trouver(dRome, /^unix_arborescence_secteur_naf_v\d+_utf8\.csv$/);
const appel = await trouver(dRome, /^unix_referentiel_appellation_v\d+_utf8\.csv$/);

const DOMAINES = Object.fromEntries(gds.map(g => [g.code_grand_domaine, g.libelle_grand_domaine]));
const domaineDe = new Map(gd.map(g => [g.code_rome, g.code_grand_domaine]));
const sectionsDe = new Map();
for (const n of naf){
  const div = parseInt(n.code_secteur_naf, 10);
  if (!(div > 0) || !n.code_rome) continue;
  const s = sectionsDe.get(n.code_rome) || new Map();
  const sec = SECTION_DE_DIVISION(div);
  s.set(sec, (s.get(sec) || 0) + 1);
  sectionsDe.set(n.code_rome, s);
}
const FICHES = {};
for (const c of codes){
  const secs = [...(sectionsDe.get(c.code_rome) || new Map())].sort((a, b) => b[1] - a[1]).map(([s]) => s).join('');
  FICHES[c.code_rome] = [c.libelle_rome, domaineDe.get(c.code_rome) || c.code_rome[0], secs];
}

/* ce que la barre comprend déjà : une appellation qui le heurte se tait */
const deja = new Map();
const marquer = (phrase, quoi) => { const k = cleDe(phrase); if (k && !deja.has(k)) deja.set(k, quoi); };
for (const d of Object.values(STATUT)) d.mots.forEach(m => marquer(m, 'statut'));
for (const d of Object.values(RECH)) d.mots.forEach(m => marquer(m, 'recherche'));
for (const d of Object.values(METIER)) d.mots.forEach(m => marquer(m, 'métier IT'));
for (const d of Object.values(TAILLE)) d.mots.forEach(m => marquer(m, 'taille'));
for (const r of Object.values(REGIONS)) (r.alias || []).forEach(m => marquer(m, 'région'));
for (const v of VILLES) marquer(v.nom, 'ville');
for (const n of Object.values(DEPARTEMENTS)) marquer(n, 'département');

/* LES DEUX FORMES D'UNE APPELLATION. « Technicien / Technicienne
   agricole » : la barre oblique ne sépare que les premiers mots — le
   masculin reprend la fin du féminin (« Technicien agricole »). Lue
   comme deux appellations, elle donnait « Technicien » seul, qui heurtait
   le support informatique (premier passage, 20 octobre). Une appellation
   à deux barres obliques ou plus ne se lit pas sûrement : écartée. */
export function formes(nom){
  const s = String(nom || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = s.split(' / ');
  if (parts.length === 1) return s ? [s] : [];
  if (parts.length > 2) return [];
  const [gauche, droite] = parts.map(x => x.trim());
  const reste = droite.split(' ').slice(gauche.split(' ').length).join(' ');
  return [gauche + (reste ? ' ' + reste : ''), droite];
}
const APPELLATIONS = [];
const vues = new Map();
const ecartees = { peu: 0, long: 0, heurte: [], doublon: 0, sansFiche: 0, informatique: 0 };
for (const a of appel){
  if (a.peu_usite === 'O'){ ecartees.peu++; continue; }
  if (!FICHES[a.code_rome]){ ecartees.sansFiche++; continue; }
  /* l'informatique reste à la table de la barre (METIER), plus fine */
  if (/^M18/.test(a.code_rome)){ ecartees.informatique++; continue; }
  /* le libellé LONG : le court est parfois tronqué (« pénitentiai ») */
  const nom = a.libelle_appellation_long || a.libelle_appellation_court;
  const fs = formes(nom);
  if (!fs.length || fs.some(f => f.split(' ').length > MOTS_MAX)){ ecartees.long++; continue; }
  const cles = fs.map(cleDe).filter(Boolean);
  const heurt = cles.find(k => deja.has(k));
  if (heurt){ ecartees.heurte.push(`${nom} ↔ ${deja.get(heurt)}`); continue; }
  if (cles.every(k => vues.has(k))){ ecartees.doublon++; continue; }
  cles.forEach(k => vues.has(k) || vues.set(k, a.code_rome));
  APPELLATIONS.push([nom, a.code_rome]);
}
APPELLATIONS.sort((x, y) => x[0].localeCompare(y[0], 'fr'));
const parFiche = new Map();
for (const [nom, code] of APPELLATIONS){ const l = parFiche.get(code) || []; l.push(nom); parFiche.set(code, l); }

/* ---------- le RNCP ---------- */
const jeu = await (await fetch(RNCP_JEU, { headers: { accept: 'application/json' } })).json();
const res = (jeu.resources || []).filter(r => /export-fiches-csv/i.test(String(r.title || '') + ' ' + r.url))
  .sort((a, b) => String(b.last_modified || '').localeCompare(String(a.last_modified || '')))[0];
const dRncp = await telecharger(res.url, 'rncp.zip');
const std = await trouver(dRncp, /_Standard_.*\.csv$/i);
const lienRome = await trouver(dRncp, /_Rome_.*\.csv$/i);
const romesDe = new Map();
for (const l of lienRome){
  if (!FICHES[l.Codes_Rome_Code]) continue;
  const s = romesDe.get(l.Numero_Fiche) || new Set();
  s.add(l.Codes_Rome_Code);
  romesDe.set(l.Numero_Fiche, s);
}
const abreges = new Map();
for (const f of std) if (f.Actif === 'ACTIVE') abreges.set(f.Abrege_Libelle, (abreges.get(f.Abrege_Libelle) || 0) + 1);
const VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'a', 'au', 'aux', 'pour', 'option', 'specialite', 'mention']);
/* le sigle qu'écrit un étudiant : les initiales des mots pleins, un mot
   déjà en capitales gardé entier — « Gestion de la PME » → GPME */
const sigleDe = intitule => intitule.replace(/[«»"()]/g, ' ').split(/[\s'’-]+/).filter(Boolean)
  .filter(w => !VIDES.has(w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')))
  .map(w => /^[A-Z0-9]{2,}$/.test(w) ? w : w[0].toUpperCase()).join('');
const parCle = new Map();
for (const f of std){
  if (f.Actif !== 'ACTIVE' || !DIPLOMES.has(String(f.Abrege_Libelle || '').toUpperCase())) continue;
  const r = romesDe.get(f.Numero_Fiche);
  if (!r || !r.size) continue;
  /* « BTS - Management commercial opérationnel » : l'abrégé sort de l'intitulé */
  const intitule = f.Intitule.replace(new RegExp('^\\s*' + f.Abrege_Libelle.replace(/\s+/g, '\\s+') + '\\s*[-–:]?\\s*', 'i'), '').trim();
  const cle = f.Abrege_Libelle.toUpperCase() + '|' + cleDe(intitule);
  const e = parCle.get(cle) || { t: f.Abrege_Libelle.toUpperCase(), i: intitule, r: new Set() };
  r.forEach(c => e.r.add(c));
  parCle.set(cle, e);
}
const FORMATIONS = [...parCle.values()].map(e => [e.t, e.i, sigleDe(e.i), [...e.r].sort().join(' ')])
  .sort((x, y) => x[0].localeCompare(y[0]) || x[1].localeCompare(y[1], 'fr'));

/* ---------- le module ---------- */
const J = x => JSON.stringify(x);
const module = `/* ============================================================
   OpenContact — moteur · LA TABLE DES MÉTIERS (lot R9-b), FABRIQUÉE
   Ne pas éditer à la main : \`tests/e2e/table-metiers.mjs --ecrire\` la
   refait à partir des fichiers ouverts (workflow « Métiers »).
   · ROME 4.0, version ${version}, France Travail (Licence Ouverte) ;
   · RNCP, ${String(res.title || '').replace(/\.zip$/, '')}, France Compétences (Licence Ouverte 2.0).
   ${Object.keys(FICHES).length} fiches, ${APPELLATIONS.length} appellations, ${FORMATIONS.length} formations.
   ============================================================ */
export const ROME_VERSION = ${J(version)};
/* grand domaine → son nom */
export const DOMAINES = ${J(DOMAINES)};
/* code ROME → [grand domaine, sections NAF de l'annuaire (la plus
   fréquente d'abord), ses appellations (« masculin / féminin »)] */
export const FICHES = {
${Object.entries(FICHES).map(([k, v]) => `${J(k)}:${J([v[1], v[2], parFiche.get(k) || []])}`).join(',\n')}
};
/* [diplôme, intitulé, sigle, codes ROME séparés par une espace] */
export const FORMATIONS = [
${FORMATIONS.map(J).join(',\n')}
];
`;
const octets = Buffer.byteLength(module);
const gz = gzipSync(Buffer.from(module), { level: 9 });

console.log(`ROME version ${version} · ${Object.keys(FICHES).length} fiches · ${APPELLATIONS.length} appellations gardées`);
console.log(`  écartées : ${ecartees.peu} peu usitées · ${ecartees.long} trop longues · ${ecartees.heurte.length} qui heurtent la barre · ${ecartees.doublon} doublons · ${ecartees.sansFiche} sans fiche · ${ecartees.informatique} de l'informatique`);
console.log('  qui heurtent la barre :\n    ' + ecartees.heurte.slice(0, 80).join('\n    '));
console.log(`  fiches sans section NAF : ${Object.values(FICHES).filter(f => !f[2]).length}`);
const uns = APPELLATIONS.filter(a => formes(a[0]).some(f => !f.includes(' ')));
console.log(`  appellations d'un seul mot : ${uns.length} — ${uns.slice(0, 150).map(a => a[0]).join(' · ')}`);
console.log(`RNCP ${res.title} · abrégés actifs : ${[...abreges].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
console.log(`  formations gardées : ${FORMATIONS.length} — ` + Object.entries(FORMATIONS.reduce((o, f) => (o[f[0]] = (o[f[0]] || 0) + 1, o), {})).map(([k, n]) => `${k} ${n}`).join(' · '));
for (const t of ['BTS', 'BUT', 'CAP', 'BAC PRO', 'TP'])
  console.log(`  ${t} : ` + FORMATIONS.filter(f => f[0] === t).slice(0, 12).map(f => `${f[1]} [${f[2]}] → ${f[3]}`).join(' | '));
console.log(`MODULE : ${octets} o, ${gz.length} o compressé, sha256 ${hash('sha256').update(module).digest('hex')}`);

if (process.argv.includes('--ecrire')) await writeFile(path.join(RACINE, 'engine', 'metiers-donnees.js'), module);
if (process.argv.includes('--journal')){
  const b = gz.toString('base64');
  console.log('=====DEBUT TABLE=====');
  for (let i = 0; i < b.length; i += 4000) console.log(b.slice(i, i + 4000));
  console.log('=====FIN TABLE=====');
}

/* ============================================================
   OpenContact — moteur · TOUS LES MÉTIERS (lot R9-b)
   (docs/propositions/R9-tous-les-metiers.md)

   La table (`engine/metiers-donnees.js`) est FABRIQUÉE à partir du ROME
   4.0 et du RNCP (`tests/e2e/table-metiers.mjs`) ; ce module la rend
   utile, sans jamais la charger lui-même — c'est l'écran qui l'importe,
   au premier besoin et seulement lot ouvert, puis passe l'index au
   moteur (`ctx.metiers`) :
   · `indexMetiers` : chaque FORME d'appellation (« Vendeur en
     boulangerie », « Vendeuse en boulangerie ») devient une étiquette de
     métier `rome:CODE`, qui porte ses codes ROME et les sections de
     l'annuaire. La barre ne les pose qu'APRÈS tout son vocabulaire, ses
     villes et ses prénoms (le premier arrivé garde la place) : rien de
     ce qu'elle comprenait ne change, et l'informatique reste à sa table,
     plus fine (METIER) ;
   · `formationDe` : « BTS MCO », « CAP cuisine », « Bac pro ASSP » → la
     certification du RNCP, par son abrégé et son sigle ou les mots de son
     intitulé, et ses codes ROME. Deux certifications à égalité ne
     tranchent rien — mieux vaut ne pas comprendre que mal comprendre.
   Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */
import { cleDe } from './requete.js';

/* LES DEUX FORMES D'UNE APPELLATION. « Technicien / Technicienne
   agricole » : la barre oblique ne sépare que les premiers mots, le
   masculin reprend la fin du féminin. Deux barres obliques ou plus ne se
   lisent pas sûrement : aucune forme. */
export function formesAppellation(nom){
  const s = String(nom || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = s.split(' / ');
  if (parts.length === 1) return s ? [s] : [];
  if (parts.length > 2) return [];
  const [gauche, droite] = parts.map(x => x.trim());
  const reste = droite.split(' ').slice(gauche.split(' ').length).join(' ');
  return [gauche + (reste ? ' ' + reste : ''), droite];
}

/* les racines d'une appellation, pour reconnaître une piste qui en parle :
   les mots pleins, coupés à six lettres (« boulangerie » → « boulan ») */
const VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'a', 'au', 'aux', 'pour',
  'sur', 'par', 'avec', 'dans', 'sans']);
const racinesDe = forme => [...new Set(cleDe(forme).split(' ')
  .filter(w => w.length >= 4 && !VIDES.has(w)).map(w => w.slice(0, 6)))];

export function etiquetteRome(code, forme, fiche){
  return { famille: 'metier', cle: 'rome:' + code, label: forme, rome: code, romes: [code],
           sections: String((fiche && fiche[1]) || '').slice(0, 2), grandDomaine: (fiche && fiche[0]) || '',
           domaine: '', racines: racinesDe(forme) };
}

/* L'INDEX, construit une fois par session. `d` : le module de données. */
/* l'informatique reste à la table de la barre (METIER), plus fine : ses
   fiches (M18…, et la maintenance informatique I1401) n'entrent pas */
export const ROME_INFORMATIQUE = c => /^M18/.test(c) || c === 'I1401';
export function indexMetiers(d){
  if (!d || !d.FICHES) return null;
  const formes = [];
  for (const [code, fiche] of Object.entries(d.FICHES))
    if (!ROME_INFORMATIQUE(code)) for (const nom of fiche[2] || [])
      for (const f of formesAppellation(nom)) formes.push([f, etiquetteRome(code, f, fiche)]);
  /* le sigle se compare plié (« AÉPE » → aepe) ; celui d'un BUT a son
     parcours après les deux-points (« GEA:GC2F ») : la tête seule
     désigne le diplôme, tous parcours confondus */
  const plie = x => cleDe(x).replace(/ /g, '');
  const formations = (d.FORMATIONS || []).map(([type, intitule, sigle, romes]) => ({
    type, intitule, sigle: plie(sigle), tete: plie(String(sigle || '').split(':')[0]),
    mots: cleDe(intitule).split(' ').filter(w => w && !VIDES.has(w)),
    romes: String(romes || '').split(' ').filter(c => d.FICHES[c])
  })).filter(f => f.romes.length);
  return { version: d.ROME_VERSION || '', formes, fiches: d.FICHES, domaines: d.DOMAINES || {}, formations };
}

/* le type de diplôme tel qu'un étudiant l'écrit, en tête de « Formation »
   (« bac pro », « titre pro ») → l'abrégé du RNCP */
const TYPES = [['bac pro', 'BAC PRO'], ['bac professionnel', 'BAC PRO'], ['titre pro', 'TP'],
  ['titre professionnel', 'TP'], ['btsa', 'BTSA'], ['bts', 'BTS'], ['but', 'BUT'], ['capa', 'CAPA'], ['cap', 'CAP'],
  ['bpa', 'BPA'], ['bp', 'BP'], ['tp', 'TP'], ['deust', 'DEUST'], ['bma', 'BMA']];
/* ce qui décrit l'année ou le parcours, pas la certification */
const BRUIT = new Set(['1', '2', '3', '1ere', '1re', '2e', '2eme', '2nd', '3e', 'annee', 'an', 'premiere', 'deuxieme',
  'seconde', 'terminale', 'option', 'en', 'alternance', 'apprentissage', 'initial', 'initiale']);

/* LA FORMATION DU PROFIL → sa certification RNCP, ou null. */
export function formationDe(texte, idx){
  if (!idx || !idx.formations) return null;
  const k = cleDe(texte);
  if (!k) return null;
  const t = TYPES.find(([p]) => k === p || k.startsWith(p + ' '));
  if (!t) return null;
  const reste = k.slice(t[0].length).trim().split(' ').filter(w => w && !BRUIT.has(w) && !VIDES.has(w));
  if (!reste.length) return null;
  const memes = idx.formations.filter(f => f.type === t[1]);
  /* le sigle d'abord (« MCO »), puis les mots de l'intitulé, tous présents */
  let trouvees = memes.filter(f => f.sigle && reste.includes(f.sigle));
  if (!trouvees.length) trouvees = memes.filter(f => f.tete && f.tete.length >= 2 && reste.includes(f.tete));
  if (!trouvees.length) trouvees = memes.filter(f => reste.every(w => f.mots.some(m => m === w || (w.length >= 5 && m.startsWith(w)))));
  /* plusieurs parcours d'un MÊME diplôme (« BUT GEA ») : leurs métiers
     se réunissent ; deux diplômes différents ne tranchent rien */
  if (!trouvees.length || new Set(trouvees.map(f => f.tete || f.intitule)).size !== 1) return null;
  const f = trouvees.length === 1 ? trouvees[0]
    : { ...trouvees[0], intitule: trouvees[0].intitule.split(' : ')[0], romes: [...new Set(trouvees.flatMap(x => x.romes))].sort() };
  /* les sections de l'annuaire : celles de ses métiers, la plus
     fréquente d'abord */
  const compte = new Map();
  for (const c of f.romes) for (const s of String((idx.fiches[c] || [])[1] || '')) compte.set(s, (compte.get(s) || 0) + 1);
  const sections = [...compte].sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 2).join('');
  return { type: f.type, intitule: f.intitule, romes: f.romes, sections };
}

/* L'ÉTIQUETTE QUE DIT TA FORMATION, quand elle n'est pas de
   l'informatique : le nom que tu as écrit (« BTS MCO »), tes codes ROME,
   tes sections — marquée `profil`, comme la ville du profil */
export function etiquetteFormation(texte, idx){
  const f = formationDe(texte, idx);
  if (!f) return null;
  /* une formation dont les métiers sont surtout de l'informatique (« BTS
     SIO » : 3 sur 3, « BUT R&T » : 7 sur 8) reste à la table de
     l'informatique, plus fine : sans ça elle envoyait tout le secteur J
     à l'annuaire au lieu des six codes du numérique (7.0.0) */
  if (f.romes.filter(ROME_INFORMATIQUE).length * 2 > f.romes.length) return null;
  const label = String(texte).replace(/\s+/g, ' ').trim().slice(0, 40);
  return { famille: 'metier', cle: 'formation:' + cleDe(label), id: 'metier:formation:' + cleDe(label), label,
           intitule: f.intitule, rome: f.romes[0], romes: f.romes, sections: f.sections, domaine: '', racines: racinesDe(f.intitule),
           profil: true, spans: [], mots: [] };
}

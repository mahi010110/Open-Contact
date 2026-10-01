/* ============================================================
   OpenContact — moteur · « À découvrir » : l'annuaire des entreprises

   La barre comprend ce qu'on tape (engine/requete.js). Ce fichier en
   tire une question pour l'API Recherche d'entreprises (data.gouv.fr,
   gratuite, sans clé ni compte), et lit sa réponse. Il ne fait AUCUN
   appel lui-même : l'écran appelle, le moteur prépare et relit —
   fonctions pures, testables sans réseau (règle de sens unique).

   LE PRINCIPE QUI DÉCIDE DE TOUT (recherche.md, principe 4) : la
   recherche en ligne part toute seule, mais n'emporte que ce qui décrit
   une ENTREPRISE. La même barre sert à retrouver tes pistes, donc
   parfois à taper le nom d'un contact ou un mot de tes notes. Partent :
   le métier (en codes d'activité), le lieu, la taille, et les mots qui
   peuvent nommer une entreprise. Ne partent JAMAIS : un mot qui
   correspond à un de tes contacts, un mot qui n'existe que dans ton
   suivi privé (notes, historique, prochaine action), un prénom du
   groupe, ton profil, l'état de tes pistes. Une question dont il ne
   reste rien d'utile après ce tri ne part pas du tout.

   Ce qui est lu ici a été RELEVÉ, pas supposé : `sonde-annuaire.mjs`
   interroge le vrai service depuis un vrai navigateur en CI, et rend la
   forme exacte d'un résultat.
   ============================================================ */
import { fold } from './filter.js';
import { cleDe, deptDuCp } from './requete.js';
import { REGIONS } from './lieux.js';
import { normName, distKm } from './utils.js';

export const ANNUAIRE = 'https://recherche-entreprises.api.gouv.fr';
export const FICHE_OFFICIELLE = 'https://annuaire-entreprises.data.gouv.fr/entreprise/';
export const PAR_PAGE = 10;
export const RAYON_KM = 10;
export const RAYON_MAX = 50;     /* l'annuaire refuse au-delà */

const motsDe = s => fold(s).replace(/œ/g, 'oe').replace(/æ/g, 'ae').split(/[^a-z0-9]+/).filter(Boolean);

/* ---------- le métier, en codes d'activité (NAF rév. 2) ----------
   Le registre ne connaît pas « cyber » : une entreprise de sécurité
   informatique y est rangée en conseil (62.02A) ou en « autres activités
   informatiques » (62.09Z). Le mot part donc AUSSI en texte, dans une
   première question : les noms qui le portent passent devant. */
export const NAF_METIER = {
  dev:     ['62.01Z', '58.29C', '62.02A'],
  reseau:  ['62.02A', '62.03Z', '62.09Z', '61.10Z', '61.20Z', '61.90Z'],
  cyber:   ['62.02A', '62.09Z', '62.01Z'],
  cloud:   ['63.11Z', '62.03Z'],
  data:    ['63.11Z', '62.02A', '62.01Z'],
  support: ['62.09Z', '95.11Z', '62.03Z'],
  esn:     ['62.01Z', '62.02A', '62.03Z', '62.09Z']
};
/* les secteurs larges : une section du registre plutôt que des codes */
export const SECTION_METIER = { industrie: 'C', commerce: 'G', sante: 'Q', public: 'O' };
/* le mot qui part aussi en texte, pour que les noms qui le portent remontent */
const MOT_METIER = { cyber: 'cyber' };
/* Sans métier tapé, l'app cherche dans le NUMÉRIQUE : c'est le produit
   (§1, un étudiant IT/cyber). « alternance Lille » ne veut pas dire
   « toutes les entreprises du Nord », boulangeries comprises. */
export const NAF_NUMERIQUE = ['62.01Z', '62.02A', '62.03Z', '62.09Z', '63.11Z', '58.29C'];

/* la taille, comme le registre la range */
export const TAILLE = {
  tpe: { tranches: ['00', '01', '02', '03'] },
  pme: { categorie: 'PME' },
  eti: { categorie: 'ETI' },
  ge:  { categorie: 'GE' }
};
/* codes INSEE des régions — ce que l'annuaire attend */
export const REGION_INSEE = { idf: '11', hdf: '32', ge: '44', nor: '28', bre: '53', pdl: '52', cvl: '24',
  bfc: '27', ara: '84', naq: '75', occ: '76', paca: '93', cor: '94' };

/* ---------- ce qui ne sort jamais ---------- */
export function motsInterdits(companies, orphans, profile){
  const contact = new Set(), prive = new Set(), publics = new Set();
  const mettre = (set, ...xs) => { for (const x of xs) for (const w of motsDe(x)) set.add(w); };
  for (const c of companies || []){
    if (!c) continue;
    for (const t of c.contacts || []) mettre(contact, t.name, t.email, t.phone, t.note, t.link);
    mettre(contact, c.vecuQui);
    mettre(prive, c.notes, c.nextActionText, ...(c.history || []).map(h => h && h.t));
    mettre(publics, c.name, c.city, c.address, c.desc, c.techs, c.tips, c.process, c.website);
  }
  for (const o of orphans || []) mettre(contact, o.name, o.email, o.phone, o.note, o.link, o.role);
  if (profile) mettre(contact, profile.name, profile.email, profile.phone, profile.ecole);
  const out = new Set(contact);
  for (const w of prive) if (!publics.has(w)) out.add(w);
  return out;
}

/* ---------- la question ----------
   Rend une liste d'URL (zéro, une ou deux), dans l'ordre où leurs
   résultats doivent se lire. Zéro = rien à demander, rien ne part. */
export function questionsAnnuaire(interp, o){
  o = o || {};
  const interdits = o.interdits || new Set();
  const et = (interp && interp.etiquettes) || [];
  /* l'état de TES pistes et ton groupe ne regardent que toi : une
     question qui en porte un ne concerne pas l'annuaire */
  if (et.some(e => e.famille === 'statut' || e.famille === 'groupe')) return [];
  const texte = ((interp && interp.texte) || [])
    .filter(t => { const m = motsDe(t); return m.length && m.every(w => !interdits.has(w)); });
  const codes = new Set(), sections = new Set();
  const p = new URLSearchParams();
  let lieu = false, proche = false, motMetier = '';
  for (const e of et){
    if (e.famille === 'metier'){
      (NAF_METIER[e.cle] || []).forEach(c => codes.add(c));
      if (SECTION_METIER[e.cle]) sections.add(SECTION_METIER[e.cle]);
      if (e.cle === 'dsi') p.set('categorie_entreprise', 'GE');
      if (MOT_METIER[e.cle]) motMetier = MOT_METIER[e.cle];
    } else if (e.famille === 'taille'){
      const t = TAILLE[e.cle];
      if (t && t.categorie) p.set('categorie_entreprise', t.categorie);
      if (t && t.tranches) p.set('tranche_effectif_salarie', t.tranches.join(','));
    } else if (e.famille === 'lieu'){
      if (e.cle === 'proche'){ proche = true; continue; }
      lieu = true;
      if (e.cp) p.set('code_postal', e.cp);
      else if (e.cle.startsWith('region:')){
        const code = REGION_INSEE[e.cle.slice(7)];
        if (code) p.set('region', code);
      } else if (e.depts) p.set('departement', e.depts.join(','));
      else if (e.ville && e.dept) p.set('departement', e.dept);
      else if (e.ville) lieu = false;           /* une ville sans département connu reste locale */
    }
  }
  const q = texte.join(' ').trim();
  const posOk = proche && o.userPos && Number.isFinite(o.userPos.lat) && Number.isFinite(o.userPos.lng);
  /* Sans texte, sans lieu et sans « près de moi », la question
     rendrait la France entière : elle ne part pas. */
  if (!q.length && !lieu && !posOk && !motMetier) return [];
  if (!codes.size && !sections.size && !q) NAF_NUMERIQUE.forEach(c => codes.add(c));
  if (codes.size) p.set('activite_principale', [...codes].join(','));
  else if (sections.size) p.set('section_activite_principale', [...sections].join(','));
  p.set('etat_administratif', 'A');
  p.set('per_page', String(o.parPage || PAR_PAGE));
  p.set('page', String(o.page || 1));
  const url = (chemin, extra) => {
    const x = new URLSearchParams(p);
    for (const [k, v] of Object.entries(extra || {})) x.set(k, v);
    return `${ANNUAIRE}${chemin}?${x.toString()}`;
  };
  /* « près de moi » : les ÉTABLISSEMENTS autour du point — le bon, pas
     le siège parisien d'une agence à deux rues d'ici */
  if (posOk && !q){
    const r = String(Math.min(o.rayon || RAYON_KM, RAYON_MAX));
    ['departement', 'region', 'code_postal'].forEach(k => p.delete(k));
    return [url('/near_point', { lat: o.userPos.lat.toFixed(5), long: o.userPos.lng.toFixed(5), radius: r })];
  }
  if (q.length && q.length < 3 && !lieu && !codes.size) return [];
  const out = [];
  if (motMetier && !q.includes(motMetier)) out.push(url('/search', { q: (q + ' ' + motMetier).trim() }));
  if (q.length >= 3) out.push(url('/search', { q }));
  /* sans texte, la question large ne part que bornée par un lieu —
     « cyber » seul ne demande pas toutes les ESN de France */
  else if (lieu) out.push(url('/search'));
  return out;
}

/* ---------- lire une réponse ---------- */
const nombre = v => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : null; };
/* « SOPRA STERIA GROUP » → « Sopra Steria Group » ; les sigles courts
   (IBM, SAS, SII) restent en capitales, les petits mots (de, la, et)
   en minuscules sauf en tête */
const PETITS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'sur', 'sous', 'a']);
export function casse(s, sigles = true){
  const t = String(s || '').trim();
  if (!t || t !== t.toUpperCase()) return t;               /* déjà écrit en casse mixte : on n'y touche pas */
  const maj = w => w.charAt(0).toUpperCase() + w.slice(1);
  return t.toLowerCase().replace(/[\p{L}\p{N}]+/gu, (w, i) => {
    if (PETITS.has(w)) return i > 0 ? w : maj(w);
    /* IBM, EDF, SII : un sigle — dans un NOM. Dans une adresse, « RUE »
       ou « BD » ne sont pas des sigles. */
    if (sigles && w.length <= 3) return w.toUpperCase();
    return maj(w);
  }).replace(/\b([ld])['’](\p{L})/giu, (m, a, b) => a.toLowerCase() + '’' + b.toUpperCase());
}
export const TRANCHES = {
  '00': '0 salarié', '01': '1-2 salariés', '02': '3-5 salariés', '03': '6-9 salariés',
  '11': '10-19 salariés', '12': '20-49 salariés', '21': '50-99 salariés', '22': '100-199 salariés',
  '31': '200-249 salariés', '32': '250-499 salariés', '41': '500-999 salariés',
  '42': '1 000-1 999 salariés', '51': '2 000-4 999 salariés', '52': '5 000-9 999 salariés',
  '53': '10 000 salariés et plus'
};
export const ACTIVITES = {
  '62.01Z': 'Programmation informatique', '62.02A': 'Conseil en systèmes et logiciels informatiques',
  '62.02B': 'Maintenance de systèmes et d’applications', '62.03Z': 'Gestion d’installations informatiques',
  '62.09Z': 'Autres activités informatiques', '63.11Z': 'Traitement de données, hébergement',
  '63.12Z': 'Portails Internet', '58.29A': 'Édition de logiciels système et de réseau',
  '58.29B': 'Édition de logiciels outils de développement', '58.29C': 'Édition de logiciels applicatifs',
  '61.10Z': 'Télécommunications filaires', '61.20Z': 'Télécommunications sans fil',
  '61.90Z': 'Autres télécommunications', '95.11Z': 'Réparation d’ordinateurs',
  '70.22Z': 'Conseil pour les affaires et la gestion', '71.12B': 'Ingénierie, études techniques',
  '72.19Z': 'Recherche-développement', '84.11Z': 'Administration publique générale',
  '86.10Z': 'Activités hospitalières', '85.42Z': 'Enseignement supérieur'
};
/* le domaine d'une piste ajoutée, d'après son code d'activité */
export function domaineDeNaf(naf){
  const n = String(naf || '');
  if (/^63\.11/.test(n)) return 'cloud';
  if (/^(62|58\.2|95\.1)/.test(n)) return 'esn';
  if (/^84/.test(n)) return 'public';
  if (/^(86|87|88)/.test(n)) return 'sante';
  if (/^(1\d|2\d|3[0-3]|4[1-3])\./.test(n)) return 'industrie';
  if (/^4[5-7]\./.test(n)) return 'commerce';
  return 'autre';
}
/* Une adresse en deux lignes, comme le champ libre de l'app (§6).
   RELEVÉ par la sonde : le siège porte ses morceaux (numéro, voie,
   commune), un établissement ne porte qu'une chaîne d'un seul tenant
   (« 7 AVENUE MARIE-LOUISE DELWAULLE 59160 LILLE »). On la coupe au
   code postal — la rue avant, la ville après. */
function adresseDe(x){
  if (!x) return '';
  const rue = [x.numero_voie, x.indice_repetition, x.type_voie, x.libelle_voie].filter(Boolean).join(' ');
  if (x.libelle_voie){
    const ville = [x.code_postal, x.libelle_commune].filter(Boolean).join(' ');
    return [casse(rue, false), casse(ville, false)].filter(Boolean).join('\n');
  }
  const brut = String(x.adresse || '').trim();
  const m = brut.match(/^(.*?)\s*\b(\d{5})\s+(.+)$/);
  if (m) return [casse(m[1], false), m[2] + ' ' + casse(m[3], false)].filter(Boolean).join('\n');
  return casse(brut, false);
}
/* Lire une réponse de l'annuaire. `o.ville` (clé pliée) et `o.userPos`
   choisissent l'établissement à montrer : celui de la ville cherchée,
   sinon le plus proche, sinon le premier qui correspond, sinon le siège. */
export function lireAnnuaire(json, o){
  o = o || {};
  const res = (json && Array.isArray(json.results)) ? json.results : [];
  return res.map(r => {
    if (!r || !/^\d{9}$/.test(String(r.siren || ''))) return null;
    /* RELEVÉ par la sonde : la liste des établissements qui
       correspondent garde ceux qui sont FERMÉS (`etat_administratif`
       « F », avec leur date de fermeture). Montrer une adresse fermée à
       quelqu'un qui va y postuler, c'est l'envoyer devant une porte
       close : ils ne sont gardés qu'en dernier recours. */
    const tous = [...(Array.isArray(r.matching_etablissements) ? r.matching_etablissements : [])];
    if (r.siege) tous.push({ ...r.siege, est_siege: true });
    const ouverts = tous.filter(e => e && e.etat_administratif !== 'F');
    const etabs = ouverts.length ? ouverts : tous;
    const lu = etabs.map(e => ({ e, lat: nombre(e.latitude), lng: nombre(e.longitude),
      ville: cleDe(e.libelle_commune || '') }));
    let choisi = (o.ville && lu.find(x => x.ville === o.ville || x.ville.startsWith(o.ville + ' '))) || null;
    if (!choisi && o.userPos){
      const avecPos = lu.filter(x => x.lat != null && x.lng != null);
      avecPos.sort((a, b) => distKm(o.userPos.lat, o.userPos.lng, a.lat, a.lng) - distKm(o.userPos.lat, o.userPos.lng, b.lat, b.lng));
      choisi = avecPos[0] || null;
    }
    choisi = choisi || lu[0] || { e: {}, lat: null, lng: null };
    const e = choisi.e;
    const naf = r.activite_principale || e.activite_principale || '';
    const tranche = String(r.tranche_effectif_salarie || '');
    return {
      siren: String(r.siren),
      nom: casse(r.nom_raison_sociale || r.nom_complet || ''),
      sigle: r.sigle ? String(r.sigle) : '',
      ville: casse(e.libelle_commune || '', false),
      cp: String(e.code_postal || ''),
      dept: deptDuCp(String(e.code_postal || '')),
      adresse: adresseDe(e),
      lat: choisi.lat, lng: choisi.lng,
      siege: !!e.est_siege,
      naf, activite: ACTIVITES[naf] || '',
      tranche, effectif: TRANCHES[tranche] || '',
      categorie: String(r.categorie_entreprise || ''),
      creation: String(r.date_creation || '').slice(0, 10),
      etablissements: nombre(r.nombre_etablissements_ouverts) ?? nombre(r.nombre_etablissements),
      dirigeants: (Array.isArray(r.dirigeants) ? r.dirigeants : []).slice(0, 4).map(d => ({
        nom: d.type_dirigeant === 'personne morale' ? casse(d.denomination || '')
          : [d.prenoms, d.nom].filter(Boolean).map(casse).join(' '),
        qualite: String(d.qualite || ''),
        personne: d.type_dirigeant !== 'personne morale'
      })).filter(d => d.nom),
      distance: (o.userPos && choisi.lat != null) ? distKm(o.userPos.lat, o.userPos.lng, choisi.lat, choisi.lng) : null
    };
  }).filter(Boolean);
}

/* ---------- une entreprise = une ligne ----------
   Ce qui est déjà dans tes pistes ne se redit pas dans « À découvrir » :
   même SIREN, ou même nom (le sigle compte). Plusieurs questions
   peuvent rendre la même entreprise : elle ne sort qu'une fois, à la
   place de sa première apparition. */
export function decouvertes(listes, companies){
  const sirens = new Set(), noms = new Set();
  for (const c of companies || []){
    if (!c) continue;
    if (c.siren) sirens.add(String(c.siren));
    const n = normName(c.name);
    if (n) noms.add(n);
  }
  const vus = new Set(), out = [];
  for (const l of listes || []) for (const r of l || []){
    if (vus.has(r.siren) || sirens.has(r.siren)) continue;
    if (noms.has(normName(r.nom)) || (r.sigle && noms.has(normName(r.sigle)))) continue;
    vus.add(r.siren);
    out.push(r);
  }
  return out;
}

/* ---------- ajouter une découverte à ses pistes ----------
   Elle arrive comme une piste qu'on aurait saisie : nom, ville, adresse
   de l'établissement, position, SIREN. Le DOMAINE suit ce qu'on a
   cherché — une entreprise trouvée par « cyber » doit rester trouvable
   par « cyber », sinon elle disparaîtrait de l'écran à l'instant où on
   l'ajoute. AUCUNE personne n'est importée : le dirigeant reste une
   information de la fiche, il ne devient un contact que si on l'ajoute
   soi-même (recherche.md, « Ce que le lot ne fait pas »). */
export function versPiste(r, interp){
  const metier = ((interp && interp.etiquettes) || []).find(e => e.famille === 'metier' && e.domaine);
  return {
    name: r.nom,
    city: r.ville,
    address: r.adresse,
    domain: metier ? metier.domaine : domaineDeNaf(r.naf),
    desc: r.activite || '',
    siren: r.siren,
    lat: r.lat, lng: r.lng,
    positions: [], contacts: []
  };
}
export const ficheOfficielle = siren => /^\d{9}$/.test(String(siren || '')) ? FICHE_OFFICIELLE + siren : '';

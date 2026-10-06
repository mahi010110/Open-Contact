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
import { cleDe, deptDuCp, lieuDuProfil, metierEtiquetteDuProfil, rayonDe } from './requete.js';
import { REGIONS } from './lieux.js';
import { normName, distKm } from './utils.js';

export const ANNUAIRE = 'https://recherche-entreprises.api.gouv.fr';
export const FICHE_OFFICIELLE = 'https://annuaire-entreprises.data.gouv.fr/entreprise/';
export const PAR_PAGE = 10;
export const RAYON_KM = 10;
export const RAYON_MAX = 50;     /* l'annuaire refuse au-delà */
export const RAYON_VILLE = 15;   /* autour d'une ville : sa métropole, pas son département */
export const LOIN_KM = 30;       /* au-delà, ce n'est plus « à Lille » : écarté */

const motsDe = s => fold(s).replace(/œ/g, 'oe').replace(/æ/g, 'ae').split(/[^a-z0-9]+/).filter(Boolean);

/* ---------- le métier, en codes d'activité (NAF rév. 2) ----------
   Le registre ne connaît pas « cyber » : une entreprise de sécurité
   informatique y est rangée en conseil (62.02A) ou en « autres activités
   informatiques » (62.09Z). Le mot part donc AUSSI en texte, dans une
   première question : les noms qui le portent passent devant. */
/* RELEVÉ le 6/10 (sonde-utile.mjs) : « alternance réseau Lille » rendait
   des BOUTIQUES — Orange Store, Espace SFR, les clubs Bouygues Telecom,
   les magasins Free —, rangées en 61.20Z et 61.90Z. On y vend des
   forfaits. Seuls les opérateurs de réseau (61.10Z) restent. Et les
   INTÉGRATEURS manquaient : Computacenter, SCC, Cybertek, Antemeta —
   rangés en commerce de gros d'ordinateurs (46.51Z), ils installent les
   serveurs et les réseaux de leurs clients, et prennent des alternants
   SISR. */
export const NAF_METIER = {
  dev:     ['62.01Z', '58.29C', '62.02A'],
  reseau:  ['62.02A', '62.03Z', '62.09Z', '61.10Z', '46.51Z'],
  cyber:   ['62.02A', '62.09Z', '62.01Z'],
  cloud:   ['63.11Z', '62.03Z'],
  data:    ['63.11Z', '62.02A', '62.01Z'],
  support: ['62.09Z', '95.11Z', '62.03Z', '46.51Z'],
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
  /* UNE QUESTION VIDÉE PAR LE TRI NE PART PAS — pas même celle de ta
     zone : « bertrand » tapé n'est pas une barre vide. Le cache le
     masquait tant que la zone posait la même question qu'une recherche
     précédente ; chercher autour des villes l'a montré. */
  if (!et.length && !texte.length && ((interp && interp.texte) || []).length) return [];
  const codes = new Set(), sections = new Set();
  const p = new URLSearchParams();
  let lieu = false, proche = false, motMetier = '', centre = null, rayonVille = o.rayonVille || RAYON_VILLE;
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
      else if (e.ville && e.dept){
        p.set('departement', e.dept);
        if (Array.isArray(e.centre)){ centre = e.centre; if (e.rayon) rayonVille = e.rayon; }
      }
      else if (e.ville) lieu = false;           /* une ville sans département connu reste locale */
    }
  }
  const q = texte.join(' ').trim();
  const posOk = proche && o.userPos && Number.isFinite(o.userPos.lat) && Number.isFinite(o.userPos.lng);
  /* TA ZONE (docs/sources.md, « S'adapter ») : une question sans lieu
     prend le département de tes pistes. L'écran la montre comme une
     étiquette, avec sa croix — l'app ne demande rien en ton nom sans
     que ça se voie. */
  /* `parDefaut` : la vue « À découvrir » ouverte d'un tap, barre vide —
     le numérique de ta zone (docs/presentation-recherche.md). Jamais au
     démarrage : c'est le tap qui demande. */
  if (!lieu && !posOk && o.zone && o.zone.dept && (et.length || q || o.parDefaut)){ p.set('departement', o.zone.dept); lieu = true; }
  /* Sans texte, sans lieu et sans « près de moi », la question
     rendrait la France entière : elle ne part pas. */
  if (!q.length && !lieu && !posOk && !motMetier) return [];
  if (!codes.size && !sections.size && !q) NAF_NUMERIQUE.forEach(c => codes.add(c));
  if (codes.size) p.set('activite_principale', [...codes].join(','));
  else if (sections.size) p.set('section_activite_principale', [...sections].join(','));
  p.set('etat_administratif', 'A');
  /* RELEVÉ le 5/10 : 40 % du numérique dans le Nord sont des entrepreneurs
     individuels — des PERSONNES, leur nom en guise de raison sociale. Ni
     un lieu de stage, ni quelqu'un qu'on montre sans qu'il l'ait demandé. */
  p.set('est_entrepreneur_individuel', 'false');
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
  /* RELEVÉ le 6/10 : « cyber » en texte rendait d'abord NAO Cyber, Cyber
     Shark Conseil, MY Cyber Royaume — une ou deux personnes, ou aucun
     salarié. Le mot dans le nom ne dit pas qu'on peut y être accueilli :
     cette question-là ne demande que des employeurs de dix salariés et
     plus (Orange Cyberdefense, Airbus CyberSecurity…). */
  if (motMetier && !q.includes(motMetier)) out.push(url('/search', { q: (q + ' ' + motMetier).trim(),
    ...(p.has('tranche_effectif_salarie') || p.has('categorie_entreprise') ? {} : { tranche_effectif_salarie: TRANCHES_EMPLOYEURS }) }));
  if (q.length >= 3) out.push(url('/search', { q }));
  /* UNE VILLE : on cherche AUTOUR d'elle (RELEVÉ le 6/10 : « Lille »
     rendait Maubeuge, Dunkerque, et le siège d'Annecy d'une entreprise
     sans établissement correspondant dans le Nord). `/near_point` rend
     les ÉTABLISSEMENTS à moins de RAYON_VILLE km du centre — le bon
     bureau, à sa vraie distance. Il ignore la taille (relevé) : sa
     jumelle reste la question du département bornée aux 10-499, et
     `decouvertes` écarte ce qui tombe trop loin du centre. Une taille
     tapée décide seule : pas de point, le département et la taille. */
  else if (centre && !p.has('categorie_entreprise') && !p.has('tranche_effectif_salarie')){
    const x = new URLSearchParams(p);
    x.delete('departement');
    x.set('lat', centre[0].toFixed(3)); x.set('long', centre[1].toFixed(3)); x.set('radius', String(Math.min(rayonVille, RAYON_MAX)));
    out.push(`${ANNUAIRE}/near_point?${x.toString()}`);
    out.push(url('/search', { tranche_effectif_salarie: TRANCHES_MOYENNES }));
  }
  /* sans texte, la question large ne part que bornée par un lieu —
     « cyber » seul ne demande pas toutes les ESN de France */
  else if (lieu){
    out.push(url('/search'));
    /* SA JUMELLE (docs/sources.md, lot 4). RELEVÉ le 5/10 : sans texte,
       l'annuaire trie par nombre d'établissements, et rien ne le
       débraye — la première page est toujours Capgemini, Sopra Steria,
       Inetum… La même question bornée aux employeurs de 10 à 499
       salariés rend d'autres entreprises, locales, que personne ne
       voyait. Les deux se fusionnent (`decouvertes`). Une taille tapée
       décide seule : pas de jumelle. */
    if (!p.has('categorie_entreprise') && !p.has('tranche_effectif_salarie'))
      out.push(url('/search', { tranche_effectif_salarie: TRANCHES_MOYENNES }));
  }
  return out;
}
export const TRANCHES_MOYENNES = '11,12,21,22,31,32';
export const TRANCHES_EMPLOYEURS = '11,12,21,22,31,32,41,42,51,52,53';
/* ce qu'une question demande — ce qui décide de son rang dans la fusion :
   un NOM tapé, un MÉTIER tapé en texte (« cyber »), ou une liste */
export function genreQuestion(u){
  let q = '';
  try { q = new URL(u).searchParams.get('q') || ''; } catch (e) { return 'liste'; }
  if (!q) return 'liste';
  return Object.values(MOT_METIER).includes(q) ? 'metier' : 'nom';
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
  '46.51Z': 'Commerce de gros d’ordinateurs et de logiciels',
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
  if (/^(62|58\.2|95\.1|46\.51)/.test(n)) return 'esn';
  if (/^84/.test(n)) return 'public';
  if (/^(86|87|88)/.test(n)) return 'sante';
  if (/^(1\d|2\d|3[0-3]|4[1-3])\./.test(n)) return 'industrie';
  if (/^4[5-7]\./.test(n)) return 'commerce';
  return 'autre';
}
/* ---------- CE QUE TU Y FERAIS ----------
   Le code d'activité dit ce que fait l'entreprise dans la langue de
   l'INSEE : « Conseil en systèmes et logiciels informatiques » neuf fois
   sur dix, qui ne départage rien et ne dit pas le travail. Un étudiant
   cherche autre chose : quel travail il y ferait, et si c'est le sien.
   La table traduit chaque code en ce travail, et dit à quels MÉTIERS de
   la barre (engine/requete.js) il correspond — c'est ce qui permet de
   dire « c'est ton métier » sans rien inventer. */
const T = (texte, metiers) => ({ texte, metiers });
export const TRAVAIL = {
  '62.01Z': T('développement de logiciels', ['dev']),
  '62.02A': T('conseil et intégration informatique', ['dev', 'reseau', 'cyber']),
  '62.02B': T('maintenance de systèmes et d’applications', ['reseau', 'support']),
  '62.03Z': T('infogérance : les serveurs et réseaux de ses clients', ['reseau', 'cloud']),
  '62.09Z': T('installation et dépannage informatique', ['support', 'reseau']),
  '63.11Z': T('hébergement et cloud', ['cloud', 'reseau']),
  '63.12Z': T('sites et services en ligne', ['dev']),
  '58.21Z': T('jeu vidéo', ['dev']),
  '58.29A': T('édition de logiciels', ['dev']),
  '58.29B': T('édition de logiciels', ['dev']),
  '58.29C': T('édition de logiciels', ['dev']),
  '61.10Z': T('télécoms et réseau', ['reseau']),
  '61.20Z': T('télécoms et réseau', ['reseau']),
  '61.90Z': T('télécoms et réseau', ['reseau']),
  '46.51Z': T('installation de matériel informatique chez ses clients', ['reseau', 'support']),
  '46.52Z': T('matériel réseau et télécoms', ['reseau']),
  '47.41Z': T('vente et dépannage informatique', ['support']),
  '95.11Z': T('dépannage informatique', ['support']),
  '95.12Z': T('maintenance de matériel de communication', ['reseau', 'support'])
};
/* Une entreprise qui n'est PAS du numérique peut avoir un service
   informatique — une collectivité, un hôpital, une banque, une usine.
   Seulement passé une taille : une boulangerie n'a pas de DSI. Le seuil
   est celui où une informatique interne existe (50 salariés). */
const AVEC_SERVICE = new Set(['21', '22', '31', '32', '41', '42', '51', '52', '53']);
export function travailDe(r){
  r = r || {};
  /* le travail du SITE d'abord (son code dit ce qu'on y fait), celui de
     l'entreprise sinon — un code ancien (« 72.1Z ») ne dit rien */
  const t = TRAVAIL[String(r.nafIci || '')] || TRAVAIL[String(r.naf || '')];
  if (t) return t;
  if (AVEC_SERVICE.has(String(r.tranche || '')) || r.categorie === 'GE' || r.categorie === 'ETI')
    return T('informatique interne', ['reseau', 'support', 'dev']);
  return null;
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
/* LE NOM QU'ON RECONNAÎT. RELEVÉ le 6/10 : « Euro-Information Européenne
   de Traitement de l'Information », « Office National d'Information sur
   les Enseignements et les Professions », « T D F ». Personne ne les
   connaît sous ce nom : c'est Euro Information, l'ONISEP, TDF. Quand la
   raison sociale est longue (cinq mots et plus) ou épelée lettre à
   lettre, le sigle déclaré au registre la remplace. Le nom complet reste
   dans l'aperçu. */
function nomConnu(r){
  const brut = String(r.nom_raison_sociale || r.nom_complet || '').trim();
  const sigle = String(r.sigle || '').trim();
  const mots = brut.split(/[\s\-’']+/).filter(w => w && !PETITS.has(w.toLowerCase()));
  if (sigle && (mots.length >= 5 || /^([A-Z] )+[A-Z]$/.test(brut)))
    return /\s/.test(sigle) ? casse(sigle) : sigle.toUpperCase();
  return casse(brut);
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
    /* LE SITE QU'ON REJOINDRAIT (docs/recherche-profil.md). RELEVÉ le
       6/10 autour de Lille : l'établissement a SA taille et SON activité,
       et elles ne sont pas celles de l'entreprise — Fiducial Informatique
       compte 500 à 999 salariés, son bureau de Villeneuve-d'Ascq 6 à 9 ;
       Sopra Steria fait du conseil, son site de Lille édite des
       logiciels. Un stagiaire rejoint le site, pas le groupe. Seulement
       pour un établissement trouvé (pas le siège qu'on montre faute de
       mieux), et seulement quand l'INSEE le sait : « NN » (non diffusé)
       et « 00 » (rien de déclaré, relevé sur des sites qui emploient)
       ne disent rien. */
    const site = !e.est_siege && Array.isArray(r.matching_etablissements) && r.matching_etablissements.includes(e);
    const trSite = String(e.tranche_effectif_salarie || '');
    const trancheIci = site && /^(0[1-9]|[1-5]\d)$/.test(trSite) && e.caractere_employeur !== 'N' && trSite !== tranche ? trSite : '';
    const nafIci = site && e.activite_principale && e.activite_principale !== naf ? String(e.activite_principale) : '';
    /* RELEVÉ le 5/10 (sonde-sources.mjs, partie D) : 81 % du numérique
       dans le Nord ne déclare aucun salarié. Trois indices disent qu'une
       entreprise EMPLOIE — donc qu'elle peut accueillir un stagiaire ou
       un alternant : une convention collective (elle n'existe que dans
       les déclarations sociales d'un employeur), une tranche d'effectif,
       le caractère employeur de l'établissement. Sans aucun, on ne sait
       pas : une entreprise créée cette année n'a pas encore de convention. */
    const comp = (r.complements && typeof r.complements === 'object') ? r.complements : {};
    const conventions = (Array.isArray(comp.liste_idcc) ? comp.liste_idcc : []).map(String).filter(x => /^\d{4}$/.test(x));
    const carac = String(e.caractere_employeur || (r.siege && r.siege.caractere_employeur) || '');
    const employeur = (conventions.length || /^(0[1-9]|[1-5]\d)$/.test(tranche) || carac === 'O') ? true
      : (tranche === '00' || carac === 'N') ? false : null;
    return {
      siren: String(r.siren),
      nom: nomConnu(r),
      raison: casse(r.nom_raison_sociale || r.nom_complet || ''),
      sigle: r.sigle ? String(r.sigle) : '',
      ville: casse(e.libelle_commune || '', false),
      cp: String(e.code_postal || ''),
      dept: deptDuCp(String(e.code_postal || '')),
      adresse: adresseDe(e),
      lat: choisi.lat, lng: choisi.lng,
      siege: !!e.est_siege,
      naf, activite: ACTIVITES[naf] || '',
      tranche, effectif: TRANCHES[tranche] || (employeur ? 'a des salariés' : ''),
      trancheIci, effectifIci: TRANCHES[trancheIci] || '', nafIci,
      employeur,
      /* un entrepreneur individuel est une PERSONNE : sa raison sociale est
         son nom. « À découvrir » ne la montre pas (aucune personne importée
         d'office) ; la fiche, elle, peut la lire par son SIREN. */
      personne: String(r.nature_juridique || '') === '1000' || comp.est_entrepreneur_individuel === true,
      categorie: String(r.categorie_entreprise || ''),
      creation: String(r.date_creation || '').slice(0, 10),
      /* l'ENTREPRISE entière a cessé (« C ») — une question par SIREN ne
         filtre pas les fermées, exprès : une piste dont l'entreprise a
         fermé doit pouvoir le dire */
      fermee: r.etat_administratif === 'C',
      fermeeLe: String(r.date_fermeture || '').slice(0, 10),
      etablissements: nombre(r.nombre_etablissements_ouverts) ?? nombre(r.nombre_etablissements),
      conventions,
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

/* ---------- une entreprise = une ligne, plusieurs questions = une liste ----------
   Ce qui est déjà dans tes pistes ne se redit pas dans « À découvrir » :
   même SIREN, ou même nom (le sigle compte). Une PERSONNE (entrepreneur
   individuel) n'y apparaît jamais. Plusieurs questions peuvent rendre la
   même entreprise : elle ne sort qu'une fois.

   L'ORDRE (docs/sources.md, « Converger » et « Classer ») :
   · les listes se fusionnent par RANGS RÉCIPROQUES (Cormack et al.,
     2009) : chaque entreprise reçoit 1/(60 + rang) dans chaque liste qui
     la contient. Aucun score commun n'est nécessaire, et une entreprise
     que deux questions rendent monte d'elle-même ;
   · ce que tu as tapé passe devant : une liste rendue pour un NOM garde
     l'ordre de l'annuaire (c'est lui qui sait quelle « Orange » tu
     cherches), une liste rendue pour un MÉTIER tapé en texte (« cyber »)
     vient ensuite, puis le reste ;
   · dans chacun de ces rangs, sauf le nom : l'employeur avant l'inconnu
     avant celle qui ne déclare personne, puis ce qui colle à ta
     formation (docs/recherche-profil.md), puis la plus proche — par
     paliers, jamais au mètre près —, puis la fusion. */
export const RRF_K = 60;
const RANG_GENRE = { nom: 0, metier: 1, liste: 2 };
export const PALIERS_KM = [5, 10, 20, 50];
const palier = (r, o) => {
  if (o.userPos && r.distance != null){
    const i = PALIERS_KM.findIndex(k => r.distance <= k);
    return i < 0 ? PALIERS_KM.length : i;
  }
  if (o.ville) return cleDe(r.ville) === o.ville ? 0 : 1;
  return 0;
};
const rangEmployeur = r => r.employeur === true ? 0 : r.employeur === false ? 2 : 1;
export function decouvertes(listes, companies, o){
  o = o || {};
  const genres = o.genres || [];
  const sirens = new Set(), noms = new Set();
  for (const c of companies || []){
    if (!c) continue;
    if (c.siren) sirens.add(String(c.siren));
    const n = normName(c.name);
    if (n) noms.add(n);
  }
  const vus = new Map();
  let ordre = 0;
  (listes || []).forEach((l, k) => (l || []).forEach((r, i) => {
    if (!r || r.personne || sirens.has(r.siren)) return;
    /* « Pas pour moi » : écartée une fois, elle ne revient plus */
    if (o.ecartees && o.ecartees.has(r.siren)) return;
    /* autour d'une ville : ce qui tombe trop loin de son centre n'est
       pas « à Lille » (`o.loin`, en km) */
    if (o.loin && r.distance != null && r.distance > o.loin) return;
    if (noms.has(normName(r.nom)) || (r.raison && noms.has(normName(r.raison))) || (r.sigle && noms.has(normName(r.sigle)))) return;
    let x = vus.get(r.siren);
    if (!x){ x = { r, fusion: 0, premier: ordre++, genre: 9 }; vus.set(r.siren, x); }
    x.fusion += 1 / (RRF_K + i + 1);
    x.genre = Math.min(x.genre, RANG_GENRE[genres[k]] ?? RANG_GENRE.liste);
  }));
  /* TA FORMATION (`o.metier`) : à égalité d'employeur, ce qui colle au
     métier qu'elle dit passe devant ce qui est plus près — un stage de
     développement à 12 km vaut mieux qu'un poste de support à 3 */
  const colle = r => o.metier && (travailDe(r) || { metiers: [] }).metiers.includes(o.metier) ? 0 : 1;
  return [...vus.values()].sort((a, b) => (a.genre - b.genre)
    || (a.genre > 0 ? (rangEmployeur(a.r) - rangEmployeur(b.r)) || (colle(a.r) - colle(b.r)) || (palier(a.r, o) - palier(b.r, o)) : 0)
    || (b.fusion - a.fusion) || (a.premier - b.premier)).map(x => x.r);
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
    /* « En bref » est TA phrase : l'annuaire ne la remplit pas. La carte
       dit déjà ce que fait l'entreprise, dans ses missions. */
    desc: '',
    siren: r.siren,
    lat: r.lat, lng: r.lng,
    positions: [], contacts: []
  };
}
export const ficheOfficielle = siren => /^\d{9}$/.test(String(siren || '')) ? FICHE_OFFICIELLE + siren : '';


/* ============================================================
   LOT 3 — la fiche s'enrichit (docs/recherche.md, lot 3)

   Une piste qui porte un SIREN se relit dans l'annuaire : la question ne
   contient QUE le SIREN — neuf chiffres publics, qui ne disent rien de
   toi. Une piste sans SIREN se cherche par son NOM, et seulement sur un
   geste (« Trouver dans l'annuaire ») : c'est toi qui choisis laquelle
   est la tienne, parce qu'un homonyme rendrait le dirigeant d'une
   autre entreprise.
   ============================================================ */
const SIREN_OK = s => /^\d{9}$/.test(String(s || ''));
export function questionSiren(siren){
  if (!SIREN_OK(siren)) return '';
  /* sans `etat_administratif` : une entreprise FERMÉE doit revenir, pour
     que la fiche puisse le dire */
  return `${ANNUAIRE}/search?q=${siren}&per_page=1`;
}
/* Le nom de la piste, borné par son département quand on le connaît —
   « Orange » à Lille rend l'Orange qui a un établissement dans le Nord,
   et l'établissement montré est celui de la ville de la piste. */
export function questionNom(c, dept){
  const q = String((c && c.name) || '').trim();
  if (q.length < 2) return '';
  const p = new URLSearchParams({ q });
  if (dept) p.set('departement', dept);
  p.set('etat_administratif', 'A');
  p.set('per_page', '5');
  return `${ANNUAIRE}/search?${p.toString()}`;
}

/* ---------- le site web, par Wikidata ----------
   Propriété P1616 = SIREN, P856 = site officiel. Relevé par la sonde :
   le service SPARQL répond à une page d'une autre origine. Le SIREN est
   vérifié (neuf chiffres) AVANT d'entrer dans la requête — rien d'autre
   n'y entre jamais. */
export const WIKIDATA = 'https://query.wikidata.org/sparql';
export function questionSite(siren){
  if (!SIREN_OK(siren)) return '';
  const q = `SELECT ?site WHERE { ?e wdt:P1616 "${siren}" . ?e wdt:P856 ?site } LIMIT 3`;
  return `${WIKIDATA}?format=json&query=${encodeURIComponent(q)}`;
}
/* le premier site en https, sinon en http ; rien d'autre ne passe */
export function lireSite(json){
  const b = (json && json.results && Array.isArray(json.results.bindings)) ? json.results.bindings : [];
  const sites = b.map(x => String((x && x.site && x.site.value) || '').trim()).filter(u => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(u));
  return sites.find(u => /^https:/i.test(u)) || sites[0] || '';
}

/* ---------- ce que l'annuaire peut ajouter à une fiche ----------
   Invariant ② : on COMPLÈTE les vides, on n'écrase jamais. Rend
   seulement les champs vides que l'annuaire sait remplir — un objet
   vide si rien. La position voyage AVEC l'adresse : posée seule, elle
   contredirait une adresse saisie à la main ailleurs. */
export function complements(c, r, site){
  const out = {};
  const vide = v => !String(v == null ? '' : v).trim();
  if (r){
    if (!c.siren && SIREN_OK(r.siren)) out.siren = r.siren;
    if (vide(c.city) && r.ville) out.city = r.ville;
    if (vide(c.address) && r.adresse){
      out.address = r.adresse;
      if (r.lat != null && r.lng != null){ out.lat = r.lat; out.lng = r.lng; }
    }
    /* les missions en mots simples, pas le libellé de l'INSEE */
    const t = travailDe(r);
    if (vide(c.desc) && (t || r.activite)) out.desc = t ? t.texte.charAt(0).toUpperCase() + t.texte.slice(1) : r.activite;
    if ((!c.domain || c.domain === 'autre') && domaineDeNaf(r.naf) !== 'autre') out.domain = domaineDeNaf(r.naf);
  }
  if (vide(c.website) && site) out.website = site;
  return out;
}
/* le nom de chaque champ, tel que la fiche le dit (pour la donnée posée
   à côté du geste : « site · adresse ») */
const NOMS_CHAMP = { city: 'ville', address: 'adresse', desc: 'activité', website: 'site', domain: 'secteur' };
export const champsDits = comp => Object.keys(comp || {}).map(k => NOMS_CHAMP[k]).filter(Boolean);

/* ---------- un dirigeant devient un contact — seulement si on le veut ----------
   (décision du mainteneur : la fiche montre le dirigeant ; il ne devient
   un contact, et ne voyage dans un partage, que si tu l'ajoutes) */
export function dirigeantsAjoutables(c, r){
  const deja = new Set((c.contacts || []).map(t => normName(t.name)).filter(Boolean));
  return ((r && r.dirigeants) || []).filter(d => d.personne && d.nom && !deja.has(normName(d.nom)));
}

/* ---------- trois liens d'un tap ----------
   L'app ne lit rien de ces sites : elle ouvre la bonne page, et c'est
   toi qui regardes (pas d'aspiration — la CNIL a sanctionné en 2024 la
   collecte de coordonnées depuis LinkedIn). Le nom de l'entreprise part
   dans le lien, et ton école pour LinkedIn : sur ton geste, vers le
   site que le bouton nomme. */
export const LINKEDIN_GENS = 'https://www.linkedin.com/search/results/people/?keywords=';
export const FRANCE_TRAVAIL = 'https://candidat.francetravail.fr/offres/recherche?motsCles=';
export const ANNUAIRE_WEB = 'https://annuaire-entreprises.data.gouv.fr/rechercher?terme=';
export function liensPiste(c, profile){
  const nom = String((c && c.name) || '').trim();
  if (!nom) return [];
  const ecole = String((profile && profile.ecole) || '').trim();
  return [
    { cle: 'gens', label: ecole ? 'Anciens de mon école' : 'Qui y travaille',
      aria: ecole ? `Anciens de ${ecole} chez ${nom}, sur LinkedIn` : `Qui travaille chez ${nom}, sur LinkedIn`,
      url: LINKEDIN_GENS + encodeURIComponent(ecole ? `${nom} ${ecole}` : nom) },
    { cle: 'offres', label: 'Offres d’emploi', aria: `Offres chez ${nom}, sur France Travail`,
      url: FRANCE_TRAVAIL + encodeURIComponent(nom) },
    { cle: 'officielle', label: 'Fiche officielle', aria: `Fiche officielle de ${nom}, annuaire des entreprises`,
      url: SIREN_OK(c.siren) ? ficheOfficielle(c.siren) : ANNUAIRE_WEB + encodeURIComponent(nom) }
  ];
}

/* ---------- qui recrute en alternance, autour d'ici ----------
   (docs/utile.md) « Je ne sais pas si elles recrutent » : l'annuaire ne
   le dit pas, et l'API de La bonne alternance — qui le sait, entreprise
   par entreprise — refuse toute page web (RELEVÉ le 6/10 : aucun en-tête
   CORS, avec ou sans jeton ; et ses conditions interdisent de diffuser un
   jeton). Son SITE, lui, s'ouvre d'un lien : RELEVÉ, « réseau » autour
   de Lille y montre dix offres d'alternance d'entreprises locales, où
   l'on postule directement — le service public de l'alternance.
   Le lien ne part que pour une ALTERNANCE (tapée, ou celle de ton
   profil), et seulement avec un lieu qui a un centre. Il porte le
   métier (codes ROME) et le point, rien d'autre. */
export const LBA = 'https://labonnealternance.apprentissage.beta.gouv.fr/recherche';
/* LE LIBELLÉ DÉCIDE, PAS SEULEMENT LES CODES. RELEVÉ le 6/10 : le site
   cherche AUSSI par mot-clé sur le libellé. Mêmes codes, même ville :
   « Administration réseau » rend dix offres à Nantes, « Systèmes et
   cloud » aucune — même à Lille ; « Cybersécurité » une seule, hors
   sujet, à 84 km. Seuls les libellés MESURÉS porteurs sont gardés : le
   cloud et la cyber passent par l'administration des systèmes et des
   réseaux, qui est d'ailleurs le métier qu'on y fait en alternance. */
const RESEAU_LBA = { romes: ['M1801', 'M1810'], nom: 'Administration réseau' };
export const ROMES = {
  reseau:  RESEAU_LBA,
  cloud:   RESEAU_LBA,
  cyber:   RESEAU_LBA,
  support: { romes: ['I1401', 'M1810'], nom: 'Support informatique' },
  dev:     { romes: ['M1805'], nom: 'Développement informatique' },
  data:    { romes: ['M1805'], nom: 'Développement informatique' }
};
const ROMES_NUMERIQUE = { romes: ['M1805', 'M1801', 'M1810', 'M1802'], nom: 'Informatique' };
export function offresAlternance(interp, o){
  o = o || {};
  const et = (interp && interp.etiquettes) || [];
  const rech = et.find(e => e.famille === 'recherche');
  if (rech ? rech.cle !== 'alternance' : o.recherche !== 'alternance') return null;
  const lieu = et.find(e => e.famille === 'lieu' && Array.isArray(e.centre));
  const pos = lieu ? { lat: lieu.centre[0], lng: lieu.centre[1], nom: lieu.label } : o.centre || null;
  if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return null;
  const m = et.find(e => e.famille === 'metier' && ROMES[e.cle]);
  const r = (m && ROMES[m.cle]) || ROMES[o.metier] || ROMES_NUMERIQUE;
  const p = new URLSearchParams({ romes: r.romes.join(','), lat: pos.lat.toFixed(3), lon: pos.lng.toFixed(3),
    radius: '30', job_name: r.nom, address: pos.nom || '' });
  return { url: LBA + '?' + p.toString(), lieu: pos.nom || '' };
}


/* ============================================================
   UNE RECHERCHE À TA MESURE (docs/recherche-profil.md)

   Ce que le profil AJOUTE à une question, quand la barre ne le dit pas :
   · ta ville et ton rayon (« Où je cherche ») — quand la question n'a
     pas de lieu à elle ;
   · le métier que dit ta formation — quand la question n'a ni métier ni
     texte (un nom tapé se cherche partout, sans être bridé).
   Chacun devient une ÉTIQUETTE que l'écran montre, avec sa croix : rien
   ne part en ton nom sans se voir. Retirée, elle reste PROPOSÉE en
   pointillé — un tap la remet. `sans` dit ce que tu as retiré.
   Ce qui part vers l'annuaire est ce qu'une ville tapée ferait partir :
   le CENTRE de la ville (lu dans la table) et des codes d'activité.
   Jamais le texte de ton profil.
   ============================================================ */
export function ajoutsProfil(interp, profile, sans){
  sans = sans || {};
  const et = (interp && interp.etiquettes) || [];
  const texte = (interp && interp.texte) || [];
  const out = { interp, lieu: null, metier: null, lieuPropose: null, metierPropose: null };
  if (et.some(e => e.famille === 'statut' || e.famille === 'groupe')) return out;
  const lieu = !et.some(e => e.famille === 'lieu') ? lieuDuProfil(profile) : null;
  const metier = !et.some(e => e.famille === 'metier') && !texte.length ? metierEtiquetteDuProfil(profile) : null;
  if (lieu){ if (sans.lieu) out.lieuPropose = lieu; else out.lieu = lieu; }
  if (metier){ if (sans.metier) out.metierPropose = metier; else out.metier = metier; }
  const ajout = [out.metier, out.lieu].filter(Boolean);
  if (ajout.length) out.interp = { ...interp, q: (interp && interp.q) || '', texte, etiquettes: [...et, ...ajout] };
  return out;
}
/* le rayon d'une recherche autour d'une ville : celui de ton profil
   (5, 15 ou 30 km), et ce qui tombe au-delà du DOUBLE est écarté — la
   jumelle « 10-499 salariés » demande tout le département, c'est la
   distance qui la borne. Jamais plus de 50 km. */
export const loinDe = rayon => Math.min((rayon || RAYON_VILLE) * 2, RAYON_MAX);

/* ---------- les offres de STAGE (décision du mainteneur, 6/10) ----------
   HelloWork garde ses critères dans son adresse (RELEVÉ le 6/10,
   sonde-profil.mjs ⑥, depuis un vrai navigateur) : « stage réseau » à
   Lille rend 9 offres, « stage développeur » à Lyon 64, « stage
   cybersécurité » à Rennes 6, « stage informatique » à Nantes 67 — mais
   « stage support informatique » à Marseille, UNE. Seuls les mots
   mesurés porteurs sont gardés ; le reste passe par « stage
   informatique ». Le site public (1jeune1solution) perd ses critères :
   il n'a pas de lien. Rien ne part sans ton geste. */
export const HELLOWORK = 'https://www.hellowork.com/fr-fr/emploi/recherche.html';
const MOTS_STAGE = { reseau: 'stage réseau', cloud: 'stage réseau', dev: 'stage développeur', cyber: 'stage cybersécurité' };
export function offresStage(interp, o){
  o = o || {};
  const et = (interp && interp.etiquettes) || [];
  const rech = et.find(e => e.famille === 'recherche');
  if (rech ? rech.cle !== 'stage' : o.recherche !== 'stage') return null;
  const lieu = et.find(e => e.famille === 'lieu' && Array.isArray(e.centre));
  const nom = lieu ? lieu.label : (o.ville || '');
  if (!nom) return null;
  const m = et.find(e => e.famille === 'metier' && MOTS_STAGE[e.cle]);
  const k = (m && MOTS_STAGE[m.cle]) || MOTS_STAGE[o.metier] || 'stage informatique';
  return { url: HELLOWORK + '?' + new URLSearchParams({ k, l: nom }).toString(), lieu: nom };
}

/* ---------- le site web, par Clearbit (décision du mainteneur, 6/10) ----------
   Quand ni ta fiche ni Wikidata ne connaissent le site, l'autocomplétion
   de Clearbit (sans clé) le propose. RELEVÉ le 6/10 (sonde-profil.mjs ⑦,
   vingt entreprises réelles) : le PREMIER résultat est souvent un autre
   — « Advens » rendait d'abord advenser.com, « Linkt » Linktree. Trois
   gardes, qui donnent 12 bons sites sur 20 et aucun faux :
   · le nom rendu est EXACTEMENT celui cherché (accents, casse et
     ponctuation mis à part) ;
   · le domaine finit par une extension générique ou française — un
     homonyme belge, australien ou brésilien ne passe pas ;
   · parmi ceux qui restent, celui dont le domaine EST le nom passe
     devant (inetum.com plutôt que l'ancien gfi-info.fr).
   Ce qui part : le nom de l'entreprise que tu regardes, rien d'autre. */
export const CLEARBIT = 'https://autocomplete.clearbit.com/v1/companies/suggest?query=';
export const questionClearbit = nom => String(nom || '').trim().length >= 2 ? CLEARBIT + encodeURIComponent(String(nom).trim()) : '';
const EXT_OK = /\.(fr|com|eu|net|org|io|tech|ai|group|cloud|digital|paris|bzh|alsace|corsica)$/i;
const NOM_PLIE = s => fold(String(s || '')).replace(/[^a-z0-9]+/g, ' ').trim();
export function lireClearbit(json, nom){
  const voulu = NOM_PLIE(nom);
  if (!voulu || !Array.isArray(json)) return '';
  const bons = json.filter(x => x && typeof x.domain === 'string' && NOM_PLIE(x.name) === voulu
    && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x.domain) && EXT_OK.test(x.domain));
  if (!bons.length) return '';
  const colle = voulu.replace(/ /g, '');
  const meme = bons.find(x => x.domain.toLowerCase().split('.')[0].replace(/-/g, '') === colle);
  return 'https://' + (meme || bons[0]).domain.toLowerCase();
}

/* ---------- « Pas pour moi » et « Nouveau » (décisions du mainteneur, 6/10) ----------
   PAS POUR MOI : une entreprise écartée ne revient plus dans « À
   découvrir ». Elle vit dans le profil (`ecartees`) — donc suit tes
   appareils et ta copie —, avec son nom, pour pouvoir la rendre.
   NOUVEAU : refaire une recherche montre ce qui n'y était pas la fois
   d'avant. La première fois, rien n'est « nouveau » — tout l'est, donc
   rien ne départage. Le souvenir vit sur CET appareil (`oc_vus_v1`) : ce
   n'est pas une donnée, c'est un repère. */
export function ecarter(liste, r, now){
  const l = (liste || []).filter(x => x.siren !== r.siren);
  l.push({ siren: String(r.siren), nom: String(r.nom || '').slice(0, 120), at: now || Date.now() });
  return l.slice(-300);
}
export const rendre = (liste, siren) => (liste || []).filter(x => x.siren !== siren);
export const sirensEcartes = liste => new Set((liste || []).map(x => x.siren));

export const VUS_RECHERCHES = 30, VUS_SIRENS = 300;
/* une recherche = ses questions, sans la page */
export function cleVus(urls){
  return (urls || []).map(u => { try { const x = new URL(u); x.searchParams.delete('page'); return x.pathname + '?' + x.searchParams.toString(); } catch (e) { return ''; } })
    .filter(Boolean).sort().join('|');
}
export function lireVus(raw){
  let j = raw;
  if (typeof raw === 'string'){ try { j = JSON.parse(raw); } catch (e) { j = null; } }
  const r = {};
  if (j && j.r && typeof j.r === 'object')
    for (const [k, v] of Object.entries(j.r))
      if (k && v && Array.isArray(v.s)) r[k] = { at: Number(v.at) || 0, s: v.s.filter(x => /^\d{9}$/.test(String(x))).slice(-VUS_SIRENS) };
  return { v: 1, r };
}
/* ce qui est nouveau DANS cette recherche, par rapport à la fois d'avant */
export function nouveauxDe(vus, cle, sirens){
  const avant = vus && vus.r && vus.r[cle];
  if (!cle || !avant) return new Set();
  const deja = new Set(avant.s);
  return new Set((sirens || []).filter(s => !deja.has(s)));
}
export function noterVus(vus, cle, sirens, now){
  const r = { ...((vus && vus.r) || {}) };
  if (!cle) return { v: 1, r };
  const avant = r[cle] ? r[cle].s : [];
  r[cle] = { at: now || Date.now(), s: [...new Set([...avant, ...(sirens || [])])].slice(-VUS_SIRENS) };
  const cles = Object.keys(r).sort((a, b) => r[b].at - r[a].at);
  for (const k of cles.slice(VUS_RECHERCHES)) delete r[k];
  return { v: 1, r };
}

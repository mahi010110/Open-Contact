/* ============================================================
   OpenContact — moteur · comprendre ce qu'on tape dans la barre

   « alternance Lille » cherchait le texte « alternance » et le texte
   « lille » dans les fiches. Mesuré sur un vrai jeu de pistes : deux
   résultats, parce que le poste visé n'est presque jamais renseigné et
   que la barre ne savait pas qu'une ville est un LIEU. Elle lisait des
   mots ; elle les comprend maintenant (docs/recherche.md).

   Une requête se découpe en mots ; chaque mot trouve UNE famille, ou
   reste du texte :

     ce que tu cherches   stage · alternance · emploi, CDI, CDD
     métier               cyber · cloud · réseau · dev · support · data…
     lieu                 une ville · 59000 · 59 · Hauts-de-France · près de moi
     taille               TPE · PME · ETI
     où j'en suis         à contacter · en cours · réponse · sans nouvelles…
     le groupe            un prénom déclaré (« Léa ») · recommandées
     texte                tout le reste : un nom, une techno

   QUATRE RÈGLES, qui sont le contrat de ce fichier (tests.js les tient) :

   1. MIEUX VAUT NE PAS COMPRENDRE QUE MAL COMPRENDRE. Seul un vocabulaire
      sans ambiguïté devient une étiquette ; « Orange » reste du texte.
      Les tables sont ici et dans `lieux.js`, lisibles et testables mot à
      mot — une table, pas une IA (recherche.md, principe 7).
   2. AUCUN MOT PERDU. Chaque mot finit dans une étiquette, dans le texte,
      ou parmi les mots de liaison (« à », « de », « chez ») — jamais
      nulle part.
   3. UNE ÉTIQUETTE NE PERD JAMAIS CE QUE LE TEXTE TROUVAIT, sauf quand
      elle est là POUR ça. Une ville, un métier, un prénom, un poste
      acceptent aussi la simple présence du mot dans la fiche : « Lyon »
      retrouve toujours « Lyon Data Center » installé à Villeurbanne,
      seulement APRÈS celles qui sont à Lyon. Deux familles font
      exception, exprès : un numéro (« 59 » ne doit plus remonter les
      numéros de téléphone) et l'état d'une piste (« réponse » n'est pas
      le mot « réponse » écrit dans une note).
   4. LA RAISON SE LIT SUR LA LIGNE. Ce qui correspond pleinement passe
      devant ce qui correspond à moitié, et la ligne dit pourquoi
      (`raisonDe`) : « Léa y a été en alternance », « prend des
      alternants ».

   Fonctions pures : l'écran demande, le moteur répond — rien ici ne lit
   l'écran ni le réseau.
   ============================================================ */
import { fold, foldAligned, filterCompanies, blobOf } from './filter.js';
import { DOMAINS, STATUSES, CLOSE_REASONS, VECU } from './model.js';
import { silentPistes } from './assist.js';
import { scoreOf } from './score.js';
import { extractCity, todayISO } from './utils.js';
import { VILLES, DEPARTEMENTS, DEPT_NOM_AMBIGU, REGIONS } from './lieux.js';

/* ---------- les mots ---------- */
const plier = s => fold(s).replace(/œ/g, 'oe').replace(/æ/g, 'ae');
const motsDe = s => plier(s).split(/[^a-z0-9]+/).filter(Boolean);
/* le pluriel ne change rien au sens : « stages », « réseaux » */
const singulier = w => (w.length >= 4 && /[sx]$/.test(w) && !/ss$/.test(w)) ? w.slice(0, -1) : w;
export const cleDe = s => motsDe(s).map(singulier).join(' ');

/* Les mots de liaison : ils relient, ils ne cherchent rien. Taper
   « alternance à Lille » ne doit pas exiger la lettre « a » dans la
   fiche. « entreprise », « société » ou « piste » ne départagent rien
   non plus — toutes les pistes en sont — et « entreprise » vit dans un
   libellé de domaine (« DSI / Grande entreprise ») : chercher le mot
   ne garderait que celles-là. */
const LIAISON = new Set(['a', 'au', 'aux', 'de', 'd', 'du', 'des', 'la', 'le', 'les', 'l', 'en', 'et',
  'ou', 'un', 'une', 'dans', 'sur', 'pour', 'chez', 'vers', 'avec', 'par', 'mon', 'ma', 'mes',
  'entreprise', 'societe', 'boite', 'piste',
  /* ce qui décrit L'ÉTUDIANT, pas l'entreprise : « alternance BTS SIO »
     cherche une entreprise pour un BTS SIO, pas une fiche qui contient
     les lettres « bts » — exiger le mot vidait la liste */
  'bts', 'sio', 'but', 'dut', 'iut', 'licence', 'master', 'bac', 'etudiant', 'etudiante'].map(singulier));

/* ---------- le vocabulaire ---------- */
/* ce que tu cherches → les « postes » d'une piste (POSITIONS) */
export const RECH = {
  stage:      { label: 'Stage', postes: ['stage'], prend: 'prend des stagiaires',
                mots: ['stage', 'stagiaire', 'internship', 'stage de fin d etudes'] },
  alternance: { label: 'Alternance', postes: ['alternance'], prend: 'prend des alternants',
                mots: ['alternance', 'alternant', 'alternante', 'apprentissage', 'apprenti', 'apprentie',
                       'contrat pro', 'contrat de professionnalisation', 'professionnalisation',
                       'contrat d apprentissage'] },
  emploi:     { label: 'Emploi', postes: ['cdi', 'cdd'], prend: 'recrute',
                mots: ['emploi', 'job', 'embauche', 'premier emploi'] },
  cdi:        { label: 'CDI', postes: ['cdi'], prend: 'recrute en CDI', mots: ['cdi'] },
  cdd:        { label: 'CDD', postes: ['cdd'], prend: 'recrute en CDD', mots: ['cdd'] },
  freelance:  { label: 'Freelance', postes: ['freelance'], prend: 'prend des freelances',
                mots: ['freelance', 'free lance', 'independant', 'independante', 'auto entrepreneur'] }
};
/* Le métier. Les secteurs ont un DOMAINE (DOMAINS) : la piste qui le
   porte correspond pleinement. Les métiers (dev, réseau…) n'en ont pas :
   ce sont leurs RACINES, trouvées dans la fiche (technos, description,
   rôle d'un contact), qui le disent. Une racine de trois lettres ou
   moins se compare au mot entier — « soc » n'est pas « société ». */
export const METIER = {
  cyber:     { label: 'Cybersécurité', domaine: 'cyber',
               mots: ['cyber', 'cybersecurite', 'cyberdefense', 'cyber securite', 'securite informatique',
                      'securite', 'ssi', 'infosec'],
               racines: ['cyber', 'securit', 'soc', 'pentest', 'siem', 'forensic', 'rssi', 'ssi', 'infosec', 'edr'] },
  cloud:     { label: 'Cloud', domaine: 'cloud',
               mots: ['cloud', 'hebergement', 'hebergeur', 'datacenter', 'data center', 'centre de donnees'],
               racines: ['cloud', 'heberg', 'datacenter', 'aws', 'azure', 'gcp', 'kubernetes', 'openstack'] },
  esn:       { label: 'ESN', domaine: 'esn',
               mots: ['esn', 'ssii', 'services numeriques', 'entreprise de services numeriques'],
               racines: ['esn', 'ssii'] },
  dsi:       { label: 'Grande entreprise', domaine: 'dsi',
               mots: ['dsi', 'grande entreprise', 'grand groupe', 'grand compte'], racines: ['dsi'] },
  public:    { label: 'Secteur public', domaine: 'public',
               mots: ['secteur public', 'fonction publique', 'collectivite', 'administration publique', 'public'],
               racines: ['collectivit'] },
  startup:   { label: 'Startup', domaine: 'startup',
               mots: ['startup', 'start up', 'jeune pousse'], racines: ['startup'] },
  industrie: { label: 'Industrie', domaine: 'industrie',
               mots: ['industrie', 'industriel', 'industrielle', 'btp', 'usine'], racines: ['industri', 'btp'] },
  commerce:  { label: 'Commerce', domaine: 'commerce',
               mots: ['commerce', 'retail', 'grande distribution', 'e commerce', 'ecommerce'],
               racines: ['commerc', 'retail'] },
  sante:     { label: 'Santé', domaine: 'sante',
               mots: ['sante', 'medical', 'medicale', 'hopital', 'hospitalier', 'medico social'],
               racines: ['sante', 'medic', 'hopita', 'hospital'] },
  dev:       { label: 'Développement',
               mots: ['dev', 'developpeur', 'developpeuse', 'developpement', 'programmeur', 'programmation',
                      'logiciel', 'web', 'fullstack', 'full stack', 'frontend', 'front end', 'backend',
                      'back end', 'slam', 'devops'],
               racines: ['dev', 'develop', 'devops', 'logiciel', 'programm', 'fullstack', 'frontend',
                         'backend', 'web', 'applicati'] },
  reseau:    { label: 'Réseau',
               mots: ['reseau', 'systeme', 'systeme et reseau', 'infra', 'infrastructure', 'sysadmin',
                      'admin sys', 'administrateur systeme', 'administration systeme', 'sisr', 'tssr',
                      'network', 'telecom'],
               racines: ['reseau', 'system', 'infra', 'sysadmin', 'network', 'telecom', 'cisco', 'tssr', 'sisr'] },
  support:   { label: 'Support',
               mots: ['support', 'helpdesk', 'help desk', 'hotline', 'service desk', 'servicedesk',
                      'technicien', 'technicienne', 'support informatique', 'assistance informatique'],
               racines: ['support', 'helpdesk', 'hotline', 'servicedesk', 'technicien'] },
  data:      { label: 'Data',
               mots: ['data', 'donnees', 'big data', 'data science', 'data analyst', 'data engineer',
                      'business intelligence', 'bi'],
               racines: ['data', 'donnee', 'bi', 'decisionnel'] }
};
/* Où j'en suis. TOUT MOT QUE L'ÉCRAN AFFICHE SUR UNE LIGNE SE CHERCHE :
   « à planifier », « sans nouvelles », les statuts, « Relancer »… On les
   lit sur « Mes pistes » ; on doit pouvoir les taper. Les libellés
   viennent du modèle, pour ne jamais diverger de ce qui est écrit. */
export const STATUT = {
  todo:      { label: STATUSES.todo.label,
               mots: ['a contacter', 'pas contacte', 'pas contactee', 'jamais contacte', 'non contacte'] },
  active:    { label: STATUSES.active.label,
               mots: ['en cours', 'contacte', 'contactee', 'postule', 'postulee', 'candidature envoyee'] },
  reply:     { label: STATUSES.reply.label,
               mots: ['reponse', 'repondu', 'a repondu', 'ont repondu', 'entretien'] },
  silence:   { label: 'Sans nouvelles',
               mots: ['sans nouvelles', 'sans nouvelle', 'sans reponse', 'pas de reponse', 'aucune reponse', 'silence'] },
  relancer:  { label: 'À relancer', mots: ['a relancer', 'relancer', 'relance'] },
  retard:    { label: 'En retard', mots: ['en retard', 'retard', 'depasse', 'depassee'] },
  jour:      { label: 'Aujourd’hui', mots: ['aujourd hui', 'aujourdhui'] },
  semaine:   { label: 'Cette semaine', mots: ['cette semaine', 'semaine'] },
  planifier: { label: 'À planifier', mots: ['a planifier', 'non planifie', 'non planifiee', 'rien de prevu'] },
  prevu:     { label: 'Planifiées', mots: ['planifie', 'planifiee', 'prevu', 'prevue'] },
  cloturee:  { label: 'Clôturées', mots: ['cloture', 'cloturee', 'close', 'fermee', 'archive', 'archivee'] },
  won:       { label: CLOSE_REASONS.won.label, mots: ['decroche', 'decrochee', 'gagne', 'accepte', 'acceptee'] },
  rejected:  { label: CLOSE_REASONS.rejected.label,
               mots: ['refuse', 'refusee', 'refus', 'rejete', 'rejetee', 'non retenu', 'non retenue'] },
  dropped:   { label: CLOSE_REASONS.dropped.label, mots: ['abandonne', 'abandonnee', 'abandon'] }
};
/* La taille. Rien dans une piste ne la dit (l'annuaire, lui, la connaît :
   « À découvrir » la filtre pour de bon) ; en local elle ne retire donc
   rien, sauf ce qui la contredit. « Grande entreprise » reste le métier
   `dsi`, dont c'est déjà le libellé (« DSI / Grande entreprise »). */
export const TAILLE = {
  tpe: { label: 'TPE', mots: ['tpe', 'tres petite entreprise', 'petite entreprise', 'petite structure', 'petite boite'] },
  pme: { label: 'PME', mots: ['pme', 'pmi', 'moyenne entreprise'] },
  eti: { label: 'ETI', mots: ['eti', 'entreprise de taille intermediaire'] }
};
const RECOMMANDEE = ['recommandee', 'recommande', 'recommandation', 'piston'];
const PROCHE = ['pres de moi', 'autour de moi', 'proche de moi', 'a cote de moi'];

/* « St-Étienne » se tape aussi souvent que « Saint-Étienne » */
const variantes = nom => {
  const out = [nom];
  if (/^Saint-/.test(nom)) out.push(nom.replace(/^Saint-/, 'St-'));
  if (/^Sainte-/.test(nom)) out.push(nom.replace(/^Sainte-/, 'Ste-'));
  return out;
};
const VILLE_DEPT = new Map(VILLES.map(v => [cleDe(v.nom), v.dept]));

/* Le dictionnaire : une phrase normalisée → ce qu'elle veut dire. Le
   premier arrivé garde la place : le vocabulaire fixe passe avant les
   villes et les prénoms tirés des pistes. */
let memo = { cle: null, dict: null };
function dictionnaire(ctx){
  const villes = (ctx && ctx.villes) || [];
  const prenoms = (ctx && ctx.prenoms) || [];
  const cle = villes.join('|') + '#' + prenoms.join('|');
  if (memo.cle === cle) return memo.dict;
  const dict = new Map();
  const poser = (phrase, e) => { const k = cleDe(phrase); if (k && !dict.has(k)) dict.set(k, e); };
  for (const [k, d] of Object.entries(STATUT))
    for (const m of d.mots) poser(m, { famille: 'statut', cle: k, label: d.label });
  for (const [k, d] of Object.entries(RECH))
    for (const m of d.mots) poser(m, { famille: 'recherche', cle: k, label: d.label, postes: d.postes });
  for (const [k, d] of Object.entries(METIER))
    for (const m of d.mots) poser(m, { famille: 'metier', cle: k, label: d.label, domaine: d.domaine || '',
      racines: d.racines });
  for (const [k, d] of Object.entries(TAILLE))
    for (const m of d.mots) poser(m, { famille: 'taille', cle: k, label: d.label });
  for (const m of RECOMMANDEE) poser(m, { famille: 'groupe', cle: 'recommandee', label: 'Recommandées' });
  for (const m of PROCHE) poser(m, { famille: 'lieu', cle: 'proche', label: 'Près de moi' });
  for (const [k, r] of Object.entries(REGIONS))
    for (const m of r.alias) poser(m, { famille: 'lieu', cle: 'region:' + k, label: r.nom, depts: r.depts });
  for (const v of VILLES)
    for (const n of variantes(v.nom))
      poser(n, { famille: 'lieu', cle: 'ville:' + cleDe(v.nom), label: v.nom, ville: cleDe(v.nom), dept: v.dept });
  for (const [code, nom] of Object.entries(DEPARTEMENTS))
    if (!DEPT_NOM_AMBIGU.has(code))
      poser(nom, { famille: 'lieu', cle: 'dept:' + code, label: `${nom} (${code})`, depts: [code] });
  /* les villes des pistes : celles que la table n'a pas (un village, une
     zone d'activité) se comprennent quand même, telles qu'elles sont écrites */
  for (const v of villes)
    poser(v, { famille: 'lieu', cle: 'ville:' + cleDe(v), label: v, ville: cleDe(v), dept: VILLE_DEPT.get(cleDe(v)) || '' });
  for (const p of prenoms)
    poser(p, { famille: 'groupe', cle: 'prenom:' + cleDe(p), label: p, prenom: cleDe(p) });
  memo = { cle, dict };
  return dict;
}
/* la plus longue phrase reconnue : « provence alpes côte d'azur » */
const PHRASE_MAX = 6;

/* un numéro : code postal (5 chiffres) ou département (2, 2A/2B, 97x) */
const RE_CP = /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/;
const RE_DEPT = /^(?:0[1-9]|1\d|2[1-9ab]|[3-8]\d|9[0-5]|97[1-46])$/;
export function deptDuCp(cp){
  if (!/^\d{5}$/.test(String(cp || ''))) return '';
  if (cp.startsWith('97')) return cp.slice(0, 3);
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}
function nombre(mot){
  if (RE_CP.test(mot)) return { famille: 'lieu', cle: 'cp:' + mot, label: mot, cp: mot, nombre: true };
  if (RE_DEPT.test(mot)){
    const code = mot.toUpperCase();
    return { famille: 'lieu', cle: 'dept:' + code, label: `${DEPARTEMENTS[code]} (${code})`, depts: [code], nombre: true };
  }
  return null;
}

/* ---------- découper en gardant les positions ----------
   Chaque mot garde sa place dans la phrase tapée : retirer une étiquette
   retire SES mots du champ, et rien d'autre. Des guillemets forcent le
   texte — « "Lens" » cherche le mot, pas la ville. */
function jetons(s){
  const out = [];
  const re = /"([^"]*)"?|«([^»]*)»?|[^\s"«»]+/g;
  let m, bloc = 0;
  while ((m = re.exec(s))){
    const cite = m[1] !== undefined || m[2] !== undefined;
    const dedans = cite ? (m[1] !== undefined ? m[1] : m[2]) : m[0];
    const dec = m.index + (cite ? 1 : 0);
    const low = foldAligned(dedans);
    const wr = /[a-z0-9œæ]+/g;
    let w;
    while ((w = wr.exec(low))){
      const mot = w[0].replace(/œ/g, 'oe').replace(/æ/g, 'ae');
      out.push({ mot, cle: singulier(mot), debut: dec + w.index, fin: dec + w.index + w[0].length,
        cite, bloc, brut: m[0], blocDebut: m.index, blocFin: m.index + m[0].length });
    }
    bloc++;
  }
  return out;
}

/* ---------- interpréter ---------- */
export function interpreter(q, ctx){
  const s = String(q == null ? '' : q);
  const dict = dictionnaire(ctx);
  const toks = jetons(s);
  const etiquettes = [];
  const destin = new Array(toks.length).fill('texte');   /* ce que devient chaque mot */
  let i = 0;
  while (i < toks.length){
    if (toks[i].cite){ i++; continue; }
    let pris = 0;
    for (let n = Math.min(PHRASE_MAX, toks.length - i); n >= 1 && !pris; n--){
      const tranche = toks.slice(i, i + n);
      if (tranche.some(t => t.cite)) continue;
      let e = dict.get(tranche.map(t => t.cle).join(' '));
      if (!e && n === 1) e = nombre(toks[i].mot);
      if (!e) continue;
      const span = [tranche[0].debut, tranche[n - 1].fin];
      const deja = etiquettes.find(x => x.id === e.famille + ':' + e.cle);
      if (deja){ deja.spans.push(span); deja.mots.push(...tranche.map(t => t.mot)); }
      else etiquettes.push({ ...e, id: e.famille + ':' + e.cle, spans: [span], mots: tranche.map(t => t.mot) });
      for (let k = i; k < i + n; k++) destin[k] = 'etiquette';
      pris = n;
    }
    if (pris){ i += pris; continue; }
    if (LIAISON.has(toks[i].cle)) destin[i] = 'liaison';
    i++;
  }
  /* Le texte. Un bloc tapé d'un seul tenant et resté entièrement du
     texte se cherche TEL QUEL : « c++ » ne doit pas devenir « c », ni
     « d'Ascq » devenir « ascq » seul. Un bloc dont une partie a été
     comprise ne rend que ses mots restants. */
  const texte = [];
  const blocs = new Map();
  toks.forEach((t, k) => { if (!blocs.has(t.bloc)) blocs.set(t.bloc, []); blocs.get(t.bloc).push(k); });
  for (const ks of blocs.values()){
    const t0 = toks[ks[0]];
    const tousTexte = ks.every(k => destin[k] !== 'etiquette') && ks.some(k => destin[k] === 'texte');
    if (t0.cite || tousTexte){
      const brut = t0.cite ? s.slice(t0.debut, toks[ks[ks.length - 1]].fin) : t0.brut;
      /* la ponctuation qui COLLE au mot ne fait pas partie de ce qu'on
         cherche (« orange, » ) ; celle qui le compose, si (« c++ », « c# ») */
      const f = plier(brut).trim().replace(/^[^a-z0-9]+/, '').replace(/[,;:.!?()[\]"'«»]+$/, '');
      if (f) texte.push(...(t0.cite ? f.split(/\s+/) : [f]));
      continue;
    }
    for (const k of ks) if (destin[k] === 'texte') texte.push(toks[k].mot);
  }
  return { q: s, etiquettes, texte, destins: destin, jetons: toks };
}

/* ---------- retirer une étiquette du texte tapé ----------
   Taper une étiquette la RETIRE de la phrase : la barre et les étiquettes
   ne disent jamais deux choses différentes. Le mot de liaison qui la
   précédait part avec elle — « alternance à Lille » moins Lille rend
   « alternance », pas « alternance à ». */
/* où commence vraiment ce qu'on retire : le mot de liaison collé devant
   (« à Lille », « l'ESN ») part avec */
function debutAvecLiaison(s, d){
  const avant = s.slice(0, d);
  if (/(?:^|\s)[ld]['’]$/i.test(avant)) return d - 2;
  const mot = avant.match(/(\S+)\s+$/);
  if (mot){
    const w = motsDe(mot[1]);
    if (w.length === 1 && LIAISON.has(singulier(w[0]))) return d - mot[0].length;
  }
  return d;
}
export function retirer(q, spans){
  let s = String(q || '');
  const tri = (spans || []).slice().sort((a, b) => b[0] - a[0]);
  for (const [d, f] of tri) s = s.slice(0, debutAvecLiaison(s, d)) + s.slice(f);
  return s.replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
}
/* remplacer les mots d'une étiquette par d'autres — élargir une ville à
   son département. Même règle que `retirer` : « alternance à Lille »
   devient « alternance 59 », pas « alternance à 59 ». */
export function remplacer(q, spans, par){
  let s = String(q || '');
  const tri = (spans || []).slice().sort((a, b) => b[0] - a[0]);
  if (!tri.length) return s;
  tri.forEach(([d, f], k) => {
    const debut = debutAvecLiaison(s, d);
    const espace = debut < d && debut > 0 ? ' ' : '';
    s = s.slice(0, debut) + (k === tri.length - 1 ? espace + par : '') + s.slice(f);
  });
  return s.replace(/\s{2,}/g, ' ').trim();
}

/* ---------- ce que la barre sait des pistes ----------
   Les villes écrites dans les fiches, et les prénoms déclarés (« Léa y
   a fait son stage ») — c'est tout. Le moteur ne lit rien d'autre. */
export function contexteRecherche(companies, today = todayISO()){
  const villes = new Set(), prenoms = new Set();
  for (const c of companies || []){
    const v = String((c && c.city) || '').trim();
    if (v) villes.add(v);
    if (c && c.vecu && VECU[c.vecu] && String(c.vecuQui || '').trim()) prenoms.add(String(c.vecuQui).trim());
  }
  return { today, villes: [...villes].sort(), prenoms: [...prenoms].sort() };
}

/* ---------- correspondre ----------
   2 = pleinement (la piste EST à Lille, PREND des alternants) ;
   1 = à moitié (le mot est dans la fiche, ou la fiche ne dit pas) ;
   0 = non. */
const plus = (iso, n) => {
  const t = Date.parse(iso + 'T00:00:00Z');
  return Number.isNaN(t) ? iso : new Date(t + n * 86400000).toISOString().slice(0, 10);
};
function lire(c){
  const adr = String(c.address || '');
  const lignes = adr.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const cps = adr.match(/\b\d{5}\b/g) || [];
  const villeCle = cleDe(c.city || extractCity(adr));
  const dept = deptDuCp(cps[cps.length - 1]) || VILLE_DEPT.get(villeCle) || '';
  const contacts = (c.contacts || []).map(t => [t.role, t.note].join(' ')).join(' ');
  return {
    blob: blobOf(c),
    mots: motsDe([c.name, c.desc, c.techs, c.tips, c.process, contacts].join(' ')),
    villeCle,
    derniere: ' ' + cleDe(lignes[lignes.length - 1] || '') + ' ',
    cps, dept
  };
}
const racineDans = (r, mots) => mots.some(m => r.length <= 3 ? m === r : m.startsWith(r));
function etat(c, cle, today){
  const close = !!c.closedReason;
  if (cle === 'cloturee') return close;
  if (cle === 'won' || cle === 'rejected' || cle === 'dropped') return c.closedReason === cle;
  if (close) return false;
  const muette = () => silentPistes([c], today).length > 0;
  switch (cle){
    case 'todo': case 'active': case 'reply': return (c.status || 'todo') === cle;
    case 'silence': return muette();
    case 'relancer': return muette() || (!!c.nextAction && /relanc/.test(plier(c.nextActionText)));
    case 'retard': return !!c.nextAction && c.nextAction < today;
    case 'jour': return c.nextAction === today;
    case 'semaine': return !!c.nextAction && c.nextAction <= plus(today, 6);
    case 'planifier': return !c.nextAction && !muette();
    case 'prevu': return !!c.nextAction;
  }
  return false;
}
/* le département d'une piste — par le code postal de son adresse, sinon
   par sa ville ; '' si on ne sait pas (rien n'est deviné) */
export const deptDePiste = c => lire(c || {}).dept;
export function force(c, e, ctx, L = lire(c)){
  const lit = () => (e.mots.every(w => L.blob.includes(w)) ? 1 : 0);
  switch (e.famille){
    case 'recherche': {
      const p = c.positions || [];
      if (p.some(x => e.postes.includes(x))) return 2;
      /* une fiche muette n'a rien refusé : elle reste, après */
      if (!p.length) return 1;
      return lit();
    }
    case 'metier':
      if (e.domaine && c.domain === e.domaine) return 2;
      if (e.racines.some(r => racineDans(r, L.mots))) return 2;
      return lit();
    case 'lieu':
      if (e.cle === 'proche') return 2;
      if (e.cp) return L.cps.includes(e.cp) ? 2 : 0;
      if (e.depts) return (L.dept && e.depts.includes(L.dept)) ? 2 : (e.nombre ? 0 : lit());
      if (e.ville){
        const v = L.villeCle;
        if (v === e.ville || v.startsWith(e.ville + ' ') || L.derniere.includes(' ' + e.ville + ' ')) return 2;
        return lit();
      }
      return 0;
    case 'statut':
      return etat(c, e.cle, (ctx && ctx.today) || todayISO()) ? 2 : 0;
    case 'taille':
      /* une startup EST une PME ; une grande entreprise n'en est pas une.
         Le reste ne dit rien : la piste reste, après. */
      if (e.cle === 'pme' && c.domain === 'startup') return 2;
      if (c.domain === 'dsi') return lit();
      return 1;
    case 'groupe':
      if (e.cle === 'recommandee') return (c.vecu && c.vecuQui) ? 2 : lit();
      return (c.vecu && c.vecuQui && cleDe(c.vecuQui) === e.prenom) ? 2 : lit();
  }
  return 0;
}

/* ---------- chercher ----------
   Le texte passe par `filterCompanies`, qui garde les filtres d'« Affiner »
   et le tri choisi ; les étiquettes filtrent ensuite, et ce qui
   correspond pleinement passe devant ce qui correspond à moitié — sans
   défaire le tri à l'intérieur de chaque rang.
   `pertinence` (le tri par défaut de l'écran) ajoute l'ordre de la
   maison (§6, « choisir à la place de l'utilisateur ») : quelqu'un du
   groupe peut te porter, puis tu peux écrire tout de suite, puis la
   fiche la mieux remplie. */
const porte = c => !!(c.vecu && c.vecuQui && VECU[c.vecu]);
const joignable = c => (c.contacts || []).some(t => t && t.email);
export function chercherPistes(companies, o){
  o = o || {};
  const ctx = o.ctx || contexteRecherche(companies);
  const interp = o.interp || interpreter(o.q, ctx);
  const filtres = { ...(o.filtres || {}) };
  const proche = interp.etiquettes.some(e => e.cle === 'proche') && o.userPos;
  if (proche){ filtres.sorts = [{ sort: 'dist', dir: '' }]; filtres.userPos = o.userPos; }
  const base = filterCompanies(companies || [], { ...filtres, q: interp.texte.join(' ') });
  if (!interp.etiquettes.length) return { interp, liste: base, faibles: new Map() };
  const items = [];
  base.forEach((c, i) => {
    const L = lire(c);
    let faibles = 0, ok = true;
    for (const e of interp.etiquettes){
      const f = force(c, e, ctx, L);
      if (!f){ ok = false; break; }
      if (f === 1) faibles++;
    }
    if (ok) items.push({ c, faibles, i });
  });
  const pert = o.pertinence && !proche;
  items.sort((a, b) => (a.faibles - b.faibles)
    || (pert ? ((porte(b.c) - porte(a.c)) || (joignable(b.c) - joignable(a.c)) || (scoreOf(b.c) - scoreOf(a.c))) : 0)
    || (a.i - b.i));
  return { interp, liste: items.map(x => x.c), faibles: new Map(items.map(x => [x.c.id, x.faibles])) };
}

/* ---------- pourquoi cette ligne ----------
   UNE raison, la plus forte, et seulement quand on a cherché par
   étiquette : quelqu'un du groupe peut te porter (~40 % d'entretiens
   contre ~3 %), sinon la piste prend ce que tu cherches. Plus les mots
   à montrer dans l'extrait : le texte tapé, et la racine de métier
   trouvée dans un champ que la ligne n'affiche pas (« SOC, SIEM »). */
export function raisonDe(c, interp){
  const mots = [...((interp && interp.texte) || [])];
  if (!interp || !interp.etiquettes.length) return { accent: '', mots };
  let accent = '';
  if (porte(c)) accent = c.vecuQui + ' ' + VECU[c.vecu].court;
  else {
    const r = interp.etiquettes.find(e => e.famille === 'recherche'
      && (c.positions || []).some(p => e.postes.includes(p)));
    if (r) accent = RECH[r.cle].prend;
  }
  const L = lire(c);
  for (const e of interp.etiquettes){
    /* trouvée « à moitié », par le simple mot : c'est l'extrait qui dit
       où — « Léa » remonte Lumen Data parce que Léa y est CTO, et la
       ligne doit pouvoir le montrer */
    if (force(c, e, null, L) === 1 && e.mots.every(w => L.blob.includes(w))){
      for (const w of e.mots) if (!mots.includes(w)) mots.push(w);
      continue;
    }
    if (e.famille !== 'metier' || (e.domaine && c.domain === e.domaine)) continue;
    const trouve = L.mots.find(m => e.racines.some(r => r.length <= 3 ? m === r : m.startsWith(r)));
    if (trouve && !mots.includes(trouve)) mots.push(trouve);
  }
  return { accent, mots };
}

/* ---------- proposer, quand la barre est vide ----------
   Deux ou trois recherches qui ont une RÉPONSE dans tes pistes, avec leur
   compte : elles enseignent le vocabulaire sans une phrase, et une
   proposition sans résultat n'est jamais faite (§6 : ne jamais offrir
   une valeur absente des données). La première vient du profil — ce que
   tu cherches, dans la ville où tu as le plus de pistes. */
const MOT_RECHERCHE = { stage: 'stage', alternance: 'alternance', emploi: 'emploi' };
export function villeFrequente(companies){
  const n = new Map();
  for (const c of companies || []){
    if (!c || c.closedReason || c.demo) continue;
    const v = String(c.city || '').trim();
    if (v) n.set(v, (n.get(v) || 0) + 1);
  }
  const tri = [...n.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'fr'));
  return (tri.length > 1 && tri[0][1] >= 2) ? tri[0][0] : '';
}
export function propositions(companies, profile, ctx, max = 3){
  const vivantes = (companies || []).filter(c => c && !c.closedReason);
  if (!vivantes.length) return [];
  ctx = ctx || contexteRecherche(companies);
  const out = [];
  const essai = q => {
    if (!q || out.some(p => p.q === q)) return;
    const r = chercherPistes(vivantes, { q, ctx });
    if (!r.liste.length || r.liste.length === vivantes.length) return;   /* qui garde tout ne filtre rien */
    out.push({ q, n: r.liste.length, label: r.interp.etiquettes.map(e => e.label).join(' · ') || q });
  };
  const mot = MOT_RECHERCHE[profile && profile.recherche];
  const ville = villeFrequente(vivantes);
  if (mot) essai(ville ? `${mot} ${ville}` : mot);
  essai('recommandées');
  essai('sans nouvelles');
  essai('en retard');
  if (!mot && ville) essai(ville);
  return out.slice(0, max);
}

/* ---------- élargir ----------
   Une recherche qui ne trouve rien n'est jamais une impasse : on propose
   de retirer l'étiquette qui coûte le plus, avec ce qu'on retrouverait.
   Et une VILLE s'élargit à son département même quand elle trouve — un
   étudiant de Lille cherche aussi à Villeneuve-d'Ascq, à deux arrêts de
   métro, et la barre le sait. */
export function elargir(companies, q, o){
  o = o || {};
  const ctx = o.ctx || contexteRecherche(companies);
  const interp = interpreter(q, ctx);
  const compte = q2 => chercherPistes(companies, { q: q2, ctx, filtres: o.filtres }).liste.length;
  const n0 = compte(q);
  const out = [];
  for (const e of interp.etiquettes){
    if (e.famille !== 'lieu' || !e.ville || !e.dept) continue;
    if (interp.etiquettes.some(x => x.cle === 'dept:' + e.dept)) continue;
    const q2 = remplacer(q, e.spans, e.dept);
    const n = compte(q2);
    if (n > n0) out.push({ q: q2, n, gagne: n - n0, label: `${DEPARTEMENTS[e.dept]} (${e.dept})`, genre: 'autour' });
  }
  if (!n0){
    const parts = [...interp.etiquettes.map(e => ({ spans: e.spans, label: e.label }))];
    interp.jetons.forEach((t, k) => {
      if (interp.destins[k] !== 'texte') return;
      parts.push({ spans: [[t.cite ? t.blocDebut : t.debut, t.cite ? t.blocFin : t.fin]], label: t.cite ? t.brut : q.slice(t.debut, t.fin) });
    });
    for (const p of parts){
      const q2 = retirer(q, p.spans);
      if (!q2.trim()) continue;
      const n = compte(q2);
      if (n) out.push({ q: q2, n, label: p.label, genre: 'sans' });
    }
  }
  return out.sort((a, b) => (a.genre === 'autour' ? -1 : 0) - (b.genre === 'autour' ? -1 : 0) || b.n - a.n).slice(0, 2);
}

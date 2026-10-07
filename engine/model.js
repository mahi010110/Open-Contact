/* ============================================================
   OpenContact — moteur · modèle de données
   Ce que « sont » une piste, un contact, un profil : constantes,
   normalisation (v3 : plusieurs contacts par piste), valeurs par
   défaut, historique, gabarits d'emails. C'est le contrat de
   données de l'application — aucun accès au DOM.
   ============================================================ */
import { uid, extractCity, todayISO, fmtDate } from './utils.js';
import { normalizeParcours, parcoursDe, phraseParcours } from './parcours.js';

export const APP_VERSION = '6.53.0';

export const DOMAINS = {
  esn:     { label:'ESN / Services IT',       color:'#4C9FD8' },
  cyber:   { label:'Cybersécurité',           color:'#9B7FD4' },
  cloud:   { label:'Cloud / Hébergeur',       color:'#2FA98C' },
  dsi:     { label:'DSI / Grande entreprise', color:'#D89A3C' },
  public:  { label:'Secteur public',          color:'#D97B54' },
  startup: { label:'Startup / PME tech',      color:'#D56D9B' },
  industrie:{ label:'Industrie / BTP',        color:'#8D6E63' },
  commerce:{ label:'Commerce / Services',     color:'#5C6BC0' },
  sante:   { label:'Santé / Social',          color:'#43A047' },
  autre:   { label:'Autre',                   color:'#8A99A6' }
};
/* statut vivant à 3 crans (v6) — les anciens statuts v5 sont migrés à la
   normalisation : sent/followup → active, interview → reply, won/rejected
   → piste clôturée (closedReason) */
export const STATUSES = {
  todo:   { label:'À contacter', color:'#8A99A6' },
  active: { label:'En cours',    color:'#4C9FD8' },
  reply:  { label:'Réponse',     color:'#9B7FD4' }
};
export const LEGACY_STATUSES = { sent:'active', followup:'active', interview:'reply' };

/* ---------- ce que l'étudiant cherche (profil) ----------
   OpenContact sert trois recherches (CLAUDE.md §1) et le modèle de
   candidature n'en connaissait qu'une : « je cherche un stage », écrit en
   dur. Un alternant devait retoucher chaque mail — ou l'envoyait faux.
   Les recruteurs demandent la même chose dans les trois cas, dès le
   premier paragraphe : le type, la période, et pour l'alternance le
   rythme (L'Étudiant, Hellowork, Welcome to the Jungle). `type` est le
   mot de l'objet du mail ; vide pour l'emploi, où « Candidature
   emploi » ne se dit pas. */
export const RECHERCHES = {
  stage:      { label: 'Stage',      un: 'un stage',       type: 'stage' },
  alternance: { label: 'Alternance', un: 'une alternance', type: 'alternance' },
  emploi:     { label: 'Emploi',     un: 'un emploi',      type: '' }
};
const ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
              'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.',
                    'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const jourDe = iso => {
  if (!ISO_JOUR.test(String(iso || ''))) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const u = new Date(t);
  /* « 2027-02-31 » passe la forme mais pas le calendrier */
  return u.getUTCMonth() === m - 1 && u.getUTCDate() === d ? { y, m, d, t } : null;
};
/* « 6 janvier 2027 », « 1er septembre » — la date telle qu'on l'écrit */
export function dateLongue(iso, annee = true, court = false){
  const j = jourDe(iso);
  if (!j) return '';
  return (j.d === 1 ? '1er' : String(j.d)) + ' ' + (court ? MOIS_COURT : MOIS)[j.m - 1]
    + (annee ? ' ' + j.y : '');
}
/* La durée se DÉDUIT des deux dates, elle ne se saisit pas (§8) : un
   champ de plus serait un champ qui peut contredire les deux autres.
   Un stage se dit en semaines tant qu'il est court, en mois au-delà
   de trois ; une alternance en mois, ou en années rondes. Les bornes
   sont incluses : du lundi 6 au vendredi 7 du mois suivant, c'est
   cinq semaines de travail. `null` si la fin précède le début. */
export function dureeRecherche(debut, fin, recherche){
  const a = jourDe(debut), b = jourDe(fin);
  if (!a || !b || b.t < a.t) return null;
  const jours = Math.round((b.t - a.t) / 86400000) + 1;
  const semaines = Math.round(jours / 7);
  if (recherche !== 'alternance' && semaines < 13){
    if (semaines < 1) return jours + ' jour' + (jours > 1 ? 's' : '');
    return semaines + ' semaine' + (semaines > 1 ? 's' : '');
  }
  const mois = Math.max(1, Math.round(jours / 30.44));
  if (mois % 12 === 0) return (mois / 12) + ' an' + (mois > 12 ? 's' : '');
  return mois + ' mois';
}
export const periodeValide = (debut, fin) => !debut || !fin || dureeRecherche(debut, fin, '') !== null;
/* la phrase du mail : « un stage de 6 semaines, du 6 janvier au 14
   février 2027 ». Sans choix, c'est « un stage » — exactement ce que
   le modèle disait avant : personne ne voit son mail changer tant
   qu'il n'a rien rempli. */
export function phraseRecherche(p){
  p = p || {};
  const cle = RECHERCHES[p.recherche] ? p.recherche : '';
  const r = RECHERCHES[cle || 'stage'];
  if (!cle) return r.un;
  const d = jourDe(p.debut), f = cle === 'emploi' ? null : jourDe(p.fin);
  const duree = d && f ? dureeRecherche(p.debut, p.fin, cle) : null;
  if (cle === 'stage' && duree)
    return `${r.un} de ${duree}, du ${dateLongue(p.debut, d.y !== f.y)} au ${dateLongue(p.fin)}`;
  if (duree) return `${r.un} de ${duree} à partir du ${dateLongue(p.debut)}`;
  if (d) return `${r.un} à partir du ${dateLongue(p.debut)}`;
  return r.un;
}
/* Une piste PREND-ELLE ce que tu cherches ? Ses « postes » (stage,
   alternance, CDI…) le disent quand ils sont remplis — souvent par un
   camarade qui y est passé. Trois réponses, jamais deux : `null` quand
   on ne sait pas (rien de choisi, ou la piste ne dit rien). Une piste
   muette n'est pas une piste qui refuse, et la classer derrière celles
   qui disent non serait inventer. L'emploi, c'est un CDI ou un CDD. */
const POSTES_DE = { stage: ['stage'], alternance: ['alternance'], emploi: ['cdi', 'cdd'] };
export function prendCeQueJeCherche(c, recherche){
  const voulus = POSTES_DE[recherche];
  const postes = (c && c.positions) || [];
  if (!voulus || !postes.length) return null;
  return postes.some(p => voulus.includes(p));
}
/* ce que la ligne dit, quand c'est la raison du classement */
export const PREND_MOT = { stage: 'prend des stagiaires', alternance: 'prend des alternants', emploi: 'recrute' };
/* la même chose en une ligne d'écran — « Stage · 6 janv. → 14 févr. 2027 » */
export function resumeRecherche(p){
  p = p || {};
  const r = RECHERCHES[p.recherche];
  if (!r) return '';
  const d = jourDe(p.debut), f = p.recherche === 'emploi' ? null : jourDe(p.fin);
  const duree = d && f ? dureeRecherche(p.debut, p.fin, p.recherche) : null;
  if (p.recherche === 'stage' && duree)
    return `${r.label} · ${dateLongue(p.debut, d.y !== f.y, true)} → ${dateLongue(p.fin, true, true)}`;
  if (d) return `${r.label} · ${duree ? duree + ' ' : ''}dès le ${dateLongue(p.debut, true, true)}`;
  return r.label;
}
/* Ce qui manque pour qu'un mail de candidature dise qui tu es et ce que
   tu veux. Le nom n'y est pas : sans lui, l'écran montre déjà autre
   chose. Le téléphone non plus : il est utile, jamais indispensable. */
export function manquesProfil(p){
  p = p || {};
  const out = [];
  if (!String(p.formation || '').trim()) out.push('formation');
  if (!String(p.ecole || '').trim()) out.push('école');
  if (!RECHERCHES[p.recherche]) out.push('ce que tu cherches');
  if (!String(p.email || '').trim()) out.push('email');
  return out;
}
/* une adresse qu'un recruteur peut utiliser — pas une validation RFC,
   juste de quoi attraper l'oubli du @ ou du domaine */
export const emailPlausible = s => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(s || '').trim());
/* clôture (privée) : la piste quitte le quotidien, reste dans la liste */
export const CLOSE_REASONS = {
  won:      { label:'Décroché',  color:'#2FA070' },
  rejected: { label:'Refusé',    color:'#D96A74' },
  dropped:  { label:'Abandonné', color:'#8A99A6' }
};
export const POSITIONS = { stage:'Stage', alternance:'Alternance', cdi:'CDI', cdd:'CDD', freelance:'Freelance' };

/* ---------- « j'y suis passé » : ce qui vaut quarante candidatures ----------
   Mesuré dans les données de recrutement 2025 : une candidature à froid
   décroche un entretien dans 3 % des cas (15 % en 2016), une candidature
   portée par quelqu'un de l'intérieur dans 40 %. Une recommandation vaut
   donc une quarantaine d'envois à l'aveugle.

   Or l'app fait circuler des ENTREPRISES dans un groupe. Une promo de
   BTS SIO où chacun a déjà fait un stage est assise sur ce réseau-là, et
   rien n'en traversait : le partage est anonyme par construction, le
   receveur lit « reçu du groupe » sans savoir de qui ni pourquoi.

   `vecu` dit ce qu'on sait de l'INTÉRIEUR. Ce n'est pas une donnée
   privée dérivée du suivi — c'est une déclaration que l'utilisateur
   écrit lui-même sur sa piste, en sachant qu'elle voyagera. L'invariant
   ① tient : rien ne fuit, quelqu'un choisit de dire.

   Vocabulaire fermé, du plus fort au plus faible — l'ordre est le
   contrat, il classe les pistes reçues. */
/* Trois personnes grammaticales, parce que la déclaration se lit à
   trois endroits : la case qu'on coche (« je »), la fiche qui la reçoit
   (« Léa y a fait son stage »), et le message qu'on lui écrit (« tu y as
   fait ton stage ? »). Une seule forme donnait « tu y a fait son stage ». */
/* Quatre formes, et chacune a un appelant — c'est la grammaire qui les
   impose, pas le goût. `quoi` est la plus récente : la puce du
   formulaire vit SOUS le titre « J'y suis passé », donc répéter « J'y
   ai… » dans chaque bouton disait deux fois la même chose (§6) et
   étirait la puce sur toute la largeur. Mesuré à police agrandie :
   quatre puces sur quatre rangs, 197 px d'écran pour quatre mots. */
export const VECU = {
  alternance: { quoi:'Alternance',           label:'J’y ai été en alternance',
                court:'y a été en alternance', tu:'y as été en alternance',   poids:4 },
  stage:      { quoi:'Stage',                label:'J’y ai fait mon stage',
                court:'y a fait son stage',    tu:'y as fait ton stage',      poids:3 },
  entretien:  { quoi:'Entretien',            label:'J’y ai passé un entretien',
                court:'y a passé un entretien', tu:'y as passé un entretien', poids:2 },
  connait:    { quoi:'Je connais quelqu’un', label:'J’y connais quelqu’un',
                court:'y connaît quelqu’un',   tu:'y connais quelqu’un',      poids:1 }
};

/* ---------- 5. modèle v3 : plusieurs contacts par piste ----------
   D3 : les champs inconnus (versions futures) sont conservés dans `extra`
   au lieu d'être perdus silencieusement. */
const KNOWN_CT = ['id','name','role','email','phone','link','note','conf','extra',
  'activatedAt','src'];         /* champs d'action privés (#14) — jamais dans un partage */
const KNOWN_C  = ['id','name','city','domain','desc','address','website','techs','positions','siren',
  'process','tips','contacts','lat','lng','vecu','vecuQui','status','notes','appliedAt','nextAction',
  'nextActionText','closedAt','closedReason','nextActionCt',
  'history','verifiedAt','confirmations','demo','createdAt','updatedAt','extra',
  'contact','email','phone'];   /* les 3 derniers : héritage v1, absorbés dans contacts */
/* un lien ne sort d'ici qu'en http(s) : « javascript: » et consorts, posés
   dans un fichier reçu, deviendraient exécutables au clic (S1 de l'audit) */
export function safeUrl(u){
  u = String(u || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?([\/?#]\S*)?$/i.test(u)) return 'https://' + u;
  return '';
}
/* un id finit en attribut DOM et voyage entre appareils : seul un jeton
   sobre est accepté, tout le reste est régénéré — un id piégé dans un
   fichier reçu ne doit jamais casser le HTML (S2 de l'audit) */
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
export const safeId = v => (typeof v === 'string' && ID_RE.test(v)) ? v : uid();
/* une date s'affiche parfois telle quelle (frDate) : seule la forme
   AAAA-MM-JJ passe — un horodatage complet est tronqué au jour, tout le
   reste est vidé (S3 de l'audit) */
export const isoDay = v => { const m = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(String(v || '')); return m ? m[1] : ''; };
/* « __proto__ » et consorts, posés en clé d'un JSON reçu, détourneraient le
   prototype de l'objet au lieu d'y poser une donnée (S4 de l'audit) */
const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];
function keepExtra(x, known){
  const base = {};
  const src = (x.extra && typeof x.extra === 'object' && !Array.isArray(x.extra)) ? x.extra : null;
  if (src) for (const k of Object.keys(src)) if (!BAD_KEYS.includes(k)) base[k] = src[k];
  for (const k of Object.keys(x)) if (!known.includes(k) && !BAD_KEYS.includes(k)) base[k] = x[k];
  return Object.keys(base).length ? base : null;
}
export function normalizeContact(x){
  x = x || {};
  const out = {
    id: safeId(x.id),
    name: String(x.name || '').trim(),
    role: String(x.role || '').trim(),
    email: String(x.email || '').trim(),
    phone: String(x.phone || '').trim(),
    link: safeUrl(x.link),
    note: String(x.note || '').trim(),
    conf: (x.conf === 'ok' || x.conf === 'doubt') ? x.conf : ''
  };
  /* champs d'action privés (#14) — optionnels, absents quand vides.
     Migration en lecture : un appareil ancien les a rangés dans extra
     (champs inconnus pour lui), on les remonte et on nettoie le doublon. */
  const xe = (x.extra && typeof x.extra === 'object' && !Array.isArray(x.extra)) ? x.extra : {};
  const act = isoDay(x.activatedAt || xe.activatedAt);
  if (act) out.activatedAt = act;
  if (x.src === 'promo' || xe.src === 'promo') out.src = 'promo';
  const extra = keepExtra(x, KNOWN_CT);
  if (extra){
    delete extra.activatedAt;
    delete extra.src;
    if (Object.keys(extra).length) out.extra = extra;
  }
  return out;
}
/* #14 — le contact « activé » (on lui a écrit / posé une action) vs le
   simple nom connu ; et la personne que vise la prochaine action */
export const isActiveCt = ct => !!(ct && ct.activatedAt);
export const nextActionContact = c =>
  (c && c.nextActionCt && (c.contacts || []).find(t => t.id === c.nextActionCt)) || null;
export function contactHasData(ct){ return !!(ct.name || ct.role || ct.email || ct.phone || ct.link || ct.note); }
export function normalizeCompany(x){
  let contacts = Array.isArray(x.contacts) ? x.contacts.map(normalizeContact) : [];
  if (!contacts.length && (x.contact || x.email || x.phone)){
    contacts = [normalizeContact({ name: x.contact, email: x.email, phone: x.phone })];
  }
  contacts = contacts.filter(contactHasData);
  /* migration des statuts v5 : terminaux → clôture, intermédiaires → 3 crans */
  let status = x.status;
  let closedAt = isoDay(x.closedAt);
  let closedReason = CLOSE_REASONS[x.closedReason] ? x.closedReason : '';
  if (status === 'won' || status === 'rejected'){
    if (!closedReason) closedReason = status === 'won' ? 'won' : 'rejected';
    if (!closedAt) closedAt = x.updatedAt ? new Date(x.updatedAt).toISOString().slice(0,10) : todayISO();
    status = 'reply';
  } else if (LEGACY_STATUSES[status]) status = LEGACY_STATUSES[status];
  const out = {
    id: safeId(x.id),
    name: String(x.name || '').trim(),
    city: String(x.city || '').trim() || extractCity(x.address),
    domain: DOMAINS[x.domain] ? x.domain : 'autre',
    desc: x.desc || '',
    address: x.address || '',
    website: x.website || '',
    techs: x.techs || '',
    positions: Array.isArray(x.positions) ? x.positions.filter(p => POSITIONS[p]) : [],
    process: x.process || '',
    tips: x.tips || '',
    contacts,
    lat: (typeof x.lat === 'number') ? x.lat : null,
    lng: (typeof x.lng === 'number') ? x.lng : null,
    status: STATUSES[status] ? status : 'todo',
    notes: x.notes || '', appliedAt: isoDay(x.appliedAt), nextAction: isoDay(x.nextAction),
    nextActionText: String(x.nextActionText || '').trim(),
    closedAt, closedReason,
    history: Array.isArray(x.history) ? x.history.slice(-40) : [],
    verifiedAt: isoDay(x.verifiedAt),
    confirmations: Number(x.confirmations) || 0,
    demo: !!x.demo,
    createdAt: x.createdAt || Date.now(), updatedAt: x.updatedAt || Date.now()
  };
  /* « j'y suis passé » — vocabulaire fermé, absent quand vide. `vecuQui`
     est le prénom de qui l'a vécu : vide chez soi (c'est moi), rempli au
     moment du partage avec le nom du profil. Un nom reçu est tronqué :
     il finit dans une phrase à l'écran, pas dans un roman. */
  /* Le SIREN : neuf chiffres, le même partout (registre, annuaire,
     Wikidata). Absent quand il n'est pas valide — un numéro faux ferait
     fusionner deux entreprises différentes. C'est lui qui dit « la même
     entreprise » quand les noms diffèrent (« Sopra Steria » et « SOPRA
     STERIA GROUP »). */
  const siren = String(x.siren == null ? '' : x.siren).replace(/\s/g, '');
  if (/^\d{9}$/.test(siren)) out.siren = siren;
  if (VECU[x.vecu]){
    out.vecu = x.vecu;
    const qui = String(x.vecuQui || '').trim().slice(0, 40);
    if (qui) out.vecuQui = qui;
  }
  /* #14 — la personne visée par la prochaine action (privé, optionnel,
     absent quand vide) : un jeton d'id seulement, avec la même migration
     en lecture depuis extra que les champs d'action du contact */
  const xe = (x.extra && typeof x.extra === 'object' && !Array.isArray(x.extra)) ? x.extra : {};
  const nact = [x.nextActionCt, xe.nextActionCt]
    .find(v => typeof v === 'string' && ID_RE.test(v));
  if (nact) out.nextActionCt = nact;
  const extra = keepExtra(x, KNOWN_C);
  if (extra){
    delete extra.nextActionCt;
    if (Object.keys(extra).length) out.extra = extra;
  }
  return out;
}
const SIGNATURE = `Bien à vous,
{{moi}}
{{ecole}}
{{tel}} — {{email}}`;
const MODELE_CANDIDATURE = `Bonjour {{contact}},

[Une phrase précise sur ce qu'ils font. Pas « votre entreprise m'intéresse » — ils le lisent dix fois par jour.]

Je suis en {{formation}} et je cherche {{recherche}}.
Rythme : {{rythme}}
Expérience : {{parcours}}
Mon CV : {{cv}}
Je peux passer en parler quand vous voulez.

${SIGNATURE}`;
/* le même, tel que les versions 6.31 à 6.46 l'écrivaient — avant la
   ligne « Expérience » (docs/reseau.md, lot 1) */
const CANDIDATURE_6_31 = MODELE_CANDIDATURE.replace('Expérience : {{parcours}}\n', '');
const MODELE_RELANCE = `Bonjour {{contact}},

Je reviens vers vous au sujet de ma candidature.

[Du neuf depuis : un projet fini, une techno apprise, une actu de chez eux. Une relance qui n'apporte rien n'appelle rien.]

Toujours très motivé pour vous rejoindre — je reste dispo.

${SIGNATURE}`;
/* Les modèles de départ tels que les versions passées les écrivaient
   (6.30, puis 6.31 à 6.46). Un modèle que
   l'étudiant n'a JAMAIS retouché — objet et corps identiques au
   caractère près à l'une d'elles — passe à la version d'aujourd'hui : sans ça, l'école
   et la recherche n'atteindraient jamais les mails de ceux qui ont
   déjà l'app, c'est-à-dire de tout le monde. Un modèle modifié, même
   d'une virgule, n'est jamais touché (invariant ②). */
const MODELES_ANCIENS = {
  'Candidature spontanée': {
    avant: [{ subject: 'Candidature {{type}} {{formation}} — {{moi}}', body: CANDIDATURE_6_31 }, { subject: 'Candidature stage {{formation}} — {{moi}}', body: `Bonjour {{contact}},

[Une phrase précise sur ce qu'ils font. Pas « votre entreprise m'intéresse » — ils le lisent dix fois par jour.]

Je suis en {{formation}} et je cherche un stage. Mon CV : {{cv}}
Je peux passer en parler quand vous voulez.

Bien à vous,
{{moi}} — {{tel}} — {{email}}` }],
    apres: { subject: 'Candidature {{type}} {{formation}} — {{moi}}', body: MODELE_CANDIDATURE }
  },
  'Relance': {
    avant: [{ subject: 'Toujours intéressé — {{formation}} chez {{entreprise}}', body: `Bonjour {{contact}},

Je reviens vers vous au sujet de ma candidature pour un stage.

[Du neuf depuis : un projet fini, une techno apprise, une actu de chez eux. Une relance qui n'apporte rien n'appelle rien.]

Toujours très motivé pour vous rejoindre — je reste dispo.

Bien à vous,
{{moi}} — {{tel}} — {{email}}` }],
    apres: { subject: 'Toujours intéressé — {{formation}} chez {{entreprise}}', body: MODELE_RELANCE }
  }
};
export function majModelesDefaut(templates){
  if (!Array.isArray(templates)) return templates;
  return templates.map(t => {
    const m = t && MODELES_ANCIENS[t.name];
    if (!m || !m.avant.some(a => t.subject === a.subject && t.body === a.body)) return t;
    return { ...t, subject: m.apres.subject, body: m.apres.body };
  });
}
export function defaultTemplates(){
  return [
    /* L'ACCROCHE EST EN PREMIER, et c'est tout le sujet. Les recruteurs
       le disent (APEC, JobTeaser) : si les deux premières phrases ne
       captent pas, le reste n'est pas lu. Les données de prospection
       disent la même chose autrement — un corps personnalisé répond
       ~33 % plus, et une accroche nourrie de recherche sur l'entreprise
       fait passer les réponses de ~7 % à ~17 %.
       L'ancien modèle mettait le trou personnalisé en 3ᵉ position sur 5,
       derrière « l'activité de X a retenu toute mon attention » — soit
       très exactement l'accroche générique que les mêmes sources citent
       comme à éviter. On a donc inversé : le trou d'abord, la formalité
       ensuite. 69 mots → ~35, l'essentiel au-dessus de la ligne de
       flottaison du téléphone.
       Le crochet dit AUSSI ce qu'il ne faut pas écrire : c'est le seul
       endroit de l'app où l'on peut enseigner au moment exact du geste,
       et ça ne coûte rien — le texte part avec le brouillon.
       « Mon CV » a sa PROPRE ligne. Collé à la phrase de présentation,
       il l'emportait avec lui : une ligne qui finit par « : {{cv}} »
       saute en entier quand le lien manque — et avec elle « Je suis en
       BTS SIO et je cherche un stage », c'est-à-dire tout ce que le
       recruteur doit savoir. C'était le cas de quiconque n'avait pas
       de lien de CV. Même raison pour « Rythme », qui ne vaut que pour
       l'alternance et disparaît seul pour les autres. L'école signe le
       mail, sur sa ligne : dans la phrase, sa préposition dépend du nom
       (« au lycée », « à l'IUT », « à Epitech ») et se tromperait. */
    { id: uid(), name: 'Candidature spontanée', subject: 'Candidature {{type}} {{formation}} — {{moi}}',
      body: MODELE_CANDIDATURE },
    /* Une relance qui ne fait que constater le silence n'apporte rien à
       celui qui la reçoit — et le « restée sans réponse à ce jour » lui
       reproche à demi-mot un oubli. Celle-ci rouvre avec quelque chose
       de neuf : c'est ce qui donne une raison de répondre maintenant. */
    { id: uid(), name: 'Relance', subject: 'Toujours intéressé — {{formation}} chez {{entreprise}}',
      body: MODELE_RELANCE },
    { id: uid(), name: 'Remerciement après entretien', subject: 'Merci pour notre échange — {{moi}}',
      body: `Bonjour {{contact}},

Merci pour le temps que vous m'avez accordé lors de notre entretien. Notre échange a confirmé mon envie de rejoindre {{entreprise}}.

[1 phrase : un point marquant de l'entretien]

Je reste à votre disposition pour toute information complémentaire.

Bien cordialement,
{{moi}} — {{tel}}` }
  ];
}
/* prompts IA de l'utilisateur : bornés pour rester un coup de pouce,
   pas une bibliothèque — 8 prompts de 4 000 caractères max. Un seul
   par défaut : l'universel « mes emails → un JSON prêt à coller ». */
export const PROMPTS_MAX = 8;
export const PROMPT_MAX_LEN = 4000;
export function defaultPrompts(){
  return [{
    name: 'Mes emails → pistes',
    text: `Voici des emails liés à ma recherche de stage / alternance / emploi :

[colle ici tes emails — expéditeur, objet, corps]

Extrais-en les entreprises et contacts utiles, et rends UNIQUEMENT un JSON valide (aucun texte autour) à ce format exact :
{"v":4,"kind":"share","companies":[{"name":"","city":"","domain":"esn|cyber|cloud|dsi|public|startup|industrie|commerce|sante|autre","desc":"","website":"","techs":"","positions":["stage","alternance","cdi","cdd","freelance"],"process":"","tips":"","contacts":[{"name":"","role":"","email":"","phone":"","link":"","note":""}]}]}

Règles : n'invente rien — champ inconnu = vide ; une entrée par entreprise ; regroupe les contacts d'une même entreprise ; "note" = le contexte de l'échange (ex : « a répondu le 12/06, propose un entretien ») ; ignore newsletters et refus automatiques.

Je collerai ce JSON dans OpenContact : Échanger → Recevoir → Coller.`
  }];
}
/* les trois rayons de « Où je cherche » : à côté, la métropole, le
   département — une puce chacun, jamais une liste déroulante (§6) */
export const RAYONS = [5, 15, 30];
export const ECARTEES_MAX = 300;
export function defaultProfile(){
  return { name:'', formation:'', ecole:'', recherche:'', debut:'', fin:'', rythme:'', ville:'', rayon:15,
           phone:'', email:'', cvUrl:'', portfolio:'', letter:'',
           templates: defaultTemplates(), prompts: defaultPrompts(),
           parcours: [], ecartees: [], confirmedIds: [], flags: {}, updatedAt: 0 };
}
/* remet un profil (chargé, importé ou restauré) aux invariants attendus */
export function normalizeProfile(raw){
  const profile = defaultProfile();
  if (raw && typeof raw === 'object')
    for (const k of Object.keys(raw)) if (!BAD_KEYS.includes(k)) profile[k] = raw[k];
  if (!Array.isArray(profile.templates) || !profile.templates.length) profile.templates = defaultTemplates();
  else profile.templates = majModelesDefaut(profile.templates);
  /* les champs de la recherche : un choix connu ou rien, une date qui
     existe ou rien — ils arrivent aussi d'un fichier ou d'un autre
     appareil, donc de n'importe où */
  for (const k of ['ecole', 'rythme']) profile[k] = String(profile[k] || '').trim().slice(0, 120);
  if (!RECHERCHES[profile.recherche]) profile.recherche = '';
  for (const k of ['debut', 'fin']) if (!jourDe(profile[k])) profile[k] = '';
  /* OÙ JE CHERCHE (docs/recherche-profil.md) : une ville, telle qu'on
     l'écrit, et un rayon parmi trois — le plus proche si une autre
     valeur arrive d'un fichier ou d'un autre appareil */
  profile.ville = String(profile.ville || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const r = Number(profile.rayon);
  profile.rayon = RAYONS.includes(r) ? r : Number.isFinite(r) && r > 0 ? RAYONS.reduce((a, b) => Math.abs(b - r) < Math.abs(a - r) ? b : a) : 15;
  if (!Array.isArray(profile.prompts) || !profile.prompts.length) profile.prompts = defaultPrompts();
  profile.prompts = profile.prompts.slice(0, PROMPTS_MAX).map(p => ({
    name: (String((p && p.name) || '').trim() || 'Prompt').slice(0, 60),
    text: String((p && p.text) || '').slice(0, PROMPT_MAX_LEN)
  }));
  profile.parcours = normalizeParcours(profile.parcours);
  /* « PAS POUR MOI » (docs/recherche-profil.md) : les entreprises de
     « À découvrir » qu'on a écartées — un SIREN, le nom pour pouvoir les
     rendre, la date. Les plus anciennes partent au-delà de 300. */
  profile.ecartees = (Array.isArray(profile.ecartees) ? profile.ecartees : [])
    .filter(x => x && /^\d{9}$/.test(String(x.siren || '')))
    .map(x => ({ siren: String(x.siren), nom: String(x.nom || '').trim().slice(0, 120), at: Number(x.at) || 0 }))
    .filter((x, i, l) => l.findIndex(y => y.siren === x.siren) === i)
    .slice(-ECARTEES_MAX);
  if (!Array.isArray(profile.confirmedIds)) profile.confirmedIds = [];
  if (!profile.flags || typeof profile.flags !== 'object') profile.flags = {};
  profile.updatedAt = Number(profile.updatedAt) || 0;   /* LWW entre appareils */
  return profile;
}
/* historique d'une piste (privé) : création, statuts, emails, notes, contacts… */
export function pushHist(c, t){
  (c.history = c.history || []).push({ d: todayISO(), t });
  if (c.history.length > 40) c.history = c.history.slice(-40);
}
/* résume ce qui a RÉELLEMENT changé entre deux états du suivi — la
   fiche (formulaire) n'écrit qu'une entrée d'historique, au moment
   du « Confirmer », jamais un micro-geste à la fois */
export function summarizeChanges(before, after){
  const parts = [];
  if (after.status !== before.status && STATUSES[after.status])
    parts.push('Statut → ' + STATUSES[after.status].label);
  if (after.nextAction !== before.nextAction || after.nextActionText !== before.nextActionText){
    if (after.nextAction)
      parts.push('À faire : ' + (after.nextActionText || 'faire le point') + ' — ' + fmtDate(after.nextAction));
    else if (before.nextAction)
      parts.push('Action retirée');
  }
  if (after.notes !== before.notes) parts.push('Notes modifiées');
  return parts.join(' · ');
}
/* Un jeton sans valeur laissait sa cicatrice dans le message : « en
   formation , », une signature « — ». Le trou est refermé dans le gabarit
   AVANT le remplissage : le séparateur collé au jeton vide part avec lui,
   une ligne « Étiquette : {{jeton}} » saute en entier, une ligne qui ne
   pesait que des jetons vides disparaît. Une ligne sans jeton vide n'est
   JAMAIS retouchée — la prose de l'utilisateur reste la sienne, espace
   avant « ; : ! ? » compris (typographie française). */
const SEP_AVANT = /[ \t]+[—–·|-][ \t]*\{\{(\w+)\}\}/g;
const SEP_APRES = /\{\{(\w+)\}\}[ \t]*[—–·|-][ \t]+/g;
const ETIQUETTE = /:[ \t]*\{\{(\w+)\}\}[ \t]*$/;
function refermeLigne(ligne, creux){
  if (!/\{\{(\w+)\}\}/.test(ligne)) return ligne;
  const troue = ligne.replace(/\{\{(\w+)\}\}/g, (s, k) => creux(k) ? '' : s) !== ligne;
  if (!troue) return ligne;
  /* le jeton portait tout ce qui suivait les deux-points : la ligne
     entière n'a plus de raison d'être */
  const et = ligne.match(ETIQUETTE);
  if (et && creux(et[1])) return null;
  const out = ligne
    .replace(SEP_AVANT, (s, k) => creux(k) ? '' : s)
    .replace(SEP_APRES, (s, k) => creux(k) ? '' : s)
    .replace(/\{\{(\w+)\}\}/g, (s, k) => creux(k) ? '' : s)
    .replace(/[ \t]+([,.])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trimEnd();
  /* il ne reste que de la ponctuation : la ligne ne dit plus rien */
  return /[\p{L}\p{N}]/u.test(out) ? out : null;
}
/* LE MODÈLE QUI CONVIENT À LA PISTE. Le composeur s'ouvrait toujours
   sur le premier — la candidature — y compris pour relancer quelqu'un à
   qui l'on a déjà écrit : l'étudiant devait penser à changer de modèle,
   ou renvoyait sa candidature une seconde fois. Le statut le dit déjà :
   jamais contactée → la candidature ; en cours (on attend) → la relance.
   Une réponse reçue ne décide rien (remercier ? répondre ? préparer un
   entretien ?) : on garde le premier, comme avant. Les modèles se
   reconnaissent par leur NOM de départ — un modèle renommé ou retiré
   laisse simplement le premier, jamais une erreur. */
const MODELE_PAR_STATUT = { todo: 'Candidature spontanée', active: 'Relance' };
export function modeleConseille(templates, c){
  const nom = MODELE_PAR_STATUT[c && c.status];
  const i = nom ? (templates || []).findIndex(t => t && t.name === nom) : -1;
  return i >= 0 ? i : 0;
}
/* les jetons qui viennent de la recherche et de l'école — partagés avec
   l'aperçu du composeur de modèles, pour qu'un jeton se lise pareil
   dans l'éditeur et dans le mail */
export function jetonsRecherche(profile, companies){
  const p = profile || {};
  const r = RECHERCHES[p.recherche] || RECHERCHES.stage;
  return {
    ecole: String(p.ecole || '').trim(),
    type: r.type,
    recherche: phraseRecherche(p),
    rythme: p.recherche === 'alternance' ? String(p.rythme || '').trim() : '',
    /* ton parcours, déduit de tes pistes compris — d'où `companies` */
    parcours: phraseParcours(parcoursDe(p, companies))
  };
}
/* LES DEUX MANQUES QUI RENDENT UN MAIL FAUX. Sans formation, la
   présentation se lisait « Je suis en et je cherche un stage » ; sans
   nom, le mail partait sans signature. Chez un recruteur, et c'était le
   PREMIER mail de quiconque n'avait pas encore rempli son profil — joué
   le 30 septembre 2026, envoyable d'un tap. Pour le composeur, ces deux
   jetons ne s'effacent donc plus : ils deviennent un crochet visible, du
   même dessin que l'accroche à écrire, et un crochet ne part pas
   (`crochets`, ui/mail.js). L'école, le téléphone, le CV restent
   effacés : leur absence retire une ligne, elle ne rend rien faux. Les
   mots sont ceux de l'aperçu du profil (ui/profil.js). */
export const TROUS = { formation: 'ta formation', moi: 'ton nom' };
/* remplit un gabarit {{variable}} avec la piste, le contact visé et le profil.
   `trous` : les manques de `TROUS` deviennent des crochets au lieu de
   s'effacer — pour un brouillon qu'on relit, jamais pour un envoi en
   série qui n'a personne pour les remplir. */
export function fillTpl(str, c, ct, profile, { trous = false, companies } = {}){
  const m = {
    entreprise: c.name || '',
    contact: (ct && ct.name) || 'Madame, Monsieur',
    ville: c.city || extractCity(c.address),
    moi: profile.name || '', formation: profile.formation || '',
    tel: profile.phone || '', email: profile.email || '',
    cv: profile.cvUrl || '', portfolio: profile.portfolio || '',
    ...jetonsRecherche(profile, companies)
  };
  const trou = k => trous && !m[k] && Object.hasOwn(TROUS, k);
  const creux = k => !m[k] && !trou(k);
  return String(str || '')
    .split('\n').map(l => refermeLigne(l, creux)).filter(l => l !== null).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\{\{(\w+)\}\}/g, (_, k) => m[k] || (trou(k) ? '[' + TROUS[k] + ']' : ''));
}
/* Les passages entre crochets d'un brouillon, dans l'ordre. Un crochet
   est un trou par construction : l'accroche du modèle, les `TROUS`, et
   ceux qu'un étudiant pose dans ses propres modèles. Un mail de
   candidature n'en contient jamais d'autre — c'est ce qui permet de
   refuser l'envoi sans demander. */
export function crochets(texte){
  const out = [];
  for (const m of String(texte || '').matchAll(/\[[^\[\]]{1,400}\]/g))
    out.push({ debut: m.index, fin: m.index + m[0].length, texte: m[0] });
  return out;
}
/* Le profil vient d'être complété PENDANT qu'on écrit : les trous de
   `TROUS` prennent leur valeur sur place. Recalculer le brouillon depuis
   le modèle effacerait l'accroche que l'étudiant vient d'écrire — sans
   le dire (invariant ②). Un trou dont la valeur manque encore reste. */
export function remplirTrous(texte, profile){
  const p = profile || {};
  const v = { formation: String(p.formation || '').trim(), moi: String(p.name || '').trim() };
  let out = String(texte || '');
  for (const [k, mot] of Object.entries(TROUS)) if (v[k]) out = out.split('[' + mot + ']').join(v[k]);
  return out;
}

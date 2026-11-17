/* ============================================================
   OpenContact — moteur · la suite d'une piste, et « À faire »
   (la refonte, lot 2 : docs/brief-refonte.md §4 et §12 ; la maquette
   validée le 17 novembre 2026, design/maquettes/app/index.html)

   « Je fais quoi maintenant ? » (CLAUDE.md §1) a UNE réponse par
   piste, la même partout : une phrase, et un seul geste nommé. Elle se
   lit en tête de la page d'une piste (« La suite ») et sur sa ligne,
   dans « À faire » ou dans son étape.

   `rang` dit où elle passe dans « À faire » :
     0  un « oui » dont la suite n'est pas finie (engine/contrat.js) ;
     1  une réponse : le merci d'après l'entretien, un entretien à
        préparer, une réponse à laquelle répondre ;
     2  une relance (7 et 21 jours de silence, `SILENCE_*`) ;
     3  un ami à qui demander (Réseau, lot 3) ;
     4  une entreprise à contacter ;
     6  45 jours de silence : se range, d'un geste, avec les autres ;
     8  on attend, et la phrase dit jusqu'à quand ;
     9  terminée (refus, rangée, contrat fini).

   Rien de neuf dans les données (CONTRAT.md §3) : le statut (`todo`,
   `active`, `reply`), la clôture (`closedReason`), la date du premier
   message (`appliedAt`), l'entretien (`nextAction` + « Entretien »), et
   l'HISTORIQUE, qui dit ce qui s'est passé en dernier. Ses phrases sont
   donc un contrat : `phraseEnvoi` les écrit, `dernierEvenement` les
   relit, et `tests.js` les garde ensemble. Les phrases de l'app
   actuelle (« Email envoyé ») se relisent aussi.

   Fonctions pures : l'écran demande, le moteur répond. Les gestes
   (`noter…`) modifient la piste qu'on leur donne, et rien d'autre.
   ============================================================ */
import { SILENCE_RELANCE, SILENCE_DERNIERE, SILENCE_TROP_TARD, derniereTrace } from './assist.js';
import { suiteDe } from './contrat.js';
import { pushHist } from './model.js';
import { todayISO } from './utils.js';

const JOUR_MS = 864e5;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const t0 = iso => Date.parse(iso + 'T00:00:00Z');
export const joursEntre = (a, b) => Math.round((t0(b) - t0(a)) / JOUR_MS);
export const plusJours = (iso, n) => new Date(t0(iso) + n * JOUR_MS).toISOString().slice(0, 10);
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_C = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const jour = iso => new Date(t0(iso));
/* « jeudi 19 novembre », « jeu. 19 » — en heure de Paris, sans fuseau */
export const jourLong = iso => { const d = jour(iso); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`; };
export const jourCourt = iso => { const d = jour(iso); return `${JOURS_C[d.getUTCDay()]} ${d.getUTCDate()}`; };
export const jourMois = iso => { const d = jour(iso); return `${d.getUTCDate()} ${MOIS_C[d.getUTCMonth()]}`; };
/* un jour passé, dit comme on le dirait : hier, lundi, le 3 novembre */
export function quandPasse(iso, today){
  const n = joursEntre(iso, today);
  if (n <= 0) return 'aujourd’hui';
  if (n === 1) return 'hier';
  if (n < 7) return JOURS[jour(iso).getUTCDay()];
  const d = jour(iso);
  return `le ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}
const minuscule = s => s ? s[0].toLowerCase() + s.slice(1) : '';
export const prenomDe = n => String(n || '').trim().split(/\s+/)[0] || '';

/* ---------- les canaux ----------
   Un message, quatre formes : le mail, le mot LinkedIn, l'appel, le
   texte d'un formulaire. Un merci passe par écrit ; une réponse par mail
   ou de vive voix. */
export const CANAUX = { mail: 'Mail', linkedin: 'LinkedIn', appel: 'Appel', site: 'Site' };
export const CANAUX_DE = {
  premier: ['mail', 'linkedin', 'appel', 'site'],
  relance: ['mail', 'linkedin', 'appel', 'site'],
  merci: ['mail', 'linkedin'],
  reponse: ['mail', 'appel']
};
export const PAR = { mail: 'par mail', linkedin: 'sur LinkedIn', site: 'sur leur site' };
export const LI_MAX = 200;   /* un mot d'invitation, sur un compte LinkedIn gratuit */

/* la personne à qui écrire : celle que vise la prochaine action, sinon
   la première qu'on peut joindre par mail, sinon la première nommée */
export function quiContacter(c){
  const l = (c && c.contacts) || [];
  return (c.nextActionCt && l.find(t => t.id === c.nextActionCt))
    || l.find(t => t.email) || l.find(t => t.name) || l.find(t => t.phone || t.link) || null;
}
/* le canal qui s'ouvre de lui-même : celui de la dernière fois pour une
   relance, puis ce qu'on sait de la personne */
export function canalDefaut(c, k, ct){
  const l = CANAUX_DE[k] || CANAUX_DE.premier;
  if (k === 'relance'){
    const e = dernierEnvoi(c);
    const avant = e && (/^Appelé/.test(e.t) ? 'appel' : /par mail|Email envoyé/.test(e.t) ? 'mail'
      : /sur LinkedIn/.test(e.t) ? 'linkedin' : /sur leur site/.test(e.t) ? 'site' : '');
    if (avant && l.includes(avant)) return avant;
  }
  if (ct && ct.email) return 'mail';
  if (k === 'merci') return 'linkedin';
  if (k === 'reponse') return ct && ct.phone ? 'appel' : 'mail';
  if (ct && ct.name) return 'linkedin';
  return 'site';
}

/* ---------- l'historique : ce qui s'est passé en dernier ---------- */
const EVENEMENTS = [
  ['merci', /^Merci envoyé/],
  ['repondu', /^Répondu/],
  ['reponse', /^Réponse reçue/],
  ['entretien', /^Réponse : un entretien/],
  ['ecrit', /^(Écrit|Relancé|Appelé|Email envoyé)/]
];
export function dernierEvenement(c){
  const h = (c && c.history) || [];
  for (let i = h.length - 1; i >= 0; i--){
    const t = String((h[i] && h[i].t) || '');
    const e = EVENEMENTS.find(([, re]) => re.test(t));
    if (e) return { quoi: e[0], d: h[i].d, t };
  }
  return null;
}
/* le dernier message parti (écrit, relancé, appelé) */
export function dernierEnvoi(c){
  const h = (c && c.history) || [];
  for (let i = h.length - 1; i >= 0; i--){
    const t = String((h[i] && h[i].t) || '');
    if (/^(Écrit|Relancé|Appelé|Email envoyé)/.test(t)) return { d: h[i].d, t };
  }
  return null;
}
/* depuis combien de jours on attend : le dernier message parti, sinon le
   jour de la candidature, sinon la dernière trace */
export function joursDepuisEcrit(c, today = todayISO()){
  const e = dernierEnvoi(c);
  const d = e && ISO.test(e.d) ? e.d : ISO.test(String(c.appliedAt || '')) ? c.appliedAt : '';
  return d ? Math.max(0, joursEntre(d, today)) : derniereTrace(c, today);
}
/* un entretien prévu : une action qui le dit, et son jour */
export const estEntretien = t => /entretien|rdv|rendez|visio|entrevue/i.test(String(t || ''));
export function entretienDe(c, today = todayISO()){
  if (!c || !ISO.test(String(c.nextAction || '')) || !estEntretien(c.nextActionText)) return null;
  return { jour: c.nextAction, passe: c.nextAction < today, auj: c.nextAction === today };
}

/* avant un entretien : ce qu'il faut demander (repris de la branche
   claude/refonte-arc, engine/etape.js) — trois questions, pas un cours */
export const A_DEMANDER = {
  alternance: ['Qui sera ton tuteur', 'Tes missions, concrètement', 'Le rythme école et entreprise'],
  stage: ['Qui t’encadre', 'Tes missions, concrètement', 'Les horaires'],
  emploi: ['Tes missions, concrètement', 'Avec qui tu travailles', 'La période d’essai']
};
export const aDemander = recherche => A_DEMANDER[recherche] || A_DEMANDER.stage;

/* ---------- la suite ----------
   `o` : { today, profile, grande } — `grande` : l'annuaire dit que
   l'entreprise est grande (on passe par le recrutement). */
export function laSuite(c, o = {}){
  const today = o.today || todayISO();
  const recherche = (o.profile && o.profile.recherche) || '';
  const ct = quiContacter(c), pr = prenomDe(ct && ct.name);
  if (c.closedReason === 'won'){
    const s = suiteDe(c, o.profile);
    const pro = s && s.prochaine;
    return pro ? { rang: 0, l: 'C’est oui : ' + minuscule(pro.label), plus: 1, oui: 1, c: 'La suite', a: 'piste' }
      : { rang: 9, l: 'C’est oui : tout est fait', plus: 1, oui: 1 };
  }
  if (c.closedReason === 'rejected') return { rang: 9, l: 'refus', t: 'C’est non.', s: 'Ce n’est pas toi : la plupart des candidatures s’arrêtent là.', fin: 1 };
  if (c.closedReason) return { rang: 9, l: 'rangée', t: 'Rangée.', s: 'Elle ne revient plus dans « À faire ». Tu peux la rouvrir.', fin: 1 };
  if (c.status === 'reply'){
    const ent = entretienDe(c, today), ev = dernierEvenement(c);
    if (ent && ent.passe && !(ev && ev.quoi === 'merci' && ev.d >= ent.jour)){
      const q = quandPasse(ent.jour, today);
      return { rang: 1, l: `entretien ${q} : un merci`, plus: 1, t: `Ton entretien, c’était ${q}.`,
        s: 'Un mot de remerciement, le jour même ou le lendemain, c’est l’usage.', b: 'Écrire un merci', c: 'Merci', a: 'ecrire', k: 'merci' };
    }
    if (ev && ev.quoi === 'merci') return { rang: 8, l: 'merci envoyé, on attend', t: 'Merci envoyé.', s: 'Maintenant, on attend leur réponse.' };
    if (ent) return { rang: 1, l: 'entretien ' + (ent.auj ? 'aujourd’hui' : jourCourt(ent.jour)), plus: 1,
      t: 'Entretien ' + (ent.auj ? 'aujourd’hui' : jourLong(ent.jour)) + '.', s: 'Relis ce que tu sais d’eux. Et demande-leur :',
      q: aDemander(recherche), c: 'Préparer', a: 'piste', entretien: ent.jour };
    if (ev && ev.quoi === 'reponse') return { rang: 1, l: 'ils t’ont répondu', plus: 1, t: 'Ils t’ont répondu.',
      s: 'Réponds-leur, puis note ici ce qu’ils t’ont dit.', b: 'Répondre' + (pr ? ' à ' + pr : ''), c: 'Répondre', a: 'ecrire', k: 'reponse' };
    return { rang: 8, l: 'tu leur as répondu', t: 'Tu leur as répondu.', s: 'On attend la suite.' };
  }
  if (c.status === 'active'){
    const j = joursDepuisEcrit(c, today);
    if (j >= SILENCE_TROP_TARD) return { rang: 6, muette: 1, j, l: j + ' jours sans réponse', t: j + ' jours sans réponse.',
      s: 'Passé 45 jours, une réponse n’arrive presque plus. Range-la, et passe à la suite.', b: 'Ranger', a: 'ranger1' };
    if (j >= SILENCE_DERNIERE) return { rang: 2, j, l: j + ' jours sans réponse', t: j + ' jours sans réponse.',
      s: 'Une dernière relance, puis tu passes à autre chose.', b: 'Relancer une dernière fois', c: 'Relancer', a: 'ecrire', k: 'relance' };
    if (j >= SILENCE_RELANCE) return { rang: 2, j, l: j + ' jours sans réponse', t: j + ' jours sans réponse.',
      s: 'C’est courant. Un court message suffit.', b: 'Relancer' + (pr ? ' ' + pr : ''), c: 'Relancer', a: 'ecrire', k: 'relance' };
    const n = SILENCE_RELANCE - j;
    const quand = j > 1 ? 'il y a ' + j + ' jours' : j ? 'hier' : 'aujourd’hui';
    return { rang: 8, j, l: 'écrit ' + quand, t: 'Écrit ' + quand + '.',
      s: `On attend. Elle reviendra dans « À faire » dans ${n} jour${n > 1 ? 's' : ''}.` };
  }
  if (ct && ct.name){
    const r = ct.role ? ', ' + ct.role : '';
    return { rang: 4, l: ct.name + r + (ct.via ? ' · par ' + ct.via : ''), plus: ct.via ? 1 : 0, t: 'À contacter : ' + ct.name + r + '.',
      s: 'Ton message est prêt. Tu le relis, puis tu l’envoies.', b: 'Écrire à ' + pr, c: 'Écrire', a: 'ecrire', k: 'premier' };
  }
  return { rang: 4, l: c.city || 'ajoutée à la main', t: 'À contacter.',
    s: o.grande ? 'Passe par le recrutement, ou par leur site.' : 'Personne à qui écrire pour l’instant : passe par leur site.',
    b: 'Écrire', c: 'Écrire', a: 'ecrire', k: 'premier' };
}

/* l'étape d'une piste dans la liste : c'est oui, réponse, à contacter,
   en attente, terminée */
export function etapeDe(c){
  if (c.closedReason === 'won') return 'oui';
  if (c.closedReason) return 'fin';
  if (c.status === 'reply') return 'reponse';
  if (c.status === 'active') return 'ecrit';
  return 'garde';
}

/* ---------- « À faire » : trois lignes au plus ----------
   Ce qui est engagé (rangs 0 à 2) passe avant ce qui commence ; les
   pistes muettes depuis 45 jours se rangent d'un geste, ensemble ; entre
   deux pistes du même rang, celle où l'on peut écrire à quelqu'un. */
export const A_FAIRE_MAX = 3;
const joignable = c => (c.contacts || []).some(t => t.email || t.name);
export function aFaire(companies, o = {}){
  const l = [], mu = [];
  for (const c of companies || []){
    if (!c || c.demo) continue;
    const s = laSuite(c, o);
    if (s.muette) mu.push(c.id);
    else if (s.rang <= 4) l.push({ id: c.id, s, c });
  }
  l.sort((a, b) => (a.s.rang - b.s.rang) || (joignable(b.c) - joignable(a.c))
    || ((a.c.createdAt || 0) - (b.c.createdAt || 0)) || String(a.c.name).localeCompare(String(b.c.name), 'fr'));
  const out = l.filter(x => x.s.rang <= 2).slice(0, A_FAIRE_MAX);
  if (mu.length && out.length < A_FAIRE_MAX) out.push({ ranger: mu });
  for (const x of l.filter(x => x.s.rang > 2)) if (out.length < A_FAIRE_MAX) out.push(x);
  return out.map(x => x.ranger ? x : { id: x.id, s: x.s });
}
/* « Suivante » : la prochaine piste à contacter, qu'elle soit dans
   « À faire » ou plus bas */
export function suivante(companies, id, o = {}){
  const l = (companies || []).filter(c => c && c.id !== id && !c.demo && laSuite(c, o).k === 'premier');
  l.sort((a, b) => (joignable(b) - joignable(a)) || ((a.createdAt || 0) - (b.createdAt || 0)));
  return l[0] || null;
}

/* ---------- les gestes ----------
   Chacun écrit l'historique avec les mots que `dernierEvenement` relit. */
export function phraseEnvoi(k, canal, qui){
  const par = PAR[canal] ? ', ' + PAR[canal] : '';
  if (canal === 'appel') return 'Appelé ' + (qui || 'le standard');
  if (k === 'merci') return 'Merci envoyé' + (qui ? ' à ' + qui : '') + par;
  if (k === 'relance') return 'Relancé' + (qui ? ' ' + qui : '') + par;
  if (k === 'reponse') return 'Répondu' + (qui ? ' à ' + qui : '') + par;
  return 'Écrit' + (qui ? ' à ' + qui : '') + par;
}
/* « Oui, envoyé » : la piste passe en attente (un premier message ou une
   relance), ou garde sa réponse (un merci, une réponse) */
export function noterEnvoi(c, { k = 'premier', canal = '', ct = null, today = todayISO() } = {}){
  pushHist(c, phraseEnvoi(k, canal, ct && ct.name));
  if (ct && !ct.activatedAt) ct.activatedAt = today;
  if (k === 'merci'){
    if (entretienDe(c, today)){ c.nextAction = ''; c.nextActionText = ''; delete c.nextActionCt; }
  } else if (k !== 'reponse'){
    c.status = 'active';
    if (!c.appliedAt) c.appliedAt = today;
  }
  c.updatedAt = Date.now();
}
/* « J'ai écrit », sans passer par l'app (une seconde fois : une relance) */
export function noterEcrit(c, today = todayISO()){
  pushHist(c, c.status === 'active' ? 'Relancé' : 'Écrit');
  c.status = 'active';
  if (!c.appliedAt) c.appliedAt = today;
  c.updatedAt = Date.now();
}
/* « On m'a répondu » : un entretien, son jour */
export function noterEntretien(c, jourIso){
  c.status = 'reply';
  c.nextAction = jourIso;
  c.nextActionText = 'Entretien';
  pushHist(c, 'Réponse : un entretien le ' + jourLong(jourIso));
  c.updatedAt = Date.now();
}
/* « On m'a répondu » : autre chose */
export function noterReponse(c){
  c.status = 'reply';
  pushHist(c, 'Réponse reçue');
  c.updatedAt = Date.now();
}
/* clore : « C'est non » (`rejected`), « Ils me prennent » (`won`),
   « Ranger » ou « Laisser tomber » (`dropped`, `texte` le dit) */
const CLOS = { won: 'C’est oui !', rejected: 'Refus', dropped: 'Rangée sans réponse' };
export function clore(c, raison, today = todayISO(), texte = ''){
  if (!CLOS[raison]) return;
  c.closedReason = raison;
  c.closedAt = today;
  c.nextAction = ''; c.nextActionText = ''; delete c.nextActionCt;
  pushHist(c, texte || CLOS[raison]);
  c.updatedAt = Date.now();
}
export function rouvrir(c){
  c.closedReason = '';
  c.closedAt = '';
  pushHist(c, 'Rouverte');
  c.updatedAt = Date.now();
}

/* ============================================================
   OpenContact — moteur · prêts à partir (lot R3)
   (docs/propositions/R3-prets-a-partir.md, validée le 20 octobre 2026)

   Écrire est le geste le plus cher de l'app, et le seul que personne ne
   peut faire à la place de l'étudiant (CLAUDE.md §7). Ce fichier ne
   l'écrit pas pour lui : il dit QUELS mails peuvent partir maintenant,
   et il GARDE ce qu'il a commencé à écrire.

   ① La série : les relances dues, puis les premiers mails, cinq au plus.
   ② Les brouillons : ce qu'on a tapé dans le composeur, par piste, sur
     cet appareil seulement — ni partage, ni copie, ni synchronisation.

   Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */
import { nextActionContact } from './model.js';

/* ---------- la personne visée ----------
   Celle de la prochaine action si elle a une adresse, sinon la première
   qu'on a déjà sollicitée, sinon la première joignable. Jamais devinée
   ailleurs : c'est la règle de « Prospecter » (#14), dite une fois. */
export function contactVise(c){
  const na = nextActionContact(c);
  if (na && na.email) return na;
  const avecMail = ((c && c.contacts) || []).filter(t => t && t.email);
  return avecMail.find(t => t.activatedAt) || avecMail[0] || null;
}

/* ---------- ce qui est un MAIL ----------
   Une action due n'est pas toujours un mail : « Appeler », « Préparer
   l'entretien », « Repasser sur place » ne partent pas dans une série
   d'écriture. Les verbes viennent de la table que l'app propose déjà
   (`nextActionSuggestions`) ; un texte libre se lit à ses mots. Rien
   d'écrit : l'app proposait « Relancer » ou « Envoyer la candidature »,
   c'est donc un mail. Mieux vaut laisser une action hors de la série
   que d'ouvrir un composeur pour un coup de téléphone. */
const RE_MAIL = /(relan|écri|ecri|mail|envo|candidat|répond|repond|cv\b)/i;
const RE_PAS_MAIL = /(appel|téléphon|telephon|passer|entretien|trouver|rencontr|rdv|rendez)/i;
export function estUnMail(verbe){
  const v = String(verbe || '').trim();
  if (!v) return true;
  return RE_MAIL.test(v) && !RE_PAS_MAIL.test(v);
}

/* ---------- ① la série ----------
   L'appelant passe chaque famille DÉJÀ classée — les actions dues dans
   l'ordre d'« Aujourd'hui » (`dueFollowups`), les pistes à démarrer
   dans celui de « Par où commencer ». Sont prêtes :
   · une RELANCE : une action datée d'aujourd'hui ou d'avant, qui est un
     mail, sur une piste déjà engagée, avec une adresse ;
   · un PREMIER MAIL : une piste jamais écrite, avec une adresse.
   Une piste ne prend qu'une place, une piste close ou d'exemple aucune.
   Cinq au plus : une série se relit mail par mail, ce n'est pas un
   envoi de masse. En dessous de deux, l'écran ne propose rien — la
   ligne de la piste porte déjà son « Écrire ». */
export const SERIE_MAX = 5;
export const SERIE_MIN = 2;
export function pretsAPartir({ dues = [], debuts = [], today = '' } = {}, n = SERIE_MAX){
  const out = [], pris = new Set();
  const prendre = (c, sorte) => {
    if (out.length >= n || !c || !c.id || pris.has(c.id) || c.closedReason || c.demo) return;
    const ct = contactVise(c);
    if (!ct) return;
    pris.add(c.id);
    out.push({ id: c.id, sorte, ctId: ct.id || null });
  };
  for (const c of dues){
    if (!c || !c.nextAction || (today && c.nextAction > today)) continue;
    if (!estUnMail(c.nextActionText)) continue;
    prendre(c, c.status && c.status !== 'todo' ? 'relance' : 'premier');
  }
  for (const c of debuts){
    if (!c || (c.status && c.status !== 'todo')) continue;
    prendre(c, 'premier');
  }
  return out;
}

/* ---------- ② les brouillons ----------
   `oc_brouillons_v1` (CONTRAT.md) : { v:1, b: { <id de piste>: {
   objet, corps, ctId, statut, at } } }. `statut` est celui de la piste
   au moment où l'on écrivait : si elle a changé depuis (une réponse est
   arrivée), le brouillon se propose mais ne s'impose pas.
   Il part à l'envoi, ou au bout de 30 jours sans y toucher. Les bornes
   sont celles d'un mail qu'on écrit à la main : un objet ne dépasse
   pas 300 caractères, un message 20 000, et deux cents brouillons
   suffisent à tout le monde — au-delà, les plus vieux partent. */
export const BROUILLON_JOURS = 30;
const JOUR = 864e5;
const OBJET_MAX = 300, CORPS_MAX = 20000, BROUILLONS_MAX = 200;
/* la forme d'un identifiant de piste (`safeId`, engine/model.js) — et
   jamais un nom qui toucherait au prototype d'un objet */
const ID_FORME = /^[A-Za-z0-9._-]{1,64}$/;
const ID_INTERDIT = new Set(['__proto__', 'constructor', 'prototype']);
const ID_OK = { test: v => ID_FORME.test(v) && !ID_INTERDIT.has(v) };
const vide = () => ({ v: 1, b: {} });

function propre(x){
  if (!x || typeof x !== 'object') return null;
  const objet = typeof x.objet === 'string' ? x.objet.slice(0, OBJET_MAX) : '';
  const corps = typeof x.corps === 'string' ? x.corps.slice(0, CORPS_MAX) : '';
  const at = Number(x.at) || 0;
  if ((!objet.trim() && !corps.trim()) || at <= 0) return null;
  const y = { objet, corps, at };
  if (typeof x.ctId === 'string' && ID_OK.test(x.ctId)) y.ctId = x.ctId;
  if (typeof x.statut === 'string' && /^[a-z]{1,12}$/.test(x.statut)) y.statut = x.statut;
  return y;
}

/* ce qui se lit dans le stockage : jamais une exception, jamais un
   brouillon abîmé, jamais un brouillon périmé */
export function lireBrouillons(raw, maintenant = Date.now()){
  let o = raw;
  if (typeof raw === 'string'){ try { o = JSON.parse(raw); } catch { return vide(); } }
  if (!o || typeof o !== 'object' || o.v !== 1 || !o.b || typeof o.b !== 'object') return vide();
  const garde = Object.entries(o.b)
    .filter(([id]) => ID_OK.test(id))
    .map(([id, x]) => [id, propre(x)])
    .filter(([, x]) => x && maintenant - x.at < BROUILLON_JOURS * JOUR && x.at <= maintenant + JOUR)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, BROUILLONS_MAX);
  return { v: 1, b: Object.fromEntries(garde) };
}

/* poser (ou remplacer) le brouillon d'une piste ; un texte vide l'efface */
export function poserBrouillon(etat, id, x, at = Date.now()){
  const e = lireBrouillons(etat, at);
  if (!ID_OK.test(String(id || ''))) return e;
  const y = propre({ ...x, at });
  const b = { ...e.b };
  if (y) b[id] = y; else delete b[id];
  return lireBrouillons({ v: 1, b }, at);
}

export function retirerBrouillon(etat, id){
  const e = lireBrouillons(etat);
  if (!(id in e.b)) return e;
  const b = { ...e.b };
  delete b[id];
  return { v: 1, b };
}

/* le brouillon d'une piste, et s'il vaut encore : `perime` dit que la
   piste a changé de statut depuis — l'écran le propose sans l'imposer */
export function brouillonDe(etat, c, maintenant = Date.now()){
  const e = lireBrouillons(etat, maintenant);
  const x = c && e.b[c.id];
  if (!x) return null;
  return { ...x, perime: !!(x.statut && c.status && x.statut !== c.status) };
}

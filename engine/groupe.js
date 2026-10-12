/* ============================================================
   OpenContact — moteur · les groupes (docs/reseau.md, lot 5)

   Un ami, c'est un chemin vers SES entreprises. Un groupe, c'est une
   classe, une promo, un club : des gens qu'on ne connaît pas tous un
   par un, et qui ont une raison de s'entraider. On s'y donne des
   pistes, on s'y écrit des messages qui s'effacent au bout de sept
   jours (décisions 22 à 27).

   UN GROUPE, C'EST UN CODE. Pas de serveur (§10) : comme un groupe
   Signal, le code EST la clé. Un seul PBKDF2 en tire l'étiquette que
   voient les relais et la clé AES qui scelle chaque message
   (`clePortage`, espace « groupe » : jamais le sujet d'un rendez-vous,
   même à code égal). Sans le code, un relais ne voit qu'une étiquette,
   une date d'expiration et du bruit — ni le nom du groupe, ni qui en
   est, ni ce qui s'y dit.

   CE QUI S'Y ÉCRIT, quatre sortes de messages et rien d'autre :
   · membre — « je suis là » : mon identifiant d'ami, mon PRÉNOM
     (décision 26 : les prénoms, et rien d'autre), le nom du groupe tel
     que je le connais. Il vit 30 jours et se redit à l'ouverture.
   · depart — « je m'en vais ».
   · mot    — une phrase, sept jours (décision 27).
   · part   — un morceau d'un don de pistes (la vue communautaire,
     `sharePayload` : jamais le suivi privé, invariant ①), sept jours.
   · demande — « Inès cherche quelqu'un chez Aztek » (lot 5b, décisions
     20, 28, 29) : EXACTEMENT la lettre qu'Inès enverrait à un ami (OCB1,
     cercle 1, `engine/boite.js`), que tout le groupe voit ; et, quand un
     membre l'a relayée d'un autre groupe, son prénom. Elle vit 14 jours.
     La réponse, elle, ne passe jamais par le groupe : elle va à la boîte
     de qui demande.

   Fonctions pures : WebCrypto, aucun DOM, aucun réseau.
   ============================================================ */
import { bytesToB64, b64ToBytes } from './crypto.js';
import { idAmiValide } from './amis.js';
import { normaliserLettre, DEMANDE_JOURS } from './boite.js';

export const GROUPES_MAX = 5;            /* décision 25 */
export const MOT_JOURS = 7;              /* décision 27 : sept jours, sans réglage */
export const RELAIS_GROUPES_MAX = 2;     /* décision 28 : une demande se relaie dans deux autres groupes au plus */
export const PISTES_JOURS = 7;
export const MEMBRE_JOURS = 30;          /* une présence se redit à l'ouverture */
export const MEMBRE_REDIRE_JOURS = 7;
export const MOT_MAX = 280;
export const NOM_MAX = 40;
const JOUR = 86400000;
const AVANCE = 10 * 60000;               /* une horloge en avance de dix minutes passe encore */
const CONTENU_MAX = 24000;
const ABC = 'abcdefghjkmnpqrstuvwxyz23456789';   /* l'alphabet du rendez-vous : sans i, l, o, 0, 1 */
const LONGUEUR = 15;
const ID = /^[A-Za-z0-9_-]{8,40}$/;
/* un don de pistes voyage en parts (engine/portage.js, `decouper`) :
   les mêmes bornes que le portage, mesurées sur les relais publics */
const PARTS_MAX = 64;
const PART_CAR = 12000;
const ITER = 100000;                      /* PBKDF2 : l'étiquette ne se devine pas depuis le code */
const SEL = 'opencontact·groupe·v1';

/* ---------- le code ---------- */
export function nouveauCode(){
  const u = crypto.getRandomValues(new Uint8Array(LONGUEUR));
  return Array.from(u, b => ABC[b % ABC.length]).join('');
}
/* tapé ou lu → forme canonique, ou '' : les tirets, les espaces et les
   majuscules ne comptent pas */
export function codeNorm(txt){
  const s = String(txt || '').toLowerCase().split('').filter(ch => ABC.includes(ch)).join('');
  return s.length === LONGUEUR ? s : '';
}
export const codeAffiche = code => code.match(/.{1,5}/g).join('-');

export const nomGroupe = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, NOM_MAX);

/* ---------- l'invitation (OCG1) ----------
   Le QR porte le code ET le nom : on sait qui l'on rejoint avant
   d'avoir du réseau. Tapé à la main, le code seul suffit — le nom
   s'apprend des présences du groupe. */
const enB64u = s => {
  let bin = '';
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const deB64u = s => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
};
export const invitation = g => 'OCG1.' + g.code + '.' + enB64u(nomGroupe(g.nom));
export const estInvitation = raw => /OCG1\.[a-z0-9]+/i.test(String(raw || '').replace(/\s+/g, ''));
export function lireInvitation(raw){
  const s = String(raw || '').replace(/\s+/g, '');
  const m = s.match(/OCG1\.([A-Za-z0-9]+)(?:\.([A-Za-z0-9_-]*))?/);
  if (m){
    const code = codeNorm(m[1]);
    if (!code) return null;
    let nom = '';
    try { nom = m[2] ? nomGroupe(deB64u(m[2])) : ''; } catch (e) { nom = ''; }
    return { code, nom };
  }
  const code = codeNorm(raw);
  return code ? { code, nom: '' } : null;
}

/* ---------- la clé et l'étiquette ----------
   Un seul PBKDF2 donne les deux : 16 octets pour l'étiquette que voit
   un relais, 32 pour la clé. Son sel est à lui : jamais l'étiquette
   d'un rendez-vous, même à code égal. */
export async function cleGroupe(code){
  if (!(crypto && crypto.subtle)) throw new Error('nocrypto');
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(code)), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SEL), iterations: ITER, hash: 'SHA-256' }, base, 48 * 8));
  const etiquette = 'oc-groupe-' + Array.from(bits.subarray(0, 16), b => b.toString(16).padStart(2, '0')).join('');
  const cle = await crypto.subtle.importKey('raw', bits.subarray(16, 48), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return { etiquette, cle };
}
/* un message → texte publiable (iv.chiffré) ; et retour. Ce qui n'a
   pas été scellé avec le code rend null, sans bruit. */
export async function sceller(k, msg){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.cle,
    new TextEncoder().encode(JSON.stringify(msg))));
  return bytesToB64(iv) + '.' + bytesToB64(ct);
}
export async function ouvrirMessage(k, txt){
  try {
    const s = String(txt || '');
    if (s.length > CONTENU_MAX) return null;
    const [a, b] = s.split('.');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(a) }, k.cle, b64ToBytes(b));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) { return null; }
}

/* ---------- les messages ----------
   Ce qui arrive d'un relais peut être n'importe quoi : seul ce qui a la
   bonne forme passe, et sous la forme qu'on a dite — rien de plus. */
export const dureeDe = t => (t === 'membre' || t === 'depart' ? MEMBRE_JOURS : t === 'part' ? PISTES_JOURS
  : t === 'demande' ? DEMANDE_JOURS : MOT_JOURS) * JOUR;
const prenomOk = v => typeof v === 'string' && v.trim().length > 0;
const prenomDe = v => String(v).replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 40);
const entier = (x, max) => Number.isInteger(x) && x >= 0 && x < max;
export function normaliserMessage(m, now = Date.now()){
  if (!m || typeof m !== 'object' || !idAmiValide(m.de)) return null;
  const at = Number(m.at);
  if (!Number.isFinite(at) || at > now + AVANCE || at + dureeDe(m.t) < now) return null;
  if (m.t === 'membre' && prenomOk(m.prenom))
    return { t: 'membre', de: m.de, prenom: prenomDe(m.prenom), nom: nomGroupe(m.nom), at };
  if (m.t === 'depart') return { t: 'depart', de: m.de, at };
  if (m.t === 'mot' && ID.test(String(m.id)) && prenomOk(m.prenom) && typeof m.texte === 'string'){
    const texte = m.texte.replace(/\s+/g, ' ').trim().slice(0, MOT_MAX);
    return texte ? { t: 'mot', id: m.id, de: m.de, prenom: prenomDe(m.prenom), texte, at } : null;
  }
  if (m.t === 'demande'){
    const lettre = normaliserLettre(m.lettre, now);
    if (!lettre || lettre.t !== 'demande' || lettre.cercle !== 1) return null;
    const out = { t: 'demande', de: m.de, lettre, at };
    if (m.relais && typeof m.relais === 'object'){
      const n = Number(m.relais.n);
      if (!prenomOk(m.relais.prenom) || !Number.isInteger(n) || n < 1 || n > RELAIS_GROUPES_MAX) return null;
      out.relais = { prenom: prenomDe(m.relais.prenom), n };
    }
    return out;
  }
  if (m.t === 'part' && ID.test(String(m.id)) && prenomOk(m.prenom)
      && Number.isInteger(m.n) && m.n >= 1 && m.n <= PARTS_MAX && entier(m.i, m.n)
      && Number.isInteger(m.nb) && m.nb >= 1 && m.nb <= 2000
      && typeof m.d === 'string' && m.d.length > 0 && m.d.length <= PART_CAR)
    return { t: 'part', id: m.id, de: m.de, prenom: prenomDe(m.prenom), nb: m.nb, n: m.n, i: m.i, d: m.d, at };
  return null;
}

/* ---------- ce qu'un appareil garde d'un groupe ---------- */
export const groupeVide = () => ({ nom: '', fil: [], membres: {}, depuis: 0, vu: 0, presence: 0, pris: [], masques: [] });
export function normaliserGroupe(g){
  const v = groupeVide();
  if (!g || typeof g !== 'object') return v;
  v.nom = nomGroupe(g.nom);
  v.fil = Array.isArray(g.fil) ? g.fil.filter(x => x && typeof x === 'object' && ID.test(String(x.id))) : [];
  v.membres = g.membres && typeof g.membres === 'object' ? g.membres : {};
  for (const k of ['depuis', 'vu', 'presence']) v[k] = Number(g[k]) || 0;
  /* les dons de pistes déjà fusionnés : « dans tes pistes » au lieu de « Voir » */
  v.pris = Array.isArray(g.pris) ? g.pris.filter(id => ID.test(String(id))).slice(-200) : [];
  /* les demandes qu'on a masquées (décision 28) : elles ne reviennent pas */
  v.masques = Array.isArray(g.masques) ? g.masques.filter(id => ID.test(String(id))).slice(-200) : [];
  return v;
}

/* un message valide → l'état du groupe. Rend le MÊME objet si rien n'a
   changé : l'appelant ne sauve et ne redessine que ce qui bouge. */
export function traiterMessage(g, m){
  if (!m) return g;
  if (m.t === 'membre'){
    const avant = g.membres[m.de];
    if (avant && avant.at >= m.at) return g;
    const membres = { ...g.membres, [m.de]: { prenom: m.prenom, at: m.at, ...(avant && avant.parti > m.at ? { parti: avant.parti } : {}) } };
    return { ...g, membres, nom: g.nom || m.nom };
  }
  if (m.t === 'depart'){
    const avant = g.membres[m.de];
    if (!avant || avant.at > m.at || avant.parti >= m.at) return g;
    return { ...g, membres: { ...g.membres, [m.de]: { ...avant, parti: m.at } } };
  }
  if (m.t === 'demande'){
    /* la même demande relayée deux fois dans un groupe n'y entre qu'une */
    if (g.fil.some(x => x.id === m.lettre.id)) return g;
    const x = { t: 'demande', id: m.lettre.id, de: m.de, prenom: m.lettre.de.prenom, lettre: m.lettre, at: m.at };
    if (m.relais) x.relais = m.relais;
    return { ...g, fil: [...g.fil, x] };
  }
  if (m.t === 'mot'){
    if (g.fil.some(x => x.id === m.id)) return g;
    return { ...g, fil: [...g.fil, { t: 'mot', id: m.id, de: m.de, prenom: m.prenom, texte: m.texte, at: m.at }] };
  }
  if (m.t === 'part'){
    const i = g.fil.findIndex(x => x.id === m.id);
    const avant = i < 0 ? null : g.fil[i];
    if (avant && (avant.t !== 'pistes' || avant.de !== m.de || avant.n !== m.n || avant.d[m.i])) return g;
    const d = avant ? avant.d.slice() : Array(m.n).fill('');
    d[m.i] = m.d;
    const x = { t: 'pistes', id: m.id, de: m.de, prenom: m.prenom, nb: m.nb, n: m.n, d, at: avant ? avant.at : m.at };
    const fil = g.fil.slice();
    if (i < 0) fil.push(x); else fil[i] = x;
    return { ...g, fil };
  }
  return g;
}

/* ce qui a passé son âge s'en va — les relais l'effacent d'eux-mêmes
   à l'échéance (NIP-40), l'app aussi */
export function elaguerGroupe(g, now = Date.now()){
  const fil = g.fil.filter(x => x.t === 'demande' ? x.lettre && x.lettre.exp > now
    : x.at + dureeDe(x.t === 'pistes' ? 'part' : x.t) > now);
  const membres = {};
  for (const [k, v] of Object.entries(g.membres)) if (v.at + MEMBRE_JOURS * JOUR > now) membres[k] = v;
  if (fil.length === g.fil.length && Object.keys(membres).length === Object.keys(g.membres).length) return g;
  const garde = ids => (ids || []).filter(id => fil.some(x => x.id === id));
  return { ...g, fil, membres, pris: garde(g.pris), masques: garde(g.masques) };
}

export const pistesCompletes = x => x.t === 'pistes' && x.d.every(Boolean);
/* le fil tel qu'on le lit : du plus ancien au plus récent, un don de
   pistes seulement quand toutes ses parts sont là */
export const filDe = g => g.fil.filter(x => (x.t === 'mot' || x.t === 'demande' || pistesCompletes(x))
  && !(g.masques || []).includes(x.id)).sort((a, b) => a.at - b.at);
/* les membres : ceux qui se sont dits là et ne sont pas partis */
export const membresDe = g => Object.entries(g.membres)
  .filter(([, v]) => !(v.parti >= v.at))
  .map(([de, v]) => ({ de, prenom: v.prenom }))
  .sort((a, b) => a.prenom.localeCompare(b.prenom, 'fr'));
/* ce qui est arrivé des autres depuis que j'ai regardé */
export const nouveaux = (g, moi) => filDe(g).filter(x => x.de !== moi && x.at > g.vu).length;
/* faut-il redire « je suis là » ? */
export const presenceAredire = (g, now = Date.now()) => g.presence + MEMBRE_REDIRE_JOURS * JOUR < now;

/* relayer une demande dans un autre groupe : la même lettre, le prénom
   de qui relaie, et le compte qui s'arrête à deux (décision 28 — faire
   suivre sans limite propage n'importe quoi) */
export function relaisVersGroupe(x, de, prenom, now = Date.now()){
  const n = (x.relais ? x.relais.n : 0) + 1;
  if (n > RELAIS_GROUPES_MAX) return null;
  /* la lettre gardée est la lettre NORMALISÉE, sans sa version : la
     remettre, sinon le groupe d'en face la refuse */
  return { t: 'demande', de, lettre: { v: 1, ...x.lettre }, relais: { prenom, n }, at: now };
}
export const peutRelayerGroupe = x => (x.relais ? x.relais.n : 0) < RELAIS_GROUPES_MAX;

/* ---------- les groupes du profil ----------
   Ils vivent dans le profil pour voyager avec lui (sync de MES
   appareils, ma copie) ; ce qui s'y dit vit sur l'appareil. */
export function normaliserGroupes(list){
  const vus = new Set();
  return (Array.isArray(list) ? list : [])
    .map(x => x && { code: codeNorm(x.code), nom: nomGroupe(x.nom), at: Number(x.at) || 0 })
    .filter(x => x && x.code && !vus.has(x.code) && vus.add(x.code))
    .slice(0, GROUPES_MAX);
}

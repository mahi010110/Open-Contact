/* ============================================================
   OpenContact — moteur · la boîte aux lettres (docs/reseau.md, lot 3)

   « Quelqu'un chez Aztek ? » doit ATTENDRE que l'ami ouvre l'app :
   dans une heure, ou demain. Tout le reste du transport est éphémère ;
   ici, la lettre est GARDÉE par les relais (mesuré : six relais sur
   sept la gardent et la rendent à une autre connexion,
   tests/e2e/sonde-boite-relais.mjs).

   CE QUE VOIT UN RELAIS : une étiquette (l'empreinte de la clé publique
   du destinataire), une date d'expiration, et du bruit. La lettre est
   scellée pour UN destinataire : une clé jetable par lettre, un échange
   ECDH (P-256) avec la clé de la boîte, puis AES-GCM. Rien ne dit qui
   écrit ; seul le destinataire peut l'ouvrir.

   TROIS SORTES DE LETTRES, et rien d'autre ne s'ouvre :
   · demande — « Inès cherche quelqu'un chez Aztek » : le nom de
     l'entreprise (et son SIREN), le prénom de qui demande, le cercle
     (1), l'expiration (14 jours). Règle 3 de docs/reseau.md, mot pour
     mot ; plus la clé où répondre, sans laquelle personne ne pourrait.
   · don     — le contact que l'ami a choisi de donner : nom, rôle,
     adresse, téléphone, lien. Jamais une note, jamais le suivi.
   · merci   — « Inès a ajouté Julie » : la chaîne est remerciée.

   Le téléphone de l'ami cherche dans SES pistes sans rien montrer ; il
   ne lui demande quelque chose que s'il a trouvé (règle 6). Fonctions
   pures : WebCrypto, aucun DOM, aucun réseau.
   ============================================================ */
import { memeEntreprise } from './amis.js';

export const LETTRE_KIND = 8571;          /* un kind ordinaire qu'aucun client n'affiche (mesuré gardé) */
export const DEMANDE_JOURS = 14;          /* règle 7 : une demande s'éteint au bout de 14 jours */
export const DEMANDES_OUVERTES_MAX = 3;   /* règle 7 : trois demandes ouvertes à la fois au plus */
const LETTRE_MAX = 16000;                 /* une lettre tient en quelques centaines d'octets */
const SEL = 'opencontact·boite·v1';
const ID = /^[A-Za-z0-9_-]{8,40}$/;
const CLE = /^[A-Za-z0-9_-]{86,88}$/;     /* point P-256 non compressé (65 octets) en base64url */

const b64u = u8 => {
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const deB64u = s => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const enc = s => new TextEncoder().encode(s);
export const cleValide = v => typeof v === 'string' && CLE.test(v);
export const nouvelId = () => b64u(crypto.getRandomValues(new Uint8Array(12)));

/* ---------- la clé de la boîte ----------
   Née une fois sur le téléphone (au premier « Mon QR »), elle suit le
   profil : la sync de MES appareils et ma copie la portent, comme
   l'identifiant d'ami. La partie publique part dans le QR (OCA1). */
const EC = { name: 'ECDH', namedCurve: 'P-256' };
export async function nouvelleCle(){
  const k = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
  return { pub: b64u(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))),
           priv: b64u(new Uint8Array(await crypto.subtle.exportKey('pkcs8', k.privateKey))) };
}
export const boiteValide = b => !!(b && cleValide(b.pub) && typeof b.priv === 'string' && b.priv.length > 40 && b.priv.length < 400);

/* l'étiquette sous laquelle les relais rangent mes lettres : elle ne
   dit rien de moi à qui n'a pas ma clé publique */
export async function etiquetteBoite(pub){
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc(SEL + '·' + pub)));
  return 'oc-boite-' + [...h.subarray(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cleAES(priv, pub){
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  const base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc(SEL), info: enc('lettre') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/* sceller une lettre pour UNE clé publique → texte publiable */
export async function sceller(pubDest, lettre){
  if (!cleValide(pubDest)) throw new Error('cle');
  const dest = await crypto.subtle.importKey('raw', deB64u(pubDest), EC, false, []);
  const eph = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
  const k = await cleAES(eph.privateKey, dest);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc(JSON.stringify(lettre))));
  const ephRaw = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const out = new Uint8Array(ephRaw.length + iv.length + ct.length);
  out.set(ephRaw, 0); out.set(iv, ephRaw.length); out.set(ct, ephRaw.length + iv.length);
  return 'OCB1.' + b64u(out);
}

/* ouvrir une lettre avec MA clé privée → objet, ou null (pas pour moi,
   abîmée, trop lourde : on ne devine jamais) */
export async function ouvrir(privB64, texte){
  try {
    const s = String(texte || '');
    if (!s.startsWith('OCB1.') || s.length > LETTRE_MAX * 2) return null;
    const u = deB64u(s.slice(5));
    if (u.length < 65 + 12 + 17) return null;
    const priv = await crypto.subtle.importKey('pkcs8', deB64u(privB64), EC, false, ['deriveBits']);
    const eph = await crypto.subtle.importKey('raw', u.subarray(0, 65), EC, false, []);
    const k = await cleAES(priv, eph);
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(65, 77) }, k, u.subarray(77));
    if (clair.byteLength > LETTRE_MAX) return null;
    return JSON.parse(new TextDecoder().decode(clair));
  } catch (e) { return null; }
}

/* ---------- les lettres : ce qui s'écrit, ce qui s'accepte ---------- */
const txt = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
const entrepriseDe = c => {
  const e = { nom: txt(c && (c.nom || c.name), 120) };
  if (/^\d{9}$/.test(String((c && c.siren) || ''))) e.siren = String(c.siren);
  return e;
};
export const prenomDe = nom => txt(nom, 80).split(' ')[0] || '';

export function lettreDemande({ prenom, cle }, piste, now = Date.now()){
  return { v: 1, t: 'demande', id: nouvelId(), de: { prenom: txt(prenom, 40), cle },
           entreprise: entrepriseDe(piste), cercle: 1, exp: now + DEMANDE_JOURS * 864e5 };
}
/* ce qui part d'un contact : de quoi le joindre, rien d'autre */
export function contactDonne(ct){
  const c = { name: txt(ct && ct.name, 120) };
  for (const [k, n] of [['role', 120], ['email', 200], ['phone', 40], ['link', 300]]){
    const v = txt(ct && ct[k], n);
    if (v) c[k] = v;
  }
  return c;
}
export function lettreDon({ prenom, cle }, demande, ct){
  return { v: 1, t: 'don', id: nouvelId(), demande: demande.id, de: { prenom: txt(prenom, 40), cle },
           entreprise: entrepriseDe(demande.entreprise), contact: contactDonne(ct) };
}
export function lettreMerci({ prenom, cle }, don){
  return { v: 1, t: 'merci', id: nouvelId(), demande: don.demande, de: { prenom: txt(prenom, 40), cle },
           entreprise: entrepriseDe(don.entreprise), contact: { name: txt(don.contact && don.contact.name, 120) } };
}

/* une lettre ouverte se remet aux invariants — elle vient de n'importe
   qui qui a ma clé publique, donc de n'importe où */
export function normaliserLettre(o, now = Date.now()){
  if (!o || typeof o !== 'object' || o.v !== 1 || !ID.test(String(o.id || ''))) return null;
  const de = o.de && typeof o.de === 'object' ? { prenom: txt(o.de.prenom, 40), cle: o.de.cle } : null;
  if (!de || !de.prenom || !cleValide(de.cle)) return null;
  const entreprise = entrepriseDe(o.entreprise);
  if (!entreprise.nom) return null;
  if (o.t === 'demande'){
    const exp = Number(o.exp);
    if (o.cercle !== 1 || !Number.isFinite(exp) || exp <= now || exp > now + (DEMANDE_JOURS + 1) * 864e5) return null;
    return { t: 'demande', id: o.id, de, entreprise, exp };
  }
  if (!ID.test(String(o.demande || ''))) return null;
  if (o.t === 'don'){
    const contact = contactDonne(o.contact);
    if (!contact.name || !(contact.email || contact.phone || contact.link)) return null;
    return { t: 'don', id: o.id, demande: o.demande, de, entreprise, contact };
  }
  if (o.t === 'merci'){
    const nom = txt(o.contact && o.contact.name, 120);
    return { t: 'merci', id: o.id, demande: o.demande, de, entreprise, contact: { name: nom } };
  }
  return null;
}

/* ---------- ce que MON téléphone trouve pour une demande ----------
   Mes pistes de la même entreprise, et leurs contacts joignables. Les
   pistes d'exemple ne comptent pas : leurs contacts sont inventés. */
export function contactsPour(companies, entreprise, max = 3){
  const out = [];
  for (const c of companies || []){
    if (!c || c.demo || !memeEntreprise(c, entreprise)) continue;
    for (const t of c.contacts || []){
      if (!t || !t.name || !(t.email || t.phone || t.link)) continue;
      out.push({ pisteId: c.id, ctId: t.id });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/* ---------- l'état du réseau sur CET appareil (oc_reseau_v1) ----------
   Mes demandes en cours, ce qu'on m'a demandé, ce qu'on m'a donné, les
   mercis. Un repère d'appareil, comme « nouveau » dans « À découvrir » :
   ni sync, ni copie, ni partage. */
export function etatVide(){ return { v: 1, depuis: 0, demandes: [], recues: [], dons: [], mercis: [] }; }
export function normaliserEtat(e){
  const x = e && typeof e === 'object' ? e : {};
  const liste = (l, max = 200) => (Array.isArray(l) ? l : []).filter(y => y && typeof y === 'object' && ID.test(String(y.id || ''))).slice(-max);
  return { v: 1, depuis: Number(x.depuis) || 0, demandes: liste(x.demandes), recues: liste(x.recues),
           dons: liste(x.dons), mercis: liste(x.mercis) };
}
/* au-delà de 30 jours, on oublie : une demande vit 14 jours */
export function elaguer(e, now = Date.now()){
  const garde = y => (Number(y.exp || y.at) || 0) > now - 30 * 864e5;
  return { ...e, demandes: e.demandes.filter(garde), recues: e.recues.filter(garde),
           dons: e.dons.filter(garde), mercis: e.mercis.filter(garde) };
}
export const demandesOuvertes = (e, now = Date.now()) => e.demandes.filter(d => d.exp > now);
export const peutDemander = (e, now = Date.now()) => demandesOuvertes(e, now).length < DEMANDES_OUVERTES_MAX;
export const demandeDePiste = (e, pisteId, now = Date.now()) =>
  demandesOuvertes(e, now).find(d => d.pisteId === pisteId) || null;

/* une lettre arrive : ce qu'elle change, et rien deux fois.
   `moi` = ma clé publique (mes propres demandes me reviennent quand
   j'ai deux appareils — on ne se répond pas à soi-même). */
export function traiterLettre(e, l, { companies, moi, now = Date.now() } = {}){
  if (!l) return { etat: e, quoi: null };
  if (l.t === 'demande'){
    if (l.de.cle === moi || e.recues.some(r => r.id === l.id)) return { etat: e, quoi: null };
    const trouve = contactsPour(companies, l.entreprise);
    /* RIEN NE S'AFFICHE CHEZ QUI NE TROUVE RIEN (règle 6) : la demande
       est gardée pour ne pas la retraiter, et c'est tout */
    const r = { id: l.id, de: l.de, entreprise: l.entreprise, exp: l.exp, at: now,
                statut: trouve.length ? 'a-voir' : 'rien', trouve };
    return { etat: { ...e, recues: [...e.recues, r] }, quoi: trouve.length ? 'demande' : null };
  }
  if (l.t === 'don'){
    /* un don ne vaut que pour une demande que J'AI faite, et une fois */
    if (!e.demandes.some(d => d.id === l.demande) || e.dons.some(d => d.id === l.id)) return { etat: e, quoi: null };
    const d = { id: l.id, demande: l.demande, de: l.de, entreprise: l.entreprise, contact: l.contact, at: now, statut: 'nouveau' };
    return { etat: { ...e, dons: [...e.dons, d] }, quoi: 'don' };
  }
  if (l.t === 'merci'){
    /* un merci par demande : ajouté, annulé, rajouté, il ne remercie
       qu'une fois */
    if (!e.recues.some(r => r.id === l.demande && r.statut === 'donnee') || e.mercis.some(m => m.id === l.id || m.demande === l.demande))
      return { etat: e, quoi: null };
    const m = { id: l.id, demande: l.demande, de: l.de, entreprise: l.entreprise, contact: l.contact, at: now };
    return { etat: { ...e, mercis: [...e.mercis, m] }, quoi: 'merci' };
  }
  return { etat: e, quoi: null };
}

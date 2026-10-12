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

   QUATRE SORTES DE LETTRES, et rien d'autre ne s'ouvre :
   · demande — « Inès cherche quelqu'un chez Aztek » : le nom de
     l'entreprise (et son SIREN), le prénom de qui demande, le cercle
     (1), l'expiration (14 jours). Règle 3 de docs/reseau.md, mot pour
     mot ; plus la clé où répondre, sans laquelle personne ne pourrait.
   · don     — le contact que l'ami a choisi de donner : nom, rôle,
     adresse, téléphone, lien. Jamais une note, jamais le suivi.
   · merci   — « Inès a ajouté Julie » : la chaîne est remerciée.
   · ami     — le profil de qui vient de t'ajouter (décision du 7 octobre
     2026 : l'amitié est RÉCIPROQUE, obligatoirement). Inès scanne le QR
     de Karim : Karim reçoit le sien, sans un geste. Exactement ce que
     porterait son propre QR (OCA1) — l'identifiant, le nom, le parcours,
     la clé —, jamais un de ses amis.

   Le téléphone de l'ami cherche dans SES pistes sans rien montrer ; il
   ne lui demande quelque chose que s'il a trouvé (règle 6). Fonctions
   pures : WebCrypto, aucun DOM, aucun réseau.

   LES SAUTS (lot 4b, décisions 17 à 19). Une demande vise une entreprise
   — ou un métier et une ville (engine/critere.js). Le téléphone qui ne
   trouve rien la FAIT SUIVRE tout seul à ses amis, deux fois au plus
   (cercles 2 et 3) : même id (un doublon ne sonne qu'une fois), même
   auteur, même expiration, plus `par` — l'ami qui l'a passée — et un
   JETON par maillon : qui il est, scellé pour celui qui le précède.
   Seul ce voisin l'ouvre ; c'est par lui que le merci remonte, et celui
   qui demande ne lit que le premier maillon, son ami. Dès qu'un
   téléphone trouve, une lettre `trouve` revient à qui demande — sans dire
   qui a trouvé — et le contact suit le OUI de celui qui l'a.
   ============================================================ */
import { memeEntreprise, normalizeAmi, direExperience } from './amis.js';
import { critereValide } from './critere.js';

export const LETTRE_KIND = 8571;          /* un kind ordinaire qu'aucun client n'affiche (mesuré gardé) */
export const DEMANDE_JOURS = 14;          /* règle 7 : une demande s'éteint au bout de 14 jours */
export const DEMANDES_OUVERTES_MAX = 3;   /* règle 7 : trois demandes ouvertes à la fois au plus */
export const CERCLE_MAX = 3;              /* au-delà de l'ami d'un ami d'un ami, rien */
export const RELAIS_MAX = 20;             /* un téléphone fait suivre à vingt amis au plus */
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

/* `quoi` : une piste (son entreprise), ou `{ critere }` — un métier et
   une ville de la table, jamais un mot tapé (engine/critere.js) */
export function lettreDemande({ prenom, cle }, quoi, now = Date.now()){
  const l = { v: 1, t: 'demande', id: nouvelId(), de: { prenom: txt(prenom, 40), cle },
              cercle: 1, exp: now + DEMANDE_JOURS * 864e5 };
  const cr = quoi && quoi.critere ? critereValide(quoi.critere) : null;
  if (cr) l.critere = cr; else l.entreprise = entrepriseDe(quoi);
  return l;
}

/* ---------- les sauts ----------
   Le jeton d'un maillon : son prénom et sa clé, scellés pour le maillon
   d'AVANT (l'auteur au premier saut). Opaque pour tous les autres. */
const JETON = /^OCB1\.[A-Za-z0-9_-]{100,1200}$/;
export const jetonValide = j => typeof j === 'string' && JETON.test(j);
export function jetonRelais(clePrecedente, { prenom, cle }){
  return sceller(clePrecedente, { v: 1, t: 'jeton', p: txt(prenom, 40), c: cle });
}
export async function ouvrirJeton(priv, jeton){
  if (!jetonValide(jeton)) return null;
  const o = await ouvrir(priv, jeton);
  if (!o || o.t !== 'jeton' || !cleValide(o.c)) return null;
  const prenom = txt(o.p, 40);
  return prenom ? { prenom, cle: o.c } : null;
}
/* la demande telle que JE la fais suivre : rien ne change, sauf qui la
   passe et un maillon de plus */
export function lettreRelais(demande, { prenom, cle }, jeton){
  const l = { v: 1, t: 'demande', id: demande.id, de: demande.de, cercle: (demande.cercle || 1) + 1,
              exp: demande.exp, par: { prenom: txt(prenom, 40), cle }, chaine: [...(demande.chaine || []), jeton] };
  if (demande.critere) l.critere = demande.critere; else l.entreprise = demande.entreprise;
  return l;
}
/* « quelqu'un a trouvé » : à qui demande, sans dire qui */
export function lettreTrouve(demande){
  return { v: 1, t: 'trouve', id: nouvelId(), demande: demande.id, cercle: demande.cercle || 1,
           chaine: [...(demande.chaine || [])] };
}
/* à qui faire suivre (Watts, Dodds et Newman 2002 ; Adamic et Adar 2005) :
   d'abord, et seulement, à ceux dont le parcours touche l'entreprise ;
   sinon à tous — jamais à l'auteur, ni à qui me l'a passée, ni à un ami
   sans boîte ; vingt au plus, les plus récents d'abord */
export function choisirRelais(amis, demande, exclure = []){
  const non = new Set(exclure.filter(Boolean));
  const tous = (amis || []).filter(a => a && cleValide(a.cle) && !non.has(a.cle))
    .sort((x, y) => (y.recu || 0) - (x.recu || 0));
  const proches = demande && demande.entreprise
    ? tous.filter(a => (a.parcours || []).some(e => memeEntreprise(e, demande.entreprise))) : [];
  return (proches.length ? proches : tous).slice(0, RELAIS_MAX);
}
/* « j'y suis » : MON parcours touche-t-il l'entreprise ? (le plus fort) */
export function soiPour(parcours, entreprise, today){
  let mieux = null;
  for (const e of parcours || []){
    if (!entreprise || !memeEntreprise(e, entreprise)) continue;
    const d = direExperience(e, today);
    if (d && (!mieux || d.poids > mieux.poids)) mieux = { quoi: e.quoi, maintenant: !!d.enCours, poids: d.poids };
  }
  return mieux ? { quoi: mieux.quoi, maintenant: mieux.maintenant } : null;
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
/* `o.piste` : l'entreprise où vit le contact (une demande par métier et
   ville n'en nommait aucune) ; `o.soi` : c'est MOI le contact — « j'y
   suis en alternance ». La chaîne de la demande repart avec : c'est elle
   qui dit « par Léa » chez qui demande. */
export function lettreDon({ prenom, cle }, demande, ct, o = {}){
  const src = o.piste || demande.entreprise;
  const entreprise = entrepriseDe(src);
  const ville = txt(src && (src.city || src.ville), 80);
  if (ville && !demande.entreprise) entreprise.ville = ville;
  const l = { v: 1, t: 'don', id: nouvelId(), demande: demande.id, de: { prenom: txt(prenom, 40), cle },
              entreprise, contact: contactDonne(ct) };
  if ((demande.chaine || []).length) l.chaine = [...demande.chaine];
  if (o.soi && QUOI.has(o.soi.quoi)) l.soi = { quoi: o.soi.quoi, maintenant: !!o.soi.maintenant };
  return l;
}
const QUOI = new Set(['stage', 'alternance', 'emploi']);
/* le profil que je DONNE à qui je viens d'ajouter : `profil` est ce que
   rend `profilDonne` (amis.js), et rien d'autre ne s'y ajoute */
/* `motif` : « ajout » quand je viens de t'ajouter (tu m'ajoutes en
   retour), « maj » quand mon parcours a changé (tu me mets à jour SI je
   suis déjà dans tes amis — une mise à jour ne rajoute jamais quelqu'un
   qu'on a retiré) */
export function lettreAmi({ prenom, cle }, profil, motif = 'ajout'){
  return { v: 1, t: 'ami', id: nouvelId(), motif: motif === 'maj' ? 'maj' : 'ajout',
           de: { prenom: txt(prenom, 40), cle }, profil };
}
export function lettreMerci({ prenom, cle }, don, suite){
  const l = { v: 1, t: 'merci', id: nouvelId(), demande: don.demande, de: { prenom: txt(prenom, 40), cle },
              entreprise: entrepriseDe(don.entreprise), contact: { name: txt(don.contact && don.contact.name, 120) } };
  /* le merci qui REMONTE la chaîne : pour un maillon, avec les jetons
     qui restent après lui — et sans le nom de qui a été trouvé : le
     maillon apprend qu'il a aidé, pas qui était au bout */
  if (suite){ l.relais = true; l.suite = [...suite]; l.contact = { name: '' }; }
  return l;
}

/* une lettre ouverte se remet aux invariants — elle vient de n'importe
   qui qui a ma clé publique, donc de n'importe où */
const chaineValide = (c, n) => Array.isArray(c) && c.length === n && c.every(jetonValide);
export function normaliserLettre(o, now = Date.now()){
  if (!o || typeof o !== 'object' || o.v !== 1 || !ID.test(String(o.id || ''))) return null;
  if (o.t === 'trouve'){
    /* la seule lettre SANS auteur : qui a trouvé ne se dit qu'en donnant */
    const cercle = Number(o.cercle);
    if (!ID.test(String(o.demande || '')) || !(cercle >= 1 && cercle <= CERCLE_MAX) || !chaineValide(o.chaine || [], cercle - 1)) return null;
    return { t: 'trouve', id: o.id, demande: o.demande, cercle, chaine: [...(o.chaine || [])] };
  }
  const de = o.de && typeof o.de === 'object' ? { prenom: txt(o.de.prenom, 40), cle: o.de.cle } : null;
  if (!de || !de.prenom || !cleValide(de.cle)) return null;
  if (o.t === 'ami'){
    /* le profil se remet aux MÊMES invariants qu'un QR scanné, et sa clé
       doit être celle qui écrit : on n'ajoute pas quelqu'un au nom d'un
       autre */
    const a = normalizeAmi(o.profil);
    if (!a || a.cle !== de.cle) return null;
    delete a.recu;
    return { t: 'ami', id: o.id, motif: o.motif === 'maj' ? 'maj' : 'ajout', de, profil: a };
  }
  const entreprise = entrepriseDe(o.entreprise);
  if (o.t === 'demande'){
    const exp = Number(o.exp), cercle = Number(o.cercle);
    if (!(cercle >= 1 && cercle <= CERCLE_MAX) || Math.floor(cercle) !== cercle
        || !Number.isFinite(exp) || exp <= now || exp > now + (DEMANDE_JOURS + 1) * 864e5) return null;
    const out = { t: 'demande', id: o.id, de, exp, cercle };
    if (entreprise.nom) out.entreprise = entreprise;
    else { const cr = critereValide(o.critere); if (!cr) return null; out.critere = cr; }
    if (cercle > 1){
      const par = o.par && typeof o.par === 'object' ? { prenom: txt(o.par.prenom, 40), cle: o.par.cle } : null;
      if (!par || !par.prenom || !cleValide(par.cle) || !chaineValide(o.chaine, cercle - 1)) return null;
      out.par = par;
      out.chaine = [...o.chaine];
    }
    return out;
  }
  if (!entreprise.nom) return null;
  const ville = txt(o.entreprise && o.entreprise.ville, 80);
  if (ville) entreprise.ville = ville;
  if (!ID.test(String(o.demande || ''))) return null;
  if (o.t === 'don'){
    const contact = contactDonne(o.contact);
    if (!contact.name || !(contact.email || contact.phone || contact.link)) return null;
    const d = { t: 'don', id: o.id, demande: o.demande, de, entreprise, contact };
    if (o.chaine !== undefined){
      if (!Array.isArray(o.chaine) || o.chaine.length > CERCLE_MAX - 1 || !o.chaine.every(jetonValide)) return null;
      if (o.chaine.length) d.chaine = [...o.chaine];
    }
    if (o.soi && QUOI.has(o.soi.quoi)) d.soi = { quoi: o.soi.quoi, maintenant: !!o.soi.maintenant };
    return d;
  }
  if (o.t === 'merci'){
    const nom = txt(o.contact && o.contact.name, 120);
    const m = { t: 'merci', id: o.id, demande: o.demande, de, entreprise, contact: { name: nom } };
    if (o.relais){
      if (!Array.isArray(o.suite) || o.suite.length > CERCLE_MAX - 2 || !o.suite.every(jetonValide)) return null;
      m.relais = true;
      m.suite = [...o.suite];
    }
    return m;
  }
  return null;
}

/* ---------- ce que MON téléphone trouve pour une demande ----------
   Mes pistes de la même entreprise, et leurs contacts joignables. Les
   pistes d'exemple ne comptent pas : leurs contacts sont inventés. */
export function contactsPour(companies, entreprise, max = 3){
  return contactsDe((companies || []).filter(c => c && memeEntreprise(c, entreprise)), max);
}
/* les contacts JOIGNABLES de ces pistes (une demande par métier et ville
   arrive avec les pistes que la barre a trouvées, engine/requete.js) */
export function contactsDe(pistes, max = 3){
  const out = [];
  for (const c of pistes || []){
    if (!c || c.demo) continue;
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
export function etatVide(){ return { v: 1, depuis: 0, demandes: [], recues: [], dons: [], mercis: [], lus: [], envois: [] }; }
/* l'empreinte d'un profil donné : savoir s'il a changé sans le garder */
export async function empreinteProfil(profil){
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc(JSON.stringify(profil))));
  return [...h.subarray(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function normaliserEtat(e){
  const x = e && typeof e === 'object' ? e : {};
  const liste = (l, max = 200) => (Array.isArray(l) ? l : []).filter(y => y && typeof y === 'object' && ID.test(String(y.id || ''))).slice(-max);
  /* `lus` : les profils déjà reçus (une lettre relue ne rajoute pas un ami
     qu'on a retiré) ; `envois` : ce qui n'a pas pu partir faute de réseau,
     et repart à la prochaine relève */
  /* `profilEnvoye` : l'empreinte du dernier profil donné à tous mes amis —
     quand elle change, ils reçoivent la nouvelle version (lot 4) */
  const out = { v: 1, depuis: Number(x.depuis) || 0, demandes: liste(x.demandes), recues: liste(x.recues),
           dons: liste(x.dons), mercis: liste(x.mercis), lus: liste(x.lus),
           envois: liste(x.envois, 50).filter(y => cleValide(y.cle) && y.lettre && typeof y.lettre === 'object') };
  if (/^[0-9a-f]{16,64}$/.test(String(x.profilEnvoye || ''))) out.profilEnvoye = x.profilEnvoye;
  return out;
}
/* au-delà de 30 jours, on oublie : une demande vit 14 jours */
export function elaguer(e, now = Date.now()){
  const garde = y => (Number(y.exp || y.at) || 0) > now - 30 * 864e5;
  return { ...e, demandes: e.demandes.filter(garde), recues: e.recues.filter(garde),
           dons: e.dons.filter(garde), mercis: e.mercis.filter(garde),
           lus: (e.lus || []).filter(garde), envois: (e.envois || []).filter(y => (Number(y.exp) || 0) > now) };
}
export const demandesOuvertes = (e, now = Date.now()) => e.demandes.filter(d => d.exp > now);
export const peutDemander = (e, now = Date.now()) => demandesOuvertes(e, now).length < DEMANDES_OUVERTES_MAX;
export const demandeDePiste = (e, pisteId, now = Date.now()) =>
  demandesOuvertes(e, now).find(d => d.pisteId === pisteId) || null;

/* une lettre arrive : ce qu'elle change, et rien deux fois.
   `moi` = ma clé publique (mes propres demandes me reviennent quand
   j'ai deux appareils — on ne se répond pas à soi-même). */
/* `amis` : mes amis (une demande d'un cercle plus loin n'entre que par
   l'un d'eux) ; `parcours` : le mien (« j'y suis ») ; `pistesPour` : la
   recherche par métier et ville (engine/requete.js) ; `sansRelais` :
   j'ai coupé le passage (décision 7) */
export function traiterLettre(e, l, { companies, moi, amis, parcours, pistesPour, sansRelais, today, now = Date.now() } = {}){
  if (!l) return { etat: e, quoi: null };
  if (l.t === 'demande'){
    if (l.de.cle === moi || e.recues.some(r => r.id === l.id)) return { etat: e, quoi: null };
    /* plus loin que le premier cercle, la demande n'entre que par un de
       MES amis : un inconnu qui a ma clé ne m'écrit pas au nom d'un autre */
    if (l.cercle > 1 && !(amis || []).some(a => a && a.cle === l.par.cle)) return { etat: e, quoi: null };
    /* trois demandes ouvertes par personne — chaque téléphone le vérifie */
    if (e.recues.filter(r => r.de && r.de.cle === l.de.cle && r.exp > now).length >= DEMANDES_OUVERTES_MAX)
      return { etat: e, quoi: null };
    const trouve = l.entreprise ? contactsPour(companies, l.entreprise)
      : contactsDe(typeof pistesPour === 'function' ? pistesPour(companies, l.critere) : []);
    const soi = l.entreprise ? soiPour(parcours, l.entreprise, today) : null;
    const voit = trouve.length > 0 || !!soi;
    /* RIEN NE S'AFFICHE CHEZ QUI NE TROUVE RIEN (règle 6) : la demande
       est gardée pour ne pas la retraiter — et passe plus loin */
    const r = { id: l.id, de: l.de, exp: l.exp, at: now, cercle: l.cercle, statut: voit ? 'a-voir' : 'rien', trouve };
    if (l.entreprise) r.entreprise = l.entreprise; else r.critere = l.critere;
    if (l.par){ r.par = l.par; r.chaine = l.chaine; }
    if (soi) r.soi = soi;
    const suivre = !voit && l.cercle < CERCLE_MAX && !sansRelais;
    return { etat: { ...e, recues: [...e.recues, r] }, quoi: voit ? 'demande' : suivre ? 'suivre' : null };
  }
  if (l.t === 'trouve'){
    /* quelqu'un a trouvé pour MA demande : je le sais tout de suite, une
       fois (décision 18) — le contact suivra son oui */
    const d = e.demandes.find(x => x.id === l.demande);
    if (!d || d.trouve) return { etat: e, quoi: null };
    const trouve = { at: now, cercle: l.cercle, chaine: l.chaine };
    return { etat: { ...e, demandes: e.demandes.map(x => x === d ? { ...x, trouve } : x) }, quoi: 'trouve' };
  }
  if (l.t === 'don'){
    /* un don ne vaut que pour une demande que J'AI faite, et une fois */
    if (!e.demandes.some(d => d.id === l.demande) || e.dons.some(d => d.id === l.id)) return { etat: e, quoi: null };
    const d = { id: l.id, demande: l.demande, de: l.de, entreprise: l.entreprise, contact: l.contact, at: now, statut: 'nouveau' };
    if (l.chaine) d.chaine = l.chaine;
    if (l.soi) d.soi = l.soi;
    return { etat: { ...e, dons: [...e.dons, d] }, quoi: 'don' };
  }
  if (l.t === 'ami'){
    /* le profil de qui m'a ajouté : traité UNE fois. L'écran l'ajoute aux
       amis (statutAmi décide : nouveau, à jour, déjà là) */
    if (l.de.cle === moi || (e.lus || []).some(x => x.id === l.id)) return { etat: e, quoi: null };
    return { etat: { ...e, lus: [...(e.lus || []), { id: l.id, at: now }] }, quoi: 'ami' };
  }
  if (l.t === 'merci'){
    /* un merci par demande : ajouté, annulé, rajouté, il ne remercie
       qu'une fois. Celui d'un MAILLON ne vaut que pour une demande que
       j'ai fait suivre */
    const attendu = l.relais ? 'transmise' : 'donnee';
    if (!e.recues.some(r => r.id === l.demande && r.statut === attendu) || e.mercis.some(m => m.id === l.id || m.demande === l.demande))
      return { etat: e, quoi: null };
    if (l.relais){
      const m = { id: l.id, demande: l.demande, de: l.de, entreprise: l.entreprise, at: now, relais: true, suite: l.suite };
      return { etat: { ...e, mercis: [...e.mercis, m] }, quoi: 'merci-relais' };
    }
    const m = { id: l.id, demande: l.demande, de: l.de, entreprise: l.entreprise, contact: l.contact, at: now };
    return { etat: { ...e, mercis: [...e.mercis, m] }, quoi: 'merci' };
  }
  return { etat: e, quoi: null };
}

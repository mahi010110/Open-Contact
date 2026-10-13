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

   CE QUI S'Y ÉCRIT, cinq sortes de messages et rien d'autre :
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
   · reglages — le nom, la durée des messages, qui écrit, l'entrée
     (13 octobre 2026, décisions 31 à 35) : signés d'un responsable, et
     liés au CODE du groupe, pour qu'aucun membre de deux groupes ne
     puisse rejouer chez l'un ce qui a été décidé chez l'autre.
   · fin — le chef supprime le groupe pour tous, signé de même.

   Fonctions pures : WebCrypto, aucun DOM, aucun réseau.
   ============================================================ */
import { bytesToB64, b64ToBytes } from './crypto.js';
import { idAmiValide } from './amis.js';
import { normaliserLettre, DEMANDE_JOURS } from './boite.js';

export const GROUPES_MAX = 5;            /* décision 25 */
export const MOT_JOURS = 7;              /* décision 27 : sept jours par défaut */
/* décision 33 (13 octobre 2026) : la durée se règle — les trois de
   WhatsApp, la plus longue ramenée à 30 jours, ce qu'on peut raisonnablement
   attendre d'un relais public. Elle vaut pour les messages ÉCRITS ENSUITE :
   chacun porte la sienne (`j`), rien n'est raccourci ni rallongé après coup. */
export const DUREES = [1, 7, 30];
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
/* un code tapé ou collé SEUL — trois blocs de cinq, tirets ou espaces
   facultatifs. Plus strict que `codeNorm`, qui FILTRE : n'importe quelle
   phrase contient quinze lettres de l'alphabet, et « Recevoir › Texte »
   ne doit jamais prendre un message pour un code de groupe. */
export const estCodeTape = raw =>
  /^\s*[a-z0-9]{5}[-\s]?[a-z0-9]{5}[-\s]?[a-z0-9]{5}\s*$/i.test(String(raw || '')) && !!codeNorm(raw);

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
/* depuis la 6.66, l'invitation porte aussi la clé de signature du chef
   (décision 31) : c'est elle qui rend les réglages et la fin vérifiables
   chez chacun. Une invitation d'avant n'en a pas — le groupe reste égal. */
export const invitation = g => 'OCG1.' + g.code + '.' + enB64u(nomGroupe(g.nom))
  + (g.chef && CLE_BOITE.test(String(g.chef)) ? '.' + g.chef : '');
export const estInvitation = raw => /OCG1\.[a-z0-9]+/i.test(String(raw || '').replace(/\s+/g, ''));
export function lireInvitation(raw){
  const s = String(raw || '').replace(/\s+/g, '');
  const m = s.match(/OCG1\.([A-Za-z0-9]+)(?:\.([A-Za-z0-9_-]*))?(?:\.([A-Za-z0-9_-]{86,88}))?/);
  if (m){
    const code = codeNorm(m[1]);
    if (!code) return null;
    let nom = '';
    try { nom = m[2] ? nomGroupe(deB64u(m[2])) : ''; } catch (e) { nom = ''; }
    return m[3] ? { code, nom, chef: m[3] } : { code, nom };
  }
  const code = codeNorm(raw);
  return code ? { code, nom: '' } : null;
}

/* ---------- la PORTE d'un groupe « sur demande » (OCP1, lot 5c) ----------
   Elle ne porte pas le code : le nom, l'identifiant de la porte, et les
   clés de boîte de ceux qui acceptent les entrées. Qui la scanne demande
   à entrer ; c'est un responsable qui lui donnera le code. */
const CLE_BOITE = /^[A-Za-z0-9_-]{86,88}$/;
export function porteInvitation({ nom, porte, responsables }){
  const o = { v: 1, n: nomGroupe(nom), p: porte, r: (responsables || []).filter(c => CLE_BOITE.test(String(c))).slice(0, 10) };
  return 'OCP1.' + enB64u(JSON.stringify(o));
}
export const estPorte = raw => /OCP1\.[A-Za-z0-9_-]+/.test(String(raw || '').replace(/\s+/g, ''));
export function lirePorte(raw){
  const m = String(raw || '').replace(/\s+/g, '').match(/OCP1\.([A-Za-z0-9_-]{8,4000})/);
  if (!m) return null;
  let o;
  try { o = JSON.parse(deB64u(m[1])); } catch (e) { return null; }
  if (!o || o.v !== 1 || !ID.test(String(o.p || ''))) return null;
  const responsables = (Array.isArray(o.r) ? o.r : []).filter(c => CLE_BOITE.test(String(c))).slice(0, 10);
  if (!responsables.length) return null;
  return { nom: nomGroupe(o.n), porte: o.p, responsables };
}

/* ---------- les SIGNATURES des responsables (lot 5c) ----------
   ECDSA P-256 : une clé de signature, à part de celle de la boîte. Le
   chef la crée avec le groupe ; elle part, publique, dans le code que
   reçoit chaque nouveau membre — c'est l'ancre. Un adjoint est nommé par
   un responsable, qui signe sa clé : la chaîne remonte toujours au chef. */
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
const b64u = u8 => bytesToB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64uOctets = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return b64ToBytes(s); };
export async function nouvelleCleSignature(){
  const k = await crypto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
  return { pub: b64u(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))),
           priv: b64u(new Uint8Array(await crypto.subtle.exportKey('pkcs8', k.privateKey))) };
}
export const signeValide = v => typeof v === 'string' && CLE_BOITE.test(v);
const aSigner = o => new TextEncoder().encode(JSON.stringify(Object.keys(o).filter(k => k !== 'sig').sort().map(k => [k, o[k]])));
export async function signer(priv, o){
  const k = await crypto.subtle.importKey('pkcs8', deB64uOctets(priv), ECDSA, false, ['sign']);
  return b64u(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, aSigner(o))));
}
export async function verifier(pub, o, sig){
  try {
    const k = await crypto.subtle.importKey('raw', deB64uOctets(pub), ECDSA, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, deB64uOctets(sig), aSigner(o));
  } catch (e) { return false; }
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
export const dureeDe = (t, j) => (t === 'membre' || t === 'depart' || t === 'adjoint' || t === 'exclu' || t === 'reglages' || t === 'fin'
  ? MEMBRE_JOURS : t === 'part' ? PISTES_JOURS
  : t === 'demande' || t === 'retrait' ? DEMANDE_JOURS : (DUREES.includes(j) ? j : MOT_JOURS)) * JOUR;
const ECRIRE = ['tous', 'resp'];
const ENTREE = ['ouvert', 'demande'];
const prenomOk = v => typeof v === 'string' && v.trim().length > 0;
const prenomDe = v => String(v).replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 40);
const entier = (x, max) => Number.isInteger(x) && x >= 0 && x < max;
const sigOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{40,200}$/.test(v);
export function normaliserMessage(m, now = Date.now()){
  if (!m || typeof m !== 'object' || !idAmiValide(m.de)) return null;
  const at = Number(m.at);
  if (!Number.isFinite(at) || at > now + AVANCE || at + dureeDe(m.t, m.j) < now) return null;
  if (m.t === 'membre' && prenomOk(m.prenom)){
    const out = { t: 'membre', de: m.de, prenom: prenomDe(m.prenom), nom: nomGroupe(m.nom), at };
    /* dans un groupe « sur demande » : de quoi devenir responsable */
    if (CLE_BOITE.test(String(m.cle || ''))) out.cle = m.cle;
    if (signeValide(m.sign) && sigOk(m.sig)){ out.sign = m.sign; out.sig = m.sig; }
    return out;
  }
  if (m.t === 'adjoint' && idAmiValide(m.membre) && signeValide(m.sign) && CLE_BOITE.test(String(m.cle || '')) && sigOk(m.sig))
    return { t: 'adjoint', de: m.de, membre: m.membre, sign: m.sign, cle: m.cle, at, sig: m.sig };
  if (m.t === 'depart') return { t: 'depart', de: m.de, at };
  /* lot 5c2 : un message retiré, un membre retiré — signés d'un
     responsable, et ne comptent que VÉRIFIÉS (l'appelant le dit) */
  if (m.t === 'retrait' && ID.test(String(m.id)) && sigOk(m.sig) && signeValide(m.signe))
    return { t: 'retrait', de: m.de, id: m.id, signe: m.signe, sig: m.sig, at };
  if (m.t === 'exclu' && idAmiValide(m.membre) && sigOk(m.sig) && signeValide(m.signe))
    return { t: 'exclu', de: m.de, membre: m.membre, signe: m.signe, sig: m.sig, at };
  if (m.t === 'mot' && ID.test(String(m.id)) && prenomOk(m.prenom) && typeof m.texte === 'string'){
    const texte = m.texte.replace(/\s+/g, ' ').trim().slice(0, MOT_MAX);
    if (!texte) return null;
    const out = { t: 'mot', id: m.id, de: m.de, prenom: prenomDe(m.prenom), texte, at };
    if (DUREES.includes(m.j) && m.j !== MOT_JOURS) out.j = m.j;
    return out;
  }
  /* LES RÉGLAGES (décisions 31 à 35) : tout ce qu'un responsable règle,
     d'un bloc — le plus récent VÉRIFIÉ gagne (l'appelant le dit) */
  if (m.t === 'reglages' && ECRIRE.includes(m.ecrire) && DUREES.includes(m.j) && ENTREE.includes(m.entree)
      && nomGroupe(m.nom) && (m.entree === 'ouvert' || ID.test(String(m.porte || '')))){
    const out = { t: 'reglages', de: m.de, nom: nomGroupe(m.nom), j: m.j, ecrire: m.ecrire, entree: m.entree, at };
    if (m.entree === 'demande') out.porte = m.porte;
    if (sigOk(m.sig) && signeValide(m.signe)){ out.signe = m.signe; out.sig = m.sig; }
    return out;
  }
  if (m.t === 'fin' && sigOk(m.sig) && signeValide(m.signe)) return { t: 'fin', de: m.de, signe: m.signe, sig: m.sig, at };
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
export const groupeVide = () => ({ nom: '', fil: [], membres: {}, depuis: 0, vu: 0, presence: 0, pris: [], masques: [], adjoints: {}, retires: [] });
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
  v.adjoints = g.adjoints && typeof g.adjoints === 'object' ? g.adjoints : {};
  /* les messages retirés par un responsable (lot 5c2) : à leur place,
     « Retiré par Inès » */
  v.retires = Array.isArray(g.retires) ? g.retires.filter(r => r && ID.test(String(r.id)))
    .map(r => ({ id: r.id, par: String(r.par || '').slice(0, 40), ...(idAmiValide(r.de) ? { de: r.de } : {}), at: Number(r.at) || 0,
      ...(r.aDire ? { aDire: Number(r.aDire) || 0 } : {}) })).slice(-200) : [];
  if (g.aRetirer && idAmiValide(g.aRetirer.membre)) v.aRetirer = { membre: g.aRetirer.membre, quand: Number(g.aRetirer.quand) || 0 };
  /* les réglages en vigueur (décisions 31 à 35), et ce qui attend la fin
     de « Annuler » pour partir */
  const r = g.reglages;
  if (r && typeof r === 'object' && DUREES.includes(r.j) && ECRIRE.includes(r.ecrire) && ENTREE.includes(r.entree))
    v.reglages = { nom: nomGroupe(r.nom), j: r.j, ecrire: r.ecrire, entree: r.entree, at: Number(r.at) || 0,
                   ...(ID.test(String(r.porte || '')) ? { porte: r.porte } : {}), par: String(r.par || '').slice(0, 40) };
  if (g.fin && typeof g.fin === 'object') v.fin = { at: Number(g.fin.at) || 0, par: String(g.fin.par || '').slice(0, 40) };
  if (g.aFinir) v.aFinir = Number(g.aFinir) || 0;
  return v;
}

/* un message valide → l'état du groupe. Rend le MÊME objet si rien n'a
   changé : l'appelant ne sauve et ne redessine que ce qui bouge. */
export function traiterMessage(g, m){
  if (!m) return g;
  if (m.t === 'membre'){
    const avant = g.membres[m.de];
    /* retiré par un responsable : sa présence ne le fait pas revenir */
    if (avant && (avant.at >= m.at || avant.exclu)) return g;
    const membres = { ...g.membres, [m.de]: { prenom: m.prenom, at: m.at, ...(m.cle ? { cle: m.cle } : {}), ...(m.sign ? { sign: m.sign } : {}),
      ...(avant && avant.parti > m.at ? { parti: avant.parti } : {}) } };
    return { ...g, membres, nom: g.nom || m.nom };
  }
  if (m.t === 'reglages'){
    /* vérifiés (signés d'un responsable, ou d'un membre d'un groupe sans
       chef), et seulement plus récents que ceux qu'on a */
    if (!m.verifie || (g.reglages && g.reglages.at >= m.at)) return g;
    const par = (g.membres[m.de] || {}).prenom || '';
    const reglages = { nom: m.nom, j: m.j, ecrire: m.ecrire, entree: m.entree, at: m.at, par, ...(m.porte ? { porte: m.porte } : {}) };
    return { ...g, nom: m.nom, reglages };
  }
  if (m.t === 'fin'){
    if (!m.verifie || g.fin) return g;
    return { ...g, fin: { at: m.at, par: (g.membres[m.de] || {}).prenom || '' } };
  }
  if (m.t === 'adjoint'){
    /* une nomination ne compte que VÉRIFIÉE (la signature d'un
       responsable, voir `adjointVerifie`) : l'appelant le dit */
    if (!m.verifie || (g.adjoints || {})[m.membre]) return g;
    return { ...g, adjoints: { ...(g.adjoints || {}), [m.membre]: { sign: m.sign, cle: m.cle, sig: m.sig, at: m.at } } };
  }
  if (m.t === 'retrait'){
    if (!m.verifie || (g.retires || []).some(r => r.id === m.id)) return g;
    const par = (g.membres[m.de] || {}).prenom || '';
    return { ...g, retires: [...(g.retires || []), { id: m.id, par, de: m.de, at: m.at }] };
  }
  if (m.t === 'exclu'){
    const avant = g.membres[m.membre] || { prenom: '', at: m.at };
    if (!m.verifie || avant.exclu) return g;
    const { [m.membre]: _, ...adjoints } = g.adjoints || {};
    return { ...g, adjoints, membres: { ...g.membres, [m.membre]: { ...avant, parti: Math.max(m.at, avant.at), exclu: true } } };
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
    return { ...g, fil: [...g.fil, { t: 'mot', id: m.id, de: m.de, prenom: m.prenom, texte: m.texte, at: m.at, ...(m.j ? { j: m.j } : {}) }] };
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
    : x.at + dureeDe(x.t === 'pistes' ? 'part' : x.t, x.j) > now);
  const membres = {};
  for (const [k, v] of Object.entries(g.membres)) if (v.at + MEMBRE_JOURS * JOUR > now) membres[k] = v;
  const retires = (g.retires || []).filter(r => r.at + DEMANDE_JOURS * JOUR > now);
  if (fil.length === g.fil.length && Object.keys(membres).length === Object.keys(g.membres).length
      && retires.length === (g.retires || []).length) return g;
  const garde = ids => (ids || []).filter(id => fil.some(x => x.id === id));
  return { ...g, fil, membres, retires, pris: garde(g.pris), masques: garde(g.masques) };
}

export const pistesCompletes = x => x.t === 'pistes' && x.d.every(Boolean);
/* le fil tel qu'on le lit : du plus ancien au plus récent, un don de
   pistes seulement quand toutes ses parts sont là */
export const filDe = g => g.fil.filter(x => (x.t === 'mot' || x.t === 'demande' || pistesCompletes(x))
  && !(g.masques || []).includes(x.id)).sort((a, b) => a.at - b.at)
  /* un message retiré garde sa place, sans rien de ce qu'il disait */
  .map(x => { const r = (g.retires || []).find(y => y.id === x.id);
    return r ? { t: 'retire', id: x.id, de: x.de, prenom: x.prenom, at: x.at, par: r.par, parDe: r.de } : x; });
/* les membres : ceux qui se sont dits là et ne sont pas partis */
export const membresDe = g => Object.entries(g.membres)
  .filter(([, v]) => !(v.parti >= v.at))
  .map(([de, v]) => ({ de, prenom: v.prenom }))
  .sort((a, b) => a.prenom.localeCompare(b.prenom, 'fr'));
/* ce qui est arrivé des autres depuis que j'ai regardé */
export const nouveaux = (g, moi) => filDe(g).filter(x => x.t !== 'retire' && x.de !== moi && x.at > g.vu).length;
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

/* LES RESPONSABLES d'un groupe « sur demande » : le chef (sa clé de
   signature, reçue avec le code) et les adjoints dont la nomination
   remonte jusqu'à lui. Ce qu'il faut pour la porte : leurs clés de boîte,
   lues dans leurs présences. */
export function responsables(g, chef){
  const out = [];
  for (const [de, v] of Object.entries(g.membres || {}))
    if (v.sign && v.sign === chef && !(v.parti >= v.at)) out.push({ de, prenom: v.prenom, sign: v.sign, cle: v.cle, chef: true });
  for (const [de, a] of Object.entries(g.adjoints || {})){
    const v = (g.membres || {})[de];
    if (v && !(v.parti >= v.at) && !out.some(x => x.de === de)) out.push({ de, prenom: v.prenom, sign: a.sign, cle: a.cle || v.cle, chef: false });
  }
  return out;
}
export const estResponsable = (g, chef, monSign) => !!monSign && (monSign === chef
  || Object.values(g.adjoints || {}).some(a => a.sign === monSign));
/* une nomination est valide si un responsable DÉJÀ connu l'a signée.
   Ce qui est signé ne porte pas de date : l'adjoint redit sa nomination
   avec sa présence, et celui qui arrive dans un mois la lit encore. */
const corpsAdjoint = m => ({ t: 'adjoint', membre: m.membre, sign: m.sign, cle: m.cle });
/* la clé de signature d'un responsable connu : le chef, ou un adjoint */
const signeurs = (g, chef) => [chef, ...Object.values(g.adjoints || {}).map(a => a.sign)].filter(Boolean);
export async function adjointVerifie(g, chef, m){
  for (const pub of signeurs(g, chef)) if (await verifier(pub, corpsAdjoint(m), m.sig)) return true;
  return false;
}
/* LOT 5c2 — ce qu'un responsable signe : retirer un message, retirer un
   membre, et le nouveau code qui part par la boîte aux autres. La clé
   qui signe est DITE (`signe`) ; elle ne vaut que si c'est celle du
   chef ou d'un adjoint déjà reconnu. */
const corpsRetrait = m => ({ t: 'retrait', id: m.id });
const corpsExclu = m => ({ t: 'exclu', membre: m.membre });
const corpsRecode = m => ({ t: 'recode', ancien: m.ancien, code: m.code, exclu: m.exclu || '' });
/* les réglages et la fin sont signés AVEC le code du groupe (que seuls ses
   membres connaissent) : un membre de deux groupes ne rejoue pas chez l'un
   la fin signée de l'autre */
const corpsReglages = (code, m) => ({ t: 'reglages', code, nom: m.nom, j: m.j, ecrire: m.ecrire, entree: m.entree, porte: m.porte || '', at: m.at });
const corpsFin = code => ({ t: 'fin', code });
const parResponsable = async (g, chef, corps, m) =>
  signeurs(g, chef).includes(m.signe) && await verifier(m.signe, corps, m.sig);
export const retraitVerifie = (g, chef, m) => parResponsable(g, chef, corpsRetrait(m), m);
export const excluVerifie = (g, chef, m) => parResponsable(g, chef, corpsExclu(m), m);
export const recodeVerifie = (g, chef, l) => parResponsable(g, chef, corpsRecode(l), l);
/* sans chef (un groupe ouvert d'avant la 6.66), tout le monde est égal :
   n'importe quel membre règle, sans signature. Avec un chef, seul un
   responsable — et la fin, le chef seul (décision 32). */
export async function reglagesVerifies(g, chef, code, m){
  if (!chef) return !m.signe;
  return parResponsable(g, chef, corpsReglages(code, m), m);
}
export const finVerifiee = async (chef, code, m) => !!chef && m.signe === chef && verifier(chef, corpsFin(code), m.sig);
export async function reglages(sign, { de, code, nom, j, ecrire, entree, porte }, now = Date.now()){
  const m = { t: 'reglages', de, nom: nomGroupe(nom), j, ecrire, entree, at: now, ...(entree === 'demande' ? { porte } : {}) };
  return sign ? { ...m, signe: sign.pub, sig: await signer(sign.priv, corpsReglages(code, m)) } : m;
}
export async function fin(sign, { de, code }, now = Date.now()){
  return { t: 'fin', de, signe: sign.pub, sig: await signer(sign.priv, corpsFin(code)), at: now };
}
/* « Qui peut écrire : les responsables » (décision 34) : un mot d'un autre
   ne compte pas — on le lit chez qui l'a écrit avant le réglage, pas après */
export function motPermis(g, chef, m){
  if (m.t !== 'mot' || !g.reglages || g.reglages.ecrire !== 'resp' || m.at < g.reglages.at) return true;
  const v = (g.membres || {})[m.de];
  return !!v && ((chef && v.sign === chef) || !!(g.adjoints || {})[m.de]);
}
/* les réglages en vigueur, avec leurs valeurs par défaut */
export const reglagesDe = (g, type) => ({ nom: (g && g.nom) || '', j: MOT_JOURS, ecrire: 'tous', entree: type === 'demande' ? 'demande' : 'ouvert',
  ...((g && g.reglages) || {}) });
export async function retrait(sign, { de, id }, now = Date.now()){
  return { t: 'retrait', de, id, signe: sign.pub, sig: await signer(sign.priv, corpsRetrait({ id })), at: now };
}
export async function exclusion(sign, { de, membre }, now = Date.now()){
  return { t: 'exclu', de, membre, signe: sign.pub, sig: await signer(sign.priv, corpsExclu({ membre })), at: now };
}
export async function recode(sign, { ancien, code, exclu = '' }){
  return { ancien, code, exclu, signe: sign.pub, sig: await signer(sign.priv, corpsRecode({ ancien, code, exclu })) };
}
/* le groupe sous son NOUVEAU code : la conversation reste sous les yeux,
   celui qu'on a retiré n'y est plus — ni comme membre, ni comme adjoint —
   et chacun redira sa présence sur le nouveau code */
export function migrerGroupe(g, exclu){
  const { [exclu]: _m, ...membres } = g.membres || {};
  const { [exclu]: _a, ...adjoints } = g.adjoints || {};
  return { ...g, membres, adjoints, depuis: 0, presence: 0, aRetirer: undefined };
}
export async function nomination(priv, { de, membre, sign, cle }, now = Date.now()){
  return { ...corpsAdjoint({ membre, sign, cle }), de, at: now, sig: await signer(priv, corpsAdjoint({ membre, sign, cle })) };
}
/* ce que l'adjoint redit lui-même : sa nomination, telle qu'on l'a signée */
export const redireNomination = (a, de, now = Date.now()) => ({ t: 'adjoint', de, membre: de, sign: a.sign, cle: a.cle, sig: a.sig, at: now });
/* UNE PRÉSENCE QUI DIT « MA CLÉ DE SIGNATURE » LE PROUVE : elle signe
   son identifiant et sa clé de boîte avec. Sans ça, n'importe quel
   membre pourrait annoncer la clé du chef — elle est publique — et
   recevoir les demandes d'entrée à sa place. */
const corpsPresence = m => ({ t: 'membre', de: m.de, cle: m.cle || '', sign: m.sign });
export async function presenceSignee(priv, m){ return { ...m, sig: await signer(priv, corpsPresence(m)) }; }
export async function presenceVerifiee(m){
  if (!m || m.t !== 'membre' || !m.sign) return m;
  if (await verifier(m.sign, corpsPresence(m), m.sig)) return m;
  const { sign, sig, cle, ...reste } = m;
  return reste;
}

/* ---------- les groupes du profil ----------
   Ils vivent dans le profil pour voyager avec lui (sync de MES
   appareils, ma copie) ; ce qui s'y dit vit sur l'appareil. */
export function normaliserGroupes(list){
  const vus = new Set();
  return (Array.isArray(list) ? list : [])
    .map(x => {
      if (!x) return null;
      const g = { code: codeNorm(x.code), nom: nomGroupe(x.nom), at: Number(x.at) || 0 };
      /* le chef (décision 31) : depuis la 6.66, tout groupe neuf en a un,
         ouvert ou pas — c'est lui qui règle et qui supprime. Et ma clé de
         signature, si j'en ai une. */
      if (signeValide(x.chef)){
        g.chef = x.chef;
        if (x.sign && signeValide(x.sign.pub) && typeof x.sign.priv === 'string' && x.sign.priv.length < 400) g.sign = { pub: x.sign.pub, priv: x.sign.priv };
      }
      /* « sur demande » (lot 5c) : la porte, en plus — sans elle et sans
         chef, le groupe redevient ouvert */
      if (x.type === 'demande' && ID.test(String(x.porte || '')) && g.chef){ g.type = 'demande'; g.porte = x.porte; }
      return g;
    })
    .filter(x => x && x.code && !vus.has(x.code) && vus.add(x.code))
    .slice(0, GROUPES_MAX);
}

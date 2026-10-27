/* ============================================================
   OpenContact — moteur · UN SEUL « MOI » (lot R5)
   (docs/propositions/R5-un-seul-moi.md, analyse des menaces comprise)

   Une phrase de douze mots, tirée par l'appareil, et ce qu'elle
   ramène sur un téléphone neuf : tout ce que porte la copie `.oc`
   (pistes, profil, amis, clé de boîte, groupes), scellé sous une clé
   tirée de la phrase et déposé sur les relais, en morceaux.

   · LA PHRASE est celle du coffre (`engine/vault.js`) : même liste de
     256 mots, même normalisation. Une seule phrase, qui rouvre aussi
     le verrou (réponse ③ du mainteneur). 12 mots tirés au hasard,
     96 bits ; la dérivation PBKDF2-SHA256 à 600 000 tours (comme le
     coffre) y ajoute ≈ 19 bits de travail : ≈ 115 bits à forcer pour
     qui garde un dépôt hors ligne, au-dessus des 112 que NIST
     SP 800-57 demande jusqu'en 2030.
   · TOUT SE TIRE DE LA PHRASE, rien ne se tire au hasard une seconde
     fois : un téléphone neuf n'a qu'elle. Le sel est donc fixe — la
     phrase, elle, est aléatoire.
   · CE QUE VOIT UN RELAIS : une étiquette et une clé de signature qui
     changent CHAQUE SEMAINE (dérivées de la phrase et du numéro de
     semaine) — il ne relie pas mes dépôts d'une semaine à l'autre —,
     une expiration, et du chiffré. Ni nom, ni pseudo, ni taille de
     piste lisible.
   · LA LIAISON DE MES APPAREILS voyage DANS le dépôt scellé : les
     douze mots ramènent aussi le lien, sans phrase de liaison à
     retaper. Une salle tirée de la phrase aurait fait rejoindre une
     salle P2P à chaque ouverture, même à qui n'a qu'un téléphone
     (tranché par délégation, 27 octobre 2026).
   · CE QUI SE DÉPOSE se REMPLACE (NIP-33, kind 30078) dans la semaine :
     même clé, même `d` — mesuré chez 5 relais sur 7 (sonde du coffre).
     Un morceau fait 32 Ko au plus, la taille que 5 relais sur 7
     gardent (même sonde).

   Fonctions pures : le hasard et le temps sont injectables. La
   signature des événements (secp256k1) vit dans la bibliothèque
   vendorisée ; le moteur ne rend que la clé secrète de la semaine.
   ============================================================ */
import { makeVaultPhrase, normVaultPhrase, phraseUnknownWords, PHRASE_LEN } from './vault.js';
import { KDF_ITER, bytesToB64, b64ToBytes } from './crypto.js';
import { syncMerge } from './sync.js';
import { normalizeProfile } from './model.js';

export const MOI_KIND = 30078;            /* adressable, remplacé dans la semaine (NIP-33) */
export const MORCEAU_MAX = 24000;         /* caractères de chiffré par événement : ≈ 25 Ko signé, sous 32 */
export const MORCEAUX_MAX = 64;           /* au-delà, la copie ne se dépose pas (≈ 1,5 Mo compressé) */
export const SEMAINES_LUES = 9;           /* on relit neuf semaines en arrière */
export const EXPIRE_JOURS = 63;           /* un dépôt vit neuf semaines, puis le relais l'oublie */
export const REDEPOSER_JOURS = 7;         /* inchangée, la copie se redépose une fois par semaine */
const SEL = 'oc-moi-v1';
const AAD = 'oc-moi-v1';

const te = () => new TextEncoder();
const b64u = u8 => bytesToB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ---------- la phrase ---------- */
export const nouvellePhrase = rnd => makeVaultPhrase(rnd);
export const normPhrase = s => normVaultPhrase(s);
/* ce qui ne va pas dans une phrase tapée, en un code : '' si elle est bonne */
export function defautPhrase(s){
  const mots = normVaultPhrase(s).split(' ').filter(Boolean);
  if (!mots.length) return 'vide';
  if (phraseUnknownWords(s).length) return 'mot';
  if (mots.length !== PHRASE_LEN) return 'nombre';
  return '';
}
/* deux mots à retaper, un dans chaque moitié — `rnd` rend deux octets */
export function motsAVerifier(rnd){
  const r = (rnd || (n => crypto.getRandomValues(new Uint8Array(n))))(2);
  return [r[0] % (PHRASE_LEN / 2), PHRASE_LEN / 2 + r[1] % (PHRASE_LEN / 2)];
}

/* ---------- la semaine ---------- */
/* les semaines commencent le lundi : l'époque Unix tombe un jeudi */
export const semaineDe = ms => Math.floor((ms / 864e5 + 3) / 7);

/* ---------- les clés, tirées de la phrase ---------- */
/* la graine : PBKDF2 à 600 000 tours (≈ 1 s sur un téléphone moyen),
   puis tout le reste par HKDF — un seul calcul cher par phrase */
export async function graine(phrase, iter = KDF_ITER){
  const base = await crypto.subtle.importKey('raw', te().encode('moi:' + normVaultPhrase(phrase)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: te().encode(SEL), iterations: iter, hash: 'SHA-256' }, base, 256));
}
async function hkdf(g, info){
  const base = await crypto.subtle.importKey('raw', g, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', salt: new Uint8Array(32), info: te().encode(info), hash: 'SHA-256' }, base, 256));
}
/* ce que l'appareil garde (oc_moi_v1, scellé par le coffre s'il y en a
   un) : les clés, jamais la phrase — comme le coffre, qui n'écrit
   jamais la sienne sur le disque */
export async function clesDe(phrase, iter = KDF_ITER){
  const g = await graine(phrase, iter);
  return {
    scelle: bytesToB64(await hkdf(g, 'oc-moi-scelle')),
    etiquette: bytesToB64(await hkdf(g, 'oc-moi-etiquette')),
    signe: bytesToB64(await hkdf(g, 'oc-moi-signe'))
  };
}
export const clesValides = c => !!(c && ['scelle', 'etiquette', 'signe'].every(k => typeof c[k] === 'string' && c[k].length >= 40));

async function hmac(cleB64, texte){
  const k = await crypto.subtle.importKey('raw', b64ToBytes(cleB64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, te().encode(texte)));
}
/* l'étiquette de la semaine : 128 bits, rien de lisible */
export async function etiquetteSemaine(cles, semaine){
  return b64u(await hmac(cles.etiquette, 'semaine:' + semaine)).slice(0, 22);
}
/* LE POSTE : chaque appareil dépose sous SON `d`, sinon le dépôt du
   portable remplacerait celui du téléphone (NIP-33 remplace par auteur,
   kind et `d` — et l'auteur, ici, c'est la phrase). Tiré de l'appareil
   ET de la semaine : d'une semaine à l'autre, le relais ne reconnaît
   pas plus l'appareil que la personne. `appareil` : 12 caractères tirés
   une fois, gardés dans oc_moi_v1, et scellés dans le dépôt. */
export const nouvelAppareil = rnd => b64u((rnd || (n => crypto.getRandomValues(new Uint8Array(n))))(9));
export async function posteSemaine(cles, appareil, semaine){
  return b64u(await hmac(cles.etiquette, 'poste:' + appareil + ':' + semaine)).slice(0, 11);
}
/* la clé de signature de la semaine (secp256k1) : 32 octets dans
   [1, n − 1]. Un tirage hors de l'intervalle (≈ 2⁻¹²⁸) se refait. */
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const enBig = u8 => u8.reduce((a, b) => (a << 8n) | BigInt(b), 0n);
export async function cleSemaine(cles, semaine){
  for (let i = 0; i < 8; i++){
    const s = await hmac(cles.signe, 'cle:' + semaine + (i ? ':' + i : ''));
    const v = enBig(s);
    if (v > 0n && v < N) return s;
  }
  throw new Error('cle');
}

/* ---------- le scellé ---------- */
/* compressé quand le moteur sait le faire (tous les navigateurs
   récents, Node 18+) — le JSON d'une copie se divise par cinq environ */
const compresse = typeof CompressionStream === 'function';
async function flux(u8, Classe){
  const s = new Blob([u8]).stream().pipeThrough(new Classe('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
export async function sceller(cles, obj, rnd){
  const brut = te().encode(JSON.stringify(obj));
  const z = compresse ? await flux(brut, CompressionStream) : brut;
  const iv = (rnd || (n => crypto.getRandomValues(new Uint8Array(n))))(12);
  const k = await crypto.subtle.importKey('raw', b64ToBytes(cles.scelle), { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te().encode(AAD) }, k, z));
  return 'OCM1.' + (compresse ? 'z' : 'n') + '.' + bytesToB64(iv) + '.' + bytesToB64(ct);
}
/* rend l'objet, ou jette 'format' / 'cle' — jamais une erreur brute */
export async function ouvrirScelle(cles, texte){
  const p = String(texte || '').split('.');
  if (p.length !== 4 || p[0] !== 'OCM1' || !/^[zn]$/.test(p[1])) throw new Error('format');
  let z;
  try {
    const k = await crypto.subtle.importKey('raw', b64ToBytes(cles.scelle), { name: 'AES-GCM' }, false, ['decrypt']);
    z = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(p[2]), additionalData: te().encode(AAD) }, k, b64ToBytes(p[3])));
  } catch (e) { throw new Error('cle'); }
  try {
    const brut = p[1] === 'z' ? await flux(z, DecompressionStream) : z;
    return JSON.parse(new TextDecoder().decode(brut));
  } catch (e) { throw new Error('format'); }
}

/* ---------- les morceaux ---------- */
/* un dépôt = N événements ; chacun porte « OCMP1.<dépôt>.<i>.<n>.<part> ».
   Le dépôt a son identifiant : un morceau d'un dépôt plus ancien, resté
   sous un `d` que le nouveau n'a pas réécrit, ne se mélange jamais. */
export function decouper(scelle, depot, max = MORCEAU_MAX){
  const parts = [];
  for (let i = 0; i < scelle.length; i += max) parts.push(scelle.slice(i, i + max));
  if (!parts.length || parts.length > MORCEAUX_MAX) return null;
  return parts.map((x, i) => `OCMP1.${depot}.${i}.${parts.length}.${x}`);
}
/* les événements d'un dépôt, prêts à signer : l'étiquette de la
   semaine en `x` (ce qu'on demande au relais), le poste et le morceau
   en `d` (ce qu'il remplace), une expiration (NIP-40) */
export function evenementsDepot(etiquette, poste, morceaux, maintenantMs){
  const exp = String(Math.floor(maintenantMs / 1000) + EXPIRE_JOURS * 86400);
  return morceaux.map((contenu, i) => ({ kind: MOI_KIND, contenu,
    tags: [['d', etiquette + '.' + poste + '.' + i], ['x', etiquette], ['expiration', exp]] }));
}
/* les dépôts COMPLETS, rassemblés, le plus récent d'abord ([] s'il n'y
   en a pas) : `{ texte, at }`, `at` en millisecondes. `evs` : des
   événements relus (n'importe quels relais, n'importe quel ordre, des
   doublons). Un dépôt incomplet ne se devine pas. */
export function rassembler(evs){
  const depots = new Map();
  for (const e of evs || []){
    const m = /^OCMP1\.([A-Za-z0-9_-]{6,32})\.(\d{1,3})\.(\d{1,3})\.(.+)$/s.exec((e && e.content) || '');
    if (!m) continue;
    const [, id, i, n, part] = m;
    const ni = Number(n), ii = Number(i);
    if (!ni || ni > MORCEAUX_MAX || ii >= ni) continue;
    const d = depots.get(id) || { n: ni, at: 0, parts: new Map() };
    if (d.n !== ni) continue;
    d.parts.set(ii, part);
    d.at = Math.max(d.at, Number(e.created_at) || 0);
    depots.set(id, d);
  }
  const complets = [...depots.values()].filter(d => d.parts.size === d.n).sort((a, b) => b.at - a.at);
  return complets.map(d => ({ texte: [...Array(d.n).keys()].map(i => d.parts.get(i)).join(''), at: d.at * 1000 }));
}

/* ---------- ramener ----------
   Plusieurs dépôts s'ouvrent sous une phrase : un par appareil et par
   semaine. On garde le plus récent de CHAQUE appareil — un dépôt
   ancien du même appareil ferait revenir ce qu'il a retiré depuis —, et
   on les fusionne comme la sync de mes appareils (engine/sync.js) : la
   piste la plus récente gagne, les suppressions tiennent, le profil
   enregistré en dernier gagne. Rien ne s'écrase : c'est un téléphone
   perdu qu'on retrouve, avec le portable qui a continué sans lui.
   `ouverts` : [{ at, obj }]. Rend { companies, orphans, profile, tombs,
   liaison, at, appareils } — ou null s'il n'y a rien. */
export function fusionnerCopies(ouverts){
  const parAppareil = new Map();
  for (const o of ouverts || []){
    if (!o || !o.obj || o.obj.kind !== 'full' || !Array.isArray(o.obj.companies)) continue;
    const k = typeof o.obj.appareil === 'string' ? o.obj.appareil : '?' + parAppareil.size;
    const deja = parAppareil.get(k);
    if (!deja || o.at > deja.at) parAppareil.set(k, o);
  }
  const garde = [...parAppareil.values()].sort((a, b) => a.at - b.at);
  if (!garde.length) return null;
  let acc = { companies: [], orphans: [], profile: null, tombs: [] };
  for (const o of garde) acc = syncMerge(o.obj, acc);
  /* un profil jamais enregistré (horodatage nul) ne gagne aucune
     fusion : le plus récent qui existe tient alors la place */
  if (!acc.profile){
    const p = [...garde].reverse().find(o => o.obj.profile);
    if (p) acc.profile = normalizeProfile(p.obj.profile);
  }
  const avecLien = [...garde].reverse().find(o => typeof o.obj.liaison === 'string' && o.obj.liaison);
  return { companies: acc.companies, orphans: acc.orphans, profile: acc.profile, tombs: acc.tombs,
           liaison: avecLien ? avecLien.obj.liaison : '', at: garde[garde.length - 1].at, appareils: garde.length };
}

/* ---------- quand redéposer ---------- */
/* changée depuis le dernier dépôt (et pas il y a moins de dix
   minutes : une fiche qu'on édite ne fait pas dix dépôts), ou une
   semaine sans dépôt — l'étiquette a changé, le relais oublie */
export function fautDeposer(dernier, empreinte, maintenantMs){
  if (!dernier || !dernier.at) return true;
  const age = maintenantMs - dernier.at;
  if (semaineDe(maintenantMs) !== semaineDe(dernier.at)) return true;
  if (age >= REDEPOSER_JOURS * 864e5) return true;
  return dernier.empreinte !== empreinte && age >= 10 * 60000;
}
export async function empreinte(obj){
  const h = await crypto.subtle.digest('SHA-256', te().encode(JSON.stringify(obj)));
  return b64u(new Uint8Array(h)).slice(0, 16);
}

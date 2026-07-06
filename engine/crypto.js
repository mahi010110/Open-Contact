/* ============================================================
   OpenContact — moteur · encodage & chiffrement
   OC2 : format actuel (AES-GCM, clé dérivée du mot de passe de
   groupe — aucune clé dans le code). OC1 : ancien format scellé,
   lu pour compatibilité. Aucun accès au DOM.
   ============================================================ */

export const KDF_ITER = 600000;

export function bytesToB64(u8){
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
}
export function b64ToBytes(b){
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
/* OC2 : mot de passe de groupe → AES-GCM. Format versionné :
   OC2.1.<itérations>.<sel>.<iv>.<chiffré> — aucune clé dans le code. */
export async function deriveKey(pass, salt, iter){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptOC2(obj, pass){
  if (!(crypto && crypto.subtle)) throw new Error('nocrypto');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, KDF_ITER);
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return 'OC2.1.' + KDF_ITER + '.' + bytesToB64(salt) + '.' + bytesToB64(iv) + '.' + bytesToB64(ct);
}
export async function decryptOC2(str, pass){
  if (!(crypto && crypto.subtle)) throw new Error('nocrypto');
  const p = String(str).replace(/\s+/g, '').split('.');
  if (p[0] !== 'OC2') throw new Error('format');
  let iter, salt, iv, ct;
  if (p.length === 6 && p[1] === '1'){
    iter = Math.min(Math.max(parseInt(p[2], 10) || 0, 10000), 2000000);
    salt = b64ToBytes(p[3]); iv = b64ToBytes(p[4]); ct = b64ToBytes(p[5]);
  } else if (p.length === 4){          /* ancien format v3 : 150 000 itérations */
    iter = 150000;
    salt = b64ToBytes(p[1]); iv = b64ToBytes(p[2]); ct = b64ToBytes(p[3]);
  } else throw new Error('format');
  const key = await deriveKey(pass, salt, iter);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) { throw new Error('motdepasse'); }
}
/* OC1 : ancien format scellé — lecture seule (compatibilité) */
export function fnv(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function ocKeystream(seed, len){
  let a = seed >>> 0;
  const o = new Uint8Array(len);
  for (let i = 0; i < len; i++){
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    o[i] = (t ^ t >>> 14) & 255;
  }
  return o;
}
export function unsealOC1(str){
  const s = String(str).replace(/\s+/g, '');
  const parts = s.split('.');
  if (parts[0] !== 'OC1' || parts.length < 3) throw new Error('format');
  const b = parts.slice(2).join('.');
  if (fnv(b).toString(16) !== parts[1]) throw new Error('altéré');
  const enc = b64ToBytes(b);
  const ks = ocKeystream(fnv('OpenContact·communauté·v1'), enc.length);
  const dec = new Uint8Array(enc.length);
  for (let i = 0; i < enc.length; i++) dec[i] = enc[i] ^ ks[i];
  return JSON.parse(new TextDecoder().decode(dec));
}

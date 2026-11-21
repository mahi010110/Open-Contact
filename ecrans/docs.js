/* ============================================================
   OpenContact · la nouvelle interface · CV et lettres
   (repris de ui/docs.js : la nouvelle interface n'importe rien de ui/)

   Le profil range 0..n documents PDF nommés (« CV cyber », « LM
   générale »…), sur CET appareil (`oc_docs_v1`, hors du profil : jamais
   dans une copie, une sync ou un partage). Les clés héritées `cv` et
   `lettre` restent des variantes comme les autres.
   ============================================================ */
import { docList, docGet, docPut, docDel } from '../engine/storage.js';
import { uid } from '../engine/utils.js';

export const DOC_MAX = 8 * 1048576;   /* 8 Mo par PDF */

export const docKind = key => (key === 'cv' || String(key).startsWith('cv_')) ? 'cv' : 'lm';
export const docTitle = d => String(d.name || '').replace(/\.pdf$/i, '')
  || (docKind(d.key) === 'cv' ? 'Mon CV' : 'Ma lettre');

export async function listDocs(){
  try { return (await docList()).filter(d => d && d.blob); }
  catch (e) { return []; }
}
/* le fichier choisi est-il un PDF ? le type peut manquer (un fichier
   venu d'un autre téléphone) : on regarde alors le nom */
export const estPdf = f => !!f && (f.type === 'application/pdf' || (!f.type && /\.pdf$/i.test(f.name || '')));
/* ranger un PDF choisi : rend `{ key }`, ou `{ erreur }` en un code
   (`pdf`, `lourd`, `stockage`) que l'écran dit sous sa liste */
export async function rangerPdf(kind, f){
  if (!estPdf(f)) return { erreur: 'pdf' };
  if (f.size > DOC_MAX) return { erreur: 'lourd' };
  const key = kind + '_' + uid();
  try { await docPut(key, { name: f.name, size: f.size, type: f.type || 'application/pdf', added: Date.now(), blob: f }); }
  catch (e) { return { erreur: 'stockage' }; }
  return { key };
}
export const retirerDoc = key => docDel(key);
export const lireDoc = key => docGet(key);
export const remettreDoc = (key, val) => docPut(key, val);
/* ouvrir le PDF dans un autre onglet : l'appareil sait le lire */
export async function ouvrirDoc(key){
  const doc = await docGet(key).catch(() => null);
  if (!doc) return false;
  const url = URL.createObjectURL(new Blob([doc.blob], { type: doc.type || 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

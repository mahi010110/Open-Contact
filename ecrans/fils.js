/* ============================================================
   OpenContact · la nouvelle interface · la liste des conversations
   (docs/refonte-reprendre.md §8 ; la mécanique de ui/conversations.js)

   Toutes les conversations — mes groupes, mes amis — dans une liste, la
   plus récente en haut, les épinglées avant (engine/conversations.js,
   `oc_fils_v1`). Et LE CALME : aucun chiffre sur un onglet ; « Réseau »
   change de couleur quand quelqu'un attend (`attendOnglet`).
   ============================================================ */
import { FILS_KEY, kvGet, kvSet } from '../engine/storage.js';
import { prefsVides, normaliserPrefs, boite, basculerEpingle, basculerMuet, renommerFil, oublierFil,
         cleFil, attendOnglet } from '../engine/conversations.js';
import { resumeGroupes } from './groupes.js';
import { resumeConversations, filAvec } from './messages.js';
import { etatReseau, recuesAVoir, donsNouveaux } from './boite.js';
import { S } from './etat.js';

let prefs = prefsVides();
let charge = null;
export function chargerFils(){
  return charge || (charge = kvGet(FILS_KEY).then(v => {
    try { prefs = normaliserPrefs(JSON.parse(v || 'null')); } catch (e) { prefs = prefsVides(); }
  }).catch(() => {}));
}
const sauver = () => kvSet(FILS_KEY, JSON.stringify(prefs)).catch(() => {});
export async function renommerGroupe(ancien, nouveau){
  await chargerFils();
  prefs = renommerFil(prefs, cleFil('groupe', ancien), cleFil('groupe', nouveau));
  sauver();
}
export async function oublierConversation(sorte, id){
  await chargerFils();
  prefs = oublierFil(prefs, cleFil(sorte, id));
  sauver();
}
export function epingler(cle){ prefs = basculerEpingle(prefs, cle); sauver(); }
export function couperSon(cle){ prefs = basculerMuet(prefs, cle); sauver(); }

export const rangsBoite = () => boite([...resumeGroupes(), ...resumeConversations()], prefs);

/* l'onglet change de couleur : une conversation qui attend (pas lue, son
   non coupé, ou on m'y nomme), un contact donné qui attend qu'on le
   prenne, un ami qui attend ma réponse */
export const attendReseau = () => attendOnglet(rangsBoite()) || donsNouveaux().length > 0 || recuesAVoir().length > 0;
export const ilYaQuelqueChose = () => !!(etatReseau().demandes.length || (S.profile.amis || []).length
  || (S.profile.groupes || []).length || etatReseau().attentes.length || recuesAVoir().length);
export { filAvec };

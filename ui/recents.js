/* ============================================================
   OpenContact — interface · les pistes ouvertes en dernier
   (la refonte, fiche 0014)

   La PILE de la barre du bas montre la dernière piste ouverte, comme la
   pile d'onglets d'Arc Search, et le + la propose en tête de « Ouvertes
   récemment » : on reprend là où l'on s'était arrêté, sans chercher.

   Un repère de CET appareil (`oc_recents_v1`, CONTRAT.md §1) : ni sync,
   ni copie, ni partage. Une piste supprimée depuis ne s'y lit plus.
   ============================================================ */
import { RECENTS_KEY, kvGet, kvSet } from '../engine/storage.js';
import { lireRecents, avecRecent, ecrireRecents } from '../engine/commande.js';
import { S } from './state.js';

let ids = [];
let charge = null;
export function chargerRecents(){
  return charge || (charge = kvGet(RECENTS_KEY).then(v => { ids = lireRecents(v); }).catch(() => {}));
}
/* une piste vient de s'ouvrir : elle passe en tête */
export function noterOuverte(c){
  if (!c || !c.id || c.demo) return;
  ids = avecRecent(ids, c.id);
  kvSet(RECENTS_KEY, ecrireRecents(ids)).catch(() => {});
  document.dispatchEvent(new CustomEvent('oc:recents'));
}
/* les pistes ouvertes en dernier qui existent encore, la plus récente d'abord */
export function recentes(max = 3){
  const par = new Map(S.companies.map(c => [c.id, c]));
  return ids.map(id => par.get(id)).filter(Boolean).slice(0, max);
}

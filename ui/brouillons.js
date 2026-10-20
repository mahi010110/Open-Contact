/* ============================================================
   OpenContact — interface · les brouillons (lot R3)
   Ce qu'on a commencé à écrire, par piste, sur CET appareil
   (`oc_brouillons_v1`, CONTRAT.md). Le moteur décide de la forme et
   de la durée (`engine/prets.js`) ; ici, on lit une fois au démarrage
   et on écrit peu après la dernière frappe — jamais à chaque lettre.
   Rien ne sort d'ici : ni partage, ni copie, ni synchronisation.
   ============================================================ */
import { BROUILLONS_KEY, kvGet, kvSet } from '../engine/storage.js';
import { lireBrouillons, poserBrouillon, retirerBrouillon, brouillonDe } from '../engine/prets.js';

let etat = lireBrouillons(null);
let charge = null;
let minuteur = null;

export function chargerBrouillons(){
  return charge || (charge = kvGet(BROUILLONS_KEY)
    .then(v => { etat = lireBrouillons(v); })
    .catch(() => {}));
}
const ecrire = () => { minuteur = null; kvSet(BROUILLONS_KEY, JSON.stringify(etat)).catch(() => {}); };
const bientot = () => { clearTimeout(minuteur); minuteur = setTimeout(ecrire, 400); };
/* l'app passe en arrière-plan (on part coller le mail ailleurs) : ce qui
   attendait s'écrit tout de suite — un téléphone peut fermer l'onglet */
export function ecrireBrouillonsMaintenant(){ if (minuteur){ clearTimeout(minuteur); ecrire(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) ecrireBrouillonsMaintenant(); });

export const brouillon = c => brouillonDe(etat, c);
export function garderBrouillon(c, x){ if (!c) return; etat = poserBrouillon(etat, c.id, x); bientot(); }
export function oublierBrouillon(id){
  if (!(id in etat.b)) return;
  etat = retirerBrouillon(etat, id);
  bientot();
}

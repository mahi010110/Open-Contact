/* ============================================================
   OpenContact · la nouvelle interface · Moi : où l'on est
   (docs/brief-refonte.md §12, lot 4)

   Ce que les deux fichiers de Moi se partagent : l'état de la session
   et la navigation. Au téléphone, une page de Moi est POUSSÉE (un
   retour, une entrée d'historique). Au poste, elle s'ouvre à droite de
   la liste, et la ligne qui la porte reste allumée — « Phrase » allume
   « Ma copie », qui la contient.

   Ce fichier existe pour qu'`moi.js` et `copie.js` n'aient pas à
   s'importer l'un l'autre.
   ============================================================ */
import { C, pousser, retour, rendre, allerA, pageOuverte } from './coque.js';

/* au poste : { t, id } la page ouverte à droite (sinon « Mon profil ») */
export const M = { sel: null, docs: null, docErr: '' };
/* ce que copie.js demande à moi.js sans l'importer : redessiner la liste
   (la ligne « Ma copie » dit son état) */
export const lien = { majListe(){} };

/* une page ouverte depuis une autre revient à celle-là */
export const PARENT_M = { modele: 'modeles', phrase: 'copie', relier: 'copie', restauration: 'copie', aideconf: 'reglages' };
/* la ligne de la liste que cette page allume */
export const LIGNE_M = t => PARENT_M[t] || t;

export function ouvrirM(t, id = '', depuis){
  if (C.onglet !== 'moi') allerA('moi');
  if (C.poste){ M.sel = { t, id }; rendre(); return; }
  pousser({ t, id }, depuis);
}
export function fermerM(){
  if (C.poste){
    const pm = M.sel && PARENT_M[M.sel.t];
    M.sel = pm ? { t: pm, id: '' } : null;
    rendre();
    return;
  }
  if (pageOuverte()) retour();
}

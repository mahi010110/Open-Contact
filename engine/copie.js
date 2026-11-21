/* ============================================================
   OpenContact — moteur · « Ma copie » (la refonte, lot 4)

   Ce qu'une copie lue ajouterait à cet appareil, dit AVANT le geste
   (invariant ②), et la phrase qui dit où en est la copie de quelqu'un.

   Restaurer, c'est ramener : la même fusion que celle de mes appareils
   (engine/sync.js, le plus récent gagne, piste par piste) — rien ne
   s'écrase, ce qui manque ici s'ajoute. L'aperçu se calcule sur une
   fusion À BLANC : la même que celle qui s'appliquera, sans rien écrire.

   Fonctions pures — aucun accès au DOM, aucun état.
   ============================================================ */
import { syncMerge } from './sync.js';
import { prenomAmi } from './amis.js';

/* `copie` : ce qu'on a lu ({ companies, orphans, profile, tombs, liaison? }) ;
   `local` : ce qu'il y a ici, sous la même forme */
export function apercuCopie(copie, local){
  copie = copie || {}; local = local || {};
  const blanc = syncMerge(copie, local);
  const ici = new Map((local.companies || []).map(c => [c.id, c]));
  const finales = new Set(blanc.companies.map(c => c.id));
  const nouvelles = [], plusRecentes = [], dejaLaListe = [];
  let ecartees = 0;
  for (const c of copie.companies || []){
    if (!c || !c.id) continue;
    const l = { id: c.id, name: String(c.name || ''), city: String(c.city || '') };
    const mine = ici.get(c.id);
    if (!mine){
      /* une piste que j'avais supprimée depuis ne revient pas */
      if (finales.has(c.id)) nouvelles.push(l); else ecartees++;
    } else if ((Number(c.updatedAt) || 0) > (Number(mine.updatedAt) || 0) && finales.has(c.id)) plusRecentes.push(l);
    else dejaLaListe.push(l);
  }
  const p = copie.profile || {};
  const resume = {
    nom: String(p.name || '').trim(),
    pistes: (copie.companies || []).filter(c => c && c.id).length,
    amis: (Array.isArray(p.amis) ? p.amis : []).map(prenomAmi).filter(Boolean),
    groupes: (Array.isArray(p.groupes) ? p.groupes : []).map(g => String((g && g.nom) || '').trim()).filter(Boolean)
  };
  const st = blanc.stats;
  const a = { nouvelles, plusRecentes, dejaLa: dejaLaListe.length, dejaLaListe, ecartees, retirees: st.removedC, contacts: st.addedO,
    profil: st.profile === 'remote', liaison: !!copie.liaison, resume };
  a.vide = !nouvelles.length && !plusRecentes.length && !a.retirees && !a.contacts && !a.profil && !a.liaison;
  return a;
}

/* ce que la ligne « Ma copie » dit d'elle-même, en un mot ou deux :
   « seulement sur cet appareil » quand rien ne la garde ailleurs
   (`sansFilet`, engine/assist.js), sinon ce qui existe */
export function etatCopie({ sansFilet = false, phrase = false, fichier = '', appareils = 1 } = {}){
  if (sansFilet) return 'seulement sur cet appareil';
  return [phrase ? 'phrase de secours' : '', fichier ? 'copie du ' + fichier : '',
    appareils > 1 ? appareils + ' appareils' : ''].filter(Boolean).join(' · ') || 'aucune';
}

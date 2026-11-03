/* ============================================================
   OpenContact — interface · ceux qui aident (lot R7)
   (docs/propositions/R7-ceux-qui-aident.md)

   « Je peux aider », dans Moi : une rangée, et sa feuille de trois cases
   aux mots fixes. Ce qui est coché part dans le profil donné à mes amis
   (OCA1 `aide`), et chez ceux qui l'ont déjà, à la relève suivante — le
   profil se met à jour tout seul (lot 4a). Le moteur tient la table et
   les messages (engine/aide.js) ; ici, rien ne s'y ajoute.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { AIDES, ORDRE_AIDES, normaliserAide, basculerAide } from '../engine/aide.js';
import { parcoursADecrocher } from '../engine/amis.js';
import { PARCOURS, normalizeParcours } from '../engine/parcours.js';
import { S, bus, saveProfile } from './state.js';
import { openSheet, ic, btn } from './dom.js';

/* la rangée n'existe que si quelqu'un peut la lire : un ami, ou un QR
   déjà donné — sans personne en face, une offre ne va nulle part */
export const aideVisible = () => !!(S.profile.amiId || (S.profile.amis || []).length);

export function aideRowHTML(){
  if (!aideVisible()) return '';
  const n = normaliserAide(S.profile.aide).length;
  return `<button class="rg-row rg-last moi-rg moi-aide" id="moiAide">
     <span class="rg-n">Je peux aider</span>
     <span class="rg-s" id="moiAideSt">${n || ''}</span>
     ${ic('chevron-right', 'ic-14')}
   </button>`;
}

/* les trois cases — une liste à cocher, l'état dans la case (§6) ;
   chaque tap s'enregistre tout de suite, comme un réglage */
export function casesAideHTML(aide){
  const a = normaliserAide(aide);
  return `<div class="pick-list" role="group" aria-label="Je peux aider">${ORDRE_AIDES.map(k =>
    `<button class="pick pk${a.includes(k) ? ' on' : ''}" data-aide="${k}" aria-pressed="${a.includes(k)}">
       ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
       <div class="pk-m"><b>${esc(AIDES[k].mot)}</b></div>
     </button>`).join('')}</div>`;
}
export function lierCasesAide(racine, valeur, changer){
  let a = normaliserAide(valeur);
  racine.querySelectorAll('[data-aide]').forEach(b => b.addEventListener('click', () => {
    a = basculerAide(a, b.dataset.aide);
    const on = a.includes(b.dataset.aide);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    changer(a);
  }));
}
const poserAide = a => { if (a.length) S.profile.aide = a; else delete S.profile.aide; };

export function ouvrirAide(){
  const sh = openSheet({ title: 'Je peux aider', icon: 'users', onClose: () => bus.refresh() });
  sh.body.innerHTML = casesAideHTML(S.profile.aide);
  lierCasesAide(sh.body, S.profile.aide, a => { poserAide(a); saveProfile(); });
  return sh;
}

/* ---------- « Décroché » : aider à son tour ----------
   Juste après le geste, une feuille, un but : aider ceux qui suivent.
   Deux choses, et seulement celles qui manquent — l'entreprise dans mon
   parcours (c'est elle qui fait lire « Karim y est en alternance » chez
   mes amis), et ce que je peux offrir. Rien ne s'écrit avant
   « Enregistrer » ; la croix ne fait rien. Rend `false` quand il n'y a
   rien à proposer : l'appelant dit alors « Décroché » d'un toast. */
export function ouvrirDecroche(c, apres){
  const entree = parcoursADecrocher(S.profile, c, todayISO().slice(0, 7));
  const offre = aideVisible();
  if (!entree && !offre) return false;
  let garder = !!entree;
  let quoi = entree ? entree.quoi : '';
  let aide = normaliserAide(S.profile.aide);
  const sh = openSheet({ title: 'Décroché', icon: 'flag', onClose: () => { if (apres) apres(); } });
  const ligneParcours = () => [PARCOURS[quoi] && PARCOURS[quoi].label, 'depuis ' + todayISO().slice(0, 4)].filter(Boolean).join(' · ');
  const rendre = () => {
    sh.body.innerHTML =
      `<div class="na-company">${esc(c.name)}</div>
       ${entree ? `<div class="pick-list">
           <button class="pick pk${garder ? ' on' : ''}" id="dcParcours" aria-pressed="${garder}">
             ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
             <div class="pk-m"><b>Ajouter ${esc(c.name)} à mon parcours</b>
               <span class="pk-s" id="dcQuoi">${esc(ligneParcours())}</span></div>
           </button></div>
         ${/* le mot que le profil ne dit pas se choisit ici, d'un tap —
              jamais deviné : une alternance dite « stage » chez un ami
              serait une information fausse */''}
         ${!entree.quoi ? `<div class="datechips dc-quoi" role="group" aria-label="Pour quoi">${Object.keys(PARCOURS).map(k =>
             `<button class="dchip${quoi === k ? ' on' : ''}" data-quoi="${k}" aria-pressed="${quoi === k}">${esc(PARCOURS[k].label)}</button>`).join('')}</div>` : ''}` : ''}
       ${offre ? `<h3 class="sm-h dc-h">Je peux aider</h3>${casesAideHTML(aide)}` : ''}`;
    sh.body.querySelector('#dcParcours')?.addEventListener('click', () => { garder = !garder; rendre(); sh.body.querySelector('#dcParcours').focus(); });
    sh.body.querySelectorAll('[data-quoi]').forEach(b => b.addEventListener('click', () => {
      quoi = b.dataset.quoi; garder = true; rendre(); sh.body.querySelector(`[data-quoi="${quoi}"]`).focus();
    }));
    lierCasesAide(sh.body, aide, a => { aide = a; });
  };
  rendre();
  sh.setFoot([btn('Enregistrer', 'btn-primary', () => {
    if (garder && entree && PARCOURS[quoi])
      S.profile.parcours = normalizeParcours([...(S.profile.parcours || []), { ...entree, quoi }]);
    if (offre) poserAide(aide);
    saveProfile();
    sh.close();
    bus.refresh();
  }, 'check')]);
  return true;
}

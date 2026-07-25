/* ============================================================
   OpenContact — interface · « Affiner » partagé (#8)
   Filtres + tri sur une seule surface, réutilisée partout où l'on
   choisit dans SA liste de pistes : « Mes pistes », Prospecter,
   Donner, partage en groupe. Chaque tap s'applique aussitôt, la
   croix referme.

   Deux façons de montrer ce qui est actif, selon le contexte
   (« adaptatif, pas responsive ») :
   · sur la PAGE « Mes pistes », des étiquettes sous la recherche —
     on y vit, un regard doit suffire (chipsRowHTML, ui/pistes.js) ;
   · dans une FEUILLE, un compte dans le bouton — on y est venu
     faire une chose, la place va à la liste.

   L'état est propre à chaque écran : filtrer dans Prospecter ne
   touche pas ce que montre « Mes pistes ».
   ============================================================ */
import { STATUSES, DOMAINS } from '../engine/model.js';
import { openSheet, ic } from './dom.js';
import { sortSectionHTML, bindSortSection, sortIsDefault } from './sort.js';

export const filterState = () => ({ status: '', domain: '' });
export const filterOn = ft => !!(ft.status || ft.domain);
export const filterClear = ft => { ft.status = ''; ft.domain = ''; };
export const filterArgs = ft => ({ status: ft.status, domain: ft.domain });
/* ce qui est actif, tri compris — le même compte que les étiquettes */
export const affineCount = (ft, st) =>
  (ft.status ? 1 : 0) + (ft.domain ? 1 : 0) + (st && !sortIsDefault(st) ? 1 : 0);

/* la feuille. `withStatus` : le tableau desktop segmente déjà par
   statut, inutile de le reproposer. */
export function openAffinerSheet(ft, st, o, onChange){
  o = o || {};
  const sh = openSheet({ title: 'Affiner', icon: 'filter' });
  const render = () => {
    const chips = (grp, defs, cur) => Object.keys(defs).map(k =>
      `<button class="fl-chip${cur === k ? ' on' : ''}" data-${grp}="${k}" aria-pressed="${cur === k}">
         <span class="dotc" style="background:${defs[k].color}"></span>${defs[k].label}</button>`).join('');
    sh.body.innerHTML =
      `${o.withStatus === false ? '' :
        `<div class="lbl-row"><label>Statut</label></div>
         <div class="fl-grid">${chips('st', STATUSES, ft.status)}</div>`}
       <div class="lbl-row"><label>Domaine</label></div>
       <div class="fl-grid">${chips('dom', DOMAINS, ft.domain)}</div>
       ${sortSectionHTML(st)}`;
    sh.body.querySelectorAll('[data-st]').forEach(b =>
      b.addEventListener('click', () => {
        ft.status = (ft.status === b.dataset.st) ? '' : b.dataset.st;
        onChange(); render();
      }));
    sh.body.querySelectorAll('[data-dom]').forEach(b =>
      b.addEventListener('click', () => {
        ft.domain = (ft.domain === b.dataset.dom) ? '' : b.dataset.dom;
        onChange(); render();
      }));
    bindSortSection(sh.body, st, () => { onChange(); render(); });
  };
  render();
  return sh;
}

/* le bouton des feuilles : l'entonnoir, et le compte de ce qui est
   actif — pas d'étiquettes, la place va à la liste */
export function affinerBtnHTML(ft, st){
  const n = affineCount(ft, st);
  const lbl = n ? `Affiner — ${n} actif${n > 1 ? 's' : ''}` : 'Affiner';
  return (
    `<button class="btn icon-btn${n ? ' sort-on af-btn' : ''}" data-affiner
             aria-label="${lbl}" title="${lbl}">${ic('filter', 'ic-14')}${
      n ? `<span class="af-n">${n}</span>` : ''}</button>`);
}
export function bindAffinerBtn(root, ft, st, o, onChange){
  root.querySelector('[data-affiner]')?.addEventListener('click', () =>
    openAffinerSheet(ft, st, o, onChange));
}

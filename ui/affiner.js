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
   statut, inutile de le reproposer. `o.pool()` rend la population que
   l'écran filtre — sans elle, la feuille reste exhaustive. */
export function openAffinerSheet(ft, st, o, onChange){
  o = o || {};
  const sh = openSheet({ title: 'Affiner', icon: 'filter' });
  const render = () => {
    const pool = typeof o.pool === 'function' ? (o.pool() || []) : null;
    const compte = (champ, k) => pool ? pool.filter(c => (c[champ] || 'autre') === k).length : null;
    /* Un filtre qui ne peut rien filtrer est un cul-de-sac : il coûte un
       tap et rend une liste vide. On montre donc le COMPTE, et on traite
       le zéro selon la nature de la liste.
       · Statut : trois crans, un cadre mental fixe — la puce reste, mais
         éteinte (savoir qu'on n'a aucune réponse est une information).
       · Domaine : dix étiquettes d'une taxinomie arbitraire — une case
         vide n'apprend rien, elle disparaît. */
    const chip = (grp, defs, cur, k, eteint) => {
      const n = compte(grp === 'st' ? 'status' : 'domain', k);
      return `<button class="fl-chip${cur === k ? ' on' : ''}${eteint ? ' fl-off' : ''}"
                 data-${grp}="${k}" aria-pressed="${cur === k}"${eteint ? ' disabled' : ''}>
         <span class="dotc" style="background:${defs[k].color}"></span>${defs[k].label}${
        n == null ? '' : `<span class="fl-n">${n}</span>`}</button>`;
    };
    const chipsSt = () => Object.keys(STATUSES)
      .map(k => chip('st', STATUSES, ft.status, k, pool && !compte('status', k))).join('');
    const chipsDom = () => Object.keys(DOMAINS)
      .filter(k => !pool || compte('domain', k) || ft.domain === k)
      .map(k => chip('dom', DOMAINS, ft.domain, k, false)).join('');
    sh.body.innerHTML =
      `${o.withStatus === false ? '' :
        `<div class="lbl-row"><label>Statut</label></div>
         <div class="fl-grid">${chipsSt()}</div>`}
       <div class="lbl-row"><label>Domaine</label></div>
       <div class="fl-grid">${chipsDom()}</div>
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
    openAffinerSheet(ft, st, o || {}, onChange));
}

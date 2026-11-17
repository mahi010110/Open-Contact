/* ============================================================
   OpenContact · la nouvelle interface · les petits outils
   (docs/refonte-reprendre.md §8)

   Ce que tous les écrans emploient : chercher dans la page, écrire du
   HTML sans danger, une icône, dire à voix haute ce qui vient de
   changer. Rien ici ne connaît un écran.
   ============================================================ */
import { esc } from '../engine/utils.js';
export { esc };

export const $ = (s, r) => (r || document).querySelector(s);
export const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* une icône pixelarticons : un masque, donc de la couleur du texte qui
   l'entoure, dans les deux thèmes */
export function ic(nom, cl){
  const u = `url(assets/icons/${nom}.svg)`;
  return `<span class="ic${cl ? ' ' + cl : ''}" style="-webkit-mask-image:${u};mask-image:${u}" aria-hidden="true"></span>`;
}

/* la forme qu'on compare : sans accents, sans casse, les mots seuls */
export const plat = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

export const calme = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
/* les initiales s'écrivent en lettres pixel, qui n'ont pas d'accents : « ÉC » devient « EC » */
export const initiales = n => String(n || '?').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/\s+/).filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();
export const prenomDe = n => String(n || '').trim().split(/\s+/)[0] || '';
/* « 3 » et « km » ne se séparent jamais d'un rang à l'autre */
export const km = d => d == null ? '' : (d < 1 ? '< 1 km' : Math.round(d) + ' km');
/* « Plus de 2 000 salariés » se lit en fin de ligne : « plus de … » */
export const minuscule = s => s ? s[0].toLowerCase() + s.slice(1) : '';

/* Dire ce qui a changé sans qu'on regarde : une phrase dans la région
   vivante de la page. Les appels se regroupent sur 60 ms et la dernière
   gagne ; la région repasse par le vide, sinon la même phrase n'est pas
   relue. La région vit dans la page AVANT qu'on écrive dedans. */
let aT = null, aDire = '';
export function annoncer(msg){
  aDire = String(msg || '');
  if (aT) return;
  aT = setTimeout(() => {
    aT = null;
    const n = document.getElementById('annonce');
    if (!n) return;
    n.textContent = '';
    requestAnimationFrame(() => { n.textContent = aDire; });
  }, 60);
}

/* Remplacer le contenu d'une zone SANS perdre la main : le défilement
   de la zone et de ce qui défile dedans, et le focus s'il y était — sur
   l'élément qui a pris la place de l'ancien (même geste, même objet),
   sinon sur la zone elle-même. Un focus qui tombe sur le document
   renvoie un lecteur d'écran en haut de la page (WCAG 2.4.3). */
const cleFocus = el => el && el.getAttribute && (el.getAttribute('data-k')
  || (el.getAttribute('data-a') ? el.getAttribute('data-a') + '|' + (el.getAttribute('data-id') || '') + '|' + (el.getAttribute('data-v') || '') : '')
  || (/^(INPUT|TEXTAREA)$/.test(el.tagName) && typeof el.className === 'string' ? el.tagName + '.' + el.className + '|' + (el.getAttribute('data-id') || '') : ''));
export function remplacer(zone, html){
  if (!zone) return;
  const actif = document.activeElement;
  const dedans = actif && actif !== zone && zone.contains(actif);
  const k = dedans ? cleFocus(actif) : '';
  /* un champ où l'on tape garde son curseur et ce qu'il montrait */
  const champ = dedans && /^(INPUT|TEXTAREA)$/.test(actif.tagName)
    ? { d: actif.selectionStart, f: actif.selectionEnd, y: actif.scrollTop } : null;
  const defile = [zone, ...$$('.defile', zone)].map(d => [d.className, d.scrollTop]);
  zone.innerHTML = html;
  const nouv = [zone, ...$$('.defile', zone)];
  defile.forEach(([cl, y], i) => { const d = nouv[i]; if (d && d.className === cl && y) d.scrollTop = y; });
  if (dedans){
    const cible = k ? $$('[data-k],[data-a],input,textarea', zone).find(x => cleFocus(x) === k) : null;
    if (cible){
      cible.focus({ preventScroll: true });
      if (champ){ try { cible.setSelectionRange(champ.d, champ.f); } catch (e) {} cible.scrollTop = champ.y; }
    }
    else if (!zone.contains(document.activeElement)){
      if (!zone.hasAttribute('tabindex')) zone.setAttribute('tabindex', '-1');
      zone.focus({ preventScroll: true });
    }
  }
}

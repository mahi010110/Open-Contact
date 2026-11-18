/* ============================================================
   OpenContact · la nouvelle interface · les visages en pixels
   (recopié de ui/visage.js : la nouvelle interface n'importe rien de ui/)

   Un `<i>`, pas un `<span>` : les règles des lignes (`.rang span`) ne
   le touchent pas, il garde sa taille et sa teinte.
   Le motif vient du moteur (engine/visage.js) : tiré de l'identifiant,
   le même partout, chez tout le monde, rien à régler. Ici seulement son
   dessin, dans une des six teintes de l'app, les bords nets. Décoratif
   pour un lecteur d'écran : la ligne dit déjà le nom.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { visage, initiales } from '../engine/visage.js';

export const TEINTES_VZ = ['vz-0', 'vz-1', 'vz-2', 'vz-3', 'vz-4', 'vz-5'];
/* une personne : son identifiant d'ami, à défaut son nom */
export function visageHTML(graine, cls = ''){
  const v = visage(graine);
  return `<i class="vz ${TEINTES_VZ[v.teinte]}${cls ? ' ' + cls : ''}" aria-hidden="true"><svg viewBox="0 0 7 7" focusable="false"><path d="${
    v.cases.map(([x, y]) => `M${x + 1} ${y + 1}h1v1h-1z`).join('')}"/></svg></i>`;
}
/* un groupe : ses initiales en lettres pixel, sur le gris du châssis */
export function blasonHTML(nom, cls = ''){
  return `<i class="vz vz-g${cls ? ' ' + cls : ''}" aria-hidden="true">${esc(initiales(nom))}</i>`;
}

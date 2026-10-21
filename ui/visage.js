/* ============================================================
   OpenContact — interface · les visages en pixels
   (décision du mainteneur, 13 octobre 2026 : « partout »)

   Le motif vient du moteur (engine/visage.js) ; ici, seulement son
   dessin : un carré de la hauteur d'une ligne, les cases dans une des six
   teintes de l'app (jamais une couleur en dur, §4), les bords nets
   (`crispEdges`) — un pixel reste un pixel, à toutes les tailles.

   Le visage est DÉCORATIF pour un lecteur d'écran : la ligne dit déjà le
   nom, et le redire avant chaque nom ne ferait que l'allonger.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { visage, initiales } from '../engine/visage.js';

/* les six teintes, nommées une à une : une classe fabriquée à la volée
   (`vz-${n}`) ne se lit dans aucun relevé, et son style passerait pour
   mort (e2e-sobriete.mjs) */
const TEINTES = ['vz-0', 'vz-1', 'vz-2', 'vz-3', 'vz-4', 'vz-5'];

/* une personne : son identifiant d'ami (le même partout), à défaut son nom */
export function visageHTML(graine, cls = ''){
  const v = visage(graine);
  /* UN tracé pour toutes les cases, pas un `<rect>` par case : le même
     dessin, mais un nœud au lieu d'une vingtaine — un groupe de 640
     messages en portait 13 000 de trop (relevé à grande échelle) */
  return `<span class="vz ${TEINTES[v.teinte]}${cls ? ' ' + cls : ''}" aria-hidden="true"><svg viewBox="0 0 7 7" focusable="false"><path d="${
    v.cases.map(([x, y]) => `M${x + 1} ${y + 1}h1v1h-1z`).join('')}"/></svg></span>`;
}
/* un groupe : ses initiales en lettres pixel, sur le gris du chrome —
   un groupe ne se confond jamais avec une personne. Pas le bleu de la
   maquette : le navy appartient au CHÂSSIS (§4), et un groupe est du
   contenu. */
export function blasonHTML(nom, cls = ''){
  return `<span class="vz vz-g${cls ? ' ' + cls : ''}" aria-hidden="true">${esc(initiales(nom))}</span>`;
}

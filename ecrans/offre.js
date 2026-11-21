/* ============================================================
   OpenContact · la nouvelle interface · une offre, à l'écran
   (docs/brief-refonte.md, lot 6)

   Ce que l'app a lu d'une offre collée (engine/offre.js) : le poste, le
   contrat, le rythme, le dernier jour, les missions — et, sur la piste,
   tout le texte, replié. Le même dessin dans Trouver (l'offre qui attend)
   et sur la page d'une piste (l'offre gardée).
   ============================================================ */
import { ic, esc } from './outils.js';
import { contratDit } from '../engine/offre.js';
import { jourEnLettres } from '../engine/suite.js';

export function offreHTML(o, tout){
  if (!o) return '';
  const f = [['Contrat', contratDit(o)]];
  if (o.rythme) f.push(['Rythme', o.rythme]);
  if (o.avant) f.push(['Jusqu’au', jourEnLettres(o.avant)]);
  return `<p class="o-p">${esc(o.poste || 'Offre collée')}</p>`
    + `<dl class="faits">${f.filter(x => x[1]).map(([t, v]) => `<div><dt>${t}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
    + ((o.missions || []).length ? `<div class="et o-et">Les missions</div><ul class="o-miss">${o.missions.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '')
    + (tout && o.texte ? `<details class="o-t" data-p="o-t"><summary>Tout le texte${ic('chevron-right')}</summary><p>${esc(o.texte)}</p></details>` : '');
}
/* dans le premier message : ce que l'offre demande, pour écrire l'accroche */
export const offreSavoirHTML = o => o && (o.missions || []).length
  ? `<div class="savoir"><span class="et">Dans l’offre</span><ul class="o-miss">${o.missions.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : '';

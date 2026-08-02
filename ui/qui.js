/* ============================================================
   OpenContact — interface · « → qui » (#1, #2)
   Un seul mécanisme partout où l'on vise des personnes : la ligne
   sous la piste cochée, et la sous-feuille à cocher qu'elle ouvre.
   Deux verbes, deux filtres — écrire exige un email (on ne peut pas
   écrire sans), donner n'exige rien (un numéro se partage très
   bien) — mais la même grammaire : chaque tap bascule, la croix
   referme, aucune validation ajoutée.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { openSheet, ic } from './dom.js';

export const whoName = t => t.name || t.email || t.phone || 'sans nom';

/* les personnes qu'un verbe peut viser */
export const whoCandidates = (c, verbe) =>
  (c.contacts || []).filter(t => verbe === 'ecrire' ? !!t.email : true);

/* Le libellé — une règle, quatre cas. Le compte n'apparaît QUE
   lorsqu'il signale quelque chose (Décision 11) ; tant qu'une seule
   personne est retenue, c'est son nom qui parle — un envoi part vers
   quelqu'un de nommé, jamais vers un chiffre (Décision 17). */
export function whoLabel(cts, keep){
  const n = cts.length;
  if (!n) return null;
  const gardes = cts.filter(t => keep.has(t.id));
  if (gardes.length === 1) return whoName(gardes[0]);
  if (gardes.length === n) return whoName(gardes[0]) + ' +' + (n - 1);
  return gardes.length + ' sur ' + n;
}

/* La ligne posée sous la piste. `verbe` : 'ecrire' | 'donner'.
   Sans personne joignable, écrire propose d'en ajouter une (N6) ;
   donner se tait — une fiche sans contact se partage quand même. */
export function whoLineHTML(c, keep, verbe){
  const cts = whoCandidates(c, verbe);
  if (!cts.length)
    return verbe === 'ecrire'
      ? `<button class="pk-who pk-add" data-addct="${esc(c.id)}">${ic('plus', 'ic-14')} ajoute quelqu’un</button>`
      : '';
  const lab = whoLabel(cts, keep);
  return `<button class="pk-who" data-who="${esc(c.id)}"${cts.length > 1 ? '' : ' disabled'}
                  aria-label="Personnes visées chez ${esc(c.name)}">
            → ${esc(lab)}${cts.length > 1 ? ' ▾' : ''}
          </button>`;
}

/* La sous-feuille : une question, des cases, rien à valider.
   `keep` est modifié en place ; `onChange` prévient l'écran appelant
   à chaque bascule pour qu'il redessine sa ligne. */
export function openWhoPicker(c, keep, o){
  o = o || {};
  const verbe = o.verbe || 'donner';
  const cts = whoCandidates(c, verbe);
  const sh = openSheet({
    title: (verbe === 'ecrire' ? 'Qui, chez ' : 'Qui part, chez ') + c.name + ' ?',
    icon: 'contact'
  });
  const render = () => {
    sh.body.innerHTML =
      `<div class="pick-list pk-inverse">
         ${cts.map(t =>
           `<button class="pick pk${keep.has(t.id) ? ' on' : ''}" data-ct="${esc(t.id)}" aria-pressed="${keep.has(t.id)}">
              ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
              <div class="pk-m"><b>${esc(whoName(t))}</b>
                <span>${esc([t.role, t.email || t.phone].filter(Boolean).join(' · ')) || '—'}</span></div>
            </button>`).join('')}
         ${o.onAdd ? `<button class="pick" data-addct><b>${ic('plus', 'ic-14')} Ajouter quelqu’un</b></button>` : ''}
       </div>`;
    sh.body.querySelectorAll('[data-ct]').forEach(b =>
      b.addEventListener('click', () => {
        const id = b.dataset.ct;
        keep.has(id) ? keep.delete(id) : keep.add(id);
        b.classList.toggle('on', keep.has(id));
        b.setAttribute('aria-pressed', keep.has(id));
        if (o.onChange) o.onChange(keep);
      }));
    sh.body.querySelector('[data-addct]')?.addEventListener('click', () => {
      sh.close();
      o.onAdd();
    });
  };
  render();
  return sh;
}

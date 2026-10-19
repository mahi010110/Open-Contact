/* ============================================================
   OpenContact — interface · un fil de messages s'ouvre là où l'on
   s'était arrêté
   (décision du mainteneur, 13 octobre 2026 : « faire exactement comme
   les messageries traditionnelles »)

   Un groupe s'ouvrait tout en bas. Avec douze messages arrivés depuis
   hier, on atterrissait sur le dernier, et il fallait remonter sans
   savoir jusqu'où. Slack et Discord font autrement, et c'est la
   convention : une LIGNE avant le premier message neuf (« 3 nouveaux »),
   la conversation ouverte sur cette ligne, et — tant qu'il reste du neuf
   plus bas que l'écran — un bouton « ↓ 3 nouveaux » qui y descend. Il
   part de lui-même une fois en bas.

   Les deux fils (groupe, ami) marquent ce qui est neuf `fil-neuf` et
   posent la ligne avec `ligneNouveaux` ; ce fichier fait le reste.
   ============================================================ */
import { ic } from './dom.js';
import { esc } from '../engine/utils.js';
import { decouperLiens } from '../engine/liens.js';
import { jourFil } from './dates.js';

const dit = n => `${n} nouveau${n > 1 ? 'x' : ''}`;
/* la ligne : un séparateur, pas un message — elle se lit, elle ne se tape pas */
export const ligneNouveaux = n => `<li class="fil-nouv" role="separator" aria-label="${dit(n)}"><span>${dit(n)}</span></li>`;

/* LE JOUR, UNE FOIS (lot F2) : une ligne avant le premier message de
   chaque jour — elle se lit, elle ne se tape pas */
export const ligneJour = t => `<li class="fil-jour" role="separator" aria-label="${esc(jourFil(t))}"><span>${esc(jourFil(t))}</span></li>`;

/* LE TEXTE D'UN MESSAGE. Les liens se tapent (engine/liens.js dit
   lesquels, et ce qu'ils affichent) et ne s'ouvrent que sur un tap :
   aucun aperçu, aucune requête au moment de lire. `noreferrer` : la page
   ouverte ne sait pas d'où l'on vient. « @Karim » se marque quand Karim
   est du groupe — la même règle que `citesDe` (un mot entier, qui
   commence par l'arobase). Tout le reste est échappé. */
const plie = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const MENTION = /@[\p{L}\p{N}'’-]+/gu;
function marquer(v, prenoms){
  if (!prenoms.length || !v.includes('@')) return esc(v);
  const connus = new Set(prenoms.map(plie));
  let out = '', i = 0;
  for (const m of v.matchAll(MENTION)){
    if (m.index > 0 && /[\p{L}\p{N}]/u.test(v[m.index - 1])) continue;
    let nom = m[0].slice(1);
    while (nom && !connus.has(plie(nom)) && /['’-]$/.test(nom)) nom = nom.slice(0, -1);
    if (!connus.has(plie(nom))) continue;
    out += esc(v.slice(i, m.index)) + `<b class="gr-cite">@${esc(nom)}</b>`;
    i = m.index + 1 + nom.length;
  }
  return out + esc(v.slice(i));
}
export function texteHTML(texte, prenoms = []){
  return decouperLiens(texte).map(x => x.t === 'lien'
    ? `<a class="lien-msg" href="${esc(x.href)}" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">${esc(x.v)}</a>`
    : marquer(x.v, prenoms)).join('');
}

export function suivreNouveaux(body){
  const reduit = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  let bouton = null;
  const enBas = () => body.scrollHeight - body.scrollTop - body.clientHeight < 40;
  /* ce qui est neuf ET encore sous le bord bas de la zone visible */
  const sousLeBord = () => {
    const bord = body.getBoundingClientRect().bottom;
    return [...body.querySelectorAll('.fil-neuf')].filter(n => n.getBoundingClientRect().top > bord - 8).length;
  };
  const maj = () => {
    const n = enBas() ? 0 : sousLeBord();
    if (!n){ if (bouton){ bouton.remove(); bouton = null; } return; }
    if (!bouton || !bouton.isConnected){
      bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'fil-bas';
      bouton.addEventListener('click', () => {
        body.scrollTo({ top: body.scrollHeight, behavior: reduit() ? 'auto' : 'smooth' });
      });
      body.append(bouton);
    }
    bouton.innerHTML = `${ic('arrow-down', 'ic-14')} ${dit(n)}`;
  };
  body.addEventListener('scroll', () => requestAnimationFrame(maj), { passive: true });
  return {
    maj,
    /* l'ouverture : sur la ligne « N nouveaux » s'il y en a une — un peu
       au-dessus, pour qu'on lise d'où l'on vient —, au bas sinon */
    ouvrir(){
      const ligne = body.querySelector('.fil-nouv');
      if (ligne) body.scrollTop = Math.max(0, ligne.getBoundingClientRect().top - body.getBoundingClientRect().top
        + body.scrollTop - body.clientHeight * 0.25);
      else body.scrollTop = body.scrollHeight;
      maj();
    }
  };
}

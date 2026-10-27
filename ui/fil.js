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
import { ic, avantImage } from './dom.js';
import { esc } from '../engine/utils.js';
import { decouperLiens } from '../engine/liens.js';
import { jourFil } from './dates.js';

const dit = n => `${n} nouveau${n > 1 ? 'x' : ''}`;
/* la ligne : un séparateur, pas un message — elle se lit, elle ne se tape pas */
export const ligneNouveaux = n => `<li class="fil-nouv" role="separator" aria-label="${dit(n)}"><span>${dit(n)}</span></li>`;

/* LA FENÊTRE (relevé à grande échelle, octobre 2026). Un groupe de
   classe garde sept jours de messages : 640 bulles rendues d'un coup
   figeaient un téléphone moyen quatorze secondes. Toutes les
   messageries chargent par morceaux ; ici, on rend les 60 derniers
   messages — ou, si ce qu'on n'a pas lu remonte plus haut, depuis un peu
   avant le premier non-lu, 120 au plus — et « Voir les N messages
   d'avant » ouvre le morceau suivant, là où l'on lit (Baymard : un
   bouton plutôt qu'un défilement sans fin). `ancre` garde le premier
   message rendu d'un rendu à l'autre : ce qui arrive ne fait pas
   glisser la fenêtre sous les yeux. */
export const FENETRE = 60, FENETRE_MAX = 120, PAS_AVANT = 60;
export function debutFenetre(fil, neuf, ancre = ''){
  if (ancre){ const i = fil.findIndex(x => x.id === ancre); if (i >= 0) return i; }
  const n = fil.length;
  let d = Math.max(0, n - FENETRE);
  const p = fil.findIndex(neuf);
  if (p >= 0 && p - 10 < d) d = Math.max(0, p - 10, n - FENETRE_MAX);
  return d;
}
export const ligneAvant = n => n > 0
  ? `<li class="fil-avant"><button type="button" class="linklike" data-avant>Voir les ${n} message${n > 1 ? 's' : ''} d’avant</button></li>` : '';
/* le morceau d'avant, sans rien déplacer sous les yeux : la distance au
   bas de la zone reste la même */
export function ouvrirAvant(body, fen, fil, rendre){
  fen.ancre = (fil[Math.max(0, fen.debut - PAS_AVANT)] || {}).id || '';
  const bas = body.scrollHeight - body.scrollTop;
  rendre();
  body.scrollTop = body.scrollHeight - bas;
}

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
  const compter = () => enBas() ? 0 : sousLeBord();
  const montrer = n => {
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
  const maj = () => montrer(compter());
  /* au défilement, la relecture se range avec les autres, à l'image
     (ui/dom.js, `avantImage`) : poser la conversation sur ses nouveaux
     messages défile, et ce défilement relisait la page une fois de plus
     dans la toute première image (porte « Performance ») */
  let prevu = false;
  body.addEventListener('scroll', () => {
    if (prevu) return;
    prevu = true;
    avantImage({ lire: () => { prevu = false; return compter(); }, ecrire: montrer });
  }, { passive: true });
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

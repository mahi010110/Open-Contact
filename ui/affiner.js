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
import { esc } from '../engine/utils.js';
import { STATUSES, DOMAINS } from '../engine/model.js';
import { openSheet, ic, clavier, annoncer } from './dom.js';
import { sortSectionHTML, bindSortSection, sortIsDefault } from './sort.js';

/* PLUSIEURS VALEURS PAR FAMILLE. Un seul domaine à la fois obligeait à
   choisir entre « cyber » et « cloud » alors qu'on cherche les deux, et
   taper la seconde éteignait la première sans prévenir. L'ajout ne coûte
   AUCUN contrôle de plus à l'écran : les puces sont déjà là, c'est ce
   qui se passe au deuxième tap qui change. */
export const filterState = () => ({ status: [], domain: [] });
export const filterOn = ft => !!(ft.status.length || ft.domain.length);
export const filterClear = ft => { ft.status = []; ft.domain = []; };
export const filterArgs = ft => ({ status: ft.status, domain: ft.domain });
/* ce qui est actif, tri compris — le même compte que les étiquettes */
export const affineCount = (ft, st) =>
  ft.status.length + ft.domain.length + (st && !sortIsDefault(st) ? 1 : 0);
const bascule = (arr, k) => {
  const i = arr.indexOf(k);
  if (i < 0) arr.push(k); else arr.splice(i, 1);
};

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
    const chip = (grp, defs, sel, k, eteint) => {
      const on = sel.includes(k);
      const n = compte(grp === 'st' ? 'status' : 'domain', k);
      /* une puce COCHÉE ne se désactive jamais, même à zéro : c'est le
         seul moyen de la décocher */
      const mort = eteint && !on;
      return `<button class="fl-chip${on ? ' on' : ''}${mort ? ' fl-off' : ''}"
                 data-${grp}="${k}" aria-pressed="${on}"${mort ? ' disabled' : ''}>
         <span class="dotc" style="background:${defs[k].color}"></span>${defs[k].label}${
        n == null ? '' : `<span class="fl-n">${n}</span>`}</button>`;
    };
    const chipsSt = () => Object.keys(STATUSES)
      .map(k => chip('st', STATUSES, ft.status, k, pool && !compte('status', k))).join('');
    const chipsDom = () => Object.keys(DOMAINS)
      .filter(k => !pool || compte('domain', k) || ft.domain.includes(k))
      .map(k => chip('dom', DOMAINS, ft.domain, k, false)).join('');
    const dom = chipsDom();
    sh.body.innerHTML =
      `${o.withStatus === false ? '' :
        `<div class="lbl-row"><label>Statut</label></div>
         <div class="fl-grid">${chipsSt()}</div>`}
       ${/* aucun domaine à proposer (liste vide) : pas de titre orphelin
            au-dessus du néant — le tri, lui, reste utile */''}
       ${dom ? `<div class="lbl-row"><label>Domaine</label></div>
                <div class="fl-grid">${dom}</div>` : ''}
       ${sortSectionHTML(st)}`;
    sh.body.querySelectorAll('[data-st]').forEach(b =>
      b.addEventListener('click', () => { bascule(ft.status, b.dataset.st); onChange(); render(); }));
    sh.body.querySelectorAll('[data-dom]').forEach(b =>
      b.addEventListener('click', () => { bascule(ft.domain, b.dataset.dom); onChange(); render(); }));
    bindSortSection(sh.body, st, () => { onChange(); render(); });
  };
  render();
  return sh;
}

/* le bouton des feuilles : l'entonnoir, et le compte de ce qui est
   actif — pas d'étiquettes, la place va à la liste */
/* Le même contrôle a deux poids, selon l'endroit. Sur la PAGE « Mes
   pistes » il est un bouton posé à côté de la recherche : il tient sa
   place dans une barre d'outils. Dans une FEUILLE de sélection il
   surplombait la liste en boîte biseautée de 44 px pour un glyphe de
   14 — un cadre presque vide, plus lourd que les lignes qu'il commande.
   Il y prend donc le poids de son voisin (« Tout »), et ne redevient un
   objet encadré que lorsqu'il filtre vraiment : l'encre va à ce qui
   change, pas à ce qui est toujours là. */
export function affinerBtnHTML(ft, st, o){
  const n = affineCount(ft, st);
  const lbl = n ? `Affiner — ${n} actif${n > 1 ? 's' : ''}` : 'Affiner';
  /* `seg` : à l'intérieur de la barre d'une liste, où le bouton n'a plus
     sa propre boîte — c'est la barre entière qui en est une */
  /* Dans la barre, l'entonnoir n'a pas sa pastille : il PREND L'ACCENT
     dès qu'un filtre est actif, et c'est déjà le signal. Le nombre de
     critères se lit dans la feuille qui les porte, en un tap — le
     savoir d'avance ne change aucune décision, et deux chiffres dans
     une rangée de trois segments, c'est du bruit qui bouge. */
  if (o && o.seg)
    return (
      `<button class="lb-seg${n ? ' on' : ''}" data-affiner
               aria-label="${lbl}" title="${lbl}">${ic('filter', 'ic-14')}</button>`);
  if (o && o.leger)
    return (
      `<button class="lb-act${n ? ' on' : ''}" data-affiner
               aria-label="${lbl}" title="${lbl}">${ic('filter', 'ic-14')}<span>Affiner</span>${
        n ? `<span class="af-n">${n}</span>` : ''}</button>`);
  return (
    `<button class="btn icon-btn${n ? ' sort-on af-btn' : ''}" data-affiner
             aria-label="${lbl}" title="${lbl}">${ic('filter', 'ic-14')}${
      n ? `<span class="af-n">${n}</span>` : ''}</button>`);
}
export function bindAffinerBtn(root, ft, st, o, onChange){
  root.querySelector('[data-affiner]')?.addEventListener('click', () =>
    openAffinerSheet(ft, st, o || {}, onChange));
}

/* ============================================================
   LA BARRE D'UNE LISTE À COCHER — une rangée, et une seule.

   Trois feuilles choisissent des pistes dans la même liste — Donner,
   Prospecter, partage en groupe — et chacune portait sa propre barre :
   le pli existait dans deux, la barre collante dans deux, mais jamais
   les mêmes deux. Elle est ici, une fois, pour qu'elles ne divergent
   plus.

   UNE RANGÉE, et elle REMPLACE les deux d'avant — le compte et son pli
   au-dessus, « Tout » et « Affiner » en dessous. Au-dessus d'une liste,
   sur un téléphone, la hauteur est ce qui coûte le plus cher : ajouter
   la recherche en ajoutant une rangée aurait rendu d'une main ce qu'elle
   prend de l'autre. Ici la recherche arrive ET une rangée s'en va.

   La case en tête se passe du mot « Tout » : elle est dans l'axe des
   cases de la liste, c'est-à-dire la position universelle du « tout
   cocher ». Son compte lui tient lieu d'étiquette — et un compte est
   une DONNÉE, ce que la règle de sobriété (§6) garde toujours.

   `flex-wrap` : à texte doublé, quatre commandes ne tiennent plus sur
   324 px. Elles passent à la ligne plutôt que d'être coupées
   (WCAG 1.4.10, redistribution) — une rangée à taille normale, deux à
   200 %, et rien ne disparaît.

   Ce que la barre ne fait PAS : expliquer pourquoi une ligne est là
   (`searchHint`). Sur la page « Mes pistes » l'extrait a sa place, on y
   vit ; dans une feuille on est venu cocher, et une ligne d'explication
   par piste rendrait à la liste la hauteur qu'on vient de lui gagner.
   La sous-ligne dit déjà statut · ville · qui.
   ============================================================ */
export function barreListeHTML(o){
  return (
    `<div class="stick-guet" aria-hidden="true"></div>
     <div class="listbar lb-cmd">
       <div class="lb-box">
         <button class="lb-seg lb-all" data-tout aria-pressed="${!!o.tout}"
                 aria-label="${o.tout ? 'Ne rien garder' : 'Tout garder'} — ${o.n | 0} piste${(o.n | 0) > 1 ? 's' : ''} sur ${o.total | 0}">
           ${ic(o.tout ? 'checkbox-on' : 'checkbox', 'ic-20')}
         </button>
         <div class="lb-find">
           <span class="ic ic-14 srch-i" aria-hidden="true"></span>
           <input class="lb-q" data-q type="search" value="${esc(o.q || '')}"
                  placeholder="Chercher une piste…" aria-label="Chercher une piste" ${clavier('cherche')}>
         </div>
         ${affinerBtnHTML(o.ft, o.st, { seg: true })}
       </div>
     </div>`);
}

export function majTout(zone, o){
  const b = zone.querySelector('[data-tout]');
  if (!b) return;
  const n = o.n | 0;
  b.setAttribute('aria-pressed', !!o.tout);
  b.setAttribute('aria-label',
    `${o.tout ? 'Ne rien garder' : 'Tout garder'} — ${n} piste${n > 1 ? 's' : ''} sur ${o.total | 0}`);
  /* PAS DE CHIFFRE DANS LA BARRE. La case dit déjà ce qu'elle a à dire :
     pleine = tout, vide = pas tout. Le nombre à côté ne faisait que
     répéter la case, et il le faisait mal — il changeait de largeur à
     chaque tap, donc la barre bougeait sous le doigt. Ce qui a besoin
     d'être compté l'est là où l'on décide : le pied de la feuille, à
     côté de l'action. Le compte reste dans `aria-label`, parce que
     quelqu'un qui n'a pas l'écran n'a pas la case non plus. */
  b.innerHTML = ic(o.tout ? 'checkbox-on' : 'checkbox', 'ic-20');
}

/* Le champ NE DOIT PAS être re-rendu à la frappe — sinon le curseur
   saute et le clavier se referme au doigt. La barre se pose donc une
   fois, et `onQ` ne redessine que les LIGNES. C'est la même séparation
   que « Mes pistes » (la recherche y reste le même nœud). */
export function bindBarreListe(zone, o){
  const inp = zone.querySelector('[data-q]');
  let h = null;
  inp?.addEventListener('input', () => {
    clearTimeout(h);
    h = setTimeout(() => o.onQ(inp.value), 180);
  });
  /* Échap vide, puis rend le clavier — deux temps, comme « Mes pistes » */
  inp?.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();          /* sinon la feuille se ferme sous les doigts */
    if (!inp.value){ inp.blur(); return; }
    clearTimeout(h);
    inp.value = '';
    o.onQ('');
  });
  /* délégation : « Tout » vit dans les lignes, qui se re-rendent à chaque
     frappe — un écouteur posé sur le nœud partirait avec lui */
  zone.addEventListener('click', e => { if (e.target.closest('[data-tout]')) o.onTout(); });
  zone.querySelector('[data-pli]')?.addEventListener('click', o.onPli);
  bindAffinerBtn(zone, o.ft, o.st, { pool: o.pool }, o.onAffine);
}

/* Ce qui reste après une recherche se DIT : quelqu'un qui n'a pas
   l'écran tape trois lettres et n'apprend jamais combien de pistes
   restent (WCAG 4.1.3). Le vide se dit aussi, et il nomme ce qu'on a
   cherché — « aucun résultat » tout court laisse croire à une panne. */
export function direCombien(k, q){
  if (!q) return;
  annoncer(k ? `${k} piste${k > 1 ? 's' : ''} trouvée${k > 1 ? 's' : ''}`
             : 'Aucune piste pour « ' + q + ' »');
}
/* Le vide ne REDIT pas ce qu'on a cherché : le mot tapé est dans le
   champ, deux centimètres au-dessus. C'est la règle des toasts appliquée
   à un état vide — ne rien dire qui soit déjà à l'écran. Il le redit en
   revanche à VOIX HAUTE (`direCombien`), parce que là il n'y a pas de
   champ à regarder. */
export const rienTrouveHTML = () =>
  `<p class="hint" style="text-align:center;margin:14px 0">${ic('search', 'ic-14')} Aucune piste ne correspond.</p>`;

/* ============================================================
   OpenContact — interface · tri partagé (#8)
   La même grammaire partout : une liste courte de critères — taper
   un critère le choisit et s'applique aussitôt ; re-taper le
   critère actif inverse SON sens (le sens vit dans le critère,
   plus de bouton de sens séparé — N1/N2/N3). Un seul critère à la
   fois : le « puis par » multi-niveaux a été retiré de l'écran.
   « Mes pistes » intègre cette section dans sa feuille « Affiner » ;
   Prospecter et Donner gardent un bouton « Trier » qui ouvre la
   même section seule. L'état actif s'affiche en puce retirable
   (sortChipHTML) : taper la puce inverse le sens, ✕ revient au
   défaut de l'écran. Le moteur (filter.js) reste seul juge.
   ============================================================ */
import { NATURAL_DIR } from '../engine/filter.js';
import { openSheet, toast, ic } from './dom.js';

export const SORT_LABELS = {
  recent: 'Récentes',
  action: 'À faire',
  status: 'Statut',
  score:  'Complètes',
  az:     'A → Z',
  dist:   'Près de moi'
};

/* l'état d'un écran : pile de niveaux [{sort, dir}] ('' = sens naturel),
   position (pour « Près de moi ») et critère par défaut */
export function sortState(def){
  return { levels: [{ sort: def, dir: '' }], userPos: null, def };
}
/* les arguments de tri pour filterCompanies */
export const sortArgs = st => ({ sorts: st.levels, userPos: st.userPos });
export const sortHasDist = st => st.levels.some(l => l.sort === 'dist');
const effDir = l => l.dir || NATURAL_DIR[l.sort] || 'desc';
export const sortIsDefault = st =>
  st.levels.length === 1 && st.levels[0].sort === st.def && !st.levels[0].dir;
/* inverse le sens d'un niveau (stocké '' quand il retombe sur le naturel) */
function flipDir(l){
  const next = effDir(l) === 'asc' ? 'desc' : 'asc';
  l.dir = (next === (NATURAL_DIR[l.sort] || 'desc')) ? '' : next;
}

/* demande la position puis applique — « Près de moi » seulement */
function withPos(st, apply){
  if (st.userPos){ apply(); return; }
  if (!navigator.geolocation){ toast('Pas de géolocalisation sur ce navigateur.'); return; }
  navigator.geolocation.getCurrentPosition(
    p => { st.userPos = { lat: p.coords.latitude, lng: p.coords.longitude }; apply(); },
    () => toast('Position indisponible — tri par proximité impossible.'),
    { timeout: 8000, maximumAge: 300000 }
  );
}

/* ---------- la section « Trier » (réutilisée par « Affiner ») ---------- */
export function sortSectionHTML(st){
  const main = st.levels[0];
  return (
    `<div class="lbl-row"><label>Trier</label>
       ${sortIsDefault(st) ? '' : `<button class="linklike" data-sort-reset>Revenir à « ${SORT_LABELS[st.def]} »</button>`}
     </div>
     <div class="fl-grid">
       ${Object.keys(SORT_LABELS).map(k =>
         `<button class="fl-chip${main.sort === k ? ' on' : ''}" data-sort-set="${k}"
                  aria-pressed="${main.sort === k}"
                  aria-label="${SORT_LABELS[k]}${main.sort === k ? ' — re-taper pour inverser le sens' : ''}">
            ${SORT_LABELS[k]}${main.sort === k ? ` <span class="srt-dir">${effDir(main) === 'asc' ? '↑' : '↓'}</span>` : ''}
          </button>`).join('')}
     </div>`);
}
export function bindSortSection(box, st, apply){
  box.querySelectorAll('[data-sort-set]').forEach(b =>
    b.addEventListener('click', () => {
      const k = b.dataset.sortSet;
      if (st.levels[0].sort === k){ flipDir(st.levels[0]); apply(); return; }
      const go = () => {
        st.levels = [{ sort: k, dir: '' }, ...st.levels.slice(1).filter(l => l.sort !== k)];
        apply();
      };
      if (k === 'dist') withPos(st, go);
      else go();
    }));
  box.querySelector('[data-sort-reset]')?.addEventListener('click', () => {
    st.levels = [{ sort: st.def, dir: '' }];
    apply();
  });
}

/* ---------- le bouton « Trier » (Prospecter, Donner) ---------- */
export function sortBarHTML(st){
  const on = !sortIsDefault(st);
  const names = st.levels.map(l => SORT_LABELS[l.sort]).join(' puis ');
  const lbl = on ? `Tri : ${names}` : 'Trier';
  return (
    `<button class="btn icon-btn${on ? ' sort-on' : ''}" data-sort-crit
             aria-label="${lbl}" title="${lbl}">${ic('sort-vertical', 'ic-14')}</button>`);
}
export function bindSortBar(root, st, onChange){
  root.querySelector('[data-sort-crit]').addEventListener('click', () => {
    const sh = openSheet({ title: 'Trier', icon: 'sort-vertical' });
    const render = () => {
      sh.body.innerHTML = sortSectionHTML(st);
      bindSortSection(sh.body, st, () => { onChange(); render(); });
    };
    render();
  });
}

/* ---------- la puce d'état (Mes pistes) ----------
   Un bouton, un geste : taper la retire, comme les étiquettes de filtre
   à côté d'elle. La flèche dit le sens ; l'inverser se fait là où on l'a
   choisi — en re-tapant le critère dans « Affiner ». */
export function sortChipHTML(st){
  if (sortIsDefault(st)) return '';
  const names = st.levels.map(l => SORT_LABELS[l.sort]).join(' puis ');
  return (
    `<button class="st-chip" data-sort-clear
             aria-label="Retirer le tri ${names}">${names} ${effDir(st.levels[0]) === 'asc' ? '↑' : '↓'}</button>`);
}
export function bindSortChip(box, st, onChange){
  box.querySelector('[data-sort-clear]')?.addEventListener('click', () => {
    st.levels = [{ sort: st.def, dir: '' }];
    onChange();
  });
}

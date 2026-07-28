/* ============================================================
   OpenContact — interface · utilitaires d'écran
   Sélecteurs, icônes pixel, toast, feuilles (bottom sheet mobile /
   fenêtre centrée desktop) avec pile, piège de focus et Échap.
   ============================================================ */
import { esc } from '../engine/utils.js';

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

/* icône pixel (assets/icons/) teintée par currentColor — masque CSS .ic.
   mask-image en style direct : une url() relative dans une variable CSS
   ne se résout pas pareil selon les navigateurs. */
export function ic(name, cls){
  const u = `url(assets/icons/${name}.svg)`;
  return `<span class="ic${cls ? ' ' + cls : ''}" style="-webkit-mask-image:${u};mask-image:${u}" aria-hidden="true"></span>`;
}

export function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function btn(label, cls, fn, icon){
  const b = el(`<button class="btn ${cls || ''}">${icon ? ic(icon, 'ic-14') + ' ' : ''}${esc(label)}</button>`);
  if (fn) b.addEventListener('click', fn);
  return b;
}

/* ---------- barres transitoires : balayer (tactile) / ✕ (desktop) ---------- */
function barX(onClose){
  const b = el('<button class="bar-x" aria-label="Fermer">✕</button>');
  b.addEventListener('click', onClose);
  return b;
}
/* glisser horizontalement une barre centrée (transform -50%) la ferme ;
   sous le seuil, elle revient — les minuteurs restent le secours */
function bindBarSwipe(bar, dismiss){
  if (!matchMedia('(pointer:coarse)').matches) return;
  let x0 = null, y0 = null, dx = 0, active = false;
  bar.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; active = false;
  }, { passive: true });
  bar.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!active){
      if (Math.abs(mx) < 12 || Math.abs(mx) < Math.abs(my) * 1.4) return;
      active = true;
    }
    dx = mx;
    bar.style.transition = 'none';
    bar.style.transform = `translateX(calc(-50% + ${dx}px))`;
    bar.style.opacity = String(Math.max(.25, 1 - Math.abs(dx) / 260));
  }, { passive: true });
  bar.addEventListener('touchend', () => {
    if (x0 == null) return;
    x0 = null;
    bar.style.transition = '';
    if (active && Math.abs(dx) > 64){ dismiss(); return; }
    bar.style.transform = '';
    bar.style.opacity = '';
  });
}

let toastTimer = null;
function hideToast(){
  const t = $('#toast');
  t.classList.remove('on');
  t.style.transform = '';
  t.style.opacity = '';
}
export function toast(msg){
  const t = $('#toast');
  t.innerHTML = '';
  t.append(document.createTextNode(msg), barX(hideToast));
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3400);
}
bindBarSwipe(document.getElementById('toast'), hideToast);

/* ---------- feuilles empilables ---------- */
const stack = [];
/* N8 : une seule surface modale à la fois. Sur desktop, une feuille
   ouverte sur une autre REMPLACE sa fenêtre à l'écran — la précédente
   attend, cachée, et revient à la fermeture. Seules les confirmations
   (une question, un tap — modal-confirm) se posent par-dessus. */
const wideModal = matchMedia('(min-width:901px)');
function focusables(root){
  return Array.from(root.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(x => x.offsetParent !== null);
}
export function openSheet(o){
  o = o || {};
  /* Les feuilles qui succèdent directement à une action transitoire peuvent
     écarter son ancien toast. Ce choix reste explicite : une confirmation
     importante (biométrie après protection, par exemple) conserve le retour. */
  if (o.clearToast) hideToast();
  const ov = el(
    `<div class="overlay open">
      <div class="modal ${o.className || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title || '')}">
        <div class="modal-h"><h2>${o.icon ? ic(o.icon, 'ic-14') : ''}<span>${esc(o.title || '')}</span></h2>
          <button class="x" aria-label="Fermer">✕</button></div>
        <div class="modal-b"></div>
        <div class="modal-s" hidden></div>
        <div class="modal-f" hidden></div>
      </div>
    </div>`);
  const body = ov.querySelector('.modal-b');
  const stat = ov.querySelector('.modal-s');
  const foot = ov.querySelector('.modal-f');
  if (typeof o.body === 'string') body.innerHTML = o.body;
  else if (o.body) body.append(o.body);

  let closed = false;
  const prevFocus = document.activeElement;
  /* o.guard : consulté avant de fermer (léger garde-fou « quitter sans
     enregistrer ? ») — false ou promesse fausse = on reste */
  function close(result, force){
    if (closed) return;
    if (!force && o.guard){
      const g = o.guard();
      if (g === false || (g && typeof g.then === 'function')){
        /* on reste : la feuille reprend sa place (glisser interrompu) */
        const m = ov.querySelector('.modal');
        if (m) m.style.transform = '';
        if (g !== false) g.then(okv => { if (okv) close(result, true); });
        return;
      }
    }
    closed = true;
    const i = stack.indexOf(rec);
    if (i >= 0) stack.splice(i, 1);
    ov.remove();
    if (rec.behind){ rec.behind.ov.classList.remove('ov-behind'); rec.behind = null; }
    if (o.onClose) o.onClose(result);
    if (prevFocus && prevFocus.focus){ try { prevFocus.focus(); } catch (e) {} }
  }
  const rec = { ov, close, dismissible: o.dismissible !== false };
  const below = stack[stack.length - 1] || null;
  if (wideModal.matches && below && !(o.className || '').includes('modal-confirm')){
    below.ov.classList.add('ov-behind');
    rec.behind = below;
  }
  stack.push(rec);
  ov.addEventListener('click', e => { if (e.target === ov && o.dismissible !== false) close(); });
  ov.querySelector('.x').addEventListener('click', () => close());
  /* tactile : glisser vers le bas referme — depuis la barre de titre
     toujours, et depuis le corps entier quand la feuille est petite
     (rien à faire défiler) : les confirmations se balaient d'un pouce */
  if (matchMedia('(pointer:coarse)').matches && o.dismissible !== false){
    const modal = ov.querySelector('.modal');
    const bindDrag = (zone, guard) => {
      let y0 = null, dy = 0;
      zone.addEventListener('touchstart', e => {
        if (guard && !guard(e)) return;
        y0 = e.touches[0].clientY; dy = 0;
        modal.style.transition = 'none';
      }, { passive: true });
      zone.addEventListener('touchmove', e => {
        if (y0 == null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        modal.style.transform = dy ? `translateY(${dy}px)` : '';
      }, { passive: true });
      zone.addEventListener('touchend', () => {
        if (y0 == null) return;
        modal.style.transition = '';
        if (dy > 90) close();
        else modal.style.transform = '';
        y0 = null;
      });
    };
    bindDrag(ov.querySelector('.modal-h'));
    bindDrag(body, e =>
      body.scrollHeight - body.clientHeight <= 4 &&
      !e.target.closest('button, a, input, textarea, select, [role="button"], .datechips'));
  }
  document.body.append(ov);
  requestAnimationFrame(() => {
    const f = (o.focus && ov.querySelector(o.focus)) || ov.querySelector('.x');
    try { f.focus({ preventScroll: true }); } catch (e) {}
  });
  const api = {
    ov, body, close,
    setTitle(t){ ov.querySelector('.modal-h h2 span').textContent = t; },
    /* La barre d'état de la fenêtre — là où 98 mettait l'état vivant, et
       pas au milieu du contenu. `null` la fait disparaître : sur un
       téléphone, une bande permanente coûterait 26 px pour rien quand il
       n'y a rien à dire. `ton` colore le mot (« ok » = vert). */
    setStatus(html, ton){
      stat.hidden = html == null;
      stat.className = 'modal-s' + (ton ? ' modal-s-' + ton : '');
      stat.innerHTML = html == null ? '' : html;
    },
    setFoot(content){
      /* remplace — les feuilles à étapes rappellent setFoot à chaque
         écran ; null = pas de pied (fermer = la croix ou le glisser) */
      foot.innerHTML = '';
      foot.hidden = content == null;
      if (content == null) return;
      if (typeof content === 'string') foot.innerHTML = content;
      else foot.append(...[].concat(content));
    }
  };
  return api;
}
export function topSheet(){ return stack[stack.length - 1] || null; }

/* ---------- onglets — la feuille de propriétés 98 ----------
   À réserver à ce qu'elle décrit : plusieurs façons INDÉPENDANTES de
   faire la même chose (« tabs work best when information is related and
   independent across pages »). Des ÉTAPES ne sont pas des onglets — ça,
   c'est un parcours en feuilles.

   Trois entrées pour un seul comportement, et le geste ne remplace
   jamais ce qui se voit : taper l'onglet · ← → au clavier · glisser au
   pouce · les chevrons aux bords, qui sont de VRAIS boutons de 26 px.

   Les pièges évités, dans l'ordre où ils mordent :
   · le glisser-fermer de la feuille est vertical → on verrouille l'axe
     au premier mouvement et on ne prend que l'horizontal ;
   · iOS revient en arrière quand on part du bord gauche → on ignore les
     24 premiers pixels (le chevron reste, lui, tapable) ;
   · glisser dans un champ, c'est sélectionner du texte → on n'y touche pas.

   `onHide` sert à rendre les ressources (une caméra ne tourne jamais
   sous un onglet caché). */
let tabSeq = 0;
export function tabsUI(host, defs, o){
  o = o || {};
  const uid = 'tb' + (++tabSeq);
  let cur = -1;
  host.innerHTML =
    `<div class="tabs" role="tablist">${defs.map((d, i) =>
      `<button class="tab" type="button" role="tab" id="${uid}-t${i}" aria-controls="${uid}-p"
               aria-selected="false" tabindex="-1">${esc(d.label)}</button>`).join('')}</div>
     <div class="tabpage" id="${uid}-p" role="tabpanel" aria-labelledby="${uid}-t0">
       <button class="sw-a sw-l" type="button" aria-label="Onglet précédent" hidden>‹</button>
       <button class="sw-a sw-r" type="button" aria-label="Onglet suivant" hidden>›</button>
       <div class="tab-in"></div>
     </div>`;
  const tabs = Array.from(host.querySelectorAll('.tab'));
  const page = host.querySelector('.tabpage');
  const zone = host.querySelector('.tab-in');
  const prev = host.querySelector('.sw-l');
  const next = host.querySelector('.sw-r');

  const show = i => {
    i = Math.max(0, Math.min(defs.length - 1, i));
    if (i === cur) return;
    if (cur >= 0 && defs[cur].onHide) defs[cur].onHide();
    cur = i;
    tabs.forEach((t, k) => {
      t.classList.toggle('on', k === i);
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    page.setAttribute('aria-labelledby', uid + '-t' + i);
    prev.hidden = i === 0;
    next.hidden = i === defs.length - 1;
    zone.innerHTML = '';
    defs[i].render(zone);
    if (o.onChange) o.onChange(i, defs[i]);
  };

  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  prev.addEventListener('click', () => show(cur - 1));
  next.addEventListener('click', () => show(cur + 1));
  host.querySelector('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = cur + (e.key === 'ArrowRight' ? 1 : -1);
    if (i < 0 || i >= defs.length) return;
    e.preventDefault();
    show(i);
    tabs[i].focus();
  });

  if (matchMedia('(pointer:coarse)').matches){
    let x0 = null, y0 = 0, axe = '';
    page.addEventListener('touchstart', e => {
      const t = e.touches[0];
      if (t.clientX < 24 || e.target.closest('input, textarea, select, [contenteditable]')){
        x0 = null;
        return;
      }
      x0 = t.clientX; y0 = t.clientY; axe = '';
    }, { passive: true });
    page.addEventListener('touchmove', e => {
      if (x0 == null || axe) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - x0), dy = Math.abs(t.clientY - y0);
      if (dx > 8 || dy > 8) axe = dx > dy ? 'x' : 'y';
    }, { passive: true });
    page.addEventListener('touchend', e => {
      const d = x0 == null || axe !== 'x' ? 0 : e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(d) > 48) show(cur + (d < 0 ? 1 : -1));
    });
  }

  show(Math.max(0, Math.min(defs.length - 1, o.start | 0)));
  return { show, current: () => cur, count: defs.length };
}

document.addEventListener('keydown', e => {
  if (!stack.length) return;
  const top = stack[stack.length - 1];
  if (e.key === 'Escape'){ e.preventDefault(); if (top.dismissible) top.close(); return; }
  if (e.key !== 'Tab') return;
  const f = focusables(top.ov);
  if (!f.length){ e.preventDefault(); return; }
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});

/* barre « Annuler » ~30 s — pour les gestes lourds mais réversibles
   (fusion, suppression, restauration) : le clic rejoue l'instantané
   fourni. Se ferme d'un balayage (tactile) ou du ✕ (desktop). */
let undoTimer = null;
export function showUndo(msgHTML, onUndo){
  document.querySelector('.undo-bar')?.remove();
  clearTimeout(undoTimer);
  const bar = el(`<div class="undo-bar"><span>${msgHTML}</span></div>`);
  bar.append(btn('Annuler', 'btn-sm', () => { bar.remove(); onUndo(); }, 'undo'), barX(() => bar.remove()));
  bindBarSwipe(bar, () => bar.remove());
  document.body.append(bar);
  undoTimer = setTimeout(() => bar.remove(), 30000);
}

/* ---------- suppression au geste — le motif unique ----------
   Le nœud fournit un enfant .sw-in (le contenu visible) ; ici :
   · tactile — glisser vers la gauche révèle « Supprimer », relâché
     au-delà du seuil la ligne part (seuil calé pour ignorer le
     défilement vertical) ;
   · desktop — poubelle au survol / au focus (accessible clavier).
   L'appelant double toujours onDelete d'un showUndo — jamais de
   confirmation. */
export function bindDeleteGesture(node, onDelete){
  const inner = node.querySelector('.sw-in');
  if (!inner || node.__swDel) return;
  node.__swDel = true;
  node.classList.add('sw');
  let gone = false;
  const vanish = () => {
    if (gone) return;
    gone = true;
    node.classList.add('sw-gone');
    setTimeout(onDelete, 150);
  };
  const del = el(`<button class="hov-del" aria-label="Supprimer" title="Supprimer">${ic('trash', 'ic-14')}</button>`);
  del.addEventListener('click', e => { e.stopPropagation(); vanish(); });
  inner.append(del);
  if (!matchMedia('(pointer:coarse)').matches) return;
  node.prepend(el(`<div class="sw-under" aria-hidden="true">${ic('trash', 'ic-14')} Supprimer</div>`));
  let x0 = null, y0 = null, dx = 0, active = false, endedAt = 0;
  node.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; active = false;
  }, { passive: true });
  node.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!active){
      if (Math.abs(mx) < 12 || Math.abs(mx) < Math.abs(my) * 1.4) return;
      active = true;
    }
    dx = Math.max(-96, Math.min(0, mx));
    inner.style.transform = dx ? `translateX(${dx}px)` : '';
    node.classList.toggle('swipe-del', dx < -24);
  }, { passive: true });
  node.addEventListener('touchend', () => {
    if (x0 == null) return;
    x0 = null;
    if (active){
      endedAt = Date.now();
      if (dx < -72){ inner.style.transform = ''; node.classList.remove('swipe-del'); vanish(); return; }
    }
    inner.style.transform = '';
    node.classList.remove('swipe-del');
  });
  /* le clic fantôme qui suit un glissement n'ouvre rien */
  node.addEventListener('click', e => {
    if (Date.now() - endedAt < 400){ e.stopPropagation(); e.preventDefault(); }
  }, true);
}

/* ---------- réorganisation douce d'une liste (#23) ----------
   FLIP minimal : appeler AVANT le re-rendu (mémorise la position des
   lignes par data-id), jouer le retour APRÈS — chaque ligne retrouvée
   glisse de son ancienne place à la nouvelle. transform seulement,
   transition CSS ; reduced-motion et longues listes = rien. */
export function softReorder(sel){
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return () => {};
  const nodes = document.querySelectorAll(sel);
  if (!nodes.length || nodes.length > 60) return () => {};
  const old = new Map();
  nodes.forEach(n => { if (n.dataset.id) old.set(n.dataset.id, n.getBoundingClientRect()); });
  return () => {
    document.querySelectorAll(sel).forEach(n => {
      const was = n.dataset.id && old.get(n.dataset.id);
      if (!was) return;
      const now = n.getBoundingClientRect();
      const dx = was.left - now.left, dy = was.top - now.top;
      if (!dx && !dy) return;
      n.style.transition = 'none';
      n.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        n.style.transition = 'transform var(--dur-3) var(--ease-out)';
        n.style.transform = '';
        n.addEventListener('transitionend', () => { n.style.transition = ''; }, { once: true });
      }));
    });
  };
}

/* confirmation simple — remplace confirm() natif */
export function confirmSheet(o){
  return new Promise(resolve => {
    const s = openSheet({
      title: o.title || 'Confirmer ?',
      icon: o.icon || 'square-alert',
      className: 'modal-confirm',
      body: `<p class="cf-msg">${o.msg || ''}</p>`,
      onClose: v => resolve(!!v)
    });
    /* pas de bouton d'annulation : la croix de la feuille annule (elle
       ferme sans valeur, donc la promesse rend false). Un seul bouton,
       celui qui agit — « un bouton primaire max par vue ». */
    s.setFoot([
      btn(o.okLabel || 'Confirmer', o.danger ? 'btn-danger' : 'btn-primary', () => s.close(true))
    ]);
  });
}

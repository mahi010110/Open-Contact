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
/* ---------- LE BOUTON RETOUR FERME LA FEUILLE, PAS L'ÉCRAN ----------
   Mesuré : une feuille ouverte, retour → l'app changeait d'onglet ET
   laissait la feuille par-dessus. C'est le geste le plus utilisé sur
   Android (bouton système) et sur iOS (glissé depuis le bord) ; le
   laisser traverser une feuille est le défaut de navigation le plus
   visible qu'une application web puisse avoir.
   Le procédé est celui que tout le monde emploie : chaque feuille
   POUSSE une entrée d'historique à la même adresse (donc sans toucher
   à la route), et la consomme en se fermant. `internes` distingue les
   retours que NOUS provoquons de celui de l'utilisateur — sans eux,
   fermer par la croix déclencherait une deuxième fermeture. */
let poussees = 0;         /* entrées d'historique qui nous appartiennent */
let internes = 0;         /* retours que NOUS avons provoqués, en vol */
let aRendre = 0;          /* retours programmés, pas encore partis */
let parRetour = false;    /* fermeture provoquée par le bouton retour */

/* Rendre l'entrée est DIFFÉRÉ d'une micro-tâche, et c'est le cœur du
   procédé. `history.back()` ne prend effet qu'après le bloc synchrone en
   cours, alors que `pushState` est immédiat ; or l'app referme souvent
   une feuille pour en ouvrir une autre dans le même geste. On empilait
   donc une entrée par-dessus un retour en vol, le compte se décalait
   d'un cran à chaque fois, et au troisième aller-retour le retour
   suivant sortait de l'application — mesuré, `about:blank`.
   Différé, le retour peut être ANNULÉ par l'ouverture qui suit : la
   feuille suivante reprend l'entrée de la précédente. Rien ne bouge
   dans l'historique, rien ne se décale.
   `internes` est un COMPTEUR et non un drapeau : deux retours peuvent
   être en vol en même temps, et un booléen n'en absorbe qu'un — le
   second serait pris pour un geste de l'utilisateur et fermerait une
   feuille que personne n'a quittée. */
function rendreEntree(){
  if (poussees - aRendre <= 0) return;
  aRendre++;
  queueMicrotask(() => {
    if (!aRendre) return;                   /* une ouverture l'a annulé */
    aRendre--;
    poussees--;
    internes++;
    history.back();
  });
}
function prendreEntree(){
  if (aRendre){ aRendre--; return; }        /* on garde l'entrée qui allait partir */
  poussees++;
  history.pushState({ oc: poussees }, '', location.href);
}
addEventListener('popstate', () => {
  if (internes){ internes--; return; }
  if (!poussees) return;                    /* aucune feuille : vraie navigation */
  poussees--;
  const dessus = stack[stack.length - 1];
  if (!dessus) return;
  parRetour = true;
  dessus.close();
  parRetour = false;
  /* le garde-fou a pu refuser (« quitter sans enregistrer ? ») : la
     feuille est restée, on lui rend l'entrée qu'on vient de consommer —
     sinon le retour suivant sortirait de l'app. */
  if (stack.includes(dessus)){
    poussees++;
    history.pushState({ oc: poussees }, '', location.href);
  }
});
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
/* ---------- au poste, une fenêtre se prend par sa barre de titre ----------
   L'identité du produit est un utilitaire de bureau de 98 : là-bas,
   TOUTE fenêtre se déplace. Ici elle était clouée au centre, et le seul
   moyen de voir ce qu'elle couvrait était de la fermer.

   Étirer la feuille, en revanche, ne rend rien — mesuré sur les seize
   feuilles de l'app, aux deux tailles d'écran : chacune est soit au
   plafond (92 dvh, plus rien à gagner), soit assez courte pour tout
   montrer (l'étirer n'ajouterait que du vide). Aucune n'est les deux.
   C'est le dimensionnement automatique qui fait déjà le travail.

   La place choisie vaut pour TOUTES les feuilles et dure le temps de la
   session : c'est un réglage de bureau, pas une donnée — rien n'est
   écrit nulle part. Les confirmations en sont exclues : une question
   n'est pas une fenêtre qu'on range.

   Bornes : au moins 80 px de fenêtre visible sur les côtés, jamais
   au-dessus du bord haut, 44 px de barre toujours atteignable en bas —
   une fenêtre qu'on ne peut plus reprendre n'est plus une fenêtre.

   Geste à la souris seule, et c'est assumé (WCAG 2.5.7 vise le
   glissement dont une TÂCHE dépend) : la place par défaut reste
   entièrement utilisable, rien ici ne se fait qu'en déplaçant. Un chemin
   clavier coûterait un arrêt de tabulation avant la croix, sur CHAQUE
   feuille — payé cent fois par jour pour un confort qu'on prend une
   fois. */
let posee = { x: 0, y: 0 };
function installDeplacement(ov, modal, signal){
  const h = ov.querySelector('.modal-h');
  h.title = 'Glisser pour déplacer · double-clic pour recentrer';
  /* la place AU REPOS : le rectangle rendu porte déjà la translation,
     on la retranche une fois pour toutes au lieu de la traîner */
  const repos = () => {
    const r = modal.getBoundingClientRect();
    return { l: r.left - posee.x, t: r.top - posee.y, w: r.width };
  };
  const serre = rp => {
    posee.x = Math.max(80 - rp.l - rp.w, Math.min(innerWidth - rp.l - 80, posee.x));
    posee.y = Math.max(-rp.t, Math.min(innerHeight - rp.t - 44, posee.y));
  };
  const pose = () => {
    modal.style.transform = (posee.x || posee.y) ? `translate(${posee.x}px,${posee.y}px)` : '';
  };
  let id = null, ax = 0, ay = 0, rp = null;
  h.addEventListener('pointerdown', e => {
    if (e.button !== 0 || (e.target.closest && e.target.closest('button'))) return;
    id = e.pointerId; rp = repos();
    ax = e.clientX - posee.x; ay = e.clientY - posee.y;
    modal.style.transition = 'none';
    h.classList.add('mh-drag');
    try { h.setPointerCapture(id); } catch (x) {}
    e.preventDefault();                     /* pas de sélection de texte */
  }, { signal });
  h.addEventListener('pointermove', e => {
    if (id == null || e.pointerId !== id) return;
    posee.x = e.clientX - ax; posee.y = e.clientY - ay;
    serre(rp); pose();
  }, { signal });
  const fin = () => {
    if (id == null) return;
    try { h.releasePointerCapture(id); } catch (x) {}
    id = null; rp = null;
    modal.style.transition = '';
    h.classList.remove('mh-drag');
  };
  h.addEventListener('pointerup', fin, { signal });
  h.addEventListener('pointercancel', fin, { signal });
  h.addEventListener('dblclick', e => {
    if (e.target.closest && e.target.closest('button')) return;
    posee = { x: 0, y: 0 }; pose();
  }, { signal });
  /* L'écran change de taille : la fenêtre pourrait se retrouver dehors.
     Une feuille qui ATTEND derrière une autre (`ov-behind`, donc
     `display:none`) rend un rectangle à zéro — la serrer là-dessus
     écrirait n'importe quoi dans une place partagée par toutes. Elle se
     resserrera d'elle-même en revenant. */
  addEventListener('resize', () => {
    if (!modal.getClientRects().length) return;
    serre(repos()); pose();
  }, { signal });
  return { pose, serre, repos };
}

/* Les feuilles en train de SORTIR. Elles restent 140 ms dans le
   document pour leurs pixels — et pendant ce temps elles répondent
   encore à `.modal`, `.modal-confirm`, `.modal-f button`… Une feuille
   fantôme, quoi : le code (ou un test) qui cherche « la feuille »
   juste après une fermeture tombait sur la morte.
   Ouvrir une feuille solde donc d'abord les sorties en cours. Le cas
   « je referme et j'ouvre autre chose » — de loin le plus fréquent — ne
   laisse ainsi jamais deux feuilles se ressembler. */
const sortants = new Set();
function solderSorties(){ for (const oter of [...sortants]) oter(); }

export function openSheet(o){
  o = o || {};
  solderSorties();
  /* Les feuilles qui succèdent directement à une action transitoire peuvent
     écarter son ancien toast. Ce choix reste explicite : une confirmation
     importante (biométrie après protection, par exemple) conserve le retour. */
  if (o.clearToast) hideToast();
  const ov = el(
    `<div class="overlay open">
      <div class="modal ${o.className || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title || '')}">
        <div class="modal-h"><h2>${o.icon ? ic(o.icon, 'ic-14') : ''}<span class="mh-t">${esc(o.title || '')}</span></h2>
          ${/* `title` explicite : sans lui, la croix HÉRITE de l'infobulle
                de la barre de titre (« Glisser pour déplacer… ») — le
                navigateur remonte au premier ancêtre qui en porte une, et
                le bouton annonçait donc le geste du voisin. */''}
          <button class="x" aria-label="Fermer" title="Fermer">✕</button></div>
        <div class="modal-b"></div>
        <div class="modal-f" hidden></div>
      </div>
    </div>`);
  const body = ov.querySelector('.modal-b');
  const foot = ov.querySelector('.modal-f');
  if (typeof o.body === 'string') body.innerHTML = o.body;
  else if (o.body) body.append(o.body);

  let closed = false;
  /* les écouteurs posés hors de `ov` (le redimensionnement de la
     fenêtre) partent avec elle — sinon chaque feuille ouverte en
     laisserait un derrière elle */
  const vie = new AbortController();
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
    vie.abort();
    /* on rend l'entrée d'historique de cette feuille. Pas quand c'est le
       bouton retour qui ferme : il l'a déjà consommée. */
    if (!parRetour) rendreEntree();
    const i = stack.indexOf(rec);
    if (i >= 0) stack.splice(i, 1);
    /* Tout ce qui est LOGIQUE part tout de suite — la pile, la feuille
       qui attendait derrière, le retour d'appel, le focus. Seuls les
       PIXELS attendent la sortie. Sans ça, une feuille en train de
       disparaître resterait « ouverte » pour le reste de l'app pendant
       140 ms, et un tap rapide se perdrait dedans. */
    ov.classList.add('ov-out');
    ov.setAttribute('aria-hidden', 'true');
    /* `inert` en plus d'`aria-hidden` : pendant ces 140 ms, la feuille
       qui s'en va garde des boutons focalisables. Sans lui, une
       tabulation rapide atterrit dans une feuille qu'on ne voit
       presque plus, et un lecteur d'écran peut encore la parcourir. */
    ov.inert = true;
    if (rec.behind){ rec.behind.ov.classList.remove('ov-behind'); rec.behind = null; }
    if (o.onClose) o.onClose(result);
    if (prevFocus && prevFocus.focus){ try { prevFocus.focus(); } catch (e) {} }
    if (matchMedia('(prefers-reduced-motion:reduce)').matches){ ov.remove(); return; }
    /* `animationend` seul ne suffit pas : un onglet en arrière-plan ne
       joue pas ses animations, et la feuille resterait dans le document
       jusqu'au retour. Le délai est le filet. */
    let parti = false;
    const oter = () => {
      if (parti) return;
      parti = true;
      sortants.delete(oter);
      ov.remove();
    };
    sortants.add(oter);
    ov.addEventListener('animationend', e => { if (e.target === ov) oter(); });
    setTimeout(oter, 600);
  }
  const rec = { ov, close, dismissible: o.dismissible !== false };
  const below = stack[stack.length - 1] || null;
  if (wideModal.matches && below && !(o.className || '').includes('modal-confirm')){
    below.ov.classList.add('ov-behind');
    rec.behind = below;
  }
  stack.push(rec);
  prendreEntree();
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
  /* déplacement à la souris — pas sur une confirmation, et pas au doigt :
     là, la barre de titre sert déjà à refermer d'un glissement */
  const bougeable = matchMedia('(pointer:fine)').matches
    && !(o.className || '').includes('modal-confirm');
  document.body.append(ov);
  if (bougeable){
    const m = installDeplacement(ov, ov.querySelector('.modal'), vie.signal);
    if (posee.x || posee.y){ m.serre(m.repos()); m.pose(); }
  }
  requestAnimationFrame(() => {
    const f = (o.focus && ov.querySelector(o.focus)) || ov.querySelector('.x');
    try { f.focus({ preventScroll: true }); } catch (e) {}
  });
  const api = {
    ov, body, close,
    /* `.mh-t` et pas `span` : le premier span d'un `h2` est celui de
       l'ICÔNE. `setTitle` écrivait donc dedans — masqué par le `mask`
       de l'icône — et le titre visible ne changeait jamais. Toutes les
       feuilles à étapes gardaient celui de leur ouverture : on
       parcourait Donner → Fichier → QR en lisant « Donner » partout,
       sans jamais savoir où l'on était. Le `aria-label` du dialogue
       suit, sinon un lecteur d'écran restait sur le titre de départ. */
    setTitle(t){
      ov.querySelector('.modal-h h2 .mh-t').textContent = t;
      ov.querySelector('.modal').setAttribute('aria-label', t);
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

/* « Une feuille est-elle ouverte ? » — UNE seule définition. Une feuille
   qui S'EN VA n'est plus ouverte : depuis qu'elle sort en glissant, elle
   reste 140 ms dans le document pour ses pixels seulement. Sans cette
   précision, quatre endroits la comptaient encore — un rechargement
   différé qui ne partait pas, deux raccourcis clavier muets. */
export const sheetOpen = () => !!document.querySelector('.overlay:not(.ov-out)');

/* ---------- « ça a changé pendant que tu ne regardais pas » ----------
   Un changement instantané n'est pas « moins joli » : il n'est PAS VU.
   C'est de la cécité au changement, et l'app la produisait à chaque
   modification — on ouvre la fiche d'une piste, on change son statut,
   on referme, et la ligne derrière est silencieusement différente. Le
   geste ne se voit jamais atterrir. Pour un outil dont le métier est de
   pousser à l'action, une action qu'on ne voit pas aboutir ne récompense
   rien.

   Un lavis d'accent, une fois, sur la SEULE ligne concernée. Le
   mouvement est pré-attentif — l'œil y va avant la conscience — donc
   c'est le signal le plus fort de l'interface, et le plus cher : il ne
   se dépense que là où il répond à une question.

   Trois retenues : rien si la ligne est hors de l'écran (personne ne le
   verrait, et la classe resterait collée) ; rien en mouvement réduit ;
   et on attend que la feuille ait fini de sortir, sinon le plus fort du
   lavis se joue derrière son voile. */
const msJeton = v =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v)) || 0;

export function montrerChange(id){
  if (!id || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  setTimeout(() => {
    let n = null;
    /* `.view:not([hidden])` est indispensable : les quatre écrans vivent
       tous dans le document, seuls trois sont `hidden`. Une même piste a
       donc une ligne dans « Aujourd'hui » ET une dans « Mes pistes », et
       la première du document gagnait — celle de l'écran caché, haute de
       zéro pixel. Le lavis ne s'est jamais affiché nulle part. */
    try {
      n = document.querySelector(`.view:not([hidden]) [data-id="${CSS.escape(String(id))}"]`);
    } catch (e) {}
    if (!n) return;
    const r = n.getBoundingClientRect();
    if (!r.height || r.bottom <= 0 || r.top >= innerHeight) return;
    n.classList.remove('vu-change');
    void n.offsetWidth;                    /* rejouer, même ligne deux fois de suite */
    n.classList.add('vu-change');
    setTimeout(() => n.classList.remove('vu-change'), msJeton('--dur-vu') + 120);
  }, msJeton('--dur-out') + 30);
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
/* `quoi` nomme la CIBLE. Sans lui, un lecteur d'écran parcourant
   « Mes pistes » au poste entend « Ouvrir Cyberdéfense Lyon », puis
   « Supprimer », puis « Ouvrir WebAgence », puis « Supprimer » —
   quarante fois le même mot sans jamais savoir quoi. Le nom, lui,
   est déjà là, sur la ligne d'à côté. */
export function bindDeleteGesture(node, onDelete, quoi){
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
  const nom = String(quoi || '').trim();
  const dit = nom ? 'Supprimer ' + nom : 'Supprimer';
  const del = el(`<button class="hov-del" aria-label="${esc(dit)}" title="${esc(dit)}">${ic('trash', 'ic-14')}</button>`);
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

/* ---------- une section qui se déplie ne saute plus (#38) ----------
   « Bientôt », « Clôturées », « À savoir », un contact : la page sautait
   d'un coup. C'est un DÉPLACEMENT ENTRE ÉTATS, pas un objet — donc doux,
   selon la règle de CLAUDE.md §4, qui l'autorise déjà.

   On anime la hauteur du `<details>` LUI-MÊME, pas celle de son contenu :
   les sections de l'app n'ont pas la même structure interne (une seule
   boîte ici, six champs là), et viser le contenu aurait demandé un
   emballage dans chacune. Le `<details>`, lui, est toujours là.

   Un seul écouteur délégué sur le document couvre toutes les sections,
   présentes et à venir — y compris celles qu'une feuille crée après coup.
   Le clavier passe par là aussi : Entrée et Espace sur un `summary`
   émettent un `click`. */
const FOLD_MAX = 620;      /* au-delà, l'ouverture s'étire trop : instantané */

function foldAnim(d, de, vers, apres){
  d.__folding = true;
  let fini = false;
  const fin = () => {
    if (fini) return;
    fini = true;
    d.style.transition = d.style.height = d.style.overflow = d.style.flexShrink = '';
    d.__folding = false;
    apres();
  };
  d.style.overflow = 'hidden';
  /* Une section repliable est souvent enfant d'un conteneur flex (la vue
     « Aujourd'hui » l'est) : sans ce verrou, flex la comprime pendant
     l'animation et la hauteur qu'on vient de poser ne tient pas. Mesuré :
     le cadre rendait 25 px alors que son propre résumé en fait 44. */
  d.style.flexShrink = '0';
  d.style.height = de + 'px';
  /* Cette lecture n'est PAS décorative : elle force le navigateur à
     calculer la mise en page, donc à ENGAGER la hauteur de départ. Sans
     elle il fusionne les deux affectations et passe directement à la
     valeur finale — aucune transition, sauf si un autre code a provoqué
     un calcul entre-temps. C'est exactement ce qui rendait l'animation
     tantôt présente tantôt absente. */
  void d.offsetHeight;
  d.style.transition = 'height var(--dur-3) var(--ease-out)';
  d.style.height = vers + 'px';
  d.addEventListener('transitionend', e => {
    /* les enfants transitionnent aussi : seule LA hauteur du cadre compte */
    if (e.target === d && e.propertyName === 'height') fin();
  });
  /* filet : un `transitionend` peut ne jamais venir (onglet caché,
     élément retiré du DOM en cours de route) — sans lui, la section
     resterait figée à une hauteur en dur. */
  setTimeout(fin, 600);
}

/* ---------- LE CLAVIER EST UNE DÉCISION DE CONCEPTION ----------
   Au pouce, ce qu'un champ coûte ne se compte pas en pixels mais en
   CLAVIER : lequel s'ouvre, et ce qu'il fait au texte pendant qu'on
   tape. Relevé sur tous les champs de l'app, et trois défauts sortaient
   du lot — tous invisibles à la relecture, tous payés à chaque saisie :

   ① « Son email ou son téléphone », le champ le plus tapé du produit,
      arrivait en clavier alphabétique. L'arobase coûte un changement de
      page de clavier — et surtout **iOS met une majuscule au premier
      caractère par défaut** : `s@b.test` devient `S@b.test`, une
      adresse fausse que personne ne relit. La correction automatique
      finit le travail sur les noms propres : « Barbaste » réécrit en
      autre chose, une fois, pour toujours.
   ② Quatre champs `type="url"` sur cinq n'avaient pas `inputmode="url"`
      — le type suffit sur iOS, pas partout ailleurs.
   ③ La recherche n'annonçait pas sa touche Entrée.

   D'où ces jeux d'attributs, nommés par ce que le champ EST, jamais par
   ce qu'il porte comme balise.

   **Ce qui N'A PAS de genre en a un quand même : la prose.** L'objet et
   le corps d'un mail, une note, une description ne passent par aucune
   entrée d'ici — et c'est voulu : le correcteur du navigateur y est
   allumé par défaut, et il doit le rester. Un mail part chez un
   recruteur ; une faute y coûte plus cher qu'une majuscule. Une entrée
   vide dans cette table pour le dire serait du code mort — une mutation
   l'a montré. La règle se garde là où elle se voit, dans
   `e2e-ux-audit.mjs`. */
const CLAVIERS = {
  /* un nom propre : entreprise, personne, ville, techno */
  nom:      'autocapitalize="words" autocorrect="off" spellcheck="false"',
  /* « email ou téléphone » : le type reste `text` — `type="email"`
     rendrait le champ invalide dès qu'on y met un numéro */
  coord:    'inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false"',
  email:    'autocapitalize="off" autocorrect="off" spellcheck="false"',
  tel:      'autocorrect="off" spellcheck="false"',
  lien:     'inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false"',
  cherche:  'enterkeyhint="search" autocapitalize="off" autocorrect="off" spellcheck="false"',
  /* une phrase de secours se tape EN CLAIR, mot à mot. La correction
     automatique y est un danger d'une autre catégorie : elle réécrit un
     mot, la phrase ne rouvre plus rien, et rien à l'écran ne dit
     pourquoi. Les champs avaient déjà `autocapitalize` — il manquait
     justement celui qui substitue. (`type="password"` coupe les trois
     tout seul ; ici le texte est visible, donc rien ne les coupe.) */
  secret:   'autocapitalize="off" autocorrect="off" spellcheck="false"'
};
export function clavier(genre){ return CLAVIERS[genre] || ''; }

/* ---------- UNE BARRE QUI NE SE MONTRE QUE QUAND ELLE SERT ----------
   Une barre collante rend une longue page mesurablement plus rapide à
   parcourir (~22 % chez NN/g), mais elle mange de la hauteur : la même
   source ne la recommande qu'au-delà de trois écrans de contenu, et
   veut qu'elle reste autour du dixième de la hauteur — la satisfaction
   tombe passé 20 à 30 %. Elle ne doit donc rien coûter tant qu'il n'y a
   rien à faire défiler.

   Le comportement s'en charge tout seul : sans débordement, `sticky` ne
   s'accroche jamais. Ce qui ne s'en charge pas, c'est l'ENCRE — un trait
   et un fond posés en dur resteraient visibles sur une liste de trois
   lignes, c'est-à-dire du décor permanent (§6, règle 1). D'où cette
   sentinelle : la barre ne prend son fond, son trait et son relief que
   pendant qu'elle est vraiment décrochée du haut de page. C'est aussi ce
   que dit Material 3 — le bandeau change de fond au défilement pour dire
   « tu n'es plus en haut ». Le changement est INSTANTANÉ : c'est un
   objet, et les objets de l'app ne fondent pas (§4).

   Une sentinelle plutôt que la barre elle-même : observer un élément
   collant donne un résultat qui dépend du padding du défileur et bascule
   sur un pixel. Un repère de 1 px posé juste avant, lui, sort du champ
   franchement.

   Un observateur par ÉCRAN, pas une liste : un écran se re-rend à chaque
   frappe, et sans ce remplacement on empilerait un observateur par rendu
   sur des nœuds détachés. Rangés par vue, deux écrans ne se marchent
   jamais dessus. */
const guetteurs = new Map();
/* le défileur, quel qu'il soit : une vue d'onglet ou le corps d'une
   feuille. Le motif sert des deux côtés — c'est la même liste trop
   longue et la même commande qui s'échappe. */
function defileurDe(el){
  for (let p = el.parentElement; p; p = p.parentElement){
    const o = getComputedStyle(p).overflowY;
    if (o === 'auto' || o === 'scroll') return p;
  }
  return null;
}
export function collerEnHaut(sentinelle, cible, classe = 'est-collee'){
  if (!sentinelle || !cible) return;
  const root = defileurDe(sentinelle);
  if (!root || typeof IntersectionObserver !== 'function') return;
  guetteurs.get(root)?.disconnect();
  const io = new IntersectionObserver(([e]) => {
    /* onglet caché : `rootBounds` est nul, on ne conclut rien */
    if (!e.rootBounds) return;
    cible.classList.toggle(classe, e.boundingClientRect.top < e.rootBounds.top);
  }, { root, threshold: 0 });
  io.observe(sentinelle);
  guetteurs.set(root, io);
}

export function installFoldMotion(){
  document.addEventListener('click', e => {
    const sum = e.target.closest && e.target.closest('summary');
    if (!sum) return;
    const d = sum.parentElement;
    if (!d || d.tagName !== 'DETAILS') return;
    if (d.__folding){ e.preventDefault(); return; }   /* un geste à la fois */
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    /* On mesure les DEUX hauteurs réelles en basculant `open` — le
       navigateur ne repeint pas entre deux lectures dans la même tâche,
       donc rien ne clignote. Prendre la hauteur du `summary` comme
       approximation ne marchait pas : sous un conteneur flex, le cadre
       fermé peut être plus COURT que son propre résumé. */
    const etait = d.open;
    const ferme = etait ? (d.open = false, d.getBoundingClientRect().height)
                        : d.getBoundingClientRect().height;
    const ouvert = etait ? (d.open = true, d.getBoundingClientRect().height)
                         : (d.open = true, d.getBoundingClientRect().height);
    if (ouvert - ferme > FOLD_MAX){ d.open = !etait; return; }   /* trop long : net */
    e.preventDefault();
    if (etait) foldAnim(d, ouvert, ferme, () => { d.open = false; });
    else       foldAnim(d, ferme, ouvert, () => {});
  });
}

/* ---------- le mot de passe facultatif (motif partagé) ----------
   Deux endroits produisent un fichier qu'on peut chiffrer : « Ma copie »
   dans Moi, et « Fichier » quand on donne. Ils le demandaient de deux
   façons différentes — un cadenas qui ouvrait une ligne EN DESSOUS d'un
   côté, une case « Chiffrer » suivie d'un libellé, d'un champ et d'une
   note de l'autre. Deux dessins pour la même question, et dans les deux
   cas la feuille grandissait sous le doigt.

   Un seul objet désormais : au repos un bouton compact « Chiffrer » ;
   tapé, il S'ÉTIRE en champ de saisie sur place, et l'action voisine se
   serre pour lui faire la place. La LIGNE ne change pas de hauteur, donc
   rien ne pousse ce qui est dessous — c'est ce qui rend l'ouverture
   lisible : on voit où va le doigt, pas une page qui saute.

   `action` (optionnel) est le bouton qui partage la ligne — « Ma copie »
   lui donne « Télécharger », « Fichier » n'en a pas (ses trois sorties
   sont au-dessus) et la commande prend alors toute la largeur. */
export function lockRowHTML({ id, action = '', mot = 'Chiffrer', invite = 'Mot de passe' }){
  return (
    `<div class="lockrow" id="${id}">
       ${action ? `<button class="btn btn-sm lr-do" id="${id}Do">${action}</button>` : ''}
       <div class="lr-pw">
         <button type="button" class="btn btn-sm lr-lock" id="${id}Lock" aria-pressed="false"
                 aria-controls="${id}Pass" aria-label="Protéger par un mot de passe"
                 >${ic('lock', 'ic-14')}<span class="lr-w">${mot}</span></button>
         <input id="${id}Pass" class="lr-pass" type="password" autocomplete="new-password"
                placeholder="${invite}" aria-label="${invite}" disabled>
       </div>
     </div>`);
}
/* Rend `{ on, value, node }` — `value()` vaut '' tant que le cadenas est
   fermé, donc l'appelant n'a jamais à se demander dans quel état il est.
   `onToggle` sert à ceux qui ont autre chose à montrer (l'avertissement
   « Perdu = irrécupérable » ne s'affiche que la serrure ouverte). */
export function bindLockRow(root, id, onToggle){
  const row = root.querySelector('#' + id);
  const lock = root.querySelector('#' + id + 'Lock');
  const pass = root.querySelector('#' + id + 'Pass');
  const set = on => {
    row.classList.toggle('on', on);
    lock.setAttribute('aria-pressed', String(on));
    pass.disabled = !on;
    /* fermé, le champ s'oublie : un mot de passe tapé puis renoncé ne
       doit pas repartir avec le fichier au clic suivant */
    if (on) pass.focus(); else pass.value = '';
    onToggle?.(on);
  };
  lock.addEventListener('click', () => set(!row.classList.contains('on')));
  /* Échap referme la serrure sans fermer la feuille qui la porte */
  pass.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ e.stopPropagation(); set(false); lock.focus(); }
  });
  return { node: row, on: () => row.classList.contains('on'), value: () => (row.classList.contains('on') ? pass.value : '') };
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

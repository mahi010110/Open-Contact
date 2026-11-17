/* ============================================================
   OpenContact · la nouvelle interface · la coque
   (docs/brief-refonte.md §4 ; docs/refonte-reprendre.md §8)

   Quatre onglets fixes, toujours à leur place : Trouver · Pistes ·
   Réseau · Moi. Au téléphone (moins de 901 px), l'onglet ouvre sa
   liste et une entreprise ou une piste est une PAGE poussée, avec un
   retour. Au poste, la liste et ce qu'on ouvre sont côte à côte, sous
   la rangée des onglets, au-dessus de la barre d'état — une fenêtre
   « 98 » posée sur le bureau.

   L'HISTORIQUE DU NAVIGATEUR EST LA SOURCE DE VÉRITÉ. Chaque entrée
   porte l'onglet et la pile de ses pages ({o, pile}) : le bouton retour
   du téléphone, le glissé depuis le bord d'iOS et le « précédent » du
   navigateur referment la page, pas l'écran ; une adresse (#/pistes)
   dit l'onglet. Chaque onglet garde sa pile et sa place, et le
   re-taper revient à sa racine, en haut.

   La coque ne connaît aucun écran : chaque onglet s'y inscrit
   (`inscrire`), chaque page aussi (`inscrirePage`).
   ============================================================ */
import { $, $$, ic, esc, annoncer, calme, remplacer } from './outils.js';
import { bus } from './etat.js';

export const ONGLETS = Object.freeze([
  Object.freeze({ id: 'trouver', mot: 'Trouver', icone: 'search' }),
  Object.freeze({ id: 'pistes', mot: 'Pistes', icone: 'briefcase' }),
  Object.freeze({ id: 'reseau', mot: 'Réseau', icone: 'users' }),
  Object.freeze({ id: 'moi', mot: 'Moi', icone: 'user' })
]);
/* les anciennes adresses mènent toujours quelque part : « Aujourd'hui »
   vit maintenant en tête de Pistes, « Échanger » est devenu Réseau */
const ANCIENNES = { aujourdhui: 'pistes', echanger: 'reseau' };

export const C = {
  poste: false,
  onglet: 'trouver',
  piles: { trouver: [], pistes: [], reseau: [], moi: [] },
  places: {},          /* la place de chaque onglet, le temps de la session */
  annule: null,
  vient: null          /* l'onglet qui vient de recevoir quelque chose : il s'allume une fois */
};
const VUES = {}, PAGES = {};
export const inscrire = (id, vue) => { VUES[id] = vue; };
export const inscrirePage = (t, page) => { PAGES[t] = page; };

let app, fen, nav, ecran, etatB, coucheA;
const mqPoste = matchMedia('(min-width:901px)');

/* ---------- l'adresse ---------- */
function ongletDe(hash){
  let r = String(hash || '').replace(/^#\/?/, '').replace(/[/?].*$/, '').toLowerCase();
  if (ANCIENNES[r]) r = ANCIENNES[r];
  return ONGLETS.some(o => o.id === r) ? r : '';
}
const pileDe = o => C.piles[o] || (C.piles[o] = []);
const entree = () => ({ oc: 1, o: C.onglet, pile: pileDe(C.onglet).map(p => ({ ...p })) });
const titreDoc = () => {
  const p = !C.poste && pileDe(C.onglet).slice(-1)[0];
  const t = p && PAGES[p.t] && PAGES[p.t].titre ? PAGES[p.t].titre(p) : ONGLETS.find(o => o.id === C.onglet).mot;
  document.title = t + ' — OpenContact';
};

/* ---------- aller ailleurs ---------- */
export function allerA(o, { remplacer: rempl = false } = {}){
  if (!VUES[o]) return;
  const meme = o === C.onglet;
  if (meme){
    /* re-taper l'onglet où l'on est : sa racine, en haut */
    const pile = pileDe(o);
    if (pile.length){ pile.length = 0; history.replaceState(entree(), '', '#/' + o); }
    C.places[o] = 0;
    rendre({ focus: 'titre' });
    const d = $('.defile', ecran);
    if (d) d.scrollTo({ top: 0, behavior: calme() ? 'auto' : 'smooth' });
    return;
  }
  garderPlace();
  C.onglet = o;
  if (rempl) history.replaceState(entree(), '', '#/' + o);
  else history.pushState(entree(), '', '#/' + o);
  rendre({ focus: 'titre' });
}
/* pousser une page (au téléphone) : une entrée d'historique à elle */
export function pousser(p, depuis){
  if (C.poste) return false;
  garderPlace();
  const d = { ...p };
  if (depuis) d.retour = cleDe(depuis);
  pileDe(C.onglet).push(d);
  history.pushState(entree(), '', location.href);
  rendre({ focus: 'page' });
  return true;
}
/* remplacer la page du dessus, sans nouvelle entrée */
export function remplacerPage(p){
  const pile = pileDe(C.onglet);
  if (!pile.length) return pousser(p);
  pile[pile.length - 1] = { ...pile[pile.length - 1], ...p };
  history.replaceState(entree(), '', location.href);
  rendre({ focus: 'page' });
}
export const retour = () => history.back();
export const pageOuverte = () => !C.poste && pileDe(C.onglet).slice(-1)[0] || null;

function garderPlace(){
  if (C.poste || pileDe(C.onglet).length) return;
  const d = $('.defile', ecran);
  if (d) C.places[C.onglet] = d.scrollTop;
}
const cleDe = el => el && el.getAttribute ? (el.getAttribute('data-a') || '') + '|' + (el.getAttribute('data-id') || '') : '';

/* ---------- le rendu ---------- */
function navHTML(){
  return ONGLETS.map(o => {
    const on = o.id === C.onglet;
    const mot = C.poste ? `<u>${o.mot[0]}</u>${o.mot.slice(1)}` : o.mot;
    const n = VUES[o.id] && VUES[o.id].compte ? VUES[o.id].compte() : '';
    return `<a href="#/${o.id}" data-a="onglet" data-id="${o.id}" class="${on ? 'on' : ''}${C.vient === o.id && !on ? ' vient' : ''}"${on ? ' aria-current="page"' : ''}`
      + `${C.poste ? ` aria-keyshortcuts="${o.mot[0]}"` : ''}>${ic(o.icone)}<span>${mot}${n ? `<b>${esc(n)}</b>` : ''}</span></a>`;
  }).join('');
}
let premierRendu = true;
export function rendre(o = {}){
  if (!ecran) return;
  remplacer(nav, navHTML());
  C.vient = null;
  const pile = pileDe(C.onglet);
  const p = !C.poste && pile.length ? pile[pile.length - 1] : null;
  const avant = ecran.dataset.cle || '';
  if (p) rendrePage(p);
  else rendreVue();
  const cle = ecran.dataset.cle;
  rendreEtat();
  poserAnnule();
  titreDoc();
  if (premierRendu){ premierRendu = false; return; }
  /* changer d'écran s'annonce : le focus va au titre de ce qu'on ouvre ;
     revenir d'une page le rend à la ligne qui l'avait ouverte */
  if (o.focus === 'page' && cle !== avant){
    const h = $('.s-page h4, .tb-t', ecran);
    if (h){ h.tabIndex = -1; h.focus({ preventScroll: true }); }
  } else if (o.focus === 'titre' || (o.focus === 'retour' && cle !== avant)){
    const r = o.retour && $$('[data-a]', ecran).find(x => cleDe(x) === o.retour);
    const h = r || $('h1, h2, h3', ecran);
    if (h){ if (!r) h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
}
function rendrePage(p){
  const P = PAGES[p.t];
  if (!P) return;
  const x = P.rendre(p) || {};
  const cle = 'page:' + p.t + ':' + (p.id || '');
  if (ecran.dataset.cle !== cle){
    ecran.className = 'ecran page';
    ecran.innerHTML = `<div class="tb"><button class="ret" data-a="retour" aria-label="Retour">${ic('arrow-left')}</button>`
      + `<span class="tb-t">${esc(x.titre || (P.titre ? P.titre(p) : ''))}</span></div>`
      + `<div class="defile">${x.corps || ''}</div><div class="pied"${x.pied ? '' : ' hidden'}>${x.pied || ''}</div>`;
    ecran.dataset.cle = cle;
    if (!calme()){ ecran.classList.remove('pousse'); void ecran.offsetWidth; ecran.classList.add('pousse'); }
  } else {
    remplacer($('.defile', ecran), x.corps || '');
    const pied = $('.pied', ecran);
    pied.hidden = !x.pied;
    remplacer(pied, x.pied || '');
  }
  if (P.apres) P.apres(p, ecran);
}
function rendreVue(){
  const v = VUES[C.onglet];
  const cle = 'vue:' + C.onglet + (C.poste ? ':poste' : '');
  const premier = ecran.dataset.cle !== cle;
  if (premier){ ecran.className = 'ecran'; ecran.innerHTML = ''; ecran.dataset.cle = cle; }
  v.rendre(ecran, { poste: C.poste, premier });
  if (premier && !C.poste){
    const d = $('.defile', ecran);
    if (d && C.places[C.onglet]) d.scrollTop = C.places[C.onglet];
  }
}
function rendreEtat(){
  if (!C.poste){ etatB.innerHTML = ''; return; }
  const v = VUES[C.onglet];
  const hl = navigator.onLine === false ? '<span class="hl-e">Hors ligne</span>' : '';
  remplacer(etatB, hl + (v && v.etat ? v.etat() : ''));
}
/* les touches qu'un écran sait, dites dans la barre d'état */
export function cles(liste){
  const l = liste.filter(Boolean);
  if (!l.length) return '';
  return '<span class="aide-k">' + l.map(([touches, mot]) => touches.map(t => `<kbd>${esc(t)}</kbd>`).join('')
    + `<span>${esc(mot)}</span>`).join('') + '</span>';
}

/* ---------- « Annuler », et le retour discret ----------
   Un geste lourd se rattrape trente secondes (invariant ②) ; la barre
   le dit, et la région vivante le lit à qui n'a pas l'écran. Un retour
   sans annulation ne passe que si l'écran ne le dit pas déjà. */
let tA = null;
export function annuler(texte, defaire){
  C.annule = { texte, defaire: defaire || null };
  clearTimeout(tA);
  tA = setTimeout(() => { C.annule = null; poserAnnule(); }, defaire ? 30000 : 3400);
  poserAnnule();
  annoncer(texte + (defaire ? '. Tu peux annuler.' : ''));
}
export const toast = texte => annuler(texte, null);
function poserAnnule(){
  const a = C.annule;
  if (!a){ coucheA.innerHTML = ''; return; }
  coucheA.innerHTML = `<div class="annule"><span>${esc(a.texte)}</span>`
    + (a.defaire ? '<button data-a="annuler">Annuler</button>' : '')
    + (C.poste ? `<button class="x" data-a="fermer-annule" aria-label="Fermer">${ic('close')}</button>` : '') + '</div>';
  /* elle se pose AU-DESSUS de ce qu'on touche : le pied d'une page, la
     barre des onglets au téléphone, la barre d'état au poste */
  const b = $('.annule', coucheA);
  const hauts = $$('.ecran .pied:not([hidden])', fen).map(e => e.getBoundingClientRect().top)
    .concat([(C.poste ? etatB : nav).getBoundingClientRect().top]).filter(t => t > 0);
  b.style.bottom = (innerHeight - Math.min(...hauts) + 10) + 'px';
}
function fermerAnnule(){ clearTimeout(tA); C.annule = null; poserAnnule(); }

/* ---------- le glissé d'une ligne (au doigt) ----------
   Une ligne `.gl[data-g]` glissée vers la gauche fait son geste
   (« Pas pour moi ») ; elle suit le doigt. `touchcancel` ramène au même
   repos que `touchend`, et `touchstart` remet au repos avant de
   commencer : une ligne ne reste jamais coincée de travers. */
let g = null;
function repos(){ if (g && g.r){ g.r.classList.remove('tire'); g.r.style.transform = ''; } g = null; }
function brancherGlisse(){
  app.addEventListener('touchstart', ev => {
    repos();
    const gl = ev.target.closest('.gl[data-g]');
    if (!gl || ev.touches.length !== 1) return;
    g = { gl, r: $('.rang', gl), x: ev.touches[0].clientX, y: ev.touches[0].clientY, dx: 0, h: null };
  }, { passive: true });
  app.addEventListener('touchmove', ev => {
    if (!g) return;
    const dx = ev.touches[0].clientX - g.x, dy = ev.touches[0].clientY - g.y;
    if (g.h === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) g.h = Math.abs(dx) > Math.abs(dy);
    if (!g.h){ if (g.h === false) repos(); return; }
    g.dx = Math.min(0, dx);
    g.r.classList.add('tire');
    g.r.style.transform = `translateX(${g.dx}px)`;
  }, { passive: true });
  app.addEventListener('touchend', () => {
    if (!g) return;
    const gl = g.gl, loin = g.dx < -96;
    repos();
    if (loin) geste(gl.getAttribute('data-g'), gl, null);
  });
  app.addEventListener('touchcancel', repos);
}

/* ---------- les gestes ----------
   `data-a` dit le geste, `data-id` l'objet. La coque prend les siens
   (onglets, retour, annuler), puis la page ouverte, puis l'onglet. */
function geste(a, el, ev){
  const pile = pileDe(C.onglet);
  const p = !C.poste && pile.length ? pile[pile.length - 1] : null;
  if (p && PAGES[p.t] && PAGES[p.t].geste && PAGES[p.t].geste(a, el, ev, p) !== false) return;
  const v = VUES[C.onglet];
  if (v && v.geste) v.geste(a, el, ev);
}
function brancherGestes(){
  app.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]');
    if (!b || !app.contains(b)) return;
    const a = b.getAttribute('data-a');
    if (a === 'onglet'){
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;   /* ouvrir ailleurs : le lien fait son travail */
      ev.preventDefault();
      allerA(b.getAttribute('data-id'));
      return;
    }
    if (a === 'retour'){ retour(); return; }
    if (a === 'annuler'){ const d = C.annule && C.annule.defaire; fermerAnnule(); if (d){ d(); rendre(); } return; }
    if (a === 'fermer-annule'){ fermerAnnule(); return; }
    geste(a, b, ev);
  });
  /* une ligne qui se tape se joue aussi au clavier : Entrée et Espace */
  app.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[role="button"][data-a]')){
      ev.preventDefault();
      ev.target.click();
    }
  });
  /* la barre « Annuler » se balaie au doigt */
  let bx = null;
  coucheA.addEventListener('touchstart', ev => { bx = ev.touches.length === 1 ? ev.touches[0].clientX : null; }, { passive: true });
  coucheA.addEventListener('touchend', ev => {
    if (bx == null) return;
    const dx = (ev.changedTouches[0] || {}).clientX - bx;
    bx = null;
    if (Math.abs(dx) > 60 && !ev.target.closest('button')) fermerAnnule();
  });
  coucheA.addEventListener('touchcancel', () => { bx = null; });
}

/* ---------- le clavier du poste ----------
   Une lettre ne vit que hors d'un champ : la lettre soulignée de chaque
   onglet. Le reste appartient à l'écran ouvert (↑ ↓, « / », Échap…). */
function brancherClavier(){
  document.addEventListener('keydown', ev => {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const t = ev.target;
    const champ = !!(t && t.matches && t.matches('input, textarea, select, [contenteditable="true"]'));
    const v = VUES[C.onglet];
    if (v && v.clavier && v.clavier(ev, { champ, poste: C.poste })) return;
    if (champ) return;
    if (C.poste && ev.key.length === 1){
      const o = ONGLETS.find(x => x.mot[0].toLowerCase() === ev.key.toLowerCase());
      if (o){ ev.preventDefault(); allerA(o.id); return; }
    }
    if (ev.key === 'Escape' && pageOuverte()){ ev.preventDefault(); retour(); }
  });
}

/* ---------- démarrer ---------- */
export function demarrer(){
  app = $('#oc');
  fen = $('.fen', app);
  nav = $('.onglets', app);
  ecran = $('.ecran', app);
  etatB = $('.p-etat', app);
  coucheA = $('.couche-a', app);
  C.poste = mqPoste.matches;
  document.documentElement.classList.toggle('poste', C.poste);
  bus.refresh = () => rendre();
  bus.avertir = mal => { const w = $('#avertir'); if (w) w.hidden = !mal; };
  /* l'adresse de départ : l'onglet qu'elle nomme, sinon Trouver */
  const h = location.hash;
  const o0 = ongletDe(h) || 'trouver';
  C.onglet = o0;
  const st = history.state;
  if (st && st.oc && st.o === o0 && Array.isArray(st.pile)) C.piles[o0] = st.pile;
  history.replaceState(entree(), '', location.pathname + location.search + '#/' + o0);
  addEventListener('popstate', ev => {
    const s = ev.state;
    const o = (s && s.oc && s.o) || ongletDe(location.hash) || 'trouver';
    const avant = pileDe(C.onglet).slice(-1)[0];
    garderPlace();
    C.onglet = o;
    C.piles[o] = (s && s.oc && Array.isArray(s.pile)) ? s.pile : [];
    rendre({ focus: 'retour', retour: avant && avant.retour });
  });
  mqPoste.addEventListener('change', () => {
    C.poste = mqPoste.matches;
    document.documentElement.classList.toggle('poste', C.poste);
    ecran.dataset.cle = '';
    rendre();
  });
  addEventListener('online', () => rendre());
  addEventListener('offline', () => rendre());
  brancherGestes();
  brancherGlisse();
  brancherClavier();
  rendre();
}

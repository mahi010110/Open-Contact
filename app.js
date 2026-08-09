/* ============================================================
   OpenContact v6 — amorçage & routeur
   Quatre zones : Aujourd'hui · Mes pistes · Échanger · Moi.
   Ce fichier ne fait que démarrer (chargement, thème, service
   worker) et router ; chaque écran vit dans ui/, le moteur dans
   engine/ — il ne lit jamais l'écran. Auto-tests : ?test.
   ============================================================ */
import { APP_VERSION } from './engine/model.js';
import { THEME_KEY, kvInit, kvGet, kvSet } from './engine/storage.js';
import { initVerrou } from './ui/verrou.js';
import { S, bus, loadAll, reloadFromStorage } from './ui/state.js';
import { $, $$, toast, installFoldMotion, sheetOpen } from './ui/dom.js';
import { renderToday } from './ui/today.js';
import { renderPistes } from './ui/pistes.js';
import { renderEchanger } from './ui/echanger.js';
import { renderMoi } from './ui/moi.js';
import { openCapture } from './ui/capture.js';
import { downloadBackup, closeReglages } from './ui/moi.js';
import { initSyncLive } from './ui/synclive.js';
import { COMPAGNON, CAMPAGNES } from './ui/perimetre.js';

const VIEWS = {
  aujourdhui: renderToday,
  pistes: renderPistes,
  echanger: renderEchanger,
  moi: renderMoi
};

function routeFromHash(){
  const r = (location.hash || '').replace(/^#\/?/, '');
  return VIEWS[r] ? r : 'aujourdhui';
}
function render(){
  /* un autre onglet a écrit pendant qu'une feuille était ouverte :
     on recharge maintenant que la voie est libre */
  if (S.stale && !sheetOpen()){ reloadFromStorage(); return; }
  for (const k in VIEWS) $('#view-' + k).hidden = (k !== S.route);
  VIEWS[S.route]();
  $$('[data-r]').forEach(a => {
    const on = a.dataset.r === S.route;
    a.classList.toggle('on', on);
    if (a.closest('nav')) a.setAttribute('aria-current', on ? 'page' : 'false');
  });
}
/* Chaque onglet garde sa place. Mesuré : trente pistes, on descend à
   900 px, on passe dans « Moi », on revient — et on était remonté tout
   en haut. Une barre d'onglets promet qu'on retrouve les choses où on
   les a laissées ; c'est ce qui distingue un onglet d'un lien.
   La place se garde le temps de la session seulement : rouvrir l'app
   le lendemain doit repartir du début, pas d'un défilement oublié. */
const places = Object.create(null);
let routePrec = null;
/* Changer d'onglet remplace tout l'écran, et l'app n'en disait rien : le
   titre du document restait le même sur les quatre zones (l'historique du
   navigateur affichait donc quatre fois la même ligne), et le curseur de
   lecture ne bougeait pas — au lecteur d'écran, taper « Mes pistes »
   n'annonçait rien du tout et il fallait balayer en arrière pour trouver
   le nouveau contenu. On dit donc les deux : le titre suit la route, et le
   focus se pose sur le titre de l'écran (`preventScroll` : la place gardée
   par l'onglet est déjà remise, elle ne doit pas sauter). Le contour ne
   s'allume pas — l'app ne dessine que `:focus-visible`, et un focus posé
   par le programme n'en est pas un. */
const TITRES = { aujourdhui: 'Aujourd’hui', pistes: 'Mes pistes', echanger: 'Échanger', moi: 'Moi' };
let premierRendu = true;
function applyRoute(){
  const suivante = routeFromHash();
  /* Même onglet : c'est un re-tap, pas un changement de zone. On ne
     relit SURTOUT pas la position courante — la sauver ici écraserait
     le zéro que `auSommet` vient de poser, et le re-tap ne remonterait
     jamais. (`#pistes` et `#/pistes` désignent la même route : le hash
     change, la route non.) */
  const memeOnglet = suivante === routePrec;
  if (!memeOnglet && routePrec){
    const v = $('#view-' + routePrec);
    if (v) places[routePrec] = v.scrollTop;
  }
  S.route = suivante;
  routePrec = suivante;
  render();
  const v = $('#view-' + suivante);
  /* après le rendu : `render()` réécrit le contenu, donc toute position
     posée avant serait effacée */
  if (v) v.scrollTop = memeOnglet ? 0 : (places[suivante] || 0);
  document.title = TITRES[suivante] + ' — OpenContact';
  /* pas au démarrage : personne n'a rien demandé, et voler le focus
     avant que l'utilisateur ait touché quoi que ce soit ne s'annonce
     à personne */
  if (!premierRendu){
    const h = v && v.querySelector('h2');
    if (h){ h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  premierRendu = false;
}
/* retaper l'onglet où l'on EST déjà remonte en haut — le geste attendu
   partout, et le seul moyen de revenir à la racine d'une longue liste
   sans la remonter au pouce. */
export function auSommet(route){
  const v = $('#view-' + route);
  if (!v) return;
  /* rien à écrire dans `places` : la position ne s'y enregistre qu'en
     QUITTANT l'onglet, et elle est relue en direct à ce moment-là. Une
     mise à zéro ici a été essayée puis retirée — une mutation a montré
     qu'elle ne changeait aucun résultat, elle était morte. */
  v.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
}
bus.refresh = render;

function applyTheme(t, persist){
  S.theme = t;
  document.documentElement.dataset.theme = t;
  $('#metaTheme').content = (t === 'dark') ? '#1E232B' : '#F7F6F1';
  if (persist) kvSet(THEME_KEY, t);
  /* miroir synchrone pour `theme.js`, qui doit décider AVANT le premier
     pixel et ne peut donc pas attendre IndexedDB. On l'écrit à chaque
     application, pas seulement en persistance : le repli système fait
     lui aussi foi pour le lancement suivant. Valeur sans rien de privé,
     même clé — un échec (navigation privée) est sans conséquence. */
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
}

(async function init(){
  console.info('OpenContact', APP_VERSION);
  /* le thème d'abord (l'écran verrouillé doit être du bon côté),
     puis le verrou s'il existe — RIEN ne se charge avant lui */
  await kvInit();
  const t0 = await kvGet(THEME_KEY);
  applyTheme((t0 === 'light' || t0 === 'dark') ? t0
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
  /* un seul écouteur pour TOUTES les sections repliables, posé avant que
     le premier écran se dessine (ui/dom.js) */
  installFoldMotion();
  await initVerrou();
  await loadAll();
  /* quatre chargements indépendants : en parallèle, pas en file — chaque
     aller-retour IndexedDB sérialisé se paierait au démarrage */
  await Promise.all([
    import('./ui/connexions.js').then(m => m.loadMail()).catch(() => {}),
    CAMPAGNES ? import('./ui/campagnes.js').then(m => m.loadCampaigns()).catch(() => {}) : null,
    COMPAGNON ? import('./ui/analyse.js').then(m => m.loadMailAnalysis()).catch(() => {}) : null,
    COMPAGNON ? import('./ui/propositions.js').then(m => m.loadProposals()).catch(() => {}) : null
  ]);
  applyTheme(S.theme, false);
  $('#sbVer').textContent = APP_VERSION;

  /* demander au navigateur de ne jamais purger le stockage (Safari
     efface sinon les données d'un site non visité depuis 7 jours) */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* navigation */
  window.addEventListener('hashchange', applyRoute);
  /* retaper l'onglet où l'on est déjà remonte à sa racine — le hash ne
     change pas, donc `hashchange` ne suffit pas. Aujourd'hui c'est
     « Moi » qui en a besoin : ça referme Réglages depuis la zone la plus
     facile du pouce, au lieu du chevron coincé en haut à gauche. */
  $$('[data-r]').forEach(a => a.addEventListener('click', () => {
    if (a.dataset.r === 'moi' && S.route === 'moi') closeReglages();
    /* même onglet, deuxième tap : on remonte. Après `closeReglages()`,
       qui a pu changer ce qui est à l'écran. */
    if (a.dataset.r === S.route) auSommet(S.route);
  }));
  $('#btnTheme').addEventListener('click', () => applyTheme(S.theme === 'dark' ? 'light' : 'dark', true));
  $('#bnAdd').addEventListener('click', () => openCapture());
  $('#btnAddTop').addEventListener('click', () => openCapture());
  $('#swCopy').addEventListener('click', () => downloadBackup());   /* secours : brut, sans question */

  /* clavier : « / » saute à la recherche des pistes */
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (sheetOpen()) return;
    e.preventDefault();
    if (S.route !== 'pistes') location.hash = '#/pistes';
    setTimeout(() => { try { $('#piQ').focus(); } catch (x) {} }, 60);
  });

  applyRoute();

  /* sync appareils : si une phrase de liaison existe, l'app rejoint la
     salle en arrière-plan et y RESTE — différé pour un démarrage net */
  setTimeout(() => { initSyncLive().catch(() => {}); }, 2000);

  /* propositions de l'assistant IA (Compagnon associé) : rapportées en
     arrière-plan, sobrement — rien ne s'ajoute sans l'aperçu */
  if (COMPAGNON) setTimeout(() => {
    import('./ui/propositions.js').then(m => m.startProposalsLoop()).catch(() => {});
  }, 2500);

  /* partage entrant (PWA share_target) : « Partager » depuis LinkedIn ou
     le navigateur → capture pré-remplie ; les params sont consommés puis
     retirés de l'URL pour ne pas rejouer au rechargement */
  const sp = new URLSearchParams(location.search);
  if (sp.has('title') || sp.has('text') || sp.has('url')){
    const text = sp.get('text') || '';
    const website = sp.get('url') || (text.match(/https?:\/\/\S+/) || [''])[0];
    let name = (sp.get('title') || '')
      .replace(/\s*[|–—-]\s*(LinkedIn|Indeed|Glassdoor|Welcome to the Jungle|HelloWork).*$/i, '').trim();
    if (!name) name = text.replace(website, '').trim().split('\n')[0].slice(0, 80).trim();
    const desc = text.replace(website, '').trim().slice(0, 300);
    ['title', 'text', 'url'].forEach(k => sp.delete(k));
    history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : '') + location.hash);
    openCapture({ name, website, desc: desc !== name ? desc : '' });
  }

  /* PWA : hors-ligne après la première visite — enregistré en dernier,
     zéro impact sur le démarrage */
  if ('serviceWorker' in navigator){
    /* Une version neuve pouvait rester invisible indéfiniment : rien ne
       DEMANDAIT la mise à jour, on attendait que le navigateur y pense —
       ce qu'une app posée sur l'écran d'accueil ne provoque presque
       jamais, faute de navigation. Et même une fois le nouveau service
       worker actif, la page continuait de tourner sur le code déjà
       chargé : il fallait deviner qu'il fallait rouvrir, deux fois.
       Désormais on demande à chaque ouverture et à chaque retour dans
       l'app, et quand le nouveau prend la main on relit la page une
       seule fois. La mise à jour arrive donc à la PREMIÈRE ouverture. */
    const avaitUnSW = !!navigator.serviceWorker.controller;
    let relu = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      /* à la toute première visite il n'y avait pas de contrôleur : la
         page est déjà la bonne, la relire ne servirait à rien */
      if (!avaitUnSW || relu) return;
      relu = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(reg => {
      const demander = () => reg.update().catch(() => {});
      demander();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) demander(); });
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          /* le rechargement suit tout seul — on annonce, on n'ordonne pas */
          if (w.state === 'installed' && navigator.serviceWorker.controller)
            toast('Nouvelle version — un instant.');
        });
      });
    }).catch(() => {});
  }

  if (new URLSearchParams(location.search).has('test')){
    Promise.all([import('./tests.js'), import('./tests-c8.js'), import('./tests-mcp.js')])
      .then(async ([base, c8, mcp]) => [...await base.runSelfTests(), ...await c8.runC8Tests(), ...await mcp.runMcpTests()])
      .then(R => {
      window.__ocTests = R;
      const ko = R.filter(r => r.résultat !== '✓').length;
      toast(ko ? `Auto-tests : ${ko} échec(s) sur ${R.length} — détails en console`
               : `Auto-tests : ${R.length}/${R.length} OK ✓`);
      });
  }
})();

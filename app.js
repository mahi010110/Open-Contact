/* ============================================================
   OpenContact v6 — amorçage & routeur
   Quatre zones : Aujourd'hui · Mes pistes · Réseau · Moi.
   Ce fichier ne fait que démarrer (chargement, thème, service
   worker) et router ; chaque écran vit dans ui/, le moteur dans
   engine/ — il ne lit jamais l'écran. Auto-tests : ?test.
   ============================================================ */
import { APP_VERSION } from './engine/model.js';
import { THEME_KEY, kvInit, kvGet } from './engine/storage.js';
import { initVerrou } from './ui/verrou.js';
import { S, bus, loadAll, reloadFromStorage, choisirTheme } from './ui/state.js';
import { $, $$, toast, installFoldMotion, sheetOpen } from './ui/dom.js';
import { renderToday } from './ui/today.js';
import { renderPistes } from './ui/pistes.js';
import { renderEchanger } from './ui/echanger.js';
import { chargerFils, rangsBoite } from './ui/conversations.js';
import { attendOnglet } from './engine/conversations.js';
import { chargerGroupes } from './ui/groupes.js';
import { renderMoi } from './ui/moi.js';
import { openCapture } from './ui/capture.js';
import { downloadBackup, closeReglages } from './ui/moi.js';
import { ecouterInstallation } from './ui/installer.js';
import { initSyncLive } from './ui/synclive.js';
import { ORDINATEUR, CAMPAGNES } from './ui/perimetre.js';
import { destination, titreDe, navigation } from './engine/destinations.js';
import { installerClavier, poserEnTete, lettresCoupees } from './ui/clavier.js';

/* tôt, avant tout `await` : Chrome peut signaler l'installation dès le
   chargement, et un écouteur posé après aurait manqué l'événement */
ecouterInstallation();

const VIEWS = {
  aujourdhui: renderToday,
  pistes: renderPistes,
  /* « Réseau » (R1, décision 0002) a pris la place d'« Échanger » : son
     ancienne adresse y mène (engine/destinations.js) */
  reseau: renderEchanger,
  moi: renderMoi
};

/* Le registre des destinations (engine/destinations.js) dit où mène une
   adresse — y compris une ANCIENNE, le jour où un écran déménage. Une
   adresse redirigée est réécrite sur place (`replaceState`) : la barre
   d'adresse dit où l'on est, et le retour ne repasse pas par l'ancienne.
   `#/echanger` mène à « Réseau ». */
function routeFromHash(){
  const { id, ancienne } = destination(location.hash, navigation());
  if (ancienne) history.replaceState(history.state, '', location.pathname + location.search + '#/' + id);
  return id;
}
function render(){
  /* un autre onglet a écrit pendant qu'une feuille était ouverte :
     on recharge maintenant que la voie est libre */
  if (S.stale && !sheetOpen()){ reloadFromStorage(); return; }
  for (const k in VIEWS) $('#view-' + k).hidden = (k !== S.route);
  VIEWS[S.route]();
  /* « Réseau » change de couleur quand quelque chose y attend — pas de
     chiffre, pas de notification (engine/conversations.js). Là où l'on
     est déjà, la liste le montre : l'onglet se tait. */
  const attend = attendOnglet(rangsBoite());
  $$('[data-r]').forEach(a => {
    const on = a.dataset.r === S.route;
    a.classList.toggle('on', on);
    if (a.closest('nav')) a.setAttribute('aria-current', on ? 'page' : 'false');
    if (a.dataset.r === 'reseau' && a.closest('nav')){
      const signe = attend && !on;
      a.classList.toggle('attend', signe);
      /* la couleur ne suffit pas à tout le monde (WCAG 1.4.1) : le nom
         de l'onglet le dit aussi */
      if (signe) a.setAttribute('aria-label', 'Réseau, du nouveau');
      else if (a.closest('.bottomnav')) a.setAttribute('aria-label', 'Réseau');
      else a.removeAttribute('aria-label');
    }
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
  document.title = titreDe(suivante) + ' — OpenContact';
  /* pas au démarrage : personne n'a rien demandé, et voler le focus
     avant que l'utilisateur ait touché quoi que ce soit ne s'annonce
     à personne */
  if (!premierRendu){
    const h = v && v.querySelector('h1');
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

/* LE + CRÉE (décision 0008, 29 octobre 2026 : « le + a perdu son
   sens »). Il ouvrait une feuille « Ajouter » dont le corps disait
   « Recevoir » et dont la piste attendait au pied : le geste le plus
   fréquent de l'app à deux taps, derrière ce qu'un camarade te tend.
   Un + ajoute UNE chose, la plus probable — une piste — et la touche N
   dit la même chose que le bouton qui la porte. Ce qu'on reçoit est
   parti dans « Réseau », à côté de « Donner ». */
async function ajouter(){
  (await import('./ui/capture.js')).openCapture();
}

(async function init(){
  console.info('OpenContact', APP_VERSION);
  /* le thème d'abord (l'écran verrouillé doit être du bon côté),
     puis le verrou s'il existe — RIEN ne se charge avant lui */
  await kvInit();
  choisirTheme(await kvGet(THEME_KEY), false);
  /* un seul écouteur pour TOUTES les sections repliables, posé avant que
     le premier écran se dessine (ui/dom.js) */
  installFoldMotion();
  await initVerrou();
  await loadAll();
  /* sept chargements indépendants : en parallèle, pas en file — chaque
     aller-retour IndexedDB sérialisé se paierait au démarrage. Les
     conversations avec mes amis en sont : l'onglet « Échanger » compte
     ce qui n'est pas lu dès le premier écran. */
  await Promise.all([
    import('./ui/connexions.js').then(m => m.loadMail()).catch(() => {}),
    import('./ui/messages.js').then(m => m.chargerMessages()).catch(() => {}),
    /* et mes groupes, et ce que j'ai réglé sur chaque conversation : le
       chiffre de l'onglet « Échanger » se lit dès le premier écran */
    chargerGroupes(),
    chargerFils(),
    /* les mails commencés (R3) : le composeur les reprend à l'ouverture */
    import('./ui/brouillons.js').then(m => m.chargerBrouillons()).catch(() => {}),
    CAMPAGNES ? import('./ui/campagnes.js').then(m => m.loadCampaigns()).catch(() => {}) : null,
    ORDINATEUR ? import('./ui/analyse.js').then(m => m.loadMailAnalysis()).catch(() => {}) : null,
    ORDINATEUR ? import('./ui/propositions.js').then(m => m.loadProposals()).catch(() => {}) : null
  ]);
  choisirTheme(S.themeChoix, false);
  $('#sbVer').textContent = APP_VERSION;

  /* demander au navigateur de ne jamais purger le stockage (Safari
     efface sinon les données d'un site non visité depuis 7 jours) */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* le clavier d'un téléphone ne couvre pas les feuilles (lot D) */
  import('./ui/zone-visible.js').then(m => m.suivreZoneVisible()).catch(() => {});
  /* TOUS LES MÉTIERS (lot R9-b) : la table du ROME se lit au calme, trois
     secondes après le démarrage — jamais avant le premier écran */
  setTimeout(() => import('./ui/metiers.js').then(m => m.chargerMetiers()).catch(() => {}), 3000);

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
  $('#bnAdd').addEventListener('click', ajouter);
  $('#btnAddTop').addEventListener('click', ajouter);
  /* LE CLAVIER AU POSTE (lot R8) : « Chercher » et sa touche dans
     l'en-tête, et N écrite dans « Ajouter » */
  poserEnTete();
  $('#swCopy').addEventListener('click', () => downloadBackup());   /* secours : brut, sans question */

  /* clavier : « / » saute à la recherche des pistes */
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (lettresCoupees()) return;     /* WCAG 2.1.4 : coupées dans Réglages */
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (sheetOpen()) return;
    e.preventDefault();
    if (S.route !== 'pistes') location.hash = '#/pistes';
    setTimeout(() => { try { $('#piQ').focus(); } catch (x) {} }, 60);
  });

  installerClavier();
  applyRoute();

  /* sync appareils : si une phrase de liaison existe, l'app rejoint la
     salle en arrière-plan et y RESTE — différé pour un démarrage net */
  setTimeout(() => { initSyncLive().catch(() => {}); }, 2000);

  /* la boîte aux lettres de mes amis (lot 3) : relevée seulement si j'ai
     donné mon QR — sans clé, personne ne peut m'écrire, rien ne part */
  setTimeout(() => {
    import('./ui/reseau.js').then(m => m.demarrerReseau()).catch(() => {});
  }, 2200);

  /* UN SEUL MOI (lot R5) : la copie scellée se redépose sur les relais
     si elle a changé — seulement s'il y a une phrase de secours ; sans
     elle, rien ne part */
  setTimeout(() => {
    import('./ui/moi-phrase.js').then(m => m.demarrerMoi()).catch(() => {});
  }, 4000);

  /* mes groupes (lot 5) : relevés seulement si j'en ai un — sans groupe,
     rien ne part */
  setTimeout(() => {
    import('./ui/groupes.js').then(m => m.demarrerGroupes()).catch(() => {});
  }, 2300);

  /* propositions de l'assistant IA (Ordinateur associé) : rapportées en
     arrière-plan, sobrement — rien ne s'ajoute sans l'aperçu */
  if (ORDINATEUR) setTimeout(() => {
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

/* ============================================================
   OpenContact — interface · « Aujourd'hui »
   (la refonte — « l'app fait le travail », fiche 0014)

   L'écran répond à UNE question : « je fais quoi maintenant ? »
   (CLAUDE.md §1). Il le faisait par tranches — En retard, Aujourd'hui,
   Sans nouvelles, Par où commencer — et trois icônes muettes par ligne :
   c'était à l'étudiant de lire l'état de chaque piste et d'en déduire le
   geste. Maintenant c'est l'app qui le dit.

   UNE FILE, PAS DES TRANCHES. `aFaire` (engine/etape.js) rend la liste
   dans l'ordre : ce qui est dû (le plus en retard d'abord), la suite
   d'un contrat décroché, les pistes qui se taisent, puis trois pistes
   par où commencer. Une ligne = une piste, sa prochaine étape, et UN
   bouton nommé qui la fait.

   CINQ PARTIS PRIS, chacun tiré de ce qu'on a lu
   (reports/Accompagner la recherche de stage.md) :
   1. UNE SEULE EMPHASE. Le bouton de la première ligne est le seul
      rempli : c'est la réponse à la question de l'écran. Les autres sont
      des boîtes 98 claires (§6, « une seule action remplie par vue »).
   2. TOUT CE QUI EST ENGAGÉ SE MONTRE, ce que l'app PROPOSE complète
      jusqu'à trois lignes — vingt-quatre pistes à démarrer ne font pas
      vingt-quatre décisions (§6, « choisir à la place de l'utilisateur »).
   3. LE PLAN EST CONTINGENT. « Bientôt » ne liste pas que les dates
      posées : une piste qui attend une réponse y dit « Relancer si pas
      de réponse », au jour où la relance viendra. Un plan « si… alors »
      fait mieux qu'un rappel (Gollwitzer & Sheeran, 2006 ; Abel et al.,
      2019).
   4. REVENIR NE COÛTE RIEN. Après une semaine sans geste, la file
      s'appelle « Pour reprendre », tient en trois lignes et ne compte
      plus les jours de retard : une dette affichée fait décrocher
      (`enPause`, engine/suivi.js).
   5. CE QUE L'APP FAIT SEULE, ELLE LE DIT. Une piste rangée après 45
      jours de silence s'annonce ici, avec « Annuler » (invariant ②).

   DEUX DESSINS (« le PC et le tel sont deux choses différentes ») : au
   pouce, une colonne — la cible, la file, puis « Bientôt » replié ; au
   poste, deux zones — le travail à gauche, le contexte à droite (la
   cible, « Bientôt » déplié), comme un volet d'appui.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { RECHERCHES, resumeRecherche } from '../engine/model.js';
import { aFaire } from '../engine/etape.js';
import { annonces } from '../engine/rangement.js';
import { enPause } from '../engine/suivi.js';
import { metierDuProfil, METIER } from '../engine/requete.js';
import { amorces } from '../engine/commande.js';
import { portesDuJour } from './amis.js';
import { lignesAmis, ouvrirLigne, peutDemanderAmis } from './reseau.js';
import { ecritsDuJour, ouvrirNonLus } from './conversations.js';
import { S, bus, hasDemo, addDemo, removeDemo, saveProfile } from './state.js';
import { $, ic, openSheet, voirAutres } from './dom.js';
import { frToday, frDate, dueMarkHTML, silenceMarkHTML } from './dates.js';
import { reportAction } from './actions.js';
import { openFiche } from './fiche.js';
import { openCapture } from './capture.js';
import { faireEtape, marquerFait, annulerRangement } from './gestes.js';
import { campaignLines, openCampaignById } from './campagnes.js';
import { mailAnalysis } from './analyse.js';
import { openPendingMailAnalysis } from './recevoir.js';
import { ouvrirSur } from './pistes.js';
import { pendingProposals, openPendingProposals } from './propositions.js';
import { ORDINATEUR, CAMPAGNES } from './perimetre.js';

const CAP = 8;                      /* lignes de « Bientôt » avant « voir plus » */
const FILE = 3;                     /* ce que l'app propose complète jusqu'à trois lignes */
const expanded = new Set();         /* ce qu'on a déplié à la main (le temps de la session) */

const mqWide = matchMedia('(min-width:901px)');
mqWide.addEventListener('change', () => { if (S.route === 'aujourdhui') renderToday(); });

function doneTodayCount(){
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return S.journal.filter(e => e.t >= +start &&
    (e.txt.startsWith('Fait :') || e.txt.startsWith('Email envoyé') || e.txt.startsWith('Clôturée'))).length;
}
/* pistes arrivées par partage aujourd'hui — le petit accès « reçu de la promo » */
function receivedTodayCount(){
  const today = todayISO();
  return S.companies.filter(c =>
    (c.history || []).some(h => h.t === 'Reçue via partage' && h.d === today)).length;
}

/* ---------- la cible ----------
   « Ma recherche » ouvre l'écran : ce que je cherche, où, pour quand —
   le début du parcours (docs/refonte.md), et ce qui règle le reste (les
   entreprises proposées, le mail, la suite d'un contrat). Tant qu'elle
   n'est pas dite, trois puces la demandent d'un tap : pas un formulaire,
   la première décision. Dite, elle tient en deux lignes et s'ouvre sur
   le profil. */
function cibleHTML(){
  const p = S.profile;
  const r = RECHERCHES[p.recherche];
  if (!r){
    return `<div class="aj-cible aj-cible-vide" role="group" aria-labelledby="ajCibleQ">
              <b id="ajCibleQ">Tu cherches</b>
              <div class="datechips">${Object.keys(RECHERCHES).map(k =>
                `<button class="dchip" data-cherche="${k}">${RECHERCHES[k].label}</button>`).join('')}</div>
            </div>`;
  }
  const m = metierDuProfil(p);
  const metier = m && METIER[m] && !/[\/]/.test(METIER[m].label) ? ' en ' + METIER[m].label.toLowerCase() : '';
  const titre = [r.label + metier, p.ville].filter(Boolean).join(' · ');
  const periode = resumeRecherche(p).slice(r.label.length).replace(/^\s*·\s*/, '');
  const sous = [p.formation, periode].filter(Boolean).join(' · ');
  return `<button class="aj-cible" id="ajCible" aria-label="Ma recherche : ${esc(titre)}. Modifier">
            <span class="aj-cible-t"><b>${esc(titre)}</b>${sous ? `<span>${esc(sous)}</span>` : ''}</span>
            ${ic('pencil', 'ic-14')}
          </button>`;
}

/* ---------- une ligne à faire ----------
   L'ENCRE VA À L'ENTREPRISE, PAS AU VERBE (§6) : le nom en tête, ce qu'il
   faut faire dessous, et le geste au bout — nommé. La sous-ligne
   commence par ce qui a fait monter la ligne : le retard (la marque de
   l'app), le silence (la même marque), ou l'atout en accent (« Karim y
   est en alternance »). Quand l'atout dit déjà le geste, il ne se
   redit pas. */
function rangHTML(e, o){
  const date = e.genre === 'retard' || e.genre === 'jour';
  const devant = e.genre === 'retard' && !o.reprise ? dueMarkHTML(e.date)
    : e.genre === 'silence' ? silenceMarkHTML(e.silence)
    : e.raison ? `<span class="act-vecu">${esc(e.raison)}</span>` : '';
  const quoi = e.genre === 'demarrer' && e.raison ? '' : `<span class="act-do">${esc(e.titre)}</span>`;
  const derriere = e.genre === 'contrat' ? `<span class="act-who">${esc(e.sous)}</span>` : '';
  return (
    `<div class="act-row aj-rang" data-id="${esc(e.id)}" data-genre="${e.genre}">
       ${date ? `<div class="act-under act-under-done">${ic('check', 'ic-14')} Fait</div>
                 <div class="act-under act-under-report">${ic('calendar', 'ic-14')} Reporter</div>` : ''}
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(e.nom)}">
           <b class="act-verb">${esc(e.nom)}</b>
           <span class="act-sub">${devant}${quoi}${derriere}</span>
         </div>
         <div class="act-btns">
           <button class="btn btn-sm aj-geste${o.premier ? ' btn-primary' : ''}" data-geste
                   aria-label="${esc(e.bouton + ' — ' + e.nom)}">${ic(e.icone, 'ic-14')} ${esc(e.bouton)}</button>
         </div>
       </div>
     </div>`);
}
/* plus tard : la date, puis ce qui est prévu — ou le plan « si… alors »
   d'une piste qui attend */
function tardHTML(e){
  return (
    `<div class="act-row aj-tard" data-id="${esc(e.id)}">
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(e.nom)}">
           <b class="act-verb">${esc(e.nom)}</b>
           <span class="act-sub"><span class="act-when">${frDate(e.date)}</span><span class="act-do">${
             esc(e.genre === 'attente' ? 'Relancer si pas de réponse' : e.titre)}</span></span>
         </div>
       </div>
     </div>`);
}
function bientotHTML(tard, wide){
  if (!tard.length) return '';
  const cap = expanded.has('soon') ? tard.length : CAP;
  const rows = tard.slice(0, cap).map(tardHTML).join('');
  const more = tard.length > cap
    ? `<button class="linklike tr-more" data-tr="soon">${voirAutres(tard.length - cap)}</button>` : '';
  const head = `${ic('calendar', 'ic-14')} Bientôt <span class="tr-n">${tard.length}</span>`;
  /* au poste, la place ne manque pas : la tranche est ouverte, dans le
     volet de droite. Au pouce, elle se replie — une chose à la fois. */
  return wide
    ? `<section class="tranche tr-soon"><h2 class="tr-h">${head}</h2><div class="tr-rows">${rows}${more}</div></section>`
    : `<details class="tranche tr-soon">
         <summary class="tr-h"><h2>${head}</h2></summary><div class="tr-rows">${rows}${more}</div>
       </details>`;
}

/* ---------- ce que l'app a rangé toute seule ----------
   Un fait, et sa sortie : la piste est toujours là (« Mes pistes »,
   clôturée), « Annuler » la rouvre et le silence repart de zéro. */
const rangeesHTML = l => l.map(a =>
  `<div class="aj-range" data-id="${esc(a.id)}">
     ${ic('archive', 'ic-14')}
     <span class="aj-range-t"><b>${esc(a.name)}</b> s’est rangée : ${a.jours} jours sans réponse.</span>
     <button class="btn btn-sm" data-annuler aria-label="Annuler le rangement de ${esc(a.name)}">Annuler</button>
   </div>`).join('');

/* ---------- « Tes amis » (docs/reseau.md, lot 3) ----------
   Quelqu'un ATTEND : un ami cherche une personne chez une entreprise où
   tu en connais une, ou un ami t'a donné le contact que tu cherchais.
   Elle passe donc en tête, avant le travail du jour — une demande
   s'éteint en 14 jours, et c'est la seule ligne de l'écran qui fait
   gagner quelque chose à quelqu'un d'autre. Trois lignes, et la suite à
   un tap. La première dit qui t'a écrit : aucun bouton ne porte de
   chiffre, c'est ici qu'on le lit, à son heure. */
const CAP_AMIS = 3;
function amisHTML(lignes){
  const ecrits = ecritsDuJour();
  const tous = [...(ecrits ? [{ sorte: 'ecrits', id: 'ecrits', nom: ecrits.texte, raison: ecrits.sous, qui: '',
                                aria: [ecrits.texte, ecrits.sous].filter(Boolean).join(', ') }] : []), ...lignes];
  if (!tous.length) return '';
  const items = expanded.has('amis') ? tous : tous.slice(0, CAP_AMIS);
  const more = tous.length > items.length
    ? `<button class="linklike tr-more" data-tr="amis">${voirAutres(tous.length - items.length)}</button>` : '';
  return `<section class="tranche tr-amis">
            <h2 class="tr-h">${ic('users', 'ic-14')} Tes amis${lignes.length ? ` <span class="tr-n">${lignes.length}</span>` : ''}</h2>
            <div class="tr-rows">${items.map(x =>
              `<div class="act-row act-ami" data-sorte="${x.sorte}" data-ami="${esc(x.id)}">
                 <div class="act-in">
                   <div class="act-main sw-cible" role="button" tabindex="0" aria-label="${esc(x.aria || x.raison + ' — ' + x.nom)}">
                     <b class="act-verb">${esc(x.nom)}</b>
                     <span class="act-sub"><span class="act-vecu">${esc(x.raison)}</span><span class="act-who">${esc(x.qui)}</span></span>
                   </div>
                 </div>
               </div>`).join('')}${more}</div>
          </section>`;
}

/* les entrants à trier — une seule ligne calme (#10), plus jamais une
   pile de bandeaux au-dessus du travail du jour */
function triageItems(){
  const items = [];
  if (S.orphans.length) items.push({
    n: S.orphans.length, icon: 'contact', label: 'Contacts à rattacher',
    open: () => { location.hash = '#/pistes'; } });
  const recv = receivedTodayCount();
  if (recv) items.push({
    n: recv, icon: 'inbox', label: 'Reçu du groupe',
    open: () => { location.hash = '#/pistes'; } });
  const analysis = ORDINATEUR ? mailAnalysis() : null;
  if (analysis && analysis.state === 'ready') items.push({
    n: analysis.count, icon: 'sparkles', label: 'Pistes lues dans tes e-mails',
    open: openPendingMailAnalysis });
  const nProps = ORDINATEUR ? pendingProposals().reduce((n, p) => n + p.n, 0) : 0;
  if (nProps) items.push({
    n: nProps, icon: 'sparkles', label: 'Ton assistant propose',
    open: openPendingProposals });
  return { items, total: items.reduce((s, x) => s + x.n, 0) };
}
function openTriage(items){
  if (items.length === 1){ items[0].open(); return; }
  const sh = openSheet({ title: 'À trier', icon: 'inbox' });
  sh.body.innerHTML =
    `<div class="pick-list">${items.map((x, i) =>
      `<button class="pick" data-i="${i}">
         <b>${ic(x.icon, 'ic-14')} ${esc(x.label)}</b><span>${x.n}</span>
       </button>`).join('')}</div>`;
  sh.body.querySelectorAll('.pick').forEach(b =>
    b.addEventListener('click', () => { sh.close(); items[+b.dataset.i].open(); }));
}

export function renderToday(){
  const root = $('#view-aujourdhui');
  const today = todayISO();
  const wide = mqWide.matches;
  const f = aFaire(S.companies, { today, profile: S.profile, portes: portesDuJour(), peutDemander: peutDemanderAmis() });
  /* REVENIR NE COÛTE RIEN : après une semaine sans geste, trois lignes
     pour reprendre, et plus un seul compte de jours de retard */
  const reprise = enPause(S.companies, S.journal);
  const file = [...f.engage, ...f.propose];
  /* tout ce qui est engagé se montre ; ce que l'app propose complète
     jusqu'à trois lignes — le reste est à un tap */
  const base = reprise ? FILE : Math.max(f.engage.length, FILE);
  const visibles = expanded.has('faire') ? file : file.slice(0, base);
  const parId = new Map(file.map(e => [e.id, e]));
  const tard = [...f.bientot, ...f.attente].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || String(a.nom).localeCompare(String(b.nom), 'fr'));
  const rangees = annonces(S.companies, today);
  const done = doneTodayCount();
  const triage = triageItems();
  const neuf = !S.companies.length;

  /* ---- le travail ---- */
  let travail = amisHTML(lignesAmis());
  if (neuf){
    /* première visite : la promesse, puis un seul geste. « Voir un
       exemple » remplit l'écran tel qu'il sera ; ce que l'écran suivant
       montre, celui-ci n'a pas à le dire (§7). Quand la cible est dite,
       le premier geste change : l'app sait quelles entreprises proposer. */
    const cible = !!RECHERCHES[S.profile.recherche];
    travail +=
      `<div class="td-empty">
         <div class="tde-ic">${ic('zap', 'ic-24')}</div>
         <h2>Ta recherche, un jour à la fois</h2>
         <div class="tde-actions">
           ${cible ? `<button class="btn btn-primary" id="tdeTrouver">${ic('search', 'ic-14')} Trouver des entreprises</button>` : ''}
           <button class="btn${cible ? '' : ' btn-primary'}" id="tdeAdd">${ic('plus', 'ic-14')} Ajouter une piste</button>
           <button class="btn" id="tdeDemo">Voir un exemple</button>
           ${/* UN SEUL MOI (lot R5) : sur un téléphone neuf, c'est ICI que
                l'on arrive — la phrase de secours ramène tout */''}
           <button class="btn" id="tdeMoi">J’ai déjà OpenContact</button>
         </div>
       </div>`;
  } else if (file.length){
    const more = file.length > visibles.length
      ? `<button class="linklike tr-more" data-tr="faire">${voirAutres(file.length - visibles.length)}</button>` : '';
    travail +=
      `<section class="tranche tr-faire">
         <h2 class="tr-h">${ic('zap', 'ic-14')} ${reprise ? 'Pour reprendre' : 'À faire maintenant'}</h2>
         <div class="tr-rows">${visibles.map((e, i) => rangHTML(e, { premier: i === 0, reprise })).join('')}${more}</div>
       </section>`;
  } else {
    /* à jour : positif, jamais culpabilisant — et vrai. « Tout est à
       jour » ne se dit que si rien n'attend plus tard non plus. */
    travail += tard.length
      ? `<div class="td-empty td-clear">
           <div class="tde-ic">${ic('calendar', 'ic-24')}</div>
           <h2>Rien à faire aujourd’hui</h2>
         </div>`
      : `<div class="td-empty td-clear">
           <div class="tde-ic ok">${ic('check', 'ic-24')}</div>
           <h2>Tout est à jour</h2>
         </div>`;
  }
  travail += rangeesHTML(rangees);
  /* les campagnes du jour — SOUS le travail, jamais tronquées (#10) */
  if (CAMPAGNES) travail += campaignLines().map(l =>
    `<button class="camp-line" data-camp="${esc(l.id)}">${ic('flag', 'ic-14')} <span>${esc(l.txt)}</span> <em>Voir</em></button>`).join('');

  /* ---- le pied : ce qui suit le travail du jour ---- */
  let pied = '';
  if (triage.total)
    pied += `<button class="td-triage" id="tdTriage">${ic('inbox', 'ic-14')} À trier <span class="tr-n">${triage.total}</span></button>`;
  /* LE LIEN DU PIED MÈNE À CE QU'IL NOMME (§5, promesse 5), et n'existe
     que s'il ajoute à l'écran : il compte les pistes « à contacter » —
     le mot de « Mes pistes » et de la barre — et se tait quand toutes
     sont déjà dans la file. */
  const aContacter = S.companies.filter(c => !c.closedReason && (c.status || 'todo') === 'todo');
  if (aContacter.some(c => !visibles.some(e => e.id === c.id)) && !neuf)
    pied += `<button class="td-foot linklike" id="tdNoAct">${aContacter.length} piste${aContacter.length > 1 ? 's' : ''} à contacter →</button>`;
  if (hasDemo())
    pied += `<button class="td-foot linklike" id="tdRmDemo">Retirer les pistes d’exemple</button>`;
  if (pied) pied = `<div class="td-under">${pied}</div>`;

  const tete =
    `<div class="td-head">
       <h1>Aujourd’hui</h1>
       <div class="td-date">${frToday()}</div>
     </div>`;
  /* pas de compte au-dessus d'un « ajoute ta première piste » : on ne
     félicite pas quelqu'un pour un travail dont l'écran affirme, deux
     lignes plus bas, qu'il n'existe pas */
  const fait = done && S.companies.length
    ? `<div class="done-line">${ic('check', 'ic-14')} ${done} action${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} aujourd’hui</div>` : '';

  root.innerHTML = wide
    ? `<div class="page-inner page-wide aj">
         ${tete}${fait}
         <div class="aj-cols">
           <div class="aj-travail">${travail}${pied}</div>
           <aside class="aj-contexte" aria-label="Ma recherche">${cibleHTML()}${bientotHTML(tard, true)}</aside>
         </div>
       </div>`
    : `<div class="page-inner aj">
         ${tete}${cibleHTML()}${fait}${travail}${bientotHTML(tard, false)}${pied}
       </div>`;

  /* ---- branchements ---- */
  const byId = id => S.companies.find(x => x.id === id);
  const ouvrable = (cible, ouvrir) => {
    cible.addEventListener('click', ouvrir);
    cible.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
    });
  };
  root.querySelectorAll('.aj-rang, .aj-tard').forEach(row => {
    const c = byId(row.dataset.id);
    if (!c) return;
    ouvrable(row.querySelector('.act-main'), () => openFiche(c));
    const e = parId.get(c.id);
    row.querySelector('[data-geste]')?.addEventListener('click', () => faireEtape(c, e));
    /* ce qui est daté se glisse : droite = Fait, gauche = Reporter */
    if (row.querySelector('.act-under')) bindSwipe(row, c);
  });
  root.querySelectorAll('.act-ami').forEach(row => {
    /* « Karim et Léa t'ont écrit » ouvre la boîte sur « Non lus » ; les
       autres lignes, ce qu'elles disent */
    ouvrable(row.querySelector('.act-main'), () =>
      row.dataset.sorte === 'ecrits' ? ouvrirNonLus() : ouvrirLigne(row.dataset.sorte, row.dataset.ami));
  });
  root.querySelectorAll('.aj-range [data-annuler]').forEach(b => b.addEventListener('click', () => {
    const c = byId(b.closest('.aj-range').dataset.id);
    if (c) annulerRangement(c);
  }));
  root.querySelector('#ajCible')?.addEventListener('click', () =>
    import('./profil.js').then(m => m.openProfil(() => bus.refresh())));
  /* la cible, d'un tap : c'est un réglage du profil, il se change là */
  root.querySelectorAll('[data-cherche]').forEach(b => b.addEventListener('click', () => {
    S.profile.recherche = b.dataset.cherche;
    saveProfile();
    bus.refresh();
  }));
  root.querySelectorAll('.tr-more').forEach(b =>
    b.addEventListener('click', () => { expanded.add(b.dataset.tr); renderToday(); }));
  root.querySelectorAll('[data-camp]').forEach(b =>
    b.addEventListener('click', () => openCampaignById(b.dataset.camp)));
  root.querySelector('#tdTriage')?.addEventListener('click', () => openTriage(triage.items));
  root.querySelector('#tdNoAct')?.addEventListener('click', () => ouvrirSur('à contacter'));
  root.querySelector('#tdeAdd')?.addEventListener('click', () => openCapture());
  /* la cible est dite : l'app sait quoi chercher — ce que tu cherches,
     ton métier, ta ville, dans l'annuaire des entreprises */
  root.querySelector('#tdeTrouver')?.addEventListener('click', () => {
    const q = amorces({ companies: [], profile: S.profile, today })[0] || '';
    ouvrirSur(q, 'decouvrir');
  });
  /* pas de toast : les pistes d'exemple arrivent sous les yeux, et
     « Retirer les pistes d'exemple » s'affiche au pied du même écran */
  root.querySelector('#tdeDemo')?.addEventListener('click', () => { addDemo(); bus.refresh(); });
  root.querySelector('#tdeMoi')?.addEventListener('click', () =>
    import('./moi-phrase.js').then(m => m.ouvrirRetrouver()));
  root.querySelector('#tdRmDemo')?.addEventListener('click', () => { removeDemo(); bus.refresh(); });
}

/* la ligne se vide : petit temps d'effacement, puis la suite */
function finishRow(row, c){
  if (row.classList.contains('act-gone')) return;   /* double-tap = un seul « Fait » */
  row.classList.add('act-gone');
  setTimeout(() => marquerFait(c), 160);
}

/* swipe mobile : droite = Fait, gauche = Reporter */
function bindSwipe(row, c){
  if (!matchMedia('(pointer:coarse)').matches) return;
  const inner = row.querySelector('.act-in');
  let x0 = null, y0 = null, dx = 0, active = false;
  const auRepos = () => {
    x0 = null; dx = 0; active = false;
    inner.style.transform = '';
    row.classList.remove('swipe-done', 'swipe-report');
  };
  row.addEventListener('touchstart', e => {
    auRepos();
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  row.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!active){
      if (Math.abs(mx) < 12 || Math.abs(mx) < Math.abs(my) * 1.4) return;
      active = true;
    }
    dx = Math.max(-96, Math.min(96, mx));
    inner.style.transform = `translateX(${dx}px)`;
    row.classList.toggle('swipe-done', dx > 24);
    row.classList.toggle('swipe-report', dx < -24);
  }, { passive: true });
  row.addEventListener('touchend', () => {
    if (active){
      /* la ligne part en s'effaçant : elle garde son décalage pendant
         les 160 ms de `act-gone` — la remettre droite la ferait sauter */
      if (dx > 72){ x0 = null; dx = 0; active = false; finishRow(row, c); return; }
      if (dx < -72) reportAction(c);
    }
    auRepos();
  });
  row.addEventListener('touchcancel', () => { if (x0 != null) auRepos(); });
}

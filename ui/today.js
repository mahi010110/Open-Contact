/* ============================================================
   OpenContact — interface · « Aujourd'hui »
   Le flux d'actions : En retard · Aujourd'hui · Bientôt (repliée).
   Une ligne = une action — Écrire / Reporter / Fait (swipe sur
   mobile). Faire une action vide la ligne. État vide positif,
   jamais culpabilisant. Jamais 40 lignes d'un coup.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { dueFollowups } from '../engine/assist.js';
import { S, bus, isClosed, markDone, hasDemo, addDemo, removeDemo } from './state.js';
import { $, ic, toast, openSheet } from './dom.js';
import { frToday, frDate, dueMarkHTML } from './dates.js';
import { askNextAction, reportAction } from './actions.js';
import { openMail } from './mail.js';
import { openFiche } from './fiche.js';
import { openCapture } from './capture.js';
import { campaignLines, openCampaignById } from './campagnes.js';
import { mailAnalysis } from './analyse.js';
import { openPendingMailAnalysis } from './recevoir.js';
import { pendingProposals, openPendingProposals } from './propositions.js';
import { COMPAGNON, CAMPAGNES } from './perimetre.js';

const CAP = 8;                      /* lignes visibles par tranche avant « voir plus » */
const expanded = new Set();         /* tranches dépliées à la main (le temps de la session) */

/* Deux conceptions, pas une page élastique. Au pouce : un fil vertical,
   « Bientôt » replié — une seule chose à la fois. Au poste : les trois
   tranches côte à côte, tout visible d'un coup, comme le tableau de
   « Mes pistes ». Ce n'est pas la même page à deux largeurs. */
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

function rowHTML(c){
  const verb = c.nextActionText || 'Faire le point';
  const today = todayISO();
  /* la tranche donne le contexte : en retard → seul l'écart compte,
     aujourd'hui → rien à répéter, bientôt → la date. L'échéance passe
     devant le nom : c'est lui qui se tronque, jamais elle.
     Le retard prend LA marque de l'app (`dueMarkHTML`), celle de « Mes
     pistes » : c'est le même fait, il doit avoir le même dessin. Et
     c'est le seul cran qui la porte ici — sur un écran où toutes les
     lignes réclament quelque chose, une marque sur chacune ne serait
     plus un signal. */
  const when = c.nextAction < today ? dueMarkHTML(c.nextAction)
             : c.nextAction > today ? `<span class="act-when">${frDate(c.nextAction)}</span>` : '';
  return (
    `<div class="act-row" data-id="${c.id}">
       <div class="act-under act-under-done">${ic('check', 'ic-14')} Fait</div>
       <div class="act-under act-under-report">${ic('clock', 'ic-14')} Reporter</div>
       <div class="act-in">
         <div class="act-main" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(verb)}</b>
           <span class="act-sub">${when}<span class="act-who">${esc(c.name)}</span></span>
         </div>
         <div class="act-btns">
           <button class="abtn" data-a="mail" aria-label="Écrire à ${esc(c.name)}" title="Écrire">${ic('mail')}</button>
           <button class="abtn" data-a="report" aria-label="Reporter" title="Reporter">${ic('clock')}</button>
           <button class="abtn abtn-ok" data-a="done" aria-label="Fait" title="Fait">${ic('check')}</button>
         </div>
       </div>
     </div>`);
}
function trancheHTML(key, label, icon, items, open){
  if (!items.length) return '';
  const cap = expanded.has(key) ? items.length : CAP;
  const rows = items.slice(0, cap).map(rowHTML).join('');
  const more = items.length > cap
    ? `<button class="linklike tr-more" data-tr="${key}">Voir les ${items.length - cap} autres</button>` : '';
  const head = `${ic(icon, 'ic-14')} ${label} <span class="tr-n">${items.length}</span>`;
  if (key === 'soon'){
    return `<details class="tranche tr-${key}"${open ? ' open' : ''}>
              <summary class="tr-h">${head}</summary><div class="tr-rows">${rows}${more}</div>
            </details>`;
  }
  return `<section class="tranche tr-${key}">
            <h3 class="tr-h">${head}</h3><div class="tr-rows">${rows}${more}</div>
          </section>`;
}

/* la même tranche, en colonne de tableau (poste de commandement) —
   mêmes briques que « Mes pistes » : .board / .bcol / .bcol-h, et le
   dither de .bcol-empty quand il n'y a rien. Une colonne vide n'est
   pas un trou : c'est une bonne nouvelle, elle le dit. */
function colHTML(key, label, icon, items, vide){
  const cap = expanded.has(key) ? items.length : CAP;
  const more = items.length > cap
    ? `<button class="linklike tr-more" data-tr="${key}">Voir les ${items.length - cap} autres</button>` : '';
  return `<section class="bcol tr-${key}" aria-label="${label}">
            <h3 class="bcol-h">${ic(icon, 'ic-14')} ${label} <span class="tr-n">${items.length}</span></h3>
            ${items.length
              ? `<div class="bcol-rows">${items.slice(0, cap).map(rowHTML).join('')}${more}</div>`
              : `<div class="bcol-empty">${vide}</div>`}
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
    n: recv, icon: 'inbox', label: 'Reçu de la promo',
    open: () => { location.hash = '#/pistes'; } });
  const analysis = COMPAGNON ? mailAnalysis() : null;
  if (analysis && analysis.state === 'ready') items.push({
    n: analysis.count, icon: 'sparkles', label: 'Pistes lues dans tes e-mails',
    open: openPendingMailAnalysis });
  const nProps = COMPAGNON ? pendingProposals().reduce((n, p) => n + p.n, 0) : 0;
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
  const alive = S.companies.filter(c => !isClosed(c));
  const byDate = (a, b) => a.nextAction.localeCompare(b.nextAction) || (b.updatedAt || 0) - (a.updatedAt || 0);
  /* « En retard » : priorisation locale (retard, puis pistes déjà
     travaillées — celles qu'il ne faut pas lâcher) */
  const lateOrder = dueFollowups(alive, today).map(x => x.id);
  const late = alive.filter(c => c.nextAction && c.nextAction < today)
    .sort((a, b) => lateOrder.indexOf(a.id) - lateOrder.indexOf(b.id));
  const due = alive.filter(c => c.nextAction === today).sort(byDate);
  const soon = alive.filter(c => c.nextAction && c.nextAction > today).sort(byDate);
  const noAction = alive.filter(c => !c.nextAction);
  const done = doneTodayCount();
  const triage = triageItems();

  const wide = mqWide.matches;
  const rienAFaire = !late.length && !due.length;
  let porteLeGeste = false;      /* l'état vide offre déjà « Planifier » */
  let html =
    `<div class="page-inner${wide && alive.length ? ' page-wide' : ''}">
       <div class="td-head">
         <h2>Aujourd’hui</h2>
         <div class="td-date">${frToday()}</div>
       </div>
       ${done ? `<div class="done-line">${ic('check', 'ic-14')} ${done} action${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} aujourd’hui</div>` : ''}`;

  if (!alive.length && !S.companies.length){
    /* première visite : la promesse, puis un seul geste */
    html +=
      `<div class="td-empty">
         <div class="tde-ic">${ic('zap', 'ic-24')}</div>
         <h3>Ta recherche, un jour à la fois</h3>
         <p>Ajoute une piste, donne-lui une prochaine action — cet écran te dira toujours quoi faire maintenant.</p>
         <div class="tde-actions">
           <button class="btn btn-primary" id="tdeAdd">${ic('plus', 'ic-14')} Ajouter ma première piste</button>
           <button class="btn" id="tdeDemo">Voir un exemple</button>
         </div>
       </div>`;
  } else if (wide){
    /* le poste : les trois tranches côte à côte, toujours présentes —
       la structure ne bouge pas, seul son contenu change */
    html +=
      `<div class="board td-board">
         ${colHTML('late', 'En retard', 'square-alert', late, 'Rien en retard ✓')}
         ${colHTML('due', 'Aujourd’hui', 'zap', due, rienAFaire ? 'Tout est à jour ✓' : 'Rien de prévu aujourd’hui')}
         ${colHTML('soon', 'Bientôt', 'calendar', soon,
           noAction.length ? 'Rien de planifié — donne une prochaine action à une piste.' : 'Rien en vue')}
       </div>`;
  } else if (rienAFaire && !soon.length && noAction.length){
    /* Des pistes, aucune action : ce n'est PAS « tout est à jour ». Il y
       a un prochain geste — planifier — et c'est le seul de l'écran, donc
       il prend le bouton au lieu d'être expliqué dans un paragraphe sous
       une coche verte qui dit le contraire. Le lien du pied ferait alors
       doublon : il s'efface (voir `pied`). */
    porteLeGeste = true;
    html +=
      `<div class="td-empty td-clear">
         <div class="tde-ic">${ic('calendar', 'ic-24')}</div>
         <h3>Rien de planifié</h3>
         <p>Donne une prochaine action à ${noAction.length > 1 ? 'une de tes pistes' : 'ta piste'} —
            cet écran te dira quoi faire ensuite.</p>
         <div class="tde-actions">
           <button class="btn btn-primary" id="tdePlan">${ic('zap', 'ic-14')} Planifier</button>
         </div>
       </div>`;
  } else if (rienAFaire){
    /* à jour : positif, jamais culpabilisant */
    html +=
      `<div class="td-empty td-clear">
         <div class="tde-ic ok">${ic('check', 'ic-24')}</div>
         <h3>Tout est à jour</h3>
         <p>${soon.length
            ? 'Rien d’urgent — la suite est plus bas, repliée exprès.'
            : 'Rien à faire — ajoute une piste quand tu en croises une.'}</p>
       </div>`;
  } else {
    html += trancheHTML('late', 'En retard', 'square-alert', late);
    html += trancheHTML('due', 'Aujourd’hui', 'zap', due);
  }
  /* les campagnes du jour — SOUS le travail, jamais tronquées (#10) */
  if (CAMPAGNES) html += campaignLines().map(l =>
    `<button class="camp-line" data-camp="${esc(l.id)}">${ic('flag', 'ic-14')} <span>${esc(l.txt)}</span> <em>Voir</em></button>`).join('');
  if (!wide) html += trancheHTML('soon', 'Bientôt', 'calendar', soon, false);   /* au poste, elle est déjà en colonne */
  /* ce qui suit le travail du jour — un pied, pas des liens en vrac.
     Sous un tableau à trois colonnes de hauteurs inégales, « 5 pistes
     sans prochaine action » flottait tout seul à gauche, sous un trou. */
  let pied = '';
  if (triage.total){
    pied += `<button class="td-triage" id="tdTriage">${ic('inbox', 'ic-14')} À trier <span class="tr-n">${triage.total}</span></button>`;
  }
  if (noAction.length && alive.length && !porteLeGeste){
    pied += `<button class="td-foot linklike" id="tdNoAct">${noAction.length} piste${noAction.length > 1 ? 's' : ''} sans prochaine action →</button>`;
  }
  if (hasDemo()){
    pied += `<button class="td-foot linklike" id="tdRmDemo">Retirer les pistes d’exemple</button>`;
  }
  if (pied) html += `<div class="td-under">${pied}</div>`;
  html += '</div>';
  root.innerHTML = html;

  /* branchements */
  const byId = id => S.companies.find(x => x.id === id);
  root.querySelectorAll('.act-row').forEach(row => {
    const c = byId(row.dataset.id);
    if (!c) return;
    row.querySelector('.act-main').addEventListener('click', () => openFiche(c));
    row.querySelector('.act-main').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFiche(c); }
    });
    row.querySelector('[data-a="mail"]').addEventListener('click', () =>
      openMail(c, { ctId: c.nextActionCt }));      /* l'action vise sa personne (#14) */
    row.querySelector('[data-a="report"]').addEventListener('click', () => reportAction(c));
    row.querySelector('[data-a="done"]').addEventListener('click', () => finishRow(row, c));
    bindSwipe(row, c);
  });
  root.querySelectorAll('.tr-more').forEach(b =>
    b.addEventListener('click', () => { expanded.add(b.dataset.tr); renderToday(); }));
  const goPistes = () => { location.hash = '#/pistes'; };
  root.querySelectorAll('[data-camp]').forEach(b =>
    b.addEventListener('click', () => openCampaignById(b.dataset.camp)));
  root.querySelector('#tdTriage')?.addEventListener('click', () => openTriage(triage.items));
  root.querySelector('#tdNoAct')?.addEventListener('click', goPistes);
  /* une seule piste à planifier : on ouvre SA question tout de suite —
     passer par la liste pour choisir l'unique élément est un tap perdu */
  root.querySelector('#tdePlan')?.addEventListener('click', () => {
    if (noAction.length === 1) askNextAction(noAction[0], { title: 'Et ensuite ?' });
    else goPistes();
  });
  root.querySelector('#tdeAdd')?.addEventListener('click', () => openCapture());
  root.querySelector('#tdeDemo')?.addEventListener('click', () => { addDemo(); bus.refresh(); toast('Exemple ajouté — retire-le quand tu veux.'); });
  root.querySelector('#tdRmDemo')?.addEventListener('click', () => { removeDemo(); bus.refresh(); toast('Exemple retiré.'); });
}

/* la ligne se vide : petit temps d'effacement, puis la suite */
function finishRow(row, c){
  if (row.classList.contains('act-gone')) return;   /* double-tap = un seul « Fait » */
  row.classList.add('act-gone');
  setTimeout(() => {
    markDone(c);
    bus.refresh();
    askNextAction(c, { title: 'Fait ✓ — et ensuite ?' });
  }, 160);
}

/* swipe mobile : droite = Fait, gauche = Reporter */
function bindSwipe(row, c){
  if (!matchMedia('(pointer:coarse)').matches) return;
  const inner = row.querySelector('.act-in');
  let x0 = null, y0 = null, dx = 0, active = false;
  row.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; active = false;
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
      if (dx > 72){ finishRow(row, c); x0 = null; return; }
      if (dx < -72) reportAction(c);
    }
    inner.style.transform = '';
    row.classList.remove('swipe-done', 'swipe-report');
    x0 = null;
  });
}

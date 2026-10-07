/* ============================================================
   OpenContact — interface · « Aujourd'hui »
   Le flux d'actions : En retard · Aujourd'hui · Bientôt (repliée).
   Une ligne = une action — Écrire / Reporter / Fait (swipe sur
   mobile). Faire une action vide la ligne. État vide positif,
   jamais culpabilisant. Jamais 40 lignes d'un coup.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { DOMAINS, STATUSES, prendCeQueJeCherche, PREND_MOT } from '../engine/model.js';
import { porteurs } from '../engine/requete.js';
import { portesDuJour } from './amis.js';
import { lignesAmis, ouvrirLigne } from './reseau.js';
import { scoreOf } from '../engine/score.js';
import { dueFollowups, silentPistes, aDemarrer } from '../engine/assist.js';
import { S, bus, isClosed, markDone, hasDemo, addDemo, removeDemo } from './state.js';
import { $, ic, openSheet } from './dom.js';
import { frToday, frDate, dueMarkHTML, silenceMarkHTML } from './dates.js';
import { askNextAction, reportAction, askClose } from './actions.js';
import { openMail } from './mail.js';
import { openFiche } from './fiche.js';
import { openCapture } from './capture.js';
import { campaignLines, openCampaignById } from './campagnes.js';
import { mailAnalysis } from './analyse.js';
import { openPendingMailAnalysis } from './recevoir.js';
import { pendingProposals, openPendingProposals } from './propositions.js';
import { ORDINATEUR, CAMPAGNES } from './perimetre.js';

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

/* L'ENCRE VA À L'ENTREPRISE, PAS AU VERBE.
   Mesuré sur huit lignes d'action : le verbe portait l'encre (14 px,
   gras, en tête) pour UNE seule valeur distincte — « Relancer le service
   RH » sur les trois quarts des lignes — pendant que l'entreprise, seule
   chose qui varie toujours, tenait 11 px de gris en seconde position.
   Trois raisons de l'inverser, dont la dernière est la plus forte :
   ① la règle que l'app s'est donnée (CLAUDE.md §6 — l'encre va à ce qui
     change) ; ② NN/g, *The Anatomy of a List Entry* — mettre en avant
     l'attribut DISTINCTIF ; ③ sur cet écran même, « Par où commencer »
     et « Sans nouvelles » mettaient DÉJÀ le nom de la piste en tête. La
     même place portait tantôt une action, tantôt une entreprise : c'est
     la promesse « chaque information au même endroit d'une ligne à
     l'autre » qui était rompue, à l'intérieur d'un seul écran.
   Ce qui reste : le verbe descend en sous-ligne, où il est de toute
   façon doublé par les trois gestes de droite ; l'échéance garde sa
   place forte devant lui. */
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
       <div class="act-under act-under-report">${ic('calendar', 'ic-14')} Reporter</div>
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(c.name)}</b>
           <span class="act-sub">${when}<span class="act-do">${esc(verb)}</span></span>
         </div>
         <div class="act-btns">
           <button class="abtn" data-a="mail" aria-label="Écrire à ${esc(c.name)}" title="Écrire">${ic('mail')}</button>
           ${/* le CALENDRIER, comme « Planifier » une tranche plus haut :
                c'est la même question — quelle date — et elle avait deux
                dessins. L'horloge, elle, ne se devinait pas (1er octobre
                2026) ; elle reste à « Sans nouvelles », où elle dit le
                temps qui passe. */''}
           <button class="abtn" data-a="report" aria-label="Reporter ${esc(c.name)}" title="Reporter">${ic('calendar')}</button>
           <button class="abtn abtn-ok" data-a="done" aria-label="Fait" title="Fait">${ic('check')}</button>
         </div>
       </div>
     </div>`);
}
/* ---------- « Par où commencer » ----------
   Le cas mesuré : on reçoit le fichier d'un camarade, vingt-quatre
   pistes arrivent d'un coup, aucune n'est planifiée — et l'écran censé
   répondre à « je fais quoi maintenant ? » répondait « Rien de
   planifié », zéro ligne affichée, deux portes. Or il tient la réponse :
   vingt-quatre pistes. C'est la règle §6 (« un écran montre les affaires
   de l'utilisateur, pas des portes ») appliquée à l'écran principal.

   TROIS, pas vingt-quatre : vingt-quatre pistes non planifiées, c'est
   vingt-quatre décisions avant le premier geste, et le premier geste
   n'arrive jamais. Choisir à la place de l'utilisateur EST le service.

   L'ordre a une raison, et elle se voit sur la ligne : d'abord ce à quoi
   on peut ÉCRIRE tout de suite (une adresse), ensuite les fiches les
   mieux remplies (on a le plus à dire). Un coup de pouce sans raison
   visible ne pousse personne.

   Une ligne sans action n'offre ni « Fait » ni « Reporter » — il n'y a
   rien à finir ni à repousser. Elle offre les deux seuls gestes qui
   existent ici : écrire, ou décider quand. */
const DEBUT = 3;
const joignable = c => (c.contacts || []).some(t => t.email);
/* Le premier critère, avant même l'adresse : quelqu'un a-t-il déjà mis
   les pieds là-bas ? Une candidature portée décroche ~40 % d'entretiens
   contre ~3 % à froid — un facteur treize que rien d'autre sur cette
   ligne n'approche. Le prénom suffit : c'est lui qui rend la chose
   jouable (« quelqu'un y a fait son stage » ne se joue pas). */
/* Et depuis le lot 2 du réseau : un AMI dont le parcours nomme la piste
   (« Karim y est en alternance ») compte au même titre — c'est la même
   raison, dite par lui-même. Calculé une fois par rendu. */
let portesRendu = null;
const porteePar = c => porteurs(c, portesRendu)[0] || null;
/* Le deuxième critère : la piste PREND-ELLE ce que tu cherches ? Un
   alternant à qui l'on propose d'abord trois entreprises qui ne prennent
   que des stagiaires perd trois candidatures avant la première utile.
   Trois rangs, pas deux : « oui », puis « on ne sait pas » (une piste
   muette n'a rien refusé), puis « non ». Sans recherche choisie dans le
   profil, le critère ne départage rien — l'ordre d'avant est intact. */
const rangPrend = c => { const v = prendCeQueJeCherche(c, S.profile.recherche); return v === true ? 2 : v === null ? 1 : 0; };
function parOuCommencer(sansAction){
  return sansAction.slice().sort((a, b) =>
    (!!porteePar(b) - !!porteePar(a)) ||
    (rangPrend(b) - rangPrend(a)) ||
    (joignable(b) - joignable(a)) ||
    (scoreOf(b) - scoreOf(a)) ||
    a.name.localeCompare(b.name, 'fr')).slice(0, DEBUT);
}
function startRowHTML(c){
  const n = (c.contacts || []).length;
  /* Le compte de contacts passe DEVANT le secteur : au pouce la
     sous-ligne s'élide, et c'est le dernier morceau qui saute. « ESN /
     Services IT » est le plus long et le moins décisif — le nombre de
     personnes joignables, lui, est exactement ce qui départage. Mesuré :
     la version secteur-en-second rendait « Toulouse · ESN / Services
     IT · 3 co… ». */
  const bits = [
    c.city,
    n ? n + ' contact' + (n > 1 ? 's' : '') : '',
    c.domain && c.domain !== 'autre' ? (DOMAINS[c.domain] || DOMAINS.autre).label : ''
  ].filter(Boolean);
  /* La raison du classement se lit sur la ligne, et EN PREMIER : la
     sous-ligne s'élide par la fin, donc ce qui décide se met devant.
     Pas de `mark-*` — ce n'est pas une urgence, c'est un atout ; même
     traitement que le bandeau de la fiche, l'accent et rien d'autre. */
  const porte = porteePar(c);
  /* Une raison, la plus forte : quelqu'un du groupe d'abord (40 contre 3),
     sinon « prend des alternants » — le critère qui l'a fait monter. */
  const prend = !porte && prendCeQueJeCherche(c, S.profile.recherche) === true;
  const pourquoi = porte
    ? `<span class="act-vecu">${esc(porte.prenom + ' ' + porte.court)}</span>`
    : prend ? `<span class="act-vecu">${esc(PREND_MOT[S.profile.recherche])}</span>` : '';
  return (
    `<div class="act-row act-start" data-id="${c.id}">
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(c.name)}</b>
           <span class="act-sub">${pourquoi}<span class="act-who">${esc(bits.join(' · '))}</span></span>
         </div>
         <div class="act-btns">
           ${/* pas d'adresse, pas de bouton : une capacité absente est
                ABSENTE, jamais grisée (§0) */''}
           ${joignable(c)
             ? `<button class="abtn" data-a="mail" aria-label="Écrire à ${esc(c.name)}" title="Écrire">${ic('mail')}</button>` : ''}
           <button class="abtn abtn-ok" data-a="plan" aria-label="Planifier ${esc(c.name)}" title="Planifier">${ic('calendar')}</button>
         </div>
       </div>
     </div>`);
}
/* ---------- « Sans nouvelles » ----------
   Une piste qu'on a contactée, qui n'a pas répondu, et à qui on n'a pas
   donné de suite : elle disparaissait. Zéro ligne ici, et dans « Mes
   pistes » le même « à planifier » qu'elle dorme depuis cinq jours ou
   depuis trois mois. C'est là que la plupart des recherches s'arrêtent.

   Ce qui empêche cette tranche de devenir une pile de reproches — le
   piège qui fait abandonner les outils de suivi, et que la spec
   interdit déjà (« jamais culpabilisant ») : chaque ligne a une SORTIE.
   Passé le dernier seuil, le moteur ne dit plus « relance », il dit
   « clore » ; le geste proposé change avec lui. Une pile dont chaque
   ligne peut sortir ne grandit pas sans fin. */
function silenceRowHTML(sil){
  const c = S.companies.find(x => x.id === sil.id);
  if (!c) return '';
  const bits = [(STATUSES[c.status] || {}).label, c.city].filter(Boolean);
  const clore = sil.geste === 'clore';
  return (
    `<div class="act-row act-quiet" data-id="${c.id}">
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(c.name)}</b>
           <span class="act-sub">${silenceMarkHTML(sil)}<span class="act-who">${esc(bits.join(' · '))}</span></span>
         </div>
         <div class="act-btns">
           ${joignable(c)
             ? `<button class="abtn" data-a="mail" aria-label="Écrire à ${esc(c.name)}" title="Écrire">${ic('mail')}</button>` : ''}
           ${clore
             ? `<button class="abtn" data-a="clore" aria-label="Clôturer ${esc(c.name)}" title="Clôturer">${ic('archive')}</button>`
             : `<button class="abtn abtn-ok" data-a="plan" aria-label="Relancer ${esc(c.name)}" title="Relancer">${ic('calendar')}</button>`}
         </div>
       </div>
     </div>`);
}
function silenceHTML(items, total){
  return `<section class="tranche tr-quiet">
            <h2 class="tr-h">${ic('clock', 'ic-14')} Sans nouvelles <span class="tr-n">${total}</span></h2>
            <div class="tr-rows">${items.map(silenceRowHTML).join('')}</div>
          </section>`;
}

/* ---------- « Tes amis » (docs/reseau.md, lot 3) ----------
   Quelqu'un ATTEND : un ami cherche une personne chez une entreprise où
   tu en connais une, ou un ami t'a donné le contact que tu cherchais.
   Elle passe donc en tête, avant le travail du jour — une demande
   s'éteint en 14 jours, et c'est la seule ligne de l'écran qui fait
   gagner quelque chose à quelqu'un d'autre. Elle n'existe que si ton
   téléphone a TROUVÉ quelqu'un (règle 6) : un ami qui demande sans que
   tu connaisses personne ne t'en dit rien. */
function amisHTML(items){
  if (!items.length) return '';
  return `<section class="tranche tr-amis">
            <h2 class="tr-h">${ic('users', 'ic-14')} Tes amis <span class="tr-n">${items.length}</span></h2>
            <div class="tr-rows">${items.map(x =>
              `<div class="act-row act-ami" data-sorte="${x.sorte}" data-ami="${esc(x.id)}">
                 <div class="act-in">
                   <div class="act-main sw-cible" role="button" tabindex="0" aria-label="${esc(x.raison + ' — ' + x.nom)}">
                     <b class="act-verb">${esc(x.nom)}</b>
                     <span class="act-sub"><span class="act-vecu">${esc(x.raison)}</span><span class="act-who">${esc(x.qui)}</span></span>
                   </div>
                 </div>
               </div>`).join('')}</div>
          </section>`;
}

function debutHTML(items){
  return `<section class="tranche tr-start">
            <h2 class="tr-h">${ic('zap', 'ic-14')} Par où commencer</h2>
            <div class="tr-rows">${items.map(startRowHTML).join('')}</div>
          </section>`;
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
              ${/* même rang que les tranches non pliables juste au-dessus :
                   « Bientôt » est un titre, le `<summary>` n'est que son
                   bouton — sans le `<h3>`, le plan du document perdait
                   une section sur trois selon qu'elle se replie ou non */''}
              <summary class="tr-h"><h2>${head}</h2></summary><div class="tr-rows">${rows}${more}</div>
            </details>`;
  }
  return `<section class="tranche tr-${key}">
            <h2 class="tr-h">${head}</h2><div class="tr-rows">${rows}${more}</div>
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
            <h2 class="bcol-h">${ic(icon, 'ic-14')} ${label} <span class="tr-n">${items.length}</span></h2>
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
  portesRendu = portesDuJour();
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
  /* « Par où commencer » ne propose que ce qui n'a JAMAIS démarré : une
     piste qu'on vient d'écrire n'est pas à recommencer (`aDemarrer`). Le
     lien du pied, lui, compte toujours toutes les pistes sans suite. */
  const aLancer = noAction.filter(aDemarrer);
  const done = doneTodayCount();
  const triage = triageItems();

  const wide = mqWide.matches;
  const rienAFaire = !late.length && !due.length;
  /* UNE SEULE tranche de suggestion à la fois, et le silence prime :
     ranimer une piste qu'on a déjà engagée vaut mieux que d'en démarrer
     une froide. Deux tranches de conseils sur un écran qui n'a rien de
     prévu, c'est le menu qu'on vient de retirer.
     Calculé ICI parce que la pleine largeur appartient au TABLEAU à
     trois colonnes — une seule colonne de trois lignes étirée sur
     1660 px envoie ses boutons à l'autre bout (mesuré). */
  const muettes = silentPistes(alive, today);
  const rienDePrevu = rienAFaire && !soon.length;
  const suggestion = muettes.length
    ? { html: () => silenceHTML(muettes.slice(0, DEBUT), muettes.length) }
    : (rienDePrevu && aLancer.length)
      ? { html: () => debutHTML(parOuCommencer(aLancer)) } : null;
  /* elle remplace le vide quand rien n'est prévu ; sinon elle SUIT le
     travail du jour — ce qui est engagé passe avant ce qui est suggéré */
  const alaPlace = rienDePrevu && suggestion;
  const tableau = wide && alive.length && !alaPlace;
  let html =
    `<div class="page-inner${tableau ? ' page-wide' : ''}">
       <div class="td-head">
         <h1>Aujourd’hui</h1>
         <div class="td-date">${frToday()}</div>
       </div>
       ${/* pas de compte au-dessus d'un « ajoute ta première piste » : on ne
            félicite pas quelqu'un pour un travail dont l'écran affirme, deux
            lignes plus bas, qu'il n'existe pas */''}
       ${done && S.companies.length
         ? `<div class="done-line">${ic('check', 'ic-14')} ${done} action${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} aujourd’hui</div>` : ''}`;

  html += amisHTML(lignesAmis());

  if (!alive.length && !S.companies.length){
    /* première visite : la promesse, puis un seul geste.
       PLUS DE MODE D'EMPLOI. « Ajoute une piste, donne-lui une prochaine
       action — cet écran te dira toujours quoi faire maintenant » racontait
       ce que les deux boutons MONTRENT : « Voir un exemple » remplit
       l'écran tel qu'il sera, et la première piste ajoutée revient ici
       sous « Par où commencer », avec son geste. Ce que l'écran suivant
       montre, celui-ci n'a pas à le dire (Krug : « l'objectif est de
       supprimer les instructions en rendant tout évident »). */
    html +=
      `<div class="td-empty">
         <div class="tde-ic">${ic('zap', 'ic-24')}</div>
         <h2>Ta recherche, un jour à la fois</h2>
         <div class="tde-actions">
           <button class="btn btn-primary" id="tdeAdd">${ic('plus', 'ic-14')} Ajouter une piste</button>
           <button class="btn" id="tdeDemo">Voir un exemple</button>
         </div>
       </div>`;
  } else if (alaPlace){
    /* Rien de prévu, mais il y a de quoi travailler tout de suite : on
       le MONTRE, au lieu d'offrir une porte — ou pire, d'annoncer « tout
       est à jour » à quelqu'un dont cinq pistes se taisent depuis un
       mois. Vaut aux deux tailles : au poste, trois colonnes vides ne
       sont pas « une bonne nouvelle qui se dit », c'est un mur de rien.
       La promesse « la structure ne bouge pas » parle de l'état de
       travail normal, pas du démarrage à froid. */
    html += suggestion.html();
  } else if (tableau){
    /* le poste : les trois tranches côte à côte, toujours présentes —
       la structure ne bouge pas, seul son contenu change */
    html +=
      `<div class="board td-board">
         ${colHTML('late', 'En retard', 'square-alert', late, 'Rien en retard ✓')}
         ${colHTML('due', 'Aujourd’hui', 'zap', due, rienAFaire ? 'Tout est à jour ✓' : 'Rien de prévu aujourd’hui')}
         ${colHTML('soon', 'Bientôt', 'calendar', soon,
           /* « — donne une prochaine action à une piste » redisait le
              lien du pied, « N pistes sans prochaine action → », posé
              juste dessous */
           noAction.length ? 'Rien de planifié' : 'Rien en vue')}
       </div>`;
  } else if (rienAFaire){
    /* à jour : positif, jamais culpabilisant. Le titre suffit — « la
       suite est plus bas, repliée exprès » décrivait « Bientôt », qui se
       voit juste dessous avec son compte ; « ajoute une piste quand tu
       en croises une » redisait le + de la barre, toujours là. */
    html +=
      `<div class="td-empty td-clear">
         <div class="tde-ic ok">${ic('check', 'ic-24')}</div>
         <h2>Tout est à jour</h2>
       </div>`;
  } else {
    html += trancheHTML('late', 'En retard', 'square-alert', late);
    html += trancheHTML('due', 'Aujourd’hui', 'zap', due);
  }
  /* les campagnes du jour — SOUS le travail, jamais tronquées (#10) */
  if (CAMPAGNES) html += campaignLines().map(l =>
    `<button class="camp-line" data-camp="${esc(l.id)}">${ic('flag', 'ic-14')} <span>${esc(l.txt)}</span> <em>Voir</em></button>`).join('');
  if (!wide) html += trancheHTML('soon', 'Bientôt', 'calendar', soon, false);   /* au poste, elle est déjà en colonne */
  /* du travail est prévu ET des pistes se taisent : la suggestion vient
     APRÈS l'engagé, jamais devant */
  if (suggestion && !alaPlace) html += suggestion.html();
  /* ce qui suit le travail du jour — un pied, pas des liens en vrac.
     Sous un tableau à trois colonnes de hauteurs inégales, « 5 pistes
     sans prochaine action » flottait tout seul à gauche, sous un trou. */
  let pied = '';
  if (triage.total){
    pied += `<button class="td-triage" id="tdTriage">${ic('inbox', 'ic-14')} À trier <span class="tr-n">${triage.total}</span></button>`;
  }
  /* le lien du pied reste, et il compte VRAI : « Par où commencer » n'en
     montre que trois, il faut un chemin vers les autres */
  if (noAction.length && alive.length){
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
  /* `:not(.act-start)` : une ligne « Par où commencer » n'a ni « Fait »
     ni « Reporter » — les brancher dessus planterait sur un nœud absent,
     et le swipe y proposerait de finir une action qui n'existe pas. */
  root.querySelectorAll('.act-row:not(.act-start):not(.act-quiet)').forEach(row => {
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
  root.querySelectorAll('.act-ami').forEach(row => {
    const ouvrir = () => ouvrirLigne(row.dataset.sorte, row.dataset.ami);
    row.querySelector('.act-main').addEventListener('click', ouvrir);
    row.querySelector('.act-main').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
    });
  });
  root.querySelectorAll('.act-quiet').forEach(row => {
    const c = byId(row.dataset.id);
    if (!c) return;
    const ouvrir = () => openFiche(c);
    row.querySelector('.act-main').addEventListener('click', ouvrir);
    row.querySelector('.act-main').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
    });
    row.querySelector('[data-a="mail"]')?.addEventListener('click', () => openMail(c));
    row.querySelector('[data-a="plan"]')?.addEventListener('click', () =>
      askNextAction(c, { title: 'Relancer quand ?' }));
    row.querySelector('[data-a="clore"]')?.addEventListener('click', () => askClose(c, {}));
  });
  root.querySelectorAll('.act-start').forEach(row => {
    const c = byId(row.dataset.id);
    if (!c) return;
    const ouvrir = () => openFiche(c);
    row.querySelector('.act-main').addEventListener('click', ouvrir);
    row.querySelector('.act-main').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
    });
    row.querySelector('[data-a="mail"]')?.addEventListener('click', () => openMail(c));
    row.querySelector('[data-a="plan"]').addEventListener('click', () =>
      askNextAction(c, { title: 'Et ensuite ?' }));
  });
  root.querySelectorAll('.tr-more').forEach(b =>
    b.addEventListener('click', () => { expanded.add(b.dataset.tr); renderToday(); }));
  const goPistes = () => { location.hash = '#/pistes'; };
  root.querySelectorAll('[data-camp]').forEach(b =>
    b.addEventListener('click', () => openCampaignById(b.dataset.camp)));
  root.querySelector('#tdTriage')?.addEventListener('click', () => openTriage(triage.items));
  root.querySelector('#tdNoAct')?.addEventListener('click', goPistes);
  root.querySelector('#tdeAdd')?.addEventListener('click', () => openCapture());
  /* pas de toast : les pistes d'exemple arrivent sous les yeux, et
     « Retirer les pistes d'exemple » s'affiche au pied du même écran */
  root.querySelector('#tdeDemo')?.addEventListener('click', () => { addDemo(); bus.refresh(); });
  root.querySelector('#tdRmDemo')?.addEventListener('click', () => { removeDemo(); bus.refresh(); });
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

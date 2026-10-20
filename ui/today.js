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
import { dueFollowups, silentPistes, aDemarrer, premiersPas } from '../engine/assist.js';
import { enPause, reprendre } from '../engine/suivi.js';
import { pretsAPartir, SERIE_MIN } from '../engine/prets.js';
import { ouvrirSerie } from './serie.js';
import { semaineHTML, ouvrirSemaine } from './semaine.js';
import { S, bus, isClosed, markDone, hasDemo, addDemo, removeDemo, lot } from './state.js';
import { $, ic, openSheet } from './dom.js';
import { frToday, frDate, dueMarkHTML, silenceMarkHTML } from './dates.js';
import { askNextAction, reportAction, askClose } from './actions.js';
import { openMail } from './mail.js';
import { openFiche } from './fiche.js';
import { openCapture } from './capture.js';
import { openProfil } from './profil.js';
import { campaignLines, openCampaignById } from './campagnes.js';
import { mailAnalysis } from './analyse.js';
import { openPendingMailAnalysis } from './recevoir.js';
import { ouvrirSur } from './pistes.js';
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
function rowHTML(c, o = {}){
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
  /* au retour d'une pause (R2), le retard ne se compte pas : la ligne
     dit quoi faire, pas depuis combien de temps on ne l'a pas fait */
  const when = o.sansRetard ? ''
             : c.nextAction < today ? dueMarkHTML(c.nextAction)
             : c.nextAction > today ? `<span class="act-when">${frDate(c.nextAction)}</span>` : '';
  return (
    `<div class="act-row" data-id="${c.id}">
       <div class="act-under act-under-done">${ic('check', 'ic-14')} Fait</div>
       <div class="act-under act-under-report">${ic('calendar', 'ic-14')} Reporter</div>
       <div class="act-in">
         ${/* UNE CASE EN TÊTE, UN MOT AU BOUT (19 octobre 2026). La ligne
              portait trois icônes nues — enveloppe, calendrier, coche —
              soit douze sur l'écran, et le relevé des boutons les a
              comptées parmi ce qui faisait l'écran « horrible ». Une
              action prévue se coche comme dans toute liste de tâches
              (Rappels, Things, Todoist : la case est EN TÊTE, et personne
              n'a à apprendre ce qu'elle fait) ; le geste le plus probable
              garde son MOT (« Écrire ») ; « Reporter » reste au glissé
              vers la gauche et dans la fiche, et le poste, qui n'a pas de
              glissé, le montre à côté en icône (la colonne du tableau ne fait
              que 321 px : deux mots n'y tiennent pas à côté du nom). */''}
         <button class="act-fait" data-a="done" aria-label="Fait : ${esc(c.name)}" title="Fait"><span class="act-case" aria-hidden="true">${ic('check', 'ic-12')}</span></button>
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(c.name)}</b>
           <span class="act-sub">${when}<span class="act-do">${esc(verb)}</span></span>
         </div>
         <div class="act-btns">
           <button class="btn btn-sm btn-ghost icon-btn act-sec" data-a="report" aria-label="Reporter ${esc(c.name)}" title="Reporter">${ic('calendar', 'ic-14')}</button>
           <button class="btn btn-sm" data-a="mail" aria-label="Écrire à ${esc(c.name)}">${ic('mail', 'ic-14')} Écrire</button>
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
function parOuCommencer(sansAction, n = DEBUT){
  return sansAction.slice().sort((a, b) =>
    (!!porteePar(b) - !!porteePar(a)) ||
    (rangPrend(b) - rangPrend(a)) ||
    (joignable(b) - joignable(a)) ||
    (scoreOf(b) - scoreOf(a)) ||
    a.name.localeCompare(b.name, 'fr')).slice(0, n);
}
/* Dans « Reprendre », trois sortes de lignes se suivent dans UNE liste :
   le nom doit y garder un seul bord (§6). La case « Fait » ouvre la ligne
   d'une action prévue ; les deux autres prennent à sa place l'icône de
   leur tranche de tous les jours — l'horloge de « Sans nouvelles »,
   l'éclair de « Par où commencer » —, en encre sourde : elle dit
   pourquoi la ligne est là, maintenant que le compte des jours n'y est
   plus. Un repère, pas un geste. */
const repereHTML = nom => `<span class="act-sorte" aria-hidden="true">${ic(nom, 'ic-14')}</span>`;
function startRowHTML(c, o = {}){
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
         ${o.repere ? repereHTML('zap') : ''}
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(c.name)}</b>
           <span class="act-sub">${pourquoi}<span class="act-who">${esc(bits.join(' · '))}</span></span>
         </div>
         <div class="act-btns">
           ${/* pas d'adresse, pas de bouton : une capacité absente est
                ABSENTE, jamais grisée (§0). Le geste qui avance garde son
                mot (écrire si l'on peut, sinon décider quand) ; l'autre
                reste en icône à côté — ces lignes n'ont pas de glissé,
                et « décider quand » est justement le geste qui manque
                quand rien n'est planifié. */''}
           ${joignable(c)
             ? `<button class="btn btn-sm btn-ghost icon-btn" data-a="plan" aria-label="Planifier ${esc(c.name)}" title="Planifier">${ic('calendar', 'ic-14')}</button>`
             : `<button class="btn btn-sm" data-a="plan" aria-label="Planifier ${esc(c.name)}">${ic('calendar', 'ic-14')} Planifier</button>`}
           ${joignable(c)
             ? `<button class="btn btn-sm" data-a="mail" aria-label="Écrire à ${esc(c.name)}">${ic('mail', 'ic-14')} Écrire</button>` : ''}
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
function silenceRowHTML(sil, o = {}){
  const c = S.companies.find(x => x.id === sil.id);
  if (!c) return '';
  const bits = [(STATUSES[c.status] || {}).label, c.city].filter(Boolean);
  const clore = sil.geste === 'clore';
  return (
    `<div class="act-row act-quiet" data-id="${c.id}">
       <div class="act-in">
         ${o.repere ? repereHTML('clock') : ''}
         <div class="act-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b class="act-verb">${esc(c.name)}</b>
           <span class="act-sub">${o.sansJours ? '' : silenceMarkHTML(sil)}<span class="act-who">${esc(bits.join(' · '))}</span></span>
         </div>
         <div class="act-btns">
           ${/* le geste que la tranche propose, avec son MOT : « Relancer »
                (on écrit, ou l'on choisit quand si l'on n'a pas d'adresse),
                puis « Clôturer » passé le dernier seuil — la sortie de la
                pile. L'autre geste reste à côté, en icône : cette ligne n'a
                pas de glissé pour le retrouver. */''}
           ${clore
             ? (joignable(c) ? `<button class="btn btn-sm btn-ghost icon-btn" data-a="mail" aria-label="Écrire à ${esc(c.name)}" title="Écrire">${ic('mail', 'ic-14')}</button>` : '')
               + `<button class="btn btn-sm btn-ghost" data-a="clore" aria-label="Clôturer ${esc(c.name)}">${ic('archive', 'ic-14')} Clôturer</button>`
             : joignable(c)
               ? `<button class="btn btn-sm btn-ghost icon-btn" data-a="plan" aria-label="Planifier ${esc(c.name)}" title="Planifier">${ic('calendar', 'ic-14')}</button>
                  <button class="btn btn-sm" data-a="mail" aria-label="Relancer ${esc(c.name)}">${ic('mail', 'ic-14')} Relancer</button>`
               : `<button class="btn btn-sm" data-a="plan" aria-label="Relancer ${esc(c.name)}">${ic('calendar', 'ic-14')} Relancer</button>`}
         </div>
       </div>
     </div>`);
}
function silenceHTML(items, total){
  /* trois d'abord — c'est un choix proposé, pas la liste —, mais celles
     d'après restent à un tap, comme dans toute tranche (« Voir les N
     autres ») : elles n'avaient plus d'autre chemin que le lien du pied,
     qui ouvrait « Mes pistes » entière */
  const more = total > items.length
    ? `<button class="linklike tr-more" data-tr="quiet">Voir les ${total - items.length} autres</button>` : '';
  return `<section class="tranche tr-quiet">
            <h2 class="tr-h">${ic('clock', 'ic-14')} Sans nouvelles <span class="tr-n">${total}</span></h2>
            <div class="tr-rows">${items.map(silenceRowHTML).join('')}${more}</div>
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
                   <div class="act-main sw-cible" role="button" tabindex="0" aria-label="${esc(x.aria || x.raison + ' — ' + x.nom)}">
                     <b class="act-verb">${esc(x.nom)}</b>
                     <span class="act-sub"><span class="act-vecu">${esc(x.raison)}</span><span class="act-who">${esc(x.qui)}</span></span>
                   </div>
                 </div>
               </div>`).join('')}</div>
          </section>`;
}

/* ---------- « Premiers pas » (lot F4) ----------
   Trois cases qui se cochent SEULES, dans l'ordre où elles se font —
   une liste ordonnée dans un cadre. Ce qui reste à faire se tape (le
   chevron), ce qui est fait se coche et se tait ; le mail attend qu'il
   y ait une piste à qui écrire. Sans piste, la liste prend la place des
   gestes de l'accueil (§6 : une nouveauté prend une place qui existe) ;
   ensuite, elle est la première tranche, jusqu'au premier mail. */
const PAS = { profil: 'Remplir mon profil', piste: 'Ajouter une piste', mail: 'Écrire mon premier mail' };
function pasHTML(etapes, titre){
  const lignes = etapes.map(x => {
    const pret = x.cle !== 'mail' || etapes[1].fait;
    return `<li>${x.fait || !pret
      ? `<span class="pp-et${x.fait ? ' pp-fait' : ''}">${ic(x.fait ? 'checkbox-on' : 'checkbox', 'ic-20')}<span class="pp-l">${PAS[x.cle]}</span>${
          x.fait ? '<span class="visuellement-cache"> : fait</span>' : ''}</span>`
      : `<button class="pp-et pp-a" data-pp="${x.cle}">${ic('checkbox', 'ic-20')}<span class="pp-l">${PAS[x.cle]}</span>${ic('chevron-right', 'ic-14')}</button>`}</li>`;
  }).join('');
  const liste = `<ol class="pp-liste" id="tdPas">${lignes}</ol>`;
  if (!titre) return liste;
  const faits = etapes.filter(x => x.fait).length;
  return `<section class="tranche tr-pas">
            <h2 class="tr-h">${ic('flag', 'ic-14')} Premiers pas <span class="tr-n">${faits}/3</span></h2>${liste}
          </section>`;
}

function debutHTML(items){
  return `<section class="tranche tr-start">
            <h2 class="tr-h">${ic('zap', 'ic-14')} Par où commencer</h2>
            <div class="tr-rows">${items.map(startRowHTML).join('')}</div>
          </section>`;
}

/* ---------- « Reprendre » (R2, docs/propositions/R2-suivi.md) ----------
   Sept jours sans un geste : on rouvre l'app pour se remettre en route,
   et l'écran empilait les retards, chaque ligne avec ses jours manqués.
   C'est une dette, et c'est là qu'on referme l'app. L'écran s'ouvre donc
   sur TROIS choses, choisies par l'app (`reprendre`) : ce qui a une date
   dépassée, puis ce qui se tait, puis par où commencer — chacune avec le
   dessin et les gestes qu'elle a partout ailleurs, moins le compte des
   jours. Le reste de l'écran est replié dessous, sans un chiffre au
   repos ; il s'ouvre si on le veut. Le premier geste fait (cocher,
   écrire, planifier, clore) date une piste : la pause est finie, et
   l'écran redevient celui de tous les jours. */
function repriseHTML(items){
  const ligne = x => {
    const c = S.companies.find(y => y.id === x.id);
    if (!c) return '';
    return x.sorte === 'action' ? rowHTML(c, { sansRetard: true })
         : x.sorte === 'silence' ? silenceRowHTML(x.item, { sansJours: true, repere: true })
         : startRowHTML(c, { repere: true });
  };
  return `<section class="tranche tr-reprendre" id="tdReprendre">
            <h2 class="tr-h">${ic('redo', 'ic-14')} Reprendre</h2>
            <div class="tr-rows">${items.map(ligne).join('')}</div>
          </section>`;
}

/* « Écrire les 3 mails » : un verbe et son objet, le compte dans le mot */
const partirHTML = n =>
  `<button class="btn btn-primary" id="tdPartir">${ic('mail', 'ic-14')} Écrire les ${n} mails</button>`;

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
  const pas = premiersPas(S.profile, S.companies);
  /* R2 : après sept jours sans un geste, trois choses à reprendre. Pas
     tant que les premiers pas sont là : on ne reprend que ce qu'on a
     commencé, et ils disent déjà quoi faire. */
  const reprise = lot('suivi') && !pas && enPause(S.companies, S.journal)
    ? reprendre({ dues: [...late, ...due], muettes, debuts: parOuCommencer(aLancer) }) : [];
  /* R3 : LES MAILS PRÊTS À PARTIR — les relances dues, puis les premiers
     mails, cinq au plus, chacun vers sa personne. Pas pendant les
     premiers pas : ils disent déjà quoi écrire, et le premier mail
     demande un profil rempli que la série ne vérifie pas. */
  const prets = lot('prets') && !pas
    ? pretsAPartir({ dues: [...late, ...due], debuts: parOuCommencer(aLancer, Infinity), today }) : [];
  const partir = prets.length >= SERIE_MIN;
  const rienDePrevu = rienAFaire && !soon.length;
  const debut = !muettes.length && rienDePrevu && aLancer.length ? parOuCommencer(aLancer) : [];
  const suggestion = muettes.length
    ? { html: () => silenceHTML(expanded.has('quiet') ? muettes : muettes.slice(0, DEBUT), muettes.length) }
    : debut.length ? { html: () => debutHTML(debut) } : null;
  /* elle remplace le vide quand rien n'est prévu ; sinon elle SUIT le
     travail du jour — ce qui est engagé passe avant ce qui est suggéré */
  const alaPlace = rienDePrevu && suggestion;
  /* la reprise est un ÉTAT, le temps d'un geste : au poste aussi, une
     colonne — l'exception nommée de « Par où commencer » (§6, règle 4) */
  const tableau = wide && alive.length && !alaPlace && !reprise.length;
  let html =
    `<div class="page-inner${tableau ? ' page-wide' : ''}">
       <div class="td-head">
         <h1>Aujourd’hui</h1>
         <div class="td-date">${frToday()}</div>
         ${/* au poste, pas de zone du pouce : le geste suit le titre */''}
         ${partir && wide ? partirHTML(prets.length) : ''}
       </div>
       ${/* pas de compte au-dessus d'un « ajoute ta première piste » : on ne
            félicite pas quelqu'un pour un travail dont l'écran affirme, deux
            lignes plus bas, qu'il n'existe pas */''}
       ${done && S.companies.length
         ? `<div class="done-line">${ic('check', 'ic-14')} ${done} action${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} aujourd’hui</div>` : ''}
       ${/* R4 : MA SEMAINE, en tête — l'objectif et ce qui est parti, une
            ligne qui se touche. Pas pendant les premiers pas ni avec
            l'exemple : on ne se fixe pas d'objectif avant d'avoir écrit. */''}
       ${lot('semaine') && !pas && !hasDemo() && S.companies.length ? semaineHTML() : ''}`;

  /* les MESSAGES ne passent plus par ici : l'onglet « Échanger » porte
     leur chiffre, comme toute messagerie (13 octobre 2026). Restent les
     amis qui attendent un GESTE — une demande, un contact donné. */
  html += amisHTML(lignesAmis());
  if (pas && S.companies.length) html += pasHTML(pas, true);

  if (reprise.length){
    html += repriseHTML(reprise);
    /* le reste, replié : sans les trois lignes déjà montrées, et sans un
       chiffre tant qu'il est fermé */
    const montre = new Set(reprise.map(x => x.id));
    const hors = l => l.filter(c => !montre.has(c.id));
    const mu = muettes.filter(x => !montre.has(x.id));
    const reste = trancheHTML('late', 'En retard', 'square-alert', hors(late))
      + trancheHTML('due', 'Aujourd’hui', 'zap', hors(due))
      + trancheHTML('soon', 'Bientôt', 'calendar', hors(soon), false)
      + (mu.length ? silenceHTML(expanded.has('quiet') ? mu : mu.slice(0, DEBUT), mu.length) : '');
    if (reste) html += `<details class="tranche tr-reste" id="tdReste"${expanded.has('reste') ? ' open' : ''}>
        <summary class="tr-h"><h2>Tout le reste</h2></summary>${reste}</details>`;
  } else if (!alive.length && !S.companies.length){
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
         ${pas ? pasHTML(pas, false) : ''}
         <div class="tde-actions">
           ${pas ? '' : `<button class="btn btn-primary" id="tdeAdd">${ic('plus', 'ic-14')} Ajouter une piste</button>`}
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
              lien du pied, « N pistes à planifier → », posé
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
  if (!wide && !reprise.length) html += trancheHTML('soon', 'Bientôt', 'calendar', soon, false);   /* au poste, elle est déjà en colonne */
  /* du travail est prévu ET des pistes se taisent : la suggestion vient
     APRÈS l'engagé, jamais devant */
  if (suggestion && !alaPlace && !reprise.length) html += suggestion.html();
  /* ce qui suit le travail du jour — un pied, pas des liens en vrac.
     Sous un tableau à trois colonnes de hauteurs inégales, « 5 pistes
     sans prochaine action » flottait tout seul à gauche, sous un trou. */
  let pied = '';
  if (triage.total){
    pied += `<button class="td-triage" id="tdTriage">${ic('inbox', 'ic-14')} À trier <span class="tr-n">${triage.total}</span></button>`;
  }
  /* LE LIEN DU PIED MÈNE À CE QU'IL NOMME, et seulement s'il ajoute
     quelque chose. Il disait « 1 piste sans prochaine action » sous la
     seule piste de l'écran, déjà montrée juste au-dessus — et, tapé, il
     ouvrait « Mes pistes » ENTIÈRE, où ce qu'il comptait se perdait
     parmi le reste. Il compte donc les pistes « à planifier » (le mot de
     « Mes pistes » et de la barre ; les silencieuses ont leur tranche),
     n'existe que si l'une d'elles n'est pas déjà à l'écran, et ouvre
     « Mes pistes » sur l'étiquette « À planifier » : le même nombre. */
  const silencieuses = new Set(muettes.map(c => c.id));
  const aPlanifier = noAction.filter(c => !silencieuses.has(c.id));
  const aLEcran = new Set([...debut.map(c => c.id), ...reprise.map(x => x.id)]);
  if (aPlanifier.some(c => !aLEcran.has(c.id))){
    pied += `<button class="td-foot linklike" id="tdNoAct">${aPlanifier.length} piste${aPlanifier.length > 1 ? 's' : ''} à planifier →</button>`;
  }
  if (hasDemo()){
    pied += `<button class="td-foot linklike" id="tdRmDemo">Retirer les pistes d’exemple</button>`;
  }
  if (pied) html += `<div class="td-under">${pied}</div>`;
  /* au pouce, la série tient le PIED, juste au-dessus de la barre : la
     zone qu'une main atteint sans changer de prise (§5) */
  if (partir && !wide) html += `<div class="td-pret">${partirHTML(prets.length)}</div>`;
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
    row.querySelector('[data-a="plan"]')?.addEventListener('click', () =>
      askNextAction(c, { title: 'Et ensuite ?' }));
  });
  /* le reste replié garde son état d'un rendu à l'autre (« Voir les N
     autres » redessine l'écran) */
  root.querySelector('#tdReste')?.addEventListener('toggle', e => {
    if (e.target.open) expanded.add('reste'); else expanded.delete('reste');
  });
  root.querySelectorAll('.tr-more').forEach(b =>
    b.addEventListener('click', () => { expanded.add(b.dataset.tr); renderToday(); }));
  root.querySelectorAll('[data-camp]').forEach(b =>
    b.addEventListener('click', () => openCampaignById(b.dataset.camp)));
  root.querySelector('#tdTriage')?.addEventListener('click', () => openTriage(triage.items));
  root.querySelector('#tdSemaine')?.addEventListener('click', ouvrirSemaine);
  root.querySelector('#tdPartir')?.addEventListener('click', () =>
    ouvrirSerie(prets.map(x => {
      const c = byId(x.id);
      return { c, ct: ((c && c.contacts) || []).find(t => t.id === x.ctId) || null };
    }).filter(x => x.c)));
  root.querySelector('#tdNoAct')?.addEventListener('click', () => ouvrirSur('à planifier'));
  root.querySelector('#tdeAdd')?.addEventListener('click', () => openCapture());
  /* chaque pas mène là où il se fait ; le mail, à la piste que « Par où
     commencer » proposerait en premier */
  root.querySelectorAll('[data-pp]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.pp === 'profil') openProfil();
    else if (b.dataset.pp === 'piste') openCapture();
    else { const c = parOuCommencer(aLancer)[0] || alive[0] || S.companies[0]; if (c) openMail(c); }
  }));
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

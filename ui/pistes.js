/* ============================================================
   OpenContact — interface · « Mes pistes »
   La liste cherchable (mobile) devient un tableau à 3 colonnes
   sur desktop — le poste de commandement. Le bac « Contacts à
   rattacher » vit ici ; les clôturées restent repliées en bas.
   Supprimer une piste = un geste (glisser / poubelle au survol)
   + Annuler ~30 s — c'est le seul endroit où l'on supprime.
   ============================================================ */
import { esc, distKm, todayISO } from '../engine/utils.js';
import { STATUSES, CLOSE_REASONS, DOMAINS, pushHist } from '../engine/model.js';
import { filterCompanies, filterOrphans, searchHint } from '../engine/filter.js';
import { silentPistes } from '../engine/assist.js';
import { S, bus, isClosed, hasDemo, addDemo, ctLabel, deletePiste, undeletePiste,
         removeOrphan, saveOrphans, saveData, logJ } from './state.js';
import { $, ic, toast, showUndo, bindDeleteGesture, openSheet, softReorder, topSheet,
         collerEnHaut, clavier } from './dom.js';
import { openAffinerSheet, filterState, filterOn, filterClear, filterArgs } from './affiner.js';
import { sortState, sortArgs, sortHasDist, sortChipHTML, bindSortChip } from './sort.js';
import { relLabel, diffDays, dueMarkHTML, silenceMarkHTML } from './dates.js';
import { openFiche } from './fiche.js';
import { openCapture } from './capture.js';
import { openContactEditor, openAttach } from './contact.js';
import { openProspect } from './prospect.js';
import { campaignOfPiste, liveCampaignsCount, openCampaignsHome } from './campagnes.js';
import { CAMPAGNES } from './perimetre.js';

/* hors périmètre, aucune piste n'est « en campagne » — la question ne se
   pose plus à l'écran, et « à planifier » reprend sa place (CLAUDE.md §0) */
const enCampagne = cid => CAMPAGNES && !!campaignOfPiste(cid);

let q = '';
const st = sortState('recent');

/* filtre de vue (le temps de la session, comme le tri) : plusieurs
   statuts, plusieurs domaines — l'état et sa forme vivent dans
   `ui/affiner.js`, qui est la seule à savoir ce qu'« actif » veut dire */
const ft = filterState();
const ftOn = () => filterOn(ft);
const ftClear = () => filterClear(ft);

/* au-delà de ce cap, la suite s'ouvre d'un tap (« Voir les N autres ») :
   2 000 lignes d'un coup gelaient l'écran ~250 ms à chaque frappe */
const CAP_LIST = 60;
const CAP_COL = 40;
const expanded = new Set();          /* tranches dépliées (le temps de la session) */
function capped(items, key, cap){
  if (items.length <= cap || expanded.has(key)) return { shown: items, more: 0 };
  return { shown: items.slice(0, cap), more: items.length - cap };
}
const moreBtn = (key, n) =>
  `<button class="linklike tr-more" data-more="${key}">Voir les ${n} autres</button>`;

/* liste ⇄ tableau : on re-rend au franchissement du breakpoint */
const mqWide = matchMedia('(min-width:901px)');
mqWide.addEventListener('change', () => { if (S.route === 'pistes') renderPistes(); });

/* « / » ouvre la recherche — le raccourci que CLAUDE.md §5 promet
   depuis toujours et que le code n'avait jamais eu. Il ne se pose pas
   dans `renderPistes` : cette fonction se rejoue à chaque re-rendu, et
   y accrocher un écouteur en empilerait un par visite de l'écran.
   Aucune borne de largeur : appuyer sur « / » suppose un vrai clavier,
   ce qui fait la borne tout seul. */
/* `n` = une piste de plus, depuis n'importe quel écran. Le poste de
   commandement n'avait qu'un seul raccourci là où CLAUDE.md §5 en
   promet plusieurs — et celui-là sert le geste le plus répété.
   Rien à documenter : les deux touches s'annoncent dans ce qu'elles
   commandent (voir la pastille du champ de recherche), et une liste
   de raccourcis serait un écran qui n'affiche aucune donnée (§6). */
const libre = e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (topSheet() || document.querySelector('.lock')) return false;
  const t = e.target;
  return !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
};
document.addEventListener('keydown', e => {
  if (e.key !== '/' || !libre(e)) return;
  if (S.route !== 'pistes') return;
  const inp = document.querySelector('#piQ');
  if (!inp) return;
  e.preventDefault();          /* sinon le « / » s'écrit dans le champ */
  inp.focus();
  inp.select();
});
document.addEventListener('keydown', e => {
  if ((e.key !== 'n' && e.key !== 'N') || !libre(e)) return;
  e.preventDefault();
  openCapture();
});

/* en tri « Près de moi » (à n'importe quel niveau), la distance s'affiche */
const kmBit = c => (sortHasDist(st) && st.userPos && c.lat != null)
  ? Math.round(distKm(st.userPos.lat, st.userPos.lng, c.lat, c.lng)) + ' km' : '';

/* L'encre va à ce qui CHANGE. Le statut d'une piste bouge une fois
   par quinzaine ; l'échéance bouge tous les jours — et c'est elle qui
   dit s'il faut agir maintenant. La place forte de la ligne (à droite,
   la seule qui survive au flou) revient donc à l'échéance, graduée en
   quatre crans d'intensité, et le statut redescend en donnée dans la
   sous-ligne. Il reste écrit UNE fois (#13). */
/* « sans nouvelles » : engagée, laissée sans suite, et muette depuis
   assez longtemps pour que ça compte. Calculé par piste — le moteur
   décide, l'écran affiche. */
const silenceOf = c => silentPistes([c], todayISO())[0] || null;

function dueHTML(c){
  /* Rien de prévu = RIEN dans la colonne forte. Un « à planifier »
     répété huit fois de suite n'est pas une information, c'est du
     bruit : c'est le vide, en face des deux lignes qui portent une
     échéance, qui dit lesquelles réclament quelque chose. Le mot
     lui-même reste écrit dans la sous-ligne, là où on le lit.
     UNE exception, et elle est du même ordre : une piste engagée puis
     laissée muette RÉCLAME quelque chose, elle aussi. Mesuré : six
     pistes silencieuses depuis 5 à 90 jours affichaient toutes le même
     « à planifier », l'app tenant les dates et les jetant. Sous sept
     jours, toujours rien — trop tôt pour dire quoi que ce soit. */
  if (isClosed(c)) return '';
  if (!c.nextAction) return silenceMarkHTML(silenceOf(c));
  return dueMarkHTML(c.nextAction);        /* LA marque, partagée avec « Aujourd'hui » */
}

/* ---- POURQUOI cette ligne est-elle là ? ----
   Chercher « SOC » remontait une piste dont la ligne affiche nom ·
   action · statut · ville : le mot vit dans les technos, invisible.
   Un résultat qu'on ne peut pas expliquer se relit deux fois, ou se
   prend pour une erreur. Le moteur rend le champ, l'extrait et les
   positions à surligner — jamais du HTML : l'échappement est ici.
   La ligne ne parle QUE si elle a du neuf à dire : chercher « cyber »
   sur « Cyberdéfense Lyon » n'ajoute rien, le nom a déjà répondu. */
function hintHTML(c, skip){
  const h = q ? searchHint(c, q, { skip }) : null;
  if (!h) return '';
  let out = '', i = 0;
  for (const [s, l] of h.marks){
    out += esc(h.text.slice(i, s)) + '<mark>' + esc(h.text.slice(s, s + l)) + '</mark>';
    i = s + l;
  }
  return `<div class="ri-hit">${out + esc(h.text.slice(i))}</div>`;
}

function rowHTML(c){
  const closed = isClosed(c);
  /* le verbe d'action d'abord — jamais tronqué (la ligne peut plier) */
  const bits = [];
  if (closed) bits.push('<b>' + CLOSE_REASONS[c.closedReason].label + '</b>');
  else {
    if (c.nextAction) bits.push('<b>' + esc(c.nextActionText || 'Faire le point') + '</b>');
    else if (!enCampagne(c.id)) bits.push(silenceOf(c) ? 'sans nouvelles' : 'à planifier');
    bits.push(STATUSES[c.status].label);
    if (enCampagne(c.id)) bits.push('en campagne');
  }
  if (kmBit(c)) bits.push(kmBit(c));
  if (c.city) bits.push(esc(c.city));
  return (
    `<div class="row-item${closed ? ' row-closed' : ''}" data-id="${c.id}">
       <div class="sw-in">
         <div class="ri-main" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <h3>${esc(c.name)}</h3>
           <div class="ri-sub">${bits.join(' · ')}</div>
           ${hintHTML(c, ['name', 'city'])}
         </div>
         ${dueHTML(c)}
       </div>
     </div>`);
}

function cardHTML(c){
  const bits = [kmBit(c), c.city, c.domain !== 'autre' ? DOMAINS[c.domain].label : ''].filter(Boolean);
  const inCamp = enCampagne(c.id);
  /* la carte du tableau porte la MÊME graduation que la ligne mobile :
     un seul langage d'urgence dans toute l'application */
  /* la carte du poste dit la même chose que la ligne au pouce : muette
     depuis longtemps est un fait, pas une absence de fait */
  const sil = c.nextAction ? null : silenceOf(c);
  const na = c.nextAction
    ? `<span class="bc-na">${esc(c.nextActionText || 'Faire le point')} ${dueHTML(c)}</span>`
    : sil
      ? `<span class="bc-na">sans nouvelles ${silenceMarkHTML(sil)}</span>`
      : `<span class="bc-na bc-none">${inCamp ? 'en campagne' : 'à planifier'}</span>`;
  /* « complète à N % » vivait ici sur CHAQUE carte, et valait le même
     chiffre d'une carte à l'autre — quatre pistes à contacter, quatre
     fois « complète à 37 % ». C'est le papier peint de §6.1 : une encre
     qui ne varie pas ne signale rien, et le remplissage d'une fiche
     n'est jamais la réponse à « laquelle je travaille maintenant ».
     Le chiffre reste sur la fiche, où il légende « Compléter » — et la
     carte rejoint la ligne mobile, qui ne l'a jamais montré. */
  const foot = (c.contacts || []).length
    ? ic('contact', 'ic-14') + ' ' + c.contacts.length : '';
  return (
    `<div class="bcard" data-id="${c.id}" draggable="true">
       <div class="sw-in">
         <div class="bc-main" role="button" tabindex="0" aria-label="Ouvrir ${esc(c.name)}">
           <b>${esc(c.name)}</b>
           ${bits.length ? `<span class="bc-sub">${bits.map(esc).join(' · ')}</span>` : ''}
           ${na}
           ${/* la carte montre le domaine, la ligne mobile non : elle a
                donc un champ de moins à révéler */''}
           ${hintHTML(c, ['name', 'city', 'domain'])}
           ${foot ? `<span class="bc-foot">${foot}</span>` : ''}
         </div>
       </div>
     </div>`);
}

function boardHTML(alive){
  return `<div class="board">${Object.keys(STATUSES).map(k => {
    const col = alive.filter(c => c.status === k);
    const { shown, more } = capped(col, 'col-' + k, CAP_COL);
    return `<section class="bcol" data-st="${k}" aria-label="${STATUSES[k].label}">
              <h2 class="bcol-h" style="--c:${STATUSES[k].color}">${STATUSES[k].label} <span class="tr-n">${col.length}</span></h2>
              <div class="bcol-rows">${shown.map(cardHTML).join('') || '<div class="bcol-empty">—</div>'}${more ? moreBtn('col-' + k, more) : ''}</div>
            </section>`;
  }).join('')}</div>`;
}

/* déposer une carte dans une autre colonne = changer le statut — même
   trace qu'un « Confirmer » de fiche : une entrée d'historique propre */
function moveStatus(id, k){
  const c = S.companies.find(x => x.id === id);
  if (!c || isClosed(c) || !STATUSES[k] || c.status === k) return;
  /* La carte lâchée disparaissait d'une colonne et réapparaissait dans
     l'autre : l'œil perdait ce qu'il suivait, juste après l'avoir suivi
     à la souris. Le FLIP existe déjà et sert pour la recherche — il ne
     passait simplement pas par ici, parce que `bus.refresh()` re-rend
     sans lui. C'est « la liste qui se réorganise » de CLAUDE.md §4. */
  const glisse = softReorder('#piBody .row-item, #piBody .bcard');
  c.status = k;
  pushHist(c, 'Statut → ' + STATUSES[k].label);
  logJ(c.name + ' — Statut → ' + STATUSES[k].label, c.id);
  c.updatedAt = Date.now();
  saveData();
  bus.refresh();
  glisse();
  toast(c.name + ' → ' + STATUSES[k].label);   /* toast affiche du texte brut : esc() doublerait l'échappement */
}

/* le tableau se manipule à la souris : glisser une carte vers une autre
   colonne (HTML5, desktop) — la fiche reste le chemin universel */
function bindBoardDrag(body){
  let dragId = null;
  const clearHints = () =>
    body.querySelectorAll('.bcol.drop-ok').forEach(x => x.classList.remove('drop-ok'));
  body.querySelectorAll('.bcard').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.id;
      card.classList.add('drag-src');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('drag-src');
      clearHints();
      dragId = null;
    });
  });
  body.querySelectorAll('.bcol').forEach(col => {
    col.addEventListener('dragover', e => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearHints();
      col.classList.add('drop-ok');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drop-ok');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      clearHints();
      const id = dragId || e.dataTransfer.getData('text/plain');
      if (id) moveStatus(id, col.dataset.st);
    });
  });
}

/* l'état actif = des puces sous la recherche, un regard suffit (#8) —
   la croix enlève, taper la puce de tri inverse son sens */
function chipsRowHTML(){
  const bits = [];
  /* une étiquette = un bouton : taper la retire. Pas de ✕ à côté — il
     faisait déjà exactement la même chose. */
  /* une étiquette par valeur retenue : avec plusieurs filtres, ne pas
     toutes les montrer ferait croire que l'app a perdu des pistes */
  const etiq = (grp, defs, k) =>
    `<button class="st-chip" data-clear="${grp}" data-k="${k}" aria-label="Retirer le filtre ${defs[k].label}">
       <span class="dotc" style="background:${defs[k].color}"></span>${defs[k].label}</button>`;
  ft.status.forEach(k => bits.push(etiq('st', STATUSES, k)));
  ft.domain.forEach(k => bits.push(etiq('dom', DOMAINS, k)));
  const sc = sortChipHTML(st);
  if (sc) bits.push(sc);
  return bits.length ? `<div class="chips-row">${bits.join('')}</div>` : '';
}

function orphansHTML(){
  /* Le bac suit la recherche. Il l'ignorait : chercher « Nadia »
     l'affichait ici ET « Rien ne correspond » juste en dessous — un
     écran qui se contredit. Et quand une recherche le trouve, il
     s'ouvre : un `<details>` replié cache exactement ce qu'on
     cherchait. */
  const list = filterOrphans(S.orphans, q);
  if (!list.length) return '';
  /* ligne calme, repliée (#13) : présente, mais ne vole plus la place */
  return (
    `<details class="tranche tr-orph"${q ? ' open' : ''}>
       ${/* le titre du bac est un TITRE, pas seulement un résumé pliable :
            sans lui, ses lignes en `h4` suivaient directement le `h1` de
            l'écran, ce qui saute deux rangs. Le `<summary>` garde son
            rôle de bouton, le `<h3>` lui donne sa place dans le plan. */''}
       <summary class="tr-h"><h2>${ic('contact', 'ic-14')} Contacts à rattacher <span class="tr-n">${list.length}</span></h2></summary>
       <div class="rows">${list.map(o => {
         const title = ctLabel(o);
         const sameAsTitle = v => String(v || '').trim().toLocaleLowerCase() === String(title).trim().toLocaleLowerCase();
         const contact = [o.email, o.phone].filter(v => v && !sameAsTitle(v))[0] || '';
         const sub = [o.role, contact, (o.extra && o.extra.company) ? '→ ' + o.extra.company + ' ?' : '']
           .filter(Boolean).map(esc).join(' · ');
         return `<div class="orow" data-oid="${o.id}">
                   <div class="sw-in">
                     <div class="o-main" role="button" tabindex="0" aria-label="Modifier ${esc(title)}">
                       <h3>${esc(title)}</h3>
                       <div class="o-sub">${sub || 'à compléter'}</div>
                     </div>
                     <button class="btn btn-sm" data-attach="${o.id}">Rattacher</button>
                   </div>
                 </div>`;
       }).join('')}</div>
     </details>`);
}

/* suppression d'une piste : le geste a déjà eu lieu — Annuler ~30 s */
function removeRow(id){
  const c = S.companies.find(x => x.id === id);
  if (!c) return;
  deletePiste(c);
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} « ${esc(c.name)} » supprimée.`, () => {
    undeletePiste(c);
    bus.refresh();
    toast('Piste restaurée.');
  });
}

export function renderPistes(){
  const root = $('#view-pistes');
  const wide = mqWide.matches;
  const nAlive = S.companies.filter(c => !isClosed(c)).length;

  const nCamps = liveCampaignsCount();
  root.innerHTML =
    `<div class="page-inner${wide ? ' page-wide' : ''}">
       <div class="td-head">
         <h1>Mes pistes</h1>
         ${/* le compte se réécrit à chaque frappe (renderBody) : sans lui,
              on ne sait pas si l'on regarde 3 pistes sur 3 ou 3 sur 40 */''}
         <div class="td-date" id="piCount"></div>
         ${(CAMPAGNES && nCamps) ? `<button class="btn btn-sm" id="piCamps">${ic('flag', 'ic-14')} Campagnes (${nCamps})</button>` : ''}
         ${nAlive ? `<button class="btn btn-sm" id="piProspect">${ic('mail', 'ic-14')} Prospecter</button>` : ''}
       </div>
       ${/* le repère qui dit à la barre de commande qu'elle a décroché
             du haut de page — 1 px, repris par une marge négative, donc
             sans effet sur la mise en page */''}
       <div class="stick-guet" aria-hidden="true"></div>
       <div class="search-wrap">
         <input class="search" id="piQ" type="search" placeholder="Chercher…"
                aria-label="Rechercher une piste" value="${esc(q)}" ${clavier('cherche')}>
         ${/* Un raccourci clavier est invisible par nature : il ne sert
              qu'à ceux qui devinent, ou il se documente dans un écran
              d'aide — c'est-à-dire un écran sans données. La touche
              s'annonce donc DANS ce qu'elle commande, posée au bord du
              champ qu'elle ouvre. Elle s'efface dès qu'on y tape, et
              n'existe pas au pouce : il n'y a pas de clavier. */''}
         ${wide ? '<kbd class="kbd-hint" aria-hidden="true">/</kbd>' : ''}
         <button class="btn" id="piAffiner">${ic('filter', 'ic-14')} Affiner</button>
       </div>
       <div id="piChips">${chipsRowHTML()}</div>
       <div id="piBody"></div>
     </div>`;

  const openById = id => {
    const c = S.companies.find(x => x.id === id);
    if (c) openFiche(c);
  };

  /* le corps se re-rend seul pendant la frappe — le champ de recherche
     reste le même nœud, le curseur ne saute plus */
  const renderBody = () => {
    const body = root.querySelector('#piBody');
    const all = filterCompanies(S.companies, { q, ...filterArgs(ft), ...sortArgs(st) });
    const alive = all.filter(c => !isClosed(c));
    const closed = all.filter(isClosed);

    const tout = S.companies.length;
    const cnt = root.querySelector('#piCount');
    if (cnt) cnt.textContent = (q || ftOn()) && all.length !== tout
      ? `${all.length} sur ${tout}`
      : `${tout} piste${tout > 1 ? 's' : ''}`;

    let html = orphansHTML();
    if (!S.companies.length){
      html +=
        `<div class="td-empty">
           <div class="tde-ic">${ic('briefcase', 'ic-24')}</div>
           <h2>Aucune piste pour l’instant</h2>
           <p>Chaque entreprise croisée est une piste — même avec juste un nom.</p>
           <div class="tde-actions">
             <button class="btn btn-primary" id="piAdd">${ic('plus', 'ic-14')} Ajouter une piste</button>
             ${!hasDemo() ? '<button class="btn" id="piDemo">Voir un exemple</button>' : ''}
           </div>
         </div>`;
    } else if (!all.length){
      /* « Aucune PISTE », pas « rien » : le bac juste au-dessus peut
         très bien avoir trouvé quelqu'un, et les deux phrases se
         contrediraient. Nommer l'objet suffit à les réconcilier. */
      html +=
        `<div class="empty-list">Aucune piste ne correspond${q ? ` à « ${esc(q)} »` : ' au filtre'}.
           ${ftOn() ? '<button class="linklike" id="piFtClear">Tout montrer</button>' : ''}
         </div>`;
    } else {
      if (wide) html += boardHTML(alive);
      else {
        const { shown, more } = capped(alive, 'list', CAP_LIST);
        html += `<div class="rows">${shown.map(rowHTML).join('')}${more ? moreBtn('list', more) : ''}</div>`;
      }
      if (closed.length){
        const { shown, more } = capped(closed, 'closed', CAP_LIST);
        html +=
          `<details class="tranche tr-closed">
             <summary class="tr-h">${ic('archive', 'ic-14')} Clôturées <span class="tr-n">${closed.length}</span></summary>
             <div class="rows">${shown.map(rowHTML).join('')}${more ? moreBtn('closed', more) : ''}</div>
           </details>`;
      }
    }
    body.innerHTML = html;

    body.querySelectorAll('.row-item, .bcard').forEach(r => {
      const open = () => openById(r.dataset.id);
      r.addEventListener('click', open);
      r.querySelector('[role="button"]').addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
      });
      bindDeleteGesture(r, () => removeRow(r.dataset.id),
        (S.companies.find(x => x.id === r.dataset.id) || {}).name);
    });
    if (wide && body.querySelector('.board')) bindBoardDrag(body);
    body.querySelector('#piFtClear')?.addEventListener('click', () => { ftClear(); renderPistes(); });
    /* bac : la ligne édite, le bouton rattache — et le contact se jette
       au geste, comme une piste (jusqu'ici il fallait l'ouvrir pour ça) */
    body.querySelectorAll('.orow').forEach(r => {
      const o = () => S.orphans.find(x => x.id === r.dataset.oid);
      const edit = () => { const ct = o(); if (ct) openContactEditor({ contact: ct }); };
      r.querySelector('.o-main').addEventListener('click', edit);
      r.querySelector('.o-main').addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); edit(); }
      });
      r.querySelector('[data-attach]').addEventListener('click', () => { const ct = o(); if (ct) openAttach(ct); });
      bindDeleteGesture(r, () => {
        const ct = o();
        if (!ct) return;
        const i = S.orphans.indexOf(ct);
        removeOrphan(ct.id);
        bus.refresh();
        showUndo(`${ic('check', 'ic-14')} « ${esc(ctLabel(ct))} » jeté.`, () => {
          S.orphans.splice(Math.min(i, S.orphans.length), 0, ct);
          saveOrphans();
          bus.refresh();
          toast('Contact récupéré.');
        });
      }, ctLabel(o() || {}));
    });
    body.querySelectorAll('[data-more]').forEach(b =>
      b.addEventListener('click', e => {
        e.stopPropagation();
        expanded.add(b.dataset.more);
        renderBody();
      }));
    body.querySelector('#piAdd')?.addEventListener('click', () => openCapture());
    body.querySelector('#piDemo')?.addEventListener('click', () => { addDemo(); bus.refresh(); toast('Exemple ajouté — retire-le depuis « Aujourd’hui ».'); });
  };

  /* au poste, le titre de colonne porte déjà son fond et son trait : se
     coller ne lui ajoute aucune encre, il n'a rien à annoncer. Seule la
     barre de commande du pouce a besoin du repère. */
  collerEnHaut(root.querySelector('.stick-guet'), root.querySelector('.search-wrap'));

  const input = root.querySelector('#piQ');
  let h = null;
  input.addEventListener('input', () => {
    clearTimeout(h);
    h = setTimeout(() => { q = input.value; glisser(renderBody); }, 180);
  });
  /* Échap vide la recherche, puis rend le clavier. Deux temps : la
     première touche efface (on veut revoir toute la liste), la
     seconde quitte le champ — annuler ne doit jamais coûter la souris. */
  input.addEventListener('keydown', e => {
    /* Entrée range le clavier. Au pouce il mange la moitié de l'écran :
       la liste est déjà filtrée à la frappe, donc la seule chose qui
       reste à faire après avoir tapé, c'est de la VOIR. La touche
       s'annonce d'ailleurs « Rechercher » (`enterkeyhint`) — la tenir
       pour rien serait une promesse de plus non tenue. */
    if (e.key === 'Enter'){ e.preventDefault(); input.blur(); return; }
    if (e.key !== 'Escape') return;
    if (!input.value){ input.blur(); return; }
    clearTimeout(h);
    input.value = ''; q = '';
    glisser(renderBody);
  });
  /* Redessiner la liste en faisant GLISSER les lignes retrouvées (#23).
     C'était écrit ici, et ça ne marchait que pour les puces : le champ
     de recherche appelait `renderBody()` en direct, sans passer par
     là — donc le geste qui réorganise le plus la liste, celui qu'on
     fait à chaque frappe, était le seul à sauter. Mesuré : zéro ligne
     en mouvement, au pouce comme au poste. */
  const glisser = redessine => {
    const play = softReorder('#piBody .row-item, #piBody .bcard');
    redessine();
    play();
  };
  /* les puces d'état et le corps se re-rendent ensemble, la recherche
     reste le même nœud (le curseur ne saute pas) */
  const refresh = () => glisser(() => {
    const chips = root.querySelector('#piChips');
    chips.innerHTML = chipsRowHTML();
    bindChips(chips);
    renderBody();
  });
  const bindChips = box => {
    box.querySelectorAll('[data-clear]').forEach(b =>
      b.addEventListener('click', () => {
        /* on retire LA valeur tapée, pas toute la famille : avec deux
           domaines cochés, effacer les deux d'un coup n'est pas ce que
           l'étiquette promet */
        const arr = b.dataset.clear === 'st' ? ft.status : ft.domain;
        const i = arr.indexOf(b.dataset.k);
        if (i >= 0) arr.splice(i, 1);
        refresh();
      }));
    bindSortChip(box, st, refresh);
  };
  bindChips(root.querySelector('#piChips'));
  root.querySelector('#piAffiner').addEventListener('click', () =>
    openAffinerSheet(ft, st, { withStatus: !mqWide.matches,
      pool: () => S.companies.filter(c => !isClosed(c)) }, refresh));
  root.querySelector('#piProspect')?.addEventListener('click', openProspect);
  root.querySelector('#piCamps')?.addEventListener('click', openCampaignsHome);
  renderBody();
}

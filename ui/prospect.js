/* ============================================================
   OpenContact — interface · mode Prospecter
   Des candidatures en série : je choisis mes pistes, puis les
   composeurs s'enchaînent un par un — chaque email reste perso,
   chaque envoi planifie sa relance. Deux taps par piste.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { STATUSES } from '../engine/model.js';
import { filterCompanies } from '../engine/filter.js';
import { S, bus, isClosed } from './state.js';
import { openSheet, toast, btn, ic } from './dom.js';
import { sortState, sortArgs, sortBarHTML, bindSortBar } from './sort.js';
import { openMail } from './mail.js';
import { openCampaignWizard } from './campagnes.js';

export function openProspect(){
  const alive = () => S.companies.filter(c => !isClosed(c));
  if (!alive().length) return;
  const sel = new Set();
  const st = sortState('status');            /* « À contacter » en tête par défaut */
  const sh = openSheet({ title: 'Prospecter — qui ?', icon: 'mail' });
  const nTodo = alive().filter(c => c.status === 'todo').length;

  const bGo = btn('Continuer', 'btn-primary', () => {
    const list = alive().filter(c => sel.has(c.id));
    if (!list.length){ toast('Coche au moins une piste.'); return; }
    sh.close();
    chooseMode(list);
  });
  const sync = () => {
    bGo.textContent = sel.size ? `Continuer (${sel.size})` : 'Continuer';
    bGo.classList.toggle('btn-off', !sel.size);
  };

  const render = () => {
    const list = filterCompanies(alive(), sortArgs(st));
    sh.body.innerHTML =
      `<div class="listbar">
         ${nTodo ? `<button class="linklike" id="pkAllTodo">Cocher les ${nTodo} « À contacter »</button>` : '<span></span>'}
         ${sortBarHTML(st)}
       </div>
       <div class="pick-list">
         ${list.map(c => {
           const mail = (c.contacts || []).find(t => t.email);
           return `<button class="pick pk${sel.has(c.id) ? ' on' : ''}" data-id="${c.id}" aria-pressed="${sel.has(c.id)}">
                     ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
                     <div class="pk-m"><b>${esc(c.name)}</b>
                       <span>${STATUSES[c.status].label}${mail ? ' · ' + esc(mail.email) : ' · pas d’email — copie vers LinkedIn'}</span></div>
                   </button>`;
         }).join('')}
       </div>`;
    sh.body.querySelectorAll('.pk').forEach(b =>
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        sel.has(id) ? sel.delete(id) : sel.add(id);
        b.classList.toggle('on', sel.has(id));
        b.setAttribute('aria-pressed', sel.has(id));
        sync();
      }));
    sh.body.querySelector('#pkAllTodo')?.addEventListener('click', () => {
      alive().filter(c => c.status === 'todo').forEach(c => sel.add(c.id));
      sh.body.querySelectorAll('.pk').forEach(b => {
        b.classList.toggle('on', sel.has(b.dataset.id));
        b.setAttribute('aria-pressed', sel.has(b.dataset.id));
      });
      sync();
    });
    bindSortBar(sh.body, st, render);
    sync();
  };
  sh.setFoot([bGo]);
  render();
}

/* la bifurcation : une décision, deux chemins (UX-PLAN §6) */
function chooseMode(list){
  const sh = openSheet({ title: list.length + ' piste' + (list.length > 1 ? 's' : '') + ' choisie' + (list.length > 1 ? 's' : ''), icon: 'mail' });
  sh.body.innerHTML =
    `<div class="pick-list">
       <button class="pick" id="pmOne"><b>${ic('mail', 'ic-14')} Une par une</b>
         <span>tu écris et envoies chaque email maintenant</span></button>
       <button class="pick" id="pmCamp"><b>${ic('flag', 'ic-14')} En campagne</b>
         <span>un message + 2 relances, préparés pour les jours qui viennent — tu gardes la main</span></button>
     </div>`;
  sh.body.querySelector('#pmOne').addEventListener('click', () => { sh.close(); run(list); });
  sh.body.querySelector('#pmCamp').addEventListener('click', () => { sh.close(); openCampaignWizard(list); });
}

/* la série : un composeur après l'autre, la relance planifiée entre les
   deux. « Passer » avance, la croix arrête tout — tout de suite. */
function run(list){
  let i = 0;
  const next = () => {
    if (i >= list.length){
      toast('Série terminée — ' + list.length + ' piste' + (list.length > 1 ? 's' : '') + ' traitée' + (list.length > 1 ? 's' : '') + ' ✓');
      bus.refresh();
      return;
    }
    const c = list[i++];
    openMail(c, {
      progress: i + '/' + list.length,
      onDone: next,
      onQuit: () => { toast('Prospection arrêtée.'); bus.refresh(); }
    });
  };
  next();
}
